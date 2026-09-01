const SPEECH_LANGUAGE_TAGS = {
  en: "en-ZA",
  af: "af-ZA",
  zu: "zu-ZA",
  xh: "xh-ZA",
  nso: "nso-ZA",
  tn: "tn-ZA"
};

function getSelectedSpeechLanguage() {
  return SPEECH_LANGUAGE_TAGS[APP_STATE.appLanguage] || SPEECH_LANGUAGE_TAGS.en;
}

function configureSpeechRecognitionLanguage(recognition) {
  if (!recognition) {
    return;
  }

  recognition.lang = getSelectedSpeechLanguage();
}

function normaliseSpeechText(text) {
  const plainText = String(text || "")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= 420) {
    return plainText;
  }

  const shortened = plainText.slice(0, 420);
  const lastSentence = Math.max(shortened.lastIndexOf("."), shortened.lastIndexOf("?"), shortened.lastIndexOf("!"));
  return `${shortened.slice(0, lastSentence > 80 ? lastSentence + 1 : shortened.length).trim()}...`;
}

// Speech recognition for chat input
function initialiseSpeechRecognition() {
  const voiceButton = document.getElementById("voice-btn");
  if (!voiceButton) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceButton.disabled = true;
    voiceButton.title = "Speech input is unavailable in this browser. You can still type your message.";
    voiceButton.setAttribute("aria-label", "Speech input unavailable. Type your message instead.");
    return;
  }

  APP_STATE.recognition = new SpeechRecognition();
  APP_STATE.recognition.continuous = false;
  APP_STATE.recognition.interimResults = false;
  configureSpeechRecognitionLanguage(APP_STATE.recognition);

  APP_STATE.recognition.addEventListener("start", () => {
    APP_STATE.isListening = true;
    voiceButton.disabled = true;
    voiceButton.classList.add("recording");
    refreshIcons();
  });

  APP_STATE.recognition.addEventListener("result", event => {
    const transcript = event.results[event.resultIndex][0].transcript;
    const normalised = transcript.toLowerCase().trim();

    const stopCommands = [
      "stop",
      "stop listening",
      "exit conversation",
      "end conversation",
      "goodbye",
      "good bye"
    ];

    if (stopCommands.some(command => normalised.includes(command))) {
      APP_STATE.recognition.stop();
      addChatMessage("Voice input stopped.", "assistant");
      return;
    }

    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      chatInput.value = transcript;
      const form = document.getElementById("chat-form");
      form?.requestSubmit();
    }
  });

  APP_STATE.recognition.addEventListener("end", () => {
    APP_STATE.isListening = false;
    voiceButton.disabled = false;
    voiceButton.classList.remove("recording");
  });

  APP_STATE.recognition.addEventListener("error", event => {
    APP_STATE.isListening = false;
    voiceButton.disabled = false;
    voiceButton.classList.remove("recording");

    if (event.error === "language-not-supported") {
      updateHandsFreeStatus("The selected speech recognition language is not supported by this browser. Please choose another language or type your message.");
      return;
    }

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      const microphoneMessage = "Microphone permission was not granted. You can still type your message.";
      addChatMessage(microphoneMessage, "assistant")?.classList.add("unavailable-message");
      updateHandsFreeStatus(microphoneMessage);
      return;
    }

    if (event.error !== "no-speech" && event.error !== "aborted") {
      console.error("Speech recognition error:", event.error);
    }
  });

  voiceButton.addEventListener("click", () => {
    if (!APP_STATE.recognition) return;

    if (APP_STATE.isListening) {
      APP_STATE.recognition.stop();
      return;
    }

    // Avoid the mic picking up Thušo's own voice.
    if (APP_STATE.isAssistantSpeaking && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      APP_STATE.isAssistantSpeaking = false;
    }

    try {
      APP_STATE.recognition.start();
    } catch (error) {
      console.warn("Unable to start recognition:", error);
    }
  });
}

// ------------------------------------------------------------
// TTS voice selection
// ------------------------------------------------------------

// Prefer an en-ZA voice; otherwise fall back to any English voice. Never assumes a
// voice is installed - returns null if nothing suitable is available yet.
function resolvePreferredVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();

  if (!voices.length) {
    return null;
  }

  const requestedLanguage = getSelectedSpeechLanguage().toLowerCase();
  const requestedVoice = voices.find(voice => voice.lang && voice.lang.toLowerCase() === requestedLanguage);

  if (requestedVoice) {
    return requestedVoice;
  }

  const southAfricanEnglish = voices.find(voice => voice.lang && voice.lang.toLowerCase() === "en-za");
  return southAfricanEnglish || voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith("en")) || null;
}

let hasRequestedVoiceList = false;

// Voice lists often load asynchronously after page load, so we try immediately and
// again once the browser reports they're ready - without attaching more than one
// listener.
function initialiseSpeechSynthesisVoice() {
  if (!("speechSynthesis" in window) || APP_STATE.preferredVoice || hasRequestedVoiceList) {
    return;
  }

  hasRequestedVoiceList = true;
  APP_STATE.preferredVoice = resolvePreferredVoice();

  if (!APP_STATE.preferredVoice) {
    window.speechSynthesis.addEventListener("voiceschanged", function handleVoicesChanged() {
      APP_STATE.preferredVoice = resolvePreferredVoice();
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    });
  }
}

function refreshSpeechSynthesisVoice() {
  APP_STATE.preferredVoice = null;
  hasRequestedVoiceList = false;
  initialiseSpeechSynthesisVoice();
}

function speakText(text) {
  if (!APP_STATE.voiceOutputEnabled) {
    if (APP_STATE.handsFreeModeActive) {
      resumeHandsFreeListening();
    }
    return;
  }

  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-speech is not supported.");
    if (APP_STATE.handsFreeModeActive) {
      resumeHandsFreeListening();
    }
    return;
  }

  initialiseSpeechSynthesisVoice();

  if (APP_STATE.handsFreeModeActive && APP_STATE.handsFreeRecognition && APP_STATE.isHandsFreeListening) {
    try {
      APP_STATE.handsFreeRecognition.stop();
    } catch (error) {
      console.warn("Unable to pause hands free recognition:", error);
    }
  }

  window.speechSynthesis.cancel();

  const speechText = normaliseSpeechText(text);

  if (!speechText) {
    if (APP_STATE.handsFreeModeActive) {
      resumeHandsFreeListening();
    }
    return;
  }

  APP_STATE.lastSpokenText = speechText;

  const speech = new SpeechSynthesisUtterance(speechText);

  // Use the actual matched voice when we have one; otherwise keep the en-ZA hint so
  // the browser can still pick its closest available English voice.
  if (APP_STATE.preferredVoice) {
    speech.voice = APP_STATE.preferredVoice;
    speech.lang = APP_STATE.preferredVoice.lang;
  } else {
    speech.lang = "en-ZA";
  }

  speech.rate = 1;
  speech.pitch = 1;

  speech.addEventListener("start", () => {
    APP_STATE.isAssistantSpeaking = true;
    updateHandsFreeStatus("Speaking...");
  });

  speech.addEventListener("end", () => {
    APP_STATE.isAssistantSpeaking = false;

    if (APP_STATE.handsFreeModeActive && !APP_STATE.voiceOutputEnabled) {
      return;
    }

    if (APP_STATE.handsFreeModeActive) {
      resumeHandsFreeListening();
    }
  });

  speech.addEventListener("error", () => {
    APP_STATE.isAssistantSpeaking = false;

    if (APP_STATE.handsFreeModeActive) {
      resumeHandsFreeListening();
    }
  });

  window.speechSynthesis.speak(speech);
}

function updateHandsFreeStatus(message) {
  const status = document.getElementById("hands-free-status");

  if (!status) return;

  status.textContent = message;
}
