// Accessibility preferences and settings
function setHighContrastMode(enabled) {
  const isEnabled = !!enabled;

  APP_STATE.highContrastEnabled = isEnabled;

  document.body.classList.toggle("high-contrast-mode", isEnabled);

  const contrastToggle = document.getElementById("high-contrast-toggle");
  contrastToggle?.classList.toggle("active", isEnabled);
  contrastToggle?.setAttribute("aria-pressed", String(isEnabled));

  const status = isEnabled ? "High contrast enabled." : "High contrast disabled.";
  updateHandsFreeStatus(status);
  speakText(status);

  if (APP_STATE.authUser) {
    persistCurrentAuthProfile();
  }
}

function setReadAloudMode(enabled) {
  APP_STATE.readAloudEnabled = !!enabled;

  const readAloudToggle = document.getElementById("read-aloud-toggle");
  readAloudToggle?.classList.toggle("active", APP_STATE.readAloudEnabled);
  readAloudToggle?.setAttribute("aria-pressed", String(APP_STATE.readAloudEnabled));

  if (APP_STATE.readAloudEnabled) {
    APP_STATE.voiceOutputEnabled = true;
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

function changeTextSize(delta) {
  const textSizeInput = document.getElementById("text-size");
  const currentValue = Number(textSizeInput?.value || 16);
  const nextValue = Math.min(22, Math.max(14, currentValue + delta));

  document.documentElement.style.fontSize = `${nextValue}px`;

  if (textSizeInput) {
    textSizeInput.value = String(nextValue);
  }

  const status = `Text size set to ${nextValue}px.`;
  updateHandsFreeStatus(status);
  speakText(status);
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

function applyLanguagePreference(languageCode = APP_STATE.appLanguage) {
  const language = String(languageCode || "en").toLowerCase();
  APP_STATE.appLanguage = language;

  document.documentElement.lang = language;

  if (APP_STATE.handsFreeRecognition) {
    APP_STATE.handsFreeRecognition.lang =
      language === "af" ? "af-ZA" :
      language === "zu" ? "zu-ZA" :
      language === "xh" ? "xh-ZA" :
      language === "nso" ? "n-ZA" :
      language === "tn" ? "en-ZA" :
      "en-ZA";
  }

  const status = `Language set to ${language.toUpperCase()}.`;
  updateHandsFreeStatus(status);

  if (APP_STATE.voiceOutputEnabled) {
    speakText(status);
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
    APP_STATE.voiceOutputEnabled = true;
    const toggle = document.querySelector(".toggle.active");
    if (toggle) {
      toggle.classList.add("active");
    }
    speakText("Blind mode enabled.");
    return;
  }

  if (chipText.includes("deaf")) {
    APP_STATE.voiceOutputEnabled = false;
    const status = "Voice responses turned off for deaf mode.";
    updateHandsFreeStatus(status);
    return;
  }

  if (chipText.includes("mobility")) {
    APP_STATE.mobilityPreferenceEnabled = true;
    showScreen("locations-screen");
    setLocationFilterByName("all");
    applyLocationFilters();
    const status = "Mobility mode opened with wheelchair-friendly locations.";
    updateHandsFreeStatus(status);
    speakText(status);
  }
}
