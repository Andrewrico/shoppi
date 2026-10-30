const fs = require("fs");
const path = require("path");
const store = require("./store.json");
const { normalizeProduct, fetchShopify } = require("../../lib/catalog");

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, "catalog", file), "utf8"));

module.exports = async function () {
  let raw;
  const { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } = process.env;
  if (store.catalog.source === "shopify" && SHOPIFY_STORE_DOMAIN && SHOPIFY_STOREFRONT_TOKEN) {
    raw = await fetchShopify(SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN);
  } else {
    if (store.catalog.source === "shopify") console.warn("[catalog] Shopify credentials missing, using local catalog.");
    raw = { products: readJson("products.json"), collections: readJson("collections.json") };
  }

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
