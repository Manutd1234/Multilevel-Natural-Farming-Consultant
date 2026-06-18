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
  lastResult: null,
  lastResultType: null,
  lastResultSource: null,
  mediaRecorder: null,
  chunks: [],
  speakingText: "",
  advisorRequestId: 0,
  diseaseRequestId: 0,
  activeTab: "module-one"
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

const dom = {
  language: document.querySelector("#language"),
  brandTagline: document.querySelector("#brandTagline"),
  languageLabel: document.querySelector("#languageLabel"),
  districtSelect: document.querySelector("#districtSelect"),
  cropSelect: document.querySelector("#cropSelect"),
  unitSelect: document.querySelector("#unitSelect"),
  areaInput: document.querySelector("#areaInput"),
  districtLabel: document.querySelector("#districtLabel"),
  cropLabel: document.querySelector("#cropLabel"),
  unitLabel: document.querySelector("#unitLabel"),
  areaLabel: document.querySelector("#areaLabel"),
  recordButton: document.querySelector("#recordButton"),
  recordStatus: document.querySelector("#recordStatus"),
  queryInput: document.querySelector("#queryInput"),
  askButton: document.querySelector("#askButton"),
  quickGrid: document.querySelector("#quickGrid"),
  moduleTabs: document.querySelectorAll("[data-tab]"),
  modulePanels: document.querySelectorAll("[data-tab-panel]"),
  moduleOneTab: document.querySelector("#moduleOneTab"),
  moduleTwoTab: document.querySelector("#moduleTwoTab"),
  refreshSignals: document.querySelector("#refreshSignals"),
  signalGrid: document.querySelector("#signalGrid"),
  heroTitle: document.querySelector("#hero-title"),
  heroSubtitle: document.querySelector("#heroSubtitle"),
  moduleOneLabel: document.querySelector("#moduleOneLabel"),
  moduleTwoLabel: document.querySelector("#moduleTwoLabel"),
  signalsTitle: document.querySelector("#signalsTitle"),
  diseaseTitle: document.querySelector("#diseaseTitle"),
  cropPhotoLabel: document.querySelector("#cropPhotoLabel"),
  cropImage: document.querySelector("#cropImage"),
  imageLabel: document.querySelector("#imageLabel"),
  imagePreview: document.querySelector("#imagePreview"),
  noPhotoLabel: document.querySelector("#noPhotoLabel"),
  symptomLabel: document.querySelector("#symptomLabel"),
  symptomInput: document.querySelector("#symptomInput"),
  diseaseButton: document.querySelector("#diseaseButton"),
  replayButton: document.querySelector("#replayButton"),
  answerEyebrow: document.querySelector("#answerEyebrow"),
  answerTitle: document.querySelector("#answer-title"),
  answerText: document.querySelector("#answerText"),
  resultGrid: document.querySelector("#resultGrid"),
  safetyLine: document.querySelector("#safetyLine"),
  smsLabel: document.querySelector("#smsLabel"),
  smsPhone: document.querySelector("#smsPhone"),
  smsButton: document.querySelector("#smsButton"),
  smsStatus: document.querySelector("#smsStatus"),
  serviceStatus: document.querySelector("#serviceStatus")
};

const COPY = {
  hinglish: {
    htmlLang: "hi",
    brandTagline: "Gemini + Open-Meteo + bilingual voice farming consultant",
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
    moduleTwoTab: "Module 2: Disease Treatment",
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
    smsTitle: "Yeh salah SMS par bhejein",
    smsPlaceholder: "Phone number country code ke saath, jaise +9198XXXXXXXX",
    sendSms: "Send SMS",
    sendingSms: "Bhej rahe hain...",
    smsSent: "SMS bhej diya ✓",
    smsFailed: "SMS nahi gaya:",
    smsNotConfigured: "SMS abhi set up nahi hai (Vercel mein Twilio keys add karein).",
    smsNoAnswer: "Pehle ek jawab lein, phir SMS bhejein.",
    smsNeedPhone: "Country code ke saath phone number daalein.",
    quickPrompts: [
      "Kya abhi pyaaz bechna chahiye?",
      "Kal barish hogi kya? Neem spray kab karun?",
      "Mere patton par brown spots hain, organic ilaaj batao.",
      "Moong ka bhav gir raha hai ya badh raha hai?"
    ]
  },
  hi: {
    htmlLang: "hi",
    brandTagline: "Gemini + Open-Meteo के साथ voice-first प्राकृतिक खेती सलाह",
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
    moduleTwoTab: "मॉड्यूल 2: रोग उपचार",
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
    smsTitle: "यह सलाह SMS पर भेजें",
    smsPlaceholder: "country code के साथ फोन नंबर, जैसे +9198XXXXXXXX",
    sendSms: "SMS भेजें",
    sendingSms: "भेज रहे हैं...",
    smsSent: "SMS भेज दिया ✓",
    smsFailed: "SMS नहीं गया:",
    smsNotConfigured: "SMS अभी set up नहीं है (Vercel में Twilio keys add करें)।",
    smsNoAnswer: "पहले एक जवाब लें, फिर SMS भेजें।",
    smsNeedPhone: "country code के साथ फोन नंबर डालें।",
    quickPrompts: [
      "क्या अभी प्याज बेचना चाहिए?",
      "कल बारिश होगी क्या? नीम spray कब करूं?",
      "मेरे पत्तों पर brown spots हैं, जैविक इलाज बताओ।",
      "मूंग का भाव गिर रहा है या बढ़ रहा है?"
    ]
  },
  en: {
    htmlLang: "en",
    brandTagline: "Voice-first natural farming consultant — Gemini + Open-Meteo",
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
    moduleTwoTab: "Module 2: Disease Treatment",
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
    smsTitle: "Send this advice as SMS",
    smsPlaceholder: "Phone with country code, e.g. +9198XXXXXXXX",
    sendSms: "Send SMS",
    sendingSms: "Sending...",
    smsSent: "SMS sent ✓",
    smsFailed: "SMS failed:",
    smsNotConfigured: "SMS isn't set up yet (add Twilio keys in Vercel).",
    smsNoAnswer: "Get an answer first, then send it as SMS.",
    smsNeedPhone: "Enter a phone number with country code.",
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
}

function bindEvents() {
  dom.language.addEventListener("change", () => {
    const shouldResetQuery = shouldReplaceQuery();
    state.language = dom.language.value;
    applyLanguage({ resetQuery: shouldResetQuery });
    refreshSignals();
  });
  dom.districtSelect.addEventListener("change", () => {
    state.districtId = dom.districtSelect.value;
    refreshSignals();
  });
  dom.cropSelect.addEventListener("change", () => {
    state.cropId = dom.cropSelect.value;
    refreshSignals();
  });
  dom.unitSelect.addEventListener("change", () => state.unit = dom.unitSelect.value);
  dom.areaInput.addEventListener("input", () => state.area = Number(dom.areaInput.value) || 1);
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
  dom.replayButton.addEventListener("click", () => speak(state.speakingText));
  dom.smsButton.addEventListener("click", sendSmsAdvisory);
  dom.smsPhone.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendSmsAdvisory();
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
  dom.serviceStatus.textContent = t("serviceStatus");
  dom.heroTitle.textContent = t("heroTitle");
  dom.heroSubtitle.textContent = t("heroSubtitle");
  dom.recordStatus.textContent = t("recordStatus");
  dom.queryInput.placeholder = t("queryPlaceholder");
  if (resetQuery) dom.queryInput.value = t("defaultQuery");
  setButtonLabel(dom.askButton, t("ask"));
  dom.districtLabel.textContent = t("district");
  dom.cropLabel.textContent = t("crop");
  dom.unitLabel.textContent = t("landUnit");
  dom.areaLabel.textContent = t("area");
  dom.moduleOneLabel.textContent = t("moduleOne");
  dom.moduleTwoLabel.textContent = t("moduleTwo");
  dom.moduleOneTab.textContent = t("moduleOneTab");
  dom.moduleTwoTab.textContent = t("moduleTwoTab");
  dom.signalsTitle.textContent = t("signalsTitle");
  dom.diseaseTitle.textContent = t("diseaseTitle");
  dom.cropPhotoLabel.textContent = t("cropPhoto");
  if (!state.image) {
    dom.imageLabel.textContent = t("uploadPhoto");
    dom.imagePreview.innerHTML = `<span id="noPhotoLabel">${escapeHtml(t("noPhoto"))}</span>`;
    dom.noPhotoLabel = document.querySelector("#noPhotoLabel");
  }
  dom.symptomLabel.textContent = t("symptoms");
  dom.symptomInput.placeholder = t("symptomsPlaceholder");
  setButtonLabel(dom.diseaseButton, t("analyzeDisease"));
  dom.answerEyebrow.textContent = t("answerEyebrow");
  dom.answerTitle.textContent = t("answerTitle");
  if (!state.speakingText) dom.answerText.textContent = t("emptyAnswer");
  dom.safetyLine.textContent = t("defaultSafety");
  dom.smsLabel.textContent = t("smsTitle");
  dom.smsPhone.placeholder = t("smsPlaceholder");
  setButtonLabel(dom.smsButton, t("sendSms"));
  dom.recordButton.setAttribute("aria-label", t("recordStatus"));
  dom.refreshSignals.setAttribute("aria-label", t("signalsTitle"));
  dom.replayButton.setAttribute("aria-label", t("answerTitle"));
  renderQuickPrompts();
  if (state.lastResult && state.lastResultType === "advisor") {
    renderAdvisorResult(state.lastResult, state.lastResultSource, { silent: true });
  } else if (state.lastResult && state.lastResultType === "disease") {
    renderDiseaseResult(state.lastResult, state.lastResultSource, { silent: true });
  }
}

function renderQuickPrompts() {
  dom.quickGrid.innerHTML = t("quickPrompts").map((prompt) =>
    `<button class="chip" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
  ).join("");
  dom.quickGrid.onclick = (event) => {
    const button = event.target.closest("[data-prompt]");
    if (!button) return;
    dom.queryInput.value = button.dataset.prompt;
    if (/disease|spots|leaf|leaves|रोग|पत्त|धब्ब/i.test(button.dataset.prompt)) switchTab("module-two");
    else switchTab("module-one");
    askAdvisor();
  };
}

function switchTab(tabId) {
  state.activeTab = tabId || "module-one";
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
  const requestId = ++state.advisorRequestId;
  setBusy(dom.askButton, true, t("thinking"));
  try {
    const payload = await fetchJson("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildContext({ query }))
    });
    if (requestId !== state.advisorRequestId) return;
    renderAdvisorResult(payload.result, payload.modelBacked ? t("geminiRag") : t("localFallback"));
  } catch (error) {
    if (requestId !== state.advisorRequestId) return;
    renderError(error.message);
  } finally {
    if (requestId === state.advisorRequestId) setBusy(dom.askButton, false, t("ask"));
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
    renderError(t("addSymptoms"));
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
    renderDiseaseResult(payload.result, payload.modelBacked ? t("geminiDisease") : t("diseaseFallback"));
  } catch (error) {
    if (requestId !== state.diseaseRequestId) return;
    renderError(error.message);
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

function renderAdvisorResult(result, source, { silent = false } = {}) {
  state.lastResult = result;
  state.lastResultType = "advisor";
  state.lastResultSource = source;
  state.speakingText = result.voice_response || "";
  dom.answerText.textContent = result.voice_response || "";
  dom.safetyLine.textContent = result.safety_note || t("defaultSafety");
  const steps = Array.isArray(result.remedy_steps) ? result.remedy_steps : [];
  dom.resultGrid.innerHTML = `
    <article><strong>${escapeHtml(t("marketSignal"))}</strong><span class="${signalClass(result.market_signal)}">${escapeHtml(result.market_signal || "wait")}</span></article>
    <article><strong>${escapeHtml(t("confidence"))}</strong><span class="${confidenceClass(result.confidence || 0)}">${Math.round((result.confidence || 0) * 100)}%</span></article>
    <article><strong>${escapeHtml(t("weatherAlert"))}</strong><span>${escapeHtml(result.weather_alert || t("noAlert"))}</span></article>
    <article><strong>${escapeHtml(t("source"))}</strong><span>${escapeHtml(source)}</span></article>
    <article class="wide"><strong>${escapeHtml(t("steps"))}</strong><ul>${listItems(steps)}</ul></article>
  `;
  if (!silent) speak(state.speakingText);
}

function renderDiseaseResult(result, source, { silent = false } = {}) {
  state.lastResult = result;
  state.lastResultType = "disease";
  state.lastResultSource = source;
  state.speakingText = result.voice_response || "";
  dom.answerText.textContent = result.voice_response || "";
  dom.safetyLine.textContent = result.safety_note || t("defaultSafety");
  dom.resultGrid.innerHTML = `
    <article><strong>${escapeHtml(t("possibleIssue"))}</strong><span>${escapeHtml(result.possible_issue || "")}</span></article>
    <article><strong>${escapeHtml(t("confidence"))}</strong><span class="${confidenceClass(result.confidence || 0)}">${Math.round((result.confidence || 0) * 100)}%</span></article>
    <article><strong>${escapeHtml(t("source"))}</strong><span>${escapeHtml(source)}</span></article>
    <article class="wide"><strong>${escapeHtml(t("visualSigns"))}</strong><ul>${listItems(result.visual_signs)}</ul></article>
    <article class="wide"><strong>${escapeHtml(t("organicTreatment"))}</strong><ul>${listItems(result.organic_treatment)}</ul></article>
    <article class="wide"><strong>${escapeHtml(t("escalateIf"))}</strong><ul>${listItems(result.escalation)}</ul></article>
  `;
  if (!silent) speak(state.speakingText);
}

function renderError(message) {
  dom.answerText.textContent = message;
  dom.resultGrid.innerHTML = "";
}

function buildSmsBody() {
  const result = state.lastResult || {};
  const lines = [result.voice_response || state.speakingText || ""];
  const steps = Array.isArray(result.remedy_steps)
    ? result.remedy_steps
    : Array.isArray(result.organic_treatment)
      ? result.organic_treatment
      : [];
  steps.slice(0, 4).forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  if (result.safety_note) lines.push(result.safety_note);
  return lines.filter(Boolean).join("\n").slice(0, 1500);
}

function showSmsStatus(message, isError = false) {
  dom.smsStatus.hidden = false;
  dom.smsStatus.textContent = message;
  dom.smsStatus.classList.toggle("is-error", Boolean(isError));
}

async function sendSmsAdvisory() {
  if (!state.lastResult || !state.speakingText) {
    showSmsStatus(t("smsNoAnswer"), true);
    return;
  }
  const phone = dom.smsPhone.value.trim();
  if (!phone) {
    showSmsStatus(t("smsNeedPhone"), true);
    dom.smsPhone.focus();
    return;
  }

  setBusy(dom.smsButton, true, t("sendingSms"));
  try {
    const res = await fetchJson("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: buildSmsBody(), language: state.language })
    });
    if (res.sent) showSmsStatus(t("smsSent"));
    else if (res.configured === false) showSmsStatus(t("smsNotConfigured"), true);
    else showSmsStatus(`${t("smsFailed")} ${res.reason || ""}`.trim(), true);
  } catch (error) {
    showSmsStatus(`${t("smsFailed")} ${error.message}`.trim(), true);
  } finally {
    setBusy(dom.smsButton, false, t("sendSms"));
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
