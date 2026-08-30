// App state and constants
const APP_STATE = {
  previousScreen: "home-screen",
  currentLocation: null,
  currentService: null,
  voiceOutputEnabled: true,
  readAloudEnabled: false,
  highContrastEnabled: false,
  mobilityPreferenceEnabled: false,
  appLanguage: "en",
  authUser: null,
  currentUserPosition: {
    latitude: null,
    longitude: null,
    accuracy: null
  },
  locationRequestInFlight: false,
  recognition: null,
  handsFreeRecognition: null,
  isListening: false,
  isAssistantSpeaking: false,
  handsFreeModeActive: false,
  handsFreePaused: false,
  isHandsFreeListening: false,
  handsFreeListenTimer: null,
  cameraStream: null,
  isOcrProcessing: false,
  lastSpokenText: null,
  preferredVoice: null
};
