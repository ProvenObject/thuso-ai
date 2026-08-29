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

module.exports = {
  detectService,
  detectAccessibilityNeed,
  detectCity,
  buildServiceLocations,
  buildResponseText,
  serviceByName,
};
