const { sendJson, readBody, loadKnowledge, callGemini, safetyNote } = require("../lib/shared");
const { retrieve } = require("../lib/rag");

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

const ESCALATION_COPY = {
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

function localDiseaseFallback(payload, knowledge, retrievedDiseases) {
  // Prefer the top RAG-retrieved disease (BM25 over symptoms/treatment); fall
  // back to the legacy keyword match, then the first KB entry.
  const text = `${payload.description || ""}`.toLowerCase();
  const match = retrievedDiseases?.[0]?.raw
    || knowledge.diseases.find((item) =>
      item.symptoms.some((symptom) => text.includes(symptom.toLowerCase().split(" ")[0]))
    )
    || knowledge.diseases[0];
  const language = payload.language || "hinglish";
  const voiceResponses = {
    en: `There may be ${match.name}, but confidence is low. Follow organic steps and confirm with KVK.`,
    hi: `${match.name} का संदेह है, लेकिन confidence low है। जैविक steps follow करें और KVK से confirm करें।`,
    hinglish: `${match.name} ka doubt hai, par confidence low hai. Organic steps follow karein aur KVK se confirm karein.`
  };

  return {
    possible_issue: match.name,
    confidence: 0.48,
    visual_signs: match.symptoms,
    organic_treatment: match.organicTreatment,
    prevention: match.prevention,
    escalation: ESCALATION_COPY[language] || ESCALATION_COPY.hinglish,
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

  // Lightweight RAG: retrieve only the KB chunks relevant to the symptoms/crop
  // (BM25 + bilingual synonyms) and inject those instead of the whole KB.
  const retrievalQuery = `${payload.description || ""} ${payload.crop || ""}`.trim();
  const retrievedDiseases = retrieve(retrievalQuery, knowledge, { types: ["disease"], k: 4 });
  const retrievedZbnf = retrieve(retrievalQuery, knowledge, { types: ["zbnf"], k: 3 });
  const retrieval = [...retrievedDiseases, ...retrievedZbnf].map((item) => ({ type: item.type, title: item.title, score: item.score }));

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
Relevant organic disease knowledge (RAG-retrieved): ${JSON.stringify(retrievedDiseases.map((item) => item.raw))}
Relevant ZBNF practices (RAG-retrieved): ${JSON.stringify(retrievedZbnf.map((item) => item.raw))}
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
    const raw = await callGemini({ parts, schema: DISEASE_SCHEMA, temperature: 0.15 });

    // Gemini occasionally omits or renames fields; normalize against the schema
    // and backfill from the top RAG-retrieved disease so the UI is never blank.
    const language = payload.language || "hinglish";
    const topDisease = retrievedDiseases?.[0]?.raw || {};
    const arr = (value, fallback) => (Array.isArray(value) && value.length ? value : fallback);

    const result = {
      possible_issue: String(raw.possible_issue || raw.disease || raw.issue || topDisease.name || "Unconfirmed crop issue"),
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0.6,
      visual_signs: arr(raw.visual_signs, topDisease.symptoms || []),
      organic_treatment: arr(raw.organic_treatment, topDisease.organicTreatment || []),
      prevention: arr(raw.prevention, topDisease.prevention || []),
      escalation: arr(raw.escalation, ESCALATION_COPY[language] || ESCALATION_COPY.hinglish),
      voice_response: String(raw.voice_response || ""),
      safety_note: String(raw.safety_note || safetyNote(language))
    };

    if (!result.voice_response) throw new Error("Gemini returned empty voice_response");

    return sendJson(res, 200, {
      source: "Gemini image/text triage + organic KB",
      modelBacked: true,
      retrieval,
      result
    });
  } catch (error) {
    return sendJson(res, 200, {
      source: "Local organic KB fallback",
      modelBacked: false,
      warning: error.message,
      retrieval,
      result: localDiseaseFallback(payload, knowledge, retrievedDiseases)
    });
  }
};
