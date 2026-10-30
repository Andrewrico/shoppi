// Netlify Function wrapper. Save as netlify/functions/checkout.js and set STRIPE_SECRET_KEY in your host's environment.
// Then in src/_data/store.json: "provider": "endpoint", "endpoint": "/.netlify/functions/checkout".
const Stripe = require("stripe");
const { createHandler } = require("./handler");

const site = process.env.URL || "http://localhost:8888";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };
  // The catalog is the file this site publishes, so server and storefront always agree.
  const catalog = await fetch(`${site}/catalog.json`).then((r) => r.json());
  const handle = createHandler({
    catalog,
    stripe: new Stripe(process.env.STRIPE_SECRET_KEY),
    currency: "usd",
    successUrl: `${site}/?order=success`,
    cancelUrl: `${site}/cart/`,
  });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = null; }
  const result = await handle(body);
  return { statusCode: result.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.body) };
};
