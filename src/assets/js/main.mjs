import "./cart.mjs";
import "./chat.mjs";
import "./a11y-widget.mjs";
import "./storefront.mjs";

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
