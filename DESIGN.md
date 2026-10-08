# Hello Model design system

The rules every page follows. The tokens live at the top of `css/styles.css`; `tests/design.test.js` checks the ones a machine can check.

## Principles

- **Calm, precise and trustworthy.** Cool neutral surfaces, one deep teal accent used sparingly, a serif for headings and reading, restrained corners. Mature enough to show a manager, plain enough for a beginner.
- **One idea per screen.** Each screen has one main action (a filled teal button). Everything else is a quiet link or an outline button.
- **Mobile first.** Design for 375px wide, then add room at 768px and 1280px. No horizontal scrolling at any width.
- **Readable by anyone.** WCAG 2.1 AA in both themes. Jargon is explained where it appears (dotted underline and a tooltip).
- **Fast.** No frameworks. Fonts and scripts never block the first paint, and each page loads only the code it needs.

## Color

Cool, near-neutral greys with a slight teal bias, and one deep teal accent. The accent marks **actions, focus, links and key data only**, never decoration. The dark theme is graded on its own (not inverted): surfaces lift in tone instead of using shadows, and the teal is muted so it doesn't glow.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#f5f7f7` | `#0e1213` | Page background |
| `--surface` / `--surface-2` / `--side-bg` | `#fcfdfd` / `#edf1f1` / `#eff2f2` | `#151a1b` / `#1c2324` / `#111617` | Cards / quiet fills / sidebar |
| `--text` / `--text-2` / `--muted` | `#121a1b` / `#374445` / `#5a6768` | `#e6ebeb` / `#c2cccc` / `#93a0a1` | Primary, secondary and muted text |
| `--border` / `--border-strong` | `#dae1e1` / `#c3cccc` | `#263031` / `#354142` | Dividers and card edges (decorative) |
| `--control` | `#7f8c8d` | `#5f6d6e` | Edges of inputs, selects and radio circles (3:1 or more) |
| `--accent` / `--accent-hover` / `--accent-soft` | `#0a6a62` / `#075049` / `#e0efed` | `#5cb8ad` / `#7ccbc1` / `#12302c` | Primary buttons, links, focus / hover / selected and highlighted areas |
| `--ok`, `--warn`, `--danger`, `--info` | each with `-bg` and `-border` | | Status messages: text, background, border |
| `--c1` … `--c4` | teal, ochre, grey, red | lighter in dark | Chart and diagram marks (3:1 or more) |
| `--code-bg` / `--code-text` | `#edf1f1` / `#1b2a2b` | `#0b0f10` / `#d7e0e0` | Code blocks |

Use the tokens, never raw colors. **Contrast is tested:** `tests/contrast.test.js` reads the tokens from `styles.css` and fails if any text pair drops below 4.5:1, or any input edge, focus ring or chart color below 3:1, in either theme. It also checks that the system dark theme and the toggle's dark theme are identical.

## Type

Three families, each with one job:

| Family | Token | Used for |
|---|---|---|
| Source Sans 3 | `--font-ui` | The interface: body text, buttons, labels, forms, tables |
| Newsreader | `--font-head`, `--font-read` | Headings and page titles, and long reading (guides, lessons, model pages) |
| JetBrains Mono | `--font-mono` | Code, keyboard keys |

Three weights: 400 (text), 500 (display headings), 600 (labels, buttons, headings, bold). No 700 or 800. Labels are sentence case, never uppercase. Interface figures are tabular, so costs, counts and percentages line up; reading text uses proportional figures.

Sizes come from the scale only:

| Token | Size | Used for |
|---|---|---|
| `--fs-xs` | 12px | Badges, keyboard hints, small meta |
| `--fs-sm` | 14px | Labels, captions, sidebar, small buttons |
| `--fs-md` | 15px | Cards, secondary text |
| `--fs-base` | 17px | Interface body text (16px on phones, so iOS doesn't zoom into inputs) |
| `--fs-read` | 18px | Long reading in Newsreader |
| `--fs-lg` | 19px | Lead paragraphs, h3 |
| `--fs-xl` | 24px | h2 |
| `--fs-2xl` | 30px | Big numbers and icons |
| `--fs-title` | 30–42px, fluid | Page titles (h1) |
| `--fs-display` | 36–56px, fluid | The home headline |

Line height: `--lh-body` (1.6) for the interface, `--lh-read` (1.7) for reading, `--lh-tight` (1.15) for headings. Headings are tightened slightly (−0.01em, −0.02em for the display size).

**Line length.** Reading text stops at `--measure` (52ch in Newsreader, about 70 characters). Intro paragraphs stop at 640px.

## Spacing

An 8px rhythm with 4px half-steps: `--sp-1` to `--sp-8` = 4, 8, 12, 16, 24, 32, 48, 64px. Every padding, margin and gap is a multiple of 4px. Hairline offsets under 4px (1–3px) are allowed for borders and optical alignment.

Corners: `--r-xs` 4px (badges), `--r-sm` 6px (buttons, inputs, chips, tabs), `--r` 10px (cards inside cards, menus), `--r-lg` 14px (cards and dialogs). Only progress bars and small round markers are fully round. Shadows are faint (`--shadow` for cards, `--shadow-lg` for dialogs and popovers) and absent in dark mode, where surfaces lift by tone instead.

## Icons

`js/icons.js` holds one set of original 24×24 line icons: no fill, 1.8 stroke, round caps and joins, in the same style as the sidebar. Each model type names its icon in `USE_CASES[id].icon`.

```js
HM_ICONS.svg("chat", 26)   // → <svg class="i" … aria-hidden="true">…</svg>
```

Icons are decorative (`aria-hidden`), so the text next to them must say what they mean. They take the text color (`currentColor`); model icons are teal. To add one, draw it on the 24px grid with the same stroke and add it to `ICONS`. The tests fail if a model type points at an icon that doesn't exist. Don't use emoji as icons; they look different on every device.

A few interface icons (`clock`, `check`, `chevron`) live in the same set.

## Diagrams

`js/diagram.js` draws the architecture as SVG at the exact width it has: two lanes (build the model, then put it to work) on wider screens, one column below 600px. Colors come from the same tokens, so it works in both themes, and it carries a text description for screen readers. It's redrawn when its container changes size.

## Layout

- `main` is at most 1120px wide. From 1100px up, the home page has two columns: the describe form on the left and a sticky example plan on the right. Guides sit below in a full-width grid. Below 1100px everything is one column.
- Returning visitors (at least one saved plan) see a “Continue where you left off” card at the top of the home page: the latest plan, its progress, when it was last updated, and a link to all plans.
- My plans shows a search box and a sort menu (last updated, created, progress, name) once there's a plan. The sort choice is remembered in this browser. Each plan card shows the title, model type, progress and when it was updated; deleting asks first.

## Touch and focus

- On touch screens (`pointer: coarse`), every button, chip and standalone link is at least `--tap` (44px) tall. Links inside sentences are exempt (WCAG 2.5.8).
- Every interactive element shows the teal focus ring when reached by keyboard. Never remove an outline without replacing it.
- Motion uses `--dur` (0.18s) and `--ease`, and is turned off for people who ask for reduced motion.

## Loading

- Fonts are self-hosted from `/fonts/`: woff2, subset to the characters the site uses (plus all of Latin-1) and to the weights in use, about 20–40 KB each. `scripts/subset-fonts.py` rebuilds them from the full files in `fonts-src/`; `tests/fonts.test.js` fails if the site shows a character the fonts don't cover.
- `font-display: swap` with size-adjusted fallbacks (Arial, Times New Roman, Courier New) whose metrics match each web font, so text doesn't move when the real font arrives (layout shift stays at 0). Only the interface font is preloaded; the reading and code fonts load when a page uses them.
- All scripts are `defer`.
- Learn pages load `js/kb-lite.js` (model names, icons and the glossary, about 5 KB, generated by the build) instead of the full knowledge base (about 70 KB).
- Content that is there at first paint is in the HTML, not added by JavaScript, so the page doesn't jump (for example, the example chips on the home page).
- A link straight to My plans (`#/plans`) sets `data-boot="plans"` on `<html>` from a one-line inline script, so the home screen never paints first and then jumps away.
- Target: Lighthouse 90 or more in every category on every page.

## Interactive examples

Lesson widgets live in `js/widgets/<name>.js`, one file each, in plain JavaScript. A lesson marks a slot with `<section class="widget" data-widget="<name>">`, and `js/page.js` loads the script only when the slot is about to scroll into view. Every widget follows the same pattern:

- labelled controls (sliders, selects, checkboxes) at the top
- an SVG drawing with a `<title>` that says what it currently shows
- plain-English numbers, and a verdict in an `aria-live` region that explains what you're seeing (`.w-verdict`, amber with `.bad` when something's wrong)

Colors come from the theme tokens, and animation is skipped for people who ask for reduced motion. The logic is exported for Node, so `tests/widgets.test.js` checks that each widget teaches what its text claims.

