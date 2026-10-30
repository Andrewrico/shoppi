// Example checkout endpoint for provider "endpoint": turns { items: [{ id, quantity }] } into a Stripe Checkout Session.
// Prices are looked up on the server from the published catalog. The browser never sends a price, so it cannot change one.
//
// Wire it to your host (Netlify Function, Cloudflare Worker, Express, ...): see README.md in this folder.

const MAX_LINES = 50;
const MAX_QTY = 99;

function createHandler({ catalog, stripe, currency = "usd", successUrl, cancelUrl }) {
  return async function handle(body) {
    const items = body && Array.isArray(body.items) ? body.items : null;
    if (!items || !items.length || items.length > MAX_LINES) return { status: 400, body: { error: "Invalid cart." } };

    const line_items = [];
    for (const item of items) {
      const variant = catalog.variants[item && item.id];
      const quantity = Number(item && item.quantity);
      if (!variant || !variant.available) return { status: 409, body: { error: "An item is unavailable.", id: item && item.id } };
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) return { status: 400, body: { error: "Invalid quantity." } };
      line_items.push({
        quantity,
        price_data: {
          currency,
          unit_amount: variant.price,
          product_data: { name: variant.variantTitle && variant.variantTitle !== "Default" ? `${variant.title} (${variant.variantTitle})` : variant.title },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({ mode: "payment", line_items, success_url: successUrl, cancel_url: cancelUrl });
    return { status: 200, body: { url: session.url } };
  };
}

module.exports = { createHandler };
