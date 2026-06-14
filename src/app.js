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
  mediaRecorder: null,
  chunks: [],
  speakingText: ""
};

const FALLBACK_DISTRICTS = [
  { id: "hisar", name: "Hisar", state: "Haryana", latitude: 29.1492, longitude: 75.7217, nearestMandi: "Hisar" },
  { id: "karnal", name: "Karnal", state: "Haryana", latitude: 29.6857, longitude: 76.9905, nearestMandi: "Karnal" },
  { id: "sirsa", name: "Sirsa", state: "Haryana", latitude: 29.5336, longitude: 75.0177, nearestMandi: "Sirsa" },
  { id: "sonipat", name: "Sonipat", state: "Haryana", latitude: 28.9931, longitude: 77.0151, nearestMandi: "Sonipat" }
];

const FALLBACK_MARKET = {
  lastUpdated: "2026-06-14",
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
  serviceStatus: document.querySelector("#serviceStatus")
};

const COPY = {
  hinglish: {
    htmlLang: "hi",
    brandTagline: "Option B rebuilt for Gemini + Open-Meteo + Hugging Face Whisper",
    languageLabel: "Language",
    serviceStatus: "Vercel-ready prototype",
    heroTitle: "Bolkar pucho. Photo bhejo. Safe organic salah lo.",
    heroSubtitle: "Weather, mandi trend, aur crop disease triage natural farming farmers ke liye.",
    recordStatus: "Tap to record. Whisper route Vercel par Hugging Face config use karta hai.",
    recordUnavailable: "Browser recording unavailable hai. Question type kar dein.",
    recording: "Recording... stop karne ke liye dobara tap karein.",
    micPermission: "Microphone permission chahiye, ya question type karein.",
    sendingAudio: "Audio Hugging Face Whisper route ko bhej rahe hain...",
    transcribed: "Whisper se transcription ho gaya.",
    noSpeech: "Speech detect nahi hui.",
    whisperConfig: "Type karein ya HF_TOKEN/WHISPER_ENDPOINT_URL configure karein.",
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
    answerTitle: "Kisaan Mitra answer",
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
    quickPrompts: [
      "Kya abhi pyaaz bechna chahiye?",
      "Kal barish hogi kya? Neem spray kab karun?",
      "Mere patton par brown spots hain, organic ilaaj batao.",
      "Moong ka bhav gir raha hai ya badh raha hai?"
    ]
  },
  hi: {
    htmlLang: "hi",
    brandTagline: "Gemini + Open-Meteo + Hugging Face Whisper के साथ Option B",
    languageLabel: "भाषा",
    serviceStatus: "Vercel-ready prototype",
    heroTitle: "बोलकर पूछें। फोटो भेजें। सुरक्षित जैविक सलाह लें।",
    heroSubtitle: "प्राकृतिक खेती अपनाने वाले किसानों के लिए मौसम, मंडी भाव और फसल रोग सलाह।",
    recordStatus: "रिकॉर्ड करने के लिए टैप करें। Whisper route Vercel पर Hugging Face config इस्तेमाल करता है।",
    recordUnavailable: "इस ब्राउज़र में रिकॉर्डिंग उपलब्ध नहीं है। सवाल टाइप करें।",
    recording: "रिकॉर्डिंग चालू है... रोकने के लिए दोबारा टैप करें।",
    micPermission: "माइक्रोफोन अनुमति चाहिए, या सवाल टाइप करें।",
    sendingAudio: "ऑडियो Hugging Face Whisper route को भेजा जा रहा है...",
    transcribed: "Whisper से transcription हो गया।",
    noSpeech: "आवाज़ detect नहीं हुई।",
    whisperConfig: "सवाल टाइप करें या HF_TOKEN/WHISPER_ENDPOINT_URL configure करें।",
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
    answerTitle: "किसान मित्र जवाब",
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
    quickPrompts: [
      "क्या अभी प्याज बेचना चाहिए?",
      "कल बारिश होगी क्या? नीम spray कब करूं?",
      "मेरे पत्तों पर brown spots हैं, जैविक इलाज बताओ।",
      "मूंग का भाव गिर रहा है या बढ़ रहा है?"
    ]
  },
  en: {
    htmlLang: "en",
    brandTagline: "Option B rebuilt for Gemini + Open-Meteo + Hugging Face Whisper",
    languageLabel: "Language",
    serviceStatus: "Vercel-ready prototype",
    heroTitle: "Ask by voice. Send a crop photo. Get safe organic advice.",
    heroSubtitle: "Weather, mandi trends, and crop disease triage for farmers moving to natural farming.",
    recordStatus: "Tap to record. The Whisper route uses Hugging Face config on Vercel.",
    recordUnavailable: "Browser recording is unavailable. Type the question instead.",
    recording: "Recording... tap again to stop.",
    micPermission: "Microphone permission is needed, or type the question.",
    sendingAudio: "Sending audio to the Hugging Face Whisper route...",
    transcribed: "Transcribed with Whisper.",
    noSpeech: "No speech detected.",
    whisperConfig: "Type the question or configure HF_TOKEN/WHISPER_ENDPOINT_URL.",
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
    answerTitle: "Kisaan Mitra answer",
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
  dom.askButton.addEventListener("click", askAdvisor);
  dom.queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") askAdvisor();
  });
  dom.refreshSignals.addEventListener("click", refreshSignals);
  dom.cropImage.addEventListener("change", handleImage);
  dom.diseaseButton.addEventListener("click", analyzeDisease);
  dom.recordButton.addEventListener("click", toggleRecording);
  dom.replayButton.addEventListener("click", () => speak(state.speakingText));
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
  dom.askButton.lastChild.textContent = ` ${t("ask")}`;
  dom.districtLabel.textContent = t("district");
  dom.cropLabel.textContent = t("crop");
  dom.unitLabel.textContent = t("landUnit");
  dom.areaLabel.textContent = t("area");
  dom.moduleOneLabel.textContent = t("moduleOne");
  dom.moduleTwoLabel.textContent = t("moduleTwo");
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
  dom.diseaseButton.lastChild.textContent = ` ${t("analyzeDisease")}`;
  dom.answerEyebrow.textContent = t("answerEyebrow");
  dom.answerTitle.textContent = t("answerTitle");
  if (!state.speakingText) dom.answerText.textContent = t("emptyAnswer");
  dom.safetyLine.textContent = t("defaultSafety");
  dom.recordButton.setAttribute("aria-label", t("recordStatus"));
  dom.refreshSignals.setAttribute("aria-label", t("signalsTitle"));
  dom.replayButton.setAttribute("aria-label", t("answerTitle"));
  renderQuickPrompts();
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
  dom.signalGrid.innerHTML = `
    <section class="signal-card">
      <h3>${escapeHtml(t("weather"))}</h3>
      <p class="metric">${weatherSummary.rainProbability ?? "--"}% ${escapeHtml(t("rain"))}</p>
      <p>${escapeHtml(weatherSummary.sprayWindow || weather.error || t("openMeteoUnavailable"))}</p>
      <span>${escapeHtml(weather.source || "Open-Meteo")}</span>
    </section>
    <section class="signal-card">
      <h3>${escapeHtml(t("mandi"))}</h3>
      <p class="metric">₹${marketSummary.latestPrice ?? "--"}</p>
      <p>${escapeHtml(marketSummary.voiceResponse || market.error || t("marketUnavailable"))}</p>
      <canvas class="sparkline" width="260" height="58" data-history="${escapeHtml(JSON.stringify(marketSummary.history || []))}"></canvas>
    </section>
  `;
  drawSparklines();
}

async function askAdvisor() {
  setBusy(dom.askButton, true, t("thinking"));
  try {
    const payload = await fetchJson("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildContext({ query: dom.queryInput.value.trim() }))
    });
    renderAdvisorResult(payload.result, payload.modelBacked ? t("geminiRag") : t("localFallback"));
  } catch (error) {
    renderError(error.message);
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
    renderError(t("addSymptoms"));
    return;
  }
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
    renderDiseaseResult(payload.result, payload.modelBacked ? t("geminiDisease") : t("diseaseFallback"));
  } catch (error) {
    renderError(error.message);
  } finally {
    setBusy(dom.diseaseButton, false, t("analyzeDisease"));
  }
}

async function toggleRecording() {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
    return;
  }
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
    dom.queryInput.value = payload.text || "";
    dom.recordStatus.textContent = payload.text ? t("transcribed") : t("noSpeech");
  } catch (error) {
    dom.recordStatus.textContent = `${error.message} ${t("whisperConfig")}`;
  }
}

function renderAdvisorResult(result, source) {
  state.speakingText = result.voice_response;
  dom.answerText.textContent = result.voice_response;
  dom.safetyLine.textContent = result.safety_note || t("defaultSafety");
  dom.resultGrid.innerHTML = `
    <article><strong>${escapeHtml(t("marketSignal"))}</strong><span>${escapeHtml(result.market_signal || "wait")}</span></article>
    <article><strong>${escapeHtml(t("confidence"))}</strong><span>${Math.round((result.confidence || 0) * 100)}%</span></article>
    <article><strong>${escapeHtml(t("weatherAlert"))}</strong><span>${escapeHtml(result.weather_alert || t("noAlert"))}</span></article>
    <article><strong>${escapeHtml(t("source"))}</strong><span>${escapeHtml(source)}</span></article>
    <article class="wide"><strong>${escapeHtml(t("steps"))}</strong><ul>${listItems(result.remedy_steps)}</ul></article>
  `;
  speak(result.voice_response);
}

function renderDiseaseResult(result, source) {
  state.speakingText = result.voice_response;
  dom.answerText.textContent = result.voice_response;
  dom.safetyLine.textContent = result.safety_note || t("defaultSafety");
  dom.resultGrid.innerHTML = `
    <article><strong>${escapeHtml(t("possibleIssue"))}</strong><span>${escapeHtml(result.possible_issue)}</span></article>
    <article><strong>${escapeHtml(t("confidence"))}</strong><span>${Math.round((result.confidence || 0) * 100)}%</span></article>
    <article><strong>${escapeHtml(t("source"))}</strong><span>${escapeHtml(source)}</span></article>
    <article class="wide"><strong>${escapeHtml(t("visualSigns"))}</strong><ul>${listItems(result.visual_signs)}</ul></article>
    <article class="wide"><strong>${escapeHtml(t("organicTreatment"))}</strong><ul>${listItems(result.organic_treatment)}</ul></article>
    <article class="wide"><strong>${escapeHtml(t("escalateIf"))}</strong><ul>${listItems(result.escalation)}</ul></article>
  `;
  speak(result.voice_response);
}

function renderError(message) {
  dom.answerText.textContent = message;
  dom.resultGrid.innerHTML = "";
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
    ctx.strokeStyle = "#1e6fb8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = (index / (values.length - 1)) * (canvas.width - 12) + 6;
      const y = canvas.height - 8 - ((value - min) / Math.max(1, max - min)) * (canvas.height - 18);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
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
    area: state.area
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
  button.textContent = text;
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
