import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const EXTRACTION_SYSTEM_PROMPT = `You are an elite medical billing data extractor. Review these EOB images. Extract ONLY the denied claims (e.g., claims with allowed amount $0 and a denial remark code).

CRITICAL SEARCH INSTRUCTIONS:
1. PAYER NAME: Look at the VERY TOP of the page. The insurance company name is usually in the fax header (e.g., 'FROM: DELTA DENTAL') or the main logo area. You MUST extract this for every row.
2. PATIENT NAME: Look in the first column of the claims table. It is often formatted as 'LASTNAME, F' (e.g., 'DAVIS, R'). If a patient account or member ID is visible, include it.
3. DENIAL CODES: Match the tiny shorthand codes in the table (e.g., '50b', '119d') to the 'Glossary' or 'Remark Codes' section at the bottom of the page to confirm it is a denial and get the full denial description.
4. If the "Allowed" amount is $0.00 or the "Paid" amount is $0.00 and there is a remark code, that IS a denial — extract it.

OUTPUT FORMAT:
You MUST return a raw JSON array. Do NOT use markdown formatting. Do NOT wrap in code blocks. The first character MUST be [ and the last MUST be ].

Use ONLY these exact camelCase keys for every object:
[
  {
    "patientAccount": "the patient account number or member ID if visible",
    "patientName": "LASTNAME, FIRST — this is the MOST IMPORTANT patient field",
    "dateOfService": "MM/DD/YY",
    "billedCPT": "D0150 or 99213",
    "denialCode": "CO-50",
    "denialReason": "full text explanation of the denial from the glossary",
    "billedAmount": "$123.00",
    "paidAmount": "$0.00",
    "payerName": "the insurance company name from the page header"
  }
]

If a field is not visible, use "Unknown". If there are no denials at all, return [].`;

// Models to try in order — prefer vision-capable models
const VISION_MODELS = [
  "google/gemini-2.0-flash-001",
  "google/gemini-1.5-pro",
  "meta-llama/llama-4-scout:free",
  "google/gemini-2.0-flash-lite-001",
];

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

async function extractWithModel(model: string, base64Images: string[], apiKey: string) {
  console.log(`[EXTRACT] Trying model: ${model} with ${base64Images.length} pages`);

  const content: any[] = [
    { type: "text", text: "Extract ONLY denied claims from these EOB pages. Check the glossary/remark codes section at the bottom and map shorthand codes to their full denial meanings. Return ONLY a raw JSON array — no markdown." }
  ];

  for (const img of base64Images) {
    content.push({
      type: "image_url",
      image_url: {
        url: img.startsWith("data:") ? img : `data:image/png;base64,${img}`,
      }
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      })
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
    console.log("RAW AI RESPONSE:", raw);
    console.log(`[EXTRACT] Raw response from ${model}: ${raw.length} chars.`);
    if (!raw) {
      throw new Error("Model returned empty response");
    }

    const parsed = sanitizeAndParseJSON(raw);
    console.log(`[EXTRACT] Parsed ${parsed.length} claims from ${model}`);
    return parsed;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`${model} timed out after 90 seconds`);
    }
    throw error;
  }
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
      if (profile.subscription_status !== "active" && now > trialEndsAt) {
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
          console.log(`[EXTRACT] Trying text model: ${model}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
                { role: "user", content: `Here is the raw text extracted from an EOB PDF document. Extract ONLY denied claims. Check for glossary/remark code sections and map shorthand codes to full denial codes.\n\n${text}` }
              ],
              temperature: 0.1,
              max_tokens: 8000,
            })
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
          console.log(`[EXTRACT] Text model ${model} response: ${raw.length} chars. First 300: ${raw.substring(0, 300)}`);

          deniedClaims = sanitizeAndParseJSON(raw);
          console.log(`[EXTRACT] Text mode parsed ${deniedClaims.length} claims`);
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
          const results = await extractWithModel(model, batch, OPENROUTER_API_KEY);
          deniedClaims = [...deniedClaims, ...results];
          batchSuccess = true;
          console.log(`[EXTRACT] Batch ${batchIndex + 1}/${batches.length} succeeded with ${model}: ${results.length} claims`);
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

    console.log(`[EXTRACT] Final: ${unique.length} unique claims (from ${deniedClaims.length} total, ${errors.length} errors)`);

    // If we got zero claims but had errors, report the errors
    if (unique.length === 0 && errors.length > 0) {
      return NextResponse.json({
        success: true,
        claims: [],
        totalPages: images?.length || 0,
        totalDenials: 0,
        warnings: errors,
      });
    }

    return NextResponse.json({
      success: true,
      claims: unique,
      totalPages: images?.length || 0,
      totalDenials: unique.length,
    });
  } catch (error: any) {
    console.error("[EXTRACT FATAL]", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || "Unknown failure"}` },
      { status: 500 }
    );
  }
}
