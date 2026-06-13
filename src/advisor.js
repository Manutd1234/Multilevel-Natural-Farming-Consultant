const LANG_COPY = {
  hinglish: {
    weatherHeadline: "Mausam signal",
    marketHeadline: "Mandi signal",
    seedHeadline: "Beej aur kharcha",
    verifyMarket: "Mandi bhav badal sakta hai. Sale se pehle eNAM, Agmarknet, ya local mandi se check karein.",
    sowingOk: "Beej daalne se pehle mitti mein nami aur tez barish ka risk dekh lein.",
    missing: "District, crop, season, aur acres batayenge to salah zyada sahi hogi.",
    rupee: "rupees",
    askFollowUp: "Aap chahen to main seed quantity, kharcha, aur mandi timing ko alag-alag tod kar bata sakta hoon."
  },
  hi: {
    weatherHeadline: "मौसम संकेत",
    marketHeadline: "मंडी संकेत",
    seedHeadline: "बीज और खर्च",
    verifyMarket: "मंडी भाव बदल सकते हैं। बेचने से पहले eNAM, Agmarknet या स्थानीय मंडी से पुष्टि करें।",
    sowingOk: "बुवाई से पहले मिट्टी की नमी और तेज बारिश का जोखिम देख लें।",
    missing: "जिला, फसल, मौसम और एकड़ बताने पर सलाह बेहतर होगी।",
    rupee: "रुपये",
    askFollowUp: "मैं बीज मात्रा, खर्च और मंडी समय को अलग-अलग भी बता सकता हूं।"
  },
  en: {
    weatherHeadline: "Weather signal",
    marketHeadline: "Market signal",
    seedHeadline: "Seed and cost",
    verifyMarket: "Mandi prices move quickly. Verify with eNAM, Agmarknet, or the local mandi before selling.",
    sowingOk: "Check soil moisture and heavy-rain risk before sowing.",
    missing: "Advice improves when district, crop, season, and acres are known.",
    rupee: "rupees",
    askFollowUp: "I can break down seed quantity, cost, and sale timing separately."
  }
};

const INTENT_KEYWORDS = {
  weather: ["rain", "barish", "mausam", "weather", "कल", "बारिश", "मौसम", "sowing", "beej daal", "बुवाई"],
  market: ["mandi", "rate", "price", "bhav", "sell", "market", "भाव", "मंडी", "कीमत", "बेचना"],
  seed: ["seed", "beej", "variety", "crop", "acre", "kharcha", "cost", "finance", "loan", "subsidy", "बीज", "खर्च", "एकड़", "लोन", "सब्सिडी"]
};

function normalise(text = "") {
  return text.toLowerCase().normalize("NFKD");
}

function hasAny(text, words) {
  return words.some((word) => text.includes(normalise(word)));
}

function formatInr(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function findCrop(text, marketData, fallbackCropId) {
  const cleaned = normalise(text);
  return marketData.crops.find((crop) => crop.aliases.some((alias) => cleaned.includes(normalise(alias)))) ||
    marketData.crops.find((crop) => crop.id === fallbackCropId) ||
    marketData.crops[0];
}

function findDistrict(text, marketData, fallbackDistrictId) {
  const cleaned = normalise(text);
  return marketData.districts.find((district) => cleaned.includes(normalise(district.name))) ||
    marketData.districts.find((district) => district.id === fallbackDistrictId) ||
    marketData.districts[0];
}

function extractAcres(text, fallbackAcres) {
  const match = normalise(text).match(/(\d+(?:\.\d+)?)\s*(acre|acres|एकड़|ekad|killa|kila)?/);
  if (!match) return Number(fallbackAcres) || 1;
  return Math.max(0.25, Number(match[1]));
}

function detectIntent(text) {
  const cleaned = normalise(text);
  const intents = Object.entries(INTENT_KEYWORDS)
    .filter(([, words]) => hasAny(cleaned, words))
    .map(([intent]) => intent);

  if (intents.length === 0) return ["weather", "market", "seed"];
  return intents;
}

function summarizeWeather(weather, district, lang) {
  const copy = LANG_COPY[lang] || LANG_COPY.hinglish;
  const fallback = {
    temperature: 34,
    rainProbability: 35,
    precipitation: 1.5,
    windSpeed: 13,
    source: "fallback"
  };
  const signal = weather || fallback;
  const rain = Number(signal.rainProbability || 0);
  const temp = Number(signal.temperature || 0);
  const risk = rain >= 65 ? "high" : rain >= 35 ? "moderate" : "low";
  const action = rain >= 65
    ? "delay sowing and protect stored seed"
    : rain >= 35
      ? "sow only where soil moisture is right"
      : "irrigate or wait for useful rain before sowing";

  const short = `${copy.weatherHeadline}: ${district.name} has ${rain}% rain chance, ${temp}C temperature, and ${risk} sowing risk. ${copy.sowingOk}`;
  return {
    title: copy.weatherHeadline,
    metric: `${rain}% rain`,
    tag: signal.source === "open-meteo" ? "Open-Meteo" : "Demo fallback",
    note: `${action}. Wind ${Math.round(signal.windSpeed || 0)} km/h.`,
    short,
    risk
  };
}

function summarizeMarket(crop, district, lang) {
  const copy = LANG_COPY[lang] || LANG_COPY.hinglish;
  const band = crop.priceBand;
  const metric = `₹${formatInr(band.modal)}/${crop.unit}`;
  const short = `${copy.marketHeadline}: ${crop.name} in ${district.nearestMandis[0]} is shown as a demo band around ${metric}. Trend: ${crop.trend}. ${copy.verifyMarket}`;
  return {
    title: copy.marketHeadline,
    metric,
    tag: "Demo mandi band",
    note: crop.marketNote,
    short
  };
}

function summarizeSeedFinance(crop, seedFinance, acres, lang) {
  const copy = LANG_COPY[lang] || LANG_COPY.hinglish;
  const profile = seedFinance.guidance.find((item) => item.cropId === crop.id) || seedFinance.guidance[0];
  const seedKg = profile.seedRateKgPerAcre * acres;
  const seedLow = seedKg * profile.seedCostPerKg.low;
  const seedHigh = seedKg * profile.seedCostPerKg.high;
  const inputLow = profile.naturalInputsPerAcre.low * acres;
  const inputHigh = profile.naturalInputsPerAcre.high * acres;
  const buffer = seedFinance.financeRules.firstSeasonBufferPercent / 100;
  const totalLow = (seedLow + inputLow) * (1 + buffer);
  const totalHigh = (seedHigh + inputHigh) * (1 + buffer);
  const metric = `₹${formatInr(totalLow)}-₹${formatInr(totalHigh)}`;
  const short = `${copy.seedHeadline}: ${acres} acre ${crop.name} needs about ${formatInr(seedKg)} kg seed. First-season seed plus natural-input buffer is about ${metric}. ${profile.seedAdvice}`;

  return {
    title: copy.seedHeadline,
    metric,
    tag: `${formatInr(seedKg)} kg seed`,
    note: `${profile.rotationAdvice} ${profile.subsidyNote}`,
    short,
    profile
  };
}

export function buildAdvice(question, context) {
  const {
    marketData,
    seedFinance,
    knowledgeBase,
    weather,
    districtId,
    cropId,
    acres,
    lang = "hinglish"
  } = context;

  const copy = LANG_COPY[lang] || LANG_COPY.hinglish;
  const intents = detectIntent(question);
  const district = findDistrict(question, marketData, districtId);
  const crop = findCrop(question, marketData, cropId);
  const detectedAcres = extractAcres(question, acres);

  const cards = [];
  const answerParts = [];
  if (intents.includes("weather")) {
    const weatherCard = summarizeWeather(weather, district, lang);
    cards.push(weatherCard);
    answerParts.push(weatherCard.short);
  }

  if (intents.includes("market")) {
    const marketCard = summarizeMarket(crop, district, lang);
    cards.push(marketCard);
    answerParts.push(marketCard.short);
  }

  if (intents.includes("seed")) {
    const seedCard = summarizeSeedFinance(crop, seedFinance, detectedAcres, lang);
    cards.push(seedCard);
    answerParts.push(seedCard.short);
  }

  const safety = knowledgeBase.safetyNotes[lang] || knowledgeBase.safetyNotes.hinglish;
  const steps = [
    copy.missing,
    copy.verifyMarket,
    copy.askFollowUp,
    safety
  ];

  return {
    intents,
    district,
    crop,
    acres: detectedAcres,
    summary: answerParts.join(" "),
    cards,
    steps,
    sources: knowledgeBase.trustedSources
  };
}

export function getLangCopy(lang) {
  return LANG_COPY[lang] || LANG_COPY.hinglish;
}
