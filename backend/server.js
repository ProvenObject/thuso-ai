const express = require("express");
const path = require("path");

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

app.listen(PORT, () => {
    console.log(`Thušo AI running at http://localhost:${PORT}`);
});