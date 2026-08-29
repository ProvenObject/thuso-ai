// Preference UI initialization
function initialiseSearch() {
  const serviceSearch = document.getElementById("service-search");
  const locationSearch = document.getElementById("location-search");

  if (serviceSearch) {
    serviceSearch.addEventListener("input", () => {
      applyServiceFilters();
    });
  }

  if (locationSearch) {
    locationSearch.addEventListener("input", event => {
      const query = event.target.value.toLowerCase().trim();

      document.querySelectorAll("#locations-list .location-card").forEach(card => {
        const matches = card.dataset.search.includes(query);
        card.style.display = matches ? "" : "none";
      });
    });
  }
}

function initialiseFilterChips() {
  document.querySelectorAll("#service-filter-chips .filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const container = chip.parentElement;
      container?.querySelectorAll(".filter-chip").forEach(item => {
        item.classList.remove("active");
      });

      chip.classList.add("active");
      applyServiceFilters();
    });
  });

  document.querySelectorAll("#location-filter-chips .filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const container = chip.parentElement;
      container?.querySelectorAll(".filter-chip").forEach(item => {
        item.classList.remove("active");
      });

      chip.classList.add("active");
      applyLocationFilters();
    });
  });

  applyServiceFilters();
  applyLocationFilters();
}

function initialisePreferences() {
  document.querySelectorAll(".preference-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");

      if (chip.classList.contains("selected")) {
        applyAccessibilityPreference(chip);
      } else if (chip.textContent.toLowerCase().includes("mobility")) {
        APP_STATE.mobilityPreferenceEnabled = false;
        applyLocationFilters();
      }
    });
  });

  const contrastToggle = document.getElementById("high-contrast-toggle");
  const readAloudToggle = document.getElementById("read-aloud-toggle");

  if (readAloudToggle) {
    readAloudToggle.addEventListener("click", () => {
      setReadAloudMode(!APP_STATE.readAloudEnabled);
      if (APP_STATE.readAloudEnabled) {
        speakText("Read aloud enabled.");
      }
    });
  }

  if (contrastToggle) {
    const contrastEnabled = document.body.classList.contains("high-contrast-mode");
    contrastToggle.classList.toggle("active", contrastEnabled);
    contrastToggle.setAttribute("aria-pressed", String(contrastEnabled));

    contrastToggle.addEventListener("click", () => {
      setHighContrastMode(!document.body.classList.contains("high-contrast-mode"));
    });
  }

  document.querySelectorAll(".toggle:not(#high-contrast-toggle):not(#read-aloud-toggle)").forEach(toggle => {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");

      const settingText = toggle.closest(".setting-row")?.innerText?.toLowerCase();

      if (settingText?.includes("voice responses")) {
        APP_STATE.voiceOutputEnabled = toggle.classList.contains("active");
        if (!APP_STATE.voiceOutputEnabled) {
          setReadAloudMode(false);
        }
        const status = APP_STATE.voiceOutputEnabled ? "Voice responses enabled." : "Voice responses disabled.";
        updateHandsFreeStatus(status);

        if (APP_STATE.voiceOutputEnabled) {
          speakText(status);
        }
      }
    });
  });

  const languageSelect = document.getElementById("language-select");
  if (languageSelect) {
    languageSelect.addEventListener("change", event => {
      const selectedLanguage = event.target.value || "en";
      applyLanguagePreference(selectedLanguage);
    });
  }

  const textSize = document.getElementById("text-size");
  if (textSize) {
    textSize.addEventListener("input", event => {
      document.documentElement.style.fontSize = `${event.target.value}px`;
    });
  }
}

// Shared by the emergency button and the "emergency help" voice command.
function triggerEmergencyHelp() {
  const message = "South African emergency numbers: 112 from a mobile phone, 10111 for police, and 10177 for ambulance services.";
  updateHandsFreeStatus(message);

  if (APP_STATE.voiceOutputEnabled) {
    speakText(message);
  }

  if (window.confirm(`${message}\n\nCall 112 now?`)) {
    window.location.href = "tel:112";
  }
}

function initialiseEmergencyHelp() {
  const emergencyButton = document.getElementById("emergency-help-btn");
  if (!emergencyButton) return;

  emergencyButton.addEventListener("click", triggerEmergencyHelp);
}
