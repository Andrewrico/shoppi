// Optional browser test for affiliate mode. Build first: SHOPPI_MODE=affiliate npx eleventy --output=_site-affiliate
// Then: node scripts/e2e-affiliate.mjs  (needs Playwright; set CHROME_PATH to use an installed Chrome).
let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = await import("playwright-core")); }
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = process.argv[2] || new URL("../_site-affiliate", import.meta.url).pathname;
const mime = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => { let f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html"); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": mime[path.extname(f)] || "application/octet-stream" }); res.end(fs.readFileSync(f)); }).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const r = []; const ok = (n, c, x = "") => r.push([c, n + (c ? "" : " " + x)]);
await p.goto(base + "/products/");
ok("no cart button", (await p.locator("[data-cart-open]").count()) === 0);
ok("disclosure banner visible", await p.locator(".disclosure").isVisible());
ok("no prices shown", !(await p.locator(".product-grid").textContent()).includes("$"));
const link = p.locator(".product-card .button--primary").first();
ok("button is sponsored + new tab", (await link.getAttribute("rel")) === "sponsored nofollow noopener" && (await link.getAttribute("target")) === "_blank");
ok("button label uses merchant", (await link.textContent()).includes("View on the store"));
await p.goto(base + "/products/canvas-tote/");
ok("product page has disclosure text near button", (await p.locator(".product__disclosure").count()) === 1);
ok("no Offer in JSON-LD", !(await p.locator('script[type="application/ld+json"]').textContent()).includes("offers"));
await p.click("[data-chat-launcher]");
await p.fill("#chat-input", "where can i buy the mug"); await p.keyboard.press("Enter");
await p.waitForSelector(".chat-card .button");
ok("chat shows buy link, not add-to-cart", (await p.locator(".chat-card .button").first().getAttribute("rel")) === "sponsored nofollow noopener" && (await p.locator(".chat-card button").count()) === 0);
await p.fill("#chat-input", "show my cart"); await p.keyboard.press("Enter");
await p.waitForFunction(() => document.querySelector("[data-chat-log]").textContent.includes("no cart on this site"));
ok("chat explains there is no cart", true);
await p.click('.chat__chips button:has-text("Affiliate disclosure")');
await p.waitForFunction(() => document.querySelector("[data-chat-log]").textContent.includes("Needs your input"));
ok("chat quotes the disclosure", true);
for (const [pass, n] of r) console.log((pass ? "PASS " : "FAIL ") + n);
console.log(errors.length ? "ERRORS " + errors.join("|") : "no console errors");
await b.close(); server.close();
process.exit(r.every(([pass]) => pass) && !errors.length ? 0 : 1);
