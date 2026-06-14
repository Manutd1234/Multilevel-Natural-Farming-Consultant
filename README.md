# KisaanVaani

Voice-Based Natural Farming Consultant for Connecting Dreams Foundation Option B.

This is a complete rebuild around the supplied A-standard plan, adapted to the requested deployment stack:

- **LLM/Vision:** Gemini API through Vercel Functions
- **STT:** Hugging Face Whisper (`openai/whisper-small`) through `/api/transcribe`
- **Weather:** Open-Meteo Forecast API
- **Frontend:** Vercel-hosted mobile web UI with large voice/image controls
- **Guardrails/RAG:** local JSON/JSONL natural farming knowledge base

## Chosen Modules

1. **Weather & Market Intelligence**
   - Open-Meteo forecast by district coordinates
   - seeded mandi fallback dataset with 7-day sparkline
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

Required for Gemini-backed answers:

```bash
GEMINI_API_KEY=your_google_ai_studio_key
```

Optional:

```bash
GEMINI_MODEL=gemini-3.5-flash
HF_TOKEN=your_hugging_face_token
WHISPER_MODEL=openai/whisper-small
WHISPER_ENDPOINT_URL=https://your-custom-whisper-endpoint
```

`HF_TOKEN` enables the Hugging Face Inference API route. `WHISPER_ENDPOINT_URL` is preferred if you host a downloaded Whisper model on Hugging Face Spaces or another GPU/CPU endpoint.

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
  market.js        seeded mandi fallback analysis
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

1. Import this GitHub repo in Vercel.
2. Set `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables.
3. Set either `HF_TOKEN` or `WHISPER_ENDPOINT_URL` for the Whisper route.
4. Deploy `main`.

No build step is required.

## Sources

- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Hugging Face Whisper Small](https://huggingface.co/openai/whisper-small)
