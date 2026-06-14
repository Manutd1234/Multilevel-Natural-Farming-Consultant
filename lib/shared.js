const fs = require("node:fs");
const path = require("node:path");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readJsonFile(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

function readJsonlFile(relativePath) {
  return fs
    .readFileSync(path.join(process.cwd(), relativePath), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
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

async function callGemini({ parts, schema, temperature = 0.2 }) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("Missing GEMINI_API_KEY");
    error.code = "MISSING_GEMINI_API_KEY";
    throw error;
  }

  const response = await fetch(`${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature,
        responseFormat: {
          text: {
            mimeType: "application/json",
            schema
          }
        }
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || "Gemini request failed");
    error.statusCode = response.status;
    throw error;
  }

  const parsed = safeParseJson(extractText(data));
  if (!parsed) {
    const error = new Error("Gemini returned non-JSON content");
    error.statusCode = 502;
    throw error;
  }
  return parsed;
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

module.exports = {
  GEMINI_MODEL,
  sendJson,
  readBody,
  readJsonFile,
  readJsonlFile,
  loadKnowledge,
  callGemini,
  findDistrict,
  findCropMarket,
  getLatestPrice,
  calcTrend,
  safetyNote
};
