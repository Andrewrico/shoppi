// "store" or "affiliate". SHOPPI_MODE overrides store.json for one build (used by `npm run verify`).
const store = require("./store.json");

module.exports = process.env.SHOPPI_MODE || store.mode || "store";
