import { buildAdvice } from "./advisor.js";

const state = {
  marketData: null,
  seedFinance: null,
  knowledgeBase: null,
  weather: null,
  districtId: "hisar",
  cropId: "bajra",
  season: "kharif",
  acres: 2,
  lang: "hinglish",
  lastAdvice: null,
  recognition: null,
  speakingText: ""
};

const dom = {
  language: document.querySelector("#language"),
  districtSelect: document.querySelector("#districtSelect"),
  cropSelect: document.querySelector("#cropSelect"),
  seasonSelect: document.querySelector("#seasonSelect"),
  acreInput: document.querySelector("#acreInput"),
  micButton: document.querySelector("#micButton"),
  askButton: document.querySelector("#askButton"),
  replayButton: document.querySelector("#replayButton"),
  questionInput: document.querySelector("#questionInput"),
  signalGrid: document.querySelector("#signalGrid"),
  answerText: document.querySelector("#answerText"),
  stepList: document.querySelector("#stepList"),
  sourceList: document.querySelector("#sourceList"),
  quickGrid: document.querySelector("#quickGrid"),
  networkStatus: document.querySelector("#networkStatus"),
  listeningStatus: document.querySelector("#listeningStatus")
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function boot() {
  [state.marketData, state.seedFinance, state.knowledgeBase] = await Promise.all([
    loadJson("data/market-signals.json"),
    loadJson("data/seed-finance.json"),
    loadJson("data/knowledge-base.json")
  ]);

  populateControls();
  bindEvents();
  setupSpeech();
  renderQuickQuestions();
  ask(dom.questionInput.value);
  refreshWeather().then(() => ask(dom.questionInput.value));
}

function populateControls() {
  dom.districtSelect.innerHTML = state.marketData.districts
    .map((district) => `<option value="${district.id}">${district.name}</option>`)
    .join("");
  dom.cropSelect.innerHTML = state.marketData.crops
    .map((crop) => `<option value="${crop.id}">${crop.name} / ${crop.hindiName}</option>`)
    .join("");
  dom.districtSelect.value = state.districtId;
  dom.cropSelect.value = state.cropId;
  dom.seasonSelect.value = state.season;
  dom.acreInput.value = String(state.acres);
  dom.language.value = state.lang;
}

function bindEvents() {
  dom.language.addEventListener("change", () => {
    state.lang = dom.language.value;
    ask(dom.questionInput.value);
  });

  dom.districtSelect.addEventListener("change", async () => {
    state.districtId = dom.districtSelect.value;
    await refreshWeather();
    ask(dom.questionInput.value);
  });

  dom.cropSelect.addEventListener("change", () => {
    state.cropId = dom.cropSelect.value;
    ask(dom.questionInput.value);
  });

  dom.seasonSelect.addEventListener("change", () => {
    state.season = dom.seasonSelect.value;
    ask(dom.questionInput.value);
  });

  dom.acreInput.addEventListener("input", () => {
    state.acres = Math.max(0.25, Number(dom.acreInput.value) || 1);
    ask(dom.questionInput.value);
  });

  dom.askButton.addEventListener("click", () => ask(dom.questionInput.value));
  dom.questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") ask(dom.questionInput.value);
  });
  dom.replayButton.addEventListener("click", () => speak(state.speakingText));
  dom.micButton.addEventListener("click", toggleListening);
}

function setupSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    dom.listeningStatus.textContent = "Voice input unavailable in this browser";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = state.lang === "en" ? "en-IN" : "hi-IN";

  recognition.addEventListener("start", () => {
    dom.micButton.classList.add("is-listening");
    dom.listeningStatus.textContent = "Listening";
  });

  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    dom.questionInput.value = transcript;
    if (event.results[event.results.length - 1].isFinal) ask(transcript);
  });

  recognition.addEventListener("end", () => {
    dom.micButton.classList.remove("is-listening");
    dom.listeningStatus.textContent = "Ready";
  });

  recognition.addEventListener("error", () => {
    dom.micButton.classList.remove("is-listening");
    dom.listeningStatus.textContent = "Voice input needs browser permission";
  });

  state.recognition = recognition;
}

function toggleListening() {
  if (!state.recognition) return;
  state.recognition.lang = state.lang === "en" ? "en-IN" : "hi-IN";
  try {
    state.recognition.start();
  } catch {
    state.recognition.stop();
  }
}

async function refreshWeather() {
  const district = state.marketData.districts.find((item) => item.id === state.districtId);
  const params = new URLSearchParams({
    latitude: district.latitude,
    longitude: district.longitude,
    current: "temperature_2m,wind_speed_10m",
    daily: "precipitation_probability_max,precipitation_sum",
    forecast_days: "2",
    timezone: "Asia/Kolkata"
  });

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      signal: controller.signal
    });
    window.clearTimeout(timeout);
    const data = await response.json();
    state.weather = {
      temperature: data.current?.temperature_2m ?? 34,
      windSpeed: data.current?.wind_speed_10m ?? 12,
      rainProbability: data.daily?.precipitation_probability_max?.[1] ?? data.daily?.precipitation_probability_max?.[0] ?? 35,
      precipitation: data.daily?.precipitation_sum?.[1] ?? data.daily?.precipitation_sum?.[0] ?? 0,
      source: "open-meteo"
    };
    dom.networkStatus.textContent = "Weather connected";
  } catch {
    state.weather = null;
    dom.networkStatus.textContent = "Offline-ready demo data";
  }
}

function ask(question) {
  const advice = buildAdvice(question, state);
  state.lastAdvice = advice;
  state.districtId = advice.district.id;
  state.cropId = advice.crop.id;
  state.acres = advice.acres;
  syncControls();
  renderAdvice(advice);
  renderCards(advice.cards);
  speak(advice.summary);
}

function syncControls() {
  dom.districtSelect.value = state.districtId;
  dom.cropSelect.value = state.cropId;
  dom.acreInput.value = String(state.acres);
}

function renderAdvice(advice) {
  state.speakingText = advice.summary;
  dom.answerText.textContent = advice.summary;
  dom.stepList.innerHTML = advice.steps.map((step) => `<span>${escapeHtml(step)}</span>`).join("");
  dom.sourceList.innerHTML = advice.sources
    .slice(0, 5)
    .map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.name}</a>`)
    .join("");
}

function renderCards(cards) {
  dom.signalGrid.innerHTML = cards
    .map((card) => `
      <article class="signal-card">
        <div>
          <h3>${escapeHtml(card.title)}</h3>
          <p class="metric">${escapeHtml(card.metric)}</p>
        </div>
        <p class="note">${escapeHtml(card.note)}</p>
        <span class="tag">${escapeHtml(card.tag)}</span>
      </article>
    `)
    .join("");
}

function renderQuickQuestions() {
  dom.quickGrid.innerHTML = state.knowledgeBase.quickQuestions
    .map((item) => `<button class="chip" type="button" data-question="${escapeHtml(item.text)}">${escapeHtml(item.label)}</button>`)
    .join("");
  dom.quickGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-question]");
    if (!button) return;
    dom.questionInput.value = button.dataset.question;
    ask(button.dataset.question);
  });
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.lang === "en" ? "en-IN" : "hi-IN";
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot().catch((error) => {
  dom.answerText.textContent = `Could not start the prototype: ${error.message}`;
});
