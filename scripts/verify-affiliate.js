// Builds the site in affiliate mode into _site-affiliate/ and runs the structure and axe checks on it.
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const env = { ...process.env, SHOPPI_MODE: "affiliate", SITE_DIR: "_site-affiliate" };
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
};

run("npx", ["eleventy", "--quiet", "--output=_site-affiliate"]);
run("node", ["scripts/check.js"]);
run("node", ["scripts/a11y.js"]);
