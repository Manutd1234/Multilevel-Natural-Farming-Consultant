const state = {
  districts: [],
  market: null,
  districtId: "hisar",
  cropId: "onion",
  language: "hinglish",
  unit: "acre",
  area: 2,
  image: null,
  lastSignals: null,
  diseaseResult: null,
  diseaseSource: null,
  diseaseSpeakText: "",
  chatCount: 0,
  mediaRecorder: null,
  chunks: [],
  advisorRequestId: 0,
  diseaseRequestId: 0,
  activeTab: "chat"
};

const FALLBACK_DISTRICTS = [
  { id: "hisar", name: "Hisar", state: "Haryana", latitude: 29.1492, longitude: 75.7217, nearestMandi: "Hisar" },
  { id: "karnal", name: "Karnal", state: "Haryana", latitude: 29.6857, longitude: 76.9905, nearestMandi: "Karnal" },
  { id: "sirsa", name: "Sirsa", state: "Haryana", latitude: 29.5336, longitude: 75.0177, nearestMandi: "Sirsa" },
  { id: "sonipat", name: "Sonipat", state: "Haryana", latitude: 28.9931, longitude: 77.0151, nearestMandi: "Sonipat" }
];

const FALLBACK_MARKET = {
  lastUpdated: "2026-06-15",
  note: "Embedded fallback dataset for demo startup resilience.",
  crops: [
    {
      id: "onion",
      name: "Onion / Pyaaz",
      unit: "quintal",
      storageRisk: "high",
      markets: [
        {
          districtId: "hisar",
          name: "Hisar",
          history: [
            { date: "2026-06-08", modal: 1720 },
            { date: "2026-06-09", modal: 1760 },
            { date: "2026-06-10", modal: 1810 },
            { date: "2026-06-11", modal: 1800 },
            { date: "2026-06-12", modal: 1850 },
            { date: "2026-06-13", modal: 1880 },
            { date: "2026-06-14", modal: 1910 }
          ]
        }
      ]
    },
    {
      id: "bajra",
      name: "Bajra / Pearl Millet",
      unit: "quintal",
      storageRisk: "medium",
      markets: [
        {
          districtId: "hisar",
          name: "Hisar",
          history: [
            { date: "2026-06-08", modal: 2240 },
            { date: "2026-06-09", modal: 2260 },
            { date: "2026-06-10", modal: 2250 },
            { date: "2026-06-11", modal: 2280 },
            { date: "2026-06-12", modal: 2290 },
            { date: "2026-06-13", modal: 2300 },
            { date: "2026-06-14", modal: 2310 }
          ]
        }
      ]
    },
    {
      id: "moong",
      name: "Moong / Green Gram",
      unit: "quintal",
      storageRisk: "low",
      markets: [
        {
          districtId: "hisar",
          name: "Hisar",
          history: [
            { date: "2026-06-08", modal: 8400 },
            { date: "2026-06-09", modal: 8350 },
            { date: "2026-06-10", modal: 8280 },
            { date: "2026-06-11", modal: 8220 },
            { date: "2026-06-12", modal: 8180 },
            { date: "2026-06-13", modal: 8100 },
            { date: "2026-06-14", modal: 8050 }
          ]
        }
      ]
    },
    {
      id: "mustard",
      name: "Mustard / Sarson",
      unit: "quintal",
      storageRisk: "medium",
      markets: [
        {
          districtId: "hisar",
          name: "Hisar",
          history: [
            { date: "2026-06-08", modal: 5350 },
            { date: "2026-06-09", modal: 5360 },
            { date: "2026-06-10", modal: 5380 },
            { date: "2026-06-11", modal: 5370 },
            { date: "2026-06-12", modal: 5400 },
            { date: "2026-06-13", modal: 5420 },
            { date: "2026-06-14", modal: 5430 }
          ]
        }
      ]
    },
    {
      id: "potato",
      name: "Potato / Aloo",
      unit: "quintal",
      storageRisk: "high",
      markets: [
        {
          districtId: "hisar",
          name: "Hisar",
          history: [
            { date: "2026-06-09", modal: 1300 },
            { date: "2026-06-10", modal: 1280 },
            { date: "2026-06-11", modal: 1250 },
            { date: "2026-06-12", modal: 1230 },
            { date: "2026-06-13", modal: 1210 },
            { date: "2026-06-14", modal: 1190 },
            { date: "2026-06-15", modal: 1170 }
          ]
        }
      ]
    },
    {
      id: "wheat",
      name: "Wheat / Gehun",
      unit: "quintal",
      storageRisk: "low",
      markets: [
        {
          districtId: "hisar",
          name: "Hisar",
          history: [
            { date: "2026-06-09", modal: 2120 },
            { date: "2026-06-10", modal: 2130 },
            { date: "2026-06-11", modal: 2140 },
            { date: "2026-06-12", modal: 2145 },
            { date: "2026-06-13", modal: 2155 },
            { date: "2026-06-14", modal: 2165 },
            { date: "2026-06-15", modal: 2180 }
          ]
        }
      ]
    },
    {
      id: "tomato",
      name: "Tomato / Tamatar",
      unit: "quintal",
      storageRisk: "high",
      markets: [
        {
          districtId: "hisar",
          name: "Hisar",
          history: [
            { date: "2026-06-09", modal: 1200 },
            { date: "2026-06-10", modal: 1150 },
            { date: "2026-06-11", modal: 1080 },
            { date: "2026-06-12", modal: 1050 },
            { date: "2026-06-13", modal: 1010 },
            { date: "2026-06-14", modal: 990 },
            { date: "2026-06-15", modal: 980 }
          ]
        }
      ]
    }
  ]
};

const q = (selector) => document.querySelector(selector);
const dom = {
  language: q("#language"),
  brandTagline: q("#brandTagline"),
  languageLabel: q("#languageLabel"),
  // tabs
  moduleTabs: document.querySelectorAll("[data-tab]"),
  modulePanels: document.querySelectorAll("[data-tab-panel]"),
  chatTab: q("#chatTab"),
  moduleOneTab: q("#moduleOneTab"),
  moduleTwoTab: q("#moduleTwoTab"),
  // Tab 1: chat
  chatEyebrow: q("#chatEyebrow"),
  chatTitle: q("#chatTitle"),
  chatLog: q("#chatLog"),
  recordButton: q("#recordButton"),
  recordStatus: q("#recordStatus"),
  queryInput: q("#queryInput"),
  askButton: q("#askButton"),
  quickGrid: q("#quickGrid"),
  // Tab 2: Module 1 context + signals
  districtSelect: q("#districtSelect"),
  cropSelect: q("#cropSelect"),
  unitSelect: q("#unitSelect"),
  areaInput: q("#areaInput"),
  areaValue: q("#areaValue"),
  districtLabel: q("#districtLabel"),
  cropLabel: q("#cropLabel"),
  unitLabel: q("#unitLabel"),
  areaLabel: q("#areaLabel"),
  moduleOneLabel: q("#moduleOneLabel"),
  signalsTitle: q("#signalsTitle"),
  refreshSignals: q("#refreshSignals"),
  signalGrid: q("#signalGrid"),
  // Tab 3: Module 2 disease + output
  moduleTwoLabel: q("#moduleTwoLabel"),
  diseaseTitle: q("#diseaseTitle"),
  cropPhotoLabel: q("#cropPhotoLabel"),
  cropImage: q("#cropImage"),
  imageLabel: q("#imageLabel"),
  imagePreview: q("#imagePreview"),
  noPhotoLabel: q("#noPhotoLabel"),
  symptomLabel: q("#symptomLabel"),
  symptomInput: q("#symptomInput"),
  diseaseButton: q("#diseaseButton"),
  diseaseAnswerEyebrow: q("#diseaseAnswerEyebrow"),
  diseaseAnswerTitle: q("#diseaseAnswerTitle"),
  diseaseReplayButton: q("#diseaseReplayButton"),
  diseaseAnswerText: q("#diseaseAnswerText"),
  diseaseResultGrid: q("#diseaseResultGrid"),
  diseaseSafetyLine: q("#diseaseSafetyLine")
};

const COPY = {
  hinglish: {
    htmlLang: "hi",
    brandTagline: "ChatGPT + Open-Meteo + AgMarknet bilingual voice farming consultant",
    languageLabel: "Language",
    serviceStatus: "Vercel-ready prototype",
    heroTitle: "Bolkar pucho. Photo bhejo. Safe organic salah lo.",
    heroSubtitle: "Weather, mandi trend, aur crop disease triage natural farming farmers ke liye.",
    recordStatus: "Tap to record — Browser Voice API, free aur instant.",
    recordUnavailable: "Browser recording unavailable hai. Question type kar dein.",
    recording: "Recording... stop karne ke liye dobara tap karein.",
    micPermission: "Microphone permission chahiye, ya question type karein.",
    sendingAudio: "Aawaz sun rahe hain...",
    transcribed: "Bol diya — ab poochhein!",
    noSpeech: "Speech detect nahi hui.",
    whisperConfig: "Type karein ya microphone permission dein.",
    defaultQuery: "Kya abhi pyaaz bechna chahiye? Kal barish hogi kya?",
    queryPlaceholder: "Apna sawal bolkar ya type karke poochhein",
    ask: "Ask",
    thinking: "Soch raha hai...",
    district: "District",
    crop: "Crop",
    landUnit: "Land unit",
    area: "Area",
    moduleOne: "Module 1",
    moduleTwo: "Module 2",
    moduleOneTab: "Module 1: Weather & Market",
    moduleTwoTab: "Module 2: Disease",
    signalsTitle: "Weather & Market Intelligence",
    diseaseTitle: "Disease Identification & Organic Treatment",
    cropPhoto: "Crop photo",
    uploadPhoto: "Upload/take leaf photo",
    noPhoto: "No photo selected",
    chooseImage: "Image file choose karein",
    imageTooLarge: "5 MB se chhoti image use karein",
    symptoms: "Symptoms",
    symptomsPlaceholder: "Example: Patte peele ho rahe hain, brown spots hain, rain ke baad badh gaya.",
    analyzeDisease: "Analyze disease",
    analyzing: "Analyze ho raha hai...",
    addSymptoms: "Pehle crop photo ya symptoms add karein.",
    answerEyebrow: "Grounded response",
    answerTitle: "Farming Consultant answer",
    emptyAnswer: "Question poochhein, signals refresh karein, ya crop photo upload karein.",
    defaultSafety: "Prototype advice. Severe crop issue aur mandi price local source se confirm karein.",
    weather: "Weather",
    rain: "rain",
    mandi: "Mandi",
    openMeteoUnavailable: "Open-Meteo signal abhi unavailable hai.",
    marketUnavailable: "Fallback market signal abhi unavailable hai.",
    estValue: "Anumaanit gross value",
    diagnosisConfidence: "Diagnosis confidence",
    confNote: "AI is identification ko lekar kitna sure hai (crop quality nahi)",
    marketSignal: "Market signal",
    confidence: "Confidence",
    weatherAlert: "Weather alert",
    noAlert: "No alert",
    source: "Source",
    steps: "Steps",
    possibleIssue: "Possible issue",
    visualSigns: "Visual signs",
    organicTreatment: "Organic treatment",
    escalateIf: "Escalate if",
    localFallback: "Local fallback",
    diseaseFallback: "Local disease KB fallback",
    geminiRag: "Gemini + local RAG",
    geminiDisease: "Gemini image triage",
    chatTab: "Consultant Chat",
    chatTitle: "Farming Consultant se poochhein",
    chatEyebrow: "Consultant",
    chatGreeting: "Namaste! Mandi bhav, mausam, ya farming salah ke liye poochhein. Crop disease ke liye Module 2 use karein.",
    listen: "Suno",
    diseaseResultTitle: "Disease result",
    youLabel: "Aap",
    quickPrompts: [
      "Kya abhi pyaaz bechna chahiye?",
      "Kal barish hogi kya? Neem spray kab karun?",
      "Mere patton par brown spots hain, organic ilaaj batao.",
      "Moong ka bhav gir raha hai ya badh raha hai?"
    ]
  },
  hi: {
    htmlLang: "hi",
    brandTagline: "ChatGPT + Open-Meteo + AgMarknet के साथ voice-first प्राकृतिक खेती सलाह",
    languageLabel: "भाषा",
    serviceStatus: "Vercel-ready prototype",
    heroTitle: "बोलकर पूछें। फोटो भेजें। सुरक्षित जैविक सलाह लें।",
    heroSubtitle: "प्राकृतिक खेती अपनाने वाले किसानों के लिए मौसम, मंडी भाव और फसल रोग सलाह।",
    recordStatus: "रिकॉर्ड करने के लिए टैप करें — Browser Voice API, मुफ्त और तुरंत।",
    recordUnavailable: "इस ब्राउज़र में रिकॉर्डिंग उपलब्ध नहीं है। सवाल टाइप करें।",
    recording: "रिकॉर्डिंग चालू है... रोकने के लिए दोबारा टैप करें।",
    micPermission: "माइक्रोफोन अनुमति चाहिए, या सवाल टाइप करें।",
    sendingAudio: "आवाज़ सुन रहे हैं...",
    transcribed: "बोल दिया — अब पूछें!",
    noSpeech: "आवाज़ detect नहीं हुई।",
    whisperConfig: "सवाल टाइप करें या माइक्रोफोन अनुमति दें।",
    defaultQuery: "क्या अभी प्याज बेचना चाहिए? कल बारिश होगी क्या?",
    queryPlaceholder: "अपना सवाल बोलकर या टाइप करके पूछें",
    ask: "पूछें",
    thinking: "सोच रहा है...",
    district: "जिला",
    crop: "फसल",
    landUnit: "जमीन की इकाई",
    area: "क्षेत्रफल",
    moduleOne: "मॉड्यूल 1",
    moduleTwo: "मॉड्यूल 2",
    moduleOneTab: "मॉड्यूल 1: मौसम और मंडी",
    moduleTwoTab: "मॉड्यूल 2: रोग",
    signalsTitle: "मौसम और मंडी जानकारी",
    diseaseTitle: "रोग पहचान और जैविक उपचार",
    cropPhoto: "फसल फोटो",
    uploadPhoto: "पत्ती/फसल फोटो अपलोड करें",
    noPhoto: "कोई फोटो चुनी नहीं गई",
    chooseImage: "कृपया image file चुनें",
    imageTooLarge: "5 MB से छोटी image इस्तेमाल करें",
    symptoms: "लक्षण",
    symptomsPlaceholder: "उदाहरण: पत्ते पीले हो रहे हैं, brown spots हैं, बारिश के बाद बढ़ गया।",
    analyzeDisease: "रोग जांचें",
    analyzing: "जांच हो रही है...",
    addSymptoms: "पहले फसल फोटो या लक्षण जोड़ें।",
    answerEyebrow: "Grounded response",
    answerTitle: "Farming Consultant जवाब",
    emptyAnswer: "सवाल पूछें, signals refresh करें, या फसल फोटो upload करें।",
    defaultSafety: "यह prototype सलाह है। गंभीर फसल समस्या और मंडी भाव स्थानीय स्रोत से confirm करें।",
    weather: "मौसम",
    rain: "बारिश",
    mandi: "मंडी",
    openMeteoUnavailable: "Open-Meteo signal अभी उपलब्ध नहीं है।",
    marketUnavailable: "Fallback market signal अभी उपलब्ध नहीं है।",
    estValue: "अनुमानित मूल्य",
    diagnosisConfidence: "निदान विश्वास",
    confNote: "AI इस पहचान को लेकर कितना निश्चित है (फसल की गुणवत्ता नहीं)",
    marketSignal: "मंडी संकेत",
    confidence: "विश्वास",
    weatherAlert: "मौसम चेतावनी",
    noAlert: "कोई चेतावनी नहीं",
    source: "स्रोत",
    steps: "कदम",
    possibleIssue: "संभावित समस्या",
    visualSigns: "दिखने वाले लक्षण",
    organicTreatment: "जैविक उपचार",
    escalateIf: "कब अधिकारी से पूछें",
    localFallback: "Local fallback",
    diseaseFallback: "Local disease KB fallback",
    geminiRag: "Gemini + local RAG",
    geminiDisease: "Gemini image triage",
    chatTab: "सलाहकार चैट",
    chatTitle: "किसान सलाहकार से पूछें",
    chatEyebrow: "सलाहकार",
    chatGreeting: "नमस्ते! मंडी भाव, मौसम या खेती की सलाह के लिए पूछें। फसल रोग के लिए Module 2 इस्तेमाल करें।",
    listen: "सुनें",
    diseaseResultTitle: "रोग परिणाम",
    youLabel: "आप",
    quickPrompts: [
      "क्या अभी प्याज बेचना चाहिए?",
      "कल बारिश होगी क्या? नीम spray कब करूं?",
      "मेरे पत्तों पर brown spots हैं, जैविक इलाज बताओ।",
      "मूंग का भाव गिर रहा है या बढ़ रहा है?"
    ]
  },
  en: {
    htmlLang: "en",
    brandTagline: "Voice-first natural farming consultant — ChatGPT + Open-Meteo + AgMarknet",
    languageLabel: "Language",
    serviceStatus: "Vercel-ready prototype",
    heroTitle: "Ask by voice. Send a crop photo. Get safe organic advice.",
    heroSubtitle: "Weather, mandi trends, and crop disease triage for farmers moving to natural farming.",
    recordStatus: "Tap to record — uses browser Voice API, free and instant.",
    recordUnavailable: "Browser recording is unavailable. Type the question instead.",
    recording: "Recording... tap again to stop.",
    micPermission: "Microphone permission is needed, or type the question.",
    sendingAudio: "Listening...",
    transcribed: "Got it — ask now!",
    noSpeech: "No speech detected.",
    whisperConfig: "Type the question or allow microphone access.",
    defaultQuery: "Should I sell onions now? Will it rain tomorrow?",
    queryPlaceholder: "Ask by voice or type your question",
    ask: "Ask",
    thinking: "Thinking...",
    district: "District",
    crop: "Crop",
    landUnit: "Land unit",
    area: "Area",
    moduleOne: "Module 1",
    moduleTwo: "Module 2",
    moduleOneTab: "Module 1: Weather & Market",
    moduleTwoTab: "Module 2: Disease",
    signalsTitle: "Weather & Market Intelligence",
    diseaseTitle: "Disease Identification & Organic Treatment",
    cropPhoto: "Crop photo",
    uploadPhoto: "Upload/take leaf photo",
    noPhoto: "No photo selected",
    chooseImage: "Choose an image file",
    imageTooLarge: "Use an image under 5 MB",
    symptoms: "Symptoms",
    symptomsPlaceholder: "Example: Leaves are yellowing, brown spots appeared, and it got worse after rain.",
    analyzeDisease: "Analyze disease",
    analyzing: "Analyzing...",
    addSymptoms: "Add a crop photo or symptom description first.",
    answerEyebrow: "Grounded response",
    answerTitle: "Farming Consultant answer",
    emptyAnswer: "Ask a question, refresh signals, or upload a crop photo to begin.",
    defaultSafety: "Prototype advice. Confirm severe crop issues and mandi prices locally.",
    weather: "Weather",
    rain: "rain",
    mandi: "Mandi",
    openMeteoUnavailable: "Open-Meteo signal unavailable.",
    marketUnavailable: "Fallback market signal unavailable.",
    estValue: "Est. gross value",
    diagnosisConfidence: "Diagnosis confidence",
    confNote: "how sure the AI is about this identification (not crop quality)",
    marketSignal: "Market signal",
    confidence: "Confidence",
    weatherAlert: "Weather alert",
    noAlert: "No alert",
    source: "Source",
    steps: "Steps",
    possibleIssue: "Possible issue",
    visualSigns: "Visual signs",
    organicTreatment: "Organic treatment",
    escalateIf: "Escalate if",
    localFallback: "Local fallback",
    diseaseFallback: "Local disease KB fallback",
    geminiRag: "Gemini + local RAG",
    geminiDisease: "Gemini image triage",
    chatTab: "Consultant Chat",
    chatTitle: "Ask the Farming Consultant",
    chatEyebrow: "Consultant",
    chatGreeting: "Namaste! Ask about mandi prices, weather, or farming advice. For crop disease, use Module 2.",
    listen: "Listen",
    diseaseResultTitle: "Disease result",
    youLabel: "You",
    quickPrompts: [
      "Should I sell onions now?",
      "Will it rain tomorrow? When should I spray neem?",
      "My leaves have brown spots. Give organic treatment.",
      "Is the moong price falling or rising?"
    ]
  }
};

function cloneFallback(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
    return response.json();
  } catch (error) {
    console.warn(`Using embedded fallback for ${path}`, error);
    return cloneFallback(fallback);
  }
}

async function boot() {
  [state.districts, state.market] = await Promise.all([
    loadJson("/knowledge_base/districts.json", FALLBACK_DISTRICTS),
    loadJson("/knowledge_base/market_fallback.json", FALLBACK_MARKET)
  ]);
  if (!Array.isArray(state.districts) || !state.districts.length) state.districts = cloneFallback(FALLBACK_DISTRICTS);
  if (!Array.isArray(state.market?.crops) || !state.market.crops.length) state.market = cloneFallback(FALLBACK_MARKET);
  populateControls();
  bindEvents();
  applyLanguage({ resetQuery: true });
  await refreshSignals();
}

function populateControls() {
  dom.districtSelect.innerHTML = state.districts.map((district) =>
    `<option value="${district.id}">${district.name}</option>`
  ).join("");
  dom.cropSelect.innerHTML = state.market.crops.map((crop) =>
    `<option value="${crop.id}">${crop.name}</option>`
  ).join("");
  dom.districtSelect.value = state.districtId;
  dom.cropSelect.value = state.cropId;
  dom.unitSelect.value = state.unit;
  dom.areaInput.value = state.area;
  if (dom.areaValue) dom.areaValue.textContent = state.area;
}

function bindEvents() {
  dom.language.addEventListener("change", () => {
    const shouldResetQuery = shouldReplaceQuery();
    state.language = dom.language.value;
    applyLanguage({ resetQuery: shouldResetQuery });
    refreshSignals(); // weather + market re-localize (server returns localized text)
    // Re-run the disease triage in the new language so the whole result is
    // consistent (not just the labels) when the farmer toggles languages.
    if (state.diseaseResult && (state.image || dom.symptomInput.value.trim())) analyzeDisease();
  });
  dom.districtSelect.addEventListener("change", () => {
    state.districtId = dom.districtSelect.value;
    refreshSignals();
  });
  dom.cropSelect.addEventListener("change", () => {
    state.cropId = dom.cropSelect.value;
    refreshSignals();
  });
  dom.unitSelect.addEventListener("change", () => {
    state.unit = dom.unitSelect.value;
    if (state.lastSignals) renderSignals(state.lastSignals.weather, state.lastSignals.market);
  });
  dom.areaInput.addEventListener("input", () => {
    state.area = Number(dom.areaInput.value) || 1;
    if (dom.areaValue) dom.areaValue.textContent = state.area;
    // Area changes the estimated value (not the price) — re-render from cache, no refetch.
    if (state.lastSignals) renderSignals(state.lastSignals.weather, state.lastSignals.market);
  });
  dom.moduleTabs.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });
  dom.askButton.addEventListener("click", askAdvisor);
  dom.queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") askAdvisor();
  });
  dom.refreshSignals.addEventListener("click", refreshSignals);
  dom.cropImage.addEventListener("change", handleImage);
  dom.diseaseButton.addEventListener("click", analyzeDisease);
  dom.recordButton.addEventListener("click", toggleRecording);
  // Voice plays ONLY on a button click (no auto-speak on render).
  dom.diseaseReplayButton.addEventListener("click", () => speak(state.diseaseSpeakText));
  dom.chatLog.addEventListener("click", (event) => {
    const button = event.target.closest(".chat-listen");
    if (button) speak(button.closest(".chat-msg")?.dataset.voice || "");
  });
}

function getCopy() {
  return COPY[state.language] || COPY.hinglish;
}

function t(key) {
  return getCopy()[key] ?? COPY.hinglish[key] ?? key;
}

function allDefaultQueries() {
  return Object.values(COPY).flatMap((copy) => [copy.defaultQuery, ...copy.quickPrompts]);
}

function shouldReplaceQuery() {
  const value = dom.queryInput.value.trim();
  return !value || allDefaultQueries().includes(value);
}

function applyLanguage({ resetQuery = false } = {}) {
  document.documentElement.lang = t("htmlLang");
  dom.brandTagline.textContent = t("brandTagline");
  dom.languageLabel.textContent = t("languageLabel");

  // Tabs
  dom.chatTab.textContent = t("chatTab");
  dom.moduleOneTab.textContent = t("moduleOneTab");
  dom.moduleTwoTab.textContent = t("moduleTwoTab");

  // Tab 1: chat
  dom.chatEyebrow.textContent = t("chatEyebrow");
  dom.chatTitle.textContent = t("chatTitle");
  dom.recordStatus.textContent = t("recordStatus");
  dom.queryInput.placeholder = t("queryPlaceholder");
  if (resetQuery) dom.queryInput.value = t("defaultQuery");
  setButtonLabel(dom.askButton, t("ask"));
  dom.recordButton.setAttribute("aria-label", t("recordStatus"));

  // Tab 2: Module 1
  dom.districtLabel.textContent = t("district");
  dom.cropLabel.textContent = t("crop");
  dom.unitLabel.textContent = t("landUnit");
  dom.areaLabel.textContent = t("area");
  dom.moduleOneLabel.textContent = t("moduleOne");
  dom.signalsTitle.textContent = t("signalsTitle");
  dom.refreshSignals.setAttribute("aria-label", t("signalsTitle"));

  // Tab 3: Module 2
  dom.moduleTwoLabel.textContent = t("moduleTwo");
  dom.diseaseTitle.textContent = t("diseaseTitle");
  dom.cropPhotoLabel.textContent = t("cropPhoto");
  if (!state.image) {
    dom.imageLabel.textContent = t("uploadPhoto");
    dom.imagePreview.innerHTML = `<span id="noPhotoLabel">${escapeHtml(t("noPhoto"))}</span>`;
  }
  dom.symptomLabel.textContent = t("symptoms");
  dom.symptomInput.placeholder = t("symptomsPlaceholder");
  setButtonLabel(dom.diseaseButton, t("analyzeDisease"));
  dom.diseaseAnswerEyebrow.textContent = t("answerEyebrow");
  dom.diseaseAnswerTitle.textContent = t("diseaseResultTitle");
  dom.diseaseReplayButton.setAttribute("aria-label", t("listen"));
  if (!state.diseaseResult) dom.diseaseAnswerText.textContent = t("emptyAnswer");

  renderQuickPrompts();
  ensureChatGreeting();
  if (state.diseaseResult) renderDiseaseResult(state.diseaseResult, state.diseaseSource, { silent: true });
}

// Seed the chat with a greeting bubble while it's empty (re-localizes if the
// language changes before the first question).
function ensureChatGreeting() {
  if (state.chatCount > 0) return;
  dom.chatLog.innerHTML = `<div class="chat-msg assistant"><div class="chat-bubble">${escapeHtml(t("chatGreeting"))}</div></div>`;
}

function renderQuickPrompts() {
  dom.quickGrid.innerHTML = t("quickPrompts").map((prompt) =>
    `<button class="chip" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
  ).join("");
  dom.quickGrid.onclick = (event) => {
    const button = event.target.closest("[data-prompt]");
    if (!button) return;
    dom.queryInput.value = button.dataset.prompt;
    askAdvisor();
  };
}

function switchTab(tabId) {
  state.activeTab = tabId || "chat";
  dom.moduleTabs.forEach((button) => {
    const isActive = button.dataset.tab === state.activeTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  dom.modulePanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === state.activeTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

async function refreshSignals() {
  const languageParam = encodeURIComponent(state.language);
  const weatherPromise = fetchJson(`/api/weather?district=${encodeURIComponent(state.districtId)}&language=${languageParam}`).catch((error) => ({ error: error.message }));
  const marketPromise = fetchJson(`/api/market?district=${encodeURIComponent(state.districtId)}&crop=${encodeURIComponent(state.cropId)}&language=${languageParam}`).catch((error) => ({ error: error.message }));
  const [weather, market] = await Promise.all([weatherPromise, marketPromise]);
  state.lastSignals = { weather, market };
  renderSignals(weather, market);
}

function renderSignals(weather, market) {
  const weatherSummary = weather.summary || {};
  const marketSummary = market.summary || {};
  const weatherSource = weather.live === false ? `${weather.source || t("openMeteoUnavailable")}: ${weather.warning || t("openMeteoUnavailable")}` : weather.source || "Open-Meteo";
  const marketSource = market.live === false ? `${market.source || t("marketUnavailable")}: ${market.warning || marketSummary.warning || t("marketUnavailable")}` : market.source || marketSummary.source || "Market API";

  // Area-based estimate: price (₹/quintal) × yield (quintal/acre) × area (in acres).
  // 1 bigha ≈ 0.25 acre (Haryana). Re-rendered live when the area slider moves.
  const crop = selectedCrop();
  const yieldPerAcre = Number(crop?.yieldPerAcre) || 0;
  const acres = state.unit === "bigha" ? state.area * 0.25 : state.area;
  const price = Number(marketSummary.latestPrice) || 0;
  const estValue = (yieldPerAcre && price) ? Math.round(price * yieldPerAcre * acres) : null;
  const estLine = estValue
    ? `<p class="est-value"><strong>${escapeHtml(t("estValue"))}:</strong> ₹${estValue.toLocaleString("en-IN")} <small>(${state.area} ${escapeHtml(state.unit)} × ~${yieldPerAcre} ${escapeHtml(crop.unit)}/acre)</small></p>`
    : "";

  dom.signalGrid.innerHTML = `
    <section class="signal-card">
      <h3>${escapeHtml(t("weather"))}</h3>
      <p class="metric">${weatherSummary.rainProbability ?? "--"}% ${escapeHtml(t("rain"))}</p>
      <p>${escapeHtml(weatherSummary.sprayWindow || weather.error || t("openMeteoUnavailable"))}</p>
      <span>${escapeHtml(weatherSource)}</span>
    </section>
    <section class="signal-card">
      <h3>${escapeHtml(t("mandi"))}</h3>
      <p class="metric">₹${marketSummary.latestPrice ?? "--"}</p>
      <p>${escapeHtml(marketSummary.voiceResponse || market.error || t("marketUnavailable"))}</p>
      ${estLine}
      <span>${escapeHtml(marketSource)}</span>
      <canvas class="sparkline" width="260" height="58" data-history="${escapeHtml(JSON.stringify(marketSummary.history || []))}"></canvas>
    </section>
  `;
  drawSparklines();
}

async function askAdvisor() {
  const query = dom.queryInput.value.trim();
  if (!query) {
    dom.queryInput.focus();
    return;
  }
  appendChatUser(query);
  dom.queryInput.value = "";
  const pending = appendChatPending();
  setBusy(dom.askButton, true, t("thinking"));
  try {
    const payload = await fetchJson("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildContext({ query }))
    });
    renderChatAnswer(pending, payload.result, payload.source || (payload.modelBacked ? t("geminiRag") : t("localFallback")));
  } catch (error) {
    renderChatError(pending, error.message);
  } finally {
    setBusy(dom.askButton, false, t("ask"));
  }
}

function handleImage() {
  const file = dom.cropImage.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    dom.imageLabel.textContent = t("chooseImage");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    dom.imageLabel.textContent = t("imageTooLarge");
    return;
  }
  dom.imageLabel.textContent = file.name;
  dom.imagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Selected crop issue" />`;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.image = {
      mimeType: file.type,
      data: String(reader.result || "").split(",")[1] || ""
    };
  });
  reader.readAsDataURL(file);
}

async function analyzeDisease() {
  const description = dom.symptomInput.value.trim();
  if (!state.image && !description) {
    dom.diseaseAnswerText.textContent = t("addSymptoms");
    dom.diseaseResultGrid.innerHTML = "";
    return;
  }
  const requestId = ++state.diseaseRequestId;
  setBusy(dom.diseaseButton, true, t("analyzing"));
  try {
    const crop = selectedCrop();
    const district = selectedDistrict();
    const payload = await fetchJson("/api/disease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop: crop.name,
        district: district.name,
        language: state.language,
        description,
        image: state.image
      })
    });
    if (requestId !== state.diseaseRequestId) return;
    renderDiseaseResult(payload.result, payload.source || (payload.modelBacked ? t("geminiDisease") : t("diseaseFallback")));
  } catch (error) {
    if (requestId !== state.diseaseRequestId) return;
    dom.diseaseAnswerText.textContent = error.message;
    dom.diseaseResultGrid.innerHTML = "";
  } finally {
    if (requestId === state.diseaseRequestId) setBusy(dom.diseaseButton, false, t("analyzeDisease"));
  }
}

async function toggleRecording() {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
    return;
  }

  // Prefer browser Web Speech API — free, no server, works on Android Chrome
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = state.language === "en" ? "en-IN" : "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    dom.recordButton.classList.add("is-recording");
    dom.recordStatus.textContent = t("recording");
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      dom.queryInput.value = transcript;
      dom.recordButton.classList.remove("is-recording");
      dom.recordStatus.textContent = transcript ? t("transcribed") : t("noSpeech");
    };
    recognition.onend = () => dom.recordButton.classList.remove("is-recording");
    recognition.onerror = () => {
      dom.recordButton.classList.remove("is-recording");
      dom.recordStatus.textContent = t("micPermission");
    };
    recognition.start();
    return;
  }

  // Fallback: MediaRecorder → HF Whisper server route
  if (!navigator.mediaDevices?.getUserMedia) {
    dom.recordStatus.textContent = t("recordUnavailable");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.chunks = [];
    state.mediaRecorder = new MediaRecorder(stream);
    state.mediaRecorder.addEventListener("dataavailable", (event) => state.chunks.push(event.data));
    state.mediaRecorder.addEventListener("stop", () => transcribeRecording(stream));
    state.mediaRecorder.start();
    dom.recordButton.classList.add("is-recording");
    dom.recordStatus.textContent = t("recording");
  } catch {
    dom.recordStatus.textContent = t("micPermission");
  }
}

async function transcribeRecording(stream) {
  stream.getTracks().forEach((track) => track.stop());
  dom.recordButton.classList.remove("is-recording");
  dom.recordStatus.textContent = t("sendingAudio");
  const blob = new Blob(state.chunks, { type: state.chunks[0]?.type || "audio/webm" });
  const data = await blobToBase64(blob);
  try {
    const payload = await fetchJson("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: { mimeType: blob.type, data } })
    });
    if (payload.source === "browser-stt") {
      dom.recordStatus.textContent = t("recordUnavailable");
      return;
    }
    dom.queryInput.value = payload.text || "";
    dom.recordStatus.textContent = payload.text ? t("transcribed") : t("noSpeech");
  } catch {
    dom.recordStatus.textContent = t("whisperConfig");
  }
}

function confidenceClass(conf) {
  if (conf >= 0.75) return "conf-high";
  if (conf >= 0.5) return "conf-mid";
  return "conf-low";
}

function signalClass(signal) {
  const map = { sell: "sig-sell", hold: "sig-hold", wait: "sig-wait" };
  return map[signal] || "";
}

// ---- Consultant chat (Tab 1) ----
function scrollChat() {
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
}

function appendChatUser(text) {
  state.chatCount += 1;
  const div = document.createElement("div");
  div.className = "chat-msg user";
  div.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
  dom.chatLog.appendChild(div);
  scrollChat();
}

function appendChatPending() {
  const div = document.createElement("div");
  div.className = "chat-msg assistant";
  div.innerHTML = `<div class="chat-bubble"><span class="chat-typing">${escapeHtml(t("thinking"))}</span></div>`;
  dom.chatLog.appendChild(div);
  scrollChat();
  return div;
}

function renderChatAnswer(el, result, source) {
  const voice = result.voice_response || "";
  el.dataset.voice = voice; // read by the per-message Listen button
  const steps = Array.isArray(result.remedy_steps) ? result.remedy_steps : [];
  const meta = [
    `${escapeHtml(t("marketSignal"))}: <span class="${signalClass(result.market_signal)}">${escapeHtml(result.market_signal || "wait")}</span>`,
    `${escapeHtml(t("confidence"))}: <span class="${confidenceClass(result.confidence || 0)}">${Math.round((result.confidence || 0) * 100)}%</span>`
  ].join(" · ");
  el.innerHTML = `
    <div class="chat-bubble">
      <p class="chat-voice">${escapeHtml(voice)}</p>
      ${steps.length ? `<ul class="chat-steps">${listItems(steps)}</ul>` : ""}
      ${result.weather_alert ? `<p class="chat-alert">${escapeHtml(t("weatherAlert"))}: ${escapeHtml(result.weather_alert)}</p>` : ""}
      <div class="chat-meta">${meta}</div>
      <div class="chat-foot">
        <button class="chat-listen" type="button">🔊 ${escapeHtml(t("listen"))}</button>
        <span class="chat-source">${escapeHtml(source)}</span>
      </div>
      ${result.safety_note ? `<p class="chat-safety">${escapeHtml(result.safety_note)}</p>` : ""}
    </div>`;
  scrollChat();
}

function renderChatError(el, message) {
  el.dataset.voice = "";
  el.innerHTML = `<div class="chat-bubble chat-bubble-error">${escapeHtml(message)}</div>`;
  scrollChat();
}

// ---- Disease output (Tab 3) ----
function renderDiseaseResult(result, source) {
  state.diseaseResult = result;
  state.diseaseSource = source;
  state.diseaseSpeakText = result.voice_response || "";
  dom.diseaseAnswerText.textContent = result.voice_response || "";
  dom.diseaseSafetyLine.textContent = result.safety_note || t("defaultSafety");
  dom.diseaseResultGrid.innerHTML = `
    <article><strong>${escapeHtml(t("possibleIssue"))}</strong><span>${escapeHtml(result.possible_issue || "")}</span></article>
    <article><strong>${escapeHtml(t("diagnosisConfidence"))}</strong><span class="${confidenceClass(result.confidence || 0)}">${Math.round((result.confidence || 0) * 100)}%</span><small class="conf-note">${escapeHtml(t("confNote"))}</small></article>
    <article><strong>${escapeHtml(t("source"))}</strong><span>${escapeHtml(source)}</span></article>
    <article class="wide"><strong>${escapeHtml(t("visualSigns"))}</strong><ul>${listItems(result.visual_signs)}</ul></article>
    <article class="wide"><strong>${escapeHtml(t("organicTreatment"))}</strong><ul>${listItems(result.organic_treatment)}</ul></article>
    <article class="wide"><strong>${escapeHtml(t("escalateIf"))}</strong><ul>${listItems(result.escalation)}</ul></article>
  `;
  // Voice plays only when the Listen button is clicked.
}

// Boot-time / fatal errors surface in the chat log.
function renderError(message) {
  if (dom.chatLog) {
    dom.chatLog.innerHTML = `<div class="chat-msg assistant"><div class="chat-bubble chat-bubble-error">${escapeHtml(message)}</div></div>`;
  }
}

function drawSparklines() {
  document.querySelectorAll(".sparkline").forEach((canvas) => {
    const history = JSON.parse(canvas.dataset.history || "[]");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (history.length < 2) return;
    const values = history.map((item) => item.modal);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const w = canvas.width;
    const h = canvas.height;
    ctx.strokeStyle = "#1e6fb8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = (index / (values.length - 1)) * (w - 12) + 6;
      const y = h - 18 - ((value - min) / range) * (h - 30);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#667269";
    ctx.textAlign = "left";
    ctx.fillText(`₹${values[0]}`, 4, h - 2);
    const last = values[values.length - 1];
    ctx.fillStyle = last >= values[0] ? "#2f7d4f" : "#8a4b00";
    ctx.textAlign = "right";
    ctx.fillText(`₹${last}`, w - 4, h - 2);
  });
}

function selectedDistrict() {
  return state.districts.find((item) => item.id === state.districtId) || state.districts[0];
}

function selectedCrop() {
  return state.market.crops.find((item) => item.id === state.cropId) || state.market.crops[0];
}

function buildContext(extra = {}) {
  return {
    ...extra,
    districtId: state.districtId,
    cropId: state.cropId,
    language: state.language,
    unit: state.unit,
    area: state.area,
    weatherSummary: state.lastSignals?.weather?.summary || null,
    marketSummary: state.lastSignals?.market?.summary || null
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.detail || payload.error || "Request failed");
  return payload;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result).split(",")[1] || ""));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

function setBusy(button, busy, text) {
  button.disabled = busy;
  setButtonLabel(button, text);
}

function setButtonLabel(button, text) {
  Array.from(button.childNodes)
    .filter((node) => node.nodeType === 3)
    .forEach((node) => node.remove());
  button.append(document.createTextNode(` ${text}`));
}

function listItems(items = []) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language === "en" ? "en-IN" : "hi-IN";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot().catch((error) => renderError(error.message));
