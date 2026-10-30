import test from "node:test";
import assert from "node:assert/strict";
import { addLine, setQty, removeLine, totals, reconcile, checkoutRequest, parseLines, MAX_QTY } from "../src/assets/js/cart-core.mjs";

const tote = { id: "tote-1", handle: "tote", title: "Tote", variantTitle: "Natural", price: 2800, image: null };
const mug = { id: "mug-1", handle: "mug", title: "Mug", variantTitle: "Default", price: 1850, image: null };

test("addLine merges the same variant and caps quantity", () => {
  let lines = addLine([], tote, 1);
  lines = addLine(lines, tote, 2);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].qty, 3);
  assert.equal(addLine([], tote, 500)[0].qty, MAX_QTY);
});

test("setQty to zero removes the line; bad input is clamped", () => {
  const lines = addLine(addLine([], tote), mug);
  assert.deepEqual(setQty(lines, "tote-1", 0).map((l) => l.id), ["mug-1"]);
  assert.equal(setQty(lines, "mug-1", "abc").length, 1);
  assert.equal(setQty(lines, "mug-1", -4).length, 1);
  assert.equal(removeLine(lines, "mug-1").length, 1);
});

test("totals sums integer cents", () => {
  const lines = addLine(addLine([], tote, 2), mug, 1);
  assert.deepEqual(totals(lines), { count: 3, subtotal: 2 * 2800 + 1850 });
});

test("parseLines survives corrupt storage", () => {
  assert.deepEqual(parseLines("not json"), []);
  assert.deepEqual(parseLines('{"a":1}'), []);
  assert.deepEqual(parseLines('[{"id":"x","price":100,"qty":2},{"id":5},null,{"id":"y","price":1,"qty":0}]').map((l) => l.id), ["x"]);
});

test("reconcile refreshes prices and drops sold-out or missing items", () => {
  const lines = addLine(addLine(addLine([], tote), mug), { ...tote, id: "gone" });
  const catalog = {
    "tote-1": { title: "Tote", variantTitle: "Natural", price: 3000, available: true, image: null },
    "mug-1": { title: "Mug", variantTitle: "Default", price: 1850, available: false, image: null },
  };
  const result = reconcile(lines, catalog);
  assert.deepEqual(result.lines.map((l) => [l.id, l.price]), [["tote-1", 3000]]);
  assert.deepEqual(result.changes.map((c) => c.kind).sort(), ["price", "removed", "removed"]);
});

test("checkout: shopify permalink", () => {
  const lines = addLine(addLine([], tote, 2), mug);
  const variants = { "tote-1": { shopifyVariantId: "111" }, "mug-1": { shopifyVariantId: "222" } };
  const request = checkoutRequest(lines, { provider: "shopify", shopifyDomain: "shop.myshopify.com" }, variants);
  assert.deepEqual(request, { type: "redirect", url: "https://shop.myshopify.com/cart/111:2,222:1" });
  assert.equal(checkoutRequest(lines, { provider: "shopify", shopifyDomain: "x" }, {}).type, "error");
});

test("checkout: stripe link supports one product only", () => {
  const variants = { "tote-1": { stripePaymentLink: "https://buy.stripe.com/abc" }, "mug-1": {} };
  const one = checkoutRequest(addLine([], tote, 3), { provider: "stripe-link" }, variants);
  assert.equal(one.url, "https://buy.stripe.com/abc?quantity=3");
  assert.equal(checkoutRequest(addLine(addLine([], tote), mug), { provider: "stripe-link" }, variants).type, "error");
});

test("checkout: endpoint sends ids and quantities only, never prices", () => {
  const request = checkoutRequest(addLine([], tote, 2), { provider: "endpoint", endpoint: "/api/checkout" });
  assert.deepEqual(request, { type: "post", url: "/api/checkout", body: { items: [{ id: "tote-1", quantity: 2 }] } });
});

test("checkout: empty cart errors, default is preview", () => {
  assert.equal(checkoutRequest([], { provider: "shopify" }).type, "error");
  assert.equal(checkoutRequest(addLine([], tote), { provider: "preview" }).type, "preview");
});
