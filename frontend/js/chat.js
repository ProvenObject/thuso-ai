// Chat messaging and suggestion handling
function addChatMessage(text, type = "assistant") {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const message = document.createElement("div");
  message.className = `message ${type}-message`;
  message.textContent = text;

  chatMessages.appendChild(message);
  scrollChatToBottom();

  return message;
}

function addTypingIndicator() {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return null;

  const typing = document.createElement("div");
  typing.className = "message assistant-message typing-message";
  typing.id = "typing-indicator";
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
  const typing = document.getElementById("typing-indicator");
  if (typing) {
    typing.remove();
  }
}

async function sendChatMessage(message) {
  if (!message) return;

  addChatMessage(message, "user");

  const typing = addTypingIndicator();

  try {
    const API_URL = window.APP_CONFIG?.API_URL || "";
    const data = await fetchJson(`${API_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    typing?.remove();

    const responseText = data.response || data.message || "Sorry, I could not find an answer.";
    addChatMessage(responseText, "assistant");

    if (data.locations && Array.isArray(data.locations)) {
      data.locations.forEach(location => addChatLocation(location));
    }

    if (data.service && data.service.id) {
      addChatServiceAction(data.service);
    }

    speakText(responseText);
  } catch (error) {
    console.error("Chat request failed:", error);
    typing?.remove();
    addChatMessage("Sorry, I'm having trouble connecting right now.", "assistant");
  } finally {
    removeTypingIndicator();
    scrollChatToBottom();
  }
}

function addChatLocation(location) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const locationCard = document.createElement("button");
  locationCard.type = "button";
  locationCard.className = "chat-location-card";

  if (location.accessibilityMatch) {
    locationCard.classList.add("recommended-location");
  }

  locationCard.innerHTML = `
    ${location.accessibilityMatch ? `<span class="recommendation-label">✓ Recommended for you</span>` : ""}
    <h3>${escapeHtml(location.name)}</h3>
    <p>${escapeHtml(location.address || "Address unavailable")}</p>
  `;

  locationCard.addEventListener("click", () => {
    loadLocationDetails(location.id, "ask-screen");
  });

  chatMessages.appendChild(locationCard);
  scrollChatToBottom();
}

function addChatServiceAction(service) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "chat-service-btn";
  button.textContent = `View ${service.name} locations →`;

  button.addEventListener("click", () => {
    loadLocations(service);
  });

  chatMessages.appendChild(button);
  scrollChatToBottom();
}

function initialiseChatSuggestions() {
  document.querySelectorAll(".suggestion-chip").forEach(button => {
    button.addEventListener("click", () => {
      const chatInput = document.getElementById("chat-input");
      if (!chatInput) return;

      chatInput.value = button.textContent.trim();
      document.getElementById("chat-form")?.requestSubmit();
    });
  });
}

function initialiseChat() {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");

  if (!chatForm || !chatInput) {
    return;
  }

  chatForm.addEventListener("submit", event => {
    event.preventDefault();

    const message = chatInput.value.trim();
    if (!message) {
      return;
    }

    chatInput.value = "";
    sendChatMessage(message);
  });
}
