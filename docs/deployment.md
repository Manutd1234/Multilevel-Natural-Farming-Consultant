# Deployment

## GitHub

Push `main` to GitHub. Vercel can import the repo directly.

## Vercel

Required project environment variables:

```bash
GEMINI_API_KEY=...
```

Whisper configuration:

```bash
HF_TOKEN=...
```

or:

```bash
WHISPER_ENDPOINT_URL=...
```

Optional:

```bash
GEMINI_MODEL=gemini-3.5-flash
DATA_GOV_API_KEY=your_data_gov_india_key
DATA_GOV_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
WHISPER_MODEL=openai/whisper-small
```

`DATA_GOV_API_KEY` enables live Agmarknet mandi records through data.gov.in. If it is absent or the live API has no matching record, `/api/market` still returns the seeded demo mandi dataset with `live:false`.

## Local Model Download

```bash
node scripts/download-whisper.mjs --model openai/whisper-small --weights
```

Because model weights are large, `models/` is ignored by Git.

## No Build Step

This project is static HTML/CSS/JS plus Vercel Functions. Vercel can deploy from the root without installing dependencies.
