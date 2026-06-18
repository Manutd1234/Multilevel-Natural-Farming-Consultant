// Lightweight retrieval over the local knowledge base.
//
// Pure-JS BM25 ranking with bilingual (English / Hindi / Hinglish) synonym
// expansion — no embedding API, no key, no network. This turns the KB into a
// small searchable corpus and returns only the chunks most relevant to the
// query, which are then injected into the Gemini prompt (real RAG grounding
// instead of dumping the whole KB).

// Common words to drop before scoring (English + Hindi + Hinglish fillers).
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "am", "to", "of", "in", "on", "for", "and", "or",
  "my", "me", "i", "it", "this", "that", "with", "at", "be", "do", "does", "should",
  "can", "will", "what", "when", "how", "why", "now", "kya", "hai", "ho", "raha",
  "rahe", "rahi", "ka", "ke", "ki", "ko", "se", "mein", "me", "par", "abhi", "kar",
  "karu", "karun", "karein", "aur", "ya", "hain", "kaise", "kab", "mera", "mere",
  "meri", "है", "हैं", "का", "के", "की", "को", "से", "में", "और", "या", "पर", "क्या"
]);

// Token-level synonym expansion so Hinglish/Hindi queries match the English KB
// (e.g. "pyaaz"/"peele patte" → "onion"/"yellow leaves"). Adds the canonical
// terms alongside the original token; it never removes anything.
const SYNONYMS = {
  // crops
  pyaaz: ["onion"], pyaz: ["onion"], प्याज: ["onion"],
  aloo: ["potato"], आलू: ["potato"],
  tamatar: ["tomato"], टमाटर: ["tomato"],
  gehun: ["wheat"], गेहूं: ["wheat"], गेहुँ: ["wheat"],
  sarson: ["mustard"], सरसों: ["mustard"],
  bajra: ["pearl", "millet"], बाजरा: ["pearl", "millet"],
  moong: ["green", "gram"], mung: ["green", "gram"], मूंग: ["green", "gram"],
  dhan: ["rice", "paddy"], chawal: ["rice"], धान: ["rice", "paddy"], चावल: ["rice"],
  kapas: ["cotton"], कपास: ["cotton"],
  // symptoms / conditions
  peele: ["yellow", "yellowing"], peela: ["yellow"], peeli: ["yellow"],
  पीले: ["yellow"], पीला: ["yellow"],
  dhabbe: ["spots"], dhabba: ["spot"], धब्बे: ["spots"], धब्बा: ["spot"],
  patte: ["leaf", "leaves"], patta: ["leaf"], patton: ["leaf", "leaves"],
  पत्ते: ["leaf", "leaves"], पत्ता: ["leaf"], पत्तों: ["leaf", "leaves"],
  keeda: ["pest", "insect"], keede: ["pest", "insect"], कीड़ा: ["pest", "insect"],
  rog: ["disease"], रोग: ["disease"], beemari: ["disease"],
  sadna: ["rot"], sad: ["rot"], murjha: ["wilt", "wilting"],
  // weather / practices
  barish: ["rain"], बारिश: ["rain"], mausam: ["weather"], मौसम: ["weather"],
  neem: ["neem", "spray"], spray: ["spray"],
  // market
  bhav: ["price", "rate"], भाव: ["price", "rate"], rate: ["price", "rate"],
  mandi: ["market", "mandi"], मंडी: ["market", "mandi"],
  bechna: ["sell"], bech: ["sell"], बेचना: ["sell"]
};

function tokenize(text) {
  const base = String(text || "").toLowerCase().match(/[a-z0-9ऀ-ॿ]+/g) || [];
  const out = [];
  for (const token of base) {
    if (STOPWORDS.has(token)) continue;
    out.push(token);
    const expanded = SYNONYMS[token];
    if (expanded) out.push(...expanded);
  }
  return out;
}

// Flatten each KB record into one searchable document.
function buildCorpus(knowledge = {}) {
  const docs = [];

  for (const disease of knowledge.diseases || []) {
    docs.push({
      id: `disease:${disease.id}`,
      type: "disease",
      title: disease.name,
      raw: disease,
      text: [
        disease.name,
        ...(disease.crops || []),
        ...(disease.symptoms || []),
        ...(disease.organicTreatment || []),
        ...(disease.prevention || [])
      ].join(" ")
    });
  }

  for (const practice of knowledge.zbnf || []) {
    docs.push({
      id: `zbnf:${practice.id}`,
      type: "zbnf",
      title: practice.name,
      raw: practice,
      text: [practice.name, practice.use, practice.guardrail, ...(practice.steps || [])].join(" ")
    });
  }

  for (const entry of knowledge.calendar || []) {
    docs.push({
      id: `calendar:${entry.cropId}`,
      type: "calendar",
      title: entry.cropId,
      raw: entry,
      text: [entry.cropId, entry.sowingWindow, entry.harvestWindow, entry.marketNote, ...(entry.rotation || [])]
        .filter(Boolean)
        .join(" ")
    });
  }

  return docs;
}

// Classic BM25 (k1=1.5, b=0.75) scoring of the query against the corpus.
function bm25Rank(queryTokens, docs, { k1 = 1.5, b = 0.75 } = {}) {
  const N = docs.length || 1;
  const tokenized = docs.map((doc) => tokenize(doc.text));
  const lengths = tokenized.map((tokens) => tokens.length);
  const avgdl = lengths.reduce((sum, len) => sum + len, 0) / N || 1;

  const df = new Map();
  tokenized.forEach((tokens) => {
    new Set(tokens).forEach((token) => df.set(token, (df.get(token) || 0) + 1));
  });

  const uniqueQuery = [...new Set(queryTokens)];

  return docs.map((doc, i) => {
    const tf = new Map();
    tokenized[i].forEach((token) => tf.set(token, (tf.get(token) || 0) + 1));

    let score = 0;
    for (const term of uniqueQuery) {
      const freq = tf.get(term) || 0;
      if (!freq) continue;
      const n = df.get(term) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + (b * lengths[i]) / avgdl)));
    }
    return { doc, score };
  }).sort((a, b) => b.score - a.score);
}

// Retrieve the top-k most relevant KB chunks for a query.
// Returns [{ id, type, title, score, raw }]. If nothing scores (e.g. empty or
// image-only query), returns the first k of the requested types so the prompt
// still has grounding context.
function retrieve(query, knowledge, { types, k = 4, corpus } = {}) {
  const docs = (corpus || buildCorpus(knowledge)).filter((doc) => !types || types.includes(doc.type));
  if (!docs.length) return [];

  const queryTokens = tokenize(query);
  const ranked = queryTokens.length ? bm25Rank(queryTokens, docs) : docs.map((doc) => ({ doc, score: 0 }));

  const scored = ranked.filter((entry) => entry.score > 0).slice(0, k);
  const chosen = scored.length ? scored : ranked.slice(0, k);

  return chosen.map((entry) => ({
    id: entry.doc.id,
    type: entry.doc.type,
    title: entry.doc.title,
    score: Number(entry.score.toFixed(3)),
    raw: entry.doc.raw
  }));
}

module.exports = { buildCorpus, tokenize, retrieve };
