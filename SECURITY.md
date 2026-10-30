# Security policy

Please report vulnerabilities privately through GitHub's "Report a vulnerability" button on the repository's Security tab, not in a public issue.

Scope notes for users of this starter:

- The browser cart stores only variant ids, quantities and display data. Checkout code must look prices up on the server (see `docs/checkout.md`).
- Never put Stripe secret keys or Shopify Admin tokens in this repo or in browser code. Only a Shopify Storefront token (public, read-only) is used, at build time.
