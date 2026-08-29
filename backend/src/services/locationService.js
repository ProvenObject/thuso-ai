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

  let response = `It sounds like you may need help from ${service.name}. ${service.description}`;

  if (city) {
    const cityLocations = locations.filter(
      (location) => location.city && location.city.toLowerCase() === city.toLowerCase()
    );

    if (cityLocations.length > 0) {
      response += ` I found ${cityLocations.length} location${cityLocations.length === 1 ? "" : "s"} in ${city}.`;
    } else {
      response += ` I couldn't find a location specifically in ${city}, so I've shown the closest available options first.`;
    }
  }

  if (accessibilityNeed) {
    const accessibilityLabels = {
      wheelchairAccessible: "wheelchair access",
      audioGuidance: "audio guidance",
      signLanguageSupport: "sign language support",
      accessibleEntrance: "an accessible entrance",
    };

    const matchingLocations = locations.filter((location) => location.accessibilityMatch);

    if (matchingLocations.length > 0) {
      response += ` I prioritized ${matchingLocations.length} location${matchingLocations.length === 1 ? "" : "s"} with ${accessibilityLabels[accessibilityNeed]}.`;
    } else {
      response += ` I couldn't verify ${accessibilityLabels[accessibilityNeed]} for the locations in the current data.`;
    }
  }

  if (locations.length > 0 && !city && !accessibilityNeed) {
    response += ` I found ${locations.length} location${locations.length === 1 ? "" : "s"} for this service.`;
  }

  return response;
};

module.exports = {
  detectService,
  detectAccessibilityNeed,
  detectCity,
  buildServiceLocations,
  buildResponseText,
  serviceByName,
};
