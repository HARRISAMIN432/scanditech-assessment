# Review Desk – AI-Powered Review Management

Import customer reviews from JSON, analyse language and sentiment with Gemini, draft replies in each review's own language, edit them, regenerate, and approve. Everything persists in Supabase.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS + global CSS design system · Supabase (PostgreSQL) · Google Gemini (free tier)

## Run locally

1. **Install:** `npm install`
2. **Database:** create a free project at supabase.com, open *SQL Editor*, paste and run `supabase/schema.sql`.
3. **Environment:** `cp .env.example .env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (secret, server-only) |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Optional. Default `gemini-2.5-flash`. Use any free-tier model your key can access. |

4. **Start:** `npm run dev` → http://localhost:3000
5. Click **Import** and choose `data/sample-reviews.json`.

## Deploy (Vercel)

Push to GitHub, import the repo in Vercel, add the four environment variables above, deploy. No other setup is needed.

## Demo flow

Import → reviews are analysed automatically (language + sentiment, batched in one AI call) → **Generate reply** on a card (or **Draft all pending**) → edit the text → **Save changes** (status becomes *Edited*) → **Regenerate** for a different draft → **Approve reply** → refresh the page: everything is still there.

Status values: `pending` (no reply) → `generated` (AI draft) → `edited` (user changed it) → `approved`.

## Architecture

```
src/
  app/api/*            Thin route handlers: parse request, call a service, return JSON
  lib/services/        Business logic (import, analysis, reply workflow)
  lib/repositories/    All Supabase queries (the only place that touches the DB)
  lib/ai/              Gemini client, prompts, response validation
  lib/validation.ts    Zod schemas for every input
  lib/client/          Browser API client and long-running workflows
  hooks/               Data fetching and reply-workflow logic for the UI
  components/          Presentational React components (ui/ and dashboard/)
  app/globals.css      Design tokens and reusable classes (.btn, .card, .badge, ...)
```

**API**

| Route | Purpose |
|---|---|
| `POST /api/import` | Upload JSON (multipart). Validates row by row, reports invalid rows, skips duplicates |
| `GET /api/reviews` | Search, filter (sentiment, status, language), sort, paginate |
| `GET /api/stats` | Counts, average rating, sentiment and reply progress |
| `POST /api/analyze` | Language + sentiment for up to 16 reviews per call |
| `POST /api/reviews/:id/generate` | Generate a reply; `{ "regenerate": true }` for a new one |
| `PATCH /api/reviews/:id` | `{ action: "save" \| "approve", reply_text }` |
| `GET /api/export?format=csv\|json` | Export reviews and replies |

**Database:** `businesses` and `reviews`. Reviews keep the source id (`external_id`, unique per business, so re-imports are safe), analysis fields, `ai_reply` (original draft), `reply_text` (current wording), `reply_status`, and timestamps. RLS is enabled with no policies, so the public key cannot read anything; only the server's service role key can.

**AI integration**
- Gemini is only called from server code; keys never reach the browser.
- Structured JSON output with a response schema, then Zod validation. Empty, malformed, too-short or wrong-language replies are rejected and retried; failures surface as clear messages.
- Retries with backoff on 429/5xx/timeouts; the UI shows a friendly rate-limit message.
- A stored draft is never regenerated unless the user clicks Regenerate. Analysis is batched (16 reviews per call). "Draft all pending" is paced to about 13 requests per minute.
- Review text is passed as delimited data and the model is told to ignore instructions inside it. The prompt forbids invented refunds, policies or contact details.

## Scaling notes

- Stats are computed in the API from lightweight columns; for very large datasets move them into a SQL view or RPC.
- Single-business scope matches the assignment. Multi-tenancy would add `business_id` to the request context and auth on the routes.
- Bulk generation is client-driven so it survives serverless time limits; a queue (e.g. Supabase queues, Inngest) would be the next step.
