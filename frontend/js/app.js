// Thušo AI - Modular Frontend Initializer
// All feature logic is organized in separate modules for better scalability
//
// Module files:
// - state.js: App state management
// - navigation.js: Screen navigation
// - accessibility.js: Accessibility settings and preferences
// - services.js: Service loading and filtering
// - locations.js: Location management and details
// - chat.js: Chat messaging system
// - voiceInput.js: Speech recognition for chat
// - camera.js: Camera and OCR functionality
// - voiceCommands.js: Hands-free voice command processing
// - preferences.js: Preferences UI and initialization
// - utils.js: Shared utility functions (already loaded)

document.addEventListener("DOMContentLoaded", () => {
  // Initialize all UI components and event listeners
  initialiseChat();
  initialiseSpeechRecognition();
  initialiseHandsFreeControls();
  initialiseSearch();
  initialiseFilterChips();
  initialisePreferences();
  initialiseAuth();
  initialiseChatSuggestions();
  initialiseLocationBackButton();
  initialiseEmergencyHelp();
  initialiseCameraControls();

  // Add button label readout when clicked (read-aloud mode)
  document.addEventListener("click", event => {
    speakButtonLabel(event.target.closest("button"));
  }, true);

  // Render Lucide icons
  refreshIcons();
});
