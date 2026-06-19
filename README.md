# 🌾 Farming Consultant (KisaanVaani)

### A voice-first, multilingual, AI-powered natural-farming advisor for Indian smallholder farmers.

> Ask by voice or text. Get a real mandi price. Send a leaf photo. Receive safe, **organic-only** advice — in Hindi, Hinglish, or English — grounded in live government data and a curated knowledge base.

**Live app:** deployed on Vercel · **Stack:** Vercel Serverless (Node.js) + Vanilla JS + OpenAI (ChatGPT) with Gemini fallback · **Data:** Open-Meteo + data.gov.in AgMarknet · **Repo:** `Multilevel-Natural-Farming-Consultant`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem We Are Solving](#2-the-problem-we-are-solving)
3. [Who It's For — Personas](#3-who-its-for--personas)
4. [Product Overview — The Three Tabs](#4-product-overview--the-three-tabs)
5. [Design Philosophy & Thought Process](#5-design-philosophy--thought-process)
6. [System Architecture at a Glance](#6-system-architecture-at-a-glance)
7. [The Technology Stack — and Why](#7-the-technology-stack--and-why)
8. [How Each Feature Works (Deep Dive)](#8-how-each-feature-works-deep-dive)
9. [The AI Pipeline — LLM Routing, RAG & Guardrails](#9-the-ai-pipeline--llm-routing-rag--guardrails)
10. [Data Sources & Integrations](#10-data-sources--integrations)
11. [The Knowledge Base](#11-the-knowledge-base)
12. [Multilingual Design](#12-multilingual-design)
13. [Voice — Speech-to-Text & Text-to-Speech](#13-voice--speech-to-text--text-to-speech)
14. [Reliability — The Fallback-First Doctrine](#14-reliability--the-fallback-first-doctrine)
15. [Security & Privacy](#15-security--privacy)
16. [Getting Started (Local Development)](#16-getting-started-local-development)
17. [Environment Variables](#17-environment-variables)
18. [Deployment to Vercel](#18-deployment-to-vercel)
19. [Testing & Quality Assurance](#19-testing--quality-assurance)
20. [Project Structure](#20-project-structure)
21. [Key Design Decisions & Trade-offs](#21-key-design-decisions--trade-offs)
22. [Development Journey](#22-development-journey)
23. [Evaluation Alignment](#23-evaluation-alignment)
24. [Limitations & Known Issues](#24-limitations--known-issues)
25. [Roadmap](#25-roadmap)
26. [Glossary](#26-glossary)
27. [Credits, Sources & License](#27-credits-sources--license)

---

## 1. Executive Summary

**Farming Consultant** is a production-deployed web application that gives Indian smallholder farmers three things they normally cannot get together in one place, in their own language, on a low-end phone:

1. **Weather & Market Intelligence** — a live local weather forecast translated into actionable spray/sowing windows, plus **real, live mandi (market) prices** from the Government of India's AgMarknet feed, with a sell / hold / wait signal.
2. **Disease Identification & Organic Treatment** — upload or capture a crop-leaf photo (and/or describe symptoms by voice) and receive an AI vision triage with **organic-only** remedies and clear "when to escalate to an expert" guidance.
3. **A Conversational Consultant** — a ChatGPT-style chat where a farmer can ask anything ("Should I sell onions now?", "Will it rain before I spray neem?", "What should I sow after wheat?") and get a grounded, bilingual answer with a confidence score and a market signal.

The application is **voice-first** (speak the question, listen to the answer), **multilingual** (English, Hindi in Devanagari, and Hinglish), and **resilient by design** — every feature has a graceful fallback so a farmer is never shown a blank screen or a crash, even when an upstream AI provider, weather API, or government feed is down.

It is built on a deliberately lean, **zero-build, serverless** stack so it deploys in minutes, costs almost nothing to run, and remains easy for a small team to maintain and extend.

This document explains not only **what** was built but **why** — the reasoning, the trade-offs, and the development process — so that a reviewer can understand the engineering judgement behind every component.

---

## 2. The Problem We Are Solving

India has more than 100 million farm households, the majority of them smallholders cultivating a few acres. For them, three categories of decision repeatedly destroy or protect a season's income:

| Decision | What goes wrong today | Cost of getting it wrong |
| --- | --- | --- |
| **When to sell** | Farmers sell at the first offer or at a distress price because they lack live, comparative mandi rates. | 10–30% of crop value lost to poor timing or a single buyer. |
| **When to spray / sow** | Spraying neem or a bio-input right before rain washes it off; sowing into the wrong moisture window fails the crop. | Wasted inputs, labour, and sometimes the whole sowing. |
| **What is wrong with my crop** | No agronomist nearby; the default "advice" is often a synthetic chemical pesticide sold by the local shop. | Health/soil damage, wasted money, and a drift away from natural farming. |

Compounding all three:

- **Language.** Most digital agri-tools assume English or formal Hindi typing. Real farmers speak Hindi/Hinglish and often prefer to *talk* and *listen*, not type.
- **Devices & connectivity.** Low-end Android phones, intermittent data. Heavy apps and large model downloads are non-starters.
- **Trust & safety.** Bad advice is worse than no advice. A tool that confidently hallucinates a chemical dosage is dangerous.

**Our thesis:** a farmer should be able to *speak a question in their own language and get a safe, grounded, organic-first answer in seconds*, with the underlying real data (prices, weather) visible and verifiable — and the tool should fail gracefully rather than dangerously.

---

## 3. Who It's For — Personas

**Persona A — Ramesh, onion farmer, Hisar (Haryana).** 2 acres, speaks Hinglish, owns a ₹6,000 Android phone. Wants to know "kya abhi pyaaz bechna chahiye?" (should I sell onions now?). Uses the **voice mic** and **listens** to the answer while working.

**Persona B — Sunita, mixed vegetable grower.** Notices brown spots on tomato leaves after rain. Snaps a photo in **Module 2**, gets an organic treatment plan, and a clear "if it spreads across rows, call your KVK."

**Persona C — A Krishi Vigyan Kendra (KVK) field officer / FPO operator.** Uses the app as a quick triage and price-reference tool across multiple farmers, switching language per farmer.

**Persona D — The reviewing organisation / hackathon panel.** Wants to see sound engineering: real integrations, graceful degradation, guardrails, tests, and a clear thought process. This README and the accompanying [PRD](docs/PRD.md) and [Architecture](docs/architecture.md) docs are written for this reader too.

---

## 4. Product Overview — The Three Tabs

The UI is organised into three focused tabs so each job has a dedicated, uncluttered space and its own output area.

### Tab 1 — Consultant Chat (the "ask anything" assistant)

A **ChatGPT-style conversation**:

- Type or **speak** a question (mic button uses the browser's Web Speech API).
- Your question appears as a chat bubble; a "thinking…" placeholder shows; then the assistant's answer bubble renders.
- Each answer bubble contains: the spoken-style response, a list of remedy steps, an optional weather alert, a **market signal · confidence** meta line, the **source** (e.g. "ChatGPT + local RAG context"), a safety note, and a **🔊 Listen** button.
- **Voice plays only when you click 🔊** — never automatically.
- Quick-prompt chips offer common questions in one tap.

### Tab 2 — Module 1: Weather & Market Intelligence

- Farm context controls: **District**, **Crop**, **Land unit**, and an **adjustable Area slider** with a live value readout.
- **Weather card:** rain probability, temperature, and a plain-language **spray/sowing window** advisory.
- **Mandi card:** the live **AgMarknet** modal price, a sell/hold/wait signal, the price spread across nearby mandis, and a sparkline chart.

### Tab 3 — Module 2: Disease Identification & Organic Treatment

- **Upload / capture** a leaf photo and/or **describe symptoms** (typed or by voice).
- AI **vision triage** returns: possible issue, confidence, visual signs, **organic treatment** steps, prevention, and "escalate if…" conditions.
- A dedicated result panel with its own **🔊 Listen** button.

---

## 5. Design Philosophy & Thought Process

Five principles drove every technical decision. They recur throughout this document.

### 5.1 Fallback-first (never crash, never blank)
A farmer in a field cannot debug an error. **Every API endpoint returns HTTP 200 with usable content**, even when an upstream service fails. Live AgMarknet down → seeded mandi dataset. LLM down or out of quota → local knowledge-base advisory. Weather API down → demo forecast. Browser without Web Speech → typed input. This is a *doctrine*, enforced consistently in code.

### 5.2 Grounded, not hallucinated
LLMs are powerful but can invent dangerous specifics (e.g. a pesticide dose). We constrain them with **RAG** (retrieval from a curated knowledge base), a **strict JSON output schema**, explicit **organic-only guardrails**, and **confidence disclosure**. The model phrases and reasons; the *facts* come from real data (live prices, weather) and the vetted KB.

### 5.3 Provider-agnostic AI
The model is a swappable dependency, not the architecture. A single `callLLM()` router prefers **OpenAI (ChatGPT)** when configured, automatically falls back to **Gemini**, and then to the local KB. Switching or adding providers is a few lines, not a rewrite.

### 5.4 Voice-first, mobile-first, language-first
The mic and the 🔊 listen buttons are first-class. The layout is single-column-friendly. All UI strings and AI responses are available in English, Hindi, and Hinglish, with **cross-lingual retrieval** so a Hindi question still matches an English knowledge entry.

### 5.5 Lean and operable
No build step, no heavyweight framework, no database, no container to babysit. Vanilla JS frontend + Node serverless functions + flat-file knowledge base. This keeps cold starts fast, costs near zero, the surface area small, and onboarding trivial.

---

## 6. System Architecture at a Glance

```
                         ┌──────────────────────────────────────────────┐
                         │                BROWSER (client)                │
                         │  index.html · src/app.js · src/styles.css      │
                         │                                                │
                         │  ┌───────────┐ ┌────────────┐ ┌─────────────┐ │
                         │  │ Tab 1     │ │ Tab 2       │ │ Tab 3       │ │
                         │  │ Chat      │ │ Weather +   │ │ Disease     │ │
                         │  │ (advisor) │ │ Market (M1) │ │ (M2)        │ │
                         │  └─────┬─────┘ └──────┬──────┘ └──────┬──────┘ │
                         │   Web Speech API (STT in / TTS out, button-only)│
                         └────────┼──────────────┼───────────────┼────────┘
                                  │ fetch JSON    │               │
                 ┌────────────────┼───────────────┼───────────────┼─────────────────┐
                 │                 ▼               ▼               ▼   VERCEL EDGE/NODE │
                 │   /api/advisor      /api/weather   /api/market   /api/disease       │
                 │   /api/transcribe                                                    │
                 │        │                │              │              │              │
                 │        ▼                ▼              ▼              ▼              │
                 │   lib/shared.js   (Open-Meteo)   lib/market.js   (vision via LLM)   │
                 │   lib/rag.js  ───────────────────  lib/shared.js callLLM            │
                 │        │                                  │                          │
                 │        ▼                                  ▼                          │
                 │   knowledge_base/*.json(l)        ┌───────────────┐                 │
                 │   (districts, market, diseases,   │ LLM ROUTER     │                 │
                 │    zbnf, crop_calendar)           │ OpenAI→Gemini  │                 │
                 └───────────────────────────────────┴───────┬───────┴─────────────────┘
                                                              │
                  ┌───────────────────────────────────────────┼──────────────────────────┐
                  ▼                    ▼                        ▼                ▼          ▼
            api.openai.com     generativelanguage      api.data.gov.in   api.open-meteo  HF Whisper
            (ChatGPT)          (Gemini fallback)       (AgMarknet mandi) (weather)       (STT fallback)
```

A full set of component, data-flow, and sequence diagrams lives in **[docs/architecture.md](docs/architecture.md)**.

---

## 7. The Technology Stack — and Why

| Layer | Choice | Why this choice (the thought process) |
| --- | --- | --- |
| **Hosting / runtime** | Vercel Serverless Functions (Node.js ≥18) | Free tier, instant Git-based deploys, no servers to manage, secrets stay server-side, native `fetch`. Perfect for a static frontend + a handful of API routes. |
| **Frontend** | Vanilla HTML/CSS/JS (ES modules) | No build step, tiny payload, fast on low-end phones, zero framework lock-in, trivial to host as static files. The app is small enough that a framework would add cost without benefit. |
| **Primary LLM** | OpenAI **ChatGPT** (`gpt-5.4` default, `gpt-4o` fallback) | Reliable, paid credits avoid free-tier rate limits, strong multilingual + vision, JSON mode. |
| **Fallback LLM** | Google **Gemini** (`gemini-2.5-flash` family) | Free tier for zero-cost demos; automatic failover if OpenAI errors. |
| **Weather** | **Open-Meteo** Forecast API | Free, **no API key**, global, returns current+hourly+daily. Ideal for a zero-config demo. |
| **Market prices** | **data.gov.in AgMarknet** ("Current Daily Price of Various Commodities from Various Markets (Mandi)") | The authoritative Government of India mandi feed. Real, live, free. |
| **Voice (STT/TTS)** | Browser **Web Speech API** | Free, on-device, supports `hi-IN`/`en-IN`, no server round-trip, works on Android Chrome. A server-side **HF Whisper** route exists as a secondary fallback. |
| **Retrieval (RAG)** | Custom **BM25** in pure JS (`lib/rag.js`) | No embedding API, no key, no network, deterministic, fast, and small. Cross-lingual via synonym expansion. |
| **Knowledge base** | Flat **JSON / JSONL** files | Versioned with the code, no DB to run, easy to review and extend, bundled into functions. |

**The meta-decision:** optimise for *operability and resilience over sophistication*. Every "fancier" option (a vector DB, a React build, a managed model server) was weighed and rejected because it added operational cost or fragility disproportionate to the value at this stage.

---

## 8. How Each Feature Works (Deep Dive)

### 8.1 Consultant Chat (`/api/advisor`)

1. The farmer asks a question (voice → text, or typed).
2. The client sends `{ query, language, districtId, cropId, unit, area, weatherSummary }` to `/api/advisor`.
3. The server:
   - **Detects intent** (market / weather / disease / finance / rotation / general) with keyword heuristics (works across en/hi/hinglish).
   - **Resolves the crop** the question is actually about (e.g. detects "pyaaz" → onion even if the selector says wheat).
   - Fetches **live AgMarknet market data** for that crop via the shared `lib/market.js` pipeline (the *same* source Module 1 uses).
   - Runs **RAG retrieval** (`lib/rag.js`) to pull only the most relevant disease + ZBNF knowledge chunks.
   - Builds a compact, grounded prompt and calls **`callLLM()`** (ChatGPT → Gemini).
   - Normalizes and validates the model's JSON, coercing stray strings into arrays and word-confidences ("High") into numbers.
4. The response carries `{ source, modelBacked, retrieval[], result }` where `result` matches the strict schema (below). If the LLM is unavailable, an **intent-aware local fallback** answer is returned instead — still grounded in live prices and the KB.

### 8.2 Module 1 — Weather (`/api/weather`)

- Maps the district to coordinates and calls **Open-Meteo** for current + hourly + daily variables.
- Converts raw numbers into farmer-readable guidance: e.g. *"Rain chance is 60% — avoid neem/bio-spray today; choose a dry morning after rain risk drops."* and a sowing signal.
- On any failure, returns a clearly-labelled demo forecast so the card never breaks.

### 8.3 Module 1 — Market (`/api/market`, `lib/market.js`)

The AgMarknet resource is a **same-day snapshot across many mandis** (no historical time-series). We turn that into a genuinely useful, live view:

- Query **state + commodity** (district-level filters are frequently empty in the feed).
- Normalize records to one modal price per reporting mandi.
- Pick the **headline price**: the requested district's own mandi if it reports today; otherwise the **area median** (clearly labelled "X area — district mandi not reporting today").
- Compute a **signal**: where the headline sits versus the area median (above → lean sell, below → hold, near → wait), with a **storage-risk override** (perishables like onion never say plain "hold").
- Render the **real price spread across mandis** as the sparkline chart (a real, live distribution rather than a fabricated trend line).
- If the live feed is unavailable, fall back to the **seeded 7-crop dataset** — clearly labelled "Seeded mandi fallback dataset".

### 8.4 Module 2 — Disease (`/api/disease`)

- Accepts a base64 image (≤5 MB) and/or a symptom description, plus crop/district/language.
- Runs **RAG** over the disease KB to retrieve the most relevant entries for the symptoms/crop.
- Calls **`callLLM()`** with the image + a triage prompt (ChatGPT/Gemini **vision**).
- **Normalizes** the result and **backfills** any missing field from the top RAG-retrieved disease, so the card is **never blank** even if the model omits a field.
- Enforces **organic-only** remedies and a "verify with KVK if confidence < 0.65 / if it spreads" escalation.
- Falls back to a fully-populated local KB triage if no LLM is configured.

### 8.5 The shared response schema

Advisor and disease responses converge on a small, strict schema the frontend can always render:

```jsonc
// /api/advisor → result
{
  "voice_response": "string (the spoken-style answer)",
  "remedy_steps": ["string", "..."],
  "confidence": 0.0,                 // 0..1
  "market_signal": "sell|hold|wait",
  "weather_alert": "string|null",
  "source_notes": ["string", "..."],
  "safety_note": "string"
}

// /api/disease → result
{
  "possible_issue": "string",
  "confidence": 0.0,
  "visual_signs": ["string"],
  "organic_treatment": ["string"],
  "prevention": ["string"],
  "escalation": ["string"],
  "voice_response": "string",
  "safety_note": "string"
}
```

---

## 9. The AI Pipeline — LLM Routing, RAG & Guardrails

### 9.1 Provider-agnostic routing (`callLLM`)

```
callLLM({ parts, schema, temperature })
        │
        ├─ OpenAI configured?  ──► callOpenAI()  ──► { result, provider:"ChatGPT" }
        │      (key in OPENAI_API_KEY, CHATGPT_API_KEY, OPENAI_KEY,
        │       or an sk- key pasted into CHATGPT_MODEL/OPENAI_MODEL)
        │
        ├─ else Gemini configured? ─► callGemini() ─► { result, provider:"Gemini" }
        │
        └─ neither / both error  ──► throw ──► caller uses its local KB fallback
```

- **OpenAI path:** Chat Completions, `response_format: json_object`, model order `gpt-5.4 → gpt-4o`. Gemini-style `parts` (text + `inline_data` image) are transparently converted to OpenAI `content` blocks, so the disease handler is provider-agnostic.
- **Gemini path:** `generateContent` with `responseSchema` structured output, model order `gemini-2.5-flash → gemini-2.5-flash-lite → gemini-2.0-flash → gemini-flash-latest`. (We learned the hard way that `gemini-2.0-flash` returns *zero* free-tier quota on many keys — hence 2.5 leads.)
- **Robust parsing:** model output is run through `safeParseJson` (handles fenced/wrapped JSON), then `coerceList` (string → array) and `coerceConfidence` ("High" → 0.85) so different providers' quirks never reach the UI.

### 9.2 Retrieval-Augmented Generation (`lib/rag.js`)

A from-scratch **BM25** retriever (Okapi BM25, `k1=1.5`, `b=0.75`):

- **Corpus:** each disease, ZBNF practice, and crop-calendar entry becomes one searchable document.
- **Tokenizer:** lowercases, keeps Latin + Devanagari, drops bilingual stopwords.
- **Cross-lingual synonym expansion:** `pyaaz`/`प्याज` → `onion`, `peele patte` → `yellow leaves`, `bhav` → `price`, etc. This lets a pure-Hindi question retrieve English KB entries — verified: *"पत्ते पीले धब्बे"* correctly ranks "Fungal leaf spot / blight" first.
- **Output:** top-k `{ id, type, title, score, raw }`, injected into the prompt and surfaced in the API response's `retrieval[]` field for transparency.

This is "lightweight semantic RAG": no embedding model, no vector DB, no key — yet it grounds the LLM and is fully demonstrable.

### 9.3 Guardrails

Enforced in the prompts **and** in code:

- **Organic only** — never recommend synthetic chemical pesticides, unsafe mixtures, antibiotics, or exact toxic concentrations.
- **Confidence disclosure** — every answer states a confidence; low confidence triggers a "verify with KVK/agriculture officer" instruction.
- **No final diagnosis from a photo alone** — disease output is explicitly a *triage*.
- **Safety note** on every answer; **escalation** conditions on disease results.

---

## 10. Data Sources & Integrations

| Integration | Endpoint | Auth | Role | Fallback |
| --- | --- | --- | --- | --- |
| Open-Meteo | `api.open-meteo.com/v1/forecast` | none | Live weather | Demo forecast |
| data.gov.in AgMarknet | `api.data.gov.in/resource/9ef84268-…` | API key (public sample bundled) | Live mandi prices | Seeded 7-crop dataset |
| OpenAI | `api.openai.com/v1/chat/completions` | `OPENAI_API_KEY` | Primary LLM + vision | Gemini → local KB |
| Google Gemini | `generativelanguage.googleapis.com` | `GEMINI_API_KEY` | Fallback LLM + vision | Local KB |
| Hugging Face Whisper | Inference API / custom endpoint | `HF_TOKEN` | Server STT fallback | Browser Web Speech |

> **AgMarknet note:** the bundled public sample key works out of the box but is shared and rate-limited (caps ~10 records). For reliable, higher-limit live data, register a free key at [data.gov.in](https://data.gov.in) and set `DATA_GOV_API_KEY`.

---

## 11. The Knowledge Base

Flat, versioned files under `knowledge_base/`:

| File | Format | Contents |
| --- | --- | --- |
| `districts.json` | JSON | Districts with state, coordinates, nearest mandi (Haryana set: Hisar, Karnal, Sirsa, Sonipat). |
| `market_fallback.json` | JSON | 7 crops (onion, bajra, moong, mustard, potato, wheat, tomato) with unit, storage risk, and seeded price history per mandi. |
| `diseases.jsonl` | JSONL | Disease/pest entries: symptoms, organic treatment, prevention, affected crops. |
| `zbnf_practices.jsonl` | JSONL | Zero-Budget Natural Farming practices (Jeevamrit, Beejamrit, neem botanicals, rotation) with guardrails. |
| `crop_calendar.jsonl` | JSONL | Sowing/harvest windows, rotation hints, market notes per crop. |

These files power both **RAG** (in the LLM path) and the **local fallback** answers (when no LLM is available), so the app is genuinely useful even fully offline of any paid AI.

---

## 12. Multilingual Design

- **Three languages:** Hinglish (default), Hindi (हिंदी, Devanagari), English.
- A single `COPY` dictionary in `src/app.js` holds every UI string in all three languages; `t(key)` resolves the active language with Hinglish as the ultimate fallback.
- Each API accepts a `language` parameter and returns localized `voice_response` / advisory text.
- The LLM is instructed to answer **only** in the requested language.
- **Cross-lingual RAG** (see §9.2) ensures a Hindi/Hinglish question still retrieves the right English knowledge.
- TTS uses `hi-IN` for Hindi/Hinglish and `en-IN` for English.

---

## 13. Voice — Speech-to-Text & Text-to-Speech

- **STT (in):** the mic button uses the browser **Web Speech API** (`SpeechRecognition`) with `hi-IN`/`en-IN`. Free, on-device, no server. If unavailable, it falls back to a `MediaRecorder` → `/api/transcribe` (HF Whisper) path; if that's not configured, the farmer simply types.
- **TTS (out):** `speechSynthesis` reads the answer aloud — **only when the 🔊 Listen button is pressed** (a deliberate UX decision; nothing auto-speaks).

---

## 14. Reliability — The Fallback-First Doctrine

Every endpoint degrades gracefully and is labelled honestly so the user/operator always knows the data's provenance:

| Endpoint | Primary | Fallback (always HTTP 200) | Label shown |
| --- | --- | --- | --- |
| `/api/weather` | Open-Meteo live | Demo forecast | "Open-Meteo" vs "Open-Meteo fallback" |
| `/api/market` | AgMarknet live | Seeded dataset | "data.gov.in Agmarknet live API" vs "Seeded mandi fallback dataset" |
| `/api/advisor` | ChatGPT → Gemini | Intent-aware local KB advisory | "ChatGPT + local RAG context" vs "Local fallback …" |
| `/api/disease` | ChatGPT/Gemini vision | Local organic KB triage | "ChatGPT image/text triage…" vs "Local organic KB fallback" |
| `/api/transcribe` | HF Whisper | Browser Web Speech signal | — |

Knowledge-base file reads are wrapped in try/catch with inline minimal fallbacks, so even a missing-file scenario returns a usable answer instead of a 500.

---

## 15. Security & Privacy

- **No secrets in the repo.** `.env` is git-ignored; keys live only in Vercel Environment Variables (and should be marked *Sensitive*).
- **Server-side keys.** All provider keys are used only inside serverless functions; they never reach the browser.
- **No database, minimal data retention.** The app stores no user accounts; requests are processed and returned. Images are sent to the configured AI provider for analysis only.
- **Input limits.** Image uploads are capped (≈5 MB) and request bodies are size-limited.
- **`no-store`** cache headers on all API responses.

---

## 16. Getting Started (Local Development)

**Prerequisites:** Node.js ≥ 18.

```bash
# 1. Clone
git clone https://github.com/Manutd1234/Multilevel-Natural-Farming-Consultant.git
cd Multilevel-Natural-Farming-Consultant

# 2. (Optional) configure keys for model-backed answers
cp .env.example .env
#   then edit .env — see §17. The app also runs with NO keys (fallback mode).

# 3. Run the dev server (serves the static UI AND the /api/* serverless files)
npm run dev
#   → http://localhost:4173
```

`npm run dev` runs `scripts/dev-server.mjs`, a tiny Node server that serves the static frontend and dynamically routes `/api/<name>` to `api/<name>.js` — i.e. it mirrors how Vercel runs the functions, so you can test the full stack locally.

---

## 17. Environment Variables

All are **optional** — the app runs in fallback mode with none set. Copy `.env.example` to `.env` (local) or set them in Vercel.

```bash
# ---- LLM (advisor + disease). Set EITHER OpenAI (recommended) OR Gemini ----
OPENAI_API_KEY=sk-...           # OpenAI/ChatGPT key — primary, reliable
# OPENAI_MODEL=gpt-5.4          # default model (gpt-4o is the fallback)
# CHATGPT_MODEL is also accepted as the model-name variable

GEMINI_API_KEY=...              # Google AI Studio key — automatic fallback
# GEMINI_MODEL=gemini-2.5-flash # default (2.0-flash has zero free-tier quota on many keys)

# ---- Live mandi prices (Module 1) ----
# A public sample key is bundled; set your own for higher limits/reliability.
# DATA_GOV_API_KEY=...
# DATA_GOV_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070

# ---- Optional server-side Whisper STT (browser Web Speech is primary) ----
# HF_TOKEN=...
# WHISPER_MODEL=openai/whisper-small
# WHISPER_ENDPOINT_URL=
```

**Provider precedence:** if an OpenAI key is present, ChatGPT is used; otherwise Gemini; otherwise the local knowledge base. No code change is needed to switch — just the env vars.

---

## 18. Deployment to Vercel

1. Push the repo to GitHub (already connected for this project).
2. On [vercel.com](https://vercel.com): **New Project → import the repo**.
3. **Settings → Environment Variables**: add `OPENAI_API_KEY` (and/or `GEMINI_API_KEY`), optionally `DATA_GOV_API_KEY`. Mark them **Sensitive**.
4. **Deploy.** No build step — Vercel serves the static files and turns each `api/*.js` into a serverless function.

`vercel.json` configures the functions:

```json
{
  "functions": { "api/*.js": { "maxDuration": 60, "includeFiles": "knowledge_base/**" } },
  "headers": [{ "source": "/api/(.*)", "headers": [{ "key": "Cache-Control", "value": "no-store" }] }]
}
```

- `maxDuration: 60` — headroom for the advisor's sequential market-fetch + LLM call (Hobby plan max).
- `includeFiles: knowledge_base/**` — bundles the KB into each function so `fs` reads work in the serverless sandbox.

> **Tip:** every Git push creates a new deployment URL. Use the **Visit** button on the latest *Production* deployment, or set a stable domain in **Settings → Domains**.

---

## 19. Testing & Quality Assurance

Two complementary suites:

```bash
npm run validate    # python tests/validate_project.py — structural integrity
npm run test:api    # node tests/api_tests.js — full endpoint pipeline
```

- **`tests/validate_project.py`** — asserts required files exist, the KB parses, guardrail strings are present, and the Vercel config is correct.
- **`tests/api_tests.js`** — exercises **every** endpoint across 7 crops, 3 languages, and 7 advisor question-types, with **structural** assertions (schema validity) and **accuracy** assertions (price sanity, signal logic, onion-never-"hold" rule, Hindi localization, RAG grounding). It runs in both **fallback** mode (no keys, deterministic) and **model-backed** mode (with a key). Latest run: **270/270 passing** in both modes.

---

## 20. Project Structure

```text
farming-consultant/
├── index.html               # 3-tab single-page UI
├── vercel.json              # Vercel functions + headers config
├── package.json             # scripts: dev, test:api, validate, download:whisper
├── .env.example             # documented env var template
├── .vercelignore            # excludes tests/docs/scripts/models/.env from deploy
│
├── api/                     # Vercel serverless functions (one file = one route)
│   ├── advisor.js           #   POST /api/advisor   — consultant chat (LLM + RAG + live market)
│   ├── disease.js           #   POST /api/disease   — vision triage (LLM + RAG)
│   ├── market.js            #   GET  /api/market    — thin handler over lib/market.js
│   ├── weather.js           #   GET  /api/weather   — Open-Meteo wrapper
│   └── transcribe.js        #   POST /api/transcribe— HF Whisper / browser-STT signal
│
├── lib/                     # shared modules bundled into functions
│   ├── shared.js            #   LLM router (callLLM/callOpenAI/callGemini), helpers, KB loader
│   ├── market.js            #   AgMarknet pipeline (resolveMarketSummary) + seeded fallback
│   └── rag.js               #   BM25 retrieval + bilingual synonyms
│
├── knowledge_base/          # flat-file data (RAG + local fallback)
│   ├── districts.json
│   ├── market_fallback.json
│   ├── diseases.jsonl
│   ├── zbnf_practices.jsonl
│   └── crop_calendar.jsonl
│
├── src/
│   ├── app.js               # frontend: state, tabs, i18n, chat, voice, rendering
│   └── styles.css           # styling: tabs, chat bubbles, cards, slider
│
├── scripts/
│   ├── dev-server.mjs       # local server mirroring Vercel routing
│   └── download-whisper.mjs # optional Whisper artifact downloader
│
├── tests/
│   ├── api_tests.js         # full endpoint pipeline + accuracy suite
│   └── validate_project.py  # structural validator
│
└── docs/
    ├── PRD.md               # product requirements + development process
    ├── architecture.md      # deep technical architecture
    ├── prompt-guardrails.md
    ├── demo-script.md
    └── deployment.md
```

---

## 21. Key Design Decisions & Trade-offs

| Decision | Alternatives considered | Why we chose it | Trade-off accepted |
| --- | --- | --- | --- |
| Vanilla JS, no build | React/Vue/Gradio | Smallest payload, zero build, fastest on low-end phones | More manual DOM code |
| Serverless on Vercel | FastAPI on a VM / HF Spaces | Free, instant deploys, secrets server-side, no ops | 60s function limit; cold starts |
| ChatGPT primary, Gemini fallback | Single provider | Reliability (paid) + zero-cost fallback | Two integrations to maintain |
| BM25 RAG (pure JS) | Vector DB + embeddings | No key/DB/network, deterministic, cross-lingual via synonyms | Lexical, not deep-semantic |
| Flat-file KB | SQL / NoSQL DB | Versioned, reviewable, no DB to run | Manual edits; small scale |
| AgMarknet snapshot → spatial spread | Faking a time-series trend | Honest, real, live data | "Trend" is across mandis, not time |
| Browser Web Speech | Always server STT (Whisper) | Free, on-device, low latency | Browser-dependent quality |
| Fallback-first everywhere | Fail with errors | Never crash/blank in the field | More branches to test |
| Voice on button only | Auto-speak answers | User control, no surprise audio | One extra tap to listen |

---

## 22. Development Journey

The project evolved through several deliberate iterations (full detail in [docs/PRD.md](docs/PRD.md) §"Development Process"):

1. **Integration hardening** — wrapped all KB reads in try/catch with inline fallbacks; fixed the Vercel function runtime config so native `fetch` is available.
2. **Live AgMarknet market** — replaced static seeded prices with the real data.gov.in feed; designed the state-area resolution and live price-spread chart for snapshot-only data.
3. **LLM reliability** — discovered `gemini-2.0-flash` returns zero free-tier quota; switched the default to `gemini-2.5-flash` and added a multi-model fallback chain. Compacted and improved the UI for readability.
4. **Lightweight RAG** — added the BM25 retriever with bilingual synonyms and wired it into the advisor and disease prompts (and the local fallbacks).
5. **Provider-agnostic LLM** — added OpenAI/ChatGPT as the primary model via a `callLLM` router, with robust output coercion; made it tolerant of common env-var misconfiguration.
6. **Shared market pipeline** — extracted `lib/market.js` so Module 1 *and* the advisor use the identical live AgMarknet source; added the full API test suite (270 assertions) and raised the Vercel function timeout.
7. **3-tab UX** — separated the consultant chat (ChatGPT-style log), Module 1, and Module 2 into dedicated tabs each with its own output; made voice button-only; added the adjustable area slider.

Each step was verified end-to-end (local tests + live Vercel checks) before the next.

---

## 23. Evaluation Alignment

| Criterion | How this project addresses it |
| --- | --- |
| **Technical depth** | Provider-agnostic LLM routing, from-scratch BM25 RAG, two live government/open APIs, vision triage, a 270-assertion test suite, serverless deployment. |
| **Empathy / UX** | Voice-first, Hindi/Hinglish-native, mobile-first, confidence disclosure to prevent over-reliance, button-controlled audio, never-blank fallbacks. |
| **AI / prompt engineering** | Strict JSON schema, organic-only guardrails, RAG grounding, cross-lingual retrieval, output coercion, confidence-gated escalation. |
| **Reliability** | Fallback-first doctrine on every endpoint, honest provenance labels, graceful degradation with zero config. |
| **Documentation** | This README, a full [PRD](docs/PRD.md), and a deep [architecture](docs/architecture.md) doc. |

---

## 24. Limitations & Known Issues

- **AgMarknet is a daily snapshot** — there is no free historical time-series, so the "trend" is a spatial spread across mandis on the day, not a time trend. The headline price is real; the chart shows the real distribution.
- **Sample data.gov key is rate-limited** — under load it can intermittently fall back to seeded prices (clearly labelled). A personal `DATA_GOV_API_KEY` fixes this.
- **Free-tier LLM limits** — if using Gemini's free tier or a low-quota key, heavy demo use can hit rate limits and fall back to the local KB (still useful).
- **District coverage** — the seeded districts focus on Haryana; live weather/market work for any district once added to `districts.json`.
- **Web Speech availability** — STT/TTS quality varies by browser/OS; non-supporting browsers fall back to typing.
- **Knowledge base breadth** — intentionally small and high-quality; expanding it is the main lever for richer fallback answers.

---

## 25. Roadmap

- Personal/own-key onboarding flow for `DATA_GOV_API_KEY` inside the UI.
- Expand the knowledge base (more crops, diseases, regional calendars) and add embedding-based retrieval as an optional RAG upgrade.
- Persisted daily price snapshots to build a *real* time-series trend.
- SMS/WhatsApp delivery for feature-phone farmers.
- More districts/states and crop coverage.
- Offline-first PWA packaging.

---

## 26. Glossary

- **Mandi** — a regulated agricultural wholesale market.
- **AgMarknet** — the Government of India portal/feed for daily mandi commodity prices.
- **Modal price** — the most-frequently-traded price in a mandi for a commodity that day (the headline rate).
- **KVK (Krishi Vigyan Kendra)** — district-level farm science centre; the recommended human escalation point.
- **ZBNF** — Zero-Budget Natural Farming; the organic practice set (Jeevamrit, Beejamrit, etc.).
- **RAG** — Retrieval-Augmented Generation; grounding an LLM with retrieved facts.
- **BM25** — a classic ranking function for keyword relevance.
- **Quintal** — 100 kg; the standard mandi price unit.

---

## 27. Credits, Sources & License

**Data & APIs**
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [data.gov.in — AgMarknet daily mandi prices](https://data.gov.in)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/)
- [Hugging Face Whisper Small](https://huggingface.co/openai/whisper-small)
- [Vercel Functions](https://vercel.com/docs/functions)

**Documentation**
- Product requirements & development process → [docs/PRD.md](docs/PRD.md)
- Technical architecture → [docs/architecture.md](docs/architecture.md)
- Prompt guardrails → [docs/prompt-guardrails.md](docs/prompt-guardrails.md)
- Demo script → [docs/demo-script.md](docs/demo-script.md)
- Deployment notes → [docs/deployment.md](docs/deployment.md)

**License:** see [LICENSE](LICENSE).

---

*Built as a voice-first, fallback-resilient, organic-first decision companion for the farmers who feed the country.* 🌱
