const ACCESSIBILITY_STORAGE_KEY = "thuso-accessibility-preferences";

function getAccessibilityPreferenceSnapshot() {
  return {
    highContrastEnabled: APP_STATE.highContrastEnabled,
    readAloudEnabled: APP_STATE.readAloudEnabled,
    voiceOutputEnabled: APP_STATE.voiceOutputEnabled,
    mobilityPreferenceEnabled: APP_STATE.mobilityPreferenceEnabled,
    appLanguage: APP_STATE.appLanguage,
    textSize: APP_STATE.textSize,
    accessibilityProfile: {
      lowVision: document.querySelectorAll(".preference-chip")[0]?.classList.contains("selected") || false,
      blind: document.querySelectorAll(".preference-chip")[1]?.classList.contains("selected") || false,
      deaf: document.querySelectorAll(".preference-chip")[2]?.classList.contains("selected") || false,
      mobility: document.querySelectorAll(".preference-chip")[3]?.classList.contains("selected") || false
    }
  };
}

function persistAccessibilityPreferences() {
  localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(getAccessibilityPreferenceSnapshot()));

  if (APP_STATE.authUser && typeof persistCurrentAuthProfile === "function") {
    persistCurrentAuthProfile();
  }
}

function syncPreferenceChips(profile = {}) {
  const preferenceMap = ["lowVision", "blind", "deaf", "mobility"];
  document.querySelectorAll(".preference-chip").forEach((chip, index) => {
    chip.classList.toggle("selected", profile[preferenceMap[index]] === true);
  });
}

function setHighContrastMode(enabled, { announce = true, persist = true } = {}) {
  const isEnabled = !!enabled;

  APP_STATE.highContrastEnabled = isEnabled;

  document.body.classList.toggle("high-contrast-mode", isEnabled);

  const contrastToggle = document.getElementById("high-contrast-toggle");
  contrastToggle?.classList.toggle("active", isEnabled);
  contrastToggle?.setAttribute("aria-pressed", String(isEnabled));

  if (announce) {
    const status = isEnabled ? "High contrast enabled." : "High contrast disabled.";
    updateHandsFreeStatus(status);
    speakText(status);
  }

  if (persist) {
    persistAccessibilityPreferences();
  }
}

function setReadAloudMode(enabled, { persist = true } = {}) {
  APP_STATE.readAloudEnabled = !!enabled;

  const readAloudToggle = document.getElementById("read-aloud-toggle");
  readAloudToggle?.classList.toggle("active", APP_STATE.readAloudEnabled);
  readAloudToggle?.setAttribute("aria-pressed", String(APP_STATE.readAloudEnabled));

  if (APP_STATE.readAloudEnabled) {
    APP_STATE.voiceOutputEnabled = true;
  }

  if (persist) {
    persistAccessibilityPreferences();
  }
}

function setVoiceOutputMode(enabled, { announce = true, persist = true } = {}) {
  APP_STATE.voiceOutputEnabled = !!enabled;

  const voiceToggle = document.querySelector('.toggle:not(#high-contrast-toggle):not(#read-aloud-toggle)');
  voiceToggle?.classList.toggle("active", APP_STATE.voiceOutputEnabled);
  voiceToggle?.setAttribute("aria-pressed", String(APP_STATE.voiceOutputEnabled));

  if (!APP_STATE.voiceOutputEnabled) {
    setReadAloudMode(false, { persist: false });
  }

  if (announce) {
    updateHandsFreeStatus(APP_STATE.voiceOutputEnabled ? "Voice responses enabled." : "Voice responses disabled.");
  }

  if (persist) {
    persistAccessibilityPreferences();
  }
}

function speakButtonLabel(button) {
  if (!APP_STATE.readAloudEnabled || !button || button.id === "read-aloud-toggle") {
    return;
  }

  const label = button.getAttribute("aria-label") || button.innerText.trim();
  if (label) {
    speakText(label);
  }
}

function setTextSize(value, { announce = true, persist = true } = {}) {
  const textSizeInput = document.getElementById("text-size");
  const nextValue = Math.min(22, Math.max(14, Number(value) || 16));

  document.documentElement.style.fontSize = `${nextValue}px`;
  document.documentElement.style.setProperty("--text-scale", String(nextValue / 16));
  APP_STATE.textSize = nextValue;

  if (textSizeInput) {
    textSizeInput.value = String(nextValue);
  }

  if (announce) {
    const sizeLabel = nextValue <= 14 ? "Small" : nextValue <= 16 ? "Normal" : nextValue <= 19 ? "Large" : "Extra large";
    const status = `Text size set to ${sizeLabel}.`;
    updateHandsFreeStatus(status);
    speakText(status);
  }

  if (persist) {
    persistAccessibilityPreferences();
  }
}

function changeTextSize(delta) {
  setTextSize(APP_STATE.textSize + delta);
}

function setMobilityPreference(enabled, { announce = true, persist = true } = {}) {
  APP_STATE.mobilityPreferenceEnabled = !!enabled;
  const mobilityChip = [...document.querySelectorAll(".preference-chip")]
    .find(chip => chip.textContent.toLowerCase().includes("mobility"));
  mobilityChip?.classList.toggle("selected", APP_STATE.mobilityPreferenceEnabled);
  syncLocationRecommendations();
  applyLocationFilters();

  if (announce) {
    const status = APP_STATE.mobilityPreferenceEnabled ? "Mobility preference enabled." : "Mobility preference disabled.";
    updateHandsFreeStatus(status);
    speakText(status);
  }

  if (persist) {
    persistAccessibilityPreferences();
  }
}

function restoreAccessibilityPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") return;

    setHighContrastMode(stored.highContrastEnabled === true, { announce: false, persist: false });
    setReadAloudMode(stored.readAloudEnabled === true, { persist: false });
    setVoiceOutputMode(stored.voiceOutputEnabled !== false, { announce: false, persist: false });
    applyLanguagePreference(stored.appLanguage || "en", { announce: false, persist: false });
    setTextSize(stored.textSize, { announce: false, persist: false });
    syncPreferenceChips(stored.accessibilityProfile);
    setMobilityPreference(stored.mobilityPreferenceEnabled === true, { announce: false, persist: false });
  } catch (error) {
    console.warn("Unable to restore accessibility preferences:", error);
  }
}

function updateLocationCardDistances() {
  const userLocation = APP_STATE.currentUserPosition;

  document.querySelectorAll("#locations-list .location-card").forEach(card => {
    const distanceElement = card.querySelector(".location-distance");
    if (!distanceElement) return;

    const latitude = Number(card.dataset.latitude);
    const longitude = Number(card.dataset.longitude);

    // Keep the existing behaviour for missing coordinates, but only show a numeric
    // straight-line distance when the browser's location accuracy is good enough.
    if (!userLocation || !Number.isFinite(userLocation.latitude) || !Number.isFinite(userLocation.longitude)) {
      distanceElement.textContent = "Distance unavailable";
      distanceElement.hidden = false;
      return;
    }

    if (!Number.isFinite(userLocation.accuracy) || userLocation.accuracy > MAX_LOCATION_ACCURACY_METRES) {
      distanceElement.textContent = "Distance unavailable";
      distanceElement.hidden = false;
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      distanceElement.textContent = "Distance unavailable";
      distanceElement.hidden = false;
      return;
    }

    const distance = calculateDistanceInKilometres(userLocation, { latitude, longitude });

    if (distance === null) {
      distanceElement.textContent = "Distance unavailable";
      distanceElement.hidden = false;
      return;
    }

    distanceElement.textContent = formatDistance(distance);
    distanceElement.hidden = false;
  });
}

function requestCurrentLocation(force = false) {
  if (!navigator.geolocation) return;

  const hasValidPosition = APP_STATE.currentUserPosition &&
    Number.isFinite(APP_STATE.currentUserPosition.latitude) &&
    Number.isFinite(APP_STATE.currentUserPosition.longitude) &&
    Number.isFinite(APP_STATE.currentUserPosition.accuracy) &&
    APP_STATE.currentUserPosition.accuracy <= MAX_LOCATION_ACCURACY_METRES;

  // Prefer a fresh browser fix instead of reusing stale cached coordinates.
  if (!force && hasValidPosition) {
    updateLocationCardDistances();
    return;
  }

  if (APP_STATE.locationRequestInFlight) {
    return;
  }

  APP_STATE.locationRequestInFlight = true;

  navigator.geolocation.getCurrentPosition(
    position => {
      APP_STATE.currentUserPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
      };
      APP_STATE.locationRequestInFlight = false;
      updateLocationCardDistances();
    },
    error => {
      APP_STATE.locationRequestInFlight = false;
      APP_STATE.currentUserPosition = {
        latitude: null,
        longitude: null,
        accuracy: null
      };
      console.info("Current location is unavailable:", error.message);
      updateLocationCardDistances();
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

function applyLanguagePreference(languageCode = APP_STATE.appLanguage, { announce = true, persist = true } = {}) {
  const language = String(languageCode || "en").toLowerCase();
  APP_STATE.appLanguage = language;

  document.documentElement.lang = language;

  if (typeof configureSpeechRecognitionLanguage === "function") {
    configureSpeechRecognitionLanguage(APP_STATE.recognition);
    configureSpeechRecognitionLanguage(APP_STATE.handsFreeRecognition);
  }

  if (typeof refreshSpeechSynthesisVoice === "function") {
    refreshSpeechSynthesisVoice();
  }

  if (announce) {
    const status = `Language set to ${language.toUpperCase()}.`;
    updateHandsFreeStatus(status);

    if (APP_STATE.voiceOutputEnabled) {
      speakText(status);
    }
  }

  if (persist) {
    persistAccessibilityPreferences();
  }
}

function applyAccessibilityPreference(chip) {
  if (!chip) return;

  const chipText = chip.textContent.toLowerCase();

  if (chipText.includes("low vision")) {
    setHighContrastMode(true);
    changeTextSize(2);
    return;
  }

  if (chipText.includes("blind")) {
    setHighContrastMode(true);
    setVoiceOutputMode(true, { announce: false });
    speakText("Blind mode enabled.");
    return;
  }

  if (chipText.includes("deaf")) {
    setVoiceOutputMode(false, { announce: false });
    const status = "Voice responses turned off for deaf mode.";
    updateHandsFreeStatus(status);
    return;
  }

  if (chipText.includes("mobility")) {
    setMobilityPreference(true, { announce: false });
    showScreen("locations-screen");
    setLocationFilterByName("all");
    applyLocationFilters();
    const status = "Mobility mode opened with wheelchair-friendly locations.";
    updateHandsFreeStatus(status);
    speakText(status);
  }
}
