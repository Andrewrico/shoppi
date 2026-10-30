# Catalog

## Local JSON (default)

`src/_data/catalog/products.json` is a list of products. Prices are decimals in the file and integer cents everywhere else.

```json
{
  "handle": "canvas-tote",
  "title": "Canvas Tote",
  "description": "A sturdy everyday tote.",
  "collection": "bags",
  "tags": ["tote"],
  "image": "/assets/images/tote.jpg",
  "imageAlt": "Natural canvas tote bag on a hook",
  "variants": [
    { "id": "canvas-tote-natural", "title": "Natural", "price": 28.0, "available": true, "shopifyVariantId": "1000000001" }
  ]
}
```

- `id` must be unique across the whole catalog; the cart stores it.
- A product with no `image` gets a placeholder. When you add one, write real `imageAlt` text.
- `compareAtPrice` shows a struck-through price. `available: false` shows "Sold out" and hides the add button.
- Collections live in `collections.json`; a product joins one by `collection`.

## Shopify Storefront API

Set `catalog.source` to `"shopify"` in `src/_data/store.json`, then provide credentials at build time:

```sh
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com SHOPIFY_STOREFRONT_TOKEN=... npm run build
```

Use a Storefront token (public, read-only), not an Admin token. The query and mapping are in `lib/catalog.js` (`fetchShopify`, `fromShopify`) and are unit tested against a sample response. It has not been run against a live store in this repo, so try it on a development store first. If credentials are missing the build warns and uses the local files.

Rebuild when the catalog changes (a webhook that triggers your host's build hook works well). The cart re-checks prices and stock from the published `/catalog.json` each visit.

## Feeds, APIs and custom adapters

A network CSV/JSON feed, any JSON API, or your own adapter module can also be the catalog source. See [affiliate.md](affiliate.md#catalog-sources).
