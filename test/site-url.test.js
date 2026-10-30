const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function build(env) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "shoppi-url-"));
  const clean = { ...process.env, SITE_URL: "", URL: "" };
  const result = spawnSync("npx", ["eleventy", "--quiet", `--output=${out}`], { cwd: path.join(__dirname, ".."), env: { ...clean, ...env }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const read = (file) => fs.readFileSync(path.join(out, file), "utf8");
  return { canonical: read("index.html").match(/<link rel="canonical" href="([^"]+)"/)[1], sitemap: read("sitemap.xml"), robots: read("robots.txt") };
}

test("SITE_URL sets canonical, sitemap and robots (trailing slash ignored)", () => {
  const { canonical, sitemap, robots } = build({ SITE_URL: "https://demo.example.net/" });
  assert.equal(canonical, "https://demo.example.net/");
  assert.match(sitemap, /<loc>https:\/\/demo\.example\.net\/products\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/demo\.example\.net\/sitemap\.xml/);
});

test("Netlify's URL is used when SITE_URL is not set, and SITE_URL wins over it", () => {
  assert.equal(build({ URL: "https://from-netlify.example" }).canonical, "https://from-netlify.example/");
  assert.equal(build({ URL: "https://from-netlify.example", SITE_URL: "https://explicit.example" }).canonical, "https://explicit.example/");
});

test("falls back to site.json", () => {
  const expected = require("../src/_data/site.json").url.replace(/\/+$/, "") + "/";
  assert.equal(build({}).canonical, expected);
});
