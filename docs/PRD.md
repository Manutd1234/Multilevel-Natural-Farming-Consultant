# Product Requirements Document (PRD)
## Farming Consultant (KisaanVaani) — Voice-First Natural Farming Advisor

| Field | Value |
| --- | --- |
| **Product** | Farming Consultant (KisaanVaani) |
| **Type** | Web application (mobile-first, voice-first) |
| **Platform** | Vercel Serverless (Node.js) + static frontend |
| **Status** | Deployed to production (Vercel), GitHub-connected CI/CD |
| **Document owner** | Engineering |
| **Audience** | Reviewers, product stakeholders, future maintainers |

### Version history

| Version | Change summary |
| --- | --- |
| 0.1 | Initial two-module concept (Weather & Market, Disease). Gemini-only, 2-tab UI, seeded prices. |
| 0.2 | Integration hardening; all KB reads made fault-tolerant; Vercel runtime fixed. |
| 0.3 | Live AgMarknet market integration; price-spread chart; state-area fallback. |
| 0.4 | LLM reliability: default model → `gemini-2.5-flash`; multi-model fallback; UI compaction. |
| 0.5 | Lightweight BM25 RAG over the knowledge base, wired into advisor + disease. |
| 0.6 | Provider-agnostic LLM: OpenAI/ChatGPT primary, Gemini fallback; output coercion. |
| 0.7 | Shared AgMarknet pipeline used by Module 1 **and** advisor; 270-assertion API test suite; `maxDuration` 60s. |
| 1.0 | 3-tab UX (Consultant Chat / Module 1 / Module 2); ChatGPT-style chat log; per-tab outputs; voice button-only; adjustable area slider. |

---

## 1. Overview & Vision

### 1.1 Vision
Empower Indian smallholder farmers to make better **selling**, **spraying/sowing**, and **crop-health** decisions by talking to an AI advisor in their own language — grounded in real, live data, and constrained to safe, organic-first guidance.

### 1.2 Elevator pitch
> A voice-first web app where a farmer speaks a question ("Should I sell onions now?"), sees a real live mandi price, can photograph a sick leaf for an organic treatment plan, and hears the answer read aloud in Hindi/Hinglish/English — that never crashes, even when the AI or the data feed is down.

### 1.3 Product principles
1. **Fallback-first** — never crash, never blank.
2. **Grounded, not hallucinated** — RAG + strict schema + guardrails.
3. **Provider-agnostic AI** — model is a swappable dependency.
4. **Voice-first, mobile-first, language-first.**
5. **Lean & operable** — no build, no DB, near-zero cost.

---

## 2. Problem Statement & Background

Smallholder farmers repeatedly lose income on three decisions — *when to sell*, *when to spray/sow*, and *what is wrong with the crop* — because they lack timely, comparative, trustworthy, language-appropriate information. Existing tools assume English typing, heavy apps, and good connectivity, and frequently default to recommending synthetic chemicals. (See the README §2 for the full problem analysis and cost framing.)

**Opportunity:** combine free/open government and weather data with a guardrailed LLM and a voice-first multilingual UI to deliver safe, actionable advice in seconds, with graceful degradation suitable for the field.

---

## 3. Goals & Non-Goals

### 3.1 Goals (in scope)
- G1. Live, district-level **weather** translated into spray/sowing advisories.
- G2. Live **mandi prices** (AgMarknet) with a sell/hold/wait signal.
- G3. **Disease triage** from image and/or symptoms with organic-only remedies.
- G4. A **conversational advisor** answering free-form farming questions, grounded in live market data and the KB.
- G5. **Voice in/out** and **English/Hindi/Hinglish** throughout.
- G6. **Resilience** — every feature works with zero configuration via fallbacks.
- G7. **Deployable on Vercel** with no build step and secrets kept server-side.
- G8. **Testable** — automated structural and pipeline tests.

### 3.2 Non-Goals (explicitly out of scope, for now)
- N1. User accounts, authentication, or per-user history persistence.
- N2. A trained/fine-tuned in-house vision model (we use hosted LLM vision).
- N3. Payments, e-commerce, or buyer/seller marketplace.
- N4. A native mobile app (the web app is mobile-first; PWA is future work).
- N5. SMS/feature-phone delivery (considered, deferred — see §12).
- N6. Real time-series price history (AgMarknet provides snapshots only).

---

## 4. Success Metrics

| Metric | Target | How measured |
| --- | --- | --- |
| Endpoint availability (never 5xx to user) | 100% | Fallback-first design; API test suite |
| Cold-start + response (cached UI) | < ~10s typical for AI answers | Manual + timeout budget |
| Test pass rate | 100% (fallback & model-backed) | `npm run test:api` (270 assertions) |
| Languages supported end-to-end | 3 (en/hi/hinglish) | Test matrix |
| Zero-config usefulness | App fully functional with no keys | Fallback mode tests |
| Market data provenance clarity | Always labelled live vs seeded | UI source line |

---

## 5. Personas & User Stories

**Personas** are detailed in README §3 (Ramesh – onion farmer; Sunita – vegetable grower; KVK/FPO officer; reviewer).

### User stories

- **US1 (Market):** *As a farmer, I want to ask whether to sell my crop now so I can avoid a distress sale.* → Consultant Chat / Module 1.
- **US2 (Weather):** *As a farmer, I want to know if it will rain before I spray neem so I don't waste the input.* → Module 1 / Chat.
- **US3 (Disease):** *As a farmer, I want to photograph a sick leaf and get an organic treatment so I don't resort to chemicals.* → Module 2.
- **US4 (Voice):** *As a farmer who prefers speaking, I want to ask by voice and hear the answer.* → mic + 🔊 listen.
- **US5 (Language):** *As a Hindi speaker, I want the whole app and answers in Hindi/Hinglish.* → language selector.
- **US6 (Trust):** *As a cautious farmer, I want to know how confident the advice is and when to consult a human expert.* → confidence + escalation.
- **US7 (Resilience):** *As a farmer with patchy data, I want the app to still help even when something is down.* → fallbacks.
- **US8 (Operator):** *As a reviewer, I want to verify the data is real and the system is sound.* → source labels, tests, docs.

---

## 6. Functional Requirements

IDs are referenced by the test suite and acceptance criteria.

### 6.1 Consultant Chat (Tab 1) — `/api/advisor`
- **FR-CHAT-1** Accept a free-text/voice question with farm context (district, crop, unit, area, language).
- **FR-CHAT-2** Detect intent (market/weather/disease/finance/rotation/general) across all three languages.
- **FR-CHAT-3** Resolve the crop the question is about (from the query text, else the selector).
- **FR-CHAT-4** Ground the answer in **live AgMarknet** market data (same pipeline as Module 1) and **RAG**-retrieved KB chunks.
- **FR-CHAT-5** Return a strict JSON result: `voice_response`, `remedy_steps[]`, `confidence`, `market_signal` ∈ {sell,hold,wait}, `weather_alert|null`, `source_notes[]`, `safety_note`.
- **FR-CHAT-6** Render as a chat log: user bubble → "thinking" → assistant bubble with steps, meta (signal · confidence), source, safety, and a 🔊 Listen button.
- **FR-CHAT-7** Provide quick-prompt chips that ask within the chat tab.
- **FR-CHAT-8** Never auto-speak; audio only on 🔊 click.
- **FR-CHAT-9** On LLM failure, return an intent-aware local fallback answer (still grounded in live prices + KB).

### 6.2 Module 1 — Weather (Tab 2) — `/api/weather`
- **FR-WX-1** Fetch live current/hourly/daily forecast by district coordinates (Open-Meteo).
- **FR-WX-2** Produce rain probability, temperature, and a plain-language spray/sowing advisory and `voiceResponse`.
- **FR-WX-3** Localize output to the requested language.
- **FR-WX-4** On failure, return a labelled demo forecast (HTTP 200).

### 6.3 Module 1 — Market (Tab 2) — `/api/market` + `lib/market.js`
- **FR-MKT-1** Fetch live AgMarknet prices (state + commodity) from data.gov.in.
- **FR-MKT-2** Resolve a headline price: requested district's mandi if reporting, else area median (labelled).
- **FR-MKT-3** Compute a sell/hold/wait signal vs the area median, with a storage-risk override (perishables never plain "hold").
- **FR-MKT-4** Return a price spread across mandis for the sparkline; latest price; unit; trend; signal; source; live flag.
- **FR-MKT-5** On failure, return the seeded 7-crop dataset (labelled "Seeded mandi fallback dataset").
- **FR-MKT-6** Provide district/crop/unit selectors and an adjustable **area slider** with a live value.

### 6.4 Module 2 — Disease (Tab 3) — `/api/disease`
- **FR-DIS-1** Accept an image (≤5 MB base64) and/or symptom text, plus crop/district/language.
- **FR-DIS-2** RAG-retrieve relevant disease/ZBNF KB chunks for the symptoms/crop.
- **FR-DIS-3** Call LLM vision (ChatGPT/Gemini) for a triage; normalize and backfill missing fields from RAG so the card is never blank.
- **FR-DIS-4** Return: `possible_issue`, `confidence`, `visual_signs[]`, `organic_treatment[]`, `prevention[]`, `escalation[]`, `voice_response`, `safety_note`.
- **FR-DIS-5** Enforce organic-only remedies; escalate to KVK if confidence < 0.65 or spreading.
- **FR-DIS-6** Render in a dedicated output panel with a 🔊 Listen button (button-only audio).
- **FR-DIS-7** On no-LLM, return a fully-populated local KB triage.

### 6.5 Voice — `/api/transcribe` + browser
- **FR-VOICE-1** Mic uses browser Web Speech (`hi-IN`/`en-IN`); fills the question input.
- **FR-VOICE-2** If Web Speech unavailable, `MediaRecorder` → `/api/transcribe` (HF Whisper); else typing.
- **FR-VOICE-3** TTS reads answers aloud only on button press.

### 6.6 Cross-cutting
- **FR-X-1** Language selector switches all UI strings and API language params live.
- **FR-X-2** Three independent tabs, each with its own output area.
- **FR-X-3** Every API response is labelled with its data provenance/source.

---

## 7. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| **NFR-REL-1** | Every endpoint returns HTTP 200 with usable content; no user-facing 5xx. |
| **NFR-REL-2** | KB file reads are fault-tolerant (inline fallbacks). |
| **NFR-PERF-1** | Function `maxDuration` 60s; OpenAI per-call timeout 20s; market fetch 12s; total advisor worst case < 60s. |
| **NFR-PERF-2** | Static frontend, no build, minimal payload for low-end devices. |
| **NFR-SEC-1** | No secrets in repo; provider keys only server-side; `.env` git-ignored. |
| **NFR-SEC-2** | `no-store` on API responses; input size limits (image ≈5 MB, body capped). |
| **NFR-I18N-1** | Full en/hi/hinglish coverage in UI and AI responses; cross-lingual RAG. |
| **NFR-A11Y-1** | Large tap targets, high-contrast text, ARIA roles on tabs and live regions. |
| **NFR-OPS-1** | Zero-config deploy on Vercel; Git push → auto-deploy. |
| **NFR-TEST-1** | Automated tests pass in both fallback and model-backed modes. |

---

## 8. User Flows

### 8.1 Ask the consultant (voice)
```
Open app (Chat tab) → tap mic → speak "kya abhi pyaaz bechna chahiye?"
  → text fills input → tap Ask
  → user bubble + "thinking…" → server: intent=market, crop=onion,
    fetch live AgMarknet, RAG, callLLM
  → assistant bubble: answer + steps + (signal · confidence) + source + 🔊
  → tap 🔊 to hear it
```

### 8.2 Check market (Module 1)
```
Tab "Module 1" → choose district/crop, drag area slider
  → Weather card (rain %, spray window) + Mandi card (₹ price, signal, spread, sparkline)
```

### 8.3 Diagnose a disease (Module 2)
```
Tab "Module 2" → upload/capture leaf photo and/or type symptoms → Analyze
  → result panel: possible issue, confidence, visual signs, organic treatment,
    prevention, escalate-if → 🔊 listen
```

---

## 9. Data, API & Integration Requirements

(Full contracts in [architecture.md](architecture.md).)

- **DR-1** Knowledge base in flat JSON/JSONL, versioned with code, bundled into functions.
- **DR-2** Live weather: Open-Meteo (no key).
- **DR-3** Live market: data.gov.in AgMarknet resource `9ef84268-…`; public sample key bundled, `DATA_GOV_API_KEY` override.
- **DR-4** LLM: OpenAI Chat Completions (JSON mode) primary; Gemini `generateContent` (structured output) fallback.
- **DR-5** STT: HF Whisper inference or custom endpoint; browser Web Speech primary.
- **DR-6** All integrations wrapped with timeouts and graceful fallbacks.

---

## 10. AI / Prompt Requirements & Guardrails

- **AI-1** Single `callLLM` router: OpenAI → Gemini → throw (caller falls back).
- **AI-2** Strict JSON output schema per route; server-side normalization (`coerceList`, `coerceConfidence`, `safeParseJson`).
- **AI-3** RAG retrieval (BM25 + bilingual synonyms) injects only relevant KB chunks; `retrieval[]` surfaced in responses.
- **AI-4** Guardrails (in prompt **and** code): organic-only; no synthetic pesticides/toxic doses; confidence disclosure; no final diagnosis from a photo; escalation to KVK; safety note on every answer.
- **AI-5** Language: respond only in the requested language.

---

## 11. Acceptance Criteria (selected)

- **AC-1** With **no** environment variables, all four endpoints return valid, labelled fallback content; the UI renders all three tabs and answers questions. ✅ (fallback test run: 270/270)
- **AC-2** With an OpenAI/ChatGPT key, advisor and disease responses are `modelBacked: true` with source "ChatGPT …". ✅ (verified live on Vercel)
- **AC-3** Module 1 and the advisor both report market provenance "data.gov.in Agmarknet live API" when the feed is reachable. ✅
- **AC-4** Onion (high storage risk) market signal is never plain "hold" (it becomes "wait"). ✅ (asserted)
- **AC-5** A pure-Hindi disease query retrieves the correct English KB entry via cross-lingual RAG. ✅ ("पत्ते पीले धब्बे" → Fungal leaf spot)
- **AC-6** Voice never plays automatically; only on a 🔊 button press. ✅ (verified — only two button-triggered `speak()` sites)
- **AC-7** Disease card is never blank even if the model omits a field (RAG backfill). ✅
- **AC-8** `python tests/validate_project.py` and `node tests/api_tests.js` both pass. ✅

---

## 12. Development Process (how it was actually built)

The product was built iteratively, each phase verified end-to-end (local tests + live Vercel checks) before moving on.

### Phase 0 — Baseline
Two-module concept (Weather & Market, Disease) on Vercel with Gemini and a vanilla-JS UI; market prices seeded.

### Phase 1 — Integration hardening
- Wrapped every `loadKnowledge()` call in try/catch with inline minimal fallback data so a serverless file-read issue returns a graceful 200 instead of a 500.
- Fixed `vercel.json` (removed an invalid `runtime` field) so functions run on a Node version with native `fetch`.
- **Outcome:** Modules stopped failing silently; deploys succeeded.

### Phase 2 — Live AgMarknet market
- Investigated the data.gov.in feed: confirmed it's a *daily snapshot* (no history) and that district-level filters are often empty.
- Designed `fetchLiveMarketAdvice`: query state+commodity, dedupe to one price/mandi, pick the district's mandi or the area median, compute a signal vs the median with a storage-risk override, and render the **real price spread** as the chart.
- Defaulted a public sample key and documented obtaining a personal `DATA_GOV_API_KEY`.
- **Outcome:** real, live, labelled mandi prices with honest semantics.

### Phase 3 — LLM reliability + UI
- Diagnosed that `gemini-2.0-flash` returns **zero free-tier quota** on common keys (HTTP 429, `limit: 0`); `gemini-2.5-flash` works.
- Switched the default model to `gemini-2.5-flash` and added a multi-model fallback chain.
- Compacted oversized typography, improved contrast, and capped the image preview for readability.
- **Outcome:** AI answers actually returned model-backed results; UI became scannable.

### Phase 4 — Lightweight RAG
- Built `lib/rag.js`: a pure-JS BM25 retriever with bilingual stopwords and cross-lingual synonym expansion.
- Wired it into the advisor and disease prompts (inject only relevant chunks) and into the local fallbacks; surfaced `retrieval[]` for transparency.
- **Outcome:** grounded answers; verified cross-lingual retrieval.

### Phase 5 — Provider-agnostic LLM (ChatGPT)
- Added `callOpenAI` + a unified `callLLM` router preferring OpenAI, falling back to Gemini.
- Added robust output coercion (`coerceList`, `coerceConfidence`) to absorb provider quirks (e.g. gpt-4o-mini returning strings where arrays/numbers are expected).
- Made key resolution tolerant of a common misconfiguration (an `sk-` key pasted into `CHATGPT_MODEL`).
- **Outcome:** reliable, paid-credit ChatGPT primary with zero-cost Gemini fallback; verified on Vercel.

### Phase 6 — Shared market pipeline + tests
- Extracted `lib/market.js` (`resolveMarketSummary`) so **Module 1 and the advisor use the identical live AgMarknet source** — fixing the advisor's earlier reliance on seeded data.
- Wrote `tests/api_tests.js`: 270 assertions across endpoints, crops, languages, and question types, with structural + accuracy checks; runs in fallback and model-backed modes.
- Raised `maxDuration` to 60s to cover the advisor's sequential market+LLM calls; tightened the OpenAI timeout.
- **Outcome:** consistent market grounding; a repeatable quality gate; safe timeout budget.

### Phase 7 — 3-tab UX + voice control
- Restructured the UI into three tabs (Consultant Chat / Module 1 / Module 2), each with its own output area.
- Built a ChatGPT-style conversation log with per-message 🔊 Listen buttons.
- Made voice **button-only** (removed all auto-speak).
- Added the adjustable **area slider**.
- **Outcome:** focused, chat-like UX with user-controlled audio; verified live.

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Sample AgMarknet key rate-limited | Medium | Medium | Graceful seeded fallback (labelled); document personal key. |
| LLM provider down / quota exhausted | Medium | High | Multi-provider routing + local KB fallback. |
| Model returns malformed JSON | Medium | Medium | `safeParseJson` + field coercion + RAG backfill. |
| Vercel function timeout (advisor) | Low | Medium | 60s limit; 20s OpenAI / 12s market timeouts; budget < 60s. |
| Browser lacks Web Speech | Medium | Low | MediaRecorder→Whisper, then typing. |
| Hallucinated unsafe advice | Low | High | Organic-only guardrails (prompt + code), confidence gating, escalation. |
| Secrets leak | Low | High | `.env` git-ignored; server-side only; mark Sensitive in Vercel. |

---

## 14. Open Questions / Future Decisions

- Should we persist daily price snapshots (adds storage) to provide a real time-trend?
- Add embedding-based RAG as an optional upgrade for a larger KB?
- Re-introduce SMS/WhatsApp for feature phones (needs a provider + cost model)?
- Expand district/state coverage and crop catalogue — prioritisation by region?

---

## 15. Appendix — Traceability

| Requirement | Implemented in | Tested by |
| --- | --- | --- |
| FR-CHAT-* | `api/advisor.js`, `src/app.js` (chat) | `tests/api_tests.js` (advisor matrix) |
| FR-WX-* | `api/weather.js` | `tests/api_tests.js` (weather) |
| FR-MKT-* | `api/market.js`, `lib/market.js` | `tests/api_tests.js` (market + accuracy) |
| FR-DIS-* | `api/disease.js`, `lib/rag.js` | `tests/api_tests.js` (disease) |
| FR-VOICE-* | `api/transcribe.js`, `src/app.js` | manual / browser |
| AI-* | `lib/shared.js`, `lib/rag.js` | `tests/api_tests.js`, `validate_project.py` |
| NFR-REL-* | all `api/*`, `lib/*` | both suites |

---

*This PRD is a living document; update the version history and traceability table as the product evolves.*
