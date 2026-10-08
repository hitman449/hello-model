# Final report: UI, copy and design refresh

The eight-phase refresh of Hello Model, from “friendly and functional” to “polished, confident and professional”, while staying beginner-friendly. Measured on the phase 8 build (October 2026).

## What changed, by phase

| Phase | What shipped |
|---|---|
| 1. Audit | A list of what to fix across type, color, copy, layout and accessibility |
| 2. Visual direction | Three type-and-color options; you chose C1 |
| 3. Type and color | Source Sans 3 (interface), Newsreader (headings and reading), JetBrains Mono (code), self-hosted and subset; a refined teal palette with tokens for both themes |
| 4. Voice and app copy | `VOICE.md`; American English; the app screens rewritten (`docs/copy/01-app-screens.md`) |
| 5. Plan and Learn copy | Plan content, guides, lessons and model pages rewritten (`docs/copy/02-plan-and-learn.md`), with a test that scans every page and plan |
| 6. Home and My plans | “Continue where you left off”, a two-column home page, search and sort on My plans, no layout shift when opening My plans directly |
| 7. Plan workspace | Overview with “Why this?”, an honest confidence rating, edit answers in place, compare approaches, keyboard shortcuts, Ctrl+K commands |
| 8. Polish | A wordmark logo and favicon, a motion system, empty and error states, exports with reasons and confidence, an accessibility fix for the phone menu, and this report |

## Lighthouse

Lighthouse 12.8, default mobile settings (simulated slow 4G and a 4× slower CPU), on a local static server.

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 93 | 100 | 100 | 100 | 3.2 s | 0 ms | 0.001 |
| `/#/example` | 94 | 100 | 100 | 100 | 3.0 s | 10 ms | 0 |
| `/#/plans` | 94 | 100 | 100 | 100 | 3.0 s | 0 ms | 0 |
| `/learning-path/` | 99 | 100 | 100 | 100 | 2.1 s | 0 ms | 0.004 |
| `/guides/` | 99 | 100 | 100 | 100 | 2.1 s | 0 ms | 0 |
| `/guides/spam-filter/` | 95 | 100 | 100 | 100 | 2.6 s | 0 ms | 0 |
| `/models/` | 98 | 100 | 100 | 100 | 2.3 s | 0 ms | 0 |
| `/models/speech/` | 97 | 100 | 100 | 100 | 2.3 s | 0 ms | 0 |
| `/training/` | 99 | 100 | 100 | 100 | 2.0 s | 0 ms | 0 |
| `/training/fit/` | 99 | 100 | 100 | 100 | 2.1 s | 0 ms | 0.001 |
| `/clouds/` | 98 | 100 | 100 | 100 | 2.3 s | 0 ms | 0 |
| `/clouds/azure/` | 98 | 100 | 100 | 100 | 2.3 s | 0 ms | 0 |
| `/glossary/` | 98 | 100 | 100 | 100 | 2.3 s | 0 ms | 0 |
| `/about/` | 99 | 100 | 100 | 100 | 2.0 s | 0 ms | 0 |
| `/contact/` | 99 | 100 | 100 | 100 | 2.1 s | 0 ms | 0 |
| `/privacy/` | 98 | 100 | 100 | 100 | 2.3 s | 0 ms | 0 |
| `/404.html` | 99 | 100 | 100 | 63* | 2.1 s | 0 ms | 0 |


\* The 404 page's lower SEO score comes from a single audit: it is marked `noindex` on purpose, so search engines don't list it. GitHub Pages also serves it with a 404 status.

Every page scores 90 or more in every category, apart from that intended 404 SEO result. CLS is 0 on most pages and at most 0.004 on the rest, far below the 0.1 limit for “good”. The pages with the slowest LCP (about 3 seconds on throttled mobile) are the app pages, which load the full knowledge base (about 70 KB); Learn pages load a 5 KB subset.

**Fixed in this phase:** Accessibility was 98 on every page. On phones, the closed menu drawer was only moved off screen, so its links could still be reached with Tab and by screen readers. It is now hidden while closed, focus moves into it when it opens and back to the menu button when it closes. Every page now scores 100.

## Accessibility (WCAG 2.1 AA)

Automated checks run with axe (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `best-practice`) in both themes, on every run of the test suite. All of these pass with no violations:

- All 14 Learn and info pages, including the 404
- Every app screen: home (new and returning visitor), model type confirmation, “narrow it down”, questions, the plan, the tech stack tab, the More menu, the share dialog and My plans
- The plan workspace: “Why this?” open, the answers and compare panels, the Ctrl+K palette and the keyboard shortcuts dialog
- The interactive lesson examples

Keyboard behavior is tested too: tabs move with the arrow keys, dialogs close with Escape, shortcuts never fire while typing, panels return focus to the button that opened them, and the phone menu moves focus in and out.

**Not covered by automation:** I haven't tested with a real screen reader (VoiceOver, NVDA or TalkBack). A short manual pass on the plan page and the Ctrl+K palette is worth doing.

## Color contrast

Checked on the design tokens by `tests/contrast.test.js` in both themes (19 text pairs at 4.5:1, 12 interface pairs at 3:1). The most important pairs:

| Pair | Used for | Light | Dark | Needs |
|---|---|---|---|---|
| `--text` on `--bg` | Body text | 16.4:1 | 15.7:1 | 4.5:1 |
| `--text-2` on `--surface` | Secondary text on cards | 9.9:1 | 10.7:1 | 4.5:1 |
| `--muted` on `--surface-2` | Muted text (lowest pair) | 5.2:1 | 5.9:1 | 4.5:1 |
| `--accent` on `--surface` | Links and accents | 6.3:1 | 7.5:1 | 4.5:1 |
| `--on-accent` on `--accent` | Primary buttons, logo mark | 6.2:1 | 8.0:1 | 4.5:1 |
| `--ok` on `--ok-bg` | High-confidence badge | 6.3:1 | 8.6:1 | 4.5:1 |
| `--info` on `--info-bg` | Medium-confidence badge | 6.6:1 | 8.3:1 | 4.5:1 |
| `--warn` on `--warn-bg` | Low-confidence badge, notices | 7.1:1 | 8.7:1 | 4.5:1 |
| `--danger` on `--danger-bg` | Errors | 6.3:1 | 7.7:1 | 4.5:1 |
| `--code-text` on `--code-bg` | Code | 13.1:1 | 14.3:1 | 4.5:1 |
| `--control` on `--surface` | Input borders (3:1) | 3.4:1 | 3.3:1 | 3:1 |
| `--focus` on `--bg` | Focus ring (3:1) | 6.0:1 | 8.0:1 | 3:1 |

## Mobile

`tests/e2e/layout.spec.js` checks every page for horizontal scrolling at 390, 1024 and 1366px on each run. Each phase was also checked by hand with screenshots at 375 and 1280px, in light and dark. Touch targets are at least 44px on touch screens (`--tap`), set in the CSS rather than tested automatically.

## Tests

- 77 unit tests (`npm test`): plan engine, detection, share links, design tokens, contrast, font coverage, voice and copy rules (they scan every generated page and every model type's plan), search and the site build
- 88 browser tests (Playwright): journeys, sharing, layout, lessons, the plan workspace, empty and error states, and the axe checks

## Constraints

| Requirement | Status |
|---|---|
| Every feature, URL, route and share link keeps working | Kept. Step ids, answer values and question option order are unchanged; old share links and saved plans open |
| No backend, accounts, analytics or tracking | None added; everything stays in the browser |
| No heavy frameworks | Still plain HTML, CSS and JavaScript |
| Lighthouse 90+ on every page, CLS 0 after the font change | Met (see above) |
| WCAG 2.1 AA in both themes | Automated checks pass in both themes |
| Mobile-first at 375, 768 and 1280px | Tested |
| DESIGN.md up to date, VOICE.md added | Done |

## Worth doing next

- A manual screen reader pass, as above.
- Load less JavaScript on the home page: the full knowledge base could load after the first paint, which would bring home and plan LCP closer to the Learn pages.
- An undo for deleting a plan instead of the browser's confirm box.
