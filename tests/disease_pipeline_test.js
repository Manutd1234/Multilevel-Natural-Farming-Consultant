/*
 * Large-scale deterministic test for the disease normalization pipeline
 * (normalizeDiseaseResult in api/disease.js).
 *
 * Vision quality depends on the model, but the PIPELINE that turns any model
 * output into the UI shape must be bulletproof: never blank, confidence always a
 * sane 0..1 number (the "82% for a bad crop" question is about labelling — the
 * value itself must always be valid), arrays always filled, language honoured.
 *
 * This throws 120,000+ randomized, adversarial raw model responses at the
 * normalizer and asserts the invariants hold every time. Pure JS, ~1s.
 *
 * Run:  node tests/disease_pipeline_test.js   (or: npm run test:pipeline)
 */
const { normalizeDiseaseResult } = require("../api/disease.js");

let pass = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) pass++;
  else if (failures.length < 40) failures.push(detail ? `${name} — ${detail}` : name);
}

const LANGS = ["en", "hi", "hinglish"];

// Pools of adversarial field values the model might emit.
const ISSUES = ["Maize ear rot / mold", "Wheat leaf rust", "Crop looks healthy", "", null, undefined, 12345, "  "];
const CONFIDENCES = [0.82, 0.12, 0.5, 1, 0, "High", "high", "Medium", "Low", "unsure", "82%", "0.42", "95", 82, 1.5, -0.3, "", null, undefined, NaN, "abc", {}, [0.5]];
const ARRAYS = [
  ["a", "b", "c"],
  "single string treatment. second sentence.",
  "one; two; three",
  [],
  null,
  undefined,
  ["", "  ", "valid"],
  [1, 2, 3],
  42,
  {}
];
const VOICES = ["Clear spoken answer here.", "", null, undefined, "   ", 999];
const SAFETY = ["Custom safety note.", "", null, undefined];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TOTAL = 120000;
for (let i = 0; i < TOTAL; i++) {
  const language = rand(LANGS);
  // Randomly include/omit each field, with random (often wrong-typed) values.
  const raw = {};
  if (Math.random() < 0.85) raw.possible_issue = rand(ISSUES);
  if (Math.random() < 0.85) raw.confidence = rand(CONFIDENCES);
  if (Math.random() < 0.8) raw.visual_signs = rand(ARRAYS);
  if (Math.random() < 0.8) raw.organic_treatment = rand(ARRAYS);
  if (Math.random() < 0.7) raw.prevention = rand(ARRAYS);
  if (Math.random() < 0.7) raw.escalation = rand(ARRAYS);
  if (Math.random() < 0.8) raw.voice_response = rand(VOICES);
  if (Math.random() < 0.7) raw.safety_note = rand(SAFETY);
  // Occasionally pass total garbage.
  const input = Math.random() < 0.02 ? rand([null, undefined, "string", 42, []]) : raw;

  const r = normalizeDiseaseResult(input, language);

  check("possible_issue", typeof r.possible_issue === "string" && r.possible_issue.trim().length > 0, JSON.stringify(input));
  check("confidence range", typeof r.confidence === "number" && r.confidence >= 0 && r.confidence <= 1, `conf=${r.confidence} from ${JSON.stringify(input && input.confidence)}`);
  check("visual_signs filled", Array.isArray(r.visual_signs) && r.visual_signs.length > 0 && r.visual_signs.every((s) => typeof s === "string" && s.length > 0));
  check("organic_treatment filled", Array.isArray(r.organic_treatment) && r.organic_treatment.length > 0 && r.organic_treatment.every((s) => typeof s === "string" && s.length > 0));
  check("prevention is array", Array.isArray(r.prevention) && r.prevention.every((s) => typeof s === "string"));
  check("escalation filled", Array.isArray(r.escalation) && r.escalation.length > 0);
  check("voice_response", typeof r.voice_response === "string" && r.voice_response.trim().length > 0);
  check("safety_note", typeof r.safety_note === "string" && r.safety_note.trim().length > 0);
}

// --- Focused confidence-coercion table (the "82%" concern: value must be sane) ---
const CONF_CASES = [
  [0.82, 0.82], ["High", 0.85], ["high", 0.85], ["Medium", 0.6], ["Low", 0.4],
  [82, 0.82], ["82%", 0.82], ["0.42", 0.42], ["95", 0.95], [1.5, 1], [-0.3, 0.5],
  [undefined, 0.5], [null, 0.5], ["", 0.5], ["unsure", 0.4]
];
for (const [input, expected] of CONF_CASES) {
  const r = normalizeDiseaseResult({ confidence: input, possible_issue: "x", voice_response: "y" }, "en");
  check(`conf ${JSON.stringify(input)}→${expected}`, Math.abs(r.confidence - expected) < 0.001, `got ${r.confidence}`);
}

const total = pass + failures.length;
console.log(`Ran ${TOTAL.toLocaleString("en-US")} randomized + ${CONF_CASES.length} confidence cases`);
console.log(`Passed ${pass.toLocaleString("en-US")} / ${total.toLocaleString("en-US")} invariant checks`);
if (failures.length) {
  console.log(`Failed ${failures.length}:`);
  failures.forEach((f) => console.log("  -", f));
  process.exit(1);
}
console.log("ALL DISEASE-PIPELINE INVARIANTS HELD");
