/*
 * End-to-end API pipeline tests for the Farming Consultant.
 *
 * Exercises every serverless handler directly (the same code Vercel runs) across
 * Module 1 (weather + AgMarknet market), Module 2 (disease), and the advisor —
 * with varied user questions, all three languages, and multiple crops. Asserts
 * both structural validity and market-analysis accuracy.
 *
 * Run:  node tests/api_tests.js
 * With ChatGPT:  CHATGPT_MODEL=sk-... node tests/api_tests.js   (model-backed)
 * Without any LLM key it still passes — handlers use their graceful fallbacks.
 *
 * Live weather/market need network; both fall back gracefully so the suite is
 * deterministic either way. Exits non-zero if any assertion fails.
 */

const weather = require("../api/weather.js");
const market = require("../api/market.js");
const disease = require("../api/disease.js");
const advisor = require("../api/advisor.js");

// ---- tiny test harness ---------------------------------------------------
let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`   ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`   ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const inRange = (v, lo, hi) => isNum(v) && v >= lo && v <= hi;
const str = (v) => typeof v === "string" && v.trim().length > 0;
const arr = (v) => Array.isArray(v) && v.length > 0;
const oneOf = (v, list) => list.includes(v);

function mockRes() {
  return { statusCode: 200, _body: "", setHeader() {}, end(b) { this._body = b; } };
}
async function callGet(handler, url) {
  const res = mockRes();
  await handler({ method: "GET", url }, res);
  return { status: res.statusCode, body: JSON.parse(res._body || "{}") };
}
async function callPost(handler, body) {
  const res = mockRes();
  await handler({ method: "POST", body }, res);
  return { status: res.statusCode, body: JSON.parse(res._body || "{}") };
}

// A real, valid 48x48 green PNG (OpenAI rejects 1x1) for the vision path.
function greenPng() {
  const { Buffer } = require("node:buffer");
  const zlib = require("node:zlib");
  const w = 48, h = 48;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [70, 150, 45]).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const crc = (buf) => zlib.crc32 ? zlib.crc32(buf) : require("node:zlib").crc32(buf);
  const chunk = (type, data) => {
    const tb = Buffer.from(type);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([tb, data]);
    const c = Buffer.alloc(4); c.writeUInt32BE((crc(body) >>> 0), 0);
    return Buffer.concat([len, body, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
  return png.toString("base64");
}

const LANGS = ["en", "hi", "hinglish"];

// ---- Module 1: Weather ---------------------------------------------------
async function testWeather() {
  console.log("\n== Module 1: Weather (Open-Meteo) ==");
  for (const district of ["hisar", "karnal", "sirsa", "sonipat"]) {
    for (const language of LANGS) {
      const { status, body } = await callGet(weather, `/api/weather?district=${district}&language=${language}`);
      const s = body.summary || {};
      const label = `weather ${district}/${language}`;
      check(`${label}: HTTP 200`, status === 200, `got ${status}`);
      check(`${label}: rainProbability 0-100`, inRange(s.rainProbability, 0, 100), `got ${s.rainProbability}`);
      check(`${label}: sprayWindow + voice present`, str(s.sprayWindow) && str(s.voiceResponse));
      check(`${label}: source present`, str(body.source));
    }
  }
}

// ---- Module 1: Market (AgMarknet / data.gov.in) --------------------------
async function testMarket() {
  console.log("\n== Module 1: Market (AgMarknet data.gov.in) ==");
  const crops = ["onion", "potato", "wheat", "bajra", "mustard", "tomato", "moong"];
  for (const crop of crops) {
    const { status, body } = await callGet(market, `/api/market?district=hisar&crop=${crop}&language=en`);
    const s = body.summary || {};
    const label = `market ${crop}`;
    check(`${label}: HTTP 200`, status === 200, `got ${status}`);
    check(`${label}: latestPrice positive number`, isNum(s.latestPrice) && s.latestPrice > 0, `got ${s.latestPrice}`);
    check(`${label}: price in sane range 50-100000`, inRange(s.latestPrice, 50, 100000), `got ${s.latestPrice}`);
    check(`${label}: signal valid`, oneOf(s.signal, ["sell", "hold", "wait"]), `got ${s.signal}`);
    check(`${label}: history >= 2 points`, arr(s.history) && s.history.length >= 2, `len ${s.history && s.history.length}`);
    check(`${label}: source names AgMarknet or seeded`, /agmarknet|data\.gov\.in|seeded/i.test(body.source || ""), body.source);
    check(`${label}: voiceResponse present`, str(s.voiceResponse));
  }

  // Accuracy: onion is high storage-risk, so the rule "rising -> hold" becomes
  // "wait". Signal must never be plain "hold" for onion (deterministic check).
  const onion = (await callGet(market, `/api/market?district=hisar&crop=onion&language=en`)).body.summary || {};
  check(`market onion (high storage): signal is sell or wait, never hold`, oneOf(onion.signal, ["sell", "wait"]), `got ${onion.signal}`);

  // Accuracy: language localizes the voice line.
  const hi = (await callGet(market, `/api/market?district=hisar&crop=onion&language=hi`)).body.summary || {};
  check(`market onion/hi: Hindi voice (Devanagari present)`, /[ऀ-ॿ]/.test(hi.voiceResponse || ""));
}

// ---- Module 2: Disease ---------------------------------------------------
async function testDisease() {
  console.log("\n== Module 2: Disease (vision + RAG) ==");
  for (const language of LANGS) {
    const { status, body } = await callPost(disease, {
      language, crop: "onion",
      description: "brown spots with yellow halo on leaves after rain"
    });
    const r = body.result || {};
    const label = `disease text/${language}`;
    check(`${label}: HTTP 200`, status === 200, `got ${status}`);
    check(`${label}: possible_issue present`, str(r.possible_issue));
    check(`${label}: confidence 0-1`, inRange(r.confidence, 0, 1), `got ${r.confidence}`);
    check(`${label}: organic_treatment non-empty`, arr(r.organic_treatment));
    check(`${label}: voice_response present`, str(r.voice_response));
    check(`${label}: escalation array`, Array.isArray(r.escalation));
    check(`${label}: retrieval (RAG) present`, Array.isArray(body.retrieval) && body.retrieval.length > 0);
  }

  // Vision path with a real (small) image — must still return a complete card.
  const img = (await callPost(disease, {
    language: "en", crop: "onion",
    description: "yellowing leaves with spots",
    image: { mimeType: "image/png", data: greenPng() }
  })).body;
  check(`disease with image: possible_issue + voice present`, str(img.result?.possible_issue) && str(img.result?.voice_response));
  check(`disease with image: organic_treatment non-empty`, arr(img.result?.organic_treatment));
}

// ---- Advisor: any-question pipeline + market accuracy --------------------
async function testAdvisor() {
  console.log("\n== Advisor: varied questions x languages x crops ==");
  const cases = [
    { q: "Should I sell my onion now or wait?", crop: "onion", intent: "market" },
    { q: "Kal barish hogi kya? Neem spray kab karun?", crop: "onion", intent: "weather" },
    { q: "My leaves have brown spots and yellow halo, organic ilaaj?", crop: "onion", intent: "disease" },
    { q: "What is my profit if I sell mustard this week?", crop: "mustard", intent: "finance" },
    { q: "Which crop should I sow after wheat?", crop: "wheat", intent: "rotation" },
    { q: "Tell me about natural farming for my field", crop: "onion", intent: "general" },
    { q: "Should I sell rice now?", crop: "onion", intent: "market-nodata" } // rice has no market KB
  ];

  for (const c of cases) {
    for (const language of LANGS) {
      const { status, body } = await callPost(advisor, {
        query: c.q, language, districtId: "hisar", cropId: c.crop
      });
      const r = body.result || {};
      const label = `advisor [${c.intent}]/${language}`;
      check(`${label}: HTTP 200`, status === 200, `got ${status}`);
      check(`${label}: voice_response present`, str(r.voice_response));
      check(`${label}: market_signal valid`, oneOf(r.market_signal, ["sell", "hold", "wait"]), `got ${r.market_signal}`);
      check(`${label}: confidence 0-1`, inRange(r.confidence, 0, 1), `got ${r.confidence}`);
      check(`${label}: remedy_steps array`, Array.isArray(r.remedy_steps));
      check(`${label}: safety_note present`, str(r.safety_note));
      check(`${label}: retrieval (RAG) present`, Array.isArray(body.retrieval));
    }
  }

  // Accuracy: a market question for onion should surface a real price in the
  // answer or be grounded in the AgMarknet/seeded summary (number present).
  const sell = (await callPost(advisor, { query: "What is the onion price today and should I sell?", language: "en", districtId: "hisar", cropId: "onion" })).body;
  check(`advisor onion price: voice mentions a rupee amount or price word`,
    /₹\s?\d|\d+\s*\/?\s*quintal|price|rate/i.test(sell.result?.voice_response || ""), sell.result?.voice_response);
}

(async () => {
  const started = Date.now();
  const hasLLM = Boolean(process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || process.env.CHATGPT_MODEL || process.env.GEMINI_API_KEY);
  console.log(`LLM configured: ${hasLLM ? "yes (model-backed answers)" : "no (graceful local fallback)"}`);
  try {
    await testWeather();
    await testMarket();
    await testDisease();
    await testAdvisor();
  } catch (error) {
    console.error("\nFATAL during tests:", error);
    process.exit(1);
  }

  const total = passed + failures.length;
  console.log(`\n==================== RESULT ====================`);
  console.log(`Passed ${passed}/${total}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  if (failures.length) {
    console.log(`Failed ${failures.length}:`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("ALL TESTS PASSED");
})();
