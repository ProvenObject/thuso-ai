const { servicesData } = require("../data");
const { getAiIntent } = require("../services/aiIntentService");
const {
  detectService,
  detectAccessibilityNeed,
  detectCity,
  buildServiceLocations,
  buildResponseText,
} = require("../services/locationService");

const conversationState = {
  service: null,
  accessibilityNeed: null,
  city: null,
};

async function ask(req, res) {
  const rawMessage = req.body.message?.trim() || "";
  const message = rawMessage.toLowerCase();

  if (!message) {
    return res.status(400).json({ response: "Please enter a question." });
  }

  let service = null;
  let accessibilityNeed = null;
  let city = null;

  const aiIntent = await getAiIntent(rawMessage);
  console.log("AI Intent:", aiIntent);

  service = detectService(message, aiIntent);
  accessibilityNeed = detectAccessibilityNeed(message, aiIntent);
  city = detectCity(message, aiIntent);

  if (!service && conversationState.service) {
    service = servicesData.services.find((item) => item.name === conversationState.service) || null;
  }

  if (!accessibilityNeed && conversationState.accessibilityNeed) {
    accessibilityNeed = conversationState.accessibilityNeed;
  }

  if (!city && conversationState.city) {
    city = conversationState.city;
  }

  if (service) {
    conversationState.service = service.name;
  }

  if (accessibilityNeed) {
    conversationState.accessibilityNeed = accessibilityNeed;
  }

  if (city) {
    conversationState.city = city;
  }

  console.log("Conversation state:", conversationState);

  let locations = [];

  if (service) {
    locations = buildServiceLocations(service, city, accessibilityNeed);
  }

  const response = buildResponseText(service, locations, city, accessibilityNeed);

  return res.json({
    response,
    service: service ? { id: service.id, name: service.name } : null,
    locations,
  });
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
  conversationState,
};
