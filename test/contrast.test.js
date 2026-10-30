// Every text/background pair in tokens.json and the user-selectable themes must meet WCAG AA (4.5:1).
const test = require("node:test");
const assert = require("node:assert/strict");
const tokens = require("../src/_data/tokens.json");
const themes = require("../src/_data/themes.json");

const luminance = (hex) => {
  const [r, g, b] = hex.replace("#", "").match(/../g).map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS = [["text", "bg"], ["text", "surface"], ["muted", "bg"], ["muted", "surface"], ["primary-text", "primary"], ["accent-text", "accent"], ["link", "bg"], ["link", "surface"], ["danger", "bg"], ["focus", "bg"]];

function check(name, colors) {
  for (const [fg, bg] of PAIRS) {
    if (!colors[fg] || !colors[bg]) continue;
    const min = fg === "focus" ? 3 : 4.5;
    assert.ok(ratio(colors[fg], colors[bg]) >= min, `${name}: ${fg} on ${bg} is ${ratio(colors[fg], colors[bg]).toFixed(2)}:1, needs ${min}:1`);
  }
}

test("default tokens meet AA", () => check("default", tokens.colors));

test("a11y themes meet AA", () => {
  for (const [name, theme] of Object.entries(themes)) check(name, { ...tokens.colors, ...theme.colors });
});
