import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

type CompletionRequest = {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "json_object" };
};

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

const VISION_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-4-scout",
]

const TEXT_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "meta-llama/llama-3.3-70b-instruct",
]

const JSON_MODE_MODELS = new Set([
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
])

const MAX_VALIDATION_ATTEMPTS = 3

/**
 * Extract with self-correction retry loop.
 * Attempts up to MAX_VALIDATION_ATTEMPTS times, feeding Zod errors back to the LLM.
 */
async function extractWithModel(model: string, base64Images: string[], apiKey: string): Promise<{
  claims: DeniedClaim[];
  validationAttempts: number;
}> {
  console.log(`[EXTRACT] Trying model: ${model} with ${base64Images.length} pages`);

  const imageContent: Array<Record<string, unknown>> = base64Images.map((img) => ({
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

  const supportsJsonMode = JSON_MODE_MODELS.has(model);

  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt++) {
    console.log(`[EXTRACT] Model ${model}, validation attempt ${attempt}/${MAX_VALIDATION_ATTEMPTS}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const requestBody: CompletionRequest = {
        model,
        messages,
        temperature: 0.1,
        max_tokens: 8000,
      };

      if (supportsJsonMode) {
        requestBody.response_format = { type: "json_object" };
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody.substring(0, 300)}`);
      }

      const completion = await response.json();

      if (completion.error) {
        throw new Error(completion.error.message || "Unknown API error");
      }

      if (!completion.choices?.length) {
        throw new Error("No choices returned from model");
      }

      const raw = completion.choices[0]?.message?.content?.trim() || "";
      console.log(`[EXTRACT] Raw response from ${model} (attempt ${attempt}): ${raw.length} chars.`);
      if (!raw) {
        throw new Error("Model returned empty response");
      }

      const parsed = parseModelClaims(raw);
      if (parsed.claims.length > 0) {
        console.log(`[EXTRACT] ${model} returned ${parsed.claims.length} denials on attempt ${attempt}.`);
        return { claims: parsed.claims, validationAttempts: attempt };
      }
      if (!parsed.warning) {
        console.log(`[EXTRACT] ${model} returned no denials.`);
        return { claims: [], validationAttempts: attempt };
      }
      console.warn(`[EXTRACT] ${model} attempt ${attempt}: ${parsed.warning}`);
      if (attempt < MAX_VALIDATION_ATTEMPTS) {
        messages.push({ role: "assistant", content: raw });
        messages.push({
          role: "user",
          content: `${parsed.warning} Return {"claims":[...]} with one object per DENIED line. Skip PAID lines. Use strings for all nine fields.`,
        });
      } else {
        throw new Error(parsed.warning);
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`${model} timed out after 90 seconds`);
      }
      throw error;
    }
  }

  // Should never reach here, but TypeScript safety
  return { claims: [], validationAttempts: MAX_VALIDATION_ATTEMPTS };
}

/**
 * Text-mode extraction with self-correction retry loop.
 */
async function extractTextWithRetry(model: string, text: string, apiKey: string): Promise<{
  claims: DeniedClaim[];
  validationAttempts: number;
}> {
  console.log(`[EXTRACT] Trying text model: ${model}`);

  const messages: ChatMessage[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the text of an EOB. Extract DENIED lines only and skip PAID lines. Return {"claims":[...]}.\n\n${text}`,
    },
  ];

  const supportsJsonMode = JSON_MODE_MODELS.has(model);

  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt++) {
    console.log(`[EXTRACT] Text model ${model}, validation attempt ${attempt}/${MAX_VALIDATION_ATTEMPTS}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const requestBody: CompletionRequest = {
        model,
        messages,
        temperature: 0.1,
        max_tokens: 8000,
      };

      if (supportsJsonMode) {
        requestBody.response_format = { type: "json_object" };
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody.substring(0, 200)}`);
      }

      const completion = await response.json();
      if (completion.error) throw new Error(completion.error.message);
      if (!completion.choices?.length) throw new Error("No choices returned");

      const raw = completion.choices[0]?.message?.content?.trim() || "";
      console.log(`[EXTRACT] Text model ${model} response (attempt ${attempt}): ${raw.length} chars.`);

      const parsed = parseModelClaims(raw);
      const missedDenial = parsed.claims.length === 0 && /\bDENIED\b/i.test(text);
      if (parsed.claims.length > 0) {
        console.log(`[EXTRACT] Text model ${model} returned ${parsed.claims.length} denials.`);
        return { claims: parsed.claims, validationAttempts: attempt };
      }
      if (!parsed.warning && !missedDenial) {
        return { claims: [], validationAttempts: attempt };
      }
      const problem = parsed.warning || "The page text contains DENIED lines, and the model returned none.";
      console.warn(`[EXTRACT] Text model ${model} attempt ${attempt}: ${problem}`);
      if (attempt < MAX_VALIDATION_ATTEMPTS) {
        messages.push({ role: "assistant", content: raw });
        messages.push({
          role: "user",
          content: `${problem} Return {"claims":[...]} for each DENIED line only. Skip PAID lines.`,
        });
      } else {
        throw new Error(problem);
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`${model} timed out after 60 seconds`);
      }
      throw error;
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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (deniedClaims.length === 0 && !apiKey) {
      return NextResponse.json({ error: "API misconfigured. Missing OPENROUTER_API_KEY." }, { status: 500 });
    }

    // ── TEXT MODE: send raw PDF text to a text-based LLM ──
    if (deniedClaims.length === 0 && isTextMode && apiKey) {
      console.log(`[EXTRACT] TEXT MODE — ${text.length} chars from user ${user.id}`);

      for (const model of TEXT_MODELS) {
        try {
          const result = await extractTextWithRetry(model, text, apiKey);
          deniedClaims = result.claims;
          totalValidationAttempts = result.validationAttempts;
          console.log(`[EXTRACT] Text mode parsed ${deniedClaims.length} claims (validated in ${totalValidationAttempts} attempt(s))`);
          break;
        } catch (err: unknown) {
          console.warn(`[EXTRACT] Text model ${model} failed: ${errorText(err)}`);
          errors.push(`${model}: ${errorText(err)}`);
        }
      }
    }
    // ── VISION MODE: send rendered images to a vision-capable LLM ──
    else if (deniedClaims.length === 0 && apiKey) {
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

      for (const model of VISION_MODELS) {
        try {
          const result = await extractWithModel(model, batch, apiKey);
          deniedClaims = [...deniedClaims, ...result.claims];
          totalValidationAttempts = Math.max(totalValidationAttempts, result.validationAttempts);
          batchSuccess = true;
          console.log(`[EXTRACT] Batch ${batchIndex + 1}/${batches.length} succeeded with ${model}: ${result.claims.length} claims (validated in ${result.validationAttempts} attempt(s))`);
          break;
        } catch (err: unknown) {
          console.warn(`[EXTRACT] ${model} failed on batch ${batchIndex + 1}: ${errorText(err)}`);
          errors.push(`Batch ${batchIndex + 1} — ${model}: ${errorText(err)}`);
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
      { error: `Internal Server Error: ${errorText(error)}` },
      { status: 500 }
    );
  }
}
