// Product model shared by the build and the tests. Prices are integer minor units (cents).

const toCents = (value) => Math.round(Number(value) * 100);

function normalizeProduct(raw) {
  const variants = (raw.variants && raw.variants.length ? raw.variants : [{ id: raw.handle, title: "Default", price: raw.price, available: raw.available !== false }])
    .map((variant) => ({
      id: String(variant.id),
      title: variant.title || "Default",
      price: toCents(variant.price),
      compareAtPrice: variant.compareAtPrice ? toCents(variant.compareAtPrice) : null,
      available: variant.available !== false,
      shopifyVariantId: variant.shopifyVariantId ? String(variant.shopifyVariantId) : null,
      stripePaymentLink: variant.stripePaymentLink || null,
    }));
  const prices = variants.map((variant) => variant.price);
  return {
    handle: raw.handle,
    title: raw.title,
    description: raw.description || "",
    collection: raw.collection || null,
    tags: raw.tags || [],
    image: raw.image || null,
    imageAlt: raw.imageAlt || "",
    affiliateUrl: raw.affiliateUrl || null,
    variants,
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    available: variants.some((variant) => variant.available),
    url: `/products/${raw.handle}/`,
  };
}

// Storefront API GraphQL node -> raw product (see docs/catalog.md for the query).
function fromShopify(node) {
  const gid = (id) => String(id).split("/").pop();
  return {
    handle: node.handle,
    title: node.title,
    description: node.description,
    collection: node.collections && node.collections.nodes[0] ? node.collections.nodes[0].handle : null,
    tags: node.tags || [],
    image: node.featuredImage ? node.featuredImage.url : null,
    imageAlt: node.featuredImage && node.featuredImage.altText ? node.featuredImage.altText : "",
    variants: node.variants.nodes.map((variant) => ({
      id: gid(variant.id),
      title: variant.title,
      price: variant.price.amount,
      compareAtPrice: variant.compareAtPrice ? variant.compareAtPrice.amount : null,
      available: variant.availableForSale,
      shopifyVariantId: gid(variant.id),
    })),
  };
}

const SHOPIFY_QUERY = `{
  products(first: 100) { nodes {
    handle title description tags
    featuredImage { url altText }
    collections(first: 1) { nodes { handle } }
    variants(first: 50) { nodes { id title availableForSale price { amount } compareAtPrice { amount } } }
  } }
  collections(first: 50) { nodes { handle title description } }
}`;

async function fetchShopify(domain, token, fetchImpl = fetch) {
  const response = await fetchImpl(`https://${domain}/api/2025-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query: SHOPIFY_QUERY }),
  });
  if (!response.ok) throw new Error(`Shopify Storefront API returned ${response.status}`);
  const { data, errors } = await response.json();
  if (errors) throw new Error(`Shopify Storefront API error: ${JSON.stringify(errors)}`);
  return {
    products: data.products.nodes.map(fromShopify),
    collections: data.collections.nodes.map(({ handle, title, description }) => ({ handle, title, description })),
  };
}

module.exports = { normalizeProduct, fromShopify, fetchShopify, toCents };
