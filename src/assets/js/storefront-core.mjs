// Pure storefront logic, tested in test/storefront-core.test.mjs.

/** True when every word of the query appears in the text, ignoring case. An empty query matches everything. */
export function matchesQuery(text, query) {
  const haystack = String(text || "").toLowerCase();
  return String(query || "").toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

/** Whole days, hours, minutes and seconds until endMs, or null once it has passed or if endMs is not a number. */
export function timeLeft(endMs, nowMs) {
  const seconds = Math.floor((endMs - nowMs) / 1000);
  if (!(seconds > 0)) return null;
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
}

export function formatTimeLeft({ days, hours, minutes, seconds }) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/** Listing filters. Items: { text, collection, price (cents or undefined), available }. */
export function filterItems(items, { query = "", collections = [], min = null, max = null, inStock = false } = {}) {
  return items.filter((item) => {
    if (!matchesQuery(item.text, query)) return false;
    if (inStock && !item.available) return false;
    if (collections.length && !collections.includes(item.collection)) return false;
    if (min !== null && !(item.price >= min)) return false;
    if (max !== null && !(item.price <= max)) return false;
    return true;
  });
}

/** Returns a sorted copy. Ties and "featured" keep the catalog order. */
export function sortItems(items, key) {
  const byOrder = (a, b) => a.order - b.order;
  const compare = {
    "price-asc": (a, b) => a.price - b.price || byOrder(a, b),
    "price-desc": (a, b) => b.price - a.price || byOrder(a, b),
    "title-asc": (a, b) => a.title.localeCompare(b.title) || byOrder(a, b),
  }[key] || byOrder;
  return [...items].sort(compare);
}

/** Text from a price input to integer cents; blank or invalid means no limit. */
export function toCents(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
}

/** Add or remove a handle. A full list is left unchanged and reported with full: true. */
export function toggleHandle(list, handle, limit = Infinity) {
  if (list.includes(handle)) return { list: list.filter((item) => item !== handle), added: false, full: false };
  if (list.length >= limit) return { list, added: false, full: true };
  return { list: [...list, handle], added: true, full: false };
}

/** Saved list from storage text; anything malformed becomes an empty list. */
export function parseHandles(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
