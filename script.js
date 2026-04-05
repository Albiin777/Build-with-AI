const defaultConfig = {
  extraImages: [
    "reopen (7).jpg.jpeg"
  ],
  imageHostingProvider: "imgbb",
  autoHostUploads: true,
  imageHostingApiKey: "",
  timerTitle: "Hackathon Timer",
  timerType: "countdown",
  hours: 16,
  minutes: 0,
  seconds: 0,
  timerValueFont: "bebas",
  timerLabelFont: "space",
  timerTextColor: "#000000",
  timerLabelColor: "#000000",
  timerValueSize: 150,
  timerLabelSize: 24,
  timerBoxColor: "#000000",
  timerBoxOpacity: 0,
  timerBorderColor: "#ffffff",
  timerBorderOpacity: 0,
  offsetX: 0,
  offsetY: 0,
  timerDisplayMode: "hidden"
};

const FONT_PRESETS = {
  bebas: '"Bebas Neue", sans-serif',
  orbitron: '"Orbitron", sans-serif',
  oswald: '"Oswald", sans-serif',
  space: '"Space Grotesk", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  playfair: '"Playfair Display", serif',
  syncopate: '"Syncopate", sans-serif'
};

const state = {
  config: loadConfig(),
  isRunning: false,
  remainingSeconds: 0,
  elapsedSeconds: 0,
  tickHandle: null,
  isStatusLoaded: false
};

const refs = {
  galleryList: document.getElementById("galleryList"),
  timerCard: document.getElementById("timerCard"),
  timerLabel: document.getElementById("timerLabel"),
  timerValue: document.getElementById("timerValue"),
  startPauseBtn: document.getElementById("startPauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  toggleSettingsBtn: document.getElementById("toggleSettingsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsForm: document.getElementById("settingsForm"),
  inlineTimerMount: document.getElementById("inlineTimerMount"),
  shareBtn: document.getElementById("shareBtn"),
  extraImagesContainer: document.getElementById("extraImagesContainer"),
  addImageBtn: document.getElementById("addImageBtn"),
  hideTimerBtn: document.getElementById("hideTimerBtn"),
  capsuleStartBtn: document.getElementById("capsuleStartBtn"),
  capsuleEditBtn: document.getElementById("capsuleEditBtn")
};

const fields = {
  imageHostingProvider: document.getElementById("imageHostingProvider"),
  autoHostUploads: document.getElementById("autoHostUploads"),
  imageHostingApiKey: document.getElementById("imageHostingApiKey"),
  timerTitle: document.getElementById("timerTitle"),
  timerType: document.getElementById("timerType"),
  timerHours: document.getElementById("timerHours"),
  timerMinutes: document.getElementById("timerMinutes"),
  timerSeconds: document.getElementById("timerSeconds"),
  timerValueFont: document.getElementById("timerValueFont"),
  timerLabelFont: document.getElementById("timerLabelFont"),
  timerTextColor: document.getElementById("timerTextColor"),
  timerLabelColor: document.getElementById("timerLabelColor"),
  timerValueSize: document.getElementById("timerValueSize"),
  timerBoxColor: document.getElementById("timerBoxColor"),
  timerBoxOpacity: document.getElementById("timerBoxOpacity"),
  timerBorderColor: document.getElementById("timerBorderColor"),
  timerBorderOpacity: document.getElementById("timerBorderOpacity"),
  timerLabelSize: document.getElementById("timerLabelSize"),
  timerDisplayMode: document.getElementById("timerDisplayMode"),
  offsetX: document.getElementById("offsetX"),
  offsetY: document.getElementById("offsetY")
};

initialize();

function initialize() {
  if (refs.toggleSettingsBtn) {
    refs.toggleSettingsBtn.addEventListener("click", () => setPanelOpen(true));
  }
  if (refs.closeSettingsBtn) {
    refs.closeSettingsBtn.addEventListener("click", () => setPanelOpen(false));
  }

  hydrateForm();
  resetTimerState();
  loadTimerStatus(); // Restore progress if any
  applyConfigToView();

  if (refs.startPauseBtn) {
    refs.startPauseBtn.addEventListener("click", onStartPause);
  }
  if (refs.resetBtn) {
    refs.resetBtn.addEventListener("click", onResetTimer);
  }
  if (refs.settingsForm) {
    refs.settingsForm.addEventListener("submit", onApplySettings);
  }

  // Bridge for the inline script's Apply button
  window.applySettingsFromPanel = () => {
    void onApplySettings();
  };

  if (refs.shareBtn) {
    refs.shareBtn.addEventListener("click", copyShareLink);
  }
  if (refs.addImageBtn) {
    refs.addImageBtn.addEventListener("click", onAddImageRow);
  }
  if (refs.extraImagesContainer) {
    refs.extraImagesContainer.addEventListener("click", onImagesContainerClick);
    refs.extraImagesContainer.addEventListener("change", onImagesContainerChange);
  }

  // Hide/show timer toggle
  if (refs.hideTimerBtn && refs.timerCard) {
    const isInitiallyHidden = state.config.timerDisplayMode === "hidden";
    if (isInitiallyHidden) {
      refs.hideTimerBtn.style.opacity = "0.3";
    }
    refs.hideTimerBtn.addEventListener("click", () => {
      const isHidden = refs.timerCard.classList.toggle("hidden");
      refs.hideTimerBtn.style.opacity = isHidden ? "0.3" : "";
      refs.hideTimerBtn.title = isHidden ? "Show Timer" : "Hide Timer";
    });
  }

  // Capsule listeners
  if (refs.capsuleStartBtn) {
    refs.capsuleStartBtn.addEventListener("click", onStartPause);
  }
  if (refs.capsuleEditBtn) {
    refs.capsuleEditBtn.addEventListener("click", () => setPanelOpen(true));
  }
}

function loadConfig() {
  const base = { ...defaultConfig };
  const fromQuery = parseConfigFromQuery();
  if (fromQuery) {
    return normalizeConfig({ ...base, ...fromQuery });
  }

  try {
    const stored = window.localStorage.getItem("hackathon-display-config");
    if (!stored) {
      return normalizeConfig(base);
    }
    const parsed = JSON.parse(stored);
    return normalizeConfig({ ...base, ...parsed });
  } catch {
    return normalizeConfig(base);
  }
}

function normalizeConfig(raw) {
  const normalized = { ...raw };

  if (!Array.isArray(normalized.extraImages)) {
    normalized.extraImages = [];
  }

  if (normalized.extraImages.length === 0 && normalized.secondaryImageUrl && normalized.showSecondImage !== false) {
    normalized.extraImages.push(String(normalized.secondaryImageUrl));
  }

  normalized.extraImages = normalized.extraImages.filter((item) => String(item).trim().length > 0);
  normalized.timerValueFont = normalizeFontPreset(normalized.timerValueFont, defaultConfig.timerValueFont);
  normalized.timerLabelFont = normalizeFontPreset(normalized.timerLabelFont, defaultConfig.timerLabelFont);
  return normalized;
}

function parseConfigFromQuery() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get("config");
  if (!encoded) {
    return null;
  }

  try {
    const json = atob(encoded);
    const parsed = JSON.parse(json);
    safeStoreConfig(parsed);
    return parsed;
  } catch {
    return null;
  }
}

function saveConfig() {
  safeStoreConfig(state.config);
}

function safeStoreConfig(config) {
  try {
    window.localStorage.setItem("hackathon-display-config", JSON.stringify(config));
  } catch {
    try {
      window.sessionStorage.setItem("hackathon-display-config", JSON.stringify(config));
    } catch {
      // Ignore storage failures
    }
  }
}

function saveTimerStatus() {
  try {
    const status = {
      remainingSeconds: state.remainingSeconds,
      elapsedSeconds: state.elapsedSeconds,
      isRunning: state.isRunning,
      lastUpdate: Date.now()
    };
    window.localStorage.setItem("hackathon-timer-status", JSON.stringify(status));
  } catch {
    // Ignore
  }
}

function loadTimerStatus() {
  try {
    const stored = window.localStorage.getItem("hackathon-timer-status");
    if (!stored) return;
    const status = JSON.parse(stored);
    
    // If it was running, calculate how much time passed while away
    if (status.isRunning) {
      const msPassed = Date.now() - status.lastUpdate;
      const secondsPassed = Math.floor(msPassed / 1000);
      
      state.remainingSeconds = Math.max(0, status.remainingSeconds - secondsPassed);
      state.elapsedSeconds = status.elapsedSeconds + secondsPassed;
      state.isRunning = true;
      state.tickHandle = setInterval(onTick, 1000);
      if (refs.startPauseBtn) refs.startPauseBtn.textContent = "Pause";
      if (refs.capsuleStartBtn) refs.capsuleStartBtn.textContent = "Pause";
    } else {
      state.remainingSeconds = status.remainingSeconds;
      state.elapsedSeconds = status.elapsedSeconds;
      state.isRunning = false;
      if (refs.capsuleStartBtn) refs.capsuleStartBtn.textContent = "Start";
    }
    state.isStatusLoaded = true;
  } catch {
    // Ignore
  }
}

function hydrateForm() {
  if (fields.imageHostingProvider) fields.imageHostingProvider.value = state.config.imageHostingProvider;
  if (fields.autoHostUploads) fields.autoHostUploads.value = state.config.autoHostUploads ? "on" : "off";
  if (fields.imageHostingApiKey) fields.imageHostingApiKey.value = state.config.imageHostingApiKey;
  if (fields.timerTitle) fields.timerTitle.value = state.config.timerTitle;
  if (fields.timerType) fields.timerType.value = state.config.timerType;
  if (fields.timerHours) fields.timerHours.value = state.config.hours;
  if (fields.timerMinutes) fields.timerMinutes.value = state.config.minutes;
  if (fields.timerSeconds) fields.timerSeconds.value = state.config.seconds;
  if (fields.timerValueFont) fields.timerValueFont.value = state.config.timerValueFont;
  if (fields.timerLabelFont) fields.timerLabelFont.value = state.config.timerLabelFont;
  if (fields.timerTextColor) fields.timerTextColor.value = state.config.timerTextColor;
  if (fields.timerLabelColor) fields.timerLabelColor.value = state.config.timerLabelColor;
  if (fields.timerValueSize) fields.timerValueSize.value = state.config.timerValueSize;
  if (fields.timerBoxColor) fields.timerBoxColor.value = state.config.timerBoxColor;
  if (fields.timerBoxOpacity) fields.timerBoxOpacity.value = state.config.timerBoxOpacity;
  if (fields.timerBorderColor) fields.timerBorderColor.value = state.config.timerBorderColor;
  if (fields.timerBorderOpacity) fields.timerBorderOpacity.value = state.config.timerBorderOpacity;
  if (fields.timerLabelSize) fields.timerLabelSize.value = state.config.timerLabelSize;
  if (fields.timerDisplayMode) fields.timerDisplayMode.value = state.config.timerDisplayMode;
  if (fields.offsetX) fields.offsetX.value = state.config.offsetX;
  if (fields.offsetY) fields.offsetY.value = state.config.offsetY;
  renderImageRows(state.config.extraImages);
}

function renderImageRows(values) {
  if (!refs.extraImagesContainer) {
    return;
  }

  refs.extraImagesContainer.innerHTML = "";
  const rows = values.length > 0 ? values : [""];

  rows.forEach((value, index) => {
    refs.extraImagesContainer.appendChild(createImageRow(index, value));
  });
}

function createImageRow(index, value) {
  const row = document.createElement("div");
  row.className = "image-row";
  row.dataset.index = String(index);
  row.innerHTML = `
    <label>
      Image URL ${index + 1}
      <input type="url" class="extra-image-url" value="${escapeHtml(value)}" placeholder="https://..." />
    </label>
    <label>
      Or upload image ${index + 1}
      <input type="file" class="extra-image-file" accept="image/*" />
    </label>
    <div class="row-actions">
      <button type="button" class="ghost remove-image-btn">Remove</button>
    </div>
  `;
  return row;
}

function onAddImageRow() {
  const rows = collectImageUrlsFromForm();
  rows.push("");
  renderImageRows(rows);
}

function onImagesContainerClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.classList.contains("remove-image-btn")) {
    return;
  }

  const row = target.closest(".image-row");
  if (!row) {
    return;
  }

  const removeIndex = toNumber(row.dataset.index);
  const rows = collectImageUrlsFromForm();
  rows.splice(removeIndex, 1);
  renderImageRows(rows);
}

function onImagesContainerChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (!target.classList.contains("extra-image-file")) {
    return;
  }

  const row = target.closest(".image-row");
  if (!row) {
    return;
  }

  const urlInput = row.querySelector(".extra-image-url");
  if (!(urlInput instanceof HTMLInputElement)) {
    return;
  }

  void onFileSelected(event, urlInput);
}

function collectImageRowsFromForm() {
  if (!refs.extraImagesContainer) {
    return [];
  }

  return Array.from(refs.extraImagesContainer.querySelectorAll(".image-row")).map((row) => {
    const urlInput = row.querySelector(".extra-image-url");
    const fileInput = row.querySelector(".extra-image-file");
    return {
      urlInput: urlInput instanceof HTMLInputElement ? urlInput : null,
      fileInput: fileInput instanceof HTMLInputElement ? fileInput : null
    };
  });
}

function collectImageUrlsFromForm() {
  return collectImageRowsFromForm().map((row) => (row.urlInput ? row.urlInput.value.trim() : ""));
}

function resetTimerState() {
  const initial = getInitialTimerSeconds();
  state.remainingSeconds = initial;
  state.elapsedSeconds = initial;
  state.isRunning = false;

  if (state.tickHandle) {
    clearInterval(state.tickHandle);
    state.tickHandle = null;
  }

  if (refs.startPauseBtn) {
    refs.startPauseBtn.textContent = "Start";
  }
  if (refs.capsuleStartBtn) {
    refs.capsuleStartBtn.textContent = "Start";
  }
  updateTimerText();
}

function getInitialTimerSeconds() {
  return (
    toNumber(state.config.hours) * 3600 +
    toNumber(state.config.minutes) * 60 +
    toNumber(state.config.seconds)
  );
}

function onStartPause() {
  if (!state.isRunning) {
    state.isRunning = true;
    if (refs.startPauseBtn) {
      refs.startPauseBtn.textContent = "Pause";
    }
    if (refs.capsuleStartBtn) {
      refs.capsuleStartBtn.textContent = "Pause";
    }
    state.tickHandle = setInterval(onTick, 1000);
    saveTimerStatus();
    return;
  }

  state.isRunning = false;
  if (refs.startPauseBtn) {
    refs.startPauseBtn.textContent = "Start";
  }
  if (refs.capsuleStartBtn) {
    refs.capsuleStartBtn.textContent = "Start";
  }
  if (state.tickHandle) {
    clearInterval(state.tickHandle);
    state.tickHandle = null;
  }
  saveTimerStatus();
}

function onTick() {
  if (state.config.timerType === "countdown") {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
    if (state.remainingSeconds === 0) {
      stopRunningTimer();
    }
  } else {
    state.elapsedSeconds += 1;
  }

  updateTimerText();
  saveTimerStatus();
}

function onResetTimer() {
  window.localStorage.removeItem("hackathon-timer-status");
  resetTimerState();
}

function startTimer() {
  if (state.isRunning) {
    return;
  }

  if (state.config.timerType === "countdown" && state.remainingSeconds <= 0) {
    return;
  }

  state.isRunning = true;
  if (refs.startPauseBtn) {
    refs.startPauseBtn.textContent = "Pause";
  }
  state.tickHandle = setInterval(onTick, 1000);
}

function stopRunningTimer() {
  state.isRunning = false;
  if (refs.startPauseBtn) {
    refs.startPauseBtn.textContent = "Start";
  }
  if (refs.capsuleStartBtn) {
    refs.capsuleStartBtn.textContent = "Start";
  }
  if (state.tickHandle) {
    clearInterval(state.tickHandle);
    state.tickHandle = null;
  }
  saveTimerStatus();
}

function updateTimerText() {
  if (!refs.timerLabel || !refs.timerValue) {
    return;
  }

  refs.timerLabel.textContent = state.config.timerTitle || "Hackathon Timer";
  const value = state.config.timerType === "countdown" ? state.remainingSeconds : state.elapsedSeconds;
  refs.timerValue.textContent = formatDuration(value);
}

function formatDuration(seconds) {
  const safe = Math.max(0, toNumber(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function applyConfigToView() {
  renderGallery();
  applyTimerAppearance();
  placeTimerCard();
  updateTimerText();
}

function applyTimerAppearance() {
  if (!refs.timerCard || !refs.timerLabel || !refs.timerValue) {
    return;
  }

  const boxAlpha = clampNumber(state.config.timerBoxOpacity, 0, 100) / 100;
  const borderAlpha = clampNumber(state.config.timerBorderOpacity, 0, 100) / 100;

  refs.timerCard.style.backgroundColor = hexToRgba(state.config.timerBoxColor, boxAlpha);
  refs.timerCard.style.borderColor = hexToRgba(state.config.timerBorderColor, borderAlpha);
  refs.timerLabel.style.fontFamily = FONT_PRESETS[normalizeFontPreset(state.config.timerLabelFont, defaultConfig.timerLabelFont)];
  refs.timerValue.style.fontFamily = FONT_PRESETS[normalizeFontPreset(state.config.timerValueFont, defaultConfig.timerValueFont)];
  refs.timerLabel.style.color = state.config.timerLabelColor;
  refs.timerValue.style.color = state.config.timerTextColor;
  refs.timerValue.style.fontSize = `${clampNumber(state.config.timerValueSize, 28, 220)}px`;
  refs.timerLabel.style.fontSize = `${clampNumber(state.config.timerLabelSize, 8, 100)}px`;
}

function renderGallery() {
  if (!refs.galleryList) {
    return;
  }

  refs.galleryList.innerHTML = "";
  const images = state.config.extraImages.filter((item) => String(item).trim().length > 0);

  images.forEach((url, index) => {
    const img = document.createElement("img");
    img.className = "gallery-item";
    img.src = url;
    img.alt = `Hackathon board ${index + 1}`;
    refs.galleryList.appendChild(img);
  });
}

function placeTimerCard() {
  if (!refs.timerCard) {
    return;
  }

  refs.timerCard.classList.remove("hidden");

  refs.timerCard.style.right = "auto";
  refs.timerCard.style.transform = `translate(calc(-50% + ${toNumber(state.config.offsetX)}px), ${-toNumber(state.config.offsetY)}px)`;
  document.body.appendChild(refs.timerCard);

  if (state.config.timerDisplayMode === "hidden") {
    refs.timerCard.classList.add("hidden");
  }
}

async function onApplySettings(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  const autoHostUploads = fields.autoHostUploads ? fields.autoHostUploads.value === "on" : state.config.autoHostUploads;
  const imageHostingApiKey = fields.imageHostingApiKey ? fields.imageHostingApiKey.value.trim() : state.config.imageHostingApiKey;
  const imageHostingProvider = fields.imageHostingProvider ? fields.imageHostingProvider.value : state.config.imageHostingProvider;

  const extraRows = collectImageRowsFromForm();
  const resolvedExtraImages = [];
  for (const row of extraRows) {
    if (!row.urlInput || !row.fileInput) {
      continue;
    }

    const file = row.fileInput.files && row.fileInput.files[0];
    if (file) {
      const resolved = await resolveHostedImageUrl(file, row.urlInput.value, {
        autoHostUploads,
        imageHostingProvider,
        imageHostingApiKey
      });
      row.urlInput.value = resolved;
    }

    const finalValue = row.urlInput.value.trim();
    if (finalValue.length > 0) {
      resolvedExtraImages.push(finalValue);
    }
  }

  state.config = {
    ...state.config,
    extraImages: resolvedExtraImages,
    imageHostingProvider,
    autoHostUploads,
    imageHostingApiKey,
    timerTitle: fields.timerTitle ? fields.timerTitle.value.trim() || defaultConfig.timerTitle : state.config.timerTitle,
    timerType: fields.timerType ? fields.timerType.value : state.config.timerType,
    hours: fields.timerHours ? clampNumber(fields.timerHours.value, 0, 999) : state.config.hours,
    minutes: fields.timerMinutes ? clampNumber(fields.timerMinutes.value, 0, 59) : state.config.minutes,
    seconds: fields.timerSeconds ? clampNumber(fields.timerSeconds.value, 0, 59) : state.config.seconds,
    timerValueFont: fields.timerValueFont ? normalizeFontPreset(fields.timerValueFont.value, defaultConfig.timerValueFont) : state.config.timerValueFont,
    timerLabelFont: fields.timerLabelFont ? normalizeFontPreset(fields.timerLabelFont.value, defaultConfig.timerLabelFont) : state.config.timerLabelFont,
    timerTextColor: fields.timerTextColor ? normalizeHexColor(fields.timerTextColor.value, defaultConfig.timerTextColor) : state.config.timerTextColor,
    timerLabelColor: fields.timerLabelColor ? normalizeHexColor(fields.timerLabelColor.value, defaultConfig.timerLabelColor) : state.config.timerLabelColor,
    timerValueSize: fields.timerValueSize ? clampNumber(fields.timerValueSize.value, 28, 220) : state.config.timerValueSize,
    timerBoxColor: fields.timerBoxColor ? normalizeHexColor(fields.timerBoxColor.value, defaultConfig.timerBoxColor) : state.config.timerBoxColor,
    timerBoxOpacity: fields.timerBoxOpacity ? clampNumber(fields.timerBoxOpacity.value, 0, 100) : state.config.timerBoxOpacity,
    timerBorderColor: fields.timerBorderColor ? normalizeHexColor(fields.timerBorderColor.value, defaultConfig.timerBorderColor) : state.config.timerBorderColor,
    timerBorderOpacity: fields.timerBorderOpacity ? clampNumber(fields.timerBorderOpacity.value, 0, 100) : state.config.timerBorderOpacity,
    timerLabelSize: fields.timerLabelSize ? clampNumber(fields.timerLabelSize.value, 8, 100) : state.config.timerLabelSize,
    timerDisplayMode: fields.timerDisplayMode ? fields.timerDisplayMode.value : state.config.timerDisplayMode,
    offsetX: fields.offsetX ? clampNumber(fields.offsetX.value, -500, 500) : state.config.offsetX,
    offsetY: fields.offsetY ? clampNumber(fields.offsetY.value, -500, 500) : state.config.offsetY
  };

  saveConfig();
  resetTimerState();
  applyConfigToView();
  renderImageRows(state.config.extraImages);
  setPanelOpen(false);
}

function copyShareLink() {
  const payload = {
    extraImages: state.config.extraImages,
    imageHostingProvider: state.config.imageHostingProvider,
    autoHostUploads: state.config.autoHostUploads,
    timerTitle: state.config.timerTitle,
    timerType: state.config.timerType,
    hours: state.config.hours,
    minutes: state.config.minutes,
    seconds: state.config.seconds,
    timerValueFont: state.config.timerValueFont,
    timerLabelFont: state.config.timerLabelFont,
    timerTextColor: state.config.timerTextColor,
    timerLabelColor: state.config.timerLabelColor,
    timerValueSize: state.config.timerValueSize,
    timerBoxColor: state.config.timerBoxColor,
    timerBoxOpacity: state.config.timerBoxOpacity,
    timerBorderColor: state.config.timerBorderColor,
    timerBorderOpacity: state.config.timerBorderOpacity,
    timerLabelSize: state.config.timerLabelSize,
    timerDisplayMode: state.config.timerDisplayMode,
    offsetX: state.config.offsetX,
    offsetY: state.config.offsetY
  };

  const encoded = btoa(JSON.stringify(payload));
  const url = new URL(window.location.href);
  url.searchParams.set("config", encoded);

  navigator.clipboard.writeText(url.toString()).then(() => {
    if (!refs.shareBtn) {
      return;
    }
    refs.shareBtn.textContent = "Link copied";
    setTimeout(() => {
      refs.shareBtn.textContent = "Copy shareable link";
    }, 1500);
  });
}

function setPanelOpen(isOpen) {
  if (refs.settingsPanel) {
    refs.settingsPanel.classList.toggle("open", isOpen);
    refs.settingsPanel.setAttribute("aria-hidden", String(!isOpen));
  }
  if (refs.toggleSettingsBtn) {
    refs.toggleSettingsBtn.setAttribute("aria-expanded", String(isOpen));
  }
}

function handleDocumentClick(event) {
  if (!refs.settingsPanel || !refs.toggleSettingsBtn) {
    return;
  }

  if (!refs.settingsPanel.classList.contains("open")) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (refs.settingsPanel.contains(target) || refs.toggleSettingsBtn.contains(target)) {
    return;
  }

  setPanelOpen(false);
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") {
    setPanelOpen(false);
  }
}

async function onFileSelected(event, targetField) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const file = input.files && input.files[0];
  if (!file) {
    return;
  }

  const autoHostUploads = fields.autoHostUploads ? fields.autoHostUploads.value === "on" : state.config.autoHostUploads;
  const imageHostingApiKey = fields.imageHostingApiKey ? fields.imageHostingApiKey.value.trim() : state.config.imageHostingApiKey;
  const imageHostingProvider = fields.imageHostingProvider ? fields.imageHostingProvider.value : state.config.imageHostingProvider;

  targetField.value = await resolveHostedImageUrl(file, targetField.value, {
    autoHostUploads,
    imageHostingProvider,
    imageHostingApiKey
  });
}

async function resolveHostedImageUrl(file, existingValue, options) {
  // Always try to process the file if auto-upload is enabled and configured
  if (options.autoHostUploads && options.imageHostingProvider === "imgbb" && options.imageHostingApiKey) {
    try {
      return await uploadToImgbb(file, options.imageHostingApiKey);
    } catch {
      return await fileToDataUrl(file);
    }
  }

  // If a file was provided, always convert it to DataURL
  return await fileToDataUrl(file);
}

async function uploadToImgbb(file, apiKey) {
  const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Image hosting request failed");
  }

  const payload = await response.json();
  const url = payload?.data?.url;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("Image hosting response missing URL");
  }

  return url;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result || ""));
    };
    reader.onerror = () => {
      reject(new Error("File read failed"));
    };
    reader.readAsDataURL(file);
  });
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function clampNumber(value, min, max) {
  const num = toNumber(value);
  return Math.min(max, Math.max(min, Math.floor(num)));
}

function normalizeHexColor(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

function normalizeFontPreset(value, fallback) {
  const selected = String(value || "").trim();
  return Object.prototype.hasOwnProperty.call(FONT_PRESETS, selected) ? selected : fallback;
}

function hexToRgba(hex, alpha) {
  const color = normalizeHexColor(hex, "#000000");
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const safeAlpha = Math.max(0, Math.min(1, Number(alpha)));
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
