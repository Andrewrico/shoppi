// Structural checks on the built site (npm run check after npm run build).
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "_site");
const errors = [];
const fail = (file, message) => errors.push(`${path.relative(OUT, file)}: ${message}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(OUT);
const pages = files.filter((file) => file.endsWith(".html"));
const known = new Set(files.map((file) => "/" + path.relative(OUT, file).split(path.sep).join("/")));
const urlExists = (url) => {
  const clean = url.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return true;
  return known.has(clean) || known.has(clean.replace(/\/$/, "") + "/index.html") || known.has(clean + "index.html");
};

for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  if (!/<html lang="[a-z-]+"/.test(html)) fail(file, "missing <html lang>");
  if (!/<title>[^<]+<\/title>/.test(html)) fail(file, "missing <title>");
  if (!/<meta name="description"/.test(html)) fail(file, "missing meta description");
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(file, "expected exactly one <h1>");
  if (!html.includes('class="skip-link"')) fail(file, "missing skip link");
  if (!html.includes('<main id="main-content"')) fail(file, "missing main landmark");
  for (const img of html.match(/<img\b[^>]*>/g) || []) if (!/\balt=/.test(img)) fail(file, `img without alt: ${img.slice(0, 60)}`);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch { fail(file, "invalid JSON-LD"); }
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) fail(file, `duplicate ids: ${[...new Set(dupes)].join(", ")}`);
  for (const match of html.matchAll(/<(?:a|link)\b[^>]*\bhref="(\/[^"]*)"/g)) if (!urlExists(match[1])) fail(file, `broken link ${match[1]}`);
  if (/\{\{|\{%/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) fail(file, "unrendered template tag");
}

for (const name of ["catalog.json", "knowledge.json", "sitemap.xml", "robots.txt", "llms.txt", "feed.xml", "sw.js"]) {
  if (!known.has("/" + name)) errors.push(`missing /${name}`);
}
const catalog = JSON.parse(fs.readFileSync(path.join(OUT, "catalog.json"), "utf8"));
if (!Object.keys(catalog.variants).length) errors.push("catalog.json has no variants");
JSON.parse(fs.readFileSync(path.join(OUT, "knowledge.json"), "utf8"));

if (errors.length) {
  console.error(`check: ${errors.length} problem(s)\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`check: ${pages.length} pages OK`);
