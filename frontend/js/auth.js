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

  setReadAloudMode(profile.readAloudEnabled === true, { persist: false });
  setVoiceOutputMode(profile.voiceOutputEnabled !== false, { announce: false, persist: false });
  applyLanguagePreference(profile.appLanguage || "en", { announce: false, persist: false });
  setHighContrastMode(profile.highContrastEnabled === true, { announce: false, persist: false });
  setTextSize(profile.textSize, { announce: false, persist: false });
  syncPreferenceChips(profile.accessibilityProfile);
  setMobilityPreference(profile.mobilityPreferenceEnabled === true, { announce: false, persist: false });

  const languageSelect = document.getElementById("language-select");
  if (languageSelect) {
    languageSelect.value = APP_STATE.appLanguage || "en";
  }

  persistAccessibilityPreferences();
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
  setReadAloudMode(false, { persist: false });
  setVoiceOutputMode(true, { announce: false, persist: false });
  setMobilityPreference(false, { announce: false, persist: false });
  applyLanguagePreference(defaultLanguage, { announce: false, persist: false });
  setHighContrastMode(false, { announce: false, persist: false });
  setTextSize(16, { announce: false, persist: false });

  document.querySelectorAll(".preference-chip").forEach(chip => {
    chip.classList.remove("selected");
  });

  persistAccessibilityPreferences();

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
