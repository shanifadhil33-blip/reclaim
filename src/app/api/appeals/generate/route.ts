import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Free models on OpenRouter — ordered by preference.
const FREE_MODELS = [
  "meta-llama/llama-3-8b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "openrouter/free",
];

const SYSTEM_PROMPT = `You are a medical billing appeals expert. 
Write a highly professional, legally persuasive appeal letter to an insurance company protesting a claim denial. 
Do not use Markdown formatting. Return only the raw letter text.
Structure the letter with:
- Date
- Insurance Company Name
- Patient/Claim Details
- A strong opening statement. IMPORTANT: Always use the salutation "To the Appeals Department,". Do NOT use "Dear Sir or Madam," or any gendered greetings.
- A clinical justification based on the provided notes
- A demand for payment or reprocessing
- A professional sign-off. Use "[Billing Representative]" as the signer name and "[Practice / Provider]" as the practice name in the signature block.`;

async function generateLetter(model: string, data: any, apiKey: string) {
  const userPrompt = `
Insurance Company: ${data.insuranceCompany}
Date of Service: ${data.dateOfService}
Billed Code: ${data.billedCode}
Denial Reason: ${data.denialReason}
Patient Account: ${data.patientAccount || "N/A"}
Clinical Notes: ${data.clinicalNotes}

Please write the appeal letter based on these details.
`;

  console.log(`[GENERATE] Trying model: ${model}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });
    clearTimeout(timeoutId);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`[${model}] Connection timed out after 25 seconds.`);
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 429) {
      throw new Error("AI generation network is currently at capacity. Please try again in a few seconds.");
    }
    throw new Error(`AI model ${model} returned HTTP ${response.status}. ${errorBody}`);
  }

  const completion = await response.json();

  if (completion.error) {
    throw new Error(`[${model}] ${completion.error.message || "Unknown API error"}`);
  }

  if (!completion.choices || completion.choices.length === 0) {
    throw new Error(`[${model}] Returned no choices`);
  }

  return completion.choices[0]?.message?.content?.trim() || "";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Check trial / subscription
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

    const body = await req.json();
    const { insuranceCompany, dateOfService, billedCode, denialReason, clinicalNotes, patientAccount } = body;

    console.log("[GENERATE] Payload:", {
      insuranceCompany, dateOfService, billedCode, denialReason,
      clinicalNotesLength: clinicalNotes?.length || 0,
    });

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "API misconfigured. Missing OPENROUTER_API_KEY." }, { status: 500 });
    }

    let generatedLetter = "";
    const errors: string[] = [];

    for (const model of FREE_MODELS) {
      try {
        generatedLetter = await generateLetter(model, body, OPENROUTER_API_KEY);
        console.log(`[GENERATE] Success with ${model} (${generatedLetter.length} chars)`);
        break;
      } catch (err: any) {
        console.warn(`[GENERATE] ${model} failed: ${err.message}`);
        errors.push(err.message);
      }
    }

    if (!generatedLetter) {
      const lastError = errors[errors.length - 1] || "";
      if (lastError.includes("capacity") || lastError.includes("429")) {
        return NextResponse.json(
          { error: true, message: "AI generation network is currently at capacity. Please try again in a few seconds.", status: 429 },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: true, message: `All AI models failed. Last error: ${lastError}`, status: 502 },
        { status: 502 }
      );
    }

    // Save to Supabase
    const dbPayload = {
      user_id: user.id,
      insurance_company: insuranceCompany,
      date_of_service: dateOfService,
      medical_code: billedCode,
      denial_code: denialReason,
      clinical_notes: clinicalNotes,
      patient_account: patientAccount || null,
      status: "completed",
      generated_letter: generatedLetter
    };

    const { data: appealData, error: dbError } = await supabase
      .from("appeals")
      .insert(dbPayload)
      .select()
      .single();

    if (dbError) {
      console.error("[SUPABASE ERROR]", JSON.stringify(dbError, null, 2));
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log("[GENERATE] Saved. Appeal ID:", appealData?.id);
    return NextResponse.json({ success: true, appeal: appealData, letter: generatedLetter });
  } catch (error: any) {
    console.error("[GENERATE FATAL]", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || "Unknown failure"}` },
      { status: 500 }
    );
  }
}
