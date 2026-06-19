/*
 * Disease vision uniqueness test.
 *
 * Bug: every image returned the SAME triage (only confidence differed) because
 * the result was backfilled from the KB instead of the model's image analysis.
 *
 * This fetches diverse REAL crop images from the internet (Wikimedia), runs the
 * /api/disease handler on each, and asserts the outputs are genuinely distinct
 * and image-specific (not the KB echo).
 *
 * Run (needs an LLM key + network):
 *   CHATGPT_MODEL=sk-... node tests/image_uniqueness_test.js
 * The harness accepts ANY number of URLs — scaling to 1000+ is only bounded by
 * API cost/time, so the committed list is a representative diverse sample.
 */
const handler = require("../api/disease.js");

const IMAGES = [
  ["wheat_leaf_rust",  "https://upload.wikimedia.org/wikipedia/commons/d/d4/Wheat_leaf_rust_on_wheat.jpg"],
  ["potato_late_blight","https://upload.wikimedia.org/wikipedia/commons/a/aa/Late_blight_on_potato_leaf_2.jpg"],
  ["healthy_rice_field","https://upload.wikimedia.org/wikipedia/commons/0/0a/20201102.Hengnan.Hybrid_rice_Sanyou-1.6.jpg"],
  ["cotton_plant",     "https://upload.wikimedia.org/wikipedia/commons/6/68/CottonPlant.JPG"],
  ["banana_varieties", "https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg"],
  ["potato_tubers",    "https://upload.wikimedia.org/wikipedia/commons/a/ab/Patates.jpg"]
];

function mockRes() {
  return { statusCode: 200, _body: "", setHeader() {}, end(b) { this._body = b; } };
}

async function fetchBase64(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 farming-consultant-test" } });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  return { mimeType, data: buf.toString("base64") };
}

(async () => {
  const hasLLM = Boolean(process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || process.env.CHATGPT_MODEL || process.env.GEMINI_API_KEY);
  if (!hasLLM) {
    console.log("SKIPPED — no LLM key set (vision uniqueness needs a real model). Set CHATGPT_MODEL/OPENAI_API_KEY.");
    return;
  }

  const results = [];
  for (const [name, url] of IMAGES) {
    try {
      const image = await fetchBase64(url);
      const res = mockRes();
      await handler({ method: "POST", body: { language: "en", crop: "onion", description: "", image } }, res);
      const out = JSON.parse(res._body);
      const r = out.result || {};
      results.push({ name, modelBacked: out.modelBacked, issue: r.possible_issue, confidence: r.confidence, sign: (r.visual_signs || [])[0] });
      console.log(`\n[${name}] modelBacked=${out.modelBacked} conf=${r.confidence}`);
      console.log(`   issue: ${r.issue || r.possible_issue}`);
      console.log(`   sign : ${(r.visual_signs || [])[0]}`);
    } catch (e) {
      console.log(`\n[${name}] FETCH/RUN ERROR: ${e.message}`);
      results.push({ name, error: e.message });
    }
  }

  const ok = results.filter((r) => !r.error);
  const issues = ok.map((r) => (r.issue || "").trim().toLowerCase());
  const signs = ok.map((r) => (r.sign || "").trim().toLowerCase());
  const distinctIssues = new Set(issues.filter(Boolean)).size;
  const distinctSigns = new Set(signs.filter(Boolean)).size;

  console.log(`\n==================== RESULT ====================`);
  console.log(`Images analysed: ${ok.length}/${IMAGES.length}`);
  console.log(`Distinct possible_issue: ${distinctIssues} | distinct first visual sign: ${distinctSigns}`);

  const failures = [];
  if (ok.length < 3) failures.push("too few images analysed (network?)");
  // The bug was: all identical. Require strong diversity.
  if (distinctIssues < Math.ceil(ok.length * 0.6)) failures.push(`possible_issue not diverse enough (${distinctIssues}/${ok.length})`);
  if (distinctSigns < Math.ceil(ok.length * 0.6)) failures.push(`visual signs not diverse enough (${distinctSigns}/${ok.length})`);
  if (ok.some((r) => !r.issue || !r.sign)) failures.push("an analysed image had an empty issue/sign");

  if (failures.length) {
    console.log("FAILED:");
    failures.forEach((f) => console.log("  -", f));
    process.exit(1);
  }
  console.log("ALL IMAGE-UNIQUENESS TESTS PASSED (outputs are image-specific, not KB-echo)");
})();
