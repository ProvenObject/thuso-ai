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

    try {
      APP_STATE.recognition.start();
    } catch (error) {
      console.warn("Unable to start recognition:", error);
    }
  });
}

function speakText(text) {
  if (!APP_STATE.voiceOutputEnabled) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-speech is not supported.");
    return;
  }

  if (APP_STATE.handsFreeModeActive && APP_STATE.handsFreeRecognition) {
    try {
      APP_STATE.handsFreeRecognition.stop();
    } catch (error) {
      console.warn("Unable to pause hands free recognition:", error);
    }
  }

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "en-ZA";
  speech.rate = 1;
  speech.pitch = 1;

  speech.addEventListener("start", () => {
    APP_STATE.isAssistantSpeaking = true;
    updateHandsFreeStatus("Assistant speaking...");
  });

  speech.addEventListener("end", () => {
    APP_STATE.isAssistantSpeaking = false;

    if (APP_STATE.handsFreeModeActive && !APP_STATE.voiceOutputEnabled) {
      return;
    }

    if (APP_STATE.handsFreeModeActive) {
      setTimeout(() => {
        resumeHandsFreeListening();
      }, 300);
    }
  });

  speech.addEventListener("error", () => {
    APP_STATE.isAssistantSpeaking = false;

    if (APP_STATE.handsFreeModeActive) {
      setTimeout(() => {
        resumeHandsFreeListening();
      }, 300);
    }
  });

  window.speechSynthesis.speak(speech);
}

function updateHandsFreeStatus(message) {
  const status = document.getElementById("hands-free-status");

  if (!status) return;

  status.textContent = message;
}
