const { servicesData, locationsData, accessibilityData } = require("../data");

const serviceByName = (name) => servicesData.services.find((service) => service.name === name) || null;

const detectService = (message, aiIntent) => {
  if (aiIntent?.service) {
    return serviceByName(aiIntent.service);
  }

  if (
    message.includes("id") ||
    message.includes("identity") ||
    message.includes("passport") ||
    message.includes("birth certificate") ||
    message.includes("marriage certificate")
  ) {
    return serviceByName("Home Affairs");
  }

  if (
    message.includes("grant") ||
    message.includes("sassa") ||
    message.includes("social grant")
  ) {
    return serviceByName("SASSA");
  }

  if (
    message.includes("clinic") ||
    message.includes("hospital") ||
    message.includes("health") ||
    message.includes("doctor") ||
    message.includes("medicine") ||
    message.includes("sick") ||
    message.includes("ill") ||
    message.includes("medical")
  ) {
    return serviceByName("Department of Health");
  }

  if (
    message.includes("municipality") ||
    message.includes("municipal") ||
    message.includes("rates") ||
    message.includes("water") ||
    message.includes("electricity") ||
    message.includes("refuse")
  ) {
    return serviceByName("Municipal Services");
  }

  if (
    message.includes("education") ||
    message.includes("school") ||
    message.includes("bursary") ||
    message.includes("university") ||
    message.includes("college")
  ) {
    return serviceByName("Education");
  }

  return null;
};

const detectAccessibilityNeed = (message, aiIntent) => {
  if (aiIntent?.accessibilityNeed) {
    return aiIntent.accessibilityNeed;
  }

  if (
    message.includes("blind") ||
    message.includes("visual impairment") ||
    message.includes("visually impaired")
  ) {
    return "audioGuidance";
  }

  if (
    message.includes("deaf") ||
    message.includes("hearing impaired") ||
    message.includes("sign language") ||
    message.includes("cannot hear") ||
    message.includes("can't hear")
  ) {
    return "signLanguageSupport";
  }

  if (
    message.includes("wheelchair") ||
    message.includes("wheel chair") ||
    message.includes("mobility impairment") ||
    message.includes("cannot walk")
  ) {
    return "wheelchairAccessible";
  }

  if (
    message.includes("accessible entrance") ||
    message.includes("step-free") ||
    message.includes("no stairs")
  ) {
    return "accessibleEntrance";
  }

  return null;
};

const detectCity = (message, aiIntent) => {
  if (aiIntent?.city) {
    return aiIntent.city;
  }

  const cityAliases = {
    lebowakgmo: "Lebowakgomo",
    lebowakgomo: "Lebowakgomo",
    polokwane: "Polokwane",
    seshego: "Seshego",
    mokopane: "Mokopane",
    tzaneen: "Tzaneen",
    giyani: "Giyani",
    thohoyandou: "Thohoyandou",
    "louis trichardt": "Louis Trichardt",
    musina: "Musina",
    burgersfort: "Burgersfort",
    "jane furse": "Jane Furse",
  };

  for (const [alias, cityName] of Object.entries(cityAliases)) {
    if (message.includes(alias)) {
      return cityName;
    }
  }

  return null;
};

const mapAccessibilityMatch = (location, accessibilityNeed) => {
  const accessibility = accessibilityData.locations.find((item) => item.id === location.id);

  if (!accessibilityNeed || !accessibility) {
    return false;
  }

  return Boolean(accessibility[accessibilityNeed] === true);
};

const buildServiceLocations = (service, city, accessibilityNeed) => {
  if (!service) {
    return [];
  }

  const serviceLocations = locationsData.locations
    .filter((location) => location.serviceId === service.id)
    .map((location) => ({
      ...location,
      accessibilityMatch: mapAccessibilityMatch(location, accessibilityNeed),
    }));

  serviceLocations.forEach((location) => {
    let score = 0;

    if (city && location.city && location.city.toLowerCase() === city.toLowerCase()) {
      score += 10;
    }

    if (accessibilityNeed && location.accessibilityMatch) {
      score += 5;
    }

    location.relevanceScore = score;
  });

  return serviceLocations.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

const buildResponseText = (service, locations, city, accessibilityNeed) => {
  if (!service) {
    return "I'm not sure which government service can help with that. Try telling me what you need help with, for example an ID, grant, doctor, municipality, school or bursary.";
  }

  const accessibilityLabels = {
    wheelchairAccessible: "wheelchair access",
    audioGuidance: "audio guidance",
    signLanguageSupport: "sign language support",
    accessibleEntrance: "an accessible entrance",
  };

  const matchingLocations = locations.filter((location) => location.accessibilityMatch);

  if (city && !accessibilityNeed) {
    const cityLocationCount = locations.filter((location) => location.city && location.city.toLowerCase() === city.toLowerCase()).length;

    if (cityLocationCount > 0) {
      return `I found ${service.name} options in ${city}. ${matchingLocations.length > 0 ? `I’ve highlighted ${matchingLocations.length} accessible option${matchingLocations.length === 1 ? "" : "s"}.` : "Are you looking for wheelchair accessibility?"}`;
    }

    return `I found ${service.name} options nearby, but not specifically in ${city}. I can narrow the search by accessibility or look for the nearest matching office.`;
  }

  if (accessibilityNeed) {
    if (matchingLocations.length > 0) {
      const targetText = accessibilityLabels[accessibilityNeed] || "accessibility support";
      return `I found ${matchingLocations.length} ${service.name} location${matchingLocations.length === 1 ? "" : "s"}${city ? ` in ${city}` : ""} with ${targetText}.`;
    }

    return `I found ${service.name} options${city ? ` in ${city}` : ""}, but I couldn’t confirm ${accessibilityLabels[accessibilityNeed] || "that accessibility need"} in the current list.`;
  }

  if (city) {
    return `I found ${service.name} options in ${city}. Are you looking for wheelchair accessibility?`;
  }

  return `I can help with ${service.name}. Which town are you in?`;
};

const goalsByService = {
  "Home Affairs": [
    { keywords: ["passport"], goal: "applying for or renewing a passport" },
    { keywords: ["birth certificate"], goal: "obtaining a birth certificate" },
    { keywords: ["marriage certificate"], goal: "obtaining a marriage certificate" },
    { keywords: ["id", "identity"], goal: "obtaining or replacing an identity document" },
  ],
  SASSA: [
    { keywords: ["grant", "sassa", "social grant"], goal: "applying for or managing a social grant" },
  ],
  "Department of Health": [
    { keywords: ["clinic", "hospital", "doctor", "medicine", "sick", "ill", "medical"], goal: "accessing healthcare services" },
  ],
  "Municipal Services": [
    { keywords: ["rates", "water", "electricity", "refuse", "municipal", "municipality"], goal: "resolving a municipal services matter" },
  ],
  Education: [
    { keywords: ["bursary", "school", "university", "college", "education"], goal: "accessing education or bursary support" },
  ],
};

// Infers a plain-language goal only from keywords already present in the current message.
const detectUserGoal = (message, service) => {
  if (!service) {
    return null;
  }

  const candidates = goalsByService[service.name];

  if (!candidates) {
    return null;
  }

  for (const candidate of candidates) {
    if (candidate.keywords.some((keyword) => message.includes(keyword))) {
      return candidate.goal;
    }
  }

  return null;
};

const isDocumentRequirementQuestion = (message) =>
  /document|paperwork|requirement|what.*(do i|does it|would i).*need|need to bring/i.test(message);

// We only have location data, not document checklists, so we say so honestly instead of guessing.
const buildDocumentRequirementsResponse = (service, userGoal) => {
  if (!service) {
    return "I'm not sure which service you mean, so I can't say what documents are needed. Could you tell me which service this is for?";
  }

  const goalText = userGoal ? ` for ${userGoal}` : "";

  return `I don't have detailed document requirement information for ${service.name}${goalText} in my current data. I'd recommend confirming the exact requirements with your nearest ${service.name} office.`;
};

const LOCATION_REFERENCE_PATTERNS = [
  { pattern: /\b(closest|nearest|nearby)\b/i, reference: "closest" },
  { pattern: /\b(this one|that one|the first one|the second one|the last one)\b/i, reference: "selection" },
];

// Deterministic fallback: picks up references to a facility mentioned earlier in the chat.
const detectLocationReference = (message) => {
  for (const { pattern, reference } of LOCATION_REFERENCE_PATTERNS) {
    if (pattern.test(message)) {
      return reference;
    }
  }

  return null;
};

const UI_COMMAND_PATTERN = /\b(open|enable|turn on|turn off|zoom in|zoom out|show me the map|start voice|open camera)\b/i;
const DIRECTIONS_PATTERN = /\b(directions|how do i get there|route|way to get)\b/i;
const FACILITY_DETAILS_PATTERN = /\b(opening hours|open until|contact number|phone number|address of|what time)\b/i;

// Deterministic fallback used when Gemini is unavailable or doesn't return an intent.
const detectIntent = (message, { hasService, isNewService, accessibilityNeed, locationReference, isDocumentQuestion, hasContext }) => {
  if (isDocumentQuestion) {
    return "service_information";
  }

  if (UI_COMMAND_PATTERN.test(message)) {
    return "ui_command";
  }

  if (DIRECTIONS_PATTERN.test(message)) {
    return "directions";
  }

  if (FACILITY_DETAILS_PATTERN.test(message)) {
    return "facility_details";
  }

  if (locationReference) {
    return "nearby_facilities";
  }

  if (accessibilityNeed && !isNewService) {
    return "accessibility_question";
  }

  if (isNewService) {
    return "find_service";
  }

  if (hasService) {
    return "find_facility";
  }

  if (hasContext) {
    return "follow_up_question";
  }

  return "general_help";
};

// Deterministic fallback: only ask for clarification when we genuinely can't proceed.
const detectClarification = ({ intent, service, locationReference, hasLocations }) => {
  if (!service && (intent === "service_information" || intent === "accessibility_question")) {
    return {
      needsClarification: true,
      clarificationQuestion: "Which service is this about, for example Home Affairs, SASSA, Department of Health, Municipal Services or Education?",
    };
  }

  if (locationReference && !hasLocations) {
    return {
      needsClarification: true,
      clarificationQuestion: "I don't have any facilities to compare yet - which service or area are you asking about?",
    };
  }

  return { needsClarification: false, clarificationQuestion: null };
};

// Honest about the lack of real distance data - we don't have the user's location.
const buildNearbyFacilitiesResponse = (locations, city) => {
  if (!locations || locations.length === 0) {
    return "I don't have any matching facilities to compare yet. Could you tell me which service and area you need?";
  }

  const topMatch = locations[0];

  return `I can't calculate exact travel distance without your location, but based on what I have, ${topMatch.name}${topMatch.city ? ` in ${topMatch.city}` : ""} looks like the closest match${city ? ` to ${city}` : ""}.`;
};

module.exports = {
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
};
