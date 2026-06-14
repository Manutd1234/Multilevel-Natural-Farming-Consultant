# KisaanVaani

Voice-Based Natural Farming Consultant for Connecting Dreams Foundation Option B.

### Zero-config demo mode

Without any environment variables the app still works:
- **Weather:** Open-Meteo (free, no key) — live district forecasts
- **Market:** seeded fallback mandi dataset — 7 crops, realistic prices
- **Voice:** browser Web Speech API — Hindi + Hinglish, no server needed
- **Disease/Advisory:** local organic knowledge base — no LLM required

Add `GEMINI_API_KEY` (free at aistudio.google.com) to unlock Gemini-backed answers.

---

This is a complete rebuild around the supplied A-standard plan, adapted to the requested deployment stack:

- **LLM/Vision:** Gemini API through Vercel Functions
- **STT:** Hugging Face Whisper (`openai/whisper-small`) through `/api/transcribe`
- **Weather:** Open-Meteo Forecast API
- **Market:** data.gov.in Agmarknet live route with seeded fallback
- **Frontend:** Vercel-hosted mobile web UI with large voice/image controls
- **Guardrails/RAG:** local JSON/JSONL natural farming knowledge base

## Chosen Modules

1. **Weather & Market Intelligence**
   - Open-Meteo forecast by district coordinates
   - data.gov.in Agmarknet live mandi lookup with seeded fallback dataset
   - 7-day sparkline and sell/hold/wait signal
   - Gemini synthesis for sell/hold/wait advisory

2. **Disease Identification & Treatment**
   - image + symptom text upload
   - Gemini multimodal triage
   - organic-only remedies and KVK escalation

## Run Locally

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

For local API route testing without Vercel CLI:

```bash
node scripts/dev-server.mjs
```

Local static serving can test only the UI. The Node dev server can test the serverless API files too.

## Environment Variables

**Required** for Gemini-backed answers:

```bash
GEMINI_API_KEY=your_google_ai_studio_key   # free at aistudio.google.com
```

**Optional** — the app works without these (falls back gracefully):

```bash
GEMINI_MODEL=gemini-2.0-flash              # default; override to gemini-1.5-flash if needed
DATA_GOV_API_KEY=your_data_gov_india_key   # enables live mandi prices from data.gov.in
DATA_GOV_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
HF_TOKEN=your_hugging_face_token           # only needed for server-side Whisper fallback
WHISPER_MODEL=openai/whisper-small
WHISPER_ENDPOINT_URL=https://your-custom-whisper-endpoint
```

> **Voice (STT) — no token needed.** The microphone button uses the browser's built-in Web Speech API by default (Android Chrome, desktop Chrome/Edge). No API key or server config required. `HF_TOKEN` is a secondary fallback only.
>
> `DATA_GOV_API_KEY` enables live mandi prices; the app falls back to seeded data (7 crops) when the live API is unavailable.

## Download Whisper From Hugging Face

The Vercel app keeps Whisper configuration separate from Git. To download Whisper artifacts locally:

```bash
node scripts/download-whisper.mjs --model openai/whisper-small
```

To also download large weights:

```bash
node scripts/download-whisper.mjs --model openai/whisper-small --weights
```

Downloaded files are stored under `models/` and ignored by Git.

## Open-Meteo Endpoint

Correct URL format:

```text
https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m
```

The app uses:

```text
/api/weather?district=hisar
```

which proxies to Open-Meteo with current, hourly, and daily variables.

## File Structure

```text
api/
  advisor.js       Gemini grounded advisor route
  disease.js       Gemini image/text disease triage
  market.js        data.gov.in Agmarknet lookup + seeded mandi fallback
  transcribe.js    Hugging Face Whisper route
  weather.js       Open-Meteo wrapper
knowledge_base/
  crop_calendar.jsonl
  diseases.jsonl
  districts.json
  market_fallback.json
  zbnf_practices.jsonl
lib/
  shared.js
scripts/
  download-whisper.mjs
src/
  app.js
  styles.css
```

## Deploy To Vercel

### Quick setup (2 minutes)

1. Fork this repo on GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → import your fork.
3. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` — get a free key at [aistudio.google.com](https://aistudio.google.com)
4. Click **Deploy**.

That's it. Voice works out of the box via browser Web Speech API. Mandi prices fall back to the seeded dataset when the live API is unavailable.

### Optional: enable live mandi prices

Register at [data.gov.in](https://data.gov.in) and add `DATA_GOV_API_KEY` to Vercel env vars.

No build step is required.

## Sources

- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Hugging Face Whisper Small](https://huggingface.co/openai/whisper-small)
