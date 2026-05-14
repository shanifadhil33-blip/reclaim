# Reclaim — Solo Biller Utility

A single-purpose automation tool for freelance medical billers. Drop an EOB PDF, extract denied claims via Vision AI, and generate compliant appeal letters in seconds.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database & Auth:** Supabase (PostgreSQL, Auth, RLS)
- **Payments:** Polar.sh ($19/month subscription)
- **AI:** OpenRouter (Vision models for EOB extraction, text models for letter generation)
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

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_POLAR_CHECKOUT_URL=
```
