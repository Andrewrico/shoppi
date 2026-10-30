// Chat engine: no DOM. Answers only from the passages in /knowledge.json (products, FAQs, policies, pages, posts).
// It never generates facts: every reply is a stored passage, a product card or a fixed phrase.

const STOP = new Set("a an and are as at be but by can do does for from get have how i if in is it its me my of on or our so that the their there this to us we what when where which who will with you your please tell about want need looking".split(" "));

export const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word))
    .map(stem);

function stem(word) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("es") && /(ch|sh|x|s)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

const INTENTS = [
  ["cart", /\b(my cart|in (my|the) cart|show (my )?cart|view (my )?cart|basket|check ?out|checkout)\b/i],
  ["human", /\b(human|person|agent|someone|contact|support|email|call|phone)\b/i],
  ["greeting", /^\s*(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you)\b/i],
];
const ADD = /\b(add|buy|order|get me|put)\b/i;

export function search(kb, question, { kinds = null, limit = 3 } = {}) {
  const query = tokenize(question);
  if (!query.length) return [];
  const scored = [];
  for (const passage of kb) {
    if (kinds && !kinds.includes(passage.kind)) continue;
    const title = new Set(tokenize(passage.title));
    const body = new Set(tokenize(`${passage.text} ${(passage.tags || []).join(" ")}`));
    let score = 0;
    for (const word of query) {
      if (title.has(word)) score += 3;
      else if (body.has(word)) score += 1;
    }
    if (score > 0) scored.push({ passage, score: score / Math.sqrt(query.length) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function answer(kb, question, { cartCount = 0, config = {} } = {}) {
  const text = String(question || "").trim();
  if (!text) return { text: "Ask me about a product, shipping, returns or your cart.", chips: true };

  const intent = INTENTS.find(([, pattern]) => pattern.test(text))?.[0];

  if (intent === "greeting") return { text: config.greeting || "Hi! How can I help?", chips: true };
  if (intent === "human") {
    return { text: "Here is how to reach a person.", actions: [{ type: "handoff" }] };
  }

  const products = search(kb, text, { kinds: ["product"], limit: 3 });

  // "add the mug to my cart" names a product, so it must win over the plain cart intent.
  if (ADD.test(text) && products.length) {
    const { passage } = products[0];
    if (passage.variants.length === 1) {
      return passage.available
        ? { text: `Adding ${passage.title} to your cart.`, actions: [{ type: "add", variantId: passage.variants[0].id }], cards: [passage] }
        : { text: `${passage.title} is sold out right now.`, cards: [passage] };
    }
    return { text: `${passage.title} comes in a few options. Pick one on its page.`, cards: [passage] };
  }

  if (intent === "cart") {
    return {
      text: cartCount ? `You have ${cartCount} ${cartCount === 1 ? "item" : "items"} in your cart.` : "Your cart is empty.",
      actions: [{ type: cartCount ? "open-cart" : "browse" }],
    };
  }

  const policy = search(kb, text, { kinds: ["policy", "faq"], limit: 1 })[0];
  if (policy && policy.score >= (products[0]?.score || 0)) {
    return { text: policy.passage.text, links: [{ text: policy.passage.title, url: policy.passage.url }] };
  }
  if (products.length) {
    return { text: products.length === 1 ? "I found this product." : "Here is what I found.", cards: products.map((r) => r.passage) };
  }

  const pages = search(kb, text, { kinds: ["page", "post"], limit: 3 });
  if (pages.length) {
    return { text: "These pages may help.", links: pages.map(({ passage }) => ({ text: passage.title, url: passage.url })) };
  }
  return { text: "I do not have an answer for that. I can only answer from this store's products, FAQs and policies.", actions: [{ type: "handoff" }], chips: true };
}
