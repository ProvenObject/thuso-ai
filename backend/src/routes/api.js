const express = require("express");
const {
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
} = require("../controllers/dataController");
const { ask, testGemini } = require("../controllers/askController");

const router = express.Router();

router.get("/status", getStatus);
router.get("/health", getHealth);

router.get("/accessibility", getAccessibility);
router.get("/accessibility/:id", getAccessibilityById);

router.get("/services", getServices);
router.get("/services/:serviceId/locations", getServiceLocations);
router.get("/services/:id", getServiceById);

router.get("/locations", getLocations);
router.get("/locations/:id/accessibility", getLocationAccessibility);
router.get("/locations/:id", getLocationById);

router.post("/ask", ask);
router.post("/test-gemini", testGemini);

module.exports = router;
