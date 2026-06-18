const { sendJson, readBody, loadKnowledge, callGemini, safetyNote } = require("../lib/shared");

const DISEASE_SCHEMA = {
  type: "object",
  properties: {
    possible_issue: { type: "string" },
    confidence: { type: "number" },
    visual_signs: { type: "array", items: { type: "string" } },
    organic_treatment: { type: "array", items: { type: "string" } },
    prevention: { type: "array", items: { type: "string" } },
    escalation: { type: "array", items: { type: "string" } },
    voice_response: { type: "string" },
    safety_note: { type: "string" }
  },
  required: ["possible_issue", "confidence", "organic_treatment", "voice_response", "safety_note"]
};

function localDiseaseFallback(payload, knowledge) {
  const text = `${payload.description || ""}`.toLowerCase();
  const match = knowledge.diseases.find((item) =>
    item.symptoms.some((symptom) => text.includes(symptom.toLowerCase().split(" ")[0]))
  ) || knowledge.diseases[0];
  const language = payload.language || "hinglish";
  const voiceResponses = {
    en: `There may be ${match.name}, but confidence is low. Follow organic steps and confirm with KVK.`,
    hi: `${match.name} का संदेह है, लेकिन confidence low है। जैविक steps follow करें और KVK से confirm करें।`,
    hinglish: `${match.name} ka doubt hai, par confidence low hai. Organic steps follow karein aur KVK se confirm karein.`
  };
  const escalation = {
    en: [
      "Issue spreads quickly across rows",
      "Plant wilts, rots, or dies",
      "Farmer cannot identify pest/disease from leaf top and underside"
    ],
    hi: [
      "समस्या rows में जल्दी फैलती है",
      "पौधा मुरझाता, सड़ता या मरता है",
      "पत्ती के ऊपर और नीचे देखकर pest/disease identify नहीं हो रहा"
    ],
    hinglish: [
      "Issue rows mein jaldi spread ho",
      "Plant wilt, rot, ya die ho",
      "Leaf ke top aur underside se pest/disease identify na ho"
    ]
  };

  return {
    possible_issue: match.name,
    confidence: 0.48,
    visual_signs: match.symptoms,
    organic_treatment: match.organicTreatment,
    prevention: match.prevention,
    escalation: escalation[language] || escalation.hinglish,
    voice_response: voiceResponses[language] || voiceResponses.hinglish,
    safety_note: safetyNote(language)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST /api/disease" });
  const payload = await readBody(req);
  if (payload.image?.data) {
    const approxBytes = Math.ceil(payload.image.data.length * 0.75);
    if (approxBytes > 5 * 1024 * 1024) return sendJson(res, 400, { error: "Image exceeds 5 MB limit" });
  }

  let knowledge;
  try {
    knowledge = loadKnowledge();
  } catch (kbError) {
    console.error("knowledge_base load failed:", kbError.message);
    knowledge = {
      diseases: [{ id: "unknown", name: "Unknown condition", symptoms: [], organicTreatment: ["Consult your local KVK or agriculture officer for diagnosis."], prevention: [] }],
      zbnf: []
    };
  }

  const langInstruction = payload.language === "en"
    ? "Respond ONLY in English."
    : payload.language === "hi"
      ? "Respond ONLY in Hindi using Devanagari script."
      : "Respond ONLY in Hinglish (Hindi written in Roman script, mixed with simple English).";

  const prompt = `
You are Farming Consultant Disease Triage.
${langInstruction}
Triage crop disease/pest risk from image and/or symptoms.
This is not final diagnosis. Recommend organic remedies only.
Never recommend synthetic chemical pesticides, unsafe mixtures, antibiotics, or exact toxic concentrations.
If confidence < 0.65, tell farmer to verify with KVK/local agriculture officer.
Language: ${payload.language || "hinglish"}
Crop: ${payload.crop || "unknown"}
District: ${payload.district || "unknown"}
Symptoms: ${payload.description || "No text symptoms"}
Organic disease knowledge JSONL: ${JSON.stringify(knowledge.diseases)}
ZBNF practices: ${JSON.stringify(knowledge.zbnf)}
Return strict JSON matching schema.`;

  const parts = [];
  if (payload.image?.data && payload.image?.mimeType) {
    parts.push({
      inline_data: {
        mime_type: payload.image.mimeType,
        data: payload.image.data
      }
    });
  }
  parts.push({ text: prompt });

  try {
    const result = await callGemini({ parts, schema: DISEASE_SCHEMA, temperature: 0.15 });
    return sendJson(res, 200, {
      source: "Gemini image/text triage + organic KB",
      modelBacked: true,
      result
    });
  } catch (error) {
    return sendJson(res, 200, {
      source: "Local organic KB fallback",
      modelBacked: false,
      warning: error.message,
      result: localDiseaseFallback(payload, knowledge)
    });
  }
};
