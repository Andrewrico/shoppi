const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAffiliateUrl } = require("../lib/affiliate");
const { parseCsv, mapFeed, loadFeed } = require("../lib/feed");

test("adds the Amazon tag to amazon hosts only, once", () => {
  assert.equal(buildAffiliateUrl("https://www.amazon.com/dp/B000", { amazonTag: "me-20" }), "https://www.amazon.com/dp/B000?tag=me-20");
  assert.equal(buildAffiliateUrl("https://www.amazon.co.uk/dp/B000?tag=other-21", { amazonTag: "me-20" }), "https://www.amazon.co.uk/dp/B000?tag=other-21");
  assert.equal(buildAffiliateUrl("https://example.com/p", { amazonTag: "me-20" }), "https://example.com/p");
  assert.equal(buildAffiliateUrl("https://notamazon.com/p", { amazonTag: "me-20" }), "https://notamazon.com/p");
});

test("wraps with a network link template and encodes the target", () => {
  const url = buildAffiliateUrl("https://shop.example/p?a=1&b=2", { linkTemplate: "https://track.example/click?id=9&u={url}" });
  assert.equal(url, "https://track.example/click?id=9&u=https%3A%2F%2Fshop.example%2Fp%3Fa%3D1%26b%3D2");
});

test("rejects non-http and invalid URLs", () => {
  assert.equal(buildAffiliateUrl("javascript:alert(1)"), null);
  assert.equal(buildAffiliateUrl("not a url"), null);
  assert.equal(buildAffiliateUrl(undefined), null);
});

test("parseCsv handles quotes, commas, escaped quotes, CRLF and BOM", () => {
  const csv = "\uFEFFname,desc,price\r\n" + '"Tote, big","He said ""hi""",5\r\n' + 'Mug,"two\nlines",9\r\n\r\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Tote, big");
  assert.equal(rows[0].desc, 'He said "hi"');
  assert.equal(rows[0].price, "5");
  assert.equal(rows[1].desc, "two\nlines");
});

const fields = { handle: "sku", title: "name", description: "desc", price: "price", image: "img", affiliateUrl: "link", category: "cat", available: "stock" };

test("mapFeed builds products, collections, unique handles and availability", () => {
  const rows = [
    { sku: "A1", name: "Tote", desc: "d", price: "$1,299.50", img: "https://i/x.jpg", link: "https://m/x", cat: "Bags & Packs", stock: "in stock" },
    { sku: "A1", name: "Tote 2", desc: "", price: "9", img: "", link: "", cat: "Bags & Packs", stock: "out of stock" },
    { sku: "", name: "", price: "1" },
  ];
  const { products, collections } = mapFeed(rows, fields);
  assert.equal(products.length, 2);
  assert.deepEqual(products.map((p) => p.handle), ["a1", "a1-2"]);
  assert.equal(products[0].variants[0].price, 1299.5);
  assert.equal(products[1].variants[0].available, false);
  assert.deepEqual(collections, [{ handle: "bags-packs", title: "Bags & Packs", description: "" }]);
  assert.equal(products[0].affiliateUrl, "https://m/x");
});

test("loadFeed reads CSV or JSON, prefers the env URL, and surfaces errors", async () => {
  let asked;
  const csv = async (url) => ((asked = url), { ok: true, text: async () => "sku,name,price\nX,Thing,5\n" });
  const result = await loadFeed({ url: "https://cfg/feed.csv", format: "csv", fields: { handle: "sku", title: "name", price: "price" } }, { AFFILIATE_FEED_URL: "https://env/feed.csv" }, csv);
  assert.equal(asked, "https://env/feed.csv");
  assert.equal(result.products[0].variants[0].price, 5);
  const json = async () => ({ ok: true, text: async () => JSON.stringify({ products: [{ sku: "Y", name: "Json", price: 2 }] }) });
  assert.equal((await loadFeed({ url: "u", format: "json", fields: { handle: "sku", title: "name", price: "price" } }, {}, json)).products[0].handle, "y");
  await assert.rejects(loadFeed({ fields }, {}), /No feed URL/);
  await assert.rejects(loadFeed({ url: "u", fields }, {}, async () => ({ ok: false, status: 403 })), /403/);
});

const { loadApi } = require("../lib/feed");
const adapter = require("../lib/sources/example-adapter");

test("loadApi follows pages, reads nested paths and interpolates env into headers", async () => {
  const calls = [];
  const pages = {
    "https://api.test/p?x=1": { data: { items: [{ id: "a", title: "One", price: { amount: "5.00" }, images: [{ url: "https://i/1.jpg" }], links: { buy: "https://m/1" }, in_stock: true }], next: "https://api.test/p?page=2" } },
    "https://api.test/p?page=2": { data: { items: [{ id: "b", title: "Two", price: { amount: "7" }, in_stock: false }], next: null } },
  };
  const fetchImpl = async (url, init) => (calls.push([url, init.headers]), { ok: true, json: async () => pages[url] });
  const config = { url: "https://api.test/p?x=${ID}", headers: { Authorization: "Bearer ${TOKEN}" }, itemsPath: "data.items", nextPath: "data.next", fields: { handle: "id", title: "title", price: "price.amount", image: "images.0.url", affiliateUrl: "links.buy", available: "in_stock" } };
  const { products } = await loadApi(config, { ID: "1", TOKEN: "secret" }, fetchImpl);
  assert.deepEqual(products.map((p) => p.handle), ["a", "b"]);
  assert.equal(products[0].image, "https://i/1.jpg");
  assert.equal(products[0].variants[0].price, 5);
  assert.equal(products[1].variants[0].available, false);
  assert.equal(calls[0][1].Authorization, "Bearer secret");
  assert.equal(calls.length, 2);
});

test("loadApi fails loudly on missing env, bad status and wrong shape", async () => {
  const base = { url: "https://api.test", headers: { A: "${NOPE}" }, itemsPath: "items", fields: { title: "t" } };
  await assert.rejects(loadApi(base, {}, async () => ({})), /Missing environment variable NOPE/);
  await assert.rejects(loadApi({ ...base, headers: {} }, {}, async () => ({ ok: false, status: 401 })), /401/);
  await assert.rejects(loadApi({ ...base, headers: {} }, {}, async () => ({ ok: true, json: async () => ({ items: "x" }) })), /No product array/);
  await assert.rejects(loadApi({}, {}), /No API url/);
});

test("example adapter template maps items and runs end to end with stubbed fetch", async () => {
  assert.equal(adapter.mapItem({ id: 9, name: "N", price: "3.5", in_stock: false }).variants[0].available, false);
  const fetchImpl = async (url) => ({ ok: true, json: async () => (url === "tok" ? { access_token: "T" } : { items: [{ id: 1, name: "A", price: 2, category: "Bags" }] }) });
  const result = await adapter({ PRODUCT_API_TOKEN_URL: "tok", PRODUCT_API_URL: "items", PRODUCT_API_ID: "i", PRODUCT_API_SECRET: "s" }, fetchImpl);
  assert.equal(result.products[0].handle, "1");
  assert.deepEqual(result.collections.map((c) => c.handle), ["Bags"]);
});
