# Reclaim — Solo Biller Utility

A portfolio project for drafting insurance appeal letters. Drop an EOB PDF, extract denied claims via Vision AI, and draft an appeal from the notes you paste. Not a HIPAA product. Not for real patient information.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database & Auth:** Supabase (PostgreSQL, Auth, RLS)
- **AI:** Gemini, then Groq, then OpenRouter. A provider is skipped when its key is missing.
- **PDF Processing:** pdfjs-dist (client-side rendering)

## How It Works

1. **Drop EOB PDF** — PDF pages are rendered in-browser via PDF.js
2. **AI Extraction** — Page images are sent to a Vision LLM that finds only denied claims
3. **Triage** — Denied claims populate a clean table with denial codes and payer info
4. **Generate** — Paste clinical notes → AI generates a formal appeal letter
5. **Export** — Copy to clipboard or download as .txt

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env.example`. Extraction and letters keep working when a key is absent: that provider is skipped. If none of the three keys are set, the app returns a short message and does not call a model.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Service role key |
| `GEMINI_API_KEY` | first AI choice | Direct Gemini API (`generativelanguage.googleapis.com`) |
| `GEMINI_MODELS` | no | Comma-separated model chain. Default: `gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash,gemini-2.5-flash-lite`. Flash-Lite models are first because Flash models on this key allow only 20 requests a day. |
| `GROQ_API_KEY` | second AI choice | Groq's OpenAI-compatible API. Used for text extraction and letters, not page images. |
| `GROQ_MODEL` | no | Default `openai/gpt-oss-120b`. The request allows extra output tokens so reasoning fits. |
| `OPENROUTER_API_KEY` | last resort | The previous OpenRouter model chains, unchanged. |

A signed-in `GET /api/ai-health` pings the first model of each configured provider and returns `{ provider, configured, models: [{ model, ok, httpStatus }] }`. Add `?all=1` to ping every model. Unconfigured providers are listed and not called. The response never includes keys or upstream error text.

