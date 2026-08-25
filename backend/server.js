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
const PORT = process.env.PORT || 3000;

app.use(express.json());


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

// Ask Thušo endpoint
app.post("/api/ask", (req, res) => {
    const message = req.body.message?.toLowerCase();

    if (!message) {
        return res.status(400).json({
            response: "Please enter a question."
        });
    }

    let response =
        "I'm not sure which service can help with that yet. Try describing what you need help with.";

    let service = null;
    let accessibilityNeed = null;

    // Home Affairs
    if (
        message.includes("id") ||
        message.includes("identity") ||
        message.includes("passport") ||
        message.includes("birth certificate") ||
        message.includes("marriage certificate")
    ) {
        service = servicesData.services.find(
            service => service.name === "Home Affairs"
        );
    }

    // SASSA
    else if (
        message.includes("grant") ||
        message.includes("sassa") ||
        message.includes("social grant")
    ) {
        service = servicesData.services.find(
            service => service.name === "SASSA"
        );
    }

    // Department of Health
    else if (
        message.includes("clinic") ||
        message.includes("hospital") ||
        message.includes("health") ||
        message.includes("doctor") ||
        message.includes("medicine")
    ) {
        service = servicesData.services.find(
            service => service.name === "Department of Health"
        );
    }

    // Municipal Services
    else if (
        message.includes("municipality") ||
        message.includes("municipal") ||
        message.includes("rates") ||
        message.includes("certificate")
    ) {
        service = servicesData.services.find(
            service => service.name === "Municipal Services"
        );
    }

    // Education
    else if (
        message.includes("education") ||
        message.includes("school") ||
        message.includes("bursary") ||
        message.includes("university")
    ) {
        service = servicesData.services.find(
            service => service.name === "Education"
        );
    }
    // Accessibility needs
    if (
    message.includes("wheelchair") ||
    message.includes("wheel chair") ||
    message.includes("ramp")
) {
    accessibilityNeed = "wheelchairAccessible";
}

if (
    message.includes("blind") ||
    message.includes("visual impairment") ||
    message.includes("visually impaired")
) {
    accessibilityNeed = "audioGuidance";
}

if (
    message.includes("deaf") ||
    message.includes("hearing impaired") ||
    message.includes("sign language")
) {
    accessibilityNeed = "signLanguageSupport";
}

    let locations = [];

if (service) {

    locations = locationsData.locations
        .filter(location => location.serviceId === service.id)
        .map(location => {

            const accessibilityInfo =
                accessibilityData.locations.find(
                    accessibility =>
                        accessibility.id === location.id
                );

            const accessibilityMatch =
                accessibilityNeed &&
                accessibilityInfo &&
                accessibilityInfo[accessibilityNeed] === true;

            return {
                ...location,
                accessibilityMatch: Boolean(accessibilityMatch)
            };
        });

    // Prioritize locations matching the accessibility need
    if (accessibilityNeed) {
        locations.sort((a, b) => {
            return (
                Number(b.accessibilityMatch) -
                Number(a.accessibilityMatch)
            );
        });
    }

    response =
        `It sounds like you may need help from ${service.name}. ${service.description}`;

    if (accessibilityNeed) {

        const accessibilityLabels = {
            wheelchairAccessible: "wheelchair access",
            audioGuidance: "audio guidance",
            signLanguageSupport: "sign language support"
        };

        const matchingLocations = locations.filter(
            location => location.accessibilityMatch
        );

        response +=
            ` I prioritized locations with ${accessibilityLabels[accessibilityNeed]}.`;

        if (matchingLocations.length > 0) {
            response +=
                ` I found ${matchingLocations.length} recommended location${matchingLocations.length === 1 ? "" : "s"} that match your accessibility needs.`;
        } else {
            response +=
                " I couldn't find a location in the current data that matches that accessibility need, but you can still view the available locations.";
        }

    } else if (locations.length > 0) {

        response +=
            ` I found ${locations.length} location${locations.length === 1 ? "" : "s"} for this service.`;
    }
}

    res.json({
        response: response,

        service: service
            ? {
                id: service.id,
                name: service.name
            }
            : null,

        locations: locations
    });
});

app.listen(PORT, () => {
    console.log(`Thušo AI running at http://localhost:${PORT}`);
});