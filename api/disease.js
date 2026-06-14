const fs = require("node:fs");
const path = require("node:path");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const MAX_IMAGE_CHARS = 6_800_000;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
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
      if (raw.length > MAX_IMAGE_CHARS + 500_000) {
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

function loadDiseaseKnowledge() {
  const filePath = path.join(process.cwd(), "data", "disease-knowledge.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function buildPrompt(payload, diseaseKnowledge) {
  const language = payload.language || "hinglish";
  const crop = payload.crop || "unknown crop";
  const district = payload.district || "unknown district";
  const description = payload.description || "No farmer description provided.";

  return `
You are Kheti Saathi Disease Triage, a careful natural-farming assistant for farmers in Haryana.

Return only valid JSON. Do not include markdown.

Selected language: ${language}
Crop: ${crop}
District: ${district}
Farmer description: ${description}

Use the image if provided. If the image is unclear, say confidence is low and ask for a clearer photo of both leaf top and underside.

Strict guardrails:
- This is triage, not a final diagnosis.
- Suggest only organic, biological, botanical, or field-practice remedies.
- Do not recommend synthetic chemical pesticides, antibiotics, unsafe mixtures, or exact toxic concentrations.
- If symptoms could be severe, spreading quickly, or uncertain, tell the farmer to verify with local agriculture officer/KVK.
- Keep advice short, voice-friendly, and practical.
- Use only the knowledge below plus visible image clues. If evidence is missing, say what is missing.

Organic knowledge base:
${JSON.stringify(diseaseKnowledge, null, 2)}

JSON schema:
{
  "possible_issue": "short likely issue name or unclear",
  "confidence": "low | medium | high",
  "visible_signs": ["sign 1", "sign 2"],
  "organic_remedies": ["step 1", "step 2", "step 3"],
  "prevention": ["practice 1", "practice 2"],
  "when_to_escalate": ["condition 1", "condition 2"],
  "spoken_summary": "one short farmer-friendly spoken answer",
  "safety_note": "local verification warning",
  "sources_used": ["Gemini image understanding", "local organic knowledge base"]
}`;
}

function normalizeGeminiResult(result, payload, diseaseKnowledge) {
  const fallbackSafety = diseaseKnowledge.safetyCopy[payload.language] || diseaseKnowledge.safetyCopy.hinglish;
  return {
    possible_issue: String(result?.possible_issue || "Unclear issue"),
    confidence: ["low", "medium", "high"].includes(result?.confidence) ? result.confidence : "low",
    visible_signs: Array.isArray(result?.visible_signs) ? result.visible_signs.slice(0, 5) : [],
    organic_remedies: Array.isArray(result?.organic_remedies) ? result.organic_remedies.slice(0, 5) : [],
    prevention: Array.isArray(result?.prevention) ? result.prevention.slice(0, 4) : [],
    when_to_escalate: Array.isArray(result?.when_to_escalate) ? result.when_to_escalate.slice(0, 4) : [
      "Symptoms spread quickly",
      "Plants wilt or die",
      "You are unsure after checking the leaf underside"
    ],
    spoken_summary: String(result?.spoken_summary || "Photo se issue clear nahi hai. Leaf top aur underside ki clearer photo bhejein, aur local agriculture officer se confirm karein."),
    safety_note: String(result?.safety_note || fallbackSafety),
    sources_used: Array.isArray(result?.sources_used) ? result.sources_used : ["Gemini image understanding", "local organic knowledge base"]
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Use POST /api/disease" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return sendJson(res, 503, {
      error: "Missing GEMINI_API_KEY",
      message: "Set GEMINI_API_KEY in Vercel project environment variables to enable Gemini disease triage."
    });
  }

  let payload;
  try {
    payload = await readBody(req);
  } catch (error) {
    return sendJson(res, 413, { error: error.message });
  }

  const diseaseKnowledge = loadDiseaseKnowledge();
  const parts = [];
  if (payload.image?.data && payload.image?.mimeType) {
    if (!String(payload.image.mimeType).startsWith("image/")) {
      return sendJson(res, 400, { error: "Image must be an image/* MIME type." });
    }
    if (payload.image.data.length > MAX_IMAGE_CHARS) {
      return sendJson(res, 413, { error: "Image is too large. Please upload a smaller photo." });
    }
    parts.push({
      inline_data: {
        mime_type: payload.image.mimeType,
        data: payload.image.data
      }
    });
  }
  parts.push({ text: buildPrompt(payload, diseaseKnowledge) });

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          responseFormat: {
            text: {
              mimeType: "application/json",
              schema: {
                type: "object",
                properties: {
                  possible_issue: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  visible_signs: { type: "array", items: { type: "string" } },
                  organic_remedies: { type: "array", items: { type: "string" } },
                  prevention: { type: "array", items: { type: "string" } },
                  when_to_escalate: { type: "array", items: { type: "string" } },
                  spoken_summary: { type: "string" },
                  safety_note: { type: "string" },
                  sources_used: { type: "array", items: { type: "string" } }
                },
                required: ["possible_issue", "confidence", "organic_remedies", "spoken_summary", "safety_note"]
              }
            }
          }
        }
      })
    });

    const json = await geminiResponse.json();
    if (!geminiResponse.ok) {
      return sendJson(res, geminiResponse.status, {
        error: "Gemini request failed",
        detail: json.error?.message || "Unknown Gemini API error"
      });
    }

    const text = extractText(json);
    const parsed = safeParseJson(text);
    if (!parsed) {
      return sendJson(res, 502, {
        error: "Gemini returned an unreadable response",
        raw: text.slice(0, 1000)
      });
    }

    return sendJson(res, 200, {
      result: normalizeGeminiResult(parsed, payload, diseaseKnowledge),
      model: GEMINI_MODEL,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Disease triage failed",
      detail: error.message
    });
  }
};
