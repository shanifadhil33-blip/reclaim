import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyLetterFacts, resolveLetterDate } from "@/lib/appeal-letter";

export const maxDuration = 60;

// Free models on OpenRouter — ordered by preference.
const FREE_MODELS = [
  "openrouter/free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

const SYSTEM_PROMPT = `You are a medical billing appeals assistant.
Write a clear professional appeal letter to an insurance company about a claim denial.
The letter is a draft for a person to review. Do not call it legal advice.
Do not use Markdown formatting. Return only the raw letter text.
The first line is the letter date you are given. Do not write any other date.
Name the patient with the patient name. The member id is a separate account number. Never use the member id as the patient's name.
Use only facts that appear in the clinical notes and the labeled EOB fields. Do not add symptoms, severity, duration, diagnoses, or adjectives that are not written there. If the notes say "chest pain", write "chest pain", not "acute chest pain".
If no street address is provided, the address line is exactly [Payer address].
Structure the letter with:
- The given letter date
- Payer name
- [Payer address] when no address was provided
- Patient name and member id on separate labeled lines
- A strong opening statement. Always use the salutation "To the Appeals Department,". Do not use "Dear Sir or Madam," or any gendered greeting.
- A justification that quotes the notes and does not add to them
- A request for reprocessing
- A professional sign-off. Use "[Billing Representative]" as the signer name and "[Practice / Provider]" as the practice name.`;

type LetterInput = {
  letterDate: string;
  insuranceCompany: string;
  dateOfService: string;
  billedCode: string;
  denialCode: string;
  denialReason: string;
  patientName: string;
  memberId: string;
  billedAmount: string;
  paidAmount: string;
  clinicalNotes: string;
};

function textField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown failure";
}

async function generateLetter(model: string, data: LetterInput, apiKey: string) {
  const userPrompt = `
Letter date (use this exact date and no other): ${data.letterDate}
Payer name: ${data.insuranceCompany}
Patient name: ${data.patientName}
Member ID (not the patient's name): ${data.memberId}
Date of service: ${data.dateOfService}
Billed code: ${data.billedCode}
Billed amount: ${data.billedAmount}
Paid amount: ${data.paidAmount}
Denial code: ${data.denialCode}
Denial reason: ${data.denialReason}
Clinical notes (the only clinical facts you may mention):
${data.clinicalNotes}

Write the appeal letter from these fields only.
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
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`[${model}] Connection timed out after 25 seconds.`);
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 429) {
      throw new Error("AI generation network is currently at capacity. Please try again in a few seconds.");
    }
    console.error(`[GENERATE] ${model} HTTP ${response.status}, body length ${errorBody.length}`);
    throw new Error(`AI model ${model} returned HTTP ${response.status}.`);
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

    const body: unknown = await req.json();
    const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const insuranceCompany = textField(record.insuranceCompany);
    const dateOfService = textField(record.dateOfService);
    const billedCode = textField(record.billedCode);
    const denialCode = textField(record.denialCode);
    const denialReason = textField(record.denialReason);
    const clinicalNotes = textField(record.clinicalNotes);
    const patientName = textField(record.patientName);
    const memberId = textField(record.memberId) || textField(record.patientAccount);
    const billedAmount = textField(record.billedAmount);
    const paidAmount = textField(record.paidAmount);
    const letterDate = resolveLetterDate(record.letterDate, new Date());
    const facts: LetterInput = {
      letterDate,
      insuranceCompany,
      dateOfService,
      billedCode,
      denialCode,
      denialReason,
      patientName,
      memberId,
      billedAmount,
      paidAmount,
      clinicalNotes,
    };

    console.log("[GENERATE] Request lengths:", {
      notes: clinicalNotes.length,
      denial: denialReason.length,
    });

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "API misconfigured. Missing OPENROUTER_API_KEY." }, { status: 500 });
    }

    let generatedLetter = "";
    const errors: string[] = [];

    for (const model of FREE_MODELS) {
      try {
        generatedLetter = applyLetterFacts(await generateLetter(model, facts, OPENROUTER_API_KEY), {
          letterDate,
          patientName,
          memberId,
        });
        console.log(`[GENERATE] Success with ${model} (${generatedLetter.length} chars)`);
        break;
      } catch (err: unknown) {
        console.warn(`[GENERATE] ${model} failed`);
        errors.push(errorText(err));
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
      denial_code: [denialCode, denialReason].filter(Boolean).join(" — "),
      clinical_notes: clinicalNotes,
      patient_account: memberId || null,
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
  } catch (error: unknown) {
    console.error("[GENERATE FATAL]", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${errorText(error)}` },
      { status: 500 }
    );
  }
}
