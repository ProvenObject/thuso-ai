const path = require("path");
const express = require("express");
const apiRoutes = require("./routes/api");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));
app.use("/vendor/lucide", express.static(path.join(__dirname, "..", "..", "node_modules", "lucide", "dist", "umd")));
app.use("/api", apiRoutes);

module.exports = app;
