# Deploy

Shoppi builds to plain static files in `_site/` (`npm run build`). Any static host works.

## Set your site's address

The canonical links, sitemap, `robots.txt`, feed and `llms.txt` all use the site's public address. Shoppi picks it, in order, from:

1. the `SITE_URL` environment variable (any host),
2. `URL`, which Netlify sets for you,
3. `url` in `src/_data/site.json` (ships as `https://example.com`: change it).

```sh
SITE_URL=https://shop.example.com npm run build
```

## Netlify

`netlify.toml` is included (build command, publish folder, Node 22). Connect the repo, or deploy the folder yourself after building with `SITE_URL` set. Netlify's `URL` variable only exists in Netlify builds, so a local build needs `SITE_URL`.

## Other hosts

Publish `_site/` and set `SITE_URL` in the build. The site must be served from the domain root (a sub-path like `/shoppi/` is not supported yet).

## Checkout and catalog

Checkout providers and catalog sources need their own environment variables at build time: see [checkout.md](checkout.md) and [catalog.md](catalog.md).
