#!/usr/bin/env node
// Contrast check for every text/background pair the theme ships, in both colour schemes.
// Reads the schemes from about.json and the fixed-colour overrides from tokens.json (the
// same tokens common.scss uses). Fails (exit 1) on any text pair under 4.5:1, or any
// non-text pair (icons, focus rings) under 3:1. WCAG 2.x ratios.
//
// Usage: node scripts/contrast-check.mjs [--markdown]

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast } from "./lib/color.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const about = JSON.parse(readFileSync(join(root, "about.json"), "utf8"));
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));

// Each pair: [label, foreground, background, kind]. A name is a scheme variable
// (primary, header_background, ...) or "token:<name>" for a fixed brand colour set in
// common.scss. kind "text" needs 4.5:1, "graphic" needs 3:1.
const PAIRS = [
  ["Body text", "primary", "secondary", "text"],
  ["Metadata (dates, counts, captions)", "primary-medium", "secondary", "text"],
  ["Secondary text (excerpts, sidebar)", "primary-high", "secondary", "text"],
  ["Subtlest text (token layer, primary-600)", "primary-600", "secondary", "text"],
  ["Subtle text (token layer, primary-800)", "primary-800", "secondary", "text"],
  ["Default text (token layer, primary-900)", "primary-900", "secondary", "text"],
  ["Muted text (primary-med-or-secondary-med)", "primary-med-or-secondary-med", "secondary", "text"],
  ["Muted text (primary-low-mid-or-secondary-high)", "primary-low-mid-or-secondary-high", "secondary", "text"],
  ["Secondary text (primary-high-or-secondary-low)", "primary-high-or-secondary-low", "secondary", "text"],
  ["Accent text (tertiary-med-or-tertiary)", "tertiary-med-or-tertiary", "secondary", "text"],
  ["Links", "tertiary", "secondary", "text"],
  ["Header text and wordmark", "header_primary", "header_background", "text"],
  ["Text on highlight (new post flash)", "primary", "highlight", "text"],
  ["Text on selected rows", "primary", "selected", "text"],
  ["Text on hover rows", "primary", "hover", "text"],
  ["Links on hover rows", "tertiary", "hover", "text"],
  ["Links on selected rows", "tertiary", "selected", "text"],
  ["Error text", "danger", "secondary", "text"],
  ["Success text", "success", "secondary", "text"],
  ["Default primary button text", "secondary", "primary", "text"],
  ["Primary button text, hover", "secondary", "tertiary", "text"],
  ["Danger button text", "secondary", "danger", "text"],
  ["Orange action text (the one orange)", "token:basalt", "token:locate-orange", "text"],
  ["Like heart", "love", "secondary", "graphic"],
  ["Focus ring", "tertiary", "secondary", "graphic"],
  ["Orange action on header", "token:locate-orange", "header_background", "graphic"],
  ["Orange action on page", "token:locate-orange", "secondary", "graphic"],
];

const resolveColor = (scheme, name) => {
  if (name.startsWith("token:")) {
    const t = name.slice(6);
    const v = tokens.colors[t];
    if (!v) throw new Error(`no token ${t}`);
    return v;
  }
  const v = scheme[name];
  if (!v) throw new Error(`scheme has no ${name}`);
  return v.toLowerCase();
};

const tokenName = (hex) =>
  Object.entries({ ...tokens.colors, ...tokens.derived }).find(([, v]) => v === hex.toLowerCase())?.[0] ?? `#${hex}`;

const markdown = process.argv.includes("--markdown");
let failures = 0;
let lowestText = null;

for (const [schemeName, scheme] of Object.entries(about.color_schemes)) {
  if (markdown) {
    console.log(`\n### ${schemeName}\n\n| Pair | Foreground | Background | Ratio | Needs | Result |\n| --- | --- | --- | --- | --- | --- |`);
  } else {
    console.log(`\n${schemeName}`);
  }
  for (const [label, fg, bg, kind] of PAIRS) {
    const f = resolveColor(scheme, fg);
    const b = resolveColor(scheme, bg);
    const ratio = contrast(f, b);
    const need = kind === "text" ? 4.5 : 3;
    // The orange-on-page row is informational: the orange is always a fill with Basalt
    // text (§5.4: orange on Snowfield 2.7:1, graphics only), so the fill edge is not
    // the information-carrying boundary.
    const informational = label === "Orange action on page";
    const ok = ratio >= need || informational;
    if (!ok) failures++;
    if (kind === "text" && (!lowestText || ratio < lowestText.ratio)) {
      lowestText = { schemeName, label, ratio };
    }
    const result = ok ? (informational && ratio < need ? "info" : "pass") : "FAIL";
    if (markdown) {
      console.log(`| ${label} | ${tokenName(f)} | ${tokenName(b)} | ${ratio.toFixed(2)}:1 | ${need}:1 | ${result} |`);
    } else {
      console.log(`  ${result.padEnd(4)} ${ratio.toFixed(2).padStart(5)}:1  ${label}: ${tokenName(f)} on ${tokenName(b)}`);
    }
  }
}

console.log(
  `\nLowest text pair: ${lowestText.label} (${lowestText.schemeName}) ${lowestText.ratio.toFixed(2)}:1`,
);
console.log(failures ? `${failures} pair(s) below threshold` : "All pairs pass.");
process.exit(failures ? 1 : 0);
