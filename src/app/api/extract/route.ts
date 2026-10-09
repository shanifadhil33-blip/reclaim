import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AI_EXTRACT_FAILED,
  AI_NOT_CONFIGURED,
  completeChat,
  ProviderRequestError,
  targetsFor,
  type ChatMessage,
  type ChatPart,
  type CompletionTarget,
} from "@/lib/ai-providers";
import {
  parseEobText,
  parseModelClaims,
  plainExtractWarning,
  type DeniedClaim,
} from "@/lib/extract-claims";

export const maxDuration = 120;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown failure";
}

function safeAttemptError(model: string, error: unknown): string {
  if (error instanceof ProviderRequestError) return error.message;
  const message = error instanceof Error ? error.message : "failed";
  if (/empty response|did not return a list|DENIED lines/i.test(message)) {
    return message.startsWith(model) ? message : `${model}: ${message}`;
  }
  return message.startsWith(`${model}:`) ? message : `${model}: failed`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

const CLAIM_SHAPE = `{
  "claims": [
    {
      "patientAccount": "member id",
      "patientName": "patient name",
      "dateOfService": "MM/DD/YYYY",
      "billedCPT": "CPT code",
      "denialCode": "CO-50",
      "denialReason": "why it was denied",
      "billedAmount": "$0.00",
      "paidAmount": "$0.00",
      "payerName": "insurance plan"
    }
  ]
}`

const EXTRACTION_SYSTEM_PROMPT = `You extract denied service lines from an Explanation of Benefits.
A line is denied when its status says DENIED, or when the allowed amount and the paid amount are both 0 and a denial code is present (CO-, PR-, OA-, or PI-).
Skip lines marked PAID. A contractual adjustment such as CO-45 on a paid line is not a denial.
Read a normal claim table: date of service, CPT, description, billed, allowed, paid, status, and the adjustment code. The payer is in the header or after FROM:. The patient name and member id are near the top.
Also read fax-style pages where remark codes are explained in a glossary.
Return a JSON object in this shape:
${CLAIM_SHAPE}
If there are no denials, return {"claims":[]}.
Every value is a string. Dates are MM/DD/YYYY. Amounts include a dollar sign. Do not use markdown.`

const MAX_VALIDATION_ATTEMPTS = 3

/**
 * Extract with self-correction retry loop.
 * Attempts up to MAX_VALIDATION_ATTEMPTS times, feeding Zod errors back to the LLM.
 */
async function extractWithModel(target: CompletionTarget, base64Images: string[]): Promise<{
  claims: DeniedClaim[];
  validationAttempts: number;
}> {
  console.log(`[EXTRACT] Trying ${target.provider}/${target.model} with ${base64Images.length} pages`);

  const imageContent: ChatPart[] = base64Images.map((img) => ({
    type: "image_url",
    image_url: {
      url: img.startsWith("data:") ? img : `data:image/png;base64,${img}`,
    },
  }));

  // Build initial messages
  const messages: ChatMessage[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract denied lines only. Skip lines marked PAID. Return a JSON object {\"claims\":[...]} and do not use markdown." },
        ...imageContent,
      ],
    },
  ];

  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt++) {
    console.log(`[EXTRACT] ${target.provider}/${target.model}, validation attempt ${attempt}/${MAX_VALIDATION_ATTEMPTS}`);

    const raw = await completeChat(target, messages, { json: true, timeoutMs: 90000, maxTokens: 4000 });
    console.log(`[EXTRACT] Raw response from ${target.model} (attempt ${attempt}): ${raw.length} chars.`);
    if (!raw) {
      throw new Error("Model returned empty response");
    }

    const parsed = parseModelClaims(raw);
    if (parsed.claims.length > 0) {
      console.log(`[EXTRACT] ${target.model} returned ${parsed.claims.length} denials on attempt ${attempt}.`);
      return { claims: parsed.claims, validationAttempts: attempt };
    }
    if (!parsed.warning) {
      console.log(`[EXTRACT] ${target.model} returned no denials.`);
      return { claims: [], validationAttempts: attempt };
    }
    console.warn(`[EXTRACT] ${target.model} attempt ${attempt}: ${parsed.warning}`);
    if (attempt < MAX_VALIDATION_ATTEMPTS) {
      messages.push({ role: "assistant", content: raw });
      messages.push({
        role: "user",
        content: `${parsed.warning} Return {"claims":[...]} with one object per DENIED line. Skip PAID lines. Use strings for all nine fields.`,
      });
    } else {
      throw new Error(parsed.warning);
    }
  }

  // Should never reach here, but TypeScript safety
  return { claims: [], validationAttempts: MAX_VALIDATION_ATTEMPTS };
}

/**
 * Text-mode extraction with self-correction retry loop.
 */
async function extractTextWithRetry(target: CompletionTarget, text: string): Promise<{
  claims: DeniedClaim[];
  validationAttempts: number;
}> {
  console.log(`[EXTRACT] Trying ${target.provider}/${target.model}`);

  const messages: ChatMessage[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the text of an EOB. Extract DENIED lines only and skip PAID lines. Return {"claims":[...]}.\n\n${text}`,
    },
  ];

  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt++) {
    console.log(`[EXTRACT] ${target.provider}/${target.model}, validation attempt ${attempt}/${MAX_VALIDATION_ATTEMPTS}`);

    const raw = await completeChat(target, messages, { json: true, timeoutMs: 60000, maxTokens: 4000 });
    console.log(`[EXTRACT] ${target.model} response (attempt ${attempt}): ${raw.length} chars.`);

    const parsed = parseModelClaims(raw);
    const missedDenial = parsed.claims.length === 0 && /\bDENIED\b/i.test(text);
    if (parsed.claims.length > 0) {
      console.log(`[EXTRACT] ${target.model} returned ${parsed.claims.length} denials.`);
      return { claims: parsed.claims, validationAttempts: attempt };
    }
    if (!parsed.warning && !missedDenial) {
      return { claims: [], validationAttempts: attempt };
    }
    const problem = parsed.warning || "The page text contains DENIED lines, and the model returned none.";
    console.warn(`[EXTRACT] ${target.model} attempt ${attempt}: ${problem}`);
    if (attempt < MAX_VALIDATION_ATTEMPTS) {
      messages.push({ role: "assistant", content: raw });
      messages.push({
        role: "user",
        content: `${problem} Return {"claims":[...]} for each DENIED line only. Skip PAID lines.`,
      });
    } else {
      throw new Error(problem);
    }
  }

  return { claims: [], validationAttempts: MAX_VALIDATION_ATTEMPTS };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let images: string[] = [];
    let text = "";
    try {
      const parsed: unknown = await req.json();
      const record = asRecord(parsed);
      text = typeof record.text === "string" ? record.text : "";
      images = Array.isArray(record.images)
        ? record.images.filter((item): item is string => typeof item === "string")
        : [];
    } catch (parseError: unknown) {
      console.error("[EXTRACT] Failed to parse request body:", errorText(parseError));
      return NextResponse.json({ error: "Request payload too large or malformed. Try uploading fewer pages at once." }, { status: 413 });
    }

    const isTextMode = text.length > 50;

    if (!isTextMode && images.length === 0) {
      return NextResponse.json({ error: "No images or text provided." }, { status: 400 });
    }

    let deniedClaims: DeniedClaim[] = [];
    const errors: string[] = [];
    let totalValidationAttempts = 0;

    if (isTextMode) {
      const localClaims = parseEobText(text);
      if (localClaims.length > 0) {
        console.log(`[EXTRACT] Read ${localClaims.length} denied lines from the EOB text.`);
        deniedClaims = localClaims;
        totalValidationAttempts = 1;
      }
    }

    const targets = targetsFor(isTextMode ? "text" : "vision");
    if (deniedClaims.length === 0 && targets.length === 0) {
      return NextResponse.json({ error: AI_NOT_CONFIGURED }, { status: 500 });
    }

    // ── TEXT MODE: send raw PDF text to a text model ──
    if (deniedClaims.length === 0 && isTextMode) {
      console.log(`[EXTRACT] TEXT MODE — ${text.length} chars from user ${user.id}`);

      for (const target of targets) {
        try {
          const result = await extractTextWithRetry(target, text);
          deniedClaims = result.claims;
          totalValidationAttempts = result.validationAttempts;
          console.log(`[EXTRACT] Text mode parsed ${deniedClaims.length} claims (validated in ${totalValidationAttempts} attempt(s))`);
          break;
        } catch (err: unknown) {
          console.warn(`[EXTRACT] ${target.provider}/${target.model} failed`);
          errors.push(safeAttemptError(target.model, err));
        }
      }
    }
    // ── VISION MODE: send rendered images to a vision-capable model ──
    else if (deniedClaims.length === 0) {
      console.log(`[EXTRACT] VISION MODE — ${images.length} pages from user ${user.id}`);
      console.log(`[EXTRACT] Total payload size: ~${Math.round(JSON.stringify(images).length / 1024 / 1024)}MB`);

      const batchSize = 3;
      const batches: string[][] = [];
      for (let i = 0; i < images.length; i += batchSize) {
        batches.push(images.slice(i, i + batchSize));
      }

      console.log(`[EXTRACT] Processing ${batches.length} batch(es) of pages`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      let batchSuccess = false;

      for (const target of targets) {
        try {
          const result = await extractWithModel(target, batch);
          deniedClaims = [...deniedClaims, ...result.claims];
          totalValidationAttempts = Math.max(totalValidationAttempts, result.validationAttempts);
          batchSuccess = true;
          console.log(`[EXTRACT] Batch ${batchIndex + 1}/${batches.length} succeeded with ${target.provider}/${target.model}: ${result.claims.length} claims (validated in ${result.validationAttempts} attempt(s))`);
          break;
        } catch (err: unknown) {
          console.warn(`[EXTRACT] ${target.provider}/${target.model} failed on batch ${batchIndex + 1}`);
          errors.push(`Batch ${batchIndex + 1} — ${safeAttemptError(target.model, err)}`);
        }
      }

      if (!batchSuccess) {
        console.error(`[EXTRACT] All models failed on batch ${batchIndex + 1}`);
        errors.push(`Batch ${batchIndex + 1}: All models failed`);
      }
    }
    } // end else (VISION MODE)
    // Deduplicate by composite key
    const seen = new Set<string>();
    const unique = deniedClaims.filter(claim => {
      const key = `${claim.patientAccount}-${claim.dateOfService}-${claim.billedCPT}-${claim.denialCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[EXTRACT] Final: ${unique.length} unique claims (from ${deniedClaims.length} total, ${errors.length} errors, max ${totalValidationAttempts} validation attempts)`);

    // If we got zero claims but had errors, report the errors
    if (unique.length === 0 && errors.length > 0) {
      return NextResponse.json({
        success: true,
        claims: [],
        totalPages: images?.length || 0,
        totalDenials: 0,
        validationAttempts: totalValidationAttempts,
        warnings: errors.map(plainExtractWarning),
      });
    }

    return NextResponse.json({
      success: true,
      claims: unique,
      totalPages: images?.length || 0,
      totalDenials: unique.length,
      validationAttempts: totalValidationAttempts,
    });
  } catch (error: unknown) {
    console.error("[EXTRACT FATAL]", error);
    return NextResponse.json(
      { error: AI_EXTRACT_FAILED },
      { status: 500 }
    );
  }
}
