// Hands-free voice command processing and execution
function getCityFromVoiceCommand(command) {
  const cityMap = {
    polokwane: "Polokwane",
    seshego: "Seshego",
    lebowakgomo: "Lebowakgomo",
    mokopane: "Mokopane",
    tzaneen: "Tzaneen",
    giyani: "Giyani",
    thohoyandou: "Thohoyandou",
    "louis trichardt": "Louis Trichardt",
    musina: "Musina",
    burgersfort: "Burgersfort",
    "jane furse": "Jane Furse",
    janefurse: "Jane Furse",
    makhado: "Louis Trichardt",
    sibasa: "Thohoyandou",
    "groot letaba": "Tzaneen"
  };

  const commandText = normaliseVoiceCommand(command);

  for (const [key, value] of Object.entries(cityMap)) {
    if (commandText.includes(key)) {
      return value;
    }
  }

  return null;
}

function getServiceFromVoiceCommand(command) {
  const serviceMap = {
    "home affairs": "home affairs",
    "home affairs office": "home affairs",
    "id office": "home affairs",
    "passport office": "home affairs",
    "birth certificate": "home affairs",
    grant: "sassa",
    sassa: "sassa",
    "social grant": "sassa",
    health: "health",
    clinic: "health",
    hospital: "health",
    doctor: "health",
    medical: "health",
    municipality: "municipal services",
    "municipal services": "municipal services",
    rates: "municipal services",
    water: "municipal services",
    electricity: "municipal services",
    education: "education",
    school: "education",
    bursary: "education",
    university: "education"
  };

  const commandText = normaliseVoiceCommand(command);

  for (const [key, value] of Object.entries(serviceMap)) {
    if (commandText.includes(key)) {
      return value;
    }
  }

  return null;
}

function getAccessibilityFilterFromVoiceCommand(command) {
  const commandText = normaliseVoiceCommand(command);

  if (
    commandText.includes("wheelchair") ||
    commandText.includes("wheel chair") ||
    commandText.includes("mobility") ||
    (commandText.includes("accessibility") && commandText.includes("wheelchair"))
  ) {
    return "wheelchair";
  }

  if (
    commandText.includes("ramp") ||
    commandText.includes("step free") ||
    commandText.includes("level access")
  ) {
    return "ramp";
  }

  if (
    commandText.includes("elevator") ||
    commandText.includes("lift")
  ) {
    return "elevator";
  }

  if (
    commandText.includes("audio") ||
    commandText.includes("voice guidance") ||
    commandText.includes("audio guidance")
  ) {
    return "audio";
  }

  if (
    commandText.includes("sign language") ||
    commandText.includes("sign language support") ||
    commandText.includes("deaf") ||
    commandText.includes("hearing")
  ) {
    return "sign";
  }

  if (
    commandText.includes("accessible entrance") ||
    commandText.includes("easy entry") ||
    commandText.includes("step free entrance")
  ) {
    return "entrance";
  }

  return "all";
}

function executeHandsFreeCommand(rawCommand) {
  const command = normaliseVoiceCommand(rawCommand);

  if (!command) {
    return false;
  }

  const matchesAny = terms => terms.some(term => command.includes(term));

  if (
    matchesAny([
      "increase text size",
      "make text bigger",
      "bigger text",
      "larger text",
      "text bigger"
    ]) || (
      command.includes("text size") && /(up|increase|larger|bigger|more)/.test(command)
    )
  ) {
    changeTextSize(1);
    return true;
  }

  if (
    matchesAny([
      "decrease text size",
      "make text smaller",
      "smaller text",
      "reduce text size",
      "text smaller"
    ]) || (
      command.includes("text size") && /(down|decrease|smaller|less|reduce)/.test(command)
    )
  ) {
    changeTextSize(-1);
    return true;
  }

  if (
    matchesAny([
      "turn on high contrast",
      "enable high contrast",
      "activate high contrast",
      "high contrast on",
      "turn on contrast",
      "enable contrast",
      "activate contrast",
      "contrast on"
    ]) || (
      command.includes("contrast") && /(on|enable|activate|light|bright)/.test(command)
    )
  ) {
    setHighContrastMode(true);
    return true;
  }

  if (
    matchesAny([
      "turn off high contrast",
      "disable high contrast",
      "deactivate high contrast",
      "high contrast off",
      "turn off contrast",
      "disable contrast",
      "deactivate contrast",
      "contrast off",
      "normal contrast",
      "low contrast"
    ]) || (
      command.includes("contrast") && /(off|disable|deactivate|normal|low)/.test(command)
    )
  ) {
    setHighContrastMode(false);
    return true;
  }

  if (
    matchesAny([
      "turn on voice responses",
      "enable voice responses",
      "activate voice responses",
      "turn on speech",
      "turn on voice output"
    ]) || (
      command.includes("voice") && /on|enable|activate/.test(command)
    )
  ) {
    APP_STATE.voiceOutputEnabled = true;
    const status = "Voice responses enabled.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "turn off voice responses",
      "disable voice responses",
      "deactivate voice responses",
      "turn off speech",
      "turn off voice output"
    ]) || (
      command.includes("voice") && /off|disable|deactivate/.test(command)
    )
  ) {
    APP_STATE.voiceOutputEnabled = false;
    const status = "Voice responses disabled.";
    updateHandsFreeStatus(status);
    return true;
  }

  if (
    matchesAny([
      "open home",
      "go home",
      "show home",
      "home screen",
      "return home",
      "back home"
    ])
  ) {
    showScreen("home-screen");
    const status = "Opening home.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "open services",
      "show services",
      "find service",
      "go to services",
      "service list",
      "government services"
    ])
  ) {
    showScreen("services-screen");
    const status = "Opening services.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "open locations",
      "show locations",
      "accessible facilities",
      "find places",
      "show accessible places",
      "open accessible facilities",
      "show nearby places"
    ])
  ) {
    showScreen("locations-screen");
    const status = "Opening accessible locations.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "open ask",
      "open chat",
      "ask thušo",
      "talk to thušo",
      "start chat"
    ])
  ) {
    showScreen("ask-screen");
    const status = "Opening chat.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "open menu",
      "show menu",
      "open settings",
      "show settings",
      "go to menu",
      "main menu"
    ])
  ) {
    showScreen("menu-screen");
    const status = "Opening menu.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "open preferences",
      "show preferences",
      "my preferences",
      "go to preferences",
      "accessibility settings"
    ])
  ) {
    showScreen("preferences-screen");
    const status = "Opening preferences.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "open saved",
      "show saved",
      "saved places",
      "my saved places"
    ])
  ) {
    showScreen("saved-screen");
    const status = "Opening saved places.";
    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (
    matchesAny([
      "stop hands free",
      "exit hands free",
      "close hands free",
      "finish hands free",
      "deactivate hands free",
      "turn off hands free"
    ])
  ) {
    stopHandsFreeMode();
    return true;
  }

  if (
    matchesAny([
      "help",
      "what can you do",
      "what can i say",
      "voice help",
      "show commands"
    ])
  ) {
    const status = "Try open home, open services, open chat, turn on high contrast, increase text size, or ask a question like I need Home Affairs in Polokwane.";

    updateHandsFreeStatus(status);
    speakText(status);
    return true;
  }

  if (typeof sendChatMessage === "function") {
    updateHandsFreeStatus("Sending your request to Thušo...");
    sendChatMessage(command);
    return true;
  }

  return false;
}

function stopHandsFreeMode() {
  APP_STATE.handsFreeModeActive = false;

  if (APP_STATE.handsFreeListenTimer) {
    clearTimeout(APP_STATE.handsFreeListenTimer);
    APP_STATE.handsFreeListenTimer = null;
  }

  if (APP_STATE.handsFreeRecognition) {
    try {
      APP_STATE.handsFreeRecognition.stop();
    } catch (error) {
      console.warn("Unable to stop hands free recognition:", error);
    }
  }

  const handsFreeButton = document.getElementById("hands-free-btn");

  if (handsFreeButton) {
    handsFreeButton.classList.remove("recording");
  }

  updateHandsFreeStatus("Hands free mode off.");
}

function resumeHandsFreeListening() {
  if (!APP_STATE.handsFreeModeActive || !APP_STATE.handsFreeRecognition || APP_STATE.isAssistantSpeaking) {
    return;
  }

  try {
    APP_STATE.handsFreeRecognition.start();
  } catch (error) {
    console.warn("Unable to resume hands free recognition:", error);
  }
}

function initialiseHandsFreeControls() {
  const handsFreeButton = document.getElementById("hands-free-btn");

  if (!handsFreeButton) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    handsFreeButton.disabled = true;
    handsFreeButton.title = "Speech recognition is not supported in this browser.";
    handsFreeButton.innerHTML = `
      <i data-lucide="mic-off"></i>
      <span>Hands Free</span>
    `;
    refreshIcons();
    updateHandsFreeStatus("Hands free unavailable in this browser.");
    return;
  }

  APP_STATE.handsFreeRecognition = new SpeechRecognition();
  APP_STATE.handsFreeRecognition.lang = "en-ZA";
  APP_STATE.handsFreeRecognition.continuous = false;
  APP_STATE.handsFreeRecognition.interimResults = false;

  APP_STATE.handsFreeRecognition.addEventListener("start", () => {
    APP_STATE.handsFreeModeActive = true;
    handsFreeButton.classList.add("recording");
    updateHandsFreeStatus("Listening for voice commands...");
  });

  APP_STATE.handsFreeRecognition.addEventListener("result", event => {
    let transcript = "";

    for (let index = 0; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }

    const command = transcript.trim();

    if (!command) {
      return;
    }

    updateHandsFreeStatus(`Heard: ${command}`);

    const handled = executeHandsFreeCommand(command);

    if (!handled) {
      const fallback = "Command not recognised. Try open home, open services, increase text size, decrease text size, or turn on high contrast.";
      updateHandsFreeStatus(fallback);
      speakText(fallback);
    }
  });

  APP_STATE.handsFreeRecognition.addEventListener("end", () => {
    handsFreeButton.classList.remove("recording");

    if (APP_STATE.handsFreeModeActive) {
      if (APP_STATE.handsFreeListenTimer) {
        clearTimeout(APP_STATE.handsFreeListenTimer);
      }

      APP_STATE.handsFreeListenTimer = setTimeout(() => {
        if (!APP_STATE.handsFreeModeActive || APP_STATE.isAssistantSpeaking) {
          return;
        }

        resumeHandsFreeListening();
      }, 350);
    }
  });

  APP_STATE.handsFreeRecognition.addEventListener("error", event => {
    if (event.error !== "no-speech" && event.error !== "aborted") {
      console.warn("Hands free recognition error:", event.error);
    }
  });

  handsFreeButton.addEventListener("click", () => {
    if (APP_STATE.handsFreeModeActive) {
      stopHandsFreeMode();
      return;
    }

    APP_STATE.handsFreeModeActive = true;
    updateHandsFreeStatus("Hands free mode started. Say a command.");
    speakText("Hands free mode started. Say a command.");
  });

  updateHandsFreeStatus("Hands free ready.");
}
