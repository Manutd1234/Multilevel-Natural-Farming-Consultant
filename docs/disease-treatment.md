# Disease Identification & Treatment

This feature covers Option B requirement 1: Disease Identification & Treatment.

## User Flow

1. Farmer selects district, crop, season, and language.
2. Farmer uploads or captures a crop/leaf photo.
3. Farmer optionally describes symptoms in Hindi/Hinglish/English.
4. Browser posts image and text to `/api/disease`.
5. Vercel Function calls Gemini image understanding with strict organic-farming guardrails.
6. App returns a short spoken summary, confidence level, organic remedies, prevention, and escalation warnings.

## Gemini Integration

The serverless function uses Gemini `generateContent` with inline image data. Google’s Gemini image-understanding docs show that image bytes can be sent as base64 inline data, and the current text/structured-output docs support JSON-mode responses.

Server endpoint:

```text
POST /api/disease
```

Request:

```json
{
  "crop": "Pearl millet",
  "district": "Hisar",
  "language": "hinglish",
  "description": "Leaves have brown spots after rain.",
  "image": {
    "mimeType": "image/jpeg",
    "data": "base64..."
  }
}
```

Response:

```json
{
  "result": {
    "possible_issue": "Fungal leaf spot / blight",
    "confidence": "medium",
    "visible_signs": ["brown spots", "yellowing edge"],
    "organic_remedies": ["Remove heavily infected leaves", "Improve spacing", "Use local Trichoderma guidance"],
    "prevention": ["Rotate crops", "Avoid waterlogging"],
    "when_to_escalate": ["Disease spreads quickly", "Plants wilt"],
    "spoken_summary": "This looks like a possible fungal leaf spot. Remove badly affected leaves and verify locally before treatment.",
    "safety_note": "Photo diagnosis is not final. Confirm with local agriculture officer/KVK."
  }
}
```

## Guardrails

- Never call the image output a final diagnosis.
- Prefer sanitation, spacing, rotation, bio-control, and botanical remedies.
- Do not recommend synthetic chemical pesticides, antibiotics, or unsafe mixtures.
- Keep dilution/treatment details conservative unless local official guidance is available.
- Escalate fast-spreading disease, severe wilting, unknown pests, or low-confidence images to agriculture officer/KVK.

## Environment

Required on Vercel:

```bash
GEMINI_API_KEY=your_google_ai_studio_key
```

Optional:

```bash
GEMINI_MODEL=gemini-3.5-flash
```

## Sources

- [Gemini API image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini API structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Vercel Functions](https://vercel.com/docs/functions)
