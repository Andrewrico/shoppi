import test from "node:test";
import assert from "node:assert/strict";
import { matchesQuery, timeLeft, formatTimeLeft, filterItems, sortItems, toCents, toggleHandle, parseHandles } from "../src/assets/js/storefront-core.mjs";

test("matchesQuery needs every word, ignoring case and order", () => {
  assert.equal(matchesQuery("Canvas Tote bags", "tote CANVAS"), true);
  assert.equal(matchesQuery("Canvas Tote bags", "tote leather"), false);
});

test("matchesQuery treats an empty query as a match and survives missing text", () => {
  assert.equal(matchesQuery("Anything", "   "), true);
  assert.equal(matchesQuery(undefined, "tote"), false);
});

test("timeLeft splits the remainder into units", () => {
  const ms = (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
  assert.deepEqual(timeLeft(ms, 0), { days: 2, hours: 3, minutes: 4, seconds: 5 });
});

test("timeLeft is null at or after the end, and for an invalid date", () => {
  assert.equal(timeLeft(1000, 1000), null);
  assert.equal(timeLeft(1000, 5000), null);
  assert.equal(timeLeft(NaN, 0), null);
});

test("formatTimeLeft pads everything except days", () => {
  assert.equal(formatTimeLeft({ days: 12, hours: 3, minutes: 4, seconds: 5 }), "12d 03h 04m 05s");
});

const items = [
  { text: "Tote bag", title: "Tote", collection: "bags", price: 2800, available: true, order: 1 },
  { text: "Mug", title: "Mug", collection: "home", price: 1850, available: true, order: 2 },
  { text: "Throw", title: "Throw", collection: "home", price: 12000, available: false, order: 3 },
];
const titles = (list) => list.map((item) => item.title);

test("filterItems combines query, collection, stock and price", () => {
  assert.deepEqual(titles(filterItems(items, { collections: ["home"], inStock: true })), ["Mug"]);
  assert.deepEqual(titles(filterItems(items, { min: 2000, max: 20000 })), ["Tote", "Throw"]);
  assert.deepEqual(titles(filterItems(items, { query: "tote", collections: ["home"] })), []);
});

test("sortItems orders by price and name, and featured keeps catalog order", () => {
  assert.deepEqual(titles(sortItems(items, "price-asc")), ["Mug", "Tote", "Throw"]);
  assert.deepEqual(titles(sortItems(items, "price-desc")), ["Throw", "Tote", "Mug"]);
  assert.deepEqual(titles(sortItems(items, "title-asc")), ["Mug", "Throw", "Tote"]);
  assert.deepEqual(titles(sortItems([...items].reverse(), "featured")), ["Tote", "Mug", "Throw"]);
});

test("toCents reads dollars and treats blank or invalid as no limit", () => {
  assert.equal(toCents("18.5"), 1850);
  assert.equal(toCents(""), null);
  assert.equal(toCents("abc"), null);
  assert.equal(toCents("-1"), null);
});

test("toggleHandle adds, removes and respects the limit", () => {
  assert.deepEqual(toggleHandle([], "a"), { list: ["a"], added: true, full: false });
  assert.deepEqual(toggleHandle(["a"], "a"), { list: [], added: false, full: false });
  assert.deepEqual(toggleHandle(["a"], "b", 1), { list: ["a"], added: false, full: true });
});

test("parseHandles survives bad storage", () => {
  assert.deepEqual(parseHandles('["a", 1]'), ["a"]);
  assert.deepEqual(parseHandles("nope"), []);
  assert.deepEqual(parseHandles(null), []);
});
