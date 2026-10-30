// Affiliate link building. Pure functions, no network.

const AMAZON_HOST = /(^|\.)amazon\.[a-z.]+$/i;

// Returns the outbound URL with your tracking applied, or null if `url` is not a valid http(s) URL.
//   amazonTag    : added as ?tag= on amazon.* links that do not already carry one
//   linkTemplate : wraps the final URL for networks that use a redirect, e.g. "https://track.example/click?u={url}"
function buildAffiliateUrl(url, { amazonTag = null, linkTemplate = null } = {}) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (amazonTag && AMAZON_HOST.test(parsed.hostname) && !parsed.searchParams.has("tag")) parsed.searchParams.set("tag", amazonTag);
  const final = parsed.toString();
  return linkTemplate ? linkTemplate.replace("{url}", encodeURIComponent(final)) : final;
}

module.exports = { buildAffiliateUrl };
