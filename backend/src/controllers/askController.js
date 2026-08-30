const { servicesData } = require("../data");
const { getAiIntent } = require("../services/aiIntentService");
const {
  detectService,
  detectAccessibilityNeed,
  detectCity,
  detectUserGoal,
  isDocumentRequirementQuestion,
  detectLocationReference,
  detectIntent,
  detectClarification,
  buildServiceLocations,
  buildResponseText,
  buildDocumentRequirementsResponse,
  buildNearbyFacilitiesResponse,
  serviceByName,
} = require("../services/locationService");

const conversationStateById = new Map();

// In-memory only: no database, no auth, no sensitive personal data.
// Tracks just enough about the current task to make follow-up messages coherent.
function createConversationState() {
  return {
    service: null,
    city: null,
    accessibilityNeed: null,
    selectedLocation: null,
    userGoal: null,
    lastIntent: null,
    lastResponse: null,
    pendingQuestion: null,
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
//   conversation: { conversationId, service, city, accessibilityNeed, selectedLocation, userGoal, lastIntent, lastResponse, pendingQuestion },
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
      city: state?.city || null,
      accessibilityNeed: state?.accessibilityNeed || null,
      selectedLocation: state?.selectedLocation || null,
      userGoal: state?.userGoal || null,
      lastIntent: state?.lastIntent || null,
      lastResponse: state?.lastResponse || null,
      pendingQuestion: state?.pendingQuestion || null,
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

  const aiIntent = await getAiIntent(rawMessage, {
    service: state.service,
    city: state.city,
    accessibilityNeed: state.accessibilityNeed,
    userGoal: state.userGoal,
    selectedLocation: state.selectedLocation,
    pendingQuestion: state.pendingQuestion,
  });
  console.log("AI Intent:", aiIntent);

  const detectedService = detectService(message, aiIntent);
  const serviceChanged = Boolean(detectedService) && state.service !== detectedService.name;

  const service = detectedService || (state.service ? serviceByName(state.service) : null);
  const accessibilityNeed = detectAccessibilityNeed(message, aiIntent) || state.accessibilityNeed || null;
  const city = detectCity(message, aiIntent) || state.city || null;

  if (service) {
    state.service = service.name;
  }

  if (accessibilityNeed) {
    state.accessibilityNeed = accessibilityNeed;
  }

  if (city) {
    state.city = city;
  }

  // A new service means the previous selection/goal no longer applies.
  if (serviceChanged) {
    state.selectedLocation = null;
    state.userGoal = null;
  }

  const detectedUserGoal = detectUserGoal(message, service);

  if (detectedUserGoal) {
    state.userGoal = detectedUserGoal;
  }

  const isFollowUpDocumentQuestion = isDocumentRequirementQuestion(message);
  const locationReference = aiIntent?.locationReference || detectLocationReference(message);

  let locations = [];

  if (service) {
    locations = buildServiceLocations(service, state.city, state.accessibilityNeed);
  }

  // A single location for the stated city (or the only location overall) is confident
  // enough to treat as "the" facility the user is now asking about.
  const cityMatches = city
    ? locations.filter((location) => location.city && location.city.toLowerCase() === city.toLowerCase())
    : [];
  const confidentLocation = cityMatches.length === 1
    ? cityMatches[0]
    : (locations.length === 1 ? locations[0] : state.selectedLocation);
  const hasConfidentLocationMatch = Boolean(confidentLocation);

  if (cityMatches.length === 1 || locations.length === 1) {
    const onlyMatch = cityMatches.length === 1 ? cityMatches[0] : locations[0];
    state.selectedLocation = { id: onlyMatch.id, name: onlyMatch.name, city: onlyMatch.city || null };
  }

  const hasContext = Boolean(state.service || state.city || state.accessibilityNeed);
  const intent = aiIntent?.intent || detectIntent(message, {
    hasService: Boolean(service),
    isNewService: serviceChanged,
    accessibilityNeed,
    locationReference,
    isDocumentQuestion: isFollowUpDocumentQuestion,
    hasContext,
    hasConfidentLocationMatch,
  });

  const hasLocations = locations.length > 0 || Boolean(state.selectedLocation);
  const clarification = aiIntent && typeof aiIntent.needsClarification === "boolean"
    ? { needsClarification: aiIntent.needsClarification, clarificationQuestion: aiIntent.clarificationQuestion || null }
    : detectClarification({ intent, service, locationReference, hasLocations });

  let response;

  if (clarification.needsClarification && clarification.clarificationQuestion) {
    response = clarification.clarificationQuestion;
  } else if (intent === "nearby_facilities" && locationReference) {
    response = buildNearbyFacilitiesResponse(locations.length > 0 ? locations : (state.selectedLocation ? [state.selectedLocation] : []), state.city);
  } else if (isFollowUpDocumentQuestion || intent === "service_information") {
    response = buildDocumentRequirementsResponse(service, state.userGoal);
  } else {
    response = buildResponseText({
      service,
      locations,
      city: state.city,
      accessibilityNeed: state.accessibilityNeed,
      userGoal: state.userGoal,
      focusLocation: confidentLocation,
    });
  }

  state.pendingQuestion = clarification.needsClarification
    ? clarification.clarificationQuestion
    : (/\?\s*$/.test(response) ? response : null);

  state.lastIntent = {
    service: service ? service.name : null,
    userGoal: state.userGoal,
    accessibilityNeed,
    city,
    locationReference: locationReference || null,
    intent,
    needsClarification: clarification.needsClarification,
    clarificationQuestion: clarification.clarificationQuestion,
  };
  state.lastResponse = response;

  const action = determineUiAction({
    intent,
    message,
    service,
    city,
    accessibilityNeed,
    locations,
    cityMatches,
    state,
    locationReference,
    needsClarification: clarification.needsClarification,
  });

  console.log("Conversation state:", { conversationId, state });

  return res.json(
    buildAskResponse({
      response,
      conversationId,
      state,
      service,
      locations,
      action,
    })
  );
}

// Maps the resolved intent onto the limited set of actions the current frontend can
// actually perform (see navigation.js/locations.js/preferences.js). Never guesses a
// target the data can't confidently support.
function determineUiAction({ intent, message, service, city, accessibilityNeed, locations, cityMatches, state, locationReference, needsClarification }) {
  if (needsClarification) {
    return { type: "none" };
  }

  if (intent === "directions") {
    if (state.selectedLocation) {
      return {
        type: "open_directions",
        locationId: state.selectedLocation.id,
        locationName: state.selectedLocation.name,
      };
    }

    return { type: "none" };
  }

  if (intent === "facility_details") {
    const confidentMatch = cityMatches.length === 1
      ? cityMatches[0]
      : (locations.length === 1 ? locations[0] : null);

    if (confidentMatch) {
      return {
        type: "show_location_details",
        locationId: confidentMatch.id,
        locationName: confidentMatch.name,
      };
    }

    return { type: "none" };
  }

  if (intent === "nearby_facilities" && locationReference === "selection" && state.selectedLocation) {
    return {
      type: "show_location_details",
      locationId: state.selectedLocation.id,
      locationName: state.selectedLocation.name,
    };
  }

  if (intent === "accessibility_question" && service) {
    return {
      type: "filter_locations",
      serviceId: service.id,
      accessibilityNeed: accessibilityNeed || null,
    };
  }

  if (intent === "ui_command") {
    if (/preference|accessibility setting/.test(message)) {
      return { type: "show_preferences" };
    }

    if (/home screen|go home|start over|main menu/.test(message)) {
      return { type: "show_home" };
    }

    if (/service/.test(message)) {
      return { type: "show_services" };
    }

    return { type: "none" };
  }

  if (service && locations.length > 0 && ["find_service", "find_facility", "follow_up_question", "service_information"].includes(intent)) {
    return {
      type: "show_locations",
      serviceId: service.id,
      serviceName: service.name,
      city: city || null,
      accessibilityNeed: accessibilityNeed || null,
    };
  }

  if (intent === "general_help" && !service) {
    return { type: "show_services" };
  }

  return { type: "none" };
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
