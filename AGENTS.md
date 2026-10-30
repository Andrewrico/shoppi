# AGENTS.md

Guide for AI coding agents working in this repo.

- Run `npm run verify` before reporting work done. It builds, runs unit tests, structure checks and axe-core.
- Stack: Eleventy 3 (Nunjucks, CommonJS config), plain ES modules in `src/assets/js/*.mjs`, no bundler.
- Pure logic lives in `src/assets/js/cart-core.mjs`, `chat-core.mjs` and `lib/catalog.js`; test it in `test/`.
- Prices are integer cents everywhere after `lib/catalog.js`. Never trust a price from the browser in checkout code.
- The chat may only say what `/knowledge.json` contains. Do not add invented facts, reviews or policies.
- UI changes must stay keyboard-operable and announce changes in a live region.
- Do not add runtime dependencies without a strong reason.
