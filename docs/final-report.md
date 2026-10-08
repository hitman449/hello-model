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

Lighthouse 12.8, default mobile settings (simulated slow 4G and a 4× slower CPU), on a local server that compresses files with gzip the way GitHub Pages does. The live site couldn't be reached from the test environment, so it wasn't measured directly.

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 1.8 s | 0 ms | 0 |
| `/#/example` | 100 | 100 | 100 | 100 | 1.8 s | 0 ms | 0 |
| `/#/plans` | 100 | 100 | 100 | 100 | 1.8 s | 0 ms | 0 |
| `/learning-path/` | 100 | 100 | 100 | 100 | 1.5 s | 0 ms | 0 |
| `/guides/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/guides/spam-filter/` | 99 | 100 | 100 | 100 | 2.0 s | 0 ms | 0 |
| `/models/` | 100 | 100 | 100 | 100 | 1.5 s | 0 ms | 0 |
| `/models/speech/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/training/` | 100 | 100 | 100 | 100 | 1.5 s | 0 ms | 0 |
| `/training/fit/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/clouds/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/clouds/azure/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/glossary/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/about/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/contact/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/privacy/` | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| `/404.html` | 100 | 100 | 100 | 63* | 1.5 s | 0 ms | 0 |

\* The 404 page's lower SEO score comes from a single audit: it is marked `noindex` on purpose, so search engines don't list it. GitHub Pages also serves it with a 404 status.

Every page scores 99 or 100 for performance and 100 for accessibility and best practices. CLS is 0 on every page.

**Speeding up the home page.** An earlier run of this report measured on a server without compression and showed the home page at 93 with LCP 3.2 s. That overstated the problem, but the real number still improved:

| Home page | LCP | FCP | CLS | Performance |
|---|---|---|---|---|
| Before (compressed) | 2.0 s | 1.2 s | 0.001 | 99 |
| After | 1.8 s | 0.9 s | 0 | 100 |

- The largest element is the main heading, which waits for its font (Newsreader). It is now preloaded on every page, so it arrives sooner; the Learn pages went from 1.7 s to 1.5 s for the same reason.
- The screen animation from phase 8 replayed right after loading, briefly fading the page out and in. It now only runs when you move between screens.
- The Learning path page's progress bar was added by script and pushed the list down slightly (CLS 0.004). It's now part of the page from the start.

What remains: the app pages load about 60 KB (compressed) of JavaScript for the planner, which costs about 0.3 s of LCP in this simulation. Loading it after the first paint would mean restructuring how the app starts, which isn't worth it at a score of 100.

**Fixed in phase 8:** Accessibility was 98 on every page. On phones, the closed menu drawer was only moved off screen, so its links could still be reached with Tab and by screen readers. It is now hidden while closed, focus moves into it when it opens and back to the menu button when it closes.

## Accessibility (WCAG 2.1 AA)

Automated checks run with axe (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `best-practice`) in both themes, on every run of the test suite. All of these pass with no violations:

- All 14 Learn and info pages, including the 404
- Every app screen: home (new and returning visitor), model type confirmation, “narrow it down”, questions, the plan, the tech stack tab, the More menu, the share dialog and My plans
- The plan workspace: “Why this?” open, the answers and compare panels, the Ctrl+K palette and the keyboard shortcuts dialog
- The interactive lesson examples

Keyboard behavior is tested too: tabs move with the arrow keys, dialogs close with Escape, shortcuts never fire while typing, panels return focus to the button that opened them, and the phone menu moves focus in and out.

## Screen reader review

There is no screen reader in the test environment, so this review used Chromium's accessibility tree: the roles, names, states and live regions that VoiceOver, NVDA and TalkBack read. I recorded it for the home page, model type confirmation, a question, the plan, the answers and compare panels, the Ctrl+K palette, the share dialog, My plans and a lesson example, along with the Tab order on each. Fixed:

| Problem | What a screen reader user experienced | Fix |
|---|---|---|
| Focus was lost when the screen changed (describe → model type → questions) | Nothing was announced after pressing Create plan; the next Tab started from the top of the page | Focus moves to the new screen's heading, or to the first answer on a question |
| Lesson sliders spoke three times | Each move read the slider, its output box and the whole stats block | Output boxes are hidden from screen readers and the stats are no longer live; the short verdict is still announced |
| The learning-rate slider said “2” | It reported its position, not the learning rate | Sliders now announce their real value, such as “0.1” or “15%, 150 rows” |
| The current step had no name | Moving to a step announced an unnamed article | The step card is named by its title |
| Ctrl+K results were silent | Typing gave no sign of how many matches there were | A hidden status says “3 results” or “No results” |
| Shortcut letters in Ctrl+K | Each result ended with a stray letter, such as “A” | Hidden from screen readers |
| Compare panel focus landed on Close | The panel's content was skipped | Focus moves to the panel's heading |

Everything else read well: every form field and button has a name, the questions are radio groups named by the question, the tabs, dialogs and listbox use the right roles, and changes such as “Plan updated…” are announced politely. These are covered by new browser tests.

Still worth a short pass with a real screen reader (VoiceOver on iPhone and Mac, NVDA on Windows), since real screen readers differ in what they announce and when.

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
- 91 browser tests (Playwright): journeys, sharing, layout, lessons, the plan workspace, empty and error states, and the axe checks

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

- A short pass with a real screen reader, as above.
- An undo for deleting a plan instead of the browser's confirm box.
