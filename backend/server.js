const express = require("express");
const path = require("path");
const fs = require("fs");

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

app.listen(PORT, () => {
    console.log(`Thušo AI running at http://localhost:${PORT}`);
});