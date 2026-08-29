const { servicesData } = require("../data");
const { getAiIntent } = require("../services/aiIntentService");
const {
  detectService,
  detectAccessibilityNeed,
  detectCity,
  buildServiceLocations,
  buildResponseText,
  serviceByName,
} = require("../services/locationService");

const conversationStateById = new Map();

function createConversationState() {
  return {
    service: null,
    accessibilityNeed: null,
    city: null,
  };
}

function getConversationState(conversationId) {
  const id = conversationId && String(conversationId).trim();

  if (!id) {
    const generatedId = `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const state = createConversationState();
    conversationStateById.set(generatedId, state);
    return { conversationId: generatedId, state };
  }

  if (!conversationStateById.has(id)) {
    conversationStateById.set(id, createConversationState());
  }

  return { conversationId: id, state: conversationStateById.get(id) };
}

// Standard ask response contract used by the frontend and future conversational flows.
// Always returned shape:
// {
//   response: "...",
//   conversationId: "...",
//   service: null | { id, name },
//   locations: [],
//   conversation: { conversationId, service, accessibilityNeed, city },
//   action: null
// }
function buildAskResponse({ response, conversationId, state, service, locations, action = null }) {
  const normalizedService = service && service.id && service.name
    ? { id: service.id, name: service.name }
    : null;

  return {
    response: response || "",
    conversationId,
    service: normalizedService,
    locations: Array.isArray(locations) ? locations : [],
    conversation: {
      conversationId,
      service: state?.service || null,
      accessibilityNeed: state?.accessibilityNeed || null,
      city: state?.city || null,
    },
    action: action || null,
  };
}

async function ask(req, res) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const rawMessage = (body.message || "").trim();
  const message = rawMessage.toLowerCase();
  const { conversationId, state } = getConversationState(body.conversationId);

  if (!message) {
    return res.status(400).json(
      buildAskResponse({
        response: "Please enter a question.",
        conversationId,
        state,
        service: null,
        locations: [],
      })
    );
  }

  let service = null;
  let accessibilityNeed = null;
  let city = null;

  const aiIntent = await getAiIntent(rawMessage);
  console.log("AI Intent:", aiIntent);

  service = detectService(message, aiIntent) || (state.service ? serviceByName(state.service) : null);
  accessibilityNeed = detectAccessibilityNeed(message, aiIntent) || state.accessibilityNeed || null;
  city = detectCity(message, aiIntent) || state.city || null;

  if (service) {
    state.service = service.name;
  }

  if (accessibilityNeed) {
    state.accessibilityNeed = accessibilityNeed;
  }

  if (city) {
    state.city = city;
  }

  console.log("Conversation state:", { conversationId, state });

  let locations = [];

  if (service) {
    locations = buildServiceLocations(service, state.city, state.accessibilityNeed);
  }

  const response = buildResponseText(service, locations, state.city, state.accessibilityNeed);

  return res.json(
    buildAskResponse({
      response,
      conversationId,
      state,
      service,
      locations,
    })
  );
}

async function testGemini(req, res) {
  const { ai } = require("../services/aiIntentService");

  if (!ai) {
    return res.status(503).json({ error: "Gemini API is not configured." });
  }

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Say hello and briefly explain that you are Thušo AI, an assistant helping people access government services.",
    });

    return res.json({ response: result.text });
  } catch (error) {
    console.error("Gemini error:", error);
    return res.status(500).json({ error: "Failed to communicate with Gemini" });
  }
}

module.exports = {
  ask,
  testGemini,
  conversationStateById,
};
