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
  const language = payload.language || "hinglish";
  const responses = {
    en: {
      voice_response: `For ${district.name}, the ${cropMarket.name} market signal is ${trend.signal}. Price is about ₹${priceInfo.latest.modal}/${cropMarket.unit}. For natural farming, follow neem, jeevamrit, crop rotation, and KVK confirmation.`,
      remedy_steps: [
        "Keep crop and symptoms clear; upload a photo in the disease module if available.",
        "Verify the mandi rate with the local mandi, eNAM, or Agmarknet.",
        "Postpone spray when rain chance is high."
      ],
      weather_alert: "Weather details need Open-Meteo fetch."
    },
    hi: {
      voice_response: `${district.name} के लिए ${cropMarket.name} का मंडी signal ${trend.signal} है। भाव लगभग ₹${priceInfo.latest.modal}/${cropMarket.unit} है। प्राकृतिक खेती के लिए नीम, जीवामृत, crop rotation और KVK confirmation follow करें।`,
      remedy_steps: [
        "फसल और लक्षण साफ रखें; photo हो तो disease module में upload करें।",
        "मंडी भाव local mandi/eNAM/Agmarknet से verify करें।",
        "बारिश की संभावना ज्यादा हो तो spray postpone करें।"
      ],
      weather_alert: "मौसम details के लिए Open-Meteo fetch चाहिए।"
    },
    hinglish: {
      voice_response: `${district.name} ke liye ${cropMarket.name} ka mandi signal ${trend.signal} hai. Bhav ₹${priceInfo.latest.modal}/${cropMarket.unit} hai. Natural farming ke liye neem, jeevamrit, crop rotation aur KVK confirmation follow karein.`,
      remedy_steps: [
        "Crop aur symptom clear rakhein; photo ho to disease module mein upload karein.",
        "Mandi rate ko local mandi/eNAM/Agmarknet se verify karein.",
        "Rain chance high ho to spray postpone karein."
      ],
      weather_alert: "Weather details need Open-Meteo fetch."
    }
  };
  const response = responses[language] || responses.hinglish;

  return {
    voice_response: response.voice_response,
    remedy_steps: response.remedy_steps,
    confidence: 0.62,
    market_signal: trend.signal,
    weather_alert: response.weather_alert,
    source_notes: ["Seeded mandi dataset", "Local natural farming JSONL"],
    safety_note: safetyNote(language)
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
