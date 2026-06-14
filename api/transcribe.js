const { sendJson, readBody } = require("../lib/shared");

const DEFAULT_HF_MODEL = "openai/whisper-small";

async function callHuggingFace(audioBuffer, mimeType) {
  const endpoint = process.env.WHISPER_ENDPOINT_URL ||
    `https://api-inference.huggingface.co/models/${process.env.WHISPER_MODEL || DEFAULT_HF_MODEL}`;
  const headers = { "Content-Type": mimeType || "audio/webm" };
  if (process.env.HF_TOKEN) headers.Authorization = `Bearer ${process.env.HF_TOKEN}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: audioBuffer
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Hugging Face Whisper request failed");
    error.statusCode = response.status;
    throw error;
  }
  return data.text || data.transcription || data[0]?.text || "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST /api/transcribe" });
  const payload = await readBody(req, 12_000_000);
  if (!payload.audio?.data) return sendJson(res, 400, { error: "Missing audio.data base64" });
  if (!process.env.HF_TOKEN && !process.env.WHISPER_ENDPOINT_URL) {
    return sendJson(res, 503, {
      error: "Missing Hugging Face configuration",
      message: "Set HF_TOKEN for the Hugging Face Inference API or WHISPER_ENDPOINT_URL for a hosted Whisper endpoint."
    });
  }

  try {
    const audioBuffer = Buffer.from(payload.audio.data, "base64");
    const text = await callHuggingFace(audioBuffer, payload.audio.mimeType);
    return sendJson(res, 200, {
      source: process.env.WHISPER_ENDPOINT_URL ? "Custom Whisper endpoint" : "Hugging Face Inference API",
      model: process.env.WHISPER_MODEL || DEFAULT_HF_MODEL,
      text
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: "Transcription failed", detail: error.message });
  }
};
