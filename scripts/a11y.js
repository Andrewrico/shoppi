// Runs axe-core (WCAG 2.0/2.1 A and AA rules) over every built HTML page. Run after `npm run build`.
// jsdom has no layout engine, so color-contrast cannot be computed here: the tokens are checked separately (test/contrast.test.js).
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const OUT = path.join(__dirname, "..", process.env.SITE_DIR || "_site");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const pages = walk(OUT).filter((file) => file.endsWith(".html"));

(async () => {
  let violations = 0;
  for (const file of pages) {
    const dom = new JSDOM(fs.readFileSync(file, "utf8"), { runScripts: "outside-only", pretendToBeVisual: true });
    dom.window.eval(axeSource);
    const results = await dom.window.axe.run(dom.window.document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      rules: { "color-contrast": { enabled: false }, region: { enabled: true } },
    });
    for (const v of results.violations) {
      violations += 1;
      console.error(`${path.relative(OUT, file)}: [${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 2).map((n) => n.html.slice(0, 100)).join("\n    ")}`);
    }
    dom.window.close();
  }
  if (violations) {
    console.error(`a11y: ${violations} violation(s) on ${pages.length} pages`);
    process.exit(1);
  }
  console.log(`a11y: ${pages.length} pages, 0 axe violations`);
})();
