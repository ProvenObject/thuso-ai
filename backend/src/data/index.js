const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..", "data");

const readJson = (fileName) => JSON.parse(
  fs.readFileSync(path.join(rootDir, fileName), "utf-8")
);

const servicesData = readJson("services.json");
const locationsData = readJson("locations.json");
const accessibilityData = readJson("accessibility.json");

module.exports = {
  servicesData,
  locationsData,
  accessibilityData,
};
