Project Overview:
Build a B2B SaaS web application called "DenialDefend". The app automatically generates highly professional, compliant insurance appeal letters for denied medical and dental claims.

Technical Stack:

Framework: Next.js (App Router) with React.

Styling: Tailwind CSS + shadcn/ui components (minimalist, corporate B2B aesthetic).

Database & Auth: Supabase (PostgreSQL, Auth, Row Level Security, and Realtime subscriptions).

Payments: Polar.sh API for managing a $19/month recurring subscription.

Queue System: Upstash QStash (Serverless message queue to handle concurrency and protect API rate limits).

LLM Brain: OpenRouter API using standard fetch with an automatic model fallback array.

Core Architecture & Concurrency Rules:

No Direct LLM Calls from Frontend: The Next.js frontend must never wait synchronously for the LLM.

The Queue Flow:

User submits the appeal form.

Backend creates a row in the Supabase Appeals table with status: 'pending'.

Backend dispatches an asynchronous background event to Upstash QStash containing the appeal_id.

The frontend listens to the Supabase row via Supabase Realtime, displaying a "Drafting Appeal..." loading state.

The Worker (QStash Endpoint):

QStash triggers a separate backend API route (e.g., /api/process-appeal).

This route fetches the data, constructs the prompt, and calls OpenRouter.

CRITICAL OpenRouter Syntax: The fetch payload body must use a fallback array to prevent rate limit failures. Do not use a single string for the model. Use this exact syntax:
"models": ["google/gemini-1.5-flash", "meta-llama/llama-3-8b-instruct", "mistralai/mistral-7b-instruct"]

Upon completion, the route updates the Supabase Appeals row to status: 'completed' and saves the generated text. The frontend automatically updates via Realtime.

Database Schema (Supabase):

Profiles Table: id (UUID, references auth.users), polar_subscription_id (String, nullable), subscription_status (String, default: 'trial'), trial_credits (Integer, default: 3).

Appeals Table: id (UUID), user_id (UUID), insurance_company (String), denial_reason (String), procedure_code (String - accommodates CPT or CDT codes), clinical_notes (Text), generated_letter (Text, nullable), status (Enum: 'pending', 'completed', 'failed').

User Interface Flow:

Auth & Billing: Supabase email/password auth. Check Profiles table on load. If trial_credits === 0 and no active Polar subscription, redirect the user to a Polar.sh checkout link for the $19/month plan.

Dashboard: Two-column layout. Left side: The Input Form. Right side: The Output/History view.

Input Form:

Insurance Company Name (Text input)

Date of Service (Date picker)

Billed Code (Text input - placeholder: "e.g., CPT 99214 or ADA D0150")

Denial Reason (Text input - placeholder: "e.g., CO-50 Not Medically Necessary")

Clinical Notes (Large Textarea for pasting raw chart data)

Output View: When status flips to completed, display the letter in a rich text editor. Include two buttons: "Copy Text" and "Download as PDF".

LLM System Prompt Architecture:
Use this exact system message when calling OpenRouter:

"You are an elite Revenue Cycle Manager specializing in both standard medical and dental insurance appeals. Your objective is to write a formal, legally compliant appeal letter to overturn a denied claim.
Analyze the provided Denial Reason, the Billed Code (CPT or CDT), and the Doctor's Clinical Notes. Extract the exact clinical justification from the notes to prove medical necessity.
Format the response as a highly professional business letter. Do not hallucinate patient data or medical facts; rely strictly on the provided context. Maintain an authoritative, factual, and persuasive tone designed to compel the insurance adjudicator to release the funds."

Phased Build Instructions:

Phase 1: Scaffold Next.js, configure Tailwind/shadcn, and build the UI layout.

Phase 2: Integrate Supabase Auth and construct the database tables.

Phase 3: Build the backend. Set up the Upstash QStash webhook route and the OpenRouter fetch call using the exact models fallback array syntax.

Phase 4: Wire the frontend form to Supabase Realtime so it reacts instantly when QStash finishes processing the OpenRouter request.

Phase 5: Integrate Polar.sh to gate the application after 3 trial uses, setting up a webhook route (/api/polar-webhook) to listen for subscription events and update the user's subscription_status in Supabase.