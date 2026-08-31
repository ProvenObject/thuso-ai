const { servicesData, locationsData, accessibilityData } = require("../data");

const serviceByName = (name) => servicesData.services.find((service) => service.name === name) || null;

const SERVICE_ALIASES = {
  "Home Affairs": ["home affairs", "id", "identity", "identity document", "identification", "id card", "passport", "birth certificate", "marriage certificate"],
  SASSA: ["sassa", "grant", "social grant", "sassa grant"],
  "Department of Health": ["health", "healthcare", "clinic", "hospital", "doctor", "medical", "medicine", "sick", "ill"],
  "Municipal Services": ["municipality", "municipal", "rates", "water", "electricity", "refuse"],
  Education: ["education", "school", "bursary", "university", "college"],
};

const CITY_ALIASES = {
  Polokwane: ["polokwane", "polokwane"],
  Seshego: ["seshego", "sesego"],
  Lebowakgomo: ["lebowakgomo", "lebowakgmo", "lebowakomo", "leboakgomo", "lebowa kgomo"],
  Mokopane: ["mokopane", "mokopani"],
  Tzaneen: ["tzaneen", "tsaneen"],
  Giyani: ["giyani", "gianyi"],
  Thohoyandou: ["thohoyandou", "thoyandou", "thohoyando", "tohoyandou"],
  "Louis Trichardt": ["louis trichardt", "louis trichard", "louis richardt", "makhado"],
  Musina: ["musina", "messina"],
  Burgersfort: ["burgersfort", "burgers fort"],
  "Jane Furse": ["jane furse", "janefurse", "jane first"],
};

const includesAlias = (message, aliases) => aliases.some((alias) =>
  new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(message)
);

const detectService = (message, aiIntent) => {
  if (aiIntent?.service) {
    return serviceByName(aiIntent.service);
  }

  const namedService = servicesData.services.find((service) =>
    includesAlias(message, SERVICE_ALIASES[service.name] || [service.name.toLowerCase()])
  );

  if (namedService) {
    return namedService;
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

  for (const [cityName, aliases] of Object.entries(CITY_ALIASES)) {
    if (includesAlias(message, aliases)) {
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

const ACCESSIBILITY_LABELS = {
  wheelchairAccessible: "wheelchair access",
  audioGuidance: "audio guidance",
  signLanguageSupport: "sign language support",
  accessibleEntrance: "an accessible entrance",
};

// Used for the very first mention of a service, so the intro names the actual topic
// instead of a generic "I can help with X" repeated on every turn.
const SERVICE_DEFAULT_TOPICS = {
  "Home Affairs": "identity documents and civil registration",
  SASSA: "social grants",
  "Department of Health": "healthcare services",
  "Municipal Services": "municipal services",
  Education: "education and bursary support",
};

const GOAL_TOPICS = {
  "applying for or renewing a passport": "passport applications",
  "obtaining a birth certificate": "birth certificates",
  "obtaining a marriage certificate": "marriage certificates",
  "obtaining or replacing an identity document": "identity documents",
  "applying for or managing a social grant": "social grants",
  "accessing healthcare services": "healthcare services",
  "resolving a municipal services matter": "municipal services",
  "accessing education or bursary support": "education and bursary support",
};

const describeServiceTopic = (service, userGoal) => {
  if (!service) {
    return "";
  }

  return GOAL_TOPICS[userGoal] || SERVICE_DEFAULT_TOPICS[service.name] || service.name;
};

// Raw accessibility value for one specific location - null means "not on record", not "no".
const getAccessibilityValue = (locationId, accessibilityNeed) => {
  if (!locationId || !accessibilityNeed) {
    return null;
  }

  const record = accessibilityData.locations.find((item) => item.id === locationId);
  const value = record ? record[accessibilityNeed] : undefined;

  return typeof value === "boolean" ? value : null;
};

// Answers the LATEST turn directly (a specific facility, a city match, an accessibility
// question) instead of repeating the same generic service introduction every time.
const buildResponseText = ({ service, locations, city, accessibilityNeed, userGoal, focusLocation }) => {
  if (!service) {
    return "I'm not sure which government service can help with that. Try telling me what you need help with, for example an ID, grant, doctor, municipality, school or bursary.";
  }

  const accessibilityLabel = accessibilityNeed ? (ACCESSIBILITY_LABELS[accessibilityNeed] || "that accessibility need") : null;

  // A direct accessibility question about one already-identified facility gets a direct answer.
  if (accessibilityNeed && focusLocation) {
    const value = getAccessibilityValue(focusLocation.id, accessibilityNeed);
    const placeText = `the ${service.name} office${focusLocation.city ? ` in ${focusLocation.city}` : ""}`;

    if (value === true) {
      return `Yes, ${placeText} has ${accessibilityLabel}.`;
    }

    if (value === false) {
      return `No, ${placeText} does not have ${accessibilityLabel} on record.`;
    }

    return `I don't have confirmed information about ${accessibilityLabel} for ${placeText}. I'd suggest contacting them directly to confirm.`;
  }

  const matchingLocations = locations.filter((location) => location.accessibilityMatch);

  if (accessibilityNeed) {
    if (matchingLocations.length > 0) {
      return `I found ${matchingLocations.length} ${service.name} location${matchingLocations.length === 1 ? "" : "s"}${city ? ` in ${city}` : ""} with ${accessibilityLabel}.`;
    }

    return `I found ${service.name} options${city ? ` in ${city}` : ""}, but none are confirmed to have ${accessibilityLabel}.`;
  }

  if (city) {
    const cityMatches = locations.filter((location) => location.city && location.city.toLowerCase() === city.toLowerCase());

    if (cityMatches.length === 1) {
      return `I found the ${service.name} office in ${city}. Would you like its details or directions?`;
    }

    if (cityMatches.length > 1) {
      return `I found ${cityMatches.length} ${service.name} options in ${city}. Would you like directions to one, or details on accessibility?`;
    }

    if (locations.length > 0) {
      return `I found ${service.name} options nearby, but not specifically in ${city}. I can look for the nearest matching office instead.`;
    }

    return `I couldn't find a ${service.name} office in ${city} in my current data.`;
  }

  return `${service.name} can help with ${describeServiceTopic(service, userGoal)}. Which town are you in?`;
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

  return `I don't have official document requirements for ${service.name}${goalText} in my data. Please confirm the exact list with your nearest ${service.name} office.`;
};

const LOCATION_REFERENCE_PATTERNS = [
  { pattern: /\b(closest|nearest|nearby)\b/i, reference: "closest" },
  {
    pattern: /\b(this one|that one|the first one|the second one|the last one|that facility|this facility|that place|this place|that location|this location|the one(?!\s+(thing|reason|way|issue|problem)))\b/i,
    reference: "selection",
  },
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

// Resolves "the" facility being discussed from service + city + any explicit reference,
// without ever guessing across multiple possible matches.
// - exactly one match for the stated city (or exactly one location overall) -> confident.
// - an explicit "that one"/"the one" style reference can point back at the facility
//   already selected, but only if one is actually selected.
// - anything else that resolves to more than one candidate is reported as ambiguous so
//   the caller can ask for clarification instead of picking one.
const resolveFacilitySelection = ({ service, city, locations, locationReference, selectedLocation }) => {
  if (!service) {
    return { location: null, isAmbiguous: false, candidates: [] };
  }

  const cityMatches = city
    ? locations.filter((location) => location.city && location.city.toLowerCase() === city.toLowerCase())
    : [];

  if (cityMatches.length === 1) {
    return { location: cityMatches[0], isAmbiguous: false, candidates: cityMatches };
  }

  if (cityMatches.length > 1) {
    return { location: null, isAmbiguous: true, candidates: cityMatches };
  }

  if (locations.length === 1) {
    return { location: locations[0], isAmbiguous: false, candidates: locations };
  }

  if (locationReference === "selection" && selectedLocation) {
    return { location: selectedLocation, isAmbiguous: false, candidates: [selectedLocation] };
  }

  if (locations.length > 1) {
    return { location: null, isAmbiguous: true, candidates: locations };
  }

  return { location: null, isAmbiguous: false, candidates: [] };
};

// Lists the towns involved so the clarification question is actually answerable.
const buildFacilitySelectionClarification = (service, city, candidates) => {
  const cityNames = [...new Set(candidates.map((candidate) => candidate.city).filter(Boolean))];
  const placeText = cityNames.length > 1
    ? ` in places like ${cityNames.slice(0, 3).join(", ")}`
    : (city ? ` in ${city}` : "");

  return `There are ${candidates.length} ${service.name} offices${placeText}. Which one do you mean, for example by town?`;
};

const UI_COMMAND_PATTERN = /\b(open|enable|turn on|turn off|zoom in|zoom out|start voice|open camera)\b/i;
const DIRECTIONS_PATTERN = /\b(directions|how do i get there|route|way to get|take me there|take me to|show me on the map|show on the map|open the map|view on the map|show me the map)\b/i;
const FACILITY_DETAILS_PATTERN = /\b(opening hours|open until|contact number|phone number|address of|what time|show me the details|show the details|show details|more details|facility details)\b/i;

// Deterministic fallback used when Gemini is unavailable or doesn't return an intent.
const detectIntent = (message, { hasService, isNewService, accessibilityNeed, locationReference, isDocumentQuestion, hasContext, hasConfidentLocationMatch, mentionsServiceAndCityTogether }) => {
  if (isDocumentQuestion) {
    return "service_information";
  }

  // Checked before the generic UI_COMMAND_PATTERN: bare words like "open" would
  // otherwise swallow "open directions"/"open the map"/"open that facility" before
  // they're recognised as facility-specific requests.
  if (DIRECTIONS_PATTERN.test(message)) {
    return "directions";
  }

  // Only treat this as "asking about one specific facility" when the message itself
  // names the facility (service + city together, or "that one"/"that facility") -
  // a city mentioned on its own while a service carries over from earlier should not
  // force navigation into a details screen.
  if (
    FACILITY_DETAILS_PATTERN.test(message) ||
    (mentionsServiceAndCityTogether && hasConfidentLocationMatch)
  ) {
    return "facility_details";
  }

  if (locationReference === "selection") {
    return "facility_details";
  }

  if (locationReference === "closest") {
    return "nearby_facilities";
  }

  if (UI_COMMAND_PATTERN.test(message)) {
    return "ui_command";
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

// Exact physical distance is only possible when the browser provides location data.
// Without that, we should not pretend a facility is physically closest.
const buildNearbyFacilitiesResponse = (locations, city) => {
  if (!locations || locations.length === 0) {
    return "I don't have any matching facilities to compare yet. Could you tell me which service and area you need?";
  }

  const cityMatches = city
    ? locations.filter((location) => location.city && location.city.toLowerCase() === city.toLowerCase())
    : [];

  if (cityMatches.length > 0) {
    const label = cityMatches.length === 1 ? "facility" : "facilities";
    return `I found ${cityMatches.length} matching ${label} in ${city}. I can use the town match, but I need your browser location before I can calculate exact physical distance between facilities.`;
  }

  if (city) {
    return `I found ${locations.length} option${locations.length === 1 ? "" : "s"}, but not specifically in ${city}. Please share your town or allow location access so I can compare exact physical distance.`;
  }

  return "I need your town or your browser location before I can calculate exact physical distance between facilities.";
};

module.exports = {
  detectService,
  detectAccessibilityNeed,
  detectCity,
  detectUserGoal,
  isDocumentRequirementQuestion,
  detectLocationReference,
  resolveFacilitySelection,
  buildFacilitySelectionClarification,
  detectIntent,
  detectClarification,
  buildServiceLocations,
  buildResponseText,
  buildDocumentRequirementsResponse,
  buildNearbyFacilitiesResponse,
  serviceByName,
};
