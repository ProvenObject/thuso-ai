const { servicesData, locationsData, accessibilityData } = require("../data");
const { applyBooleanFilters } = require("../utils/queryHelpers");

function getStatus(req, res) {
  res.json({ message: "Thušo AI backend is running!" });
}

function getHealth(req, res) {
  res.json({ status: "ok" });
}

function getAccessibility(req, res) {
  const {
    wheelchairAccessible,
    audioGuidance,
    signLanguageSupport,
    accessibleEntrance,
  } = req.query;

  const filteredData = applyBooleanFilters(accessibilityData.locations, [
    { key: "wheelchairAccessible", value: wheelchairAccessible },
    { key: "audioGuidance", value: audioGuidance },
    { key: "signLanguageSupport", value: signLanguageSupport },
    { key: "accessibleEntrance", value: accessibleEntrance },
  ]);

  res.json(filteredData);
}

function getAccessibilityById(req, res) {
  const id = Number(req.params.id);
  const location = accessibilityData.locations.find((item) => item.id === id);

  if (!location) {
    return res.status(404).json({ error: "Accessibility information not found" });
  }

  return res.json(location);
}

function getServices(req, res) {
  const { category, name } = req.query;

  let filteredServices = [...servicesData.services];

  if (category) {
    const normalizedCategory = String(category).trim().toLowerCase();

    filteredServices = filteredServices.filter((service) => {
      const serviceName = (service.name || "").toLowerCase();
      const serviceCategory = (service.category || "").toLowerCase();

      return (
        serviceName === normalizedCategory ||
        serviceCategory.includes(normalizedCategory) ||
        serviceName.includes(normalizedCategory)
      );
    });
  }

  if (name) {
    const normalizedName = String(name).trim().toLowerCase();

    filteredServices = filteredServices.filter((service) =>
      (service.name || "").toLowerCase().includes(normalizedName)
    );
  }

  res.json(filteredServices);
}

function getServiceLocations(req, res) {
  const serviceId = Number(req.params.serviceId);
  const service = servicesData.services.find((item) => item.id === serviceId);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  const serviceLocations = locationsData.locations.filter(
    (location) => location.serviceId === serviceId
  );

  return res.json(serviceLocations);
}

function getServiceById(req, res) {
  const serviceId = Number(req.params.id);
  const service = servicesData.services.find((item) => item.id === serviceId);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  res.json(service);
}

function getLocations(req, res) {
  res.json(locationsData.locations);
}

function getLocationAccessibility(req, res) {
  const locationId = Number(req.params.id);
  const location = locationsData.locations.find((item) => item.id === locationId);

  if (!location) {
    return res.status(404).json({ message: "Location not found" });
  }

  const accessibilityInfo = accessibilityData.locations.find(
    (item) => item.id === locationId
  );

  if (!accessibilityInfo) {
    return res.status(404).json({ message: "Accessibility information not found" });
  }

  return res.json(accessibilityInfo);
}

function getLocationById(req, res) {
  const locationId = Number(req.params.id);
  const location = locationsData.locations.find((item) => item.id === locationId);

  if (!location) {
    return res.status(404).json({ message: "Location not found" });
  }

  return res.json(location);
}

module.exports = {
  getStatus,
  getHealth,
  getAccessibility,
  getAccessibilityById,
  getServices,
  getServiceLocations,
  getServiceById,
  getLocations,
  getLocationAccessibility,
  getLocationById,
};
