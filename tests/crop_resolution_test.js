/*
 * Large-scale, deterministic test for crop-alias resolution (lib/crops.js).
 *
 * The advisor must map a free-text question to the right crop — e.g.
 * "should I sell corn tomorrow" → maize (the bug that returned onion).
 *
 * This runs 100k+ generated queries: every crop × every alias × many templates ×
 * case/punctuation/filler variations, asserting each resolves to the intended
 * crop. Plus explicit conflict/negative cases. Pure JS, no network, runs in ~1s.
 *
 * Run:  node tests/crop_resolution_test.js   (or: npm run test:crops)
 */
const { CROP_ALIASES, cropAliasFromQuery } = require("../lib/crops");

let pass = 0;
const failures = [];
function expect(query, expectedId) {
  const got = cropAliasFromQuery(query);
  const gotId = got ? got.id : null;
  if (gotId === expectedId) pass++;
  else if (failures.length < 50) failures.push(`"${query}" -> ${gotId} (expected ${expectedId})`);
  else failures.push("…");
}

// Sentence templates the alias gets embedded into (en / hi / hinglish styles).
const TEMPLATES = [
  (a) => `should I sell ${a} now`,
  (a) => `what is the ${a} price today`,
  (a) => `${a} ka bhav kya hai`,
  (a) => `mujhe ${a} bechna hai`,
  (a) => `${a} ki kheti kaise karu`,
  (a) => `is the ${a} rate rising or falling`,
  (a) => `${a} mandi rate batao`,
  (a) => `kya abhi ${a} bechna chahiye`,
  (a) => `my ${a} crop has a problem`,
  (a) => `${a} me kya disease hai`,
  (a) => `tell me about ${a}`,
  (a) => `${a}`,
  (a) => `i grow ${a} on my farm`,
  (a) => `when should I harvest ${a}`,
  (a) => `${a} ke liye salah do`
];

// Case / punctuation / filler variations to stress the matcher.
const CASES = [(s) => s, (s) => s.toUpperCase(), (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())];
const PUNCT = ["", "?", ".", "!", " ??", " ..."];
const FILLERS = ["", "bhaiya ", "ji ", "please ", "namaste ", "sir ", "to ", "ab "];

// --- Bulk generation: every crop × alias × template × variations ---
let generated = 0;
for (const crop of CROP_ALIASES) {
  for (const term of crop.terms) {
    for (const tpl of TEMPLATES) {
      const base = tpl(term);
      for (const c of CASES) {
        for (const p of PUNCT) {
          for (const f of FILLERS) {
            expect(c(f + base) + p, crop.id);
            generated++;
          }
        }
      }
    }
  }
}

// --- Explicit conflict / tricky / negative cases (ground truth by hand) ---
const TRICKY = [
  ["should I sell corn tomorrow", "maize"],
  ["mujhe makka bechna hai", "maize"],
  ["bhutta ka rate", "maize"],
  ["green gram price", "moong"],
  ["bengal gram rate today", "gram"],
  ["chana ka bhav", "gram"],
  ["red gram / tur dal", "arhar"],
  ["peanut price", "groundnut"],
  ["moongphali bechni hai", "groundnut"],
  ["ladies finger problem", "okra"],
  ["bhindi ka rate", "okra"],
  ["patta gobi", "cabbage"],
  ["phool gobi rate", "cauliflower"],
  ["gobi ka bhav", "cauliflower"],
  ["paddy vs rice", "paddy"],
  ["should I sow pearl millet", "bajra"],
  ["sarson ka rate", "mustard"],
  ["ganna price", "sugarcane"],
  ["kapas bechu kya", "cotton"],
  ["मक्का का भाव", "maize"],
  ["प्याज बेचूं क्या", "onion"],
  ["गेहूं का रेट", "wheat"]
];
for (const [q, id] of TRICKY) expect(q, id);

// --- Negative: no crop term must resolve to null (no false positives) ---
const NEGATIVE = [
  "what is the price of my produce",   // "price" must NOT match rice
  "should I sell now",
  "kal barish hogi kya",
  "the weather is nice today",
  "how do I get a loan",
  "namaste, mujhe salah chahiye"
];
for (const q of NEGATIVE) expect(q, null);

const total = pass + failures.length;
console.log(`Generated bulk queries: ${generated.toLocaleString("en-US")}`);
console.log(`Plus ${TRICKY.length} tricky + ${NEGATIVE.length} negative cases`);
console.log(`Passed ${pass.toLocaleString("en-US")} / ${total.toLocaleString("en-US")}`);
if (failures.length) {
  console.log(`Failed ${failures.length}:`);
  failures.forEach((f) => console.log("  -", f));
  process.exit(1);
}
console.log("ALL CROP-RESOLUTION TESTS PASSED");
