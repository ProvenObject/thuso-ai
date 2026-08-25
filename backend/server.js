require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

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

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Temporary in-memory conversation state
const conversationState = {
    service: null,
    accessibilityNeed: null,
    city: null
};

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
app.post("/api/ask", async (req, res) => {
    const message = req.body.message?.toLowerCase();

    if (!message) {
        return res.status(400).json({
            response: "Please enter a question."
        });
    }

    let aiIntent = null;

    try {
        const result = await ai.models.generateContent({
            model: "gemini-3.6-flash",

            contents: `
            You are the language understanding system for Thušo AI.

            Thušo AI helps people find government services and accessible service locations in Limpopo, South Africa.

            Analyse the user's message and identify:

            1. Which government service they need.
            2. Any accessibility need they mention.
            3. The city or town they mention.

            Available services:
            - Home Affairs
            - SASSA
            - Department of Health
            - Municipal Services
            - Education

            Available accessibility needs:
            - wheelchairAccessible
            - audioGuidance
            - signLanguageSupport
            - accessibleEntrance

            Known cities and towns:
            - Polokwane
            - Seshego
            - Lebowakgomo
            - Mokopane
            - Tzaneen
            - Giyani
            - Thohoyandou
            - Louis Trichardt
            - Musina
            - Burgersfort
            - Jane Furse

            Important:
            - Understand spelling mistakes and informal phrasing.
            - For example, "Lebowakgmo" should be interpreted as "Lebowakgomo".
            - "I need a doctor" means "Department of Health".
            - "I use a wheelchair" means "wheelchairAccessible".
            - If the message only provides a city, return that city while setting the other fields to null.

            Return ONLY valid JSON in exactly this format:

            {
            "service": "Home Affairs or SASSA or Department of Health or Municipal Services or Education or null",
            "accessibilityNeed": "wheelchairAccessible or audioGuidance or signLanguageSupport or accessibleEntrance or null",
            "city": "Polokwane or Seshego or Lebowakgomo or Mokopane or Tzaneen or Giyani or Thohoyandou or Louis Trichardt or Musina or Burgersfort or Jane Furse or null"
            }

            User message:
            "${message}"
            `
        });

        const text = result.text;

        const cleanedText = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        aiIntent = JSON.parse(cleanedText);
        console.log("AI Intent:", aiIntent);

    } catch (error) {
        console.error("Gemini understanding error:", error);
    }

    let response =
        "I'm not sure which service can help with that yet. Try describing what you need help with.";

    let service = null;
    let accessibilityNeed = null;
    let city = null;

    // Service from Gemini
    if (aiIntent?.service) {
        const foundService = servicesData.services.find(
            service => service.name === aiIntent.service
        );

        if (foundService) {
            conversationContext.service = foundService;
        }
    }

    if (aiIntent?.accessibilityNeed) {
        conversationContext.accessibilityNeed =
            aiIntent.accessibilityNeed;
    }

    if (aiIntent?.city) {
        conversationContext.city =
            aiIntent.city;
    }

    // Keep the previous service for follow-up questions
    if (!service && conversationState.service) {
        service = servicesData.services.find(
            service => service.name === conversationState.service
        );
    }

    // Accessibility need from Gemini
    if (aiIntent?.accessibilityNeed) {
        accessibilityNeed = aiIntent.accessibilityNeed;
    } else if (conversationState.accessibilityNeed) {
        accessibilityNeed =
            conversationState.accessibilityNeed;
    }

    // City from Gemini
    if (aiIntent?.city) {
        city = aiIntent.city;
    } else if (conversationState.city) {
        city = conversationState.city;
    }

    // Home Affairs fallback
    if (!service && (
        message.includes("id") ||
        message.includes("identity") ||
        message.includes("passport") ||
        message.includes("birth certificate") ||
        message.includes("marriage certificate")
    )) {
        service = servicesData.services.find(
            service => service.name === "Home Affairs"
        );
    }

    // SASSA fallback
    if (!service && (
        message.includes("grant") ||
        message.includes("sassa") ||
        message.includes("social grant")
    )) {
        service = servicesData.services.find(
            service => service.name === "SASSA"
        );
    }

    // Department of Health fallback
    if (!service && (
        message.includes("clinic") ||
        message.includes("hospital") ||
        message.includes("health") ||
        message.includes("doctor") ||
        message.includes("medicine")
    )) {
        service = servicesData.services.find(
            service => service.name === "Department of Health"
        );
    }

    // Municipal Services fallback
    if (!service && (
        message.includes("municipality") ||
        message.includes("municipal") ||
        message.includes("rates") ||
        message.includes("certificate")
    )) {
        service = servicesData.services.find(
            service => service.name === "Municipal Services"
        );
    }

    // Education fallback
    if (!service && (
        message.includes("education") ||
        message.includes("school") ||
        message.includes("bursary") ||
        message.includes("university")
    )) {
        service = servicesData.services.find(
            service => service.name === "Education"
        );
    }
    // Accessibility needs
    if (!accessibilityNeed && (
        message.includes("blind") ||
        message.includes("visual impairment") ||
        message.includes("visually impaired")
    )) {
        accessibilityNeed = "audioGuidance";
    }

    if (!accessibilityNeed && (
        message.includes("deaf") ||
        message.includes("hearing impaired") ||
        message.includes("sign language")
    )) {
        accessibilityNeed = "signLanguageSupport";
    }

    if (!accessibilityNeed && (
        message.includes("wheelchair") ||
        message.includes("wheel chair") ||
        message.includes("mobility impairment") ||
        message.includes("cannot walk")
    )) {
        accessibilityNeed = "wheelchairAccessible";
    }

    if (!accessibilityNeed && (
        message.includes("accessible entrance") ||
        message.includes("step-free") ||
        message.includes("no stairs")
    )) {
        accessibilityNeed = "accessibleEntrance";
    }

    // City fallback detection
    const knownCities = [
        "Polokwane",
        "Seshego",
        "Lebowakgomo",
        "Mokopane",
        "Tzaneen",
        "Giyani",
        "Thohoyandou",
        "Louis Trichardt",
        "Musina",
        "Burgersfort",
        "Jane Furse"
    ];

    const cityAliases = {
        "lebowakgmo": "Lebowakgomo",
        "lebowakgomo": "Lebowakgomo",
        "polokwane": "Polokwane",
        "seshego": "Seshego",
        "mokopane": "Mokopane",
        "tzaneen": "Tzaneen",
        "giyani": "Giyani",
        "thohoyandou": "Thohoyandou",
        "louis trichardt": "Louis Trichardt",
        "musina": "Musina",
        "burgersfort": "Burgersfort",
        "jane furse": "Jane Furse"
    };

    for (const [alias, cityName] of Object.entries(cityAliases)) {
        if (message.includes(alias)) {
            city = cityName;
            break;
        }
    }

    // Save useful context for the next message
    if (service) {
        conversationState.service = service.name;
    }

    if (accessibilityNeed) {
        conversationState.accessibilityNeed =
            accessibilityNeed;
    }

    if (city) {
        conversationState.city = city;
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

    // Rank locations based on city and accessibility needs
    locations.forEach(location => {
        let score = 0;

        // Prioritize locations in the user's city
        if (
            city &&
            location.city.toLowerCase() === city.toLowerCase()
        ) {
            score += 10;
        }

        // Prioritize verified accessibility matches
        if (
            accessibilityNeed &&
            location.accessibilityMatch === true
        ) {
            score += 5;
        }

        location.relevanceScore = score;
    });

    locations.sort((a, b) => {
        return b.relevanceScore - a.relevanceScore;
    });

    response =
        `It sounds like you may need help from ${service.name}. ${service.description}`;

    if (accessibilityNeed) {

        const accessibilityLabels = {
            wheelchairAccessible: "wheelchair access",
            audioGuidance: "audio guidance",
            signLanguageSupport: "sign language support",
            accessibleEntrance: "an accessible entrance"
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

    try {
        const locationSummary = locations.length > 0
            ? locations
                .map(location => `${location.name} in ${location.city}`)
                .join(", ")
            : "No matching locations were found";

        const result = await ai.models.generateContent({
            model: "gemini-3.6-flash",

            contents: `
    You are Thušo AI, a helpful and concise assistant that helps people access government services in Limpopo, South Africa.

    Respond naturally to the user's message.

    User message:
    "${message}"

    The backend identified this service:
    ${service ? service.name : "No specific service identified"}

    Accessibility need:
    ${accessibilityNeed || "None identified"}

    User's current city:
    ${city || "Unknown"}

    Number of matching locations:
    ${locations.length}

    Matching locations:
    ${locationSummary}

    Important rules:
    - Do not invent government offices, addresses, accessibility features, or services.
    - Only discuss the service and locations provided above.
    - Do not list every location because the interface will display them separately.
    - Keep your answer concise, helpful, and conversational.
    - If no service was identified, ask the user to explain what help they need.
    - Do not use Markdown formatting, asterisks, headings, or bullet points.
    - Return plain conversational text only.
            `
        });

        if (result.text) {
            response = result.text.trim();
        }

    } catch (error) {
        console.error("Gemini response error:", error);
    }

    locations.forEach(location => {
        delete location.relevanceScore;
    });

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

app.post("/api/test-gemini", async (req, res) => {
    try {
        const result = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: "Say hello and briefly explain that you are Thušo AI, an assistant helping people access government services."
        });

        res.json({
            response: result.text
        });

    } catch (error) {
        console.error("Gemini error:", error);

        res.status(500).json({
            error: "Failed to communicate with Gemini"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Thušo AI running at http://localhost:${PORT}`);
});