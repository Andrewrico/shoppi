// The only store settings that reach the browser. Policies and credentials stay out.
const store = require("./store.json");

module.exports = {
  currency: store.currency,
  locale: store.locale,
  shippingNote: store.shipping.note,
  checkout: {
    provider: store.checkout.provider,
    shopifyDomain: store.checkout.shopifyDomain,
    endpoint: store.checkout.endpoint,
  },
  chat: store.chat,
};
