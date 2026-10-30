// Site details live in site.json. The address can be overridden at build time, so one repo can deploy to any host:
// SITE_URL (any host) wins, then Netlify's own URL variable, then "url" in site.json.
const site = require("./site.json");

module.exports = { ...site, url: (process.env.SITE_URL || process.env.URL || site.url).replace(/\/+$/, "") };
