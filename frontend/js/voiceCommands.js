// Hands-free voice command processing and execution

// Single source of truth for the restart gap and the canonical status labels, so the
// lifecycle (listening -> thinking -> speaking -> short delay -> listening) stays
// consistent everywhere it's referenced.
const HANDS_FREE_RESTART_DELAY_MS = 300;
const HANDS_FREE_STATUS = {
  LISTENING: "Listening...",
  THINKING: "Thinking...",
  SPEAKING: "Speaking...",
  PAUSED: "Paused",
  STOPPED: "Stopped",
};

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

// Matches a whole phrase (word-boundary safe) so "find service" doesn't also match
// "find services", and generic words like "help" can't match inside other words.
function commandIncludesPhrase(command, phrase) {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escapedPhrase}\\b`, "i").test(command);
}

function setMobilityPreferenceFromVoice(enabled) {
  const mobilityChip = [...document.querySelectorAll(".preference-chip")]
    .find(chip => chip.textContent.toLowerCase().includes("mobility"));

  if (!mobilityChip) {
    return false;
  }

  if (mobilityChip.classList.contains("selected") !== enabled) {
    mobilityChip.click();
  }

  return true;
}

// Explicit UI-control phrases only. Conversational words like "ID", "Home Affairs",
// "wheelchair", "doctor" or "hospital" must never appear here - those belong in chat.
const HANDS_FREE_COMMANDS = [
  {
    id: "text_size_increase",
    phrases: [
      "increase text size", "make text bigger", "bigger text", "larger text",
      "make text larger", "text bigger", "text size up", "increase font size",
      "make font bigger", "zoom in text", "bigger font", "make the writing bigger",
      "increase the text", "make everything larger"
    ],
    run: () => { changeTextSize(1); return true; }
  },
  {
    id: "text_size_decrease",
    phrases: [
      "decrease text size", "make text smaller", "smaller text", "reduce text size",
      "text smaller", "text size down", "decrease font size", "make font smaller",
      "zoom out text", "smaller font", "make the writing smaller", "make everything smaller"
    ],
    run: () => { changeTextSize(-1); return true; }
  },
  {
    id: "high_contrast_on",
    phrases: [
      "turn on high contrast", "turn high contrast on", "enable high contrast",
      "activate high contrast", "high contrast on", "turn on contrast",
      "turn contrast on", "enable contrast", "activate contrast", "contrast on",
      "switch on high contrast", "high contrast mode on"
    ],
    run: () => { setHighContrastMode(true); return true; }
  },
  {
    id: "high_contrast_off",
    phrases: [
      "turn off high contrast", "turn high contrast off", "disable high contrast",
      "deactivate high contrast", "high contrast off", "turn off contrast",
      "turn contrast off", "disable contrast", "deactivate contrast", "contrast off",
      "normal contrast", "low contrast", "switch off high contrast", "high contrast mode off",
      "remove high contrast"
    ],
    run: () => { setHighContrastMode(false); return true; }
  },
  {
    id: "voice_responses_on",
    phrases: [
      "turn on voice responses", "turn voice responses on", "enable voice responses",
      "activate voice responses", "turn on speech", "turn on voice output",
      "voice responses on", "voice output on", "enable voice output"
    ],
    run: () => {
      APP_STATE.voiceOutputEnabled = true;
      const status = "Voice responses enabled.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "voice_responses_off",
    phrases: [
      "turn off voice responses", "turn voice responses off", "disable voice responses",
      "deactivate voice responses", "turn off speech", "turn off voice output",
      "voice responses off", "voice output off", "disable voice output",
      "mute voice", "silence voice"
    ],
    run: () => {
      APP_STATE.voiceOutputEnabled = false;
      const status = "Voice responses disabled.";
      updateHandsFreeStatus(status);
      return true;
    }
  },
  {
    id: "go_back",
    phrases: [
      "go back", "previous screen", "back button", "go to previous screen", "take me back",
      "go to the previous page", "previous page", "return"
    ],
    run: () => {
      showScreen(APP_STATE.previousScreen || "home-screen");
      const status = "Going back.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "show_home",
    phrases: [
      "open home", "go home", "show home", "home screen", "return home", "back home",
      "take me home", "home please", "go to home screen"
    ],
    run: () => {
      showScreen("home-screen");
      const status = "Opening home.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "show_services",
    phrases: [
      "open services", "show services", "find service", "go to services", "service list",
      "government services", "show me services", "open the services screen",
      "list government services"
    ],
    run: () => {
      showScreen("services-screen");
      const status = "Opening services.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "show_locations",
    phrases: [
      "open locations", "show locations", "accessible facilities", "find places",
      "show accessible places", "open accessible facilities", "show nearby places",
      "open the locations screen", "show me locations", "find accessible locations",
      "open facilities", "show facilities"
    ],
    run: () => {
      showScreen("locations-screen");
      const status = "Opening accessible locations.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "open_chat",
    phrases: [
      "open ask", "open chat", "ask thušo", "talk to thušo", "start chat",
      "open the chat", "start a conversation", "chat with thušo"
    ],
    run: () => {
      showScreen("ask-screen");
      const status = "Opening chat.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "open_menu",
    phrases: [
      "open menu", "show menu", "go to menu", "main menu", "show the menu"
    ],
    run: () => {
      showScreen("menu-screen");
      const status = "Opening menu.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "open_preferences",
    phrases: [
      "open preferences", "show preferences", "my preferences", "go to preferences",
      "accessibility settings", "open the preferences screen", "show my preferences",
      "open settings", "show settings", "open the settings", "go to settings"
    ],
    run: () => {
      showScreen("preferences-screen");
      const status = "Opening preferences.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "open_saved",
    phrases: [
      "open saved", "show saved", "saved places", "my saved places",
      "open my saved places", "show saved locations"
    ],
    run: () => {
      showScreen("saved-screen");
      const status = "Opening saved places.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "open_camera",
    phrases: [
      "open camera", "start camera", "use camera", "read something", "scan text"
    ],
    run: () => {
      showScreen("camera-screen");
      const status = "Opening camera.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "mobility_preference_on",
    phrases: [
      "turn on mobility preference", "enable mobility preference", "mobility preference on",
      "turn on mobility mode", "enable mobility mode"
    ],
    run: () => {
      if (setMobilityPreferenceFromVoice(true)) {
        return true;
      }

      const status = "Mobility preferences are unavailable right now.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "mobility_preference_off",
    phrases: [
      "turn off mobility preference", "disable mobility preference", "mobility preference off",
      "turn off mobility mode", "disable mobility mode"
    ],
    run: () => {
      if (setMobilityPreferenceFromVoice(false)) {
        const status = "Mobility preference disabled.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
      }

      const status = "Mobility preferences are unavailable right now.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "reset_text_size",
    phrases: [
      "reset text size", "reset font size", "default text size", "restore text size"
    ],
    run: () => {
      const textSizeInput = document.getElementById("text-size");
      document.documentElement.style.fontSize = "16px";
      if (textSizeInput) {
        textSizeInput.value = "16";
      }
      const status = "Text size reset to default.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "filter_wheelchair_accessible",
    phrases: [
      "filter wheelchair accessible", "show wheelchair accessible locations",
      "filter by wheelchair access", "wheelchair accessible filter",
      "filter for wheelchair access", "turn on wheelchair filter"
    ],
    run: () => {
      showScreen("locations-screen");
      setTimeout(() => setLocationFilterByName("wheelchairAccessible"), 400);
      const status = "Filtering for wheelchair accessible locations.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "filter_audio_guidance",
    phrases: [
      "filter audio guidance", "show audio guidance locations",
      "filter by audio guidance", "audio guidance filter", "turn on audio guidance filter"
    ],
    run: () => {
      showScreen("locations-screen");
      setTimeout(() => setLocationFilterByName("audioGuidance"), 400);
      const status = "Filtering for locations with audio guidance.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "filter_sign_language",
    phrases: [
      "filter sign language", "show sign language locations",
      "filter by sign language support", "sign language filter", "turn on sign language filter"
    ],
    run: () => {
      showScreen("locations-screen");
      setTimeout(() => setLocationFilterByName("signLanguageSupport"), 400);
      const status = "Filtering for locations with sign language support.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "filter_accessible_entrance",
    phrases: [
      "filter accessible entrance", "show accessible entrance locations",
      "filter by accessible entrance", "accessible entrance filter",
      "turn on accessible entrance filter"
    ],
    run: () => {
      showScreen("locations-screen");
      setTimeout(() => setLocationFilterByName("accessibleEntrance"), 400);
      const status = "Filtering for locations with an accessible entrance.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "read_aloud_on",
    phrases: [
      "turn on read aloud", "turn read aloud on", "enable read aloud", "activate read aloud", "read aloud on"
    ],
    run: () => {
      setReadAloudMode(true);
      const status = "Read aloud enabled.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  },
  {
    id: "read_aloud_off",
    phrases: [
      "turn off read aloud", "turn read aloud off", "disable read aloud", "deactivate read aloud", "read aloud off"
    ],
    run: () => {
      setReadAloudMode(false);
      const status = "Read aloud disabled.";
      updateHandsFreeStatus(status);
      return true;
    }
  },
  {
    id: "stop_reading",
    phrases: [
      "stop reading", "stop talking", "stop speaking", "be quiet"
    ],
    run: () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      APP_STATE.isAssistantSpeaking = false;
      updateHandsFreeStatus("Stopped reading.");
      return true;
    }
  },
  {
    id: "repeat_last_response",
    phrases: [
      "repeat that", "say that again", "repeat", "say again", "what did you say", "read that again"
    ],
    run: () => {
      if (!APP_STATE.lastSpokenText) {
        const status = "There's nothing to repeat yet.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
      }

      speakText(APP_STATE.lastSpokenText);
      return true;
    }
  },
  {
    id: "hands_free_start",
    phrases: [
      "start hands free", "begin hands free", "enable hands free",
      "turn on hands free", "start listening"
    ],
    run: () => {
      if (APP_STATE.handsFreeModeActive) {
        return true;
      }

      APP_STATE.handsFreeModeActive = true;
      APP_STATE.handsFreePaused = false;
      const status = "Hands free mode started. Say a command.";
      updateHandsFreeStatus(status);
      speakText(status);
      resumeHandsFreeListening();
      return true;
    }
  },
  {
    id: "hands_free_pause",
    phrases: [
      "pause hands free", "pause listening", "pause"
    ],
    run: () => {
      APP_STATE.handsFreePaused = true;
      updateHandsFreeStatus(HANDS_FREE_STATUS.PAUSED);
      speakText("Hands free paused. Say resume to continue.");
      return true;
    }
  },
  {
    id: "hands_free_resume",
    phrases: [
      "resume hands free", "resume listening", "resume"
    ],
    run: () => {
      APP_STATE.handsFreePaused = false;
      speakText("Hands free resumed.");
      return true;
    }
  },
  {
    id: "emergency_help",
    phrases: [
      "emergency help", "i need emergency help", "call emergency services",
      "need emergency help", "emergency services"
    ],
    run: () => { triggerEmergencyHelp(); return true; }
  },
  {
    id: "stop_hands_free",
    phrases: [
      "stop hands free", "exit hands free", "close hands free", "finish hands free",
      "deactivate hands free", "turn off hands free", "cancel hands free", "end voice mode",
      "goodbye", "bye", "exit", "stop", "stop listening", "end conversation"
    ],
    run: () => { stopHandsFreeMode(); return true; }
  },
  {
    id: "voice_help",
    phrases: [
      "what can you do", "what can i say", "voice help", "show commands",
      "list commands", "what commands can i use", "help me use voice commands"
    ],
    run: () => {
      const status = "Try open home, open services, open chat, turn on high contrast, increase text size, or ask a question like I need Home Affairs in Polokwane.";
      updateHandsFreeStatus(status);
      speakText(status);
      return true;
    }
  }
];

// Classification flow: 1) explicit UI command, 2) conversational request, 3) unknown/empty.
function classifyHandsFreeCommand(command) {
  if (!command) {
    return { type: "unknown" };
  }

  const matchedCommand = HANDS_FREE_COMMANDS.find(definition =>
    definition.phrases.some(phrase => commandIncludesPhrase(command, phrase))
  );

  if (matchedCommand) {
    return { type: "ui_command", definition: matchedCommand };
  }

  return { type: "conversational" };
}

function isHandsFreeConfirmation(command) {
  return /^(yes|yes please|please do|go ahead|okay|ok|sure|do it)$/i.test(command);
}

function isHandsFreeRejection(command) {
  return /^(no|no thanks|not now|cancel that|never mind)$/i.test(command);
}

function describePendingHandsFreeAction(action) {
  if (action?.type === "filter_locations") {
    return "matching accessible locations";
  }

  return "matching locations";
}

async function sendHandsFreeConversation(rawCommand) {
  const command = normaliseVoiceCommand(rawCommand);
  const pendingAction = APP_STATE.handsFreePendingAction;

  if (pendingAction && isHandsFreeConfirmation(command)) {
    APP_STATE.handsFreePendingAction = null;
    handleBackendAction(pendingAction, { allowLocationNavigation: true });
    speakText(`Showing ${describePendingHandsFreeAction(pendingAction)}.`);
    return;
  }

  if (pendingAction && isHandsFreeRejection(command)) {
    APP_STATE.handsFreePendingAction = null;
    speakText("Okay, I'll keep us in the conversation.");
    return;
  }

  // A new request replaces an unanswered offer, so old results cannot control it.
  APP_STATE.handsFreePendingAction = null;

  const data = await sendChatMessage(rawCommand, {
    handleBackendAction: false,
    speakResponse: false
  });

  if (!data) {
    return;
  }

  const responseText = data.response || data.message || "Sorry, I could not find an answer.";
  const action = data.action;

  if (action?.type === "show_locations" || action?.type === "filter_locations") {
    APP_STATE.handsFreePendingAction = action;
    speakText(`${responseText} I found ${describePendingHandsFreeAction(action)}. Would you like me to show them?`);
    return;
  }

  if (action?.type === "show_location_details" || action?.type === "open_directions") {
    handleBackendAction(action, { allowLocationNavigation: true });
  }

  speakText(responseText);
}

function executeHandsFreeCommand(rawCommand) {
  const command = normaliseVoiceCommand(rawCommand);
  const classification = classifyHandsFreeCommand(command);

  if (classification.type === "unknown") {
    return false;
  }

  // While paused, only listen for the commands needed to resume or fully stop.
  const HANDS_FREE_PAUSE_OVERRIDE_IDS = new Set(["hands_free_resume", "stop_hands_free"]);

  if (
    APP_STATE.handsFreePaused &&
    !(classification.type === "ui_command" && HANDS_FREE_PAUSE_OVERRIDE_IDS.has(classification.definition.id))
  ) {
    updateHandsFreeStatus(HANDS_FREE_STATUS.PAUSED);
    return true;
  }

  if (classification.type === "ui_command") {
    return classification.definition.run();
  }

  if (typeof sendChatMessage === "function") {
    updateHandsFreeStatus(HANDS_FREE_STATUS.THINKING);
    sendHandsFreeConversation(rawCommand);
    return true;
  }

  return false;
}

function stopHandsFreeMode() {
  APP_STATE.handsFreeModeActive = false;
  APP_STATE.handsFreePaused = false;

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

  APP_STATE.isHandsFreeListening = false;

  const handsFreeButton = document.getElementById("hands-free-btn");

  if (handsFreeButton) {
    handsFreeButton.classList.remove("recording");
  }

  updateHandsFreeStatus(HANDS_FREE_STATUS.STOPPED);
}

// Single gatekeeper for starting recognition again. Every trigger (recognition end,
// recognition error, TTS end, TTS error, chat request finishing) funnels through this
// so we can never listen while speaking/waiting, and never start recognition twice.
// Note: "paused" deliberately does NOT stop listening here - the mic must stay on so
// executeHandsFreeCommand can still hear "resume"/"stop hands free" while paused.
function startHandsFreeListening() {
  if (
    !APP_STATE.handsFreeModeActive ||
    APP_STATE.isAssistantSpeaking ||
    APP_STATE.isWaitingForResponse ||
    APP_STATE.isHandsFreeListening ||
    !APP_STATE.handsFreeRecognition
  ) {
    return;
  }

  try {
    APP_STATE.handsFreeRecognition.start();
  } catch (error) {
    console.warn("Unable to resume hands free recognition:", error);
  }
}

// Debounced: re-scheduling replaces any pending attempt instead of stacking timers,
// which is what prevented duplicate automatic restarts. Defaults to the single shared
// short delay (intentionally not zero) rather than each caller inventing its own gap.
function resumeHandsFreeListening(delay = HANDS_FREE_RESTART_DELAY_MS) {
  if (APP_STATE.handsFreeListenTimer) {
    clearTimeout(APP_STATE.handsFreeListenTimer);
  }

  APP_STATE.handsFreeListenTimer = setTimeout(() => {
    APP_STATE.handsFreeListenTimer = null;
    startHandsFreeListening();
  }, delay);
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
    APP_STATE.isHandsFreeListening = true;
    handsFreeButton.classList.add("recording");
    updateHandsFreeStatus(HANDS_FREE_STATUS.LISTENING);
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
    APP_STATE.isHandsFreeListening = false;
    handsFreeButton.classList.remove("recording");

    // Recognition always ends after one utterance (continuous = false). If nothing
    // else is pending (speech, a chat request), this is what brings the mic back.
    if (APP_STATE.handsFreeModeActive) {
      resumeHandsFreeListening();
    }
  });

  APP_STATE.handsFreeRecognition.addEventListener("error", event => {
    APP_STATE.isHandsFreeListening = false;

    if (event.error !== "no-speech" && event.error !== "aborted") {
      console.warn("Hands free recognition error:", event.error);
    }

    if (APP_STATE.handsFreeModeActive) {
      resumeHandsFreeListening();
    }
  });

  handsFreeButton.addEventListener("click", () => {
    if (APP_STATE.handsFreeModeActive) {
      stopHandsFreeMode();
      return;
    }

    APP_STATE.handsFreeModeActive = true;
    APP_STATE.handsFreePaused = false;
    updateHandsFreeStatus("Hands free mode started. Say a command.");
    speakText("Hands free mode started. Say a command.");
    // Safety net in case voice output is disabled and no TTS "end" event ever fires.
    resumeHandsFreeListening();
  });

  updateHandsFreeStatus("Hands free ready.");
}
