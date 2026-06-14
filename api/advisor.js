const {
  sendJson,
  readBody,
  loadKnowledge,
  findDistrict,
  findCropMarket,
  getLatestPrice,
  calcTrend,
  callGemini,
  safetyNote
} = require("../lib/shared");

const ADVISOR_SCHEMA = {
  type: "object",
  properties: {
    voice_response: { type: "string" },
    remedy_steps: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    market_signal: { type: "string", enum: ["sell", "hold", "wait"] },
    weather_alert: { type: "string" },
    source_notes: { type: "array", items: { type: "string" } },
    safety_note: { type: "string" }
  },
  required: ["voice_response", "remedy_steps", "confidence", "market_signal", "safety_note"]
};

function fallbackAdvisor(payload, knowledge) {
  const district = findDistrict(knowledge, payload.districtId);
  const cropMarket = findCropMarket(knowledge, payload.cropId);
  const priceInfo = getLatestPrice(cropMarket, district.id);
  const trend = calcTrend(priceInfo);
  return {
    voice_response: `${district.name} ke liye ${cropMarket.name} ka mandi signal ${trend.signal} hai. Bhav ₹${priceInfo.latest.modal}/${cropMarket.unit} hai. Natural farming ke liye neem, jeevamrit, crop rotation aur KVK confirmation follow karein.`,
    remedy_steps: [
      "Crop aur symptom clear rakhein; photo ho to disease module mein upload karein.",
      "Mandi rate ko local mandi/eNAM/Agmarknet se verify karein.",
      "Rain chance high ho to spray postpone karein."
    ],
    confidence: 0.62,
    market_signal: trend.signal,
    weather_alert: "Weather details need Open-Meteo fetch.",
    source_notes: ["Seeded mandi dataset", "Local natural farming JSONL"],
    safety_note: safetyNote(payload.language)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST /api/advisor" });
  const payload = await readBody(req);
  const knowledge = loadKnowledge();

  const district = findDistrict(knowledge, payload.districtId);
  const cropMarket = findCropMarket(knowledge, payload.cropId);
  const priceInfo = getLatestPrice(cropMarket, district.id);
  const trend = calcTrend(priceInfo);
  const context = {
    district,
    cropMarket,
    priceInfo,
    trend,
    zbnf: knowledge.zbnf.slice(0, 5),
    cropCalendar: knowledge.calendar.filter((item) => item.cropId === cropMarket.id || item.cropId === "general"),
    diseaseHints: knowledge.diseases.slice(0, 6)
  };

  const prompt = `
You are KisaanVaani, a Hindi/Hinglish natural farming consultant.
Answer only from the provided context. Recommend organic and zero-chemical practices only.
Always mention confidence. If unsure, recommend KVK/local agriculture officer verification.
Keep voice_response short and farmer-friendly.
User language: ${payload.language || "hinglish"}
Farmer query: ${payload.query || ""}
Context JSON: ${JSON.stringify(context)}
Safety note: ${safetyNote(payload.language)}
Return strict JSON matching the schema.`;

  try {
    const result = await callGemini({
      parts: [{ text: prompt }],
      schema: ADVISOR_SCHEMA,
      temperature: 0.25
    });
    return sendJson(res, 200, {
      source: "Gemini + local RAG context",
      modelBacked: true,
      result
    });
  } catch (error) {
    return sendJson(res, error.code === "MISSING_GEMINI_API_KEY" ? 200 : error.statusCode || 500, {
      source: "Local fallback",
      modelBacked: false,
      warning: error.message,
      result: fallbackAdvisor(payload, knowledge)
    });
  }
};
