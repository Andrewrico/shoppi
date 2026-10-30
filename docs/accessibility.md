# Accessibility

## Built in

- **Structure**: `lang`, unique titles, one `h1` per page, landmarks (`header`, `nav` with labels, `main`, `footer`), skip link.
- **Keyboard**: everything works without a mouse. Visible 3px focus ring. Interactive targets are at least 44px.
- **Cart**: native `<dialog>` (focus trapped, Escape closes, page behind is inert, focus returns to the cart button). Add, remove and quantity changes are announced in a polite live region. Quantity buttons carry the product name in their label.
- **Chat**: `role="dialog"`, message log is a live region, focus moves to the input on open and back to the launcher on close, Escape closes.
- **User settings panel** (saved in `localStorage`, applied before first paint): high-contrast, dark and sepia themes, text size to 150%, line spacing, readable font, underlined links, reading guide, reduced motion, read page aloud.
- **System preferences**: `prefers-reduced-motion` and `forced-colors` are respected.
- **Color**: every text pair in `tokens.json` and each theme is tested for 4.5:1 contrast (`npm test`). If you change colors, the test tells you what to fix.

## Automated checks

`npm run a11y` runs axe-core (WCAG 2.0/2.1 A and AA plus best-practice rules) on every built page. jsdom has no layout, so axe's own color-contrast rule is off there and the token test covers contrast instead. `node scripts/e2e.mjs` exercises the cart, chat and panel in a real browser.

## Manual checklist before you launch

- Screen reader pass (VoiceOver, NVDA) on home, product, cart and checkout hand-off.
- Zoom to 200% and 400%; check no content is lost.
- Voice control: every button's visible text matches its accessible name.
- Replace placeholder product images and write real alt text.
- Re-run contrast tests after changing `tokens.json`.
- Publish an accessibility statement with a contact route.

Passing the automated checks is not a conformance claim.
