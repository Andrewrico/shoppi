// Optional browser test: `npm i -D playwright` then `npx playwright install chromium`, build the site, run `node scripts/e2e.mjs`.
// Set CHROME_PATH to use an installed Chrome instead.
let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = await import("playwright-core")); }
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || new URL("../_site", import.meta.url).pathname;
const mime = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": mime[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const results = [];
const ok = (name, cond, extra = "") => { results.push([cond, name + (cond ? "" : " " + extra)]); };

await page.goto(base + "/products/");
// quick add single-variant product
await page.click('button[data-add-to-cart][data-variant-id="ceramic-mug-default"]');
await page.waitForFunction(() => document.querySelector("[data-cart-count]").textContent === "1");
ok("badge shows 1 after add", true);
await page.waitForFunction(() => document.querySelector("[data-cart-status]").textContent.includes("Added"));
ok("live region announced", (await page.textContent("[data-cart-status]")).includes("Added Ceramic Mug"), await page.textContent("[data-cart-status]"));
// open dialog
await page.click("[data-cart-open]");
ok("dialog is open", await page.evaluate(() => document.getElementById("cart-dialog").open));
ok("line rendered with price", (await page.textContent("#cart-dialog .cart-line")).includes("$18.50"));
// qty +
await page.click('#cart-dialog button[aria-label="Increase quantity of Ceramic Mug"]');
ok("subtotal 2x = $37.00", (await page.textContent("#cart-dialog .cart-subtotal")).includes("$37.00"), await page.textContent("#cart-dialog .cart-subtotal"));
// focus is inside dialog and escape closes and returns focus to opener
await page.keyboard.press("Escape");
ok("escape closes dialog", !(await page.evaluate(() => document.getElementById("cart-dialog").open)));
ok("focus returns to cart button", await page.evaluate(() => document.activeElement?.hasAttribute("data-cart-open")));
// persistence across reload
await page.reload();
await page.waitForFunction(() => document.querySelector("[data-cart-count]").textContent === "2");
ok("cart persists on reload (2)", true);
// product page w/ variants
await page.goto(base + "/products/canvas-tote/");
await page.selectOption("#variant", "canvas-tote-black");
await page.click("button[data-add-to-cart]");
await page.waitForFunction(() => document.querySelector("[data-cart-count]").textContent === "3");
ok("variant add -> 3 items; dialog opened by form", await page.evaluate(() => document.getElementById("cart-dialog").open));
// preview checkout message
await page.click('#cart-dialog button:has-text("Check out")');
ok("preview checkout explains itself", (await page.textContent(".cart-checkout-status")).includes("Preview mode"));
await page.keyboard.press("Escape");
// sold out product has no add button
await page.goto(base + "/products/linen-throw/");
ok("sold out has no add button", (await page.locator("button[data-add-to-cart]").count()) === 0);
// cart page renders inline
await page.goto(base + "/cart/");
await page.waitForSelector("[data-cart-page] .cart-line");
ok("cart page lists 2 lines", (await page.locator("[data-cart-page] .cart-line").count()) === 2);
// remove
await page.click('[data-cart-page] button:has-text("Remove")');
ok("remove reduces lines", (await page.locator("[data-cart-page] .cart-line").count()) === 1);
// chat
await page.goto(base + "/");
await page.click("[data-chat-launcher]");
ok("chat opens and focuses input", await page.evaluate(() => document.activeElement?.id === "chat-input"));
ok("chat greeting shown", (await page.textContent("[data-chat-log]")).includes("Hi!"));
await page.fill("#chat-input", "add the ceramic mug to my cart");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelector("[data-cart-count]").textContent === "2", null, { timeout: 3000 });
ok("chat add-to-cart updated badge (was 1 -> 2)", true);
await page.fill("#chat-input", "tell me about the tote");
await page.keyboard.press("Enter");
await page.waitForSelector(".chat-card");
ok("chat returns product card", (await page.locator(".chat-card").last().textContent()).includes("Canvas Tote"));
await page.fill("#chat-input", "do you ship to mars");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelector("[data-chat-log]").textContent.includes("do not have an answer"));
ok("chat declines unknown", true);
await page.keyboard.press("Escape");
ok("escape closes chat", await page.evaluate(() => document.querySelector("[data-chat-panel]").hidden));
// a11y widget
await page.click("[data-a11y-launcher]");
await page.click('[data-theme-choice="contrast"]');
ok("contrast theme applied", (await page.evaluate(() => document.documentElement.dataset.a11yTheme)) === "contrast");
await page.fill("#a11y-size", "130").catch(() => {});
await page.$eval("#a11y-size", (el) => { el.value = "130"; el.dispatchEvent(new Event("input", { bubbles: true })); });
ok("text size scales root font", (await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)) === "20.8px", await page.evaluate(() => getComputedStyle(document.documentElement).fontSize));
await page.reload();
ok("settings persist after reload", (await page.evaluate(() => document.documentElement.dataset.a11yTheme)) === "contrast");

// tab order: skip link first
await page.goto(base + "/");
await page.keyboard.press("Tab");
ok("first Tab hits skip link", await page.evaluate(() => document.activeElement.classList.contains("skip-link")));
// mobile viewport: no horizontal overflow
await page.setViewportSize({ width: 375, height: 700 });
await page.goto(base + "/products/");
ok("no horizontal scroll at 375px", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), await page.evaluate(() => document.documentElement.scrollWidth));


for (const [pass, name] of results) console.log((pass ? "PASS " : "FAIL ") + name);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close(); server.close();
process.exit(results.every(([p]) => p) && !errors.length ? 0 : 1);
