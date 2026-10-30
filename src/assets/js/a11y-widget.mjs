const STORAGE_KEY = "shoppi.a11y";
const DEFAULTS = { theme: "default", size: 100, spacing: 1.5, readableFont: false, underlineLinks: false, reduceMotion: false, readingGuide: false };

function init() {
  const widget = document.querySelector("[data-a11y-widget]");
  if (!widget) return;
  const root = document.documentElement;
  const panel = widget.querySelector("[data-a11y-panel]");
  const launcher = widget.querySelector("[data-a11y-launcher]");
  const status = widget.querySelector("[data-a11y-status]");
  let settings = { ...DEFAULTS };
  let speaking = false;

  try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { /* use defaults */ }
  const themes = [...widget.querySelectorAll("[data-theme-choice]")].map((b) => b.dataset.themeChoice);
  if (!themes.includes(settings.theme)) settings.theme = "default";
  settings.size = Math.max(100, Math.min(150, Number(settings.size) || 100));
  settings.spacing = Math.max(1.4, Math.min(2.2, Number(settings.spacing) || 1.5));

  const guide = Object.assign(document.createElement("div"), { className: "a11y-reading-guide", hidden: true });
  guide.setAttribute("aria-hidden", "true");
  document.body.append(guide);
  document.addEventListener("pointermove", (event) => { if (settings.readingGuide) guide.style.top = `${event.clientY - 18}px`; }, { passive: true });

  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* optional */ } };

  function apply() {
    if (settings.theme === "default") root.removeAttribute("data-a11y-theme");
    else root.dataset.a11yTheme = settings.theme;
    root.style.setProperty("--a11y-font-scale", String(settings.size / 100));
    root.style.setProperty("--a11y-line-height", String(settings.spacing));
    root.dataset.a11yFont = settings.readableFont ? "readable" : "";
    root.dataset.a11yUnderline = String(settings.underlineLinks);
    root.dataset.a11yMotion = settings.reduceMotion ? "reduce" : "";
    guide.hidden = !settings.readingGuide;
    widget.querySelectorAll("[data-theme-choice]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === settings.theme)));
    widget.querySelectorAll("[data-a11y-setting]").forEach((i) => (i.checked = Boolean(settings[i.dataset.a11ySetting])));
    widget.querySelector("#a11y-size").value = String(settings.size);
    widget.querySelector("#a11y-spacing").value = String(settings.spacing);
    widget.querySelector("[data-size-output]").value = `${settings.size}%`;
    widget.querySelector("[data-spacing-output]").value = `${Number(settings.spacing).toFixed(1)}×`;
  }
  const change = (patch) => { Object.assign(settings, patch); apply(); save(); };

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    (open ? widget.querySelector("[data-a11y-close]") : launcher).focus();
  }
  launcher.addEventListener("click", () => setOpen(panel.hidden));
  widget.querySelector("[data-a11y-close]").addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });

  widget.querySelectorAll("[data-theme-choice]").forEach((b) => b.addEventListener("click", () => change({ theme: b.dataset.themeChoice })));
  widget.querySelector("#a11y-size").addEventListener("input", (e) => change({ size: Number(e.target.value) }));
  widget.querySelector("#a11y-spacing").addEventListener("input", (e) => change({ spacing: Number(e.target.value) }));
  widget.querySelectorAll("[data-a11y-setting]").forEach((i) => i.addEventListener("change", () => change({ [i.dataset.a11ySetting]: i.checked })));

  const readButton = widget.querySelector("[data-a11y-read]");
  readButton.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) { status.textContent = "Read aloud is not available in this browser."; return; }
    if (speaking) { speechSynthesis.cancel(); return; }
    const main = document.getElementById("main-content")?.cloneNode(true);
    main?.querySelectorAll("script, style, button, input, textarea, select, nav").forEach((n) => n.remove());
    const text = (main?.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) { status.textContent = "There is no page text to read."; return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = utterance.onerror = () => { speaking = false; readButton.textContent = "Read page aloud"; };
    speaking = true;
    readButton.textContent = "Stop reading";
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });

  widget.querySelector("[data-a11y-reset]").addEventListener("click", () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    settings = { ...DEFAULTS };
    apply(); save();
    status.textContent = "Display settings restored.";
  });

  apply();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
