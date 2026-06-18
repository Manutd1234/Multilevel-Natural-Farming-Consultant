const fs = require("node:fs");
const path = require("node:path");

// Resolve knowledge_base relative to the project root (lib/ is one level down).
// Using __dirname instead of process.cwd() so file reads work inside Vercel
// serverless functions, where cwd is not guaranteed to be the project root.
const ROOT_DIR = path.join(__dirname, "..");

// gemini-2.5-flash is the primary model: gemini-2.0-flash currently returns a
// zero free-tier quota (HTTP 429, limit:0) on common keys, so leading with it
// wasted the first attempt. 2.0-flash is kept as a later fallback.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readJsonFile(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8"));
}

function readJsonlFile(relativePath) {
  return fs
    .readFileSync(path.join(ROOT_DIR, relativePath), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

function readBody(req, maxChars = 8_000_000) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxChars) {
        reject(new Error("Request is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function loadKnowledge() {
  return {
    districts: readJsonFile("knowledge_base/districts.json"),
    market: readJsonFile("knowledge_base/market_fallback.json"),
    diseases: readJsonlFile("knowledge_base/diseases.jsonl"),
    zbnf: readJsonlFile("knowledge_base/zbnf_practices.jsonl"),
    calendar: readJsonlFile("knowledge_base/crop_calendar.jsonl")
  };
}

function extractText(geminiResponse) {
  return (geminiResponse.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function uniqueNonEmpty(values) {
  return [...new Set(values.filter(Boolean))];
}

function geminiModelCandidates() {
  return uniqueNonEmpty([
    process.env.GEMINI_MODEL,
    GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-flash-latest"
  ]);
}

function generationConfigVariants(schema, temperature) {
  if (!schema) return [{ temperature }];
  // Gemini structured-output uses responseMimeType + responseSchema. Fall back to
  // a plain request (and parse JSON from text) if the schema is rejected.
  return [
    {
      temperature,
      responseMimeType: "application/json",
      responseSchema: schema
    },
    { temperature }
  ];
}

async function callGemini({ parts, schema, temperature = 0.2 }) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("Missing GEMINI_API_KEY");
    error.code = "MISSING_GEMINI_API_KEY";
    throw error;
  }

  const errors = [];
  const models = geminiModelCandidates();
  const configs = generationConfigVariants(schema, temperature);

  for (const model of models) {
    for (const generationConfig of configs) {
      try {
        const { response, data } = await fetchJsonWithTimeout(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig
          })
        }, 18_000);
        if (!response.ok) {
          errors.push(`${model}: ${data.error?.message || `HTTP ${response.status}`}`);
          continue;
        }

        const parsed = safeParseJson(extractText(data));
        if (parsed) return parsed;

        errors.push(`${model}: non-JSON response`);
      } catch (error) {
        errors.push(`${model}: ${error.message}`);
      }
    }
  }

  // Surface a deduped, per-model summary so misconfigured keys/models are debuggable.
  throw new Error(errors.length ? `Gemini failed — ${[...new Set(errors)].join(" | ")}` : "Gemini request failed");
}

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// Resolve the OpenAI key. Accepts the standard names, and tolerates an `sk-` key
// pasted into a *_MODEL variable by mistake so misconfiguration still works.
function openaiApiKey() {
  const direct = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || process.env.OPENAI_KEY;
  if (direct) return direct.trim();
  for (const candidate of [process.env.CHATGPT_MODEL, process.env.OPENAI_MODEL]) {
    if (candidate && /^sk-/.test(candidate.trim())) return candidate.trim();
  }
  return "";
}

function openaiModelCandidates() {
  const isModelName = (value) => value && !/^sk-/.test(String(value).trim());
  return uniqueNonEmpty([
    isModelName(process.env.OPENAI_MODEL) ? process.env.OPENAI_MODEL.trim() : null,
    isModelName(process.env.CHATGPT_MODEL) ? process.env.CHATGPT_MODEL.trim() : null,
    "gpt-4o-mini",
    "gpt-4o"
  ]);
}

// Convert Gemini-style parts ([{text}, {inline_data}]) to OpenAI chat content so
// the handlers can stay provider-agnostic.
function partsToOpenAIContent(parts) {
  const content = [];
  for (const part of parts || []) {
    if (part.text) content.push({ type: "text", text: part.text });
    else if (part.inline_data?.data) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}` }
      });
    }
  }
  return content;
}

async function callOpenAI({ parts, temperature = 0.2 }) {
  const key = openaiApiKey();
  if (!key) {
    const error = new Error("Missing OPENAI_API_KEY");
    error.code = "MISSING_OPENAI_API_KEY";
    throw error;
  }

  const content = partsToOpenAIContent(parts);
  const errors = [];

  for (const model of openaiModelCandidates()) {
    try {
      const { response, data } = await fetchJsonWithTimeout(OPENAI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          temperature,
          response_format: { type: "json_object" }
        })
      }, 25_000);

      if (!response.ok) {
        errors.push(`${model}: ${data.error?.message || `HTTP ${response.status}`}`);
        continue;
      }

      const parsed = safeParseJson(data.choices?.[0]?.message?.content || "");
      if (parsed) return parsed;
      errors.push(`${model}: non-JSON response`);
    } catch (error) {
      errors.push(`${model}: ${error.message}`);
    }
  }

  throw new Error(errors.length ? `OpenAI failed — ${[...new Set(errors)].join(" | ")}` : "OpenAI request failed");
}

// Unified LLM entry point: prefer OpenAI (ChatGPT) when configured — the user has
// paid credits, so it is reliable — then fall back to Gemini, then let the caller
// use its local KB fallback. Returns { result, provider } for accurate labels.
async function callLLM(options) {
  const hasOpenAI = Boolean(openaiApiKey());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  if (!hasOpenAI && !hasGemini) {
    throw new Error("No LLM API key configured (set OPENAI_API_KEY or GEMINI_API_KEY)");
  }

  const errors = [];
  if (hasOpenAI) {
    try { return { result: await callOpenAI(options), provider: "ChatGPT" }; }
    catch (error) { errors.push(error.message); }
  }
  if (hasGemini) {
    try { return { result: await callGemini(options), provider: "Gemini" }; }
    catch (error) { errors.push(error.message); }
  }
  throw new Error(errors.join(" | ") || "LLM request failed");
}

function findDistrict(knowledge, districtId) {
  return knowledge.districts.find((district) => district.id === districtId) || knowledge.districts[0];
}

function findCropMarket(knowledge, cropId) {
  return knowledge.market.crops.find((crop) => crop.id === cropId) || knowledge.market.crops[0];
}

function getLatestPrice(cropMarket, districtId) {
  const market = cropMarket.markets.find((item) => item.districtId === districtId) || cropMarket.markets[0];
  const series = market.history;
  return {
    market,
    latest: series[series.length - 1],
    previous: series[Math.max(0, series.length - 2)],
    first: series[0]
  };
}

function calcTrend(priceInfo) {
  const delta = priceInfo.latest.modal - priceInfo.first.modal;
  const pct = Math.round((delta / priceInfo.first.modal) * 100);
  if (pct >= 6) return { label: "rising", percent: pct, signal: "hold" };
  if (pct <= -6) return { label: "falling", percent: pct, signal: "sell" };
  return { label: "steady", percent: pct, signal: "wait" };
}

function safetyNote(language = "hinglish") {
  const notes = {
    hinglish: "Yeh prototype salah hai. Mandi rate, disease treatment, aur finance decision se pehle local mandi/KVK/agriculture officer se confirm karein.",
    hi: "यह प्रोटोटाइप सलाह है। मंडी भाव, रोग उपचार और वित्तीय फैसले से पहले स्थानीय मंडी/KVK/कृषि अधिकारी से पुष्टि करें।",
    en: "This is prototype advice. Verify mandi prices, disease treatment, and financial decisions with the local mandi, KVK, or agriculture officer."
  };
  return notes[language] || notes.hinglish;
}

// Models (esp. gpt-4o-mini) sometimes return a string where a JSON array is
// expected, or a word like "High" for a numeric field. These coerce the model
// output back to the shape the UI needs, keeping the model's real content.
function coerceList(value, fallback = []) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    const parts = value
      .split(/\r?\n+|;\s*|(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    return parts.length ? parts : [value.trim()];
  }
  return fallback;
}

function coerceConfidence(value, fallback = 0.6) {
  if (typeof value === "number" && Number.isFinite(value)) return value > 1 ? value / 100 : value;
  const text = String(value || "").toLowerCase();
  if (/high|strong/.test(text)) return 0.85;
  if (/med|moderate/.test(text)) return 0.6;
  if (/low|uncertain|unsure/.test(text)) return 0.4;
  const numeric = parseFloat(text.replace(/[^\d.]/g, ""));
  if (Number.isFinite(numeric)) return numeric > 1 ? numeric / 100 : numeric;
  return fallback;
}

module.exports = {
  GEMINI_MODEL,
  sendJson,
  fetchJsonWithTimeout,
  readBody,
  readJsonFile,
  readJsonlFile,
  loadKnowledge,
  callGemini,
  callOpenAI,
  callLLM,
  openaiApiKey,
  findDistrict,
  findCropMarket,
  getLatestPrice,
  calcTrend,
  safetyNote,
  coerceList,
  coerceConfidence
};
