const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeProduct, fromShopify, fetchShopify } = require("../lib/catalog");

const node = {
  handle: "tote", title: "Tote", description: "d", tags: ["a"],
  featuredImage: { url: "https://cdn.example/t.jpg", altText: "A tote" },
  collections: { nodes: [{ handle: "bags" }] },
  variants: { nodes: [
    { id: "gid://shopify/ProductVariant/42", title: "Natural", availableForSale: true, price: { amount: "28.00" }, compareAtPrice: null },
    { id: "gid://shopify/ProductVariant/43", title: "Black", availableForSale: false, price: { amount: "30.50" }, compareAtPrice: { amount: "35.00" } },
  ] },
};

test("normalizeProduct converts prices to cents and derives range and stock", () => {
  const product = normalizeProduct({ handle: "x", title: "X", variants: [{ id: 1, title: "A", price: 18.5 }, { id: 2, title: "B", price: 20, available: false }] });
  assert.deepEqual([product.priceMin, product.priceMax, product.available, product.url], [1850, 2000, true, "/products/x/"]);
  assert.equal(normalizeProduct({ handle: "y", title: "Y", price: 5, available: false }).available, false);
});

test("float prices round to exact cents", () => {
  assert.equal(normalizeProduct({ handle: "z", title: "Z", variants: [{ id: "1", price: 19.99 }] }).priceMin, 1999);
});

test("fromShopify maps a Storefront node", () => {
  const product = normalizeProduct(fromShopify(node));
  assert.equal(product.collection, "bags");
  assert.equal(product.variants[0].shopifyVariantId, "42");
  assert.equal(product.variants[1].compareAtPrice, 3500);
  assert.equal(product.variants[1].available, false);
  assert.equal(product.image, "https://cdn.example/t.jpg");
});

test("fetchShopify sends the token and surfaces errors", async () => {
  let seen;
  const ok = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ data: { products: { nodes: [node] }, collections: { nodes: [{ handle: "bags", title: "Bags", description: "" }] } } }) }; };
  const result = await fetchShopify("shop.myshopify.com", "tok", ok);
  assert.equal(result.products.length, 1);
  assert.match(seen.url, /^https:\/\/shop\.myshopify\.com\/api\/.*graphql\.json$/);
  assert.equal(seen.init.headers["X-Shopify-Storefront-Access-Token"], "tok");
  await assert.rejects(fetchShopify("s", "t", async () => ({ ok: false, status: 401 })), /401/);
});

test("images: uses the images list, falls back to image, and related stays in the collection", () => {
  const { relatedProducts } = require("../lib/catalog");
  const base = { handle: "a", title: "A", price: 1 };
  assert.deepEqual(normalizeProduct({ ...base, images: [{ src: "/1.svg", alt: "one" }, { src: "/2.svg" }] }).images, [{ src: "/1.svg", alt: "one" }, { src: "/2.svg", alt: "" }]);
  assert.equal(normalizeProduct({ ...base, images: [{ src: "/1.svg", alt: "one" }] }).image, "/1.svg");
  assert.deepEqual(normalizeProduct({ ...base, image: "/x.jpg", imageAlt: "x" }).images, [{ src: "/x.jpg", alt: "x" }]);
  assert.deepEqual(normalizeProduct(base).images, []);
  const products = [{ handle: "a", collection: "c" }, { handle: "b", collection: "c" }, { handle: "d", collection: "e" }, { handle: "f", collection: null }];
  assert.deepEqual(relatedProducts(products, products[0]).map((p) => p.handle), ["b"]);
  assert.deepEqual(relatedProducts(products, products[3]), []);
});

test("variant image is kept when set and null otherwise", () => {
  const product = normalizeProduct({ handle: "a", title: "A", variants: [{ id: "1", price: 1, image: "/1.svg" }, { id: "2", price: 1 }] });
  assert.equal(product.variants[0].image, "/1.svg");
  assert.equal(product.variants[1].image, null);
});
