# Deployment

## GitHub

Push `main` to GitHub. Vercel can import the repo directly.

## Vercel

Set these under **Project → Settings → Environment Variables** (Production + Preview).
Vercel injects them into `process.env` at runtime — the local `.env` file is never
deployed (it is in both `.gitignore` and `.vercelignore`).

Required:

```bash
GEMINI_API_KEY=...        # Gemini-backed advisor + disease answers
```

Optional — every variable below has a graceful fallback if unset:

```bash
GEMINI_MODEL=gemini-2.0-flash               # default model
HF_TOKEN=...                                # server-side Whisper STT (browser Web Speech API works without it)
WHISPER_ENDPOINT_URL=...                    # alternative to HF_TOKEN: a custom Whisper endpoint
WHISPER_MODEL=openai/whisper-small
DATA_GOV_API_KEY=your_data_gov_india_key    # live Agmarknet mandi prices
DATA_GOV_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
```

`DATA_GOV_API_KEY` enables live Agmarknet mandi records through data.gov.in. If it is absent or the live API has no matching record, `/api/market` still returns the seeded demo mandi dataset with `live:false`.

## Local Model Download

```bash
node scripts/download-whisper.mjs --model openai/whisper-small --weights
```

Because model weights are large, `models/` is ignored by Git.

## No Build Step

This project is static HTML/CSS/JS plus Vercel Functions. Vercel can deploy from the root without installing dependencies.
