// Accessibility preferences and settings
function setHighContrastMode(enabled) {
  const isEnabled = !!enabled;

  document.body.classList.toggle("high-contrast-mode", isEnabled);

  const contrastToggle = document.getElementById("high-contrast-toggle");
  contrastToggle?.classList.toggle("active", isEnabled);
  contrastToggle?.setAttribute("aria-pressed", String(isEnabled));

  const status = isEnabled ? "High contrast enabled." : "High contrast disabled.";
  updateHandsFreeStatus(status);
  speakText(status);
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
  if (!APP_STATE.currentUserPosition) return;

  document.querySelectorAll("#locations-list .location-card").forEach(card => {
    const latitude = Number(card.dataset.latitude);
    const longitude = Number(card.dataset.longitude);
    const distanceElement = card.querySelector(".location-distance");

    if (!distanceElement || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const distance = calculateDistanceInKilometres(
      APP_STATE.currentUserPosition,
      { latitude, longitude }
    );

    if (distance === null) return;

    distanceElement.textContent = formatDistance(distance);
    distanceElement.hidden = false;
  });
}

function requestCurrentLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    position => {
      APP_STATE.currentUserPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      updateLocationCardDistances();
    },
    error => console.info("Current location is unavailable:", error.message),
    { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
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
