# Checkout providers

Configure in `src/_data/store.json` under `checkout`. The cart builds the hand-off in `src/assets/js/cart-core.mjs` (`checkoutRequest`), which is unit tested.

| Provider | Behaviour | Needs |
|---|---|---|
| `preview` | Shows "Preview mode" message. Nothing is charged. | nothing |
| `shopify` | Redirects to `https://<shopifyDomain>/cart/<variantId>:<qty>,...`; Shopify handles payment, tax and shipping. | `shopifyDomain`; `shopifyVariantId` on every variant |
| `stripe-link` | Redirects to the variant's Payment Link with `quantity`. One product per order. | `stripePaymentLink` on variants |
| `endpoint` | POSTs `{ items: [{ id, quantity }] }`, expects `{ url }`, redirects. | a server function; see `examples/checkout-endpoint` |

## Rules for any endpoint

1. Never accept a price from the browser. Look it up by variant id from `catalog.json`.
2. Reject unknown or sold-out ids and cap quantities.
3. Keep secret keys in server environment variables only.
4. Confirm orders with provider webhooks, not with the success redirect.
