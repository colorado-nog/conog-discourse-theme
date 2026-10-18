#!/usr/bin/env node
// Copies the brand tokens from conog-site into this theme. conog-site's
// src/styles/tokens.css is the single source; nothing here retypes a hex value.
//
// Writes:
//   scss/_tokens.scss   SCSS variables and --conog-* custom properties
//   tokens.json         the same palette for scripts (contrast check, conog-infra)
//   about.json          the "color_schemes" block, from SCHEMES below
//
// Usage: node scripts/sync-tokens.mjs [path/to/conog-site/src/styles/tokens.css]
// Default path: ../conog-site/src/styles/tokens.css next to this repo.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, mix, mixUntil } from "./lib/color.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(process.argv[2] ?? join(root, "../conog-site/src/styles/tokens.css"));
const css = readFileSync(src, "utf8");

// Only the first :root block: the palette, type and layout tokens. The tone classes and
// the prefers-color-scheme block are the site's page logic, not tokens.
const rootBlock = css.match(/:root\s*{([\s\S]*?)\n}/)[1];
const tokens = {};
for (const [, name, value] of rootBlock.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
  tokens[name] = value.trim();
}

const PALETTE = [
  "basalt", "granite", "slate", "scree", "snowfield",
  "evergreen", "thin-air", "red-rock", "survey-tan", "benchmark-brass",
  "locate-orange", "link-green", "sky-tint",
];
const colors = {};
for (const name of PALETTE) {
  const v = tokens[name];
  if (!/^#[0-9a-f]{6}$/i.test(v ?? "")) throw new Error(`token --${name} missing or not #rrggbb in ${src}`);
  colors[name] = v.slice(1).toLowerCase();
}
const FONTS = ["font-display", "font-body", "font-mono"];
const fonts = Object.fromEntries(FONTS.map((n) => [n, tokens[n]]));
const SCALE = [
  "h1-leading", "h1-tracking", "h2-leading", "h2-tracking", "body-leading",
  "label-size", "label-leading", "label-tracking", "data-tracking",
  "button-size", "button-tracking", "wordmark-tracking", "hairline", "topo-opacity",
];
const scale = Object.fromEntries(SCALE.map((n) => [n, tokens[n]]));

// Derived colours, computed from tokens (decisions in README.md):
// - hover: 4% of the text colour into the background, per the Phase 6 brief.
// - red-rock-on-dark: Red Rock on Basalt is 2.9:1, too low for error text and the like
//   heart in the dark scheme. Mix Snowfield in, 5% at a time, until it reaches 4.5:1 on
//   both dark surfaces (Basalt and Granite).
// - dark-*: Discourse derives the dark scheme's greys by darkening the text colour, and
//   warm Snowfield darkens into brown. These are Snowfield laid over Basalt instead, so the
//   dark greys stay in the Basalt/Granite/Slate family (§5.2).
const derived = {
  "hover-light": mix(colors.basalt, colors.snowfield, 0.04),
  "hover-dark": mix(colors.snowfield, colors.basalt, 0.04),
  "dark-low": mix(colors.snowfield, colors.basalt, 0.12),
  "dark-low-mid": mix(colors.snowfield, colors.basalt, 0.3),
  "dark-high": mix(colors.snowfield, colors.basalt, 0.85),
  "light-high": mix(colors.basalt, colors.snowfield, 0.75),
  "red-rock-on-dark": mixUntil(colors["red-rock"], colors.snowfield,
    (c) => contrast(c, colors.basalt) >= 4.5 && contrast(c, colors.granite) >= 4.5),
};

// Discourse's numbered greys (primary-50 ... primary-900), read by its newer design-token
// layer (--token-color-*), some as text. Same text-over-background percentages Discourse
// uses, from tokens, in both schemes; 600 is primary-medium's token so text-subtlest
// passes, and the steps either side keep the scale in order.
const STEPS = { 50: 3, 100: 6, 200: 10, 300: 20, 400: 30, 500: 40, 700: 66, 800: 75, 900: 85 };
const DARK_STEPS = { ...STEPS, 700: 70, 800: 78 };
for (const [n, pct] of Object.entries(STEPS)) {
  derived[`light-${n}`] = mix(colors.basalt, colors.snowfield, pct / 100);
}
for (const [n, pct] of Object.entries(DARK_STEPS)) {
  derived[`dark-${n}`] = mix(colors.snowfield, colors.basalt, pct / 100);
}
const greyScale = (prefix, six) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [
      `primary-${n}`,
      n === 600 ? six : `${prefix}-${n}`,
    ]),
  );

// Discourse's combined "<light>-or-<dark>" variables. Core uses these as text colour (dates,
// counts, captions: about 75 rules), so they are pinned to the metadata tokens rather than
// derived from the background.
const combined = (muted, high, link) => ({
  "primary-med-or-secondary-med": muted,
  "primary-med-or-secondary-high": muted,
  "primary-low-mid-or-secondary-high": muted,
  "primary-low-mid-or-secondary-low": muted,
  "primary-high-or-secondary-low": high,
  "tertiary-med-or-tertiary": link,
});

const c = (name) => colors[name] ?? derived[name] ?? (() => { throw new Error(`no colour ${name}`); })();

// Discourse colour scheme variables -> tokens. Keys after "hover" pin derived variables that
// carry text, so their contrast is known rather than whatever Discourse would mix.
const SCHEMES = {
  "CONOG Light": {
    primary: "basalt",
    secondary: "snowfield",
    tertiary: "thin-air",
    quaternary: "evergreen",
    header_background: "basalt",
    header_primary: "snowfield",
    highlight: "survey-tan",
    danger: "red-rock",
    success: "evergreen", // Link Green on Snowfield is 2.4:1; see README
    love: "red-rock",
    selected: "survey-tan",
    hover: "hover-light",
    "primary-medium": "slate",
    "primary-high": "light-high",
    ...greyScale("light", "slate"),
    ...combined("slate", "light-high", "thin-air"),
  },
  "CONOG Dark": {
    primary: "snowfield",
    secondary: "basalt",
    tertiary: "sky-tint",
    quaternary: "evergreen",
    header_background: "granite",
    header_primary: "snowfield",
    highlight: "granite",
    danger: "red-rock-on-dark", // Red Rock on Basalt is 2.9:1; see README
    success: "link-green",
    love: "red-rock-on-dark",
    selected: "granite",
    hover: "hover-dark",
    "primary-very-low": "hover-dark",
    "primary-low": "dark-low",
    "primary-low-mid": "dark-low-mid",
    "primary-medium": "scree",
    "primary-high": "dark-high",
    ...greyScale("dark", "scree"),
    ...combined("scree", "dark-high", "sky-tint"),
  },
};

const schemes = Object.fromEntries(
  Object.entries(SCHEMES).map(([name, map]) => [
    name,
    Object.fromEntries(Object.entries(map).map(([k, v]) => [k, c(v).toUpperCase()])),
  ]),
);

const sha = createHash("sha256").update(css).digest("hex").slice(0, 12);
const header = `Generated by scripts/sync-tokens.mjs from conog-site src/styles/tokens.css (sha256 ${sha}). Do not edit.`;

const scss = [
  `// ${header}`,
  "",
  ...Object.entries(colors).map(([k, v]) => `$${k}: #${v};`),
  ...Object.entries(derived).map(([k, v]) => `$${k}: #${v};`),
  ...Object.entries(fonts).map(([k, v]) => `$${k}: ${v};`),
  ...Object.entries(scale).map(([k, v]) => `$${k}: ${v};`),
  "",
  ":root {",
  ...Object.entries(colors).map(([k, v]) => `  --conog-${k}: #${v};`),
  ...Object.entries(fonts).map(([k, v]) => `  --conog-${k}: ${v};`),
  ...Object.entries(scale).map(([k, v]) => `  --conog-${k}: ${v};`),
  "}",
  "",
].join("\n");
writeFileSync(join(root, "scss/_tokens.scss"), scss);

writeFileSync(
  join(root, "tokens.json"),
  JSON.stringify({ _comment: header, colors, derived, fonts, scale, schemes: SCHEMES }, null, 2) + "\n",
);

// The placeholder mark, until final vectors exist (Blueprint §7.2). Geometry measured from
// conog-site src/assets/brand/mark-*.png (1291 x 527 px): a 61 px route bar entering an
// equilateral-ish triangle with a knocked-out station dot. Approved colours only (§7.2).
const MARK_PATH =
  "M0 322H799.6L986 0L1291 527H681L764.3 383H0Z" + // route bar + triangle outline
  "M1054 363A68 68 0 1 0 918 363A68 68 0 1 0 1054 363Z"; // station dot (evenodd hole)
const markSvg = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1291 527" role="img" aria-label="CONOG">` +
  `<path fill="#${fill}" fill-rule="evenodd" d="${MARK_PATH}"/></svg>\n`;
for (const name of ["basalt", "snowfield", "evergreen"]) {
  writeFileSync(join(root, `assets/mark-${name}.svg`), markSvg(colors[name]));
}
// Favicon as on conog.org: Basalt mark on a Snowfield square, mark centred with clear space.
writeFileSync(
  join(root, "assets/favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1600">` +
    `<rect width="1600" height="1600" fill="#${colors.snowfield}"/>` +
    `<path transform="translate(154.5 536.5)" fill="#${colors.basalt}" fill-rule="evenodd" d="${MARK_PATH}"/></svg>\n`,
);

const aboutPath = join(root, "about.json");
const about = JSON.parse(readFileSync(aboutPath, "utf8"));
about.color_schemes = schemes;
writeFileSync(aboutPath, JSON.stringify(about, null, 2) + "\n");

console.log(`tokens from ${src} (sha256 ${sha}): ${PALETTE.length} colours, ${Object.keys(derived).length} derived`);
for (const [k, v] of Object.entries(derived)) console.log(`  ${k} #${v}`);
