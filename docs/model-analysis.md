# Model Analysis

## MVP Choice

The assignment asks for a functional prototype, so the MVP uses:

- browser Web Speech API for STT,
- browser SpeechSynthesis for TTS,
- a deterministic retrieval-style advisor in JavaScript,
- JSON knowledge files for market, weather, seed, finance, and guardrails.

This keeps the prototype deployable as a static app while still demonstrating the intended STT/TTS and guardrail pipeline.

## Production Voice Pipeline

Recommended production path:

1. Capture microphone audio on mobile.
2. Use turn-based push-to-talk STT with Hindi/Hinglish domain hints for crop names, mandi names, districts, and natural farming terms.
3. Normalize district, crop, season, acreage, and intent.
4. Retrieve verified weather, market, seed, subsidy, and agronomy snippets.
5. Generate a short answer with a constrained LLM prompt and structured output.
6. Run a policy/grounding check.
7. Speak the answer through TTS and show compact cards.

For a production OpenAI stack, use a server-side audio pipeline rather than exposing API keys in browser JavaScript:

- STT: a Hindi/Hinglish-capable transcription model with a prompt containing local crop and mandi terms.
- LLM: a tool-using reasoning model through the Responses API or equivalent agent API.
- TTS: a low-latency voice model with slow, clear delivery and controllable tone.
- Realtime voice: use only after the turn-based version is stable, because rural networks and safety review are easier with discrete turns.

## Model Options

Browser-only:

- Best for a no-backend assignment prototype.
- Weakness: browser STT support varies and offline recognition is not guaranteed.

Server STT + LLM + TTS:

- Best for production reliability, logs, and prompt monitoring.
- Adds server cost, latency, and privacy requirements.

Realtime voice model:

- Best user experience for natural conversation.
- Needs careful tool calling, response grounding, and rural-network fallback.

## Guardrail Design

The app should never let the model answer from free-form memory for risky farming decisions. Use this sequence:

1. Classify intent: weather, market, seed, finance, disease, pest, education.
2. Extract entities: district, crop, season, acres, date.
3. Retrieve from trusted data.
4. Answer only from retrieved facts and local JSON rules.
5. Add safety note when data is stale, demo-only, medical-like, chemical-treatment-related, or finance-related.
6. Ask one follow-up if essential context is missing.

Recommended structured response schema:

```json
{
  "answer": "short spoken answer",
  "language": "hinglish",
  "action_steps": ["one", "two", "three"],
  "citations": [{ "source": "Agmarknet", "date": "2026-06-14" }],
  "confidence": "medium",
  "missing_info": [],
  "risk_warning": "verify locally before acting"
}
```

## Hallucination Prevention

- Every market answer must include source, date, unit, and verification text.
- Every subsidy/loan answer must avoid eligibility promises.
- Every pest/disease answer should recommend local agronomist confirmation before treatment.
- If no trusted data exists, the app should say what is missing and offer the closest safe next step.

## Multilingual Handling

- Accept Hindi, Hinglish, and common crop aliases.
- Keep answer length short for TTS.
- Avoid dense numeric paragraphs; speak one number at a time.
- Store translations for safety notes and common response patterns.

## Deployment Strategy

MVP:

- Static hosting through GitHub Pages, Netlify, or Vercel.
- No secrets required.
- Weather uses public Open-Meteo request from browser.

Production:

- Add backend for data ingestion, voice models, RAG retrieval, analytics, and moderation.
- Cache weather/market data per district.
- Add admin review for crop guidance and subsidy updates.

## Sources

- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [OpenAI Audio and Voice docs](https://platform.openai.com/docs/guides/audio)
