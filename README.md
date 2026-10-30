# Shoppi

A headless ecommerce and affiliate starter for [Eleventy](https://www.11ty.dev/). Static pages, a product catalog (from JSON, Shopify, a network feed or any API), a browser cart, an affiliate mode, a built-in HTML chat and accessibility tools. No framework and no bundler; the only dependencies are Eleventy and its RSS plugin.

It combines two earlier projects: **Jam11ty** (the original name of this repo: an Eleventy starter theme with design tokens, navigation data, CMS config and a service worker) and the **Eleventify** theme behind andrewrico.com (accessibility widget, on-page chat, structured data, `llms.txt`), rebuilt around commerce. See [NOTICE.md](NOTICE.md).

**Built on this lineage:** [andrewrico.com](https://andrewrico.com) runs on the Eleventify theme that Shoppi descends from.

## What you get

| | |
|---|---|
| **Catalog** | Products and collections from JSON files, or from the Shopify Storefront API at build time. Product pages, collection pages, JSON-LD (`Product`, `FAQPage`), sitemap, `llms.txt`. |
| **Cart** | Runs in the browser, saved in `localStorage`, synced across tabs. Slide-in cart on the native `<dialog>` element plus a `/cart/` page. Prices and stock are refreshed from `/catalog.json`, so a stale cart cannot check out at an old price. |
| **Checkout** | Hands off to your provider: Shopify cart permalink, Stripe Payment Link, or your own endpoint (Stripe Checkout example included). Default is a safe `preview` mode. |
| **HTML chat** | Plain markup plus one small module. Answers only from your products, FAQs, policies and pages (`/knowledge.json`), can add single-option products to the cart, and hands off to a person. No AI service required; you can point it at your own `endpoint`. |
| **Accessibility** | Skip link, landmarks, keyboard-first controls, visible focus, 44px targets, live-region announcements, reduced-motion and forced-colors support. A user panel for contrast, dark and sepia themes, text size, line spacing, readable font, underlined links, reading guide and read-aloud. Automated axe-core and contrast checks. |
| **Affiliate mode** | Switch to outbound affiliate links with a disclosure banner, no cart and hidden prices. Catalog from a network feed, any JSON API, or your own adapter. See [docs/affiliate.md](docs/affiliate.md). |
| **Also** | Blog with RSS, offline shell service worker, web manifest, Decap CMS config, design tokens in one JSON file. |

## Quick start

Requires Node.js 20 or newer.

```sh
npm install
npm start          # http://localhost:8080 with live reload
npm run build      # static site in _site/
npm run verify     # build + unit tests + structure checks + axe-core
```

## Make it yours

| To change | Edit |
|---|---|
| Name, tagline, URL, email | `src/_data/site.json` |
| Currency, checkout provider, shipping note, policies, chat text | `src/_data/store.json` |
| Colors, fonts, layout width | `src/_data/tokens.json` |
| Products and collections | `src/_data/catalog/*.json`, or a feed, API or adapter (see [docs/catalog.md](docs/catalog.md), [docs/affiliate.md](docs/affiliate.md)) |
| Store or affiliate mode | `mode` in `src/_data/store.json` |
| Menus | `src/_data/navigation.json` |
| FAQs (feed the FAQ page, JSON-LD and the chat) | `src/_data/faqs.json` |

The shipped shipping and returns policies are placeholders that say so. The chat quotes them word for word, so write your real policies before launch.

## Checkout

Set `checkout.provider` in `src/_data/store.json`:

- `preview`: shows a message instead of paying (default).
- `shopify`: redirects to `https://<shop>/cart/<variantId>:<qty>,...`. Needs `shopifyVariantId` on each variant.
- `stripe-link`: one product at a time, using the variant's `stripePaymentLink`.
- `endpoint`: POSTs `{ items: [{ id, quantity }] }` to your function and redirects to the returned `url`. See [examples/checkout-endpoint](examples/checkout-endpoint) and [docs/checkout.md](docs/checkout.md).

The browser never sends prices. Any endpoint must look prices up on the server.

## Accessibility

Details and the manual test list are in [docs/accessibility.md](docs/accessibility.md). Automated checks cannot prove WCAG conformance: they cover structure, names, roles, headings, ids and color-token contrast, not real screen-reader or voice-control use. Test with people and assistive tech before you claim conformance.

## Project layout

```
src/_data/            site, store, tokens, navigation, faqs, catalog loader
src/_includes/        layout and snippets (header, cart dialog, chat, a11y widget)
src/assets/js/        cart-core, chat-core (pure, unit tested), cart, chat, a11y-widget
src/assets/css/       base, commerce, widgets
lib/catalog.js        product model and Shopify Storefront mapper
scripts/              check.js (structure), a11y.js (axe-core), e2e.mjs (optional browser test)
test/                 node:test unit tests
examples/             checkout endpoint (Stripe)
```

## Scripts

| Command | Does |
|---|---|
| `npm test` | Unit tests: cart math, chat answers, catalog mapping, checkout endpoint, color contrast |
| `npm run check` | Structure checks on the built site (lang, title, one h1, skip link, alt, ids, links, JSON-LD) |
| `npm run a11y` | axe-core over every built page (WCAG 2.0/2.1 A and AA, best practice) |
| `npm run verify:affiliate` | Builds affiliate mode and runs the structure and axe checks on it |
| `node scripts/e2e.mjs` | Optional real-browser test of cart, chat and accessibility panel (needs Playwright) |
| `node scripts/e2e-affiliate.mjs` | Same for affiliate mode (build it first, see the file header) |

## Author

<img src="docs/andrew-rico.png" alt="Andrew Rico" width="120" align="left" hspace="12">

Built by **Andrew Rico**, Shopify eCommerce architect. [andrewrico.com](https://andrewrico.com) runs on the Eleventify theme that Shoppi descends from.

<br clear="left">

## License

MIT. See [LICENSE](LICENSE).
