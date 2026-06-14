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
WHISPER_MODEL=openai/whisper-small
```

## Local Model Download

```bash
node scripts/download-whisper.mjs --model openai/whisper-small --weights
```

Because model weights are large, `models/` is ignored by Git.

## No Build Step

This project is static HTML/CSS/JS plus Vercel Functions. Vercel can deploy from the root without installing dependencies.
