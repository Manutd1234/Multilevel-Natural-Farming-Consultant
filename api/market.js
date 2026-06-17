const { sendJson, loadKnowledge, findDistrict, findCropMarket, getLatestPrice, calcTrend, fetchJsonWithTimeout } = require("../lib/shared");

const DATA_GOV_RESOURCE_ID = process.env.DATA_GOV_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY || "";

const COMMODITY_MAP = {
  onion: "Onion",
  potato: "Potato",
  bajra: "Bajra(Pearl Millet/Cumbu)",
  moong: "Green Gram (Moong)(Whole)",
  mustard: "Mustard",
  wheat: "Wheat",
  tomato: "Tomato"
};

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePriceDate(record) {
  const raw = record.arrival_date || record.price_date || record.date || "";
  const parts = String(raw).split(/[/-]/);
  if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  return raw || new Date().toISOString().slice(0, 10);
}

function marketVoice(language, cropName, mandiName, latestPrice, unit, trend, signal) {
  const copy = {
    en: `${cropName} is about ₹${latestPrice}/${unit} in ${mandiName} mandi. Trend is ${trend.label}. Signal: ${signal}. Confirm the rate in the local mandi before selling.`,
    hi: `${mandiName} मंडी में ${cropName} का भाव लगभग ₹${latestPrice}/${unit} है। Trend ${trend.label} है। Signal: ${signal}. बेचने से पहले स्थानीय मंडी में rate confirm करें।`,
    hinglish: `${cropName} ka ${mandiName} mandi bhav lagbhag ₹${latestPrice}/${unit} hai. Trend ${trend.label} hai. Signal: ${signal}. Bechne se pehle mandi mein rate confirm karein.`
  };
  return copy[language] || copy.hinglish;
}

function buildMarketSummary({ cropMarket, district, priceInfo, trend, language, source, live, warning }) {
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
    voiceResponse: marketVoice(language, cropMarket.name, priceInfo.market.name, priceInfo.latest.modal, cropMarket.unit, trend, signal),
    source,
    live,
    warning
  };
}

function buildFallbackMarketAdvice(knowledge, districtId, cropId, language, warning) {
  const district = findDistrict(knowledge, districtId);
  const cropMarket = findCropMarket(knowledge, cropId);
  const priceInfo = getLatestPrice(cropMarket, district.id);
  const trend = calcTrend(priceInfo);
  return buildMarketSummary({
    cropMarket,
    district,
    priceInfo,
    trend,
    language,
    source: "Seeded mandi fallback dataset",
    live: false,
    warning
  });
}

function normalizeLiveRecords(records, district, cropMarket) {
  const parsed = records
    .map((record) => ({
      date: parsePriceDate(record),
      modal: toNumber(record.modal_price || record.modalPrice || record.modal || record.price),
      market: record.market || record.mandi || district.nearestMandi || district.name
    }))
    .filter((record) => record.modal)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  if (!parsed.length) return null;
  const deduped = parsed.slice(-7);
  return {
    name: deduped[deduped.length - 1].market,
    history: deduped.map((item) => ({ date: item.date, modal: item.modal }))
  };
}

async function fetchLiveMarketAdvice(knowledge, districtId, cropId, language) {
  if (!DATA_GOV_API_KEY) throw new Error("DATA_GOV_API_KEY not configured; using seeded fallback dataset.");
  const district = findDistrict(knowledge, districtId);
  const cropMarket = findCropMarket(knowledge, cropId);
  const commodity = COMMODITY_MAP[cropMarket.id] || cropMarket.name.split("/")[0].trim();
  const params = new URLSearchParams({
    "api-key": DATA_GOV_API_KEY,
    format: "json",
    limit: "30",
    "filters[state]": district.state,
    "filters[district]": district.name,
    "filters[commodity]": commodity
  });
  const endpoint = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE_ID}?${params.toString()}`;
  const { response, data } = await fetchJsonWithTimeout(endpoint, {}, 10_000);
  if (!response.ok) throw new Error(data.message || data.error || `data.gov.in HTTP ${response.status}`);

  const records = Array.isArray(data.records) ? data.records : [];
  const market = normalizeLiveRecords(records, district, cropMarket);
  if (!market) throw new Error(`No live mandi records for ${commodity} in ${district.name}`);

  const liveCropMarket = {
    ...cropMarket,
    markets: [{ districtId: district.id, name: market.name, history: market.history }]
  };
  const priceInfo = getLatestPrice(liveCropMarket, district.id);
  const trend = calcTrend(priceInfo);
  return buildMarketSummary({
    cropMarket: liveCropMarket,
    district,
    priceInfo,
    trend,
    language,
    source: "data.gov.in Agmarknet live API",
    live: true
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET /api/market" });
  const knowledge = loadKnowledge();
  const url = new URL(req.url, "http://localhost");
  const district = url.searchParams.get("district") || "hisar";
  const crop = url.searchParams.get("crop") || "onion";
  const language = url.searchParams.get("language") || "hinglish";

  try {
    const summary = await fetchLiveMarketAdvice(knowledge, district, crop, language);
    return sendJson(res, 200, {
      source: summary.source,
      live: true,
      generatedAt: new Date().toISOString(),
      summary
    });
  } catch (error) {
    const summary = buildFallbackMarketAdvice(knowledge, district, crop, language, error.message);
    return sendJson(res, 200, {
      source: summary.source,
      live: false,
      warning: error.message,
      generatedAt: new Date().toISOString(),
      summary
    });
  }
};
