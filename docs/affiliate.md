# Affiliate mode and API sources

Shoppi can run as a normal store (own cart and checkout) or as an **affiliate site** that sends visitors to a merchant. Set `"mode": "affiliate"` in `src/_data/store.json` (or build once with `SHOPPI_MODE=affiliate`).

## What affiliate mode changes

| | store mode | affiliate mode |
|---|---|---|
| Product button | Add to cart | **View on {merchant}** (outbound link) |
| Cart, cart page, checkout | yes | removed (no `/cart/`, no cart UI) |
| Prices | shown | **hidden by default** (`affiliate.showPrices`) |
| Links | internal | `rel="sponsored nofollow noopener"`, `target="_blank"`, screen-reader text "affiliate link, opens in a new tab" |
| Disclosure | none | banner on every page, on product pages and in the footer |
| JSON-LD | `Product` + `Offer` | `Product` only (price and stock belong to the merchant) |
| Chat | adds to cart | links to the merchant, explains there is no cart, quotes the disclosure |

`npm run verify` builds both modes and checks each (disclosure on every page, no cart markup, safe link attributes, axe).

## Configure

```jsonc
// src/_data/store.json
"affiliate": {
  "merchantLabel": "Amazon",          // "View on Amazon"
  "buttonLabel": "View on {merchant}",
  "showPrices": false,
  "amazonTag": "yourtag-20",          // added as ?tag= to amazon.* links that have none
  "linkTemplate": null,               // network redirect, e.g. "https://track.example/click?id=1&u={url}"
  "disclosure": "..."                 // YOUR required wording
}
```

Per product, set `affiliateUrl` (in the JSON catalog, or mapped from a feed or API). Plain links, `amazonTag` and `linkTemplate` all go through `lib/affiliate.js`.

**The disclosure text ships as a placeholder on purpose.** What you must say depends on the program and your country (FTC rules in the US; Amazon Associates requires its own statement). Read your program's current agreement and write the wording yourself.

## Prices and freshness

Many programs restrict showing prices that are stale or cached. That is why prices are off by default. If you turn them on, get them from a live source (rebuild on a schedule or use the program's API) and check the program's terms. Re-check the rules yourself: they change, and this repo does not verify compliance.

## Catalog sources

Set `catalog.source` in `store.json`:

| Source | Use |
|---|---|
| `local` | `src/_data/catalog/*.json` |
| `shopify` | Storefront API at build time |
| `feed` | A network's CSV or JSON product feed. Map your feed's column names in `catalog.feed.fields`; URL from `catalog.feed.url` or `AFFILIATE_FEED_URL` |
| `api` | Any JSON API with a URL, headers, a path to the items and a field map. `${VAR}` in `url` and `headers` comes from the environment; `nextPath` follows pagination |
| `custom` | Your own module. Copy `lib/sources/example-adapter.js` (OAuth, request signing, POST bodies, one request per product) |

```jsonc
"catalog": {
  "source": "api",
  "api": {
    "url": "https://api.example.com/v1/products?limit=100",
    "headers": { "Authorization": "Bearer ${PRODUCT_API_TOKEN}" },
    "itemsPath": "data.items",
    "nextPath": "data.next",
    "fields": { "handle": "id", "title": "title", "price": "price.amount", "image": "images.0.url", "affiliateUrl": "links.buy" }
  }
}
```

```sh
PRODUCT_API_TOKEN=... npm run build
```

Secrets stay in the build environment, never in the browser or in `store.json`.

### Amazon

Amazon's older Product Advertising API is deprecated in favor of the Creators API (OAuth 2.0). This repo does **not** ship an Amazon adapter, because the details could not be verified against Amazon's current documentation. Use the `custom` source and `example-adapter.js` as the starting point, and follow Amazon's current docs and Associates terms. Plain `?tag=` links work without any API.

## Keep it fresh

The catalog is fetched when the site builds. To refresh prices and stock, rebuild on a schedule: most hosts offer a build hook you can call from a cron job or a scheduled GitHub Actions workflow.

## Tested here

Link building, feed and API parsing (CSV quirks, pagination, nested paths, env interpolation, error cases), the example adapter with a stubbed API, and affiliate-mode pages in a real browser. Not tested: any live network, affiliate program or Amazon account.
