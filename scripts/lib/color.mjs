// Colour helpers shared by sync-tokens.mjs and contrast-check.mjs. Hex values are
// "rrggbb" without the leading #.

const channels = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// WCAG 2.x relative luminance and contrast ratio.
export function luminance(hex) {
  const [r, g, b] = channels(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// `amount` of `top` laid over `base` (0 = base, 1 = top).
export function mix(top, base, amount) {
  const t = channels(top);
  const b = channels(base);
  return toHex(b.map((v, i) => v + (t[i] - v) * amount));
}

// Mix `toward` into `color` in 5% steps until `ok` passes.
export function mixUntil(color, toward, ok) {
  for (let pct = 0; pct <= 100; pct += 5) {
    const candidate = mix(toward, color, pct / 100);
    if (ok(candidate)) return candidate;
  }
  throw new Error(`no mix of ${color} toward ${toward} passes`);
}
