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


const app = express();
const PORT = process.env.PORT || 3000;

// Temporary conversation memory
const conversationState = {
    service: null,
    accessibilityNeed: null,
    city: null
};

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

    const rawMessage = req.body.message?.trim() || "";
    const message = rawMessage.toLowerCase();

    if (!message) {
        return res.status(400).json({
            response: "Please enter a question."
        });
    }

    /*
    ============================================
    START FRESH FOR THIS MESSAGE
    ============================================
    */

    let service = null;
    let accessibilityNeed = null;
    let city = null;


    /*
    ============================================
    GEMINI INTENT DETECTION
    Optional - app still works without Gemini
    ============================================
    */

    let aiIntent = null;

    try {

        const result = await ai.models.generateContent({
            model: "gemini-3.6-flash",

            contents: `
You are the language understanding system for Thušo AI.

Thušo AI helps people find government services and accessible
service locations in Limpopo, South Africa.

Analyse ONLY the user's CURRENT message.

Identify:

1. Which service they need.
2. Whether they mention an accessibility need.
3. Whether they mention a city or town.

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

Known cities:
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

Return ONLY valid JSON.

Use this exact format:

{
    "service": "Home Affairs or SASSA or Department of Health or Municipal Services or Education or null",
    "accessibilityNeed": "wheelchairAccessible or audioGuidance or signLanguageSupport or accessibleEntrance or null",
    "city": "city name or null"
}

User message:
"${rawMessage}"
            `
        });

        const text = result.text || "";

        const cleanedText = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        aiIntent = JSON.parse(cleanedText);

        console.log("AI Intent:", aiIntent);

    } catch (error) {

        console.error(
            "Gemini understanding error:",
            error.message
        );

        // App continues using offline logic
    }


    /*
    ============================================
    SERVICE DETECTION
    CURRENT MESSAGE HAS PRIORITY
    ============================================
    */

    // Gemini result first
    if (aiIntent?.service) {

        service =
            servicesData.services.find(
                s => s.name === aiIntent.service
            ) || null;
    }


    // Home Affairs
    if (!service && (
        message.includes("id") ||
        message.includes("identity") ||
        message.includes("passport") ||
        message.includes("birth certificate") ||
        message.includes("marriage certificate")
    )) {

        service =
            servicesData.services.find(
                s => s.name === "Home Affairs"
            );
    }


    // SASSA
    if (!service && (
        message.includes("grant") ||
        message.includes("sassa") ||
        message.includes("social grant")
    )) {

        service =
            servicesData.services.find(
                s => s.name === "SASSA"
            );
    }


    // Department of Health
    if (!service && (
        message.includes("clinic") ||
        message.includes("hospital") ||
        message.includes("health") ||
        message.includes("doctor") ||
        message.includes("medicine") ||
        message.includes("sick") ||
        message.includes("ill") ||
        message.includes("medical")
    )) {

        service =
            servicesData.services.find(
                s => s.name === "Department of Health"
            );
    }


    // Municipal Services
    if (!service && (
        message.includes("municipality") ||
        message.includes("municipal") ||
        message.includes("rates") ||
        message.includes("water") ||
        message.includes("electricity") ||
        message.includes("refuse")
    )) {

        service =
            servicesData.services.find(
                s => s.name === "Municipal Services"
            );
    }


    // Education
    if (!service && (
        message.includes("education") ||
        message.includes("school") ||
        message.includes("bursary") ||
        message.includes("university") ||
        message.includes("college")
    )) {

        service =
            servicesData.services.find(
                s => s.name === "Education"
            );
    }


    /*
    ============================================
    ACCESSIBILITY DETECTION
    ============================================
    */

    if (aiIntent?.accessibilityNeed) {

        accessibilityNeed =
            aiIntent.accessibilityNeed;

    } else if (
        message.includes("blind") ||
        message.includes("visual impairment") ||
        message.includes("visually impaired")
    ) {

        accessibilityNeed = "audioGuidance";

    } else if (
        message.includes("deaf") ||
        message.includes("hearing impaired") ||
        message.includes("sign language") ||
        message.includes("cannot hear") ||
        message.includes("can't hear")
    ) {

        accessibilityNeed =
            "signLanguageSupport";

    } else if (
        message.includes("wheelchair") ||
        message.includes("wheel chair") ||
        message.includes("mobility impairment") ||
        message.includes("cannot walk")
    ) {

        accessibilityNeed =
            "wheelchairAccessible";

    } else if (
        message.includes("accessible entrance") ||
        message.includes("step-free") ||
        message.includes("no stairs")
    ) {

        accessibilityNeed =
            "accessibleEntrance";
    }


    /*
    ============================================
    CITY DETECTION
    ============================================
    */

    if (aiIntent?.city) {

        city = aiIntent.city;

    } else {

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

        for (
            const [alias, cityName]
            of Object.entries(cityAliases)
        ) {

            if (message.includes(alias)) {

                city = cityName;
                break;
            }
        }
    }


    /*
    ============================================
    NOW USE PREVIOUS CONTEXT
    ONLY IF CURRENT MESSAGE DID NOT SPECIFY IT
    ============================================
    */

    if (
        !service &&
        conversationState.service
    ) {

        service =
            servicesData.services.find(
                s => s.name ===
                    conversationState.service
            ) || null;
    }


    if (
        !accessibilityNeed &&
        conversationState.accessibilityNeed
    ) {

        accessibilityNeed =
            conversationState.accessibilityNeed;
    }


    if (
        !city &&
        conversationState.city
    ) {

        city =
            conversationState.city;
    }


    /*
    ============================================
    UPDATE CONVERSATION STATE
    ============================================
    */

    if (service) {
        conversationState.service =
            service.name;
    }

    if (accessibilityNeed) {
        conversationState.accessibilityNeed =
            accessibilityNeed;
    }

    if (city) {
        conversationState.city =
            city;
    }


    console.log("Conversation state:", {
        service:
            conversationState.service,

        accessibilityNeed:
            conversationState.accessibilityNeed,

        city:
            conversationState.city
    });


    /*
    ============================================
    FIND LOCATIONS
    ============================================
    */

    let locations = [];

    if (service) {

        locations =
            locationsData.locations
                .filter(
                    location =>
                        location.serviceId ===
                        service.id
                )
                .map(location => {

                    const accessibility =
                        accessibilityData.locations.find(
                            item =>
                                item.id ===
                                location.id
                        );

                    const accessibilityMatch =
                        Boolean(
                            accessibilityNeed &&
                            accessibility &&
                            accessibility[
                                accessibilityNeed
                            ] === true
                        );

                    return {
                        ...location,
                        accessibilityMatch
                    };
                });


        /*
        ============================================
        SCORE LOCATIONS
        ============================================
        */

        locations.forEach(location => {

            let score = 0;

            // City is highest priority
            if (
                city &&
                location.city &&
                location.city
                    .toLowerCase() ===
                city.toLowerCase()
            ) {

                score += 10;
            }


            // Accessibility preference
            if (
                accessibilityNeed &&
                location.accessibilityMatch
            ) {

                score += 5;
            }


            location.relevanceScore = score;
        });


        locations.sort(
            (a, b) =>
                b.relevanceScore -
                a.relevanceScore
        );
    }


    /*
    ============================================
    BUILD RESPONSE
    OFFLINE VERSION
    ============================================
    */

    let response;

    if (!service) {

        response =
            "I'm not sure which government service can help with that. Try telling me what you need help with, for example an ID, grant, doctor, municipality, school or bursary.";

    } else {

        response =
            `It sounds like you may need help from ${service.name}. ${service.description}`;

        if (city) {

            const cityLocations =
                locations.filter(
                    location =>
                        location.city &&
                        location.city
                            .toLowerCase() ===
                        city.toLowerCase()
                );

            if (cityLocations.length > 0) {

                response +=
                    ` I found ${cityLocations.length} location${cityLocations.length === 1 ? "" : "s"} in ${city}.`;

            } else {

                response +=
                    ` I couldn't find a location specifically in ${city}, so I've shown the closest available options first.`;
            }
        }


        if (accessibilityNeed) {

            const accessibilityLabels = {

                wheelchairAccessible:
                    "wheelchair access",

                audioGuidance:
                    "audio guidance",

                signLanguageSupport:
                    "sign language support",

                accessibleEntrance:
                    "an accessible entrance"
            };


            const matchingLocations =
                locations.filter(
                    location =>
                        location.accessibilityMatch
                );


            if (
                matchingLocations.length > 0
            ) {

                response +=
                    ` I prioritized ${matchingLocations.length} location${matchingLocations.length === 1 ? "" : "s"} with ${accessibilityLabels[accessibilityNeed]}.`;

            } else {

                response +=
                    ` I couldn't verify ${accessibilityLabels[accessibilityNeed]} for the locations in the current data.`;
            }
        }


        if (
            locations.length > 0 &&
            !city &&
            !accessibilityNeed
        ) {

            response +=
                ` I found ${locations.length} location${locations.length === 1 ? "" : "s"} for this service.`;
        }
    }


    /*
    ============================================
    RETURN DATA
    ============================================
    */

    res.json({

        response,

        service: service
            ? {
                id: service.id,
                name: service.name
            }
            : null,

        locations
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