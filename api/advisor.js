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

const CROP_ALIASES = [
  { id: "onion", name: "Onion / Pyaaz", terms: ["onion", "onions", "pyaaz", "pyaz", "प्याज"] },
  { id: "potato", name: "Potato / Aloo", terms: ["potato", "potatoes", "aloo", "आलू"] },
  { id: "bajra", name: "Bajra / Pearl Millet", terms: ["bajra", "pearl millet", "millet", "बाजरा"] },
  { id: "moong", name: "Moong / Green Gram", terms: ["moong", "mung", "green gram", "मूंग"] },
  { id: "mustard", name: "Mustard / Sarson", terms: ["mustard", "sarson", "सरसों"] },
  { id: "wheat", name: "Wheat / Gehun", terms: ["wheat", "gehun", "गेहूं", "गेहुँ"] },
  { id: "rice", name: "Rice / Paddy", terms: ["rice", "paddy", "धान", "चावल"] },
  { id: "tomato", name: "Tomato / Tamatar", terms: ["tomato", "tomatoes", "tamatar", "टमाटर"] },
  { id: "cotton", name: "Cotton / Kapas", terms: ["cotton", "kapas", "कपास"] }
];

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function detectIntent(query) {
  const text = normalizeText(query);
  if (/(disease|pest|spot|spots|yellow|leaf|leaves|wilting|blight|fungal|aphid|insect|कीड़ा|रोग|पत्ता|पत्ते|पीले|धब्बे)/.test(text)) return "disease";
  if (/(rain|weather|barish|spray|neem|wind|storm|मौसम|बारिश|स्प्रे|नीम)/.test(text)) return "weather";
  if (/(finance|profit|loss|cost|loan|budget|income|expense|margin|लागत|मुनाफा|ऋण|कर्ज)/.test(text)) return "finance";
  if (/(rotate|rotation|next crop|crop after|sow|sowing|seed|variety|plant|बुवाई|बीज|फसल चक्र)/.test(text)) return "rotation";
  if (/(sell|selling|price|mandi|market|rate|bhav|hold|बेचना|बेच|भाव|मंडी|रेट|कीमत)/.test(text)) return "market";
  return "general";
}

function cropAliasFromQuery(query) {
  const text = normalizeText(query);
  return CROP_ALIASES.find((crop) => crop.terms.some((term) => text.includes(term)));
}

function resolveCropForQuery(payload, knowledge) {
  const selectedCrop = findCropMarket(knowledge, payload.cropId);
  const queryCrop = cropAliasFromQuery(payload.query);
  if (!queryCrop) {
    return {
      cropMarket: selectedCrop,
      requestedCropId: selectedCrop.id,
      requestedCropName: selectedCrop.name,
      hasMarketData: true,
      source: "selected"
    };
  }

  const cropMarket = knowledge.market.crops.find((crop) => crop.id === queryCrop.id);
  return {
    cropMarket: cropMarket || selectedCrop,
    requestedCropId: queryCrop.id,
    requestedCropName: queryCrop.name,
    hasMarketData: Boolean(cropMarket),
    source: "query"
  };
}

function calendarFor(knowledge, cropId) {
  return knowledge.calendar.find((item) => item.cropId === cropId) ||
    knowledge.calendar.find((item) => item.cropId === "general") ||
    {};
}

function diseaseHintForQuery(query, knowledge) {
  const text = normalizeText(query);
  return knowledge.diseases.find((item) =>
    item.symptoms.some((symptom) => text.includes(symptom.toLowerCase().split(" ")[0]))
  ) || knowledge.diseases[0];
}

function localizedWeatherAlert(summary, language) {
  if (!summary?.rainProbability && summary?.rainProbability !== 0) {
    const copy = {
      en: "Weather card is unavailable; refresh signals before spray or sowing decisions.",
      hi: "Weather card उपलब्ध नहीं है; spray या बुवाई से पहले signals refresh करें।",
      hinglish: "Weather card unavailable hai; spray ya sowing decision se pehle signals refresh karein."
    };
    return copy[language] || copy.hinglish;
  }

  const copy = {
    en: `${summary.rainProbability}% rain chance. ${summary.sprayWindow || ""}`.trim(),
    hi: `${summary.rainProbability}% बारिश की संभावना। ${summary.sprayWindow || ""}`.trim(),
    hinglish: `${summary.rainProbability}% rain chance. ${summary.sprayWindow || ""}`.trim()
  };
  return copy[language] || copy.hinglish;
}

function marketDecision(trend, storageRisk, language) {
  if (language === "en") {
    if (trend.signal === "sell") return "Price trend is falling, so consider selling a portion now after confirming today's mandi rate.";
    if (trend.signal === "hold" && storageRisk !== "high") return "Trend is rising; hold only if storage is safe and cash need is low.";
    return "Wait or sell only a small portion until local price and storage risk are clear.";
  }
  if (language === "hi") {
    if (trend.signal === "sell") return "भाव गिर रहा है, इसलिए आज का mandi rate confirm करके कुछ हिस्सा बेचने पर विचार करें।";
    if (trend.signal === "hold" && storageRisk !== "high") return "Trend rising है; storage safe हो और cash need कम हो तभी hold करें।";
    return "Local price और storage risk clear होने तक wait करें या थोड़ा हिस्सा ही बेचें।";
  }
  if (trend.signal === "sell") return "Bhav gir raha hai, isliye aaj ka mandi rate confirm karke kuch hissa bechne par soch sakte hain.";
  if (trend.signal === "hold" && storageRisk !== "high") return "Trend rising hai; storage safe ho aur cash need low ho tabhi hold karein.";
  return "Local price aur storage risk clear hone tak wait karein ya sirf small portion bechein.";
}

function fallbackAdvisor(payload, knowledge) {
  const district = findDistrict(knowledge, payload.districtId);
  const cropResolution = resolveCropForQuery(payload, knowledge);
  const cropMarket = cropResolution.cropMarket;
  const priceInfo = getLatestPrice(cropMarket, district.id);
  const trend = calcTrend(priceInfo);
  const language = payload.language || "hinglish";
  const intent = detectIntent(payload.query);
  const calendar = calendarFor(knowledge, cropResolution.requestedCropId);
  const diseaseHint = diseaseHintForQuery(payload.query, knowledge);
  const weatherAlert = localizedWeatherAlert(payload.weatherSummary, language);
  const decision = marketDecision(trend, cropMarket.storageRisk, language);
  const cropName = cropResolution.requestedCropName;
  const hasMarketData = cropResolution.hasMarketData;
  const priceLine = hasMarketData
    ? `₹${priceInfo.latest.modal}/${cropMarket.unit}, ${trend.label} ${trend.percent}%`
    : null;

  let response;
  if (!hasMarketData && (intent === "market" || intent === "finance")) {
    response = {
      en: {
        voice_response: `I do not have fallback mandi data for ${cropName} yet, so I cannot give a sell/hold call. Check today's local mandi or eNAM rate before selling.`,
        remedy_steps: [
          `Ask the local mandi for today's ${cropName} modal price and arrival volume.`,
          "Compare price with transport, labour, and storage cost.",
          "Sell in parts if price is uncertain; do not rely on this prototype alone."
        ]
      },
      hi: {
        voice_response: `${cropName} के लिए fallback mandi data अभी नहीं है, इसलिए sell/hold call नहीं दे सकता। बेचने से पहले local mandi या eNAM rate check करें।`,
        remedy_steps: [
          `आज का ${cropName} modal price और arrival local mandi से पूछें।`,
          "Transport, labour और storage cost के साथ price compare करें।",
          "Price uncertain हो तो हिस्सों में बेचें; prototype पर अकेले भरोसा न करें।"
        ]
      },
      hinglish: {
        voice_response: `${cropName} ke liye fallback mandi data abhi nahi hai, isliye sell/hold call nahi de sakta. Bechne se pehle local mandi ya eNAM rate check karein.`,
        remedy_steps: [
          `Aaj ka ${cropName} modal price aur arrival local mandi se poochhein.`,
          "Transport, labour aur storage cost ke saath price compare karein.",
          "Price uncertain ho to parts mein bechein; prototype par akela rely na karein."
        ]
      }
    }[language] || {};
  } else if (intent === "weather") {
    response = {
      en: {
        voice_response: `${weatherAlert} For ${cropName}, avoid neem or bio-spray before rain and use a dry morning or late afternoon window.`,
        remedy_steps: [
          "Refresh the weather card before spraying or sowing.",
          "Avoid foliar spray when rain chance is above 40% or wind is high.",
          "Use drainage and mulch to reduce stress after rain."
        ]
      },
      hi: {
        voice_response: `${weatherAlert} ${cropName} के लिए बारिश से पहले neem या bio-spray न करें; dry morning या late afternoon window चुनें।`,
        remedy_steps: [
          "Spray या बुवाई से पहले weather card refresh करें।",
          "Rain chance 40% से ऊपर या wind high हो तो foliar spray avoid करें।",
          "बारिश के बाद stress कम करने के लिए drainage और mulch रखें।"
        ]
      },
      hinglish: {
        voice_response: `${weatherAlert} ${cropName} ke liye rain se pehle neem ya bio-spray avoid karein; dry morning ya late afternoon window choose karein.`,
        remedy_steps: [
          "Spray ya sowing se pehle weather card refresh karein.",
          "Rain chance 40% se upar ya wind high ho to foliar spray avoid karein.",
          "Rain ke baad stress kam karne ke liye drainage aur mulch rakhein."
        ]
      }
    }[language] || {};
  } else if (intent === "disease") {
    response = {
      en: {
        voice_response: `This sounds like ${diseaseHint.name}, but confidence is low without a photo. Use the disease module and confirm with KVK if it spreads.`,
        remedy_steps: [
          "Upload a clear photo of leaf top and underside in the disease module.",
          ...(diseaseHint.organicTreatment || []).slice(0, 3),
          "Avoid synthetic chemical pesticide recommendations in this prototype."
        ]
      },
      hi: {
        voice_response: `${diseaseHint.name} जैसा लग रहा है, पर photo के बिना confidence low है। Disease module में photo डालें और फैलने पर KVK से confirm करें।`,
        remedy_steps: [
          "Leaf top और underside की साफ photo disease module में upload करें।",
          ...(diseaseHint.organicTreatment || []).slice(0, 3),
          "यह prototype synthetic chemical pesticide recommend नहीं करता।"
        ]
      },
      hinglish: {
        voice_response: `${diseaseHint.name} jaisa lag raha hai, par photo ke bina confidence low hai. Disease module mein photo daalein aur spread ho to KVK se confirm karein.`,
        remedy_steps: [
          "Leaf top aur underside ki clear photo disease module mein upload karein.",
          ...(diseaseHint.organicTreatment || []).slice(0, 3),
          "Yeh prototype synthetic chemical pesticide recommend nahi karta."
        ]
      }
    }[language] || {};
  } else if (intent === "finance") {
    response = {
      en: {
        voice_response: `${cropName} finance call should use current mandi price, expected yield, and storage cost. Fallback price signal is ${priceLine || "not available"}.`,
        remedy_steps: [
          "Write expected yield, input cost, labour, transport, and storage cost.",
          hasMarketData ? decision : "Get today's local mandi rate before any sale decision.",
          "Sell enough to cover urgent cash needs; avoid borrowing for uncertain storage."
        ]
      },
      hi: {
        voice_response: `${cropName} finance decision में current mandi price, expected yield और storage cost जोड़ें। Fallback price signal ${priceLine || "available नहीं"} है।`,
        remedy_steps: [
          "Expected yield, input cost, labour, transport और storage cost लिखें।",
          hasMarketData ? decision : "Sale decision से पहले आज का local mandi rate लें।",
          "Urgent cash need cover करने जितना बेचें; uncertain storage के लिए loan avoid करें।"
        ]
      },
      hinglish: {
        voice_response: `${cropName} finance decision mein current mandi price, expected yield aur storage cost add karein. Fallback price signal ${priceLine || "available nahi"} hai.`,
        remedy_steps: [
          "Expected yield, input cost, labour, transport aur storage cost likhein.",
          hasMarketData ? decision : "Sale decision se pehle aaj ka local mandi rate lein.",
          "Urgent cash need cover karne jitna bechein; uncertain storage ke liye loan avoid karein."
        ]
      }
    }[language] || {};
  } else if (intent === "rotation") {
    response = {
      en: {
        voice_response: `${cropName} planning: ${calendar.sowingWindow || "check local sowing window"}. Rotate crop families and include legumes where possible.`,
        remedy_steps: [
          calendar.marketNote || "Check local crop calendar before sowing.",
          "Avoid repeating the same crop family in the same plot.",
          "Use compost, seed quality checks, and local variety advice from KVK."
        ]
      },
      hi: {
        voice_response: `${cropName} planning: ${calendar.sowingWindow || "local sowing window check करें"}। Crop family rotate करें और possible हो तो legumes शामिल करें।`,
        remedy_steps: [
          calendar.marketNote || "बुवाई से पहले local crop calendar check करें।",
          "Same crop family को same plot में repeat न करें।",
          "Compost, seed quality check और KVK से local variety advice लें।"
        ]
      },
      hinglish: {
        voice_response: `${cropName} planning: ${calendar.sowingWindow || "local sowing window check karein"}. Crop family rotate karein aur possible ho to legumes include karein.`,
        remedy_steps: [
          calendar.marketNote || "Sowing se pehle local crop calendar check karein.",
          "Same crop family ko same plot mein repeat na karein.",
          "Compost, seed quality check aur KVK se local variety advice lein."
        ]
      }
    }[language] || {};
  } else if (intent === "market") {
    response = {
      en: {
        voice_response: `${cropName} in ${district.name}: fallback mandi price is ${priceLine}. Signal is ${trend.signal}. ${decision}`,
        remedy_steps: [
          "Confirm today's mandi rate and arrival volume before selling.",
          decision,
          cropMarket.storageRisk === "high" ? "Because storage risk is high, avoid holding the full crop without cold or safe storage." : "Hold only the quantity you can store safely."
        ]
      },
      hi: {
        voice_response: `${district.name} में ${cropName}: fallback mandi price ${priceLine} है। Signal ${trend.signal} है। ${decision}`,
        remedy_steps: [
          "बेचने से पहले आज का mandi rate और arrival volume confirm करें।",
          decision,
          cropMarket.storageRisk === "high" ? "Storage risk high है, इसलिए safe/cold storage के बिना पूरी फसल hold न करें।" : "सिर्फ उतनी quantity hold करें जिसे safely store कर सकते हैं।"
        ]
      },
      hinglish: {
        voice_response: `${district.name} mein ${cropName}: fallback mandi price ${priceLine} hai. Signal ${trend.signal} hai. ${decision}`,
        remedy_steps: [
          "Bechne se pehle aaj ka mandi rate aur arrival volume confirm karein.",
          decision,
          cropMarket.storageRisk === "high" ? "Storage risk high hai, isliye safe/cold storage ke bina full crop hold na karein." : "Sirf utni quantity hold karein jise safely store kar sakte hain."
        ]
      }
    }[language] || {};
  } else {
    response = {
      en: {
        voice_response: `For ${cropName} in ${district.name}, I can answer market, weather, disease, finance, or rotation questions. Current fallback price signal is ${priceLine || "not available"}.`,
        remedy_steps: [
          "Ask a specific question such as sell timing, rain risk, disease symptoms, or crop rotation.",
          hasMarketData ? decision : "Choose a supported crop or verify the local mandi price.",
          "Confirm high-risk decisions with local mandi, KVK, or agriculture officer."
        ]
      },
      hi: {
        voice_response: `${district.name} में ${cropName} के लिए market, weather, disease, finance या rotation सवाल पूछ सकते हैं। Current fallback price signal ${priceLine || "available नहीं"} है।`,
        remedy_steps: [
          "Sell timing, rain risk, disease symptoms या crop rotation जैसा specific सवाल पूछें।",
          hasMarketData ? decision : "Supported crop चुनें या local mandi price verify करें।",
          "High-risk decision local mandi, KVK या agriculture officer से confirm करें।"
        ]
      },
      hinglish: {
        voice_response: `${district.name} mein ${cropName} ke liye market, weather, disease, finance ya rotation sawal pooch sakte hain. Current fallback price signal ${priceLine || "available nahi"} hai.`,
        remedy_steps: [
          "Sell timing, rain risk, disease symptoms ya crop rotation jaisa specific sawal poochhein.",
          hasMarketData ? decision : "Supported crop choose karein ya local mandi price verify karein.",
          "High-risk decision local mandi, KVK ya agriculture officer se confirm karein."
        ]
      }
    }[language] || {};
  }

  return {
    voice_response: response.voice_response,
    remedy_steps: response.remedy_steps,
    confidence: hasMarketData ? 0.68 : 0.45,
    market_signal: intent === "market" || intent === "finance" ? trend.signal : "wait",
    weather_alert: weatherAlert,
    source_notes: [`Intent: ${intent}`, cropResolution.source === "query" ? "Crop detected from question" : "Crop from selector", "Local fallback knowledge"],
    safety_note: safetyNote(language)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST /api/advisor" });
  const payload = await readBody(req);
  const knowledge = loadKnowledge();

  const district = findDistrict(knowledge, payload.districtId);
  const intent = detectIntent(payload.query);
  const cropResolution = resolveCropForQuery(payload, knowledge);
  const cropMarket = cropResolution.cropMarket;
  const priceInfo = getLatestPrice(cropMarket, district.id);
  const trend = calcTrend(priceInfo);
  const context = {
    intent,
    selectedCropId: payload.cropId,
    requestedCrop: {
      id: cropResolution.requestedCropId,
      name: cropResolution.requestedCropName,
      hasMarketData: cropResolution.hasMarketData,
      source: cropResolution.source
    },
    district,
    cropMarket,
    priceInfo,
    trend,
    weatherSummary: payload.weatherSummary || null,
    marketSummary: payload.marketSummary || null,
    zbnf: knowledge.zbnf.slice(0, 5),
    cropCalendar: knowledge.calendar.filter((item) => item.cropId === cropMarket.id || item.cropId === "general"),
    diseaseHints: knowledge.diseases.slice(0, 6)
  };

  const prompt = `
You are KisaanVaani, a Hindi/Hinglish natural farming consultant.
Answer only from the provided context. Recommend organic and zero-chemical practices only.
Always mention confidence. If unsure, recommend KVK/local agriculture officer verification.
Keep voice_response short and farmer-friendly.
If the farmer query mentions a crop that differs from the selected crop, prioritize requestedCrop.
If requestedCrop.hasMarketData is false, do not invent mandi prices; say local mandi/eNAM verification is needed.
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
    return sendJson(res, 200, {
      source: "Local fallback",
      modelBacked: false,
      warning: error.message,
      result: fallbackAdvisor(payload, knowledge)
    });
  }
};
