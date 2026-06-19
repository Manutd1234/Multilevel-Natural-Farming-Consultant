# Architecture — Farming Consultant (KisaanVaani)

A deep, end-to-end technical reference: frontend, backend, every API contract, all external integrations, the AI pipeline, the RAG and market subsystems, data flows, sequence diagrams, configuration, deployment, security, performance, and a file-by-file map.

> Companion docs: [README.md](../README.md) (product + thought process) · [PRD.md](PRD.md) (requirements + development process) · [prompt-guardrails.md](prompt-guardrails.md).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Map](#2-component-map)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture (Serverless)](#4-backend-architecture-serverless)
5. [Shared Libraries](#5-shared-libraries)
6. [API Contracts (every endpoint)](#6-api-contracts-every-endpoint)
7. [The LLM Subsystem](#7-the-llm-subsystem)
8. [The RAG Subsystem](#8-the-rag-subsystem)
9. [The Market Subsystem (AgMarknet)](#9-the-market-subsystem-agmarknet)
10. [The Weather Subsystem](#10-the-weather-subsystem)
11. [The Disease (Vision) Subsystem](#11-the-disease-vision-subsystem)
12. [The Voice Subsystem](#12-the-voice-subsystem)
13. [Knowledge Base Schemas](#13-knowledge-base-schemas)
14. [End-to-End Data Flows & Sequence Diagrams](#14-end-to-end-data-flows--sequence-diagrams)
15. [Fallback & Resilience Architecture](#15-fallback--resilience-architecture)
16. [Configuration & Environment](#16-configuration--environment)
17. [Deployment Architecture (Vercel)](#17-deployment-architecture-vercel)
18. [Security Architecture](#18-security-architecture)
19. [Performance & Timeout Budget](#19-performance--timeout-budget)
20. [Testing Architecture](#20-testing-architecture)
21. [File-by-File Reference](#21-file-by-file-reference)

---

## 1. System Overview

The application is a **two-tier system**:

- **Tier 1 — Static frontend** (`index.html`, `src/app.js`, `src/styles.css`): a single-page app with three tabs. No framework, no build step. Talks to the backend purely via `fetch` JSON.
- **Tier 2 — Serverless backend** (`api/*.js` on Vercel, sharing `lib/*.js`): stateless Node functions that wrap external services and the knowledge base, apply the AI pipeline and guardrails, and always return a usable JSON response.

There is **no database** and **no session state**. The knowledge base is a set of flat files bundled into the functions. External services are reached server-side so secrets never touch the browser.

```
 ┌──────────────────────────── CLIENT (browser, static) ────────────────────────────┐
 │ index.html ── src/app.js (state, tabs, i18n, voice, render) ── src/styles.css      │
 │   Tab1 Chat → POST /api/advisor      Tab2 M1 → GET /api/weather, GET /api/market    │
 │   Tab3 M2  → POST /api/disease       mic → Web Speech (or POST /api/transcribe)     │
 └───────────────────────────────────────────┬───────────────────────────────────────┘
                                              │ HTTPS JSON (fetch)
 ┌────────────────────────────── SERVER (Vercel Node functions) ───────────────────────┐
 │ api/advisor.js  api/disease.js  api/market.js  api/weather.js  api/transcribe.js      │
 │        │              │              │              │                 │                │
 │   lib/shared.js (callLLM, helpers, KB loader)   lib/market.js   lib/rag.js            │
 │        │                                              │              │                │
 │   knowledge_base/{districts.json, market_fallback.json, diseases.jsonl,               │
 │                   zbnf_practices.jsonl, crop_calendar.jsonl}                          │
 └──────────┬───────────────┬───────────────┬───────────────┬───────────────┬──────────┘
            ▼               ▼               ▼               ▼               ▼
       api.openai.com  generativelanguage  api.data.gov.in  api.open-meteo  HF Whisper
       (ChatGPT)       (Gemini)            (AgMarknet)      (weather)       (STT)
```

---

## 2. Component Map

| Component | File(s) | Responsibility |
| --- | --- | --- |
| UI shell & tabs | `index.html` | DOM structure: topbar, 3 tab panels, outputs |
| App logic | `src/app.js` | State, event wiring, i18n, tab switching, chat log, voice, rendering, fetches |
| Styling | `src/styles.css` | Layout, tabs, chat bubbles, cards, slider, responsive rules |
| Advisor route | `api/advisor.js` | Intent + crop resolution, live market, RAG, LLM, fallback advisory |
| Disease route | `api/disease.js` | Vision triage, RAG, normalization, local fallback |
| Market route | `api/market.js` | Thin handler over the market pipeline |
| Weather route | `api/weather.js` | Open-Meteo wrapper + advisory text |
| Transcribe route | `api/transcribe.js` | HF Whisper / browser-STT signal |
| Shared lib | `lib/shared.js` | LLM router, HTTP/JSON helpers, KB loader, market math helpers, coercion |
| Market lib | `lib/market.js` | AgMarknet fetch + normalization + signal + seeded fallback |
| RAG lib | `lib/rag.js` | BM25 corpus, tokenizer, synonyms, retrieval |
| Knowledge base | `knowledge_base/*` | Districts, market seed, diseases, ZBNF, calendar |
| Dev server | `scripts/dev-server.mjs` | Local mirror of Vercel routing |
| Tests | `tests/api_tests.js`, `tests/validate_project.py` | Pipeline + structural QA |

---

## 3. Frontend Architecture

A single ES module (`src/app.js`) drives a static HTML shell. No framework; state is a plain object and the DOM is updated directly.

### 3.1 State

```js
const state = {
  districts, market,            // loaded from KB (with embedded fallbacks)
  districtId, cropId,           // current selectors (default hisar / onion)
  language,                     // "hinglish" | "hi" | "en"
  unit, area,                   // land unit + adjustable area (slider)
  image,                        // { mimeType, data(base64) } for disease
  lastSignals,                  // last weather+market results (context for advisor)
  diseaseResult, diseaseSource, // last disease render (for re-localize + listen)
  diseaseSpeakText,             // text for the disease 🔊 button
  chatCount,                    // number of chat messages (controls greeting)
  mediaRecorder, chunks,        // MediaRecorder fallback for STT
  advisorRequestId, diseaseRequestId, // race guards
  activeTab                     // "chat" | "module-one" | "module-two"
};
```

### 3.2 DOM access
A `dom` object caches all `document.querySelector` references once (`const q = s => document.querySelector(s)`), grouped by tab. `moduleTabs` / `modulePanels` are `querySelectorAll("[data-tab]" / "[data-tab-panel]")`.

### 3.3 Boot sequence
```
boot():
  load districts.json + market_fallback.json  (fetch, with embedded JS fallbacks)
  populateControls()      // fill selects, init area slider value + unit
  bindEvents()            // attach all listeners
  applyLanguage({resetQuery:true})  // localize, render quick prompts, seed chat greeting
  refreshSignals()        // prime weather+market (used as advisor context)
```

### 3.4 Internationalization (i18n)
- A `COPY` object holds every UI string under `hinglish`, `hi`, `en`.
- `t(key)` returns the active language's value, falling back to Hinglish, then the key itself.
- `applyLanguage()` writes all static labels/placeholders, re-renders quick prompts, seeds/relocalizes the chat greeting (while empty), and re-renders the last disease result silently.
- Language change preserves prior chat messages as-is (answered in their original language).

### 3.5 Tab system
- `switchTab(tabId)` toggles `.is-active` and the `hidden` attribute on `[data-tab]` buttons and `[data-tab-panel]` panels. Default tab: `chat`.

### 3.6 Consultant chat rendering (Tab 1)
- `ensureChatGreeting()` seeds an assistant greeting bubble while `chatCount === 0`.
- `askAdvisor()`:
  1. `appendChatUser(query)` — right-aligned user bubble.
  2. `appendChatPending()` — left "thinking…" bubble (returns the element).
  3. `fetch("/api/advisor", buildContext({query}))`.
  4. `renderChatAnswer(el, result, source)` — fills the bubble with voice text, steps, optional weather alert, a `signal · confidence` meta line, a 🔊 Listen button, the source, and a safety note; stores the spoken text on `el.dataset.voice`.
  5. On error → `renderChatError(el, message)`.
- A delegated click handler on `#chatLog` plays `el.dataset.voice` when a `.chat-listen` button is clicked. **Audio is never automatic.**

### 3.7 Module 1 rendering (Tab 2)
- Selectors (`district`, `crop`, `unit`) and the **area range slider** (with a live `<output>`).
- `refreshSignals()` fetches `/api/weather` and `/api/market` in parallel, stores them in `state.lastSignals`, and `renderSignals()` paints the two cards.
- `drawSparklines()` renders the market price spread on a `<canvas>` (min/max labels).

### 3.8 Module 2 rendering (Tab 3)
- `handleImage()` previews and base64-encodes the chosen photo (≤5 MB).
- `analyzeDisease()` POSTs to `/api/disease` and calls `renderDiseaseResult()`, which writes the dedicated disease output panel (`#diseaseResultGrid`, `#diseaseAnswerText`, `#diseaseSafetyLine`) and stores `state.diseaseSpeakText` for the disease 🔊 button.

### 3.9 Helpers
`buildContext()` assembles the advisor payload (selectors + last weather/market summaries). `fetchJson()` wraps `fetch` with error extraction. `escapeHtml()` sanitizes all interpolated text. `confidenceClass()` / `signalClass()` map values to CSS classes. `speak(text)` is the single TTS entry point (called only by buttons).

---

## 4. Backend Architecture (Serverless)

Each `api/*.js` exports `module.exports = async function handler(req, res)` — the Vercel Node function signature. Conventions shared by all handlers:

- Validate method (GET/POST) → `405` otherwise.
- Parse input (`readBody` for POST; `URL` query for GET).
- Load the knowledge base inside try/catch with an **inline minimal fallback** (so a file-read failure can't 500).
- Do the work (external fetch / LLM / RAG).
- Always `sendJson(res, 200, …)` with a clear `source`/provenance, falling back gracefully on any error.

Handlers are **stateless** and independent; the only shared code is `lib/*`. The dev server (`scripts/dev-server.mjs`) resolves `/api/<name>` → `require("api/<name>.js")` and re-reads files per request, mirroring Vercel.

---

## 5. Shared Libraries

### 5.1 `lib/shared.js`
The backend toolbox. Notable exports:

- **HTTP/JSON:** `sendJson`, `readBody` (size-limited), `fetchJsonWithTimeout` (AbortController), `readJsonFile`, `readJsonlFile`, `loadKnowledge`.
- **LLM:** `callGemini`, `callOpenAI`, `callLLM` (router), `openaiApiKey`. Internal: `geminiModelCandidates`, `openaiModelCandidates`, `partsToOpenAIContent`, `generationConfigVariants`, `extractText`, `safeParseJson`, `uniqueNonEmpty`.
- **Market math:** `findDistrict`, `findCropMarket`, `getLatestPrice`, `calcTrend`.
- **Normalization:** `coerceList` (string→array), `coerceConfidence` ("High"→0.85).
- **Safety:** `safetyNote(language)`.

`ROOT_DIR = path.join(__dirname, "..")` ensures KB reads resolve from the project root inside the serverless sandbox (not `process.cwd()`).

### 5.2 `lib/market.js`
The AgMarknet pipeline (see §9). Exports `COMMODITY_MAP`, `resolveMarketSummary` (live→seeded, never throws), `fetchLiveMarketAdvice`, `buildFallbackMarketAdvice`.

### 5.3 `lib/rag.js`
The retrieval engine (see §8). Exports `buildCorpus`, `tokenize`, `retrieve`.

---

## 6. API Contracts (every endpoint)

All responses are JSON with `Cache-Control: no-store`. All return **HTTP 200** on success *and* on graceful fallback; only input/method errors return 4xx/405.

### 6.1 `GET /api/weather`
**Query:** `district` (id, default `hisar`), `language` (default `hinglish`), optional `latitude`, `longitude`.

**Response:**
```jsonc
{
  "source": "Open-Meteo" | "Open-Meteo fallback",
  "live": true | false,
  "endpoint": "https://api.open-meteo.com/...",   // present when live
  "warning": "…",                                  // present on fallback
  "summary": {
    "date": "2026-06-19",
    "district": "Hisar",
    "temperatureC": 31.2,
    "rainProbability": 37,
    "rainMm": 1.4,
    "windKmph": 16,
    "sprayWindow": "Morning or late afternoon is suitable for neem…",
    "sowingSignal": "Irrigate or wait for useful rain if topsoil is dry.",
    "voiceResponse": "Rain chance in Hisar is 37%. …"
  },
  "raw": { /* upstream Open-Meteo payload */ }
}
```

### 6.2 `GET /api/market`
**Query:** `district` (default `hisar`), `crop` (default `onion`), `language` (default `hinglish`).

**Response:**
```jsonc
{
  "source": "data.gov.in Agmarknet live API …" | "Seeded mandi fallback dataset",
  "live": true | false,
  "warning": "…",            // present on fallback
  "generatedAt": "ISO-8601",
  "summary": {
    "crop": "Onion / Pyaaz",
    "district": "Hisar",
    "mandi": "Sonepat(Kharkhoda) APMC" | "Haryana area (N mandis)",
    "unit": "quintal",
    "latestPrice": 1500,
    "previousPrice": 1500,            // median reference
    "trend": { "label": "near the area average", "percent": 0, "signal": "wait" },
    "signal": "sell" | "hold" | "wait",
    "storageRisk": "high" | "medium" | "low",
    "priceRange": { "min": 1100, "max": 2700, "median": 1500, "mandiCount": 10 },
    "history": [ { "date": "…", "market": "…", "modal": 1100 }, … ],  // price spread
    "voiceResponse": "Onion … ₹1500/quintal … Signal: wait …",
    "live": true
  }
}
```

### 6.3 `POST /api/advisor`
**Body:**
```jsonc
{ "query": "Should I sell onion now?", "language": "en",
  "districtId": "hisar", "cropId": "onion", "unit": "acre", "area": 2,
  "weatherSummary": { … } | null, "marketSummary": { … } | null }
```
**Response:**
```jsonc
{
  "source": "ChatGPT + local RAG context" | "Gemini + local RAG context"
          | "Local fallback (LLM error)" | "Local fallback (no LLM API key set in Vercel)",
  "modelBacked": true | false,
  "retrieval": [ { "type": "disease", "title": "Fungal leaf spot / blight", "score": 6.03 }, … ],
  "result": {
    "voice_response": "…",
    "remedy_steps": ["…", "…"],
    "confidence": 0.8,
    "market_signal": "sell" | "hold" | "wait",
    "weather_alert": "…" | null,
    "source_notes": ["Intent: market", "Crop detected from question", "Market: data.gov.in Agmarknet live API …"],
    "safety_note": "…"
  }
}
```

### 6.4 `POST /api/disease`
**Body:**
```jsonc
{ "language": "en", "crop": "onion", "district": "Hisar",
  "description": "brown spots with yellow halo after rain",
  "image": { "mimeType": "image/png", "data": "<base64>" } }   // image optional; ≤5 MB
```
**Response:**
```jsonc
{
  "source": "ChatGPT image/text triage + organic KB" | "Gemini image/text triage + organic KB"
          | "Local organic KB fallback",
  "modelBacked": true | false,
  "warning": "…",          // present on fallback
  "retrieval": [ { "type": "disease", "title": "…", "score": 7.97 }, … ],
  "result": {
    "possible_issue": "Fungal leaf spot / blight",
    "confidence": 0.85,
    "visual_signs": ["…"],
    "organic_treatment": ["…"],
    "prevention": ["…"],
    "escalation": ["…"],
    "voice_response": "…",
    "safety_note": "…"
  }
}
```
**Errors:** `400` if image > 5 MB.

### 6.5 `POST /api/transcribe`
**Body:** `{ "audio": { "mimeType": "audio/webm", "data": "<base64>" } }`
**Response:** `{ "text": "…", "source": "whisper" }` or `{ "source": "browser-stt" }` (signals the client to use Web Speech / typing).

---

## 7. The LLM Subsystem

### 7.1 Router — `callLLM({ parts, schema, temperature })`
```
hasOpenAI = openaiApiKey() truthy ?
hasGemini = process.env.GEMINI_API_KEY truthy ?
neither → throw "No LLM API key configured" (caller falls back to local KB)
try OpenAI → { result, provider: "ChatGPT" }     (on error, record + continue)
try Gemini → { result, provider: "Gemini" }       (on error, record + continue)
both failed → throw (caller falls back)
```

### 7.2 Key resolution — `openaiApiKey()`
Returns the first of `OPENAI_API_KEY`, `CHATGPT_API_KEY`, `OPENAI_KEY`; **or**, tolerating a common misconfiguration, an `sk-`-prefixed value found in `CHATGPT_MODEL` / `OPENAI_MODEL`.

### 7.3 OpenAI path — `callOpenAI`
- Endpoint: `POST https://api.openai.com/v1/chat/completions`.
- Auth: `Authorization: Bearer <key>`.
- Body: `{ model, messages:[{role:"user", content}], temperature, response_format:{type:"json_object"} }`.
- `content` is built by `partsToOpenAIContent(parts)`: `{text}` → `{type:"text"}`, `{inline_data:{mime_type,data}}` → `{type:"image_url", image_url:{url:"data:<mime>;base64,…"}}`.
- Model order: `OPENAI_MODEL`/`CHATGPT_MODEL` (if a real model name, not an `sk-` key) → `gpt-5.4` → `gpt-4o`.
- Timeout: 20s per call. Output parsed via `safeParseJson`.

### 7.4 Gemini path — `callGemini`
- Endpoint: `POST {GEMINI_ENDPOINT}/{model}:generateContent` with `x-goog-api-key`.
- Two generation-config variants: structured (`responseMimeType:"application/json"` + `responseSchema`) then plain (parse JSON from text).
- Model order: `GEMINI_MODEL` → `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash` → `gemini-flash-latest`.
- Timeout: 18s. (`gemini-2.0-flash` is deprioritized — zero free-tier quota on many keys.)

### 7.5 Output robustness
Callers normalize provider output:
- `safeParseJson` — extracts JSON even from fenced/wrapped text.
- `coerceList(value, fallback)` — wraps/splits a string into an array (handles models that return a paragraph where an array is expected).
- `coerceConfidence(value, fallback)` — maps "High/Medium/Low" or "85"/"0.85" to a 0..1 number.
- Disease handler **backfills** any missing field from the top RAG disease so the UI is never blank.

---

## 8. The RAG Subsystem

`lib/rag.js` — Okapi **BM25** (`k1 = 1.5`, `b = 0.75`) in pure JS.

### 8.1 Corpus
`buildCorpus(knowledge)` flattens each `disease`, `zbnf`, and `calendar` record into a document `{ id, type, title, raw, text }`, where `text` concatenates the searchable fields (name, symptoms, treatment, steps, etc.).

### 8.2 Tokenizer
`tokenize(text)`:
- lowercases; matches `[a-z0-9 + Devanagari]` runs;
- drops bilingual **stopwords** (en + hi + hinglish fillers);
- **expands synonyms** so cross-lingual queries match: e.g. `pyaaz`/`प्याज` → `onion`, `peele` → `yellow/yellowing`, `dhabbe` → `spots`, `bhav` → `price/rate`, `barish` → `rain`.

### 8.3 Scoring & retrieval
`retrieve(query, knowledge, { types, k })`:
- filter corpus by `types` (e.g. only `disease`);
- score every doc with BM25 over the query tokens;
- return top-k `{ id, type, title, score, raw }`; if nothing scores (empty/image-only query), return the first k as grounding.

### 8.4 Integration
- **Advisor:** retrieves top diseases (`query + crop`) and ZBNF (`query`); injects `.raw` into the prompt context; exposes `retrieval[]`.
- **Disease:** retrieves diseases + ZBNF for `description + crop`; injects into the prompt and uses the top disease to **backfill** the normalized result and to pick the local-fallback match.

> Verified cross-lingual: `tokenize("पत्ते पीले धब्बे")` → `[पत्ते, leaf, leaves, पीले, yellow, धब्बे, spots]`, ranking "Fungal leaf spot / blight" first.

---

## 9. The Market Subsystem (AgMarknet)

`lib/market.js` powers **both** `/api/market` (Module 1) and the advisor.

### 9.1 The data reality
The data.gov.in resource `9ef84268-d588-465a-a308-a864a43d0070` ("Current Daily Price …") is a **same-day snapshot across many mandis** — there is **no free historical time-series**, and district-level filters are frequently empty.

### 9.2 `fetchLiveMarketAdvice(knowledge, districtId, cropId, language)`
1. Map crop → AgMarknet commodity via `COMMODITY_MAP`.
2. Query `filters[state]` + `filters[commodity]` (limit 100) — NOT district (too sparse).
3. `normalizeStateRecords` → one `{district, market, modal, date}` per record (modal > 0).
4. Dedupe to one price per mandi; sort ascending → real **price spread** for the chart.
5. Compute `min`, `max`, `median` across mandis.
6. **Headline price:** the requested district's mandi (by district name or nearest-mandi name) if present; else the **area median** (labelled "…area — district mandi not reporting today").
7. **Signal:** position vs median — `≥ +5%` → `sell`, `≤ −5%` → `hold`, else `wait`; then a **storage-risk override** (high-risk + would-be-hold → `wait`).
8. Build localized `voiceResponse` and return a full summary with `live:true`.
- Timeout 12s; throws on HTTP error or `< 2` records.

### 9.3 `resolveMarketSummary(...)`
`try fetchLiveMarketAdvice → catch buildFallbackMarketAdvice` (seeded KB via `getLatestPrice`/`calcTrend`). **Never throws** — always returns a complete summary with a `live` flag and `source` label.

### 9.4 Why the advisor uses this too
The advisor calls `resolveMarketSummary` for the **crop the question is about**, so its sell/hold/wait reasoning is grounded in the *same live source* as the Module 1 card — not seeded data.

---

## 10. The Weather Subsystem

`api/weather.js` wraps **Open-Meteo** (no key):
- Resolve district → coordinates; request `current,hourly,daily` variables (temperature, humidity, precipitation probability/sum, wind), `forecast_days=5`, `timezone=Asia/Kolkata`.
- `summarizeWeather` extracts today's rain probability/sum, temperature, max wind.
- `weatherCopy(language, rainProbability, rainSum)` derives the **spray window** and **sowing signal** in en/hi/hinglish (e.g. avoid spray if rain > 40% or sum > 2 mm).
- On any failure → `fallbackWeatherData` (labelled demo forecast), still summarized.

---

## 11. The Disease (Vision) Subsystem

`api/disease.js`:
- Validates image size (≤5 MB).
- Loads KB (with inline fallback).
- RAG-retrieves diseases (k=4) + ZBNF (k=3) for `description + crop`.
- Builds a triage prompt (language instruction + crop/district/symptoms + the RAG-retrieved knowledge) and a multimodal `parts` array (`inline_data` image + text).
- `callLLM({ parts, schema: DISEASE_SCHEMA, temperature: 0.15 })`.
- **Normalizes** the result: coerces strings→arrays, word→number confidence, backfills missing fields from the top RAG disease, and synthesizes a `voice_response` if the model omitted one.
- On no-LLM / error → `localDiseaseFallback` (RAG-selected disease + organic steps + escalation), labelled "Local organic KB fallback".

---

## 12. The Voice Subsystem

- **STT (input):** `toggleRecording()` prefers the browser **Web Speech API** (`SpeechRecognition`, lang `hi-IN`/`en-IN`) to fill the question input. If unavailable, it uses `MediaRecorder` → `POST /api/transcribe` (HF Whisper); if Whisper isn't configured, the route returns `{source:"browser-stt"}` and the user types.
- **TTS (output):** `speak(text)` uses `window.speechSynthesis` with the language voice. It is invoked **only** by the disease 🔊 button and the per-message chat 🔊 button — never on render.

---

## 13. Knowledge Base Schemas

### `districts.json` (array)
```jsonc
{ "id": "hisar", "name": "Hisar", "state": "Haryana",
  "latitude": 29.1492, "longitude": 75.7217, "nearestMandi": "Hisar" }
```

### `market_fallback.json`
```jsonc
{ "lastUpdated": "…", "crops": [
  { "id": "onion", "name": "Onion / Pyaaz", "unit": "quintal", "storageRisk": "high",
    "markets": [ { "districtId": "hisar", "name": "Hisar",
      "history": [ { "date": "…", "modal": 1880 }, … ] } ] }, … ] }
```

### `diseases.jsonl` (one JSON object per line)
```jsonc
{ "id": "fungal_leaf_spot", "name": "Fungal leaf spot / blight",
  "crops": ["onion","bajra",…], "symptoms": ["brown spots","yellow halo",…],
  "organicTreatment": ["…"], "prevention": ["…"] }
```

### `zbnf_practices.jsonl`
```jsonc
{ "id": "jeevamrit", "name": "Jeevamrit", "use": "Microbial soil tonic …",
  "guardrail": "Use locally practiced quantities …", "steps": ["…"] }
```

### `crop_calendar.jsonl`
```jsonc
{ "cropId": "onion" | "general", "sowingWindow": "…", "harvestWindow": "…",
  "rotation": ["…"], "marketNote": "…" }
```

---

## 14. End-to-End Data Flows & Sequence Diagrams

### 14.1 Advisor (Consultant Chat)
```
Browser                        /api/advisor                 external
  │ POST {query,lang,ctx}          │                           │
  ├───────────────────────────────►│                           │
  │                                 │ detectIntent / resolveCrop│
  │                                 │ resolveMarketSummary ─────► data.gov.in (AgMarknet)
  │                                 │◄──────────── live summary │ (or seeded fallback)
  │                                 │ retrieve() RAG (local)    │
  │                                 │ callLLM(prompt) ──────────► OpenAI (→ Gemini)
  │                                 │◄───────── JSON result     │
  │                                 │ normalize + validate      │
  │◄── {source,modelBacked,         │                           │
  │     retrieval,result} ──────────┤                           │
  │ renderChatAnswer (bubble + 🔊)  │                           │
  │ (LLM down → fallbackAdvisor, still grounded in live market+KB)
```

### 14.2 Market (Module 1)
```
Browser → GET /api/market?district&crop&lang
        → resolveMarketSummary → fetchLiveMarketAdvice → data.gov.in
             success → live summary (price spread, signal)
             error   → buildFallbackMarketAdvice (seeded)
        ← {source,live,summary} → renderSignals + drawSparklines
```

### 14.3 Disease (Module 2)
```
Browser → POST /api/disease {image?,description,crop,lang}
        → retrieve() RAG → callLLM(image+prompt) → OpenAI/Gemini vision
             success → normalize + backfill → result
             error   → localDiseaseFallback (RAG + KB)
        ← {source,modelBacked,retrieval,result} → renderDiseaseResult (+ 🔊)
```

### 14.4 Weather (Module 1)
```
Browser → GET /api/weather?district&lang → Open-Meteo
             success → summarizeWeather
             error   → fallbackWeatherData (demo, labelled)
        ← {source,live,summary} → weather card
```

---

## 15. Fallback & Resilience Architecture

Resilience is layered:

1. **KB load:** every handler wraps `loadKnowledge()` in try/catch with inline minimal data.
2. **External fetch:** `fetchJsonWithTimeout` bounds every call; non-OK throws into a fallback branch.
3. **Market:** `resolveMarketSummary` guarantees a summary (live → seeded).
4. **LLM:** `callLLM` cascades OpenAI → Gemini → throw; callers then produce a local-KB answer.
5. **Model output:** `safeParseJson` + `coerceList`/`coerceConfidence` + RAG backfill.
6. **Voice:** Web Speech → MediaRecorder/Whisper → typing.
7. **Provenance:** every response carries a `source`/`source_notes` label so degradation is transparent.

Net effect: with **zero** configuration and **any** subset of services down, the user still gets a coherent, labelled answer.

---

## 16. Configuration & Environment

| Variable | Used by | Default / note |
| --- | --- | --- |
| `OPENAI_API_KEY` (`CHATGPT_API_KEY`, `OPENAI_KEY`) | `callOpenAI` | Primary LLM. Also tolerated as an `sk-` value in `CHATGPT_MODEL`. |
| `OPENAI_MODEL` / `CHATGPT_MODEL` | `callOpenAI` | Model name; default `gpt-5.4` → `gpt-4o`. |
| `GEMINI_API_KEY` | `callGemini` | Fallback LLM. |
| `GEMINI_MODEL` | `callGemini` | Default `gemini-2.5-flash`. |
| `DATA_GOV_API_KEY` | `lib/market.js` | Public sample key bundled; override for reliability. |
| `DATA_GOV_RESOURCE_ID` | `lib/market.js` | Default `9ef84268-…`. |
| `HF_TOKEN`, `WHISPER_MODEL`, `WHISPER_ENDPOINT_URL` | `api/transcribe.js` | Optional server STT. |

Template: [`.env.example`](../.env.example). All are optional — the app runs fully in fallback mode with none set.

---

## 17. Deployment Architecture (Vercel)

- **Frontend:** `index.html`, `src/*`, and `knowledge_base/*` are served as static assets.
- **Functions:** each `api/*.js` becomes a Node serverless function. `lib/*` is auto-traced and bundled as a code dependency.
- **`vercel.json`:**
  ```json
  { "functions": { "api/*.js": { "maxDuration": 60, "includeFiles": "knowledge_base/**" } },
    "headers": [ { "source": "/api/(.*)", "headers": [ { "key": "Cache-Control", "value": "no-store" } ] } ] }
  ```
  - `includeFiles` bundles the KB so `fs` reads succeed in the sandbox.
  - `maxDuration: 60` covers the advisor's sequential market + LLM calls (Hobby plan max).
- **CI/CD:** GitHub-connected; every push to `main` triggers a Production deployment (each gets a unique URL; a stable domain can be set in Settings → Domains).
- **`.vercelignore`** keeps `tests/`, `scripts/`, `docs/`, `models/`, and `.env*` out of the deployment.

---

## 18. Security Architecture

- **Secret isolation:** provider keys are read only inside functions; never sent to the client. `.env` is git-ignored; keys live in Vercel env (mark **Sensitive**).
- **No persistence:** no DB, no accounts; requests are processed and returned. Images are forwarded to the chosen AI provider for analysis only.
- **Input hardening:** `readBody` caps body size; disease images capped at ≈5 MB; all interpolated text is `escapeHtml`-sanitized in the DOM.
- **Transport/caching:** HTTPS (Vercel); `no-store` on API responses.
- **Guardrails:** organic-only / no-toxic-dose rules in prompts and reinforced by the curated KB.

---

## 19. Performance & Timeout Budget

| Operation | Timeout | Notes |
| --- | --- | --- |
| Open-Meteo / data.gov fetch | 10–12s | fast-fail to fallback |
| OpenAI call | 20s/model | up to 2 models |
| Gemini call | 18s | only if OpenAI absent/fails |
| **Advisor worst case** | market 12s + OpenAI 2×20s = **52s** | < `maxDuration` 60s ✓ |
| Frontend | no build; cached static | fast on low-end devices |

The market fetch typically returns in <2s (or fast-fails to seeded), and the LLM in a few seconds, so the typical advisor round-trip is well under the budget.

---

## 20. Testing Architecture

### 20.1 `tests/api_tests.js` (`npm run test:api`)
- Invokes each handler directly with mock `req`/`res` (the exact code Vercel runs).
- Matrix: weather (4 districts × 3 languages), market (7 crops + accuracy checks), disease (3 languages + image), advisor (7 question-types × 3 languages + market-accuracy check).
- Assertions: **structural** (schema validity, types, ranges) and **accuracy** (price sanity, signal validity, onion-never-"hold", Hindi Devanagari output, RAG grounding present).
- Runs in **fallback** mode (no keys, deterministic) and **model-backed** mode (with a key). Latest: **270/270** in both.
- Includes a real PNG generator so the OpenAI vision path is exercised with a valid image.

### 20.2 `tests/validate_project.py` (`npm run validate`)
- Asserts required files exist (incl. `lib/market.js`, `lib/rag.js`), the KB parses, guardrail strings are present (`synthetic chemical pesticides`, `inline_data`, structured-output markers), and `vercel.json` is correct (`maxDuration === 60`).

---

## 21. File-by-File Reference

```
index.html              3-tab SPA shell (topbar, chat, module-1, module-2, outputs)
vercel.json             functions config (maxDuration 60, includeFiles KB) + no-store headers
package.json            scripts: dev, test:api, validate, download:whisper; engines node>=18
.env.example            documented env template
.vercelignore           excludes tests/docs/scripts/models/.env from deploy

api/advisor.js          POST /api/advisor — intent + crop resolve, live market, RAG, callLLM,
                        normalized result, intent-aware local fallback
api/disease.js          POST /api/disease — RAG, callLLM vision, normalize+backfill, local fallback
api/market.js           GET  /api/market  — thin handler over lib/market.resolveMarketSummary
api/weather.js          GET  /api/weather — Open-Meteo wrapper + spray/sowing advisory + fallback
api/transcribe.js       POST /api/transcribe — HF Whisper / browser-STT signal

lib/shared.js           callLLM/callOpenAI/callGemini router; HTTP/JSON helpers; loadKnowledge;
                        market math (findDistrict/findCropMarket/getLatestPrice/calcTrend);
                        coerceList/coerceConfidence; safetyNote
lib/market.js           AgMarknet pipeline: COMMODITY_MAP, fetchLiveMarketAdvice,
                        buildFallbackMarketAdvice, resolveMarketSummary; signal + spread logic
lib/rag.js              BM25 retrieval: buildCorpus, tokenize (stopwords+synonyms), retrieve

knowledge_base/districts.json          districts (Haryana set)
knowledge_base/market_fallback.json    seeded prices (7 crops)
knowledge_base/diseases.jsonl          disease/pest entries
knowledge_base/zbnf_practices.jsonl    ZBNF practices
knowledge_base/crop_calendar.jsonl     sowing/harvest/rotation per crop

src/app.js              frontend: state, dom, COPY/i18n, boot, bindEvents, applyLanguage,
                        switchTab, chat (append/render/listen), refreshSignals/renderSignals,
                        analyzeDisease/renderDiseaseResult, voice (toggleRecording/speak)
src/styles.css          tabs, chat bubbles, cards, sparkline, area slider, responsive rules

scripts/dev-server.mjs  local server mirroring Vercel routing (/api/<name> → api/<name>.js)
scripts/download-whisper.mjs  optional Whisper artifact downloader

tests/api_tests.js      full endpoint pipeline + accuracy suite (270 assertions)
tests/validate_project.py  structural validator

docs/PRD.md             product requirements + development process
docs/architecture.md    this document
docs/prompt-guardrails.md  guardrail details
docs/demo-script.md     demo walkthrough
docs/deployment.md      deployment notes
```

---

*This architecture document reflects the v1.0 codebase (3-tab UI, ChatGPT-primary LLM routing, shared AgMarknet pipeline, BM25 RAG). Keep it in sync with `lib/` and `api/` as the system evolves.*
