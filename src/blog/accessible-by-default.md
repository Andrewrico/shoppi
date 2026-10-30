---
title: Accessible by default
description: The accessibility features built into the cart, chat and layout.
date: 2026-02-01
---

Every interactive part follows the same rules: it works with a keyboard, announces changes to screen readers, and respects reduced-motion and high-contrast settings.

## What is included

- A skip link and landmark regions on every page.
- A cart built on the native `dialog` element, so focus is trapped and restored for you.
- Live-region announcements when items are added or removed.
- An accessibility panel for contrast, text size, spacing and motion.

Run `npm run a11y` to check every built page with axe-core.
