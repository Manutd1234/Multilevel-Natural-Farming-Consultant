# Demo Script

## 1. Opening

Show KisaanVaani and explain the selected Option B modules:

- Weather & Market Intelligence
- Disease Identification & Organic Treatment

## 2. Voice Flow

Tap the mic, speak:

`Kya abhi pyaaz bechna chahiye? Kal barish hogi kya?`

If Hugging Face Whisper env is unavailable, type the same query.

## 3. Weather & Market

Click refresh. Show:

- Open-Meteo rain and spray window
- mandi price and 7-day sparkline
- sell/hold/wait advisory

## 4. Disease

Upload a leaf image or type:

`Patton par brown spots hain aur rain ke baad badh gaya.`

Click Analyze Disease. Show:

- possible issue
- confidence
- organic treatment steps
- KVK escalation warning

## 5. Guardrails

Point out:

- Gemini API key stays in Vercel env
- Whisper is Hugging Face based
- Open-Meteo endpoint is live
- AI routes use local RAG context and fallback safely when keys are missing
