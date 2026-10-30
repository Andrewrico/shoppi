const fs = require("fs");
const path = require("path");
const store = require("./store.json");
const { normalizeProduct, fetchShopify } = require("../../lib/catalog");
const { loadFeed, loadApi } = require("../../lib/feed");

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, "catalog", file), "utf8"));
const local = () => ({ products: readJson("products.json"), collections: readJson("collections.json") });

// Where the catalog comes from: local JSON, Shopify, a network feed, a JSON API, or your own adapter (docs/catalog.md, docs/affiliate.md).
async function load() {
  const { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } = process.env;
  switch (store.catalog.source) {
    case "shopify":
      if (SHOPIFY_STORE_DOMAIN && SHOPIFY_STOREFRONT_TOKEN) return fetchShopify(SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN);
      console.warn("[catalog] Shopify credentials missing, using local catalog.");
      return local();
    case "feed":
      return loadFeed(store.catalog.feed);
    case "api":
      return loadApi(store.catalog.api);
    case "custom":
      // Your own adapter: a module exporting async (env) => ({ products, collections }). Start from lib/sources/example-adapter.js.
      return require(path.join(__dirname, "../..", store.catalog.custom))(process.env);
    default:
      return local();
  }
}

module.exports = async function () {
  const raw = await load();
  const products = raw.products.map(normalizeProduct);
  const collections = raw.collections.map((collection) => ({
    ...collection,
    url: `/collections/${collection.handle}/`,
    products: products.filter((product) => product.collection === collection.handle),
  }));
  // Flat list for templates that need every variant (catalog.json).
  const variants = products.flatMap((product) => product.variants.map((variant) => ({ ...variant, product })));
  return { products, collections, variants };
};
