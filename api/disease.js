const { sendJson, readBody, loadKnowledge, callLLM, safetyNote, coerceList, coerceConfidence } = require("../lib/shared");
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

// Neutral, language-appropriate text used ONLY if the model omits a field — never
// a specific KB disease, so an image-mismatched result is never fabricated.
const NEUTRAL_BACKFILL = {
  en: {
    issue: "Unclear from the image — please verify locally",
    sign: "Could not read clear signs from the photo — add a close-up or describe the symptoms.",
    treat: "Remove badly affected leaves, improve airflow, and use locally advised organic inputs."
  },
  hi: {
    issue: "तस्वीर से स्पष्ट नहीं — कृपया स्थानीय स्तर पर पुष्टि करें",
    sign: "फोटो से स्पष्ट लक्षण नहीं मिले — पास से फोटो लें या लक्षण लिखें।",
    treat: "अधिक प्रभावित पत्तियाँ हटाएँ, हवादार रखें, और स्थानीय सलाह अनुसार जैविक इनपुट उपयोग करें।"
  },
  hinglish: {
    issue: "Image se clear nahi — local level par confirm karein",
    sign: "Photo se clear signs nahi mile — close-up photo lein ya symptoms likhein.",
    treat: "Zyada prabhavit patte hatayein, airflow improve karein, aur local advice ke organic input use karein."
  }
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

// Normalize whatever the model returns into the strict UI shape. The model can
// omit/rename a field or return a string where an array is expected. We coerce
// types and backfill ONLY with neutral, language-appropriate text — never a
// specific KB disease (that caused identical, image-mismatched results). The
// model's own image analysis is always the source of truth. Exported for tests.
function normalizeDiseaseResult(raw, language = "hinglish") {
  raw = raw && typeof raw === "object" ? raw : {};
  const nb = NEUTRAL_BACKFILL[language] || NEUTRAL_BACKFILL.hinglish;

  const result = {
    possible_issue: String(raw.possible_issue || raw.disease || raw.issue || nb.issue).trim() || nb.issue,
    confidence: coerceConfidence(raw.confidence, 0.5),
    visual_signs: coerceList(raw.visual_signs, [nb.sign]),
    organic_treatment: coerceList(raw.organic_treatment, [nb.treat]),
    prevention: coerceList(raw.prevention, []),
    escalation: coerceList(raw.escalation, ESCALATION_COPY[language] || ESCALATION_COPY.hinglish),
    voice_response: String(raw.voice_response || "").trim(),
    safety_note: String(raw.safety_note || safetyNote(language))
  };

  // Clamp confidence into [0,1] defensively.
  if (!(result.confidence >= 0)) result.confidence = 0.5;
  if (result.confidence > 1) result.confidence = 1;

  // If the model gave structured fields but no spoken line, synthesize one.
  if (!result.voice_response) {
    const firstStep = result.organic_treatment[0] || "Follow organic steps and confirm with your local KVK.";
    result.voice_response = `Possible issue: ${result.possible_issue} (confidence ${Math.round(result.confidence * 100)}%). ${firstStep}`;
  }
  return result;
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
You are Farming Consultant Disease Triage — an expert agronomist analysing a crop photo and/or symptom text.
${langInstruction}
Write EVERY field of the JSON in that one language. Do not mix languages.

Analyse the ACTUAL image and symptoms. From what you genuinely see, determine:
- the crop (if the image clearly shows a crop different from the stated one, analyse the crop you actually see and say so in possible_issue),
- whether the plant looks healthy or shows a specific disease / pest / nutrient deficiency / stress,
- the specific visible problem and where it appears (leaf, stem, fruit, whole plant).

Base possible_issue, visual_signs, organic_treatment, prevention and escalation strictly on THIS image/symptoms. Do NOT copy the reference knowledge below if it does not match what you see. If the plant looks healthy, set possible_issue to a clear "healthy / no clear disease" statement and give monitoring + good-practice tips.

Rules:
- possible_issue: a SHORT label, max ~8 words (e.g. "Wheat leaf rust", "Late blight", "Crop looks healthy").
- confidence: ALWAYS a number between 0 and 1 = how CERTAIN you are of your identification, NOT crop quality. A clearly diseased crop you can identify well = HIGH confidence (≈0.85). A clearly healthy crop = HIGH confidence. Use LOW confidence (≈0.3) only when the image is blurry, ambiguous, or you cannot tell. Never omit it.
- visual_signs, organic_treatment, prevention, escalation: 2-4 specific items each, grounded in the image — never leave empty.
- ORGANIC / zero-chemical remedies only. Never name synthetic chemical pesticides, unsafe mixtures, antibiotics, or exact toxic doses.
- If confidence < 0.65, tell the farmer to verify with KVK / local agriculture officer.

Stated crop: ${payload.crop || "unknown"}
District: ${payload.district || "unknown"}
Symptoms (text): ${payload.description || "none provided — rely on the image"}
Reference organic knowledge (BACKGROUND ONLY — for treatment ideas, do NOT copy verbatim): ${JSON.stringify(retrievedDiseases.map((item) => ({ name: item.raw.name, symptoms: item.raw.symptoms, organicTreatment: item.raw.organicTreatment })))}
ZBNF practices (background): ${JSON.stringify(retrievedZbnf.map((item) => item.raw.name))}
Return strict JSON: { possible_issue, confidence, visual_signs[], organic_treatment[], prevention[], escalation[], voice_response, safety_note }.`;

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
    const { result: raw, provider } = await callLLM({ parts, schema: DISEASE_SCHEMA, temperature: 0.15 });
    const result = normalizeDiseaseResult(raw, payload.language || "hinglish");
    return sendJson(res, 200, {
      source: `${provider} image/text triage + organic KB`,
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

// Exported for tests (deterministic pipeline checks).
module.exports.normalizeDiseaseResult = normalizeDiseaseResult;
