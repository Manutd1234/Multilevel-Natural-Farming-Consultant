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

  // Bulletproof: with neither a photo nor symptom text there is nothing to analyse.
  if (!payload.image?.data && !String(payload.description || "").trim()) {
    const lang = payload.language || "hinglish";
    const ask = {
      en: "Please upload a clear crop/leaf photo or describe the symptoms so I can help.",
      hi: "कृपया फसल/पत्ती की साफ फोटो डालें या लक्षण बताएं ताकि मैं मदद कर सकूँ।",
      hinglish: "Kripya crop/leaf ki clear photo daalein ya symptoms likhein taaki main madad kar saku."
    };
    return sendJson(res, 200, {
      source: "input required",
      modelBacked: false,
      result: {
        possible_issue: (NEUTRAL_BACKFILL[lang] || NEUTRAL_BACKFILL.hinglish).issue,
        confidence: 0,
        visual_signs: [(NEUTRAL_BACKFILL[lang] || NEUTRAL_BACKFILL.hinglish).sign],
        organic_treatment: [(NEUTRAL_BACKFILL[lang] || NEUTRAL_BACKFILL.hinglish).treat],
        prevention: [],
        escalation: ESCALATION_COPY[lang] || ESCALATION_COPY.hinglish,
        voice_response: ask[lang] || ask.hinglish,
        safety_note: safetyNote(lang)
      }
    });
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
You are Farming Consultant Disease Triage — an expert agronomist analysing a crop photo and/or symptom text for an Indian smallholder farmer.
${langInstruction}
Write EVERY field of the JSON in that one language. Do not mix languages. Speak directly TO the farmer ("your crop", "you should") in simple, practical, reassuring words — no jargon.

Analyse the ACTUAL image and symptoms. From what you genuinely see, determine:
- the crop (if the image shows a crop different from the stated one, analyse the crop you actually see and say so),
- whether the plant looks healthy or shows a specific disease / pest / nutrient deficiency / stress,
- the specific visible problem, where it appears (leaf, stem, cob/fruit, whole plant) and how widespread it looks.

Base everything strictly on THIS image/symptoms. Do NOT copy the reference knowledge if it does not match what you see. If the plant looks healthy, say so clearly and give monitoring + good-practice tips.

CONFIDENCE — calibrate carefully from the actual IMAGE evidence; do NOT default to 0.9. Give a specific number:
- 0.90-0.97: textbook-clear sharp close-up, unmistakable signs (or an obviously healthy close-up).
- 0.70-0.89: likely correct but some ambiguity (partial view, overlapping possible causes).
- 0.50-0.69: plausible but uncertain — the signs could have several causes.
- 0.30-0.49: low — image is distant, blurry, dark, or the signs are non-specific.
- below 0.30: cannot tell, wrong crop, or unusable image.
Lower the number when the photo is far away, blurry, low-light, or shows only part of the plant. Confidence = how SURE your identification is, not crop quality. Use a precise value (e.g. 0.78), not a round habit.

Field rules:
- possible_issue: a SHORT label, max ~8 words (e.g. "Maize ear rot / mould", "Wheat leaf rust", "Crop looks healthy").
- voice_response: 3-5 sentences written TO the farmer. Explain plainly what you SEE in their crop, what it likely means for the plant/yield, and the single most important thing to do now. Specific and encouraging.
- visual_signs: 3-4 specific things visible in THIS image (colour, shape, location, spread).
- organic_treatment: 3-4 concrete organic steps the farmer can do (with simple how/when), zero-chemical only.
- prevention: 2-3 practical prevention tips. escalation: 2-3 clear "go to your KVK / agriculture officer if…" conditions.
- ORGANIC / zero-chemical only. Never name synthetic chemical pesticides, unsafe mixtures, antibiotics, or exact toxic doses.
- If confidence < 0.65, tell the farmer in voice_response to confirm with KVK / local agriculture officer.

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
