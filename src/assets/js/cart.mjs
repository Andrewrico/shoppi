import { addLine, setQty, removeLine, totals, reconcile, checkoutRequest, parseLines, formatMoney } from "./cart-core.mjs";

const STORAGE_KEY = "shoppi.cart";
const config = JSON.parse(document.getElementById("store-config")?.textContent || "{}");
const money = (cents) => formatMoney(cents, config.currency, config.locale);

let lines = [];
let variants = null; // variant id -> catalog entry, loaded from /catalog.json
let variantsPromise = null;
const listeners = new Set();

const read = () => {
  try { return parseLines(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const write = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* private mode: cart lasts for this page view */ }
};

function loadVariants() {
  variantsPromise ||= fetch("/catalog.json")
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(response.status))))
    .then((data) => (variants = data.variants))
    .catch(() => {
      variantsPromise = null;
      return null;
    });
  return variantsPromise;
}

function commit(next, announcement) {
  lines = next;
  write();
  listeners.forEach((listener) => listener(lines));
  if (announcement) announce(announcement);
}

function announce(message) {
  document.querySelectorAll("[data-cart-status]").forEach((el) => {
    el.textContent = "";
    // Re-set on the next frame so repeated identical messages are still announced.
    requestAnimationFrame(() => (el.textContent = message));
  });
}

const countLabel = (count) => `${count} ${count === 1 ? "item" : "items"}`;

// ---------- actions ----------

async function add(variantId, qty = 1) {
  const catalog = variants || (await loadVariants());
  const entry = catalog && catalog[variantId];
  if (!entry) return announce("Sorry, that item could not be added.");
  if (!entry.available) return announce(`${entry.title} is sold out.`);
  const label = entry.variantTitle && entry.variantTitle !== "Default" ? `${entry.title}, ${entry.variantTitle}` : entry.title;
  const next = addLine(lines, { id: variantId, handle: entry.handle, title: entry.title, variantTitle: entry.variantTitle, price: entry.price, image: entry.image }, qty);
  commit(next, `Added ${label}. Cart has ${countLabel(totals(next).count)}.`);
  return true;
}

function update(id, qty) {
  const line = lines.find((l) => l.id === id);
  if (!line) return;
  commit(setQty(lines, id, qty), qty < 1 ? `Removed ${line.title}.` : `${line.title}: quantity ${Math.min(Math.max(Math.floor(qty) || 0, 0), 99)}.`);
}

function remove(id) {
  const line = lines.find((l) => l.id === id);
  commit(removeLine(lines, id), line ? `Removed ${line.title}. Cart has ${countLabel(totals(removeLine(lines, id)).count)}.` : "");
}

async function checkout(statusEl) {
  const catalog = variants || (await loadVariants()) || {};
  const request = checkoutRequest(lines, config.checkout, catalog);
  if (request.type === "redirect") return void (window.location.href = request.url);
  if (request.type === "post") {
    try {
      const response = await fetch(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.body) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || response.status);
      return void (window.location.href = data.url);
    } catch {
      statusEl.textContent = "Checkout is unavailable right now. Please try again.";
      return;
    }
  }
  statusEl.textContent = request.type === "error"
    ? request.message
    : "Preview mode: checkout is not connected yet. Set a provider in src/_data/store.json.";
}

// ---------- rendering ----------

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

function renderLine(line) {
  const name = line.variantTitle && line.variantTitle !== "Default" ? `${line.title}, ${line.variantTitle}` : line.title;
  const qtyInput = el("input", { type: "number", min: "0", max: "99", value: String(line.qty), id: `qty-${line.id}`, class: "cart-qty__input", inputMode: "numeric" });
  qtyInput.addEventListener("change", () => update(line.id, Number(qtyInput.value)));
  const step = (delta, symbol, label) => {
    const button = el("button", { type: "button", class: "cart-qty__button", "aria-label": `${label} ${name}` }, symbol);
    button.addEventListener("click", () => update(line.id, line.qty + delta));
    return button;
  };
  const removeButton = el("button", { type: "button", class: "link-button" }, "Remove", el("span", { class: "visually-hidden" }, ` ${name}`));
  removeButton.addEventListener("click", () => remove(line.id));

  const item = el("li", { class: "cart-line" },
    line.image ? el("img", { src: line.image, alt: "", width: 64, height: 64, class: "cart-line__image" }) : el("span", { class: "cart-line__image cart-line__image--blank", "aria-hidden": "true" }),
    el("div", { class: "cart-line__body" },
      el("a", { href: `/products/${line.handle}/`, class: "cart-line__title" }, line.title),
      line.variantTitle && line.variantTitle !== "Default" ? el("span", { class: "cart-line__variant" }, line.variantTitle) : "",
      el("span", { class: "cart-line__price" }, money(line.price)),
      el("div", { class: "cart-qty" },
        el("label", { htmlFor: qtyInput.id, class: "visually-hidden" }, `Quantity for ${name}`),
        step(-1, "−", "Decrease quantity of"), qtyInput, step(1, "+", "Increase quantity of")),
      removeButton),
    el("span", { class: "cart-line__total" }, money(line.price * line.qty)));
  return item;
}

function renderCart(container) {
  const { subtotal } = totals(lines);
  const focusedId = document.activeElement && container.contains(document.activeElement) ? document.activeElement.id : "";
  container.replaceChildren();
  if (!lines.length) {
    container.append(el("p", { class: "cart-empty" }, "Your cart is empty."), el("a", { href: "/products/", class: "button" }, "Continue shopping"));
    return;
  }
  const statusEl = el("p", { class: "cart-checkout-status", role: "status" });
  const checkoutButton = el("button", { type: "button", class: "button button--primary" }, "Check out");
  checkoutButton.addEventListener("click", () => checkout(statusEl));
  container.append(
    el("ul", { class: "cart-lines" }, ...lines.map(renderLine)),
    el("div", { class: "cart-summary" },
      el("p", { class: "cart-subtotal" }, el("span", {}, "Subtotal"), el("strong", {}, money(subtotal))),
      el("p", { class: "cart-note" }, config.shippingNote || ""),
      checkoutButton, statusEl));
  if (focusedId) container.querySelector(`#${CSS.escape(focusedId)}`)?.focus();
}

function renderBadge() {
  const { count } = totals(lines);
  document.querySelectorAll("[data-cart-count]").forEach((badge) => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });
  document.querySelectorAll("[data-cart-open]").forEach((button) => button.setAttribute("aria-label", `Cart, ${countLabel(count)}`));
}

// ---------- wiring ----------

function init() {
  lines = read();
  const dialog = document.getElementById("cart-dialog");
  const dialogBody = dialog?.querySelector("[data-cart-body]");
  const pageBody = document.querySelector("[data-cart-page]");
  let opener = null;

  const rerender = () => {
    renderBadge();
    if (dialogBody) renderCart(dialogBody);
    if (pageBody) renderCart(pageBody);
  };
  listeners.add(rerender);
  rerender();

  // Refresh prices/stock once per page load if the cart has anything in it.
  if (lines.length) {
    loadVariants().then((catalog) => {
      if (!catalog) return;
      const result = reconcile(lines, catalog);
      if (!result.changes.length) return;
      const message = result.changes
        .map((change) => (change.kind === "removed" ? `${change.title} is no longer available and was removed.` : `${change.title} changed price to ${money(change.to)}.`))
        .join(" ");
      commit(result.lines, message);
    });
  }

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-cart-open]");
    if (openButton && dialog) {
      event.preventDefault();
      opener = openButton;
      dialog.showModal();
      loadVariants();
    }
    if (event.target.closest("[data-cart-close]")) dialog?.close();
    const addButton = event.target.closest("[data-add-to-cart]");
    if (addButton) {
      event.preventDefault();
      const form = addButton.closest("form");
      const variantId = addButton.dataset.variantId || form?.elements.variant?.value;
      const qty = Number(form?.elements.qty?.value || 1);
      if (variantId) add(variantId, qty).then((ok) => ok && form?.dataset.openCart !== undefined && dialog?.showModal());
    }
  });
  dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog?.addEventListener("close", () => opener?.focus());

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      lines = read();
      listeners.forEach((listener) => listener(lines));
    }
  });

  window.ShoppiCart = {
    add,
    open: () => dialog?.showModal(),
    get lines() { return lines; },
    totals: () => totals(lines),
    money,
    subscribe: (listener) => (listeners.add(listener), () => listeners.delete(listener)),
  };
  document.dispatchEvent(new CustomEvent("shoppi:cart-ready"));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
