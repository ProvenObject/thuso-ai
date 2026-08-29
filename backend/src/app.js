const path = require("path");
const express = require("express");
const apiRoutes = require("./routes/api");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));
app.use("/api", apiRoutes);

module.exports = app;
