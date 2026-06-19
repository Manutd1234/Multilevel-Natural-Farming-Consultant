// Crop alias resolution — maps a free-text query (English / Hindi / Hinglish) to
// a crop id so the advisor answers about the crop the farmer actually asked for
// (e.g. "should I sell corn?" → maize, not the default selector).
//
// Order matters: the FIRST crop whose alias matches wins. Compound / specific
// aliases are listed ahead of generic ones to avoid collisions (e.g. "green gram"
// → moong before "bengal gram" → gram).
const CROP_ALIASES = [
  { id: "moong", name: "Moong / Green Gram", terms: ["moong", "mung", "green gram", "मूंग", "मुंग"] },
  { id: "arhar", name: "Arhar / Tur Dal", terms: ["arhar", "tur", "toor", "pigeon pea", "red gram", "अरहर", "तूर"] },
  { id: "gram", name: "Gram / Chana", terms: ["chana", "chickpea", "bengal gram", "चना"] },
  { id: "cabbage", name: "Cabbage / Patta Gobi", terms: ["cabbage", "patta gobi", "pattagobi", "band gobi", "बंदगोभी", "पत्तागोभी"] },
  { id: "cauliflower", name: "Cauliflower / Phool Gobi", terms: ["cauliflower", "phool gobi", "phoolgobi", "gobi", "फूलगोभी", "गोभी"] },
  { id: "paddy", name: "Paddy / Dhan", terms: ["paddy", "rice", "dhan", "chawal", "धान", "चावल"] },
  { id: "maize", name: "Maize / Makka", terms: ["maize", "corn", "makka", "makai", "bhutta", "मक्का", "मकई", "भुट्टा"] },
  { id: "onion", name: "Onion / Pyaaz", terms: ["onion", "onions", "pyaaz", "pyaz", "kanda", "प्याज"] },
  { id: "potato", name: "Potato / Aloo", terms: ["potato", "potatoes", "aloo", "alu", "आलू"] },
  { id: "tomato", name: "Tomato / Tamatar", terms: ["tomato", "tomatoes", "tamatar", "टमाटर"] },
  { id: "wheat", name: "Wheat / Gehun", terms: ["wheat", "gehun", "gehu", "गेहूं", "गेहूँ"] },
  { id: "bajra", name: "Bajra / Pearl Millet", terms: ["bajra", "pearl millet", "millet", "बाजरा"] },
  { id: "mustard", name: "Mustard / Sarson", terms: ["mustard", "sarson", "सरसों"] },
  { id: "jowar", name: "Jowar / Sorghum", terms: ["jowar", "sorghum", "ज्वार"] },
  { id: "barley", name: "Barley / Jau", terms: ["barley", "jau", "जौ"] },
  { id: "soybean", name: "Soybean / Soya", terms: ["soybean", "soyabean", "soya", "सोयाबीन"] },
  { id: "groundnut", name: "Groundnut / Moongphali", terms: ["groundnut", "peanut", "moongphali", "mungfali", "मूंगफली"] },
  { id: "cotton", name: "Cotton / Kapas", terms: ["cotton", "kapas", "कपास"] },
  { id: "sugarcane", name: "Sugarcane / Ganna", terms: ["sugarcane", "ganna", "गन्ना"] },
  { id: "guar", name: "Guar / Cluster Bean", terms: ["guar", "cluster bean", "ग्वार"] },
  { id: "sunflower", name: "Sunflower / Surajmukhi", terms: ["sunflower", "surajmukhi", "सूरजमुखी"] },
  { id: "garlic", name: "Garlic / Lehsun", terms: ["garlic", "lehsun", "lasun", "लहसुन"] },
  { id: "ginger", name: "Ginger / Adrak", terms: ["ginger", "adrak", "अदरक"] },
  { id: "greenchilli", name: "Green Chilli / Hari Mirch", terms: ["chilli", "chili", "chillies", "hari mirch", "mirch", "मिर्च"] },
  { id: "brinjal", name: "Brinjal / Baingan", terms: ["brinjal", "eggplant", "baingan", "बैंगन"] },
  { id: "okra", name: "Okra / Bhindi", terms: ["okra", "bhindi", "ladies finger", "भिंडी"] },
  { id: "peas", name: "Green Peas / Matar", terms: ["green peas", "peas", "pea", "matar", "मटर"] },
  { id: "banana", name: "Banana / Kela", terms: ["banana", "kela", "केला"] }
];

// Tokenize into Latin/Devanagari word runs so single-word matching is by whole
// token, not substring. This prevents collisions like "price"⊃"rice" and
// मूंगफली(groundnut)⊃मूंग(moong). Multi-word phrases fall back to substring.
function tokenize(text) {
  return String(text || "").toLowerCase().match(/[a-z0-9]+|[ऀ-ॿ]+/g) || [];
}

function termMatches(text, tokenSet, term) {
  if (term.includes(" ")) return text.includes(term); // phrase
  return tokenSet.has(term); // single word (Latin or Devanagari): exact token
}

function cropAliasFromQuery(query) {
  const text = String(query || "").toLowerCase();
  const tokenSet = new Set(tokenize(text));
  return CROP_ALIASES.find((crop) => crop.terms.some((term) => termMatches(text, tokenSet, term)));
}

module.exports = { CROP_ALIASES, cropAliasFromQuery };
