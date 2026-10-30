// Pure cart logic: no DOM, no storage. Imported by cart.mjs in the browser and by the tests in Node.
// A line is { id, handle, title, variantTitle, price, image, qty }; price is integer cents.

export const MAX_QTY = 99;

const clampQty = (qty) => Math.max(0, Math.min(MAX_QTY, Math.floor(Number(qty) || 0)));

export function parseLines(json) {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data
      .filter((line) => line && typeof line.id === "string" && Number.isFinite(line.price))
      .map((line) => ({ ...line, qty: clampQty(line.qty) }))
      .filter((line) => line.qty > 0);
  } catch {
    return [];
  }
}

export function addLine(lines, item, qty = 1) {
  const existing = lines.find((line) => line.id === item.id);
  if (existing) return lines.map((line) => (line === existing ? { ...line, qty: clampQty(line.qty + qty) } : line));
  return [...lines, { ...item, qty: clampQty(qty) }].filter((line) => line.qty > 0);
}

export function setQty(lines, id, qty) {
  return lines.map((line) => (line.id === id ? { ...line, qty: clampQty(qty) } : line)).filter((line) => line.qty > 0);
}

export const removeLine = (lines, id) => lines.filter((line) => line.id !== id);

export function totals(lines) {
  return {
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    subtotal: lines.reduce((sum, line) => sum + line.price * line.qty, 0),
  };
}

// Refresh stored lines against the published catalog (variants keyed by id).
// Prices come from the catalog, sold-out and removed variants are dropped; returns what changed so the UI can say so.
export function reconcile(lines, variants) {
  const kept = [];
  const changes = [];
  for (const line of lines) {
    const current = variants[line.id];
    if (!current || !current.available) {
      changes.push({ id: line.id, title: line.title, kind: "removed" });
      continue;
    }
    if (current.price !== line.price) changes.push({ id: line.id, title: line.title, kind: "price", from: line.price, to: current.price });
    kept.push({ ...line, price: current.price, title: current.title, variantTitle: current.variantTitle, image: current.image });
  }
  return { lines: kept, changes };
}

// Build the checkout hand-off for a provider. Returns { type: "redirect", url } | { type: "post", body } | { type: "preview" } | { type: "error", message }.
export function checkoutRequest(lines, config, variants = {}) {
  if (!lines.length) return { type: "error", message: "Your cart is empty." };
  switch (config.provider) {
    case "shopify": {
      const parts = lines.map((line) => `${variants[line.id]?.shopifyVariantId}:${line.qty}`);
      if (parts.some((part) => part.startsWith("undefined") || part.startsWith("null"))) {
        return { type: "error", message: "An item in your cart cannot be checked out. Please remove it and try again." };
      }
      return { type: "redirect", url: `https://${config.shopifyDomain}/cart/${parts.join(",")}` };
    }
    case "stripe-link": {
      const link = lines.length === 1 ? variants[lines[0].id]?.stripePaymentLink : null;
      if (!link) return { type: "error", message: "This checkout supports one product at a time. Please check out items separately." };
      const url = new URL(link);
      url.searchParams.set("quantity", String(lines[0].qty));
      return { type: "redirect", url: url.toString() };
    }
    case "endpoint":
      return { type: "post", url: config.endpoint, body: { items: lines.map((line) => ({ id: line.id, quantity: line.qty })) } };
    default:
      return { type: "preview" };
  }
}

export function formatMoney(cents, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format((cents || 0) / 100);
}
