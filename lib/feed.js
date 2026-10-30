// Product feed adapter: turns an affiliate network's CSV or JSON feed into raw products for normalizeProduct.
// Field names differ by network, so store.json maps them: { handle, title, description, price, image, affiliateUrl, category, available }.

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  const [header = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((name, index) => [name.trim(), values[index] ?? ""])));
}

// "a.b.c" reads nested JSON; plain names read CSV columns.
const get = (row, path) => (path ? String(path).split(".").reduce((value, key) => (value == null ? undefined : value[key]), row) : undefined);

const slugify = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toPrice = (value) => {
  const number = parseFloat(String(value).replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
};
const isAvailable = (value) => !/^(0|false|no|out ?of ?stock|sold ?out)$/i.test(String(value ?? "").trim());

function mapFeed(rows, fields) {
  const seen = new Set();
  const products = [];
  const collections = new Map();
  for (const row of rows) {
    const title = get(row, fields.title);
    if (!title) continue;
    let handle = slugify(get(row, fields.handle) || title);
    if (!handle) continue;
    while (seen.has(handle)) handle += "-2";
    seen.add(handle);
    const category = get(row, fields.category) || "";
    const collection = category ? slugify(category) : null;
    if (collection && !collections.has(collection)) collections.set(collection, { handle: collection, title: category, description: "" });
    products.push({
      handle,
      title,
      description: get(row, fields.description) || "",
      collection,
      image: get(row, fields.image) || null,
      imageAlt: title,
      affiliateUrl: get(row, fields.affiliateUrl) || null,
      variants: [{ id: handle, title: "Default", price: toPrice(get(row, fields.price)), available: fields.available ? isAvailable(get(row, fields.available)) : true }],
    });
  }
  return { products, collections: [...collections.values()] };
}

async function loadFeed(config, env = process.env, fetchImpl = fetch) {
  const url = env.AFFILIATE_FEED_URL || config.url;
  if (!url) throw new Error("No feed URL: set catalog.feed.url in store.json or the AFFILIATE_FEED_URL environment variable.");
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Feed returned ${response.status}`);
  const text = await response.text();
  const rows = config.format === "json" ? JSON.parse(text) : parseCsv(text);
  return mapFeed(Array.isArray(rows) ? rows : rows.products || [], config.fields);
}

// ${VAR} in config strings is replaced from the environment, so tokens never live in store.json.
const interpolate = (value, env) =>
  String(value).replace(/\$\{(\w+)\}/g, (_, name) => {
    if (env[name] === undefined) throw new Error(`Missing environment variable ${name}`);
    return env[name];
  });

// Generic JSON API source. Config: { url, method, headers, body, itemsPath, nextPath, maxPages, fields }.
// itemsPath: where the product array lives in the response ("" = the response itself).
// nextPath : where the next page URL lives in the response (omit for single-page APIs).
async function loadApi(config, env = process.env, fetchImpl = fetch) {
  if (!config.url) throw new Error("No API url: set catalog.api.url in store.json.");
  const headers = Object.fromEntries(Object.entries(config.headers || {}).map(([name, value]) => [name, interpolate(value, env)]));
  const rows = [];
  let url = interpolate(config.url, env);
  for (let page = 0; url && page < (config.maxPages || 20); page += 1) {
    const response = await fetchImpl(url, { method: config.method || "GET", headers, body: config.body ? JSON.stringify(config.body) : undefined });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    const items = config.itemsPath ? get(data, config.itemsPath) : data;
    if (!Array.isArray(items)) throw new Error(`No product array at "${config.itemsPath}" in the API response.`);
    rows.push(...items);
    url = config.nextPath ? get(data, config.nextPath) : null;
  }
  return mapFeed(rows, config.fields);
}

module.exports = { parseCsv, mapFeed, loadFeed, loadApi, slugify };
