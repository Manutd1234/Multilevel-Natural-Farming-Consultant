# Kheti Saathi

Kheti Saathi is a voice-first Natural Farming Consultant prototype for Connecting Dreams Foundation Round 2, Option B.

Selected Option B requirements:

- Weather & Market Intelligence
- Seed & Financial Guidance

The prototype is a static mobile web app with browser STT/TTS, demo mandi intelligence, Open-Meteo weather lookup, seed/cost calculations, Hinglish/Hindi/English response modes, and strict prompt guardrails.

## Run Locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

The app works with demo data if the weather API is unavailable. Voice recognition depends on browser support and microphone permission.

## Project Plan

1. Extract Option B requirements from the assignment PDF.
2. Run parallel agents for market analysis, model architecture, and voice-first UX/localization.
3. Build a static mobile prototype with Web Speech API input/output.
4. Add local market, seed, finance, and guardrail data.
5. Document market analysis, model analysis, prompt design, and demo flow.
6. Validate the files and test the browser experience locally.

## Tech Stack

- Frontend: HTML, CSS, JavaScript modules
- Voice input: Browser Web Speech API where available
- Voice output: Browser SpeechSynthesis
- Weather: Open-Meteo Forecast API with offline fallback
- Market data: Prototype demo bands with links to Agmarknet/eNAM for production integration
- AI layer: Retrieval-style deterministic advisor with strict guardrails in `src/advisor.js`

## Why This Approach

Farmers need short, trusted, voice-first advice more than a complex dashboard. This build keeps the first screen centered on one action: speak or ask. The response engine retrieves only from curated local data and marks uncertain or demo values clearly, which lowers hallucination risk while still showing an AI-ready architecture.

## Files

- `index.html` - app shell
- `src/app.js` - UI, voice, weather fetch, rendering
- `src/advisor.js` - guarded advisor logic
- `data/market-signals.json` - district, crop, and demo market intelligence
- `data/seed-finance.json` - seed rate, cost, rotation, subsidy notes
- `data/knowledge-base.json` - guardrails, trusted sources, quick questions
- `docs/market-analysis.md` - market and product analysis
- `docs/model-analysis.md` - model, STT/TTS, RAG, and deployment analysis
- `docs/prompt-design.md` - system prompt and response policy
- `docs/demo-script.md` - three-minute walkthrough plan
- `tests/validate_project.py` - lightweight project validation

## Source Notes

This prototype uses current official or primary sources for architecture and data planning:

- [Agmarknet](https://agmarknet.gov.in/)
- [eNAM](https://www.enam.gov.in/)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [India Meteorological Department](https://mausam.imd.gov.in/)
- [National Mission on Natural Farming](https://naturalfarming.dac.gov.in/)
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## Production Next Steps

- Replace demo mandi bands with Agmarknet/eNAM or state market data ingestion.
- Add server-side STT/TTS and a low-latency LLM voice pipeline for better multilingual handling.
- Add RAG over verified agronomy sources, crop calendars, soil health cards, and subsidy pages.
- Add agronomist review workflow for high-risk disease, pest, and finance advice.
- Add offline cache for the last weather, mandi, and seed recommendations.
