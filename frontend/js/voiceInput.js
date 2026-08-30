// Speech recognition for chat input
function initialiseSpeechRecognition() {
  const voiceButton = document.getElementById("voice-btn");
  if (!voiceButton) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceButton.style.display = "none";
    console.warn("Speech recognition is not supported in this browser.");
    return;
  }

  APP_STATE.recognition = new SpeechRecognition();
  APP_STATE.recognition.continuous = false;
  APP_STATE.recognition.interimResults = false;
  APP_STATE.recognition.lang = "en-ZA";

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

  const southAfricanEnglish = voices.find(voice => voice.lang && voice.lang.toLowerCase() === "en-za");

  if (southAfricanEnglish) {
    return southAfricanEnglish;
  }

  return voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith("en")) || null;
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

function speakText(text) {
  if (!APP_STATE.voiceOutputEnabled) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-speech is not supported.");
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

  APP_STATE.lastSpokenText = text;

  const speech = new SpeechSynthesisUtterance(text);

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
