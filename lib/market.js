// Shared AgMarknet (data.gov.in) market pipeline.
//
// Used by BOTH Module 1 (/api/market signal card) and the advisor, so market
// prices and sell/hold analysis come from the same live government source.
// "Current Daily Price of Various Commodities from Various Markets (Mandi)".

const { findDistrict, findCropMarket, getLatestPrice, calcTrend, fetchJsonWithTimeout } = require("./shared");

const DATA_GOV_RESOURCE_ID = process.env.DATA_GOV_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";
// Public data.gov.in sample key works out of the box but is shared/rate-limited and
// caps results (~10 records). Set your own free DATA_GOV_API_KEY in Vercel for
// reliable, higher-limit live mandi data: https://data.gov.in/ (register → My Account → API key).
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY || "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";

// Map our crop ids to exact AgMarknet commodity names (required by the live query).
const COMMODITY_MAP = {
  onion: "Onion",
  potato: "Potato",
  tomato: "Tomato",
  wheat: "Wheat",
  bajra: "Bajra(Pearl Millet/Cumbu)",
  moong: "Green Gram (Moong)(Whole)",
  mustard: "Mustard",
  paddy: "Paddy(Dhan)(Common)",
  maize: "Maize",
  gram: "Bengal Gram(Gram)(Whole)",
  arhar: "Arhar (Tur/Red Gram)(Whole)",
  soybean: "Soyabean",
  groundnut: "Groundnut",
  jowar: "Jowar(Sorghum)",
  barley: "Barley (Jau)",
  cotton: "Cotton",
  sugarcane: "Sugarcane",
  guar: "Guar",
  sunflower: "Sunflower",
  garlic: "Garlic",
  ginger: "Ginger(Green)",
  greenchilli: "Green Chilli",
  cauliflower: "Cauliflower",
  cabbage: "Cabbage",
  brinjal: "Brinjal",
  okra: "Bhindi(Ladies Finger)",
  peas: "Green Peas",
  banana: "Banana"
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

function marketVoice(language, cropName, mandiName, latestPrice, unit, trend, signal) {
  const copy = {
    en: `${cropName} is about ₹${latestPrice}/${unit} in ${mandiName} mandi. Trend is ${trend.label}. Signal: ${signal}. Confirm the rate in the local mandi before selling.`,
    hi: `${mandiName} मंडी में ${cropName} का भाव लगभग ₹${latestPrice}/${unit} है। Trend ${trend.label} है। Signal: ${signal}. बेचने से पहले स्थानीय मंडी में rate confirm करें।`,
    hinglish: `${cropName} ka ${mandiName} mandi bhav lagbhag ₹${latestPrice}/${unit} hai. Trend ${trend.label} hai. Signal: ${signal}. Bechne se pehle mandi mein rate confirm karein.`
  };
  return copy[language] || copy.hinglish;
}

function liveMarketVoice(language, cropName, mandiName, price, unit, min, max, positionLabel, signal) {
  const copy = {
    en: `${cropName} is about ₹${price}/${unit} at ${mandiName} today. Across nearby mandis it ranges ₹${min}–₹${max}. This rate is ${positionLabel}. Signal: ${signal}. Confirm the rate in your local mandi before selling.`,
    hi: `आज ${mandiName} में ${cropName} का भाव लगभग ₹${price}/${unit} है। आसपास की मंडियों में भाव ₹${min}–₹${max} के बीच है। यह rate ${positionLabel} है। Signal: ${signal}. बेचने से पहले स्थानीय मंडी में पुष्टि करें।`,
    hinglish: `Aaj ${mandiName} mein ${cropName} ka bhav lagbhag ₹${price}/${unit} hai. Aas-paas ki mandiyon mein bhav ₹${min}–₹${max} ke beech hai. Yeh rate ${positionLabel} hai. Signal: ${signal}. Bechne se pehle local mandi mein confirm karein.`
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

// One AgMarknet query for a commodity, optionally filtered by state.
async function queryMandiRecords(commodity, state) {
  const params = new URLSearchParams({
    "api-key": DATA_GOV_API_KEY,
    format: "json",
    limit: "100",
    "filters[commodity]": commodity
  });
  if (state) params.set("filters[state]", state);
  const endpoint = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE_ID}?${params.toString()}`;
  const { response, data } = await fetchJsonWithTimeout(endpoint, {}, 12_000);
  if (!response.ok) throw new Error(data.message || data.error || `data.gov.in HTTP ${response.status}`);
  return normalizeStateRecords(Array.isArray(data.records) ? data.records : []);
}

async function fetchLiveMarketAdvice(knowledge, districtId, cropId, language) {
  if (!DATA_GOV_API_KEY) throw new Error("DATA_GOV_API_KEY not configured; using seeded fallback dataset.");
  const district = findDistrict(knowledge, districtId);
  const cropMarket = findCropMarket(knowledge, cropId);
  const commodity = COMMODITY_MAP[cropMarket.id] || cropMarket.name.split("/")[0].trim();

  // 1) Prefer the farmer's own state. 2) If the state isn't reporting this
  //    commodity today, broaden to nationwide reporting mandis so we still show
  //    a REAL live price (better than seeded). Only then fall back to seeded.
  let all = await queryMandiRecords(commodity, district.state);
  let scope = "state";
  if (all.length < 2) {
    const national = await queryMandiRecords(commodity, null);
    if (national.length >= 1) { all = national; scope = "national"; }
  }
  if (all.length < 1) throw new Error(`No live mandi records for ${commodity}`);

  // One price per mandi; sorted ascending so the chart shows the real price spread.
  const byMarket = new Map();
  for (const record of all) if (!byMarket.has(record.market)) byMarket.set(record.market, record);
  const markets = [...byMarket.values()].sort((a, b) => a.modal - b.modal);

  const modals = markets.map((item) => item.modal);
  const min = modals[0];
  const max = modals[modals.length - 1];
  const mid = median(modals);

  // District match only makes sense when we queried the farmer's own state.
  let districtMatch = null;
  if (scope === "state") {
    const dName = district.name.toLowerCase();
    const nMandi = (district.nearestMandi || "").toLowerCase();
    districtMatch =
      markets.find((item) => item.district.toLowerCase() === dName) ||
      (nMandi && markets.find((item) => item.market.toLowerCase().includes(nMandi))) ||
      null;
  }

  const headlinePrice = districtMatch ? districtMatch.modal : mid;
  const headlineMandi = districtMatch
    ? districtMatch.market
    : (scope === "state" ? `${district.state} area (${markets.length} mandis)` : `nearest reporting mandis (${markets.length})`);

  const pct = mid ? Math.round(((headlinePrice - mid) / mid) * 100) : 0;
  let position;
  let baseSignal;
  if (pct >= 5) { position = "above"; baseSignal = "sell"; }
  else if (pct <= -5) { position = "below"; baseSignal = "hold"; }
  else { position = "near"; baseSignal = "wait"; }

  const storageRisk = cropMarket.storageRisk || "medium";
  const signal = storageRisk === "high" && baseSignal === "hold" ? "wait" : baseSignal;
  const positionLabel = (POSITION_LABELS[language] || POSITION_LABELS.hinglish)[position];

  const source = scope === "state"
    ? (districtMatch
        ? "data.gov.in Agmarknet live API"
        : `data.gov.in Agmarknet live API (${district.state} area — ${district.name} mandi not reporting today)`)
    : `data.gov.in Agmarknet live API (${district.state} not reporting today — showing nearest reporting mandis)`;

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
    source,
    live: true
  };
}

// One entry point: live AgMarknet first, seeded KB fallback on any error.
// Always resolves to a complete summary object (never throws).
async function resolveMarketSummary(knowledge, districtId, cropId, language) {
  try {
    return await fetchLiveMarketAdvice(knowledge, districtId, cropId, language);
  } catch (error) {
    return buildFallbackMarketAdvice(knowledge, districtId, cropId, language, error.message);
  }
}

module.exports = {
  COMMODITY_MAP,
  resolveMarketSummary,
  fetchLiveMarketAdvice,
  buildFallbackMarketAdvice
};
