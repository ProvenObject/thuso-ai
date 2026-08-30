const DEMO_ACCOUNTS = {
  "tokelo-mashiane": {
    id: "tokelo-mashiane",
    name: "Tokelo Mashiane",
    password: "ThušoDemo2026!"
  },
  "carol-mashatola": {
    id: "carol-mashatola",
    name: "Carol Mashatola",
    password: "ThušoDemo2026!"
  },
  "nkadimeng-dimpe": {
    id: "nkadimeng-dimpe",
    name: "Nkadimeng Dimpe",
    password: "ThušoDemo2026!"
  },
  "dineo-maphalle": {
    id: "dineo-maphalle",
    name: "Dineo Maphalle",
    password: "ThušoDemo2026!"
  },
  "lufuno-nekhumbe": {
    id: "lufuno-nekhumbe",
    name: "Lufuno Nekhumbe",
    password: "ThušoDemo2026!"
  },
  "jackie-ramalebane": {
    id: "jackie-ramalebane",
    name: "Jackie Ramalebane",
    password: "ThušoDemo2026!"
  }
};

const AUTH_STORAGE_KEY = "thuso-demo-profile";
const AUTH_PROFILE_DEFAULTS = {
  readAloudEnabled: false,
  voiceOutputEnabled: true,
  mobilityPreferenceEnabled: false,
  appLanguage: "en",
  highContrastEnabled: false,
  textSize: 16,
  selectedPreferenceChip: null,
  accessibilityProfile: {
    lowVision: false,
    blind: false,
    deaf: false,
    mobility: false
  }
};

function getStoredAuthProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
    return profile && typeof profile === "object" ? profile : null;
  } catch (error) {
    return null;
  }
}

function saveAuthProfile(profile) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
}

function clearAuthProfile() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function applyAuthProfileToApp(profile) {
  if (!profile || typeof profile !== "object") return;

  if (typeof profile.readAloudEnabled === "boolean") {
    setReadAloudMode(profile.readAloudEnabled);
  }

  if (typeof profile.voiceOutputEnabled === "boolean") {
    APP_STATE.voiceOutputEnabled = profile.voiceOutputEnabled;
  }

  if (typeof profile.mobilityPreferenceEnabled === "boolean") {
    APP_STATE.mobilityPreferenceEnabled = profile.mobilityPreferenceEnabled;
  }

  if (typeof profile.appLanguage === "string" && profile.appLanguage) {
    applyLanguagePreference(profile.appLanguage);
  }

  if (typeof profile.highContrastEnabled === "boolean") {
    setHighContrastMode(profile.highContrastEnabled);
  }

  if (Number.isFinite(Number(profile.textSize))) {
    document.documentElement.style.fontSize = `${Number(profile.textSize)}px`;
    const textSizeInput = document.getElementById("text-size");
    if (textSizeInput) {
      textSizeInput.value = String(Number(profile.textSize));
    }
  }

  if (profile.accessibilityProfile) {
    const preferenceMap = {
      lowVision: "Low Vision",
      blind: "Blind",
      deaf: "Deaf",
      mobility: "Mobility"
    };

    document.querySelectorAll(".preference-chip").forEach(chip => {
      const text = chip.textContent.trim();
      const key = Object.keys(preferenceMap).find(item => preferenceMap[item] === text || text.toLowerCase().includes(preferenceMap[item].toLowerCase()));

      if (!key) return;

      const selected = !!profile.accessibilityProfile[key];
      chip.classList.toggle("selected", selected);

      if (key === "mobility" && selected) {
        APP_STATE.mobilityPreferenceEnabled = true;
      }
    });
  }

  const voiceToggle = document.querySelector('.toggle:not(#high-contrast-toggle):not(#read-aloud-toggle)');
  if (voiceToggle) {
    voiceToggle.classList.toggle("active", APP_STATE.voiceOutputEnabled);
  }

  const contrastToggle = document.getElementById("high-contrast-toggle");
  if (contrastToggle) {
    contrastToggle.classList.toggle("active", !!document.body.classList.contains("high-contrast-mode"));
    contrastToggle.setAttribute("aria-pressed", String(document.body.classList.contains("high-contrast-mode")));
  }

  const readAloudToggle = document.getElementById("read-aloud-toggle");
  if (readAloudToggle) {
    readAloudToggle.classList.toggle("active", !!APP_STATE.readAloudEnabled);
    readAloudToggle.setAttribute("aria-pressed", String(!!APP_STATE.readAloudEnabled));
  }

  const languageSelect = document.getElementById("language-select");
  if (languageSelect) {
    languageSelect.value = APP_STATE.appLanguage || "en";
  }

  if (APP_STATE.mobilityPreferenceEnabled) {
    showScreen("locations-screen");
    setLocationFilterByName("all");
    applyLocationFilters();
  }
}

function persistCurrentAuthProfile() {
  if (!APP_STATE.authUser) return;

  const profile = {
    userId: APP_STATE.authUser.id,
    userName: APP_STATE.authUser.name,
    readAloudEnabled: APP_STATE.readAloudEnabled,
    voiceOutputEnabled: APP_STATE.voiceOutputEnabled,
    mobilityPreferenceEnabled: APP_STATE.mobilityPreferenceEnabled,
    appLanguage: APP_STATE.appLanguage,
    highContrastEnabled: document.body.classList.contains("high-contrast-mode"),
    textSize: Number(document.getElementById("text-size")?.value || 16),
    accessibilityProfile: {
      lowVision: document.querySelectorAll(".preference-chip")[0]?.classList.contains("selected") || false,
      blind: document.querySelectorAll(".preference-chip")[1]?.classList.contains("selected") || false,
      deaf: document.querySelectorAll(".preference-chip")[2]?.classList.contains("selected") || false,
      mobility: document.querySelectorAll(".preference-chip")[3]?.classList.contains("selected") || false
    }
  };

  saveAuthProfile(profile);
}

function updateAuthStatusUI() {
  const authStatus = document.getElementById("auth-status");
  const welcomeLabel = document.getElementById("welcome-label");
  const welcomeTitle = document.getElementById("welcome-title");
  const signInBtn = document.getElementById("sign-in-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (APP_STATE.authUser) {
    const name = APP_STATE.authUser.name || "User";
    const firstName = name.split(" ")[0];

    if (authStatus) {
      authStatus.textContent = `Signed in as ${APP_STATE.authUser.name}`;
      authStatus.className = "auth-status signed-in-status";
    }

    if (welcomeLabel) {
      welcomeLabel.textContent = `Hi, ${firstName} 👋`;
    }

    if (welcomeTitle) {
      welcomeTitle.innerHTML = `How can Thušo<br>help you today?`;
    }

    if (signInBtn) signInBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
  } else {
    if (authStatus) {
      authStatus.textContent = "Guest mode";
      authStatus.className = "auth-status guest-status";
    }

    if (welcomeLabel) {
      welcomeLabel.textContent = "Hello! 👋";
    }

    if (welcomeTitle) {
      welcomeTitle.innerHTML = "How can Thušo<br>help you today?";
    }

    if (signInBtn) signInBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

function signInDemoUser(userId, password) {
  const user = DEMO_ACCOUNTS[userId];

  if (!user || password !== user.password) {
    alert("Demo sign in failed. Use the demo password provided in the profile section.");
    return false;
  }

  APP_STATE.authUser = { id: user.id, name: user.name };

  const storedProfile = getStoredAuthProfile();
  if (storedProfile && storedProfile.userId === user.id) {
    applyAuthProfileToApp(storedProfile);
  }

  updateAuthStatusUI();
  persistCurrentAuthProfile();
  return true;
}

function logoutDemoUser() {
  APP_STATE.authUser = null;
  clearAuthProfile();
  APP_STATE.highContrastEnabled = false;

  const authStatus = document.getElementById("auth-status");
  if (authStatus) {
    authStatus.textContent = "Guest mode";
    authStatus.className = "auth-status guest-status";
  }

  updateAuthStatusUI();

  const defaultLanguage = "en";
  APP_STATE.readAloudEnabled = false;
  APP_STATE.voiceOutputEnabled = true;
  APP_STATE.mobilityPreferenceEnabled = false;
  applyLanguagePreference(defaultLanguage);
  setHighContrastMode(false);
  document.documentElement.style.fontSize = "16px";
  const textSizeInput = document.getElementById("text-size");
  if (textSizeInput) {
    textSizeInput.value = "16";
  }

  document.querySelectorAll(".preference-chip").forEach(chip => {
    chip.classList.remove("selected");
  });

  const voiceToggle = document.querySelector('.toggle:not(#high-contrast-toggle):not(#read-aloud-toggle)');
  if (voiceToggle) {
    voiceToggle.classList.add("active");
  }

  const readAloudToggle = document.getElementById("read-aloud-toggle");
  if (readAloudToggle) {
    readAloudToggle.classList.remove("active");
    readAloudToggle.setAttribute("aria-pressed", "false");
  }

  const contrastToggle = document.getElementById("high-contrast-toggle");
  if (contrastToggle) {
    contrastToggle.classList.remove("active");
    contrastToggle.setAttribute("aria-pressed", "false");
  }

  showScreen("home-screen");
}

function initialiseAuth() {
  const storedProfile = getStoredAuthProfile();
  if (storedProfile && storedProfile.userId) {
    const account = DEMO_ACCOUNTS[storedProfile.userId];
    if (account) {
      APP_STATE.authUser = { id: account.id, name: account.name };
      applyAuthProfileToApp(storedProfile);
    }
  }

  const signInBtn = document.getElementById("sign-in-btn");
  if (signInBtn) {
    signInBtn.addEventListener("click", () => {
      const userSelect = document.getElementById("demo-user-select");
      const passwordInput = document.getElementById("demo-password-input");
      const userId = userSelect?.value || "tokelo-mashiane";
      const password = passwordInput?.value || "";
      signInDemoUser(userId, password);
      passwordInput.value = "";
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutDemoUser);
  }

  updateAuthStatusUI();
}
