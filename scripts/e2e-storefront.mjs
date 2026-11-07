// Browser checks for shop filters, product page, wishlist, compare and quick view. Needs playwright. Usage: node scripts/e2e-storefront.mjs [siteDir]
let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = await import("playwright-core")); }
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || new URL("../_site", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/json" };
const server = http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
let failed = 0;
const ok = (name, pass) => { console.log(`${pass ? "PASS" : "FAIL"} ${name}`); if (!pass) failed += 1; };
const visibleTitles = () => page.$$eval("[data-product-list] [data-search-text]", (cards) => cards.filter((c) => !c.hidden).map((c) => c.dataset.title));

await page.goto(base + "/products/");
ok("all products listed", (await visibleTitles()).length === 4);
await page.check("#filter-stock");
ok("in stock filter hides sold out", !(await visibleTitles()).includes("Linen Throw"));
await page.click('button[type="reset"]');
await page.waitForFunction(() => document.querySelector("[data-search-status]").textContent.startsWith("4"));
await page.check("#filter-home");
ok("collection filter", (await visibleTitles()).join() === "Ceramic Mug,Linen Throw");
await page.click('button[type="reset"]');
await page.waitForFunction(() => document.querySelector("[data-search-status]").textContent.startsWith("4"));
await page.fill("#filter-max", "30");
ok("price filter", (await visibleTitles()).join() === "Canvas Tote,Ceramic Mug");
await page.click('button[type="reset"]');
await page.waitForFunction(() => document.querySelector("[data-search-status]").textContent.startsWith("4"));
await page.selectOption("#shop-sort", "price-desc");
ok("sort by price", (await visibleTitles())[0] === "Linen Throw");
await page.click('[data-view="list"]');
ok("list view", await page.locator(".product-grid--list").count() === 1);
await page.reload();
ok("view is remembered", await page.locator(".product-grid--list").count() === 1);
await page.click('[data-view="grid"]');

await page.click('[data-wishlist-toggle="ceramic-mug"]');
await page.click('[data-compare-toggle="ceramic-mug"]');
await page.click('[data-compare-toggle="day-backpack"]');
ok("wishlist count", (await page.textContent("[data-wishlist-count]")) === "1");
ok("compare count", (await page.textContent("[data-compare-count]")) === "2");
await page.goto(base + "/wishlist/");
ok("wishlist page shows saved product", (await page.$$eval("[data-wishlist-grid] > *", (c) => c.filter((x) => !x.hidden).map((x) => x.dataset.title))).join() === "Ceramic Mug");
await page.goto(base + "/compare/");
ok("compare table has 2 products", await page.locator(".compare-table thead th, .compare-table th[scope=col]").count() === 2);
ok("compare shows prices", (await page.textContent(".compare-table")).includes("$89.00"));
await page.click('button[aria-label="Remove Ceramic Mug from comparison"]');
ok("compare remove", await page.locator(".compare-table th[scope=col]").count() === 1);

await page.goto(base + "/products/");
await page.hover('[data-handle="canvas-tote"]');
await page.click('[data-handle="canvas-tote"] [data-quick-view]');
await page.waitForSelector("#quick-view[open] .product__form");
ok("quick view opens with product form", true);
await page.click('#quick-view label[for="variant-canvas-tote-black"]');
await page.click("#quick-view [data-add-to-cart]");
await page.waitForFunction(() => document.querySelector("[data-cart-count]").textContent === "1");
ok("quick view adds to cart", true);
await page.waitForFunction(() => !document.getElementById("quick-view").open);
ok("quick view closes after adding", true);
await page.keyboard.press("Escape");

await page.goto(base + "/products/canvas-tote/");
await page.click('[data-gallery-thumb]:nth-child(2)');
ok("gallery swaps image", (await page.getAttribute(".product__stage img", "src")).endsWith("canvas-tote-2.svg"));
await page.click('label[for="variant-canvas-tote-black"]');
ok("option changes photo", (await page.getAttribute(".product__stage img", "src")).endsWith("canvas-tote-2.svg"));
await page.click('label[for="variant-canvas-tote-natural"]');
ok("option changes photo back", (await page.getAttribute(".product__stage img", "src")).endsWith("canvas-tote-1.svg"));
await page.click('label[for="variant-canvas-tote-black"]');
ok("option updates selected thumbnail", (await page.getAttribute('[data-gallery-thumb]:nth-child(2)', "aria-pressed")) === "true");
await page.click(".category-menu summary");
ok("menu lists products under collections", await page.locator('.category-menu__panel a[href="/products/ceramic-mug/"]').isVisible());
await page.keyboard.press("Escape");
await page.click('[data-qty-step="1"]');
ok("quantity stepper", (await page.inputValue("#qty")) === "2");
ok("related products shown", (await page.locator('[aria-labelledby="related-title"] .product-card').count()) > 0);
await page.goto(base + "/contact/");
ok("contact page", (await page.textContent("h1")) === "Contact");

const phone = await browser.newContext({ viewport: { width: 375, height: 800 } });
const small = await phone.newPage();
for (const url of ["/", "/products/", "/products/canvas-tote/", "/compare/", "/wishlist/"]) {
  await small.goto(base + url);
  ok(`no sideways scroll at 375px: ${url}`, await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
ok("no console errors", errors.length === 0);
if (errors.length) console.log([...new Set(errors)].slice(0, 5).join("\n"));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
