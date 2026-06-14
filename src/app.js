const state = {
  districts: [],
  market: null,
  districtId: "hisar",
  cropId: "onion",
  language: "hinglish",
  unit: "acre",
  area: 2,
  image: null,
  mediaRecorder: null,
  chunks: [],
  speakingText: ""
};

const dom = {
  language: document.querySelector("#language"),
  districtSelect: document.querySelector("#districtSelect"),
  cropSelect: document.querySelector("#cropSelect"),
  unitSelect: document.querySelector("#unitSelect"),
  areaInput: document.querySelector("#areaInput"),
  recordButton: document.querySelector("#recordButton"),
  recordStatus: document.querySelector("#recordStatus"),
  queryInput: document.querySelector("#queryInput"),
  askButton: document.querySelector("#askButton"),
  quickGrid: document.querySelector("#quickGrid"),
  refreshSignals: document.querySelector("#refreshSignals"),
  signalGrid: document.querySelector("#signalGrid"),
  cropImage: document.querySelector("#cropImage"),
  imageLabel: document.querySelector("#imageLabel"),
  imagePreview: document.querySelector("#imagePreview"),
  symptomInput: document.querySelector("#symptomInput"),
  diseaseButton: document.querySelector("#diseaseButton"),
  replayButton: document.querySelector("#replayButton"),
  answerText: document.querySelector("#answerText"),
  resultGrid: document.querySelector("#resultGrid"),
  safetyLine: document.querySelector("#safetyLine"),
  serviceStatus: document.querySelector("#serviceStatus")
};

const quickPrompts = [
  "Kya abhi pyaaz bechna chahiye?",
  "Kal barish hogi kya? Neem spray kab karun?",
  "Mere patton par brown spots hain, organic ilaaj batao.",
  "Moong ka bhav gir raha hai ya badh raha hai?"
];

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function boot() {
  [state.districts, state.market] = await Promise.all([
    loadJson("knowledge_base/districts.json"),
    loadJson("knowledge_base/market_fallback.json")
  ]);
  populateControls();
  bindEvents();
  renderQuickPrompts();
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
  dom.language.addEventListener("change", () => state.language = dom.language.value);
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

function renderQuickPrompts() {
  dom.quickGrid.innerHTML = quickPrompts.map((prompt) =>
    `<button class="chip" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
  ).join("");
  dom.quickGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt]");
    if (!button) return;
    dom.queryInput.value = button.dataset.prompt;
    askAdvisor();
  });
}

async function refreshSignals() {
  const weatherPromise = fetchJson(`/api/weather?district=${encodeURIComponent(state.districtId)}`).catch((error) => ({ error: error.message }));
  const marketPromise = fetchJson(`/api/market?district=${encodeURIComponent(state.districtId)}&crop=${encodeURIComponent(state.cropId)}`).catch((error) => ({ error: error.message }));
  const [weather, market] = await Promise.all([weatherPromise, marketPromise]);
  renderSignals(weather, market);
}

function renderSignals(weather, market) {
  const weatherSummary = weather.summary || {};
  const marketSummary = market.summary || {};
  dom.signalGrid.innerHTML = `
    <section class="signal-card">
      <h3>Weather</h3>
      <p class="metric">${weatherSummary.rainProbability ?? "--"}% rain</p>
      <p>${escapeHtml(weatherSummary.sprayWindow || weather.error || "Open-Meteo signal unavailable locally.")}</p>
      <span>${escapeHtml(weather.source || "Open-Meteo")}</span>
    </section>
    <section class="signal-card">
      <h3>Mandi</h3>
      <p class="metric">₹${marketSummary.latestPrice ?? "--"}</p>
      <p>${escapeHtml(marketSummary.voiceResponse || market.error || "Fallback market signal unavailable.")}</p>
      <canvas class="sparkline" width="260" height="58" data-history="${escapeHtml(JSON.stringify(marketSummary.history || []))}"></canvas>
    </section>
  `;
  drawSparklines();
}

async function askAdvisor() {
  setBusy(dom.askButton, true, "Thinking...");
  try {
    const payload = await fetchJson("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildContext({ query: dom.queryInput.value.trim() }))
    });
    renderAdvisorResult(payload.result, payload.modelBacked ? "Gemini + local RAG" : payload.warning || "Local fallback");
  } catch (error) {
    renderError(error.message);
  } finally {
    setBusy(dom.askButton, false, "Ask");
  }
}

function handleImage() {
  const file = dom.cropImage.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    dom.imageLabel.textContent = "Choose an image file";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    dom.imageLabel.textContent = "Use image under 5 MB";
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
    renderError("Add a crop photo or symptom description first.");
    return;
  }
  setBusy(dom.diseaseButton, true, "Analyzing...");
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
    renderDiseaseResult(payload.result, payload.modelBacked ? "Gemini image triage" : payload.warning || "Local disease KB fallback");
  } catch (error) {
    renderError(error.message);
  } finally {
    setBusy(dom.diseaseButton, false, "Analyze disease");
  }
}

async function toggleRecording() {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    dom.recordStatus.textContent = "Browser recording is unavailable. Type the question instead.";
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
    dom.recordStatus.textContent = "Recording... tap again to stop.";
  } catch {
    dom.recordStatus.textContent = "Microphone permission is needed, or type the question.";
  }
}

async function transcribeRecording(stream) {
  stream.getTracks().forEach((track) => track.stop());
  dom.recordButton.classList.remove("is-recording");
  dom.recordStatus.textContent = "Sending audio to Hugging Face Whisper route...";
  const blob = new Blob(state.chunks, { type: state.chunks[0]?.type || "audio/webm" });
  const data = await blobToBase64(blob);
  try {
    const payload = await fetchJson("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: { mimeType: blob.type, data } })
    });
    dom.queryInput.value = payload.text || "";
    dom.recordStatus.textContent = payload.text ? "Transcribed with Whisper." : "No speech detected.";
  } catch (error) {
    dom.recordStatus.textContent = `${error.message} Type the question or configure HF_TOKEN/WHISPER_ENDPOINT_URL.`;
  }
}

function renderAdvisorResult(result, source) {
  state.speakingText = result.voice_response;
  dom.answerText.textContent = result.voice_response;
  dom.safetyLine.textContent = result.safety_note || "Verify locally before acting.";
  dom.resultGrid.innerHTML = `
    <article><strong>Market signal</strong><span>${escapeHtml(result.market_signal || "wait")}</span></article>
    <article><strong>Confidence</strong><span>${Math.round((result.confidence || 0) * 100)}%</span></article>
    <article><strong>Weather alert</strong><span>${escapeHtml(result.weather_alert || "No alert")}</span></article>
    <article><strong>Source</strong><span>${escapeHtml(source)}</span></article>
    <article class="wide"><strong>Steps</strong><ul>${listItems(result.remedy_steps)}</ul></article>
  `;
  speak(result.voice_response);
}

function renderDiseaseResult(result, source) {
  state.speakingText = result.voice_response;
  dom.answerText.textContent = result.voice_response;
  dom.safetyLine.textContent = result.safety_note || "Confirm with KVK/local agriculture officer.";
  dom.resultGrid.innerHTML = `
    <article><strong>Possible issue</strong><span>${escapeHtml(result.possible_issue)}</span></article>
    <article><strong>Confidence</strong><span>${Math.round((result.confidence || 0) * 100)}%</span></article>
    <article><strong>Source</strong><span>${escapeHtml(source)}</span></article>
    <article class="wide"><strong>Visual signs</strong><ul>${listItems(result.visual_signs)}</ul></article>
    <article class="wide"><strong>Organic treatment</strong><ul>${listItems(result.organic_treatment)}</ul></article>
    <article class="wide"><strong>Escalate if</strong><ul>${listItems(result.escalation)}</ul></article>
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
