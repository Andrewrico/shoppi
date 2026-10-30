# Contributing

Issues and pull requests are welcome.

1. `npm install`, then `npm run verify` before you push. It must pass.
2. Keep it dependency-light: no frameworks, no bundler. Browser code is plain ES modules.
3. Logic that can be pure goes in `cart-core.mjs` / `chat-core.mjs` / `lib/` with a test.
4. Any UI change needs keyboard and screen-reader behaviour described in the PR, and `npm run a11y` clean.
5. Never invent store facts (prices, policies, reviews) in sample data; mark placeholders as placeholders.
