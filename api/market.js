const { sendJson, loadKnowledge } = require("../lib/shared");
const { resolveMarketSummary } = require("../lib/market");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET /api/market" });

  let knowledge;
  try {
    knowledge = loadKnowledge();
  } catch (kbError) {
    console.error("knowledge_base load failed:", kbError.message);
    knowledge = {
      districts: [{ id: "hisar", name: "Hisar", state: "Haryana", latitude: 29.1492, longitude: 75.7217, nearestMandi: "Hisar" }],
      market: {
        crops: [{
          id: "onion", name: "Onion / Pyaaz", unit: "quintal", storageRisk: "high",
          markets: [{ districtId: "hisar", name: "Hisar", history: [
            { date: "2026-06-13", modal: 1880 }, { date: "2026-06-14", modal: 1910 }
          ]}]
        }]
      }
    };
  }

  const url = new URL(req.url, "http://localhost");
  const district = url.searchParams.get("district") || "hisar";
  const crop = url.searchParams.get("crop") || "onion";
  const language = url.searchParams.get("language") || "hinglish";

  const summary = await resolveMarketSummary(knowledge, district, crop, language);
  return sendJson(res, 200, {
    source: summary.source,
    live: Boolean(summary.live),
    warning: summary.warning,
    generatedAt: new Date().toISOString(),
    summary
  });
};
