import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const maxDuration = 120;

// ── Zod Schema: strict shape for every denied claim ──
const DeniedClaimSchema = z.object({
  patientAccount: z.string(),
  patientName: z.string(),
  dateOfService: z.string(),
  billedCPT: z.string(),
  denialCode: z.string(),
  denialReason: z.string(),
  billedAmount: z.string(),
  paidAmount: z.string(),
  payerName: z.string(),
});

const DeniedClaimsArraySchema = z.array(DeniedClaimSchema);

// Stringify the schema shape so the LLM knows exactly what to produce
const SCHEMA_DEFINITION = JSON.stringify(
  {
    type: "array",
    items: {
      type: "object",
      required: [
        "patientAccount", "patientName", "dateOfService", "billedCPT",
        "denialCode", "denialReason", "billedAmount", "paidAmount", "payerName"
      ],
      properties: {
        patientAccount: { type: "string", description: "Patient account number or member ID" },
        patientName: { type: "string", description: "Patient full name (LASTNAME, FIRST)" },
        dateOfService: { type: "string", description: "Date of service (MM/DD/YY)" },
        billedCPT: { type: "string", description: "CPT/procedure code (e.g. D0150, 99213)" },
        denialCode: { type: "string", description: "Denial/remark code (e.g. CO-50)" },
        denialReason: { type: "string", description: "Full text explanation of the denial" },
        billedAmount: { type: "string", description: "Billed amount with $ sign (e.g. $123.00)" },
        paidAmount: { type: "string", description: "Paid/allowed amount with $ sign (e.g. $0.00)" },
        payerName: { type: "string", description: "Insurance company name from page header" },
      },
    },
  },
  null,
  2
);

const EXTRACTION_SYSTEM_PROMPT = `You are an elite medical billing data extractor. Review these EOB images. Extract ONLY the denied claims (e.g., claims with allowed amount $0 and a denial remark code).

CRITICAL SEARCH INSTRUCTIONS:
1. PAYER NAME: Look at the VERY TOP of the page. The insurance company name is usually in the fax header (e.g., 'FROM: DELTA DENTAL') or the main logo area. You MUST extract this for every row.
2. PATIENT NAME: Look in the first column of the claims table. It is often formatted as 'LASTNAME, F' (e.g., 'DAVIS, R'). If a patient account or member ID is visible, include it.
3. DENIAL CODES: Match the tiny shorthand codes in the table (e.g., '50b', '119d') to the 'Glossary' or 'Remark Codes' section at the bottom of the page to confirm it is a denial and get the full denial description.
4. If the "Allowed" amount is $0.00 or the "Paid" amount is $0.00 and there is a remark code, that IS a denial — extract it.

STRICT JSON SCHEMA (you MUST conform to this exactly):
${SCHEMA_DEFINITION}

OUTPUT FORMAT:
You MUST return a raw JSON array. Do NOT use markdown formatting. Do NOT wrap in code blocks. The first character MUST be [ and the last MUST be ].
Every object MUST contain ALL 9 keys listed above with string values.
If a field is not visible, use "Unknown". If there are no denials at all, return [].`;

// Models to try in order — prefer vision-capable models
const VISION_MODELS = [
  "google/gemini-2.0-flash-001",
  "google/gemini-1.5-pro",
  "meta-llama/llama-4-scout:free",
  "google/gemini-2.0-flash-lite-001",
];

// Models that support response_format: json_object
const JSON_MODE_MODELS = new Set([
  "google/gemini-2.0-flash-001",
  "google/gemini-1.5-pro",
  "google/gemini-2.0-flash-lite-001",
]);

const MAX_VALIDATION_ATTEMPTS = 3;

/**
 * Normalize a single claim object — maps any casing/key variation to our strict schema.
 */
function normalizeClaim(item: any): any {
  // Helper: pick the first truthy value from multiple possible keys
  const pick = (...keys: string[]): string => {
    for (const key of keys) {
      if (item[key] && String(item[key]).trim()) return String(item[key]).trim();
    }
    return "Unknown";
  };

  return {
    patientAccount: pick(
      "patientAccount", "PatientAccount", "patient_account", "accountNumber",
      "Account", "account", "memberID", "MemberID", "member_id", "subscriberID",
      "SubscriberID", "claimNumber", "ClaimNumber", "claim_number",
      // Fallback: if no account, use patientName so the primary column isn't blank
      "patientName", "PatientName", "patient_name", "Patient", "patient",
      "name", "Name", "subscriberName", "SubscriberName"
    ),
    patientName: pick(
      "patientName", "PatientName", "patient_name", "Patient", "patient",
      "name", "Name", "subscriberName", "SubscriberName"
    ),
    dateOfService: pick(
      "dateOfService", "DateOfService", "date_of_service", "dos", "DOS",
      "date", "Date", "serviceDate", "ServiceDate", "service_date"
    ),
    billedCPT: pick(
      "billedCPT", "BilledCPT", "billed_cpt", "cptCode", "CPTCode", "cpt_code",
      "procedureCode", "ProcedureCode", "procedure_code", "code", "Code",
      "procedure", "Procedure", "cpt", "CPT"
    ),
    denialCode: pick(
      "denialCode", "DenialCode", "denial_code", "remarkCode", "RemarkCode",
      "remark_code", "adjustmentCode", "AdjustmentCode", "adjustment_code",
      "reasonCode", "ReasonCode", "reason_code", "CARC", "carc"
    ),
    denialReason: pick(
      "denialReason", "DenialReason", "denial_reason", "reason", "Reason",
      "remarkDescription", "RemarkDescription", "description", "Description",
      "explanation", "Explanation", "adjustmentReason", "AdjustmentReason"
    ),
    billedAmount: pick(
      "billedAmount", "BilledAmount", "billed_amount", "chargeAmount",
      "ChargeAmount", "charge_amount", "billed", "Billed", "charge", "Charge",
      "totalCharge", "TotalCharge"
    ),
    paidAmount: pick(
      "paidAmount", "PaidAmount", "paid_amount", "paymentAmount",
      "PaymentAmount", "payment_amount", "paid", "Paid", "payment", "Payment",
      "allowedAmount", "AllowedAmount"
    ),
    payerName: pick(
      "payerName", "PayerName", "payer_name", "payer", "Payer",
      "insurance", "Insurance", "insuranceCompany", "InsuranceCompany",
      "insurance_company", "carrier", "Carrier", "plan", "Plan"
    ),
  };
}

/**
 * Robust JSON extraction + normalization.
 * Handles markdown fences, leading text, trailing text, and key mismatches.
 */
function sanitizeAndParseJSON(raw: string): any[] {
  let text = raw.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

  // If the model added conversational text before the JSON, find the first [
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    console.error("[EXTRACT] No JSON array found in response. Raw:", text.substring(0, 500));
    return [];
  }

  const jsonString = text.substring(firstBracket, lastBracket + 1);

  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      console.error("[EXTRACT] Parsed value is not an array:", typeof parsed);
      return [];
    }
    // Normalize every claim to our strict schema
    const normalized = parsed.map(item => normalizeClaim(item));
    console.log(`[EXTRACT] Normalized ${normalized.length} claims. Sample:`, JSON.stringify(normalized[0]).substring(0, 200));
    return normalized;
  } catch (e: any) {
    console.error("[EXTRACT] JSON.parse failed:", e.message, "Input:", jsonString.substring(0, 300));
    return [];
  }
}

/**
 * Validate parsed claims against the Zod schema.
 * Returns { success, data, error } where error is a human-readable string.
 */
function validateClaims(claims: any[]): {
  success: boolean;
  data?: z.infer<typeof DeniedClaimsArraySchema>;
  error?: string;
} {
  try {
    const validated = DeniedClaimsArraySchema.parse(claims);
    return { success: true, data: validated };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errorMessages = e.issues
        .slice(0, 5) // Limit to 5 errors to avoid prompt bloat
        .map((err) => `[${err.path.join(".")}]: ${err.message}`)
        .join("; ");
      return { success: false, error: `Zod validation failed: ${errorMessages}` };
    }
    return { success: false, error: `Unknown validation error: ${String(e)}` };
  }
}

/**
 * Extract with self-correction retry loop.
 * Attempts up to MAX_VALIDATION_ATTEMPTS times, feeding Zod errors back to the LLM.
 */
async function extractWithModel(model: string, base64Images: string[], apiKey: string): Promise<{
  claims: any[];
  validationAttempts: number;
}> {
  console.log(`[EXTRACT] Trying model: ${model} with ${base64Images.length} pages`);

  const imageContent: any[] = base64Images.map((img) => ({
    type: "image_url",
    image_url: {
      url: img.startsWith("data:") ? img : `data:image/png;base64,${img}`,
    },
  }));

  // Build initial messages
  const messages: any[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract ONLY denied claims from these EOB pages. Check the glossary/remark codes section at the bottom and map shorthand codes to their full denial meanings. Return ONLY a raw JSON array — no markdown." },
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
      const requestBody: any = {
        model,
        messages,
        temperature: 0.1,
        max_tokens: 8000,
      };

      // Use response_format for models that support it
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

      // Step 1: Parse JSON from raw response
      const parsed = sanitizeAndParseJSON(raw);

      // If we got an empty array back, that's valid (no denials found)
      if (parsed.length === 0) {
        console.log(`[EXTRACT] Model returned 0 claims — treating as valid (no denials found)`);
        return { claims: [], validationAttempts: attempt };
      }

      // Step 2: Validate with Zod
      const validation = validateClaims(parsed);

      if (validation.success) {
        console.log(`[EXTRACT] ✅ Zod validation passed on attempt ${attempt}. ${validation.data!.length} claims verified.`);
        return { claims: validation.data!, validationAttempts: attempt };
      }

      // Step 3: Validation failed — feed the error back to the LLM for self-correction
      console.warn(`[EXTRACT] ⚠ Zod validation failed on attempt ${attempt}: ${validation.error}`);

      if (attempt < MAX_VALIDATION_ATTEMPTS) {
        // Add the failed response and correction prompt to the conversation
        messages.push({
          role: "assistant",
          content: raw,
        });
        messages.push({
          role: "user",
          content: `Your previous response failed JSON validation. Error: ${validation.error}. Please correct this and return the strict JSON array. Every object MUST have all 9 required keys (patientAccount, patientName, dateOfService, billedCPT, denialCode, denialReason, billedAmount, paidAmount, payerName) as strings. If a field is not visible, use "Unknown".`,
        });
      } else {
        // Final attempt failed — return whatever we parsed (normalized) as a best effort,
        // but log a hard warning so Sentry picks it up
        console.error(`[EXTRACT] ❌ All ${MAX_VALIDATION_ATTEMPTS} validation attempts failed for ${model}. Returning best-effort data. Last error: ${validation.error}`);
        return { claims: parsed, validationAttempts: attempt };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
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
  claims: any[];
  validationAttempts: number;
}> {
  console.log(`[EXTRACT] Trying text model: ${model}`);

  const messages: any[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the raw text extracted from an EOB PDF document. Extract ONLY denied claims. Check for glossary/remark code sections and map shorthand codes to full denial codes.\n\n${text}`,
    },
  ];

  const supportsJsonMode = JSON_MODE_MODELS.has(model);

  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt++) {
    console.log(`[EXTRACT] Text model ${model}, validation attempt ${attempt}/${MAX_VALIDATION_ATTEMPTS}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const requestBody: any = {
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

      const parsed = sanitizeAndParseJSON(raw);

      if (parsed.length === 0) {
        return { claims: [], validationAttempts: attempt };
      }

      const validation = validateClaims(parsed);

      if (validation.success) {
        console.log(`[EXTRACT] ✅ Text mode Zod validation passed on attempt ${attempt}.`);
        return { claims: validation.data!, validationAttempts: attempt };
      }

      console.warn(`[EXTRACT] ⚠ Text mode Zod validation failed on attempt ${attempt}: ${validation.error}`);

      if (attempt < MAX_VALIDATION_ATTEMPTS) {
        messages.push({ role: "assistant", content: raw });
        messages.push({
          role: "user",
          content: `Your previous response failed JSON validation. Error: ${validation.error}. Please correct this and return the strict JSON array with all 9 required keys as strings.`,
        });
      } else {
        console.error(`[EXTRACT] ❌ Text mode: All ${MAX_VALIDATION_ATTEMPTS} attempts failed for ${model}. Returning best-effort data.`);
        return { claims: parsed, validationAttempts: attempt };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
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

    // Check trial / subscription — block extraction if expired
    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_ends_at, subscription_status")
      .eq("id", user.id)
      .single();

    if (profile) {
      const now = new Date();
      const trialEndsAt = new Date(profile.trial_ends_at);
      const hasActiveSubscription = ['active', 'trialing'].includes(profile.subscription_status);
      if (!hasActiveSubscription && now > trialEndsAt) {
        return NextResponse.json(
          {
            error: "Your 14-day free trial has expired.",
            code: "PAYMENT_REQUIRED",
            checkoutUrl: process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL
          },
          { status: 402 }
        );
      }
    }

    let body: any;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error("[EXTRACT] Failed to parse request body:", parseError.message);
      return NextResponse.json({ error: "Request payload too large or malformed. Try uploading fewer pages at once." }, { status: 413 });
    }

    const { images, text } = body;
    const isTextMode = !!text && typeof text === "string" && text.length > 50;

    if (!isTextMode && (!images || !Array.isArray(images) || images.length === 0)) {
      return NextResponse.json({ error: "No images or text provided." }, { status: 400 });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "API misconfigured. Missing OPENROUTER_API_KEY." }, { status: 500 });
    }

    let deniedClaims: any[] = [];
    const errors: string[] = [];
    let totalValidationAttempts = 0;

    // ── TEXT MODE: send raw PDF text to a text-based LLM ──
    if (isTextMode) {
      console.log(`[EXTRACT] TEXT MODE — ${text.length} chars from user ${user.id}`);
      console.log(`[EXTRACT] Text preview: ${text.substring(0, 300)}`);

      const TEXT_MODELS = [
        "google/gemini-2.0-flash-001",
        "meta-llama/llama-3-8b-instruct:free",
        "google/gemma-2-9b-it:free",
      ];

      for (const model of TEXT_MODELS) {
        try {
          const result = await extractTextWithRetry(model, text, OPENROUTER_API_KEY);
          deniedClaims = result.claims;
          totalValidationAttempts = result.validationAttempts;
          console.log(`[EXTRACT] Text mode parsed ${deniedClaims.length} claims (validated in ${totalValidationAttempts} attempt(s))`);
          break;
        } catch (err: any) {
          console.warn(`[EXTRACT] Text model ${model} failed: ${err.message}`);
          errors.push(`${model}: ${err.message}`);
        }
      }
    }
    // ── VISION MODE: send rendered images to a vision-capable LLM ──
    else {
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
          const result = await extractWithModel(model, batch, OPENROUTER_API_KEY);
          deniedClaims = [...deniedClaims, ...result.claims];
          totalValidationAttempts = Math.max(totalValidationAttempts, result.validationAttempts);
          batchSuccess = true;
          console.log(`[EXTRACT] Batch ${batchIndex + 1}/${batches.length} succeeded with ${model}: ${result.claims.length} claims (validated in ${result.validationAttempts} attempt(s))`);
          break;
        } catch (err: any) {
          console.warn(`[EXTRACT] ${model} failed on batch ${batchIndex + 1}: ${err.message}`);
          errors.push(`Batch ${batchIndex + 1} — ${model}: ${err.message}`);
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
        warnings: errors,
      });
    }

    return NextResponse.json({
      success: true,
      claims: unique,
      totalPages: images?.length || 0,
      totalDenials: unique.length,
      validationAttempts: totalValidationAttempts,
    });
  } catch (error: any) {
    console.error("[EXTRACT FATAL]", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || "Unknown failure"}` },
      { status: 500 }
    );
  }
}
