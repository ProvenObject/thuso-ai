const express = require("express");
const path = require("path");
const fs = require("fs");

const servicesData = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "data", "services.json"),
        "utf-8"
    )
);

const locationsData = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "data", "locations.json"),
        "utf-8"
    )
);


const accessibilityData = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "data", "accessibility.json"),
        "utf-8"
    )
);

const app = express();
const PORT = 3000;


// Serve the frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// API test endpoint
app.get("/api/status", (req, res) => {
    res.json({
        message: "Thušo AI backend is running!"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

app.get("/api/accessibility", (req, res) => {
    const {
        wheelchairAccessible,
        audioGuidance,
        signLanguageSupport,
        accessibleEntrance
    } = req.query;

    let filteredData = accessibilityData.locations;

    if (wheelchairAccessible !== undefined) {
        filteredData = filteredData.filter(
            location =>
                location.wheelchairAccessible ===
                (wheelchairAccessible === "true")
        );
    }

    if (audioGuidance !== undefined) {
        filteredData = filteredData.filter(
            location =>
                location.audioGuidance ===
                (audioGuidance === "true")
        );
    }

    if (signLanguageSupport !== undefined) {
        filteredData = filteredData.filter(
            location =>
                location.signLanguageSupport ===
                (signLanguageSupport === "true")
        );
    }

    if (accessibleEntrance !== undefined) {
        filteredData = filteredData.filter(
            location =>
                location.accessibleEntrance ===
                (accessibleEntrance === "true")
        );
    }

    res.json(filteredData);
});

app.get("/api/accessibility/:id", (req, res) => {
    const id = Number(req.params.id);

    const location = accessibilityData.locations.find(
        (location) => location.id === id
    );

    if (!location) {
        return res.status(404).json({
            error: "Accessibility information not found"
        });
    }

    res.json(location);
});

// Get all government services
app.get("/api/services", (req, res) => {
    res.json(servicesData.services);
});

// Get all locations for a specific service
app.get("/api/services/:serviceId/locations", (req, res) => {
    const serviceId = Number(req.params.serviceId);

    const service = servicesData.services.find(
        service => service.id === serviceId
    );

    if (!service) {
        return res.status(404).json({
            message: "Service not found"
        });
    }

    const serviceLocations = locationsData.locations.filter(
        location => location.serviceId === serviceId
    );

    res.json(serviceLocations);
});

// Get a specific government service by ID
app.get("/api/services/:id", (req, res) => {
    const serviceId = Number(req.params.id);

    const service = servicesData.services.find(
        service => service.id === serviceId
    );

    if (!service) {
        return res.status(404).json({
            message: "Service not found"
        });
    }

    res.json(service);
});

// Locations endpoints
app.get("/api/locations", (req, res) => {
    res.json(locationsData.locations);
});

app.get("/api/locations/:id/accessibility", (req, res) => {
    const locationId = Number(req.params.id);

    const location = locationsData.locations.find(
        location => location.id === locationId
    );

    if (!location) {
        return res.status(404).json({
            message: "Location not found"
        });
    }

    const accessibilityInfo = accessibilityData.locations.find(
        accessibility => accessibility.id === locationId
    );

    if (!accessibilityInfo) {
        return res.status(404).json({
            message: "Accessibility information not found"
        });
    }

    res.json(accessibilityInfo);
});

app.get("/api/locations/:id", (req, res) => {
    const locationId = Number(req.params.id);

    const location = locationsData.locations.find(
        location => location.id === locationId
    );

    if (!location) {
        return res.status(404).json({
            message: "Location not found"
        });
    }

    res.json(location);
});

app.listen(PORT, () => {
    console.log(`Thušo AI running at http://localhost:${PORT}`);
});