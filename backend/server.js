const app = require("./src/app");
const { PORT } = require("./config");

app.listen(PORT, () => {
  console.log(`Thušo AI running at http://localhost:${PORT}`);
});
