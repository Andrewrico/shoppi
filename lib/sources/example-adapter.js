// TEMPLATE for a custom catalog source. Copy this file, point store.json -> catalog.custom at your copy,
// and set catalog.source to "custom".
//
// Contract: export an async function (env) => ({ products, collections }).
//   products   : raw products as in src/_data/catalog/products.json (prices as decimals; normalizeProduct runs afterwards)
//   collections: [{ handle, title, description }]
//
// Use this when an API needs more than a URL and a header: OAuth token exchange, request signing, POST bodies,
// or one request per product. Do the auth here, with secrets from `env`, never hard-coded.
//
// This example is a skeleton against an invented API. It has not been run against any real service,
// including Amazon: check the provider's current docs for endpoints, auth and what you may display or cache.

// Pure mapper: one API item -> one raw product. Keep it separate so it can be tested.
function mapItem(item) {
  return {
    handle: String(item.id),
    title: item.name,
    description: item.description || "",
    collection: item.category || null,
    image: item.image_url || null,
    imageAlt: item.name,
    affiliateUrl: item.detail_url || null,
    variants: [{ id: String(item.id), title: "Default", price: Number(item.price), available: item.in_stock !== false }],
  };
}

module.exports = async function load(env = process.env, fetchImpl = fetch) {
  // 1. Authenticate (replace with your provider's flow).
  const tokenResponse = await fetchImpl(env.PRODUCT_API_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.PRODUCT_API_ID, client_secret: env.PRODUCT_API_SECRET }),
  });
  if (!tokenResponse.ok) throw new Error(`Token request failed: ${tokenResponse.status}`);
  const { access_token: token } = await tokenResponse.json();

  // 2. Fetch products.
  const response = await fetchImpl(env.PRODUCT_API_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Product request failed: ${response.status}`);
  const { items } = await response.json();

  // 3. Map.
  const products = items.map(mapItem);
  const names = [...new Set(products.map((product) => product.collection).filter(Boolean))];
  return { products, collections: names.map((handle) => ({ handle, title: handle, description: "" })) };
};

module.exports.mapItem = mapItem;
