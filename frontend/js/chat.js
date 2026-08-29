// ============================================================
// THUŠO AI — CHAT
// ============================================================

const CHAT_STORAGE_KEY = "thuso-conversation-id";

// ------------------------------------------------------------
// Conversation ID
// ------------------------------------------------------------

function getConversationId() {
  let conversationId = sessionStorage.getItem(CHAT_STORAGE_KEY);

  if (!conversationId) {
    conversationId =
      "chat-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 9);

    sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      conversationId
    );
  }

  return conversationId;
}


function resetChatConversation() {
  sessionStorage.removeItem(CHAT_STORAGE_KEY);

  const chatMessages =
    document.getElementById("chat-messages");

  if (chatMessages) {
    chatMessages.innerHTML = "";
  }
}


// ------------------------------------------------------------
// Messages
// ------------------------------------------------------------

function addChatMessage(
  text,
  type = "assistant"
) {
  const chatMessages =
    document.getElementById("chat-messages");

  if (!chatMessages) return;

  const message =
    document.createElement("div");

  message.className =
    `message ${type}-message`;

  message.textContent = text;

  chatMessages.appendChild(message);

  scrollChatToBottom();

  return message;
}


// ------------------------------------------------------------
// Typing indicator
// ------------------------------------------------------------

function addTypingIndicator() {
  const chatMessages =
    document.getElementById("chat-messages");

  if (!chatMessages) return null;

  // Prevent duplicates
  removeTypingIndicator();

  const typing =
    document.createElement("div");

  typing.className =
    "message assistant-message typing-message";

  typing.id =
    "typing-indicator";

  typing.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  chatMessages.appendChild(typing);

  scrollChatToBottom();

  return typing;
}


function removeTypingIndicator() {
  const typing =
    document.getElementById(
      "typing-indicator"
    );

  if (typing) {
    typing.remove();
  }
}


// ------------------------------------------------------------
// SEND MESSAGE
// ------------------------------------------------------------

async function sendChatMessage(message) {
  const cleanMessage =
    String(message || "").trim();

  if (!cleanMessage) {
    return null;
  }


  // Prevent multiple requests at the same time
  if (APP_STATE.isWaitingForResponse) {
    console.warn(
      "Thušo is already processing a message."
    );

    return null;
  }


  APP_STATE.isWaitingForResponse = true;


  // Show user message
  addChatMessage(
    cleanMessage,
    "user"
  );


  const typing =
    addTypingIndicator();


  try {

    const API_URL =
      window.APP_CONFIG?.API_URL || "";


    const conversationId =
      getConversationId();


    updateHandsFreeStatus(
      "Thušo is thinking..."
    );


    // Standard response contract from /api/ask:
    // {
    //   response,
    //   conversationId,
    //   service,
    //   locations,
    //   conversation,
    //   action
    // }
    // The frontend keeps the existing fields working while persisting the
    // backend-returned conversationId for the next user turn.
    const data =
      await fetchJson(
        `${API_URL}/api/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message: cleanMessage,
            conversationId
          })
        }
      );


    typing?.remove();


    // --------------------------------------------------------
    // Store conversation ID returned by backend
    // --------------------------------------------------------

    const returnedConversationId = data?.conversationId || conversationId;

    if (returnedConversationId) {
      sessionStorage.setItem(
        CHAT_STORAGE_KEY,
        returnedConversationId
      );
    }


    // --------------------------------------------------------
    // Assistant response
    // --------------------------------------------------------

    const responseText =
      data.response ||
      data.message ||
      "Sorry, I could not find an answer.";


    addChatMessage(
      responseText,
      "assistant"
    );


    // --------------------------------------------------------
    // Locations
    // --------------------------------------------------------

    if (
      Array.isArray(data.locations)
    ) {

      data.locations.forEach(
        location => {
          addChatLocation(
            location
          );
        }
      );

    }


    // --------------------------------------------------------
    // Service action
    // --------------------------------------------------------

    if (
      data.service &&
      data.service.id
    ) {

      addChatServiceAction(
        data.service
      );

    }


    // --------------------------------------------------------
    // Backend-driven UI action
    // --------------------------------------------------------

    handleBackendAction(
      data.action
    );


    // --------------------------------------------------------
    // Speak response
    // --------------------------------------------------------

    speakText(
      responseText
    );


    return data;


  } catch (error) {

    console.error(
      "Chat request failed:",
      error
    );


    typing?.remove();


    const errorMessage =
      "Sorry, I'm having trouble connecting right now.";


    addChatMessage(
      errorMessage,
      "assistant"
    );


    // If hands-free is active,
    // tell the user what happened.
    updateHandsFreeStatus(
      "Connection problem"
    );


    return null;


  } finally {

    removeTypingIndicator();

    APP_STATE.isWaitingForResponse =
      false;

    scrollChatToBottom();

  }
}


// ------------------------------------------------------------
// BACKEND ACTION
// ------------------------------------------------------------

// Interprets the structured action from /api/ask using existing screens/functions only.
function handleBackendAction(action) {
  if (!action || !action.type || action.type === "none") {
    return;
  }

  switch (action.type) {
    case "show_services":
      showScreen("services-screen");
      break;

    case "show_locations":
      if (action.serviceId) {
        loadLocations({ id: action.serviceId, name: action.serviceName || "" }).then(() => {
          if (action.accessibilityNeed) {
            setLocationFilterByName(action.accessibilityNeed);
          }
        });
      }
      break;

    case "show_location_details":
      if (action.locationId) {
        loadLocationDetails(action.locationId, "ask-screen");
      }
      break;

    case "filter_locations":
      if (action.serviceId) {
        loadLocations({ id: action.serviceId, name: action.serviceName || "" }).then(() => {
          if (action.accessibilityNeed) {
            setLocationFilterByName(action.accessibilityNeed);
          }
        });
      } else if (action.accessibilityNeed) {
        setLocationFilterByName(action.accessibilityNeed);
      }
      break;

    case "show_preferences":
      showScreen("preferences-screen");
      break;

    case "show_home":
      showScreen("home-screen");
      break;

    case "open_directions":
      if (action.locationId && (!APP_STATE.currentLocation || String(APP_STATE.currentLocation.id) !== String(action.locationId))) {
        loadLocationDetails(action.locationId, "ask-screen").then(() => openDirections());
      } else {
        openDirections();
      }
      break;

    default:
      console.warn("Unknown backend action type:", action.type);
  }
}


// ------------------------------------------------------------
// LOCATION CARD
// ------------------------------------------------------------

function addChatLocation(location) {

  const chatMessages =
    document.getElementById(
      "chat-messages"
    );

  if (!chatMessages) return;


  const locationCard =
    document.createElement("button");

  locationCard.type =
    "button";

  locationCard.className =
    "chat-location-card";


  if (
    location.accessibilityMatch
  ) {

    locationCard.classList.add(
      "recommended-location"
    );

  }


  locationCard.innerHTML = `
    ${
      location.accessibilityMatch
        ? `
          <span class="recommendation-label">
            ✓ Recommended for you
          </span>
        `
        : ""
    }

    <h3>
      ${escapeHtml(location.name)}
    </h3>

    <p>
      ${escapeHtml(
        location.address ||
        "Address unavailable"
      )}
    </p>
  `;


  locationCard.addEventListener(
    "click",
    () => {

      loadLocationDetails(
        location.id,
        "ask-screen"
      );

    }
  );


  chatMessages.appendChild(
    locationCard
  );

  scrollChatToBottom();
}


// ------------------------------------------------------------
// SERVICE ACTION
// ------------------------------------------------------------

function addChatServiceAction(service) {

  const chatMessages =
    document.getElementById(
      "chat-messages"
    );

  if (!chatMessages) return;


  const button =
    document.createElement("button");

  button.type =
    "button";

  button.className =
    "chat-service-btn";

  button.textContent =
    `View ${service.name} locations →`;


  button.addEventListener(
    "click",
    () => {

      loadLocations(
        service
      );

    }
  );


  chatMessages.appendChild(
    button
  );

  scrollChatToBottom();
}


// ------------------------------------------------------------
// SUGGESTIONS
// ------------------------------------------------------------

function initialiseChatSuggestions() {

  document
    .querySelectorAll(
      ".suggestion-chip"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const message =
            button.textContent.trim();

          if (!message) return;

          const chatInput =
            document.getElementById(
              "chat-input"
            );

          if (chatInput) {
            chatInput.value = "";
          }

          sendChatMessage(
            message
          );

        }
      );

    });

}


// ------------------------------------------------------------
// CHAT FORM
// ------------------------------------------------------------

function initialiseChat() {

  const chatForm =
    document.getElementById(
      "chat-form"
    );

  const chatInput =
    document.getElementById(
      "chat-input"
    );


  if (
    !chatForm ||
    !chatInput
  ) {
    return;
  }


  chatForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();


      const message =
        chatInput.value.trim();


      if (!message) {
        return;
      }


      chatInput.value = "";


      sendChatMessage(
        message
      );

    }
  );

}