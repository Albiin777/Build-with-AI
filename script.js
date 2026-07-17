const defaultConfig = {
  extraImages: [
    "Countdown Screen 16_9.png"
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
  timerTextColor: "#ffffff",
  timerLabelColor: "#d1d5db",
  timerValueSize: 150,
  timerLabelSize: 24,
  timerBoxColor: "#000000",
  timerBoxOpacity: 0,
  timerBorderColor: "#ffffff",
  timerBorderOpacity: 0,
  offsetX: 0,
  offsetY: 0,
  timerDisplayMode: "floating",
  slideshowEnabled: true,
  slideshowDuration: 4,
  sponsors: [
    { name: "Platinum Sponsor", logoUrl: "" },
    { name: "Gold Sponsor", logoUrl: "" },
    { name: "Silver Sponsor", logoUrl: "" }
  ],
  _v: 2
};

const FONT_PRESETS = {
  bebas: '"Bebas Neue", sans-serif',
  cinzel: '"Cinzel", serif',
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
  isStatusLoaded: false,
  videoBlobUrls: new Set() // tracks blob: URLs that came from video file uploads
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
  capsulePauseBtn: document.getElementById("capsulePauseBtn"),
  capsuleResetBtn: document.getElementById("capsuleResetBtn"),
  capsuleEditBtn: document.getElementById("capsuleEditBtn"),
  sponsorLogo: document.getElementById("sponsorLogo"),
  sponsorsContainer: document.getElementById("sponsorsContainer"),
  addSponsorBtn: document.getElementById("addSponsorBtn")
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
  offsetY: document.getElementById("offsetY"),
  slideshowEnabled: document.getElementById("slideshowEnabled"),
  slideshowDuration: document.getElementById("slideshowDuration")
};


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
  window.applySettingsFromPanel = () => { void onApplySettings(); };

  // Export timer controls for inline scripts
  window.onStart           = onStart;
  window.onPause           = onPause;
  window.onResetTimer      = onResetTimer;
  window.setPanelOpen      = setPanelOpen;
  window.setCapsuleRunning = setCapsuleRunning;
  window.onAddImageRow     = onAddImageRow;
  window.onAddSponsorRow   = onAddSponsorRow;

  if (refs.shareBtn) {
    refs.shareBtn.addEventListener("click", copyShareLink);
  }
  if (refs.extraImagesContainer) {
    refs.extraImagesContainer.addEventListener("click", onImagesContainerClick);
    refs.extraImagesContainer.addEventListener("change", onImagesContainerChange);
    refs.extraImagesContainer.addEventListener("input", onImagesContainerInput);
  }

  // Hide/show timer toggle - set initial icon state only (click handled by inline script)
  if (refs.hideTimerBtn) {
    const isInitiallyHidden = state.config.timerDisplayMode === "hidden";
    if (isInitiallyHidden) {
      refs.hideTimerBtn.style.opacity = "0.4";
      const eyeOpen  = refs.hideTimerBtn.querySelector(".eye-open");
      const eyeSlash = refs.hideTimerBtn.querySelector(".eye-slash");
      if (eyeOpen)  eyeOpen.classList.add("hidden");
      if (eyeSlash) eyeSlash.classList.remove("hidden");
    }
  }

  // Sponsor slideshow listeners (row delegation only; add button handled by inline script)
  if (refs.sponsorsContainer) {
    refs.sponsorsContainer.addEventListener("click", onSponsorsContainerClick);
    refs.sponsorsContainer.addEventListener("change", onSponsorsContainerChange);
    refs.sponsorsContainer.addEventListener("input", onSponsorsContainerInput);
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

    // If stored config is from an older version, migrate stale values
    if (!parsed._v || parsed._v < 2) {
      // Reset colors that were wrong black defaults
      if (parsed.timerTextColor === "#000000") parsed.timerTextColor = base.timerTextColor;
      if (parsed.timerLabelColor === "#000000") parsed.timerLabelColor = base.timerLabelColor;
      // Ensure timer is visible
      if (parsed.timerDisplayMode === "hidden") parsed.timerDisplayMode = base.timerDisplayMode;
      // Seed sponsors if none set yet
      if (!Array.isArray(parsed.sponsors) || parsed.sponsors.length === 0) {
        parsed.sponsors = base.sponsors;
        parsed.slideshowEnabled = base.slideshowEnabled;
        parsed.slideshowDuration = base.slideshowDuration;
      }
      parsed._v = 2;
    }

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

  // Normalize sponsors
  if (!Array.isArray(normalized.sponsors)) {
    normalized.sponsors = [];
  }
  normalized.sponsors = normalized.sponsors.filter(
    (s) => s && (String(s.name || "").trim().length > 0 || String(s.logoUrl || "").trim().length > 0)
  );

  if (typeof normalized.slideshowEnabled !== "boolean") {
    normalized.slideshowEnabled = normalized.slideshowEnabled === true || normalized.slideshowEnabled === "on";
  }
  normalized.slideshowDuration = Math.max(1, toNumber(normalized.slideshowDuration) || 5);

  return normalized;
}

function parseConfigFromQuery() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get("config") || url.searchParams.get("CONFIG");
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
      lastUpdate: Date.now(),
      timerType: state.config.timerType,
      durationSeconds: getInitialTimerSeconds()
    };
    window.localStorage.setItem("hackathon-timer-status", JSON.stringify(status));
  } catch {
    // Ignore
  }
}

function clearTimerStatus() {
  try {
    window.localStorage.removeItem("hackathon-timer-status");
  } catch {
    // Ignore
  }
}

function loadTimerStatus() {
  try {
    const stored = window.localStorage.getItem("hackathon-timer-status");
    if (!stored) return;
    const status = JSON.parse(stored);
    const expectedDuration = getInitialTimerSeconds();
    const savedDuration = Number(status.durationSeconds);
    const savedRemaining = Number(status.remainingSeconds);
    const savedElapsed = Number(status.elapsedSeconds);
    const savedLastUpdate = Number(status.lastUpdate);

    if (
      status.timerType !== state.config.timerType ||
      savedDuration !== expectedDuration ||
      !Number.isFinite(savedRemaining) ||
      !Number.isFinite(savedElapsed) ||
      !Number.isFinite(savedLastUpdate)
    ) {
      clearTimerStatus();
      return;
    }
    
    // If it was running, calculate how much time passed while away
    if (status.isRunning) {
      const msPassed = Date.now() - savedLastUpdate;
      const secondsPassed = Math.floor(msPassed / 1000);
      
      state.remainingSeconds = Math.max(0, savedRemaining - secondsPassed);
      state.elapsedSeconds = savedElapsed + secondsPassed;
      state.isRunning = true;
      state.tickHandle = setInterval(onTick, 1000);
      if (refs.startPauseBtn) refs.startPauseBtn.textContent = "Pause";
      setCapsuleRunning(true);
    } else {
      state.remainingSeconds = savedRemaining;
      state.elapsedSeconds = savedElapsed;
      state.isRunning = false;
      setCapsuleRunning(false);
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
  // Slideshow fields
  if (fields.slideshowEnabled) fields.slideshowEnabled.value = state.config.slideshowEnabled ? "on" : "off";
  if (fields.slideshowDuration) fields.slideshowDuration.value = state.config.slideshowDuration;
  renderImageRows(state.config.extraImages);
  renderSponsorRows(state.config.sponsors);
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
      Media file or URL ${index + 1}
      <input type="text" class="extra-image-url" value="${escapeHtml(value)}" placeholder="reopen (7).jpg.jpeg" inputmode="url" />
    </label>
    <label>
      Or upload media ${index + 1}
      <input type="file" class="extra-image-file" accept="image/*,video/*" />
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

  row.dataset.useSelectedFile = "true";
  urlInput.value = "";
  void onFileSelected(event, urlInput);
}

function onImagesContainerInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.classList.contains("extra-image-url")) {
    return;
  }

  const row = target.closest(".image-row");
  if (row) {
    row.dataset.useSelectedFile = "false";
  }
  const fileInput = row ? row.querySelector(".extra-image-file") : null;
  if (fileInput instanceof HTMLInputElement && target.value.trim()) {
    fileInput.value = "";
  }
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

// ── Sponsor row helpers ──────────────────────────────────

function renderSponsorRows(sponsors) {
  if (!refs.sponsorsContainer) return;
  refs.sponsorsContainer.innerHTML = "";
  const list = sponsors && sponsors.length > 0 ? sponsors : [];
  list.forEach((sponsor, index) => {
    refs.sponsorsContainer.appendChild(createSponsorRow(index, sponsor));
  });
}

function createSponsorRow(index, sponsor) {
  const row = document.createElement("div");
  row.className = "sponsor-row";
  row.dataset.index = String(index);
  row.innerHTML = `
    <label>
      Sponsor ${index + 1} name / tagline
      <input type="text" class="sponsor-name-input" value="${escapeHtml(sponsor.name || "")}" placeholder="e.g. Google" maxlength="80" />
    </label>
    <label>
      Logo file or URL
      <input type="text" class="sponsor-logo-url" value="${escapeHtml(sponsor.logoUrl || "")}" placeholder="logo.png" inputmode="url" />
    </label>
    <label>
      Or upload logo
      <input type="file" class="sponsor-logo-file" accept="image/*" />
    </label>
    <div class="row-actions">
      <button type="button" class="ghost remove-sponsor-btn">Remove</button>
    </div>
  `;
  return row;
}

function onAddSponsorRow() {
  const current = collectSponsorsFromForm();
  current.push({ name: "", logoUrl: "" });
  renderSponsorRows(current);
}

function onSponsorsContainerClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("remove-sponsor-btn")) return;
  const row = target.closest(".sponsor-row");
  if (!row) return;
  const removeIndex = toNumber(row.dataset.index);
  const current = collectSponsorsFromForm();
  current.splice(removeIndex, 1);
  renderSponsorRows(current);
}

function onSponsorsContainerChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.classList.contains("sponsor-logo-file")) return;
  const row = target.closest(".sponsor-row");
  if (!row) return;
  const urlInput = row.querySelector(".sponsor-logo-url");
  if (!(urlInput instanceof HTMLInputElement)) return;
  row.dataset.useSelectedFile = "true";
  urlInput.value = "";
  void onFileSelected(event, urlInput);
}

function onSponsorsContainerInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.classList.contains("sponsor-logo-url")) {
    return;
  }

  const row = target.closest(".sponsor-row");
  if (row) {
    row.dataset.useSelectedFile = "false";
  }
  const fileInput = row ? row.querySelector(".sponsor-logo-file") : null;
  if (fileInput instanceof HTMLInputElement && target.value.trim()) {
    fileInput.value = "";
  }
}

function collectSponsorsFromForm() {
  if (!refs.sponsorsContainer) return [];
  return Array.from(refs.sponsorsContainer.querySelectorAll(".sponsor-row")).map((row) => {
    const nameInput = row.querySelector(".sponsor-name-input");
    const logoInput = row.querySelector(".sponsor-logo-url");
    return {
      name: nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "",
      logoUrl: logoInput instanceof HTMLInputElement ? logoInput.value.trim() : ""
    };
  });
}

function resetTimerState() {
  const initial = getInitialTimerSeconds();
  state.remainingSeconds = initial;
  state.elapsedSeconds = 0;
  state.isRunning = false;

  if (state.tickHandle) {
    clearInterval(state.tickHandle);
    state.tickHandle = null;
  }

  if (refs.startPauseBtn) {
    refs.startPauseBtn.textContent = "Start";
  }
  setCapsuleRunning(false);
  updateTimerText();
}

function getInitialTimerSeconds() {
  return (
    toNumber(state.config.hours) * 3600 +
    toNumber(state.config.minutes) * 60 +
    toNumber(state.config.seconds)
  );
}

// Show Start button, hide Pause button (or vice versa)
function setCapsuleRunning(running) {
  if (refs.capsuleStartBtn) refs.capsuleStartBtn.classList.toggle("hidden", running);
  if (refs.capsulePauseBtn) refs.capsulePauseBtn.classList.toggle("hidden", !running);
}

function onStart() {
  if (state.isRunning) return;
  state.isRunning = true;
  if (refs.startPauseBtn) refs.startPauseBtn.textContent = "Pause";
  setCapsuleRunning(true);
  if (state.tickHandle) clearInterval(state.tickHandle);
  state.tickHandle = setInterval(onTick, 1000);
  saveTimerStatus();
}

function onPause() {
  if (!state.isRunning) return;
  state.isRunning = false;
  if (refs.startPauseBtn) refs.startPauseBtn.textContent = "Start";
  setCapsuleRunning(false);
  if (state.tickHandle) {
    clearInterval(state.tickHandle);
    state.tickHandle = null;
  }
  saveTimerStatus();
}

// Legacy toggle (kept for any other callers)
function onStartPause() {
  if (state.isRunning) {
    onPause();
  } else {
    onStart();
  }
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
  clearTimerStatus();
  resetTimerState();
}

function startTimer() {
  if (state.isRunning) return;
  if (state.config.timerType === "countdown" && state.remainingSeconds <= 0) return;
  onStart();
}

function stopRunningTimer() {
  state.isRunning = false;
  if (refs.startPauseBtn) refs.startPauseBtn.textContent = "Start";
  setCapsuleRunning(false);
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

  if (!SlideshowEngine._showingSponsor) {
    refs.timerLabel.textContent = state.config.timerTitle || "Hackathon Timer";
  }
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

// ── Sponsor Slideshow Engine ────────────────────────────
const SlideshowEngine = {
  _index: 0,
  _timer: null,
  _showingSponsor: false,

  restart() {
    this.stop();
    this._showingSponsor = false;
    this._index = 0;
    this._showTimer();
    
    if (state.config.slideshowEnabled && Array.isArray(state.config.sponsors) && state.config.sponsors.length > 0) {
      this._scheduleNext();
    }
  },

  stop() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._showTimer();
  },

  _scheduleNext() {
    const durationMs = (state.config.slideshowDuration || 5) * 1000;
    this._timer = setTimeout(() => this._next(), durationMs);
  },

  _next() {
    const sponsors = state.config.sponsors || [];
    if (sponsors.length === 0 || !state.config.slideshowEnabled) {
      this._showTimer();
      return;
    }

    if (this._showingSponsor) {
      this._index = (this._index + 1) % sponsors.length;
      this._showTimer();
    } else {
      this._showSponsor(sponsors[this._index]);
    }
    
    this._triggerReflow();
    this._scheduleNext();
  },

  _showTimer() {
    this._showingSponsor = false;
    if (refs.timerLabel) {
      refs.timerLabel.textContent = state.config.timerTitle;
    }
    if (refs.timerValue) {
      refs.timerValue.style.display = "";
    }
    if (refs.sponsorLogo) {
      refs.sponsorLogo.classList.add("hidden");
    }
  },

  _showSponsor(sponsor) {
    this._showingSponsor = true;
    if (refs.timerLabel) {
      refs.timerLabel.textContent = sponsor.name || "";
    }
    if (refs.timerValue) {
      refs.timerValue.style.display = "none";
    }
    if (refs.sponsorLogo) {
      refs.sponsorLogo.src = sponsor.logoUrl || "";
      if (sponsor.logoUrl && sponsor.logoUrl.trim()) {
        refs.sponsorLogo.classList.remove("hidden");
      } else {
        refs.sponsorLogo.classList.add("hidden");
      }
    }
  },

  _triggerReflow() {
    if (refs.timerCard) {
      refs.timerCard.style.animation = "none";
      void refs.timerCard.offsetWidth;
      refs.timerCard.style.animation = "";
    }
  }
};

function applyConfigToView() {
  renderGallery();
  applyTimerAppearance();
  placeTimerCard();
  updateTimerText();
  SlideshowEngine.restart();
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

function isVideoUrl(url) {
  if (!url) return false;
  // Check our tracked video blob URLs
  if (state.videoBlobUrls && state.videoBlobUrls.has(url)) return true;
  const cleanUrl = String(url).split("?")[0].split("#")[0].toLowerCase();
  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".avi") ||
    cleanUrl.endsWith(".mkv") ||
    url.startsWith("data:video/")
  );
}

function toMediaSrc(value) {
  const text = String(value || "").trim();
  if (
    /^(https?:|data:|blob:)/i.test(text) ||
    text.startsWith("/") ||
    text.startsWith("./") ||
    text.startsWith("../")
  ) {
    return text;
  }

  return encodeURI(text).replace(/#/g, "%23");
}

function renderGallery() {
  if (!refs.galleryList) {
    return;
  }

  refs.galleryList.innerHTML = "";
  const items = state.config.extraImages.filter((item) => String(item).trim().length > 0);

  items.forEach((url, index) => {
    const mediaSrc = toMediaSrc(url);

    if (isVideoUrl(url)) {
      const wrapper = document.createElement("div");
      wrapper.className = "gallery-item video-wrapper";
      
      const video = document.createElement("video");
      video.src = mediaSrc;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.controls = false;
      
      wrapper.appendChild(video);
      
      const overlay = document.createElement("div");
      overlay.className = "video-controls-overlay";
      overlay.innerHTML = `
        <button type="button" class="control-btn back-btn" title="Rewind 10s">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.6 8.5h-.7V15h.7v-3.5zm2.8 1.8c0 .5-.1.9-.3 1.2-.2.3-.5.5-.9.5s-.7-.2-.9-.5c-.2-.3-.3-.7-.3-1.2v-1.1c0-.5.1-.9.3-1.2.2-.3.5-.5.9-.5s.7.2.9.5c.2.3.3.7.3 1.2v1.1zm-.7-1.2c0-.3 0-.6-.1-.7-.1-.2-.2-.2-.4-.2s-.3.1-.4.2c-.1.2-.1.4-.1.7v1.2c0 .3 0 .5.1.7.1.1.2.2.4.2s.3-.1.4-.2c.1-.2.1-.4.1-.7v-1.2z"/></svg>
        </button>
        <button type="button" class="control-btn play-pause-btn" title="Play/Pause">
          <svg class="play-icon hidden" viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          <svg class="pause-icon" viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button type="button" class="control-btn forward-btn" title="Forward 10s">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8zm1.6 8.5h-.7V15h.7v-3.5zm-2.8 1.8c0 .5.1.9.3 1.2.2.3.5.5.9.5s.7-.2.9-.5c.2-.3.3-.7.3-1.2v-1.1c0-.5-.1-.9-.3-1.2-.2-.3-.5-.5-.9-.5s-.7.2-.9.5c-.2.3-.3.7-.3 1.2v1.1zm.7-1.2c0-.3 0-.6.1-.7.1-.2.2-.2.4-.2s.3.1.4.2c.1.2.1.4.1.7v1.2c0 .3 0 .5-.1.7-.1.1-.2.2-.4.2s-.3-.1-.4-.2c-.1-.2-.1-.4-.1-.7v-1.2z"/></svg>
        </button>
      `;
      wrapper.appendChild(overlay);

      const backBtn = overlay.querySelector(".back-btn");
      const playPauseBtn = overlay.querySelector(".play-pause-btn");
      const forwardBtn = overlay.querySelector(".forward-btn");
      const playIcon = playPauseBtn.querySelector(".play-icon");
      const pauseIcon = playPauseBtn.querySelector(".pause-icon");

      backBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        video.currentTime = Math.max(0, video.currentTime - 10);
      });

      forwardBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      });

      const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (video.paused) {
          void video.play();
          playIcon.classList.add("hidden");
          pauseIcon.classList.remove("hidden");
        } else {
          video.pause();
          playIcon.classList.remove("hidden");
          pauseIcon.classList.add("hidden");
        }
      };

      playPauseBtn.addEventListener("click", togglePlay);

      video.addEventListener("play", () => {
        playIcon.classList.add("hidden");
        pauseIcon.classList.remove("hidden");
      });
      video.addEventListener("pause", () => {
        playIcon.classList.remove("hidden");
        pauseIcon.classList.add("hidden");
      });

      refs.galleryList.appendChild(wrapper);
    } else {
      const img = document.createElement("img");
      img.className = "gallery-item";
      img.src = mediaSrc;
      img.alt = `Hackathon board ${index + 1}`;
      refs.galleryList.appendChild(img);
    }
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

  // Snapshot old time-related values BEFORE building new config
  const prevHours = state.config.hours;
  const prevMinutes = state.config.minutes;
  const prevSeconds = state.config.seconds;
  const prevTimerType = state.config.timerType;

  const autoHostUploads = fields.autoHostUploads ? fields.autoHostUploads.value === "on" : state.config.autoHostUploads;
  const imageHostingApiKey = fields.imageHostingApiKey ? fields.imageHostingApiKey.value.trim() : state.config.imageHostingApiKey;
  const imageHostingProvider = fields.imageHostingProvider ? fields.imageHostingProvider.value : state.config.imageHostingProvider;

  const extraRows = collectImageRowsFromForm();
  const resolvedExtraImages = [];
  for (const row of extraRows) {
    if (!row.urlInput || !row.fileInput) {
      continue;
    }

    const typedValue = row.urlInput.value.trim();
    const file = row.fileInput.files && row.fileInput.files[0];
    const shouldUseSelectedFile = file && (!typedValue || row.urlInput.closest(".image-row")?.dataset.useSelectedFile === "true");
    if (shouldUseSelectedFile) {
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

  const newHours   = fields.timerHours   ? clampNumber(fields.timerHours.value,   0, 999) : state.config.hours;
  const newMinutes = fields.timerMinutes ? clampNumber(fields.timerMinutes.value, 0,  59) : state.config.minutes;
  const newSeconds = fields.timerSeconds ? clampNumber(fields.timerSeconds.value, 0,  59) : state.config.seconds;
  const newTimerType = fields.timerType  ? fields.timerType.value : state.config.timerType;

  // Collect sponsor rows from form
  const rawSponsors = collectSponsorsFromForm();
  const resolvedSponsors = [];
  for (const sponsor of rawSponsors) {
    const sponsorRow = refs.sponsorsContainer
      ? Array.from(refs.sponsorsContainer.querySelectorAll(".sponsor-row"))[rawSponsors.indexOf(sponsor)]
      : null;
    const fileInput = sponsorRow ? sponsorRow.querySelector(".sponsor-logo-file") : null;
    const file = fileInput && fileInput.files && fileInput.files[0];
    let logoUrl = sponsor.logoUrl;
    const shouldUseSelectedFile = file && (!logoUrl.trim() || sponsorRow?.dataset.useSelectedFile === "true");
    if (shouldUseSelectedFile) {
      const resolved = await resolveHostedImageUrl(file, logoUrl, { autoHostUploads, imageHostingProvider, imageHostingApiKey });
      logoUrl = resolved;
    }
    if (sponsor.name.trim() || logoUrl.trim()) {
      resolvedSponsors.push({ name: sponsor.name, logoUrl });
    }
  }

  state.config = {
    ...state.config,
    extraImages: resolvedExtraImages,
    imageHostingProvider,
    autoHostUploads,
    imageHostingApiKey,
    timerTitle: fields.timerTitle ? fields.timerTitle.value.trim() || defaultConfig.timerTitle : state.config.timerTitle,
    timerType: newTimerType,
    hours: newHours,
    minutes: newMinutes,
    seconds: newSeconds,
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
    offsetY: fields.offsetY ? clampNumber(fields.offsetY.value, -500, 500) : state.config.offsetY,
    slideshowEnabled: fields.slideshowEnabled ? fields.slideshowEnabled.value === "on" : state.config.slideshowEnabled,
    slideshowDuration: fields.slideshowDuration ? Math.max(1, toNumber(fields.slideshowDuration.value) || 5) : state.config.slideshowDuration,
    sponsors: resolvedSponsors
  };

  saveConfig();

  // Only reset the timer if the duration or type actually changed
  const timeChanged =
    newHours !== prevHours ||
    newMinutes !== prevMinutes ||
    newSeconds !== prevSeconds ||
    newTimerType !== prevTimerType;

  if (timeChanged) {
    clearTimerStatus();
    resetTimerState();
  }

  applyConfigToView();
  renderImageRows(state.config.extraImages);
  renderSponsorRows(state.config.sponsors);
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
    offsetY: state.config.offsetY,
    slideshowEnabled: state.config.slideshowEnabled,
    slideshowDuration: state.config.slideshowDuration,
    sponsors: state.config.sponsors
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

  // Also ignore clicks on the capsule Edit button
  if (refs.capsuleEditBtn && refs.capsuleEditBtn.contains(target)) {
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
  // For VIDEO files: use blob URL (instant, no base64 memory bloat)
  if (file.type.startsWith("video/")) {
    const blobUrl = URL.createObjectURL(file);
    state.videoBlobUrls.add(blobUrl);
    return blobUrl;
  }

  // For IMAGE files: try to upload to host if configured
  if (options.autoHostUploads && options.imageHostingProvider === "imgbb" && options.imageHostingApiKey) {
    try {
      return await uploadToImgbb(file, options.imageHostingApiKey);
    } catch {
      return await fileToDataUrl(file);
    }
  }

  // Fallback: convert image to data URL
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
  return /^#[0-9A-Fa-f]{6}$/.test(text) ? text.toLowerCase() : fallback;
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

// Start the app now that everything is defined
initialize();
