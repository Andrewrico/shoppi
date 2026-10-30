const test = require("node:test");
const assert = require("node:assert/strict");
const { createHandler } = require("../examples/checkout-endpoint/handler");

const catalog = { variants: {
  tote: { title: "Tote", variantTitle: "Natural", price: 2800, available: true },
  mug: { title: "Mug", variantTitle: "Default", price: 1850, available: true },
  throw: { title: "Throw", variantTitle: "Default", price: 12000, available: false },
} };
const make = () => {
  const calls = [];
  const stripe = { checkout: { sessions: { create: async (args) => (calls.push(args), { url: "https://checkout.stripe.com/c/pay/x" }) } } };
  return { calls, handle: createHandler({ catalog, stripe, successUrl: "https://s/ok", cancelUrl: "https://s/cart" }) };
};

test("builds line items from server-side prices", async () => {
  const { calls, handle } = make();
  const result = await handle({ items: [{ id: "tote", quantity: 2 }, { id: "mug", quantity: 1, price: 1 }] });
  assert.equal(result.status, 200);
  assert.equal(result.body.url, "https://checkout.stripe.com/c/pay/x");
  assert.deepEqual(calls[0].line_items.map((l) => [l.price_data.unit_amount, l.quantity]), [[2800, 2], [1850, 1]]);
  assert.equal(calls[0].line_items[0].price_data.product_data.name, "Tote (Natural)");
});

test("rejects unknown, sold-out, malformed and oversized carts", async () => {
  const { calls, handle } = make();
  assert.equal((await handle({ items: [{ id: "nope", quantity: 1 }] })).status, 409);
  assert.equal((await handle({ items: [{ id: "throw", quantity: 1 }] })).status, 409);
  assert.equal((await handle({ items: [{ id: "mug", quantity: 0 }] })).status, 400);
  assert.equal((await handle({ items: [{ id: "mug", quantity: 1.5 }] })).status, 400);
  assert.equal((await handle({ items: [{ id: "mug", quantity: 100 }] })).status, 400);
  assert.equal((await handle({ items: [] })).status, 400);
  assert.equal((await handle(null)).status, 400);
  assert.equal(calls.length, 0);
});
