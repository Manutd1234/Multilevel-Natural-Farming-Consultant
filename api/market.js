const { sendJson, loadKnowledge, findDistrict, findCropMarket, getLatestPrice, calcTrend, fetchJsonWithTimeout } = require("../lib/shared");

const DATA_GOV_RESOURCE_ID = process.env.DATA_GOV_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";
// Public data.gov.in sample key works out of the box but is shared/rate-limited and
// caps results (~10 records). Set your own free DATA_GOV_API_KEY in Vercel for
// reliable, higher-limit live mandi data: https://data.gov.in/ (register → My Account → API key).
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY || "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";

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

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const POSITION_LABELS = {
  en: { above: "above the area average", below: "below the area average", near: "near the area average" },
  hi: { above: "क्षेत्र औसत से ऊपर", below: "क्षेत्र औसत से नीचे", near: "क्षेत्र औसत के आसपास" },
  hinglish: { above: "area average se upar", below: "area average se neeche", near: "area average ke aas-paas" }
};

function liveMarketVoice(language, cropName, mandiName, price, unit, min, max, positionLabel, signal) {
  const copy = {
    en: `${cropName} is about ₹${price}/${unit} at ${mandiName} today. Across nearby mandis it ranges ₹${min}–₹${max}. This rate is ${positionLabel}. Signal: ${signal}. Confirm the rate in your local mandi before selling.`,
    hi: `आज ${mandiName} में ${cropName} का भाव लगभग ₹${price}/${unit} है। आसपास की मंडियों में भाव ₹${min}–₹${max} के बीच है। यह rate ${positionLabel} है। Signal: ${signal}. बेचने से पहले स्थानीय मंडी में पुष्टि करें।`,
    hinglish: `Aaj ${mandiName} mein ${cropName} ka bhav lagbhag ₹${price}/${unit} hai. Aas-paas ki mandiyon mein bhav ₹${min}–₹${max} ke beech hai. Yeh rate ${positionLabel} hai. Signal: ${signal}. Bechne se pehle local mandi mein confirm karein.`
  };
  return copy[language] || copy.hinglish;
}

// data.gov.in "Current Daily Price" is a same-day snapshot across many mandis
// (no historical time-series). We turn that into a real, live view: one modal
// price per reporting mandi for the state, the requested district's own rate when
// it reports, and the live price spread for the chart.
function normalizeStateRecords(records) {
  return records
    .map((record) => ({
      district: String(record.district || "").trim(),
      market: String(record.market || record.mandi || "").trim(),
      modal: toNumber(record.modal_price || record.modalPrice || record.modal || record.price),
      date: parsePriceDate(record)
    }))
    .filter((record) => record.modal && record.modal > 0);
}

async function fetchLiveMarketAdvice(knowledge, districtId, cropId, language) {
  if (!DATA_GOV_API_KEY) throw new Error("DATA_GOV_API_KEY not configured; using seeded fallback dataset.");
  const district = findDistrict(knowledge, districtId);
  const cropMarket = findCropMarket(knowledge, cropId);
  const commodity = COMMODITY_MAP[cropMarket.id] || cropMarket.name.split("/")[0].trim();

  // Query state + commodity (district-level filters are frequently empty), then
  // resolve the right mandi client-side.
  const params = new URLSearchParams({
    "api-key": DATA_GOV_API_KEY,
    format: "json",
    limit: "100",
    "filters[state]": district.state,
    "filters[commodity]": commodity
  });
  const endpoint = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE_ID}?${params.toString()}`;
  const { response, data } = await fetchJsonWithTimeout(endpoint, {}, 12_000);
  if (!response.ok) throw new Error(data.message || data.error || `data.gov.in HTTP ${response.status}`);

  const all = normalizeStateRecords(Array.isArray(data.records) ? data.records : []);
  if (all.length < 2) throw new Error(`No live mandi records for ${commodity} in ${district.state}`);

  // One price per mandi; sorted ascending so the chart shows the real price spread.
  const byMarket = new Map();
  for (const record of all) if (!byMarket.has(record.market)) byMarket.set(record.market, record);
  const markets = [...byMarket.values()].sort((a, b) => a.modal - b.modal);

  const modals = markets.map((item) => item.modal);
  const min = modals[0];
  const max = modals[modals.length - 1];
  const mid = median(modals);

  // Prefer the requested district's own mandi; else its nearest mandi by name;
  // else fall back to the live area median so the headline is still real.
  const dName = district.name.toLowerCase();
  const nMandi = (district.nearestMandi || "").toLowerCase();
  const districtMatch =
    markets.find((item) => item.district.toLowerCase() === dName) ||
    (nMandi && markets.find((item) => item.market.toLowerCase().includes(nMandi))) ||
    null;

  const headlinePrice = districtMatch ? districtMatch.modal : mid;
  const headlineMandi = districtMatch ? districtMatch.market : `${district.state} area (${markets.length} mandis)`;

  const pct = Math.round(((headlinePrice - mid) / mid) * 100);
  let position;
  let baseSignal;
  if (pct >= 5) { position = "above"; baseSignal = "sell"; }
  else if (pct <= -5) { position = "below"; baseSignal = "hold"; }
  else { position = "near"; baseSignal = "wait"; }

  const storageRisk = cropMarket.storageRisk || "medium";
  const signal = storageRisk === "high" && baseSignal === "hold" ? "wait" : baseSignal;
  const positionLabel = (POSITION_LABELS[language] || POSITION_LABELS.hinglish)[position];

  return {
    crop: cropMarket.name,
    district: district.name,
    mandi: headlineMandi,
    unit: cropMarket.unit,
    latestPrice: headlinePrice,
    previousPrice: mid,
    trend: { label: positionLabel, percent: pct, signal },
    signal,
    storageRisk,
    priceRange: { min, max, median: mid, mandiCount: markets.length },
    history: markets.map((item) => ({ date: item.date, market: item.market, modal: item.modal })),
    voiceResponse: liveMarketVoice(language, cropMarket.name, headlineMandi, headlinePrice, cropMarket.unit, min, max, positionLabel, signal),
    source: districtMatch
      ? "data.gov.in Agmarknet live API"
      : `data.gov.in Agmarknet live API (${district.state} area — ${district.name} mandi not reporting today)`,
    live: true
  };
}

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
