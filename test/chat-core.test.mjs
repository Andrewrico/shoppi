import test from "node:test";
import assert from "node:assert/strict";
import { answer, tokenize } from "../src/assets/js/chat-core.mjs";

const kb = [
  { kind: "product", title: "Canvas Tote", url: "/products/canvas-tote/", text: "A sturdy everyday tote.", tags: ["bag"], available: true, priceLabel: "$28.00", variants: [{ id: "a" }, { id: "b" }] },
  { kind: "product", title: "Ceramic Mug", url: "/products/ceramic-mug/", text: "Hand-glazed.", tags: ["kitchen"], available: true, priceLabel: "$18.50", variants: [{ id: "mug" }] },
  { kind: "product", title: "Linen Throw", url: "/products/linen-throw/", text: "Soft blanket.", tags: [], available: false, priceLabel: "$120.00", variants: [{ id: "throw" }] },
  { kind: "policy", title: "Returns", url: "/faqs/", text: "Returns accepted within 30 days." },
  { kind: "faq", title: "Is the store accessible?", url: "/faqs/", text: "Yes, with keyboard support." },
  { kind: "page", title: "About", url: "/about/", text: "Our story and values." },
];

test("tokenize drops stop words and stems plurals", () => {
  assert.deepEqual(tokenize("Do you have the totes?"), ["tote"]);
});

test("product search returns cards", () => {
  const reply = answer(kb, "do you have a tote bag");
  assert.equal(reply.cards[0].title, "Canvas Tote");
});

test("policy question answers with the stored policy text only", () => {
  const reply = answer(kb, "what is your returns policy");
  assert.equal(reply.text, "Returns accepted within 30 days.");
});

test("add to cart for a single-variant product emits an add action", () => {
  const reply = answer(kb, "please add the mug to my cart");
  assert.deepEqual(reply.actions, [{ type: "add", variantId: "mug" }]);
});

test("multi-variant products are not added blindly; sold out is stated", () => {
  assert.equal(answer(kb, "buy the tote").actions, undefined);
  assert.match(answer(kb, "add the linen throw").text, /sold out/);
});

test("cart intent reflects the count", () => {
  assert.match(answer(kb, "show my cart", { cartCount: 2 }).text, /2 items/);
  assert.match(answer(kb, "show my cart", { cartCount: 0 }).text, /empty/);
});

test("unknown questions never invent an answer and offer a human", () => {
  const reply = answer(kb, "do you ship to mars");
  assert.match(reply.text, /do not have an answer/);
  assert.equal(reply.actions[0].type, "handoff");
});

test("page fallback and empty input", () => {
  assert.equal(answer(kb, "your story and values").links[0].url, "/about/");
  assert.match(answer(kb, "  ").text, /Ask me/);
});
