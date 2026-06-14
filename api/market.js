const { sendJson, loadKnowledge, findDistrict, findCropMarket, getLatestPrice, calcTrend } = require("../lib/shared");

function buildMarketAdvice(knowledge, districtId, cropId) {
  const district = findDistrict(knowledge, districtId);
  const cropMarket = findCropMarket(knowledge, cropId);
  const priceInfo = getLatestPrice(cropMarket, district.id);
  const trend = calcTrend(priceInfo);
  const storageRisk = cropMarket.storageRisk || "medium";
  const signal = storageRisk === "high" && trend.signal === "hold" ? "wait" : trend.signal;

  return {
    crop: cropMarket.name,
    district: district.name,
    mandi: priceInfo.market.name,
    unit: cropMarket.unit,
    latestPrice: priceInfo.latest.modal,
    previousPrice: priceInfo.previous.modal,
    trend,
    signal,
    storageRisk,
    history: priceInfo.market.history,
    voiceResponse: `${cropMarket.name} ka ${priceInfo.market.name} mandi bhav lagbhag ₹${priceInfo.latest.modal}/${cropMarket.unit} hai. Trend ${trend.label} hai. Signal: ${signal}. Bechne se pehle mandi mein rate confirm karein.`
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET /api/market" });
  const knowledge = loadKnowledge();
  const url = new URL(req.url, "http://localhost");
  return sendJson(res, 200, {
    source: "Seeded mandi fallback dataset",
    generatedAt: new Date().toISOString(),
    summary: buildMarketAdvice(knowledge, url.searchParams.get("district") || "hisar", url.searchParams.get("crop") || "onion")
  });
};
