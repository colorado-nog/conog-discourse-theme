# conog-discourse-theme

The CONOG theme for the forum at community.conog.org: the Brand Blueprint's palette, type
and one-orange rule applied to Discourse, in light and dark. Installed from Git so every
change is a reviewed commit and an update is one click.

Infrastructure, scripts and the decisions log live in `conog-infra`
(`docs/discourse.md`, `docs/decisions.md`). The brand documents are in
`conog-infra/docs/brand/`.

## Install and update

Install (once): Admin → Appearance → Themes → Install → From a Git repository:

- URL `https://github.com/colorado-nog/conog-discourse-theme`, branch `main`.
- After install: the theme's two colour palettes, **CONOG Light** and **CONOG Dark**, are
  created with it. On the theme page set Color palette = CONOG Light and Dark color
  palette = CONOG Dark, then **Set as default**. Mark both palettes user selectable.

Update: push to `main`, then Admin → Appearance → Themes → CONOG → **Check for updates** →
Update. Nothing else changes; settings and palettes stay.

Roll back: set the default theme back to Foundation; nothing else needs undoing.

## Where the colours come from

`conog-site/src/styles/tokens.css` is the single source of brand tokens. Nothing in this
repo retypes a hex value:

```
node scripts/sync-tokens.mjs        # reads ../conog-site/src/styles/tokens.css
node scripts/contrast-check.mjs     # fails on any text pair under 4.5:1
```

`sync-tokens.mjs` writes `scss/_tokens.scss` (SCSS variables and `--conog-*` properties),
`tokens.json` (the palette for scripts, including `conog-infra`'s structure and pretalx
seed scripts), the `color_schemes` block of `about.json`, and the mark SVGs in `assets/`.
Run it after any token change in conog-site, then the contrast check, then commit.

### Colour palette mapping

| Discourse variable | CONOG Light | CONOG Dark | Notes |
| --- | --- | --- | --- |
| primary (text) | Basalt | Snowfield | |
| secondary (background) | Snowfield | Basalt | |
| tertiary (links, accents) | Thin Air | Sky Tint | |
| quaternary | Evergreen | Evergreen | unused by core CSS |
| header_background | Basalt | Granite | |
| header_primary | Snowfield | Snowfield | |
| highlight | Survey Tan | Granite | |
| selected | Survey Tan | Granite | |
| hover | Basalt 4% over Snowfield | Snowfield 4% over Basalt | |
| danger | Red Rock | Red Rock, lightened | Red Rock on Basalt is 2.9:1; Snowfield is mixed in until 4.5:1 on Basalt and Granite |
| success | **Evergreen** | Link Green | Link Green on Snowfield is 2.4:1 and core uses `success` for text |
| love | Red Rock | Red Rock, lightened | as danger |
| primary-medium | Slate | Scree | metadata text, pinned so its contrast is known |
| primary-high | Basalt 75% over Snowfield | Snowfield 85% over Basalt | secondary text |
| primary-very-low, -low, -low-mid | Discourse default | Snowfield 4 / 12 / 30% over Basalt | Discourse darkens warm Snowfield into brown; this keeps dark greys neutral |

### The one orange

Locate Orange appears once per view, as a fill with Basalt text (Blueprint §5.1, §8.3):

| View | The orange element |
| --- | --- |
| Topic lists (`/`, `/latest`, `/categories`) | New Topic |
| A topic | Reply (topic footer) |
| Composer open | the composer's submit (Create Topic / Reply); page buttons step back |
| A group (`/g/<name>`) | Join |
| Preferences | Save Changes |
| Full-page chat | Send, once there is text to send |
| Logged out | Sign Up, or Log In while the forum is invite-only |

Every other primary button is boxed Basalt on Snowfield (Snowfield on Basalt in dark).
Unread counts, notification dots, category colours, likes and links never use orange.

## What Phase 6 decided

- Type: Barlow for body (16px / 1.45) and headings; Barlow 600 for topic titles; IBM Plex
  Mono for labels, category and tag names, buttons and every meaningful number. Barlow
  Condensed only in the wordmark. Fonts from Google Fonts with `display=swap`.
- Radius 0 everywhere except badges and avatars; no shadows (floating panels get a
  hairline).
- Header: mark + CONOG wordmark + descriptor in mono, rendered into Discourse's
  `home-logo-contents` outlet (`javascripts/discourse/api-initializers/conog-header.gjs`).
  The descriptor is the header's mono rail and hides below 400px (and on desktop windows
  under 900px). Topo contours sit behind the header only, Slate at 8%
  (`show_topo_texture`).
- The mark SVGs are traced from conog-site's placeholder PNGs (geometry identical to the
  pixel); replace `MARK_PATH` in `scripts/sync-tokens.mjs` when final vectors exist.
- Dark mode follows the OS: the theme's dark palette is CONOG Dark.

The full list, with Blueprint sections, is in `conog-infra/docs/decisions.md` (Phase 6).

## Layout

```
about.json                  name, assets, colour palettes (palettes generated)
settings.yml                orange_element (fixed), show_topo_texture, header_descriptor
common/common.scss          tokens, type, buttons, the one orange, header
common/head_tag.html        Google Fonts (Barlow, Barlow Condensed, IBM Plex Mono)
desktop/, mobile/           small per-device adjustments
javascripts/                header lockup
scss/_tokens.scss           generated
assets/                     mark-basalt, mark-snowfield, mark-evergreen, favicon (generated)
locales/en.yml              setting descriptions
scripts/                    sync-tokens.mjs, contrast-check.mjs (not loaded by Discourse)
tokens.json                 generated palette for scripts
```
