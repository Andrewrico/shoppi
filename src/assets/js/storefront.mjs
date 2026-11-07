import { timeLeft, formatTimeLeft, filterItems, sortItems, toCents, toggleHandle, parseHandles } from "./storefront-core.mjs";

const COMPARE_LIMIT = 4;
const announce = (message) => {
  const region = document.querySelector("[data-cart-status]") || document.querySelector("[data-search-status]");
  if (region) region.textContent = message;
};
const store = {
  read(key) { try { return localStorage.getItem(key); } catch { return null; } },
  write(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode: lasts for this page view */ } },
};

/* Listing: search, filters, sort, layout. */
function initListing(root) {
  const grid = root.querySelector("[data-product-list]");
  const form = root.querySelector("[data-filter-form]");
  const filters = root.querySelector("[data-filters]");
  const toolbar = root.querySelector("[data-toolbar]");
  const status = root.querySelector("[data-search-status]");
  const sort = root.querySelector("[data-sort]");
  const input = document.querySelector("[data-search-input]");
  const items = [...grid.querySelectorAll("[data-search-text]")].map((node) => ({
    node, text: node.dataset.searchText, title: node.dataset.title, collection: node.dataset.collection,
    available: node.dataset.available === "true", price: node.dataset.price ? Number(node.dataset.price) : undefined, order: Number(node.dataset.order),
  }));
  filters.hidden = false;
  toolbar.hidden = false;
  if (matchMedia("(min-width: 52rem)").matches) filters.open = true;

  const apply = () => {
    const data = new FormData(form);
    const query = input ? input.value : "";
    const shown = new Set(filterItems(items, {
      query, collections: data.getAll("collection"), inStock: data.has("inStock"),
      min: toCents(data.get("min")), max: toCents(data.get("max")),
    }));
    for (const item of sortItems(items, sort.value)) {
      item.node.hidden = !shown.has(item);
      grid.append(item.node);
    }
    const noun = shown.size === 1 ? "product" : "products";
    status.textContent = `${shown.size} ${noun}${query.trim() ? ` found for "${query.trim()}"` : ""}`;
  };

  if (input) {
    input.value = new URLSearchParams(location.search).get("q") || "";
    input.addEventListener("input", apply);
  }
  form.addEventListener("input", apply);
  form.addEventListener("reset", () => setTimeout(apply));
  form.addEventListener("submit", (event) => event.preventDefault());
  sort.addEventListener("change", apply);

  const viewButtons = [...root.querySelectorAll("[data-view]")];
  const setView = (view) => {
    grid.classList.toggle("product-grid--list", view === "list");
    for (const button of viewButtons) button.setAttribute("aria-pressed", String(button.dataset.view === view));
    store.write("shoppi.view", view);
  };
  for (const button of viewButtons) button.addEventListener("click", () => setView(button.dataset.view));
  if (store.read("shoppi.view") === "list") setView("list");
  apply();
}
document.querySelectorAll("[data-listing]").forEach(initListing);

/* Wishlist and compare: handles saved in this browser. */
const lists = {
  wishlist: { key: "shoppi.wishlist", limit: Infinity, attr: "data-wishlist-toggle", count: "[data-wishlist-count]", name: "wishlist" },
  compare: { key: "shoppi.compare", limit: COMPARE_LIMIT, attr: "data-compare-toggle", count: "[data-compare-count]", name: "compare list" },
};
const saved = (list) => parseHandles(store.read(list.key));

function renderLists() {
  for (const list of Object.values(lists)) {
    const handles = saved(list);
    document.querySelectorAll(`[${list.attr}]`).forEach((button) => button.setAttribute("aria-pressed", String(handles.includes(button.getAttribute(list.attr)))));
    document.querySelectorAll(list.count).forEach((badge) => { badge.textContent = String(handles.length); badge.hidden = !handles.length; });
  }
  renderWishlistPage();
  renderComparePage();
}

function toggle(list, button) {
  const handle = button.getAttribute(list.attr);
  const result = toggleHandle(saved(list), handle, list.limit);
  if (result.full) return announce(`You can compare up to ${list.limit} products. Remove one first.`);
  store.write(list.key, JSON.stringify(result.list));
  announce(`${result.added ? "Added to" : "Removed from"} ${list.name}.`);
  renderLists();
}

function renderWishlistPage() {
  const grid = document.querySelector("[data-wishlist-grid]");
  if (!grid) return;
  const handles = saved(lists.wishlist);
  let shown = 0;
  for (const card of grid.children) {
    card.hidden = !handles.includes(card.dataset.handle);
    if (!card.hidden) shown += 1;
  }
  document.querySelector("[data-wishlist-status]").textContent = shown ? `${shown} saved ${shown === 1 ? "product" : "products"}` : "Your wishlist is empty.";
}

function renderComparePage() {
  const host = document.querySelector("[data-compare-table]");
  if (!host) return;
  const data = JSON.parse(document.querySelector("[data-compare-data]").textContent);
  const picked = saved(lists.compare).map((handle) => data.find((product) => product.handle === handle)).filter(Boolean);
  document.querySelector("[data-compare-status]").textContent = picked.length ? `Comparing ${picked.length} ${picked.length === 1 ? "product" : "products"}` : "Nothing to compare yet. Use the compare button on any product.";
  host.replaceChildren();
  if (!picked.length) return;
  const cell = (tag, content, scope) => {
    const node = document.createElement(tag);
    if (scope) node.scope = scope;
    if (content instanceof Node) node.append(content); else node.textContent = content;
    return node;
  };
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = "Product comparison";
  const head = document.createElement("tr");
  head.append(cell("td", ""));
  for (const product of picked) {
    const box = document.createElement("div");
    if (product.image) {
      const image = document.createElement("img");
      Object.assign(image, { src: product.image, alt: product.imageAlt, width: 160, height: 160 });
      box.append(image);
    }
    const link = document.createElement("a");
    link.href = product.url;
    link.textContent = product.title;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "link-button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${product.title} from comparison`);
    remove.addEventListener("click", () => {
      store.write(lists.compare.key, JSON.stringify(saved(lists.compare).filter((handle) => handle !== product.handle)));
      renderLists();
      document.querySelector("h1").focus?.();
    });
    box.append(link, document.createElement("br"), remove);
    head.append(cell("th", box, "col"));
  }
  const rows = [
    ...(picked.some((product) => product.price !== null) ? [["Price", (product) => product.price]] : []),
    ["Collection", (product) => product.collection || "None"],
    ["Availability", (product) => (product.available ? "In stock" : "Sold out")],
    ["Options", (product) => String(product.options)],
    ["Description", (product) => product.description],
  ];
  table.append(caption, head);
  for (const [label, read] of rows) {
    const row = document.createElement("tr");
    row.append(cell("th", label, "row"), ...picked.map((product) => cell("td", read(product))));
    table.append(row);
  }
  host.append(table);
}

/* Quick view: loads the product page's own markup into a dialog. Without JS, or on failure, the link just opens the page. */
const quick = document.getElementById("quick-view");
async function openQuickView(link) {
  const response = await fetch(link.href);
  if (!response.ok) throw new Error(String(response.status));
  const page = new DOMParser().parseFromString(await response.text(), "text/html");
  const product = page.querySelector(".product");
  if (!product) throw new Error("no product markup");
  quick.querySelector("[data-quick-view-body]").replaceChildren(document.importNode(product, true));
  quick.querySelector("[data-quick-view-link]").href = link.href;
  quickOpener = link;
  quick.showModal();
  renderLists();
}
let quickOpener = null;
quick?.addEventListener("close", () => {
  quick.querySelector("[data-quick-view-body]").replaceChildren();
  quickOpener?.focus();
});
quick?.addEventListener("click", (event) => { if (event.target === quick) quick.close(); });

/* Gallery: thumbnails and option buttons share one way of changing the main image. */
function showImage(gallery, src, alt) {
  const main = gallery?.querySelector(".product__stage img");
  if (!main) return;
  main.src = src;
  if (alt !== undefined) main.alt = alt;
  gallery.querySelectorAll("[data-gallery-thumb]").forEach((other) => other.setAttribute("aria-pressed", String(other.dataset.src === src)));
}

/* Page-wide clicks and changes. */
document.addEventListener("click", (event) => {
  const target = event.target;
  const wish = target.closest("[data-wishlist-toggle]");
  if (wish) return toggle(lists.wishlist, wish);
  const compare = target.closest("[data-compare-toggle]");
  if (compare) return toggle(lists.compare, compare);
  const quickLink = target.closest("[data-quick-view]");
  if (quickLink && quick) {
    event.preventDefault();
    openQuickView(quickLink).catch(() => { location.href = quickLink.href; });
    return;
  }
  if (target.closest("[data-quick-view-close]")) return quick.close();
  if (quick?.open && target.closest("[data-add-to-cart]")) return setTimeout(() => quick.close());
  const thumb = target.closest("[data-gallery-thumb]");
  if (thumb) return showImage(thumb.closest("[data-gallery]"), thumb.dataset.src, thumb.dataset.alt);
  const step = target.closest("[data-qty-step]");
  if (step) {
    const input = step.parentElement.querySelector("input");
    input.value = Math.min(99, Math.max(1, (Number(input.value) || 1) + Number(step.dataset.qtyStep)));
  }
});
document.addEventListener("change", (event) => {
  const radio = event.target.closest("[data-price-text]");
  if (!radio) return;
  const product = radio.closest(".product");
  product.querySelector("[data-product-price]").textContent = radio.dataset.priceText;
  if (radio.dataset.image) {
    const thumb = [...product.querySelectorAll("[data-gallery-thumb]")].find((item) => item.dataset.src === radio.dataset.image);
    showImage(product.querySelector("[data-gallery]"), radio.dataset.image, thumb ? thumb.dataset.alt : undefined);
  }
});
addEventListener("storage", renderLists);
renderLists();

/* Collections menu: Escape or a click elsewhere closes it. */
const menu = document.querySelector("[data-category-menu]");
if (menu) {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      menu.querySelector("summary").focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
}

/* Offer countdown: runs to the configured end date, then removes the section. It never resets. */
const deal = document.querySelector("[data-deal]");
if (deal) {
  const timer = deal.querySelector("[data-deal-timer]");
  const end = Date.parse(deal.dataset.endsAt);
  const tick = () => {
    const left = timeLeft(end, Date.now());
    if (!left) {
      deal.remove();
      clearInterval(handle);
      return;
    }
    timer.textContent = formatTimeLeft(left);
    timer.hidden = false;
  };
  const handle = setInterval(tick, 1000);
  tick();
}

/* Newsletter: only rendered when an endpoint is configured. The popup opens once and never again after it is closed. */
const NEWSLETTER_KEY = "shoppi.newsletter";
document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = form.querySelector("[data-newsletter-status]");
    status.textContent = "Sending…";
    try {
      const response = await fetch(form.dataset.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.elements.email.value }) });
      if (!response.ok) throw new Error(String(response.status));
      status.textContent = "Thanks, you're subscribed.";
      store.write(NEWSLETTER_KEY, "subscribed");
      form.reset();
    } catch {
      status.textContent = "That didn't go through. Please try again.";
    }
  });
});
const popup = document.getElementById("newsletter-popup");
if (popup && !store.read(NEWSLETTER_KEY)) {
  setTimeout(() => {
    if (!document.querySelector("dialog[open]")) popup.showModal();
  }, Number(popup.dataset.delay) * 1000);
  popup.querySelector("[data-newsletter-close]").addEventListener("click", () => popup.close());
  popup.addEventListener("close", () => { if (!store.read(NEWSLETTER_KEY)) store.write(NEWSLETTER_KEY, "dismissed"); });
}
