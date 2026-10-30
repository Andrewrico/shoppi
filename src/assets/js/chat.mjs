import { answer } from "./chat-core.mjs";

const config = JSON.parse(document.getElementById("store-config")?.textContent || "{}");
const chatConfig = config.chat || {};

let kb = null;
async function loadKnowledge() {
  kb ||= fetch("/knowledge.json").then((response) => response.json()).catch(() => []);
  return kb;
}

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("data-") || key.startsWith("aria-") || key === "role") node.setAttribute(key, value);
    else node[key] = value;
  }
  node.append(...children);
  return node;
};

function init() {
  const root = document.querySelector("[data-chat]");
  if (!root) return;
  const panel = root.querySelector("[data-chat-panel]");
  const launcher = root.querySelector("[data-chat-launcher]");
  const log = root.querySelector("[data-chat-log]");
  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const chips = root.querySelector("[data-chat-chips]");

  const setOpen = (open) => {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!log.children.length) say("bot", chatConfig.greeting || "Hi! How can I help?");
      loadKnowledge();
      input.focus();
    } else launcher.focus();
  };

  function say(who, text, extras = []) {
    const bubble = el("div", { class: `chat-message chat-message--${who}` }, el("span", { class: "visually-hidden" }, who === "bot" ? `${chatConfig.name || "Assistant"} says: ` : "You said: "), el("p", {}, text), ...extras);
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function card(product) {
    const cardEl = el("div", { class: "chat-card" },
      el("a", { href: product.url, class: "chat-card__title" }, product.title),
      ...(product.priceLabel ? [el("span", { class: "chat-card__price" }, product.priceLabel)] : []));
    if (config.mode === "affiliate" && product.buyUrl) {
      cardEl.append(el("a", { href: product.buyUrl, class: "button button--small", rel: "sponsored nofollow noopener", target: "_blank" }, product.buyLabel, el("span", { class: "visually-hidden" }, ` ${product.title} (affiliate link, opens in a new tab)`)));
    } else if (product.variants.length === 1 && product.available) {
      const button = el("button", { type: "button", class: "button button--small" }, "Add to cart", el("span", { class: "visually-hidden" }, ` ${product.title}`));
      button.addEventListener("click", () => window.ShoppiCart?.add(product.variants[0].id));
      cardEl.append(button);
    } else if (!product.available) {
      cardEl.append(el("span", { class: "chat-card__note" }, "Sold out"));
    } else {
      cardEl.append(el("a", { href: product.url, class: "button button--small" }, "Choose options"));
    }
    return cardEl;
  }

  function actionNode(action) {
    if (action.type === "open-cart") {
      const b = el("button", { type: "button", class: "button button--small" }, "Open cart");
      b.addEventListener("click", () => window.ShoppiCart?.open());
      return b;
    }
    if (action.type === "browse") return el("a", { href: "/products/", class: "button button--small" }, "Browse products");
    if (action.type === "handoff" && chatConfig.handoffUrl) return el("a", { href: chatConfig.handoffUrl, class: "button button--small" }, chatConfig.handoffLabel || "Contact us");
    return null;
  }

  async function respond(question) {
    say("user", question);
    const knowledge = await loadKnowledge();
    let reply;
    if (chatConfig.endpoint) {
      try {
        const response = await fetch(chatConfig.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
        const data = await response.json();
        if (response.ok && data.text) reply = data;
      } catch { /* fall back to the on-page answers */ }
    }
    reply ||= answer(knowledge, question, { cartCount: window.ShoppiCart?.totals().count || 0, config: { ...chatConfig, mode: config.mode } });

    const extras = [
      ...(reply.cards || []).map(card),
      ...(reply.links || []).map((link) => el("a", { href: link.url, class: "chat-link" }, link.text)),
      ...(reply.actions || []).map(actionNode).filter(Boolean),
    ];
    say("bot", reply.text, extras);
    for (const action of reply.actions || []) if (action.type === "add") await window.ShoppiCart?.add(action.variantId);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = "";
    respond(question);
  });
  chips.querySelectorAll("button").forEach((chip) => chip.addEventListener("click", () => respond(chip.textContent.trim())));
  launcher.addEventListener("click", () => setOpen(panel.hidden));
  root.querySelector("[data-chat-close]").addEventListener("click", () => setOpen(false));
  root.querySelector("[data-chat-reset]").addEventListener("click", () => {
    log.replaceChildren();
    say("bot", chatConfig.greeting || "Hi! How can I help?");
    input.focus();
  });
  panel.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
