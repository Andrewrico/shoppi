# Checkout endpoint example (Stripe)

`handler.js` is host-agnostic and tested (`npm test`). `netlify-function.js` shows one way to expose it.

1. `npm install stripe` in the project that hosts the function.
2. Set `STRIPE_SECRET_KEY` as a server-side environment variable. Never put it in the repo or the browser.
3. In `src/_data/store.json` set `checkout.provider` to `"endpoint"` and `checkout.endpoint` to the function URL.

Security notes: the endpoint trusts only variant ids and quantities; it takes prices from `catalog.json`, rejects sold-out items, and caps quantity. Add rate limiting and webhook order handling for production. This example was tested against a stubbed Stripe client, not a live Stripe account.
