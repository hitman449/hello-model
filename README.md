# hello-model

**Hello Model** is an interactive website that teaches people how to build an AI/ML model for their own use case.

Live at **https://sayhellomodel.com**.

1. **Describe** what you want the model to do, in plain words. Not sure yet? **See an example plan** (a small bakery forecasting daily demand) in one click; it isn't saved to My plans unless you edit its answers.
2. **Confirm** the detected model type: classification, forecasting, RAG chatbot, object detection, and so on.
3. **Answer up to 8 quick questions** (about 2 minutes) about data, labels, experience, deployment target, latency, cloud, budget and privacy. Most questions offer "Not sure": the plan then picks a sensible default and lists what it assumed.
4. **See the answer at a glance:** the recommended approach, estimated monthly cost, whether you need a GPU, and your first 3 steps. Each has a **Why this?** that traces it back to your answers, and a **confidence** rating says how well the plan fits what you described (and what would firm it up). It never claims to predict model accuracy.
   - **Edit answers** in place: change any answer and the plan rebuilds immediately, keeping your checklist progress.
   - **Compare approaches**: the starter, standard and advanced approach side by side, with GPU needs, running cost and main tools.
   - **Keyboard shortcuts**: `J`/`K` for the next and previous step, `A` to edit answers, `C` to compare, `S` to share, `?` for the full list.
5. **Follow a personalized 9-step plan** with checklists, copy-ready code, glossary tooltips and saved progress. Each step has a rough time estimate, and finishing a step's checklist marks it done.
6. **See your tech stack and infrastructure**: recommended approach, an architecture diagram (what builds the model, what uses it, and the monitoring loop back to training), what each part of the stack is for, cost estimate, and concrete services for AWS, Google Cloud, Azure or a self-hosted setup.
7. **Share or export:**
   - **Share** gives you a link that recreates the plan, optionally with checklist progress, for a teammate or another device.
   - **Save as PDF** gives you a printable copy.
   - **Markdown** exports the plan as a text file.

The left sidebar (collapsible; a slide-out drawer on mobile) gives quick access to:

- **Search and commands** (Ctrl+K / Cmd+K, or `/`): finds guides, model types, lessons, cloud pages and glossary terms as you type, on every page. It also runs commands: on a plan, jump to any step, share, export, edit answers or compare approaches; anywhere, start a new plan, open a saved plan or switch theme.

- **New plan** and **Build your model**: the guided flow above.
- **My plans** and **Recents**: every plan is saved in your browser with its checklist progress.
- **Guides** (`/guides/`): long-form walkthroughs of real projects (a spam filter, churn prediction, a chatbot over PDFs), start to finish, with code.
- **Model library** (`/models/`): a page for each model type, with three ways to build it, metrics, data needs, example code and pitfalls.
- **Training basics** (`/training/`): one page per lesson on splits, overfitting, fine-tuning vs prompting, compute and metrics.
- **Cloud comparison** (`/clouds/`): the matching service on AWS, Google Cloud, Azure and open-source, side by side, plus a page per cloud.
- **Glossary** (`/glossary/`): searchable plain-English definitions.

The Learn pages, About, Contact and the privacy policy are real pages (not `#/` app routes), so search engines can read them. Old `#/models`-style links redirect to them.

## Supported model types

Tabular classification · Regression · Time-series forecasting · Text classification · Image classification · Object detection · LLM assistant / RAG chatbot · Recommendation · Anomaly detection · Speech & audio

## Run it

It's a static site with no backend. Everything runs in the browser. A small Node script (no dependencies) builds the publishable site into `_site/`:

```bash
npm run build                                   # or: node scripts/build-site.js
python3 -m http.server 8000 --directory _site   # then visit http://localhost:8000
```

The build copies the app (`index.html`, `css/`, `js/`, `fonts/`, `ads.txt`) and generates from `js/knowledge.js`:
- a page per model type, lesson and cloud, plus the glossary, About, Contact, privacy policy and a 404 page
- the learning path (`/learning-path/`): lessons and guides in order, with what you've opened ticked off (kept in your browser)
- `sitemap.xml`, `robots.txt` and `search-index.json` (what the search box can find)
- `js/kb-lite.js`: the model names, icons and glossary that Learn pages need, so they don't load the full knowledge base
- titles, descriptions, canonical URLs and link-preview (Open Graph) tags for every page

All pages share the sidebar and footer from `index.html` (between the `shell:` markers). Every CSS/JS link gets the commit ID added (e.g. `js/app.js?v=3ab6d7c`), so browsers never mix a new page with old cached files.

### Tests

```bash
npm test             # unit tests: engine, detection benchmarks, share links, ads, generated pages, design, contrast, font and voice rules (node --test)
npm install          # first time only, for the browser tests
npx playwright install chromium   # first time only
npm run test:e2e     # browser tests (Playwright): builds the site, then serves _site/ on port 4173
```

The browser tests in `tests/e2e/` cover:
- every sidebar page, the Learn pages, old `#/` links, the back button and the theme switch
- the full build flow, with saved progress, Recents and My plans
- the detection questions
- no horizontal scrolling on any page at 1366, 1024 and 390 pixels wide
- the mobile drawer
- share links opened in a fresh browser
- the print/PDF view
- ads staying off
- accessibility: automated WCAG 2.1 AA checks (axe) on every page and app screen in light and dark themes, plus keyboard and screen-reader behaviour (skip link, tabs, menus, tooltips)

Any JavaScript or console error fails a test. To use an existing Chromium install instead, set `CHROMIUM_PATH=/path/to/chromium`.

### Deployment

`.github/workflows/pages.yml` runs both test suites on every pull request and push. On `main`, it then builds the site and publishes `_site/` to GitHub Pages, but only if both suites pass. When the browser tests fail, the Playwright report, with screenshots and traces, is attached to the workflow run.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

#### Custom domain
The site is served at `sayhellomodel.com`. The domain is registered at Cloudflare, and its DNS points at GitHub Pages:
- `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `AAAA` records for `@`: `2606:50c0:8000::153` to `2606:50c0:8003::153`
- `CNAME` for `www`: `hitman449.github.io`
- `TXT` for `_github-pages-challenge-hitman449`: GitHub's domain verification. **Keep it**, because it stops other GitHub accounts from claiming the domain.

Keep every record set to **DNS only** (grey cloud), so GitHub can issue the HTTPS certificate. The domain is set in **Settings → Pages → Custom domain**, with **Enforce HTTPS** on. Because the site is published by Actions, no `CNAME` file is needed. `www.sayhellomodel.com` and the old `hitman449.github.io/hello-model/` address both redirect to it.

## Ads (Google AdSense)

AdSense support is built in but **switched off** until you add your own IDs. While the placeholder IDs are in place, no Google script loads and no ad boxes appear.

1. Done: the site uses the custom domain `sayhellomodel.com`. AdSense won't approve a `*.github.io` address. Apply with `sayhellomodel.com`.
2. Sign up at https://adsense.google.com, add your domain and get your publisher ID (`ca-pub-` plus 16 digits).
3. In `js/ads.js`, set `client` to your publisher ID, and set each entry in `slots` to an ad unit ID from **Ads → By ad unit**:
   - `home`: below the main card on the home page
   - `plan`: below the step-by-step guide
   - `learn`: at the bottom of the Learn pages
4. In `ads.txt`, replace `pub-XXXXXXXXXXXXXXXX` with your ID. AdSense reads it from the root of your domain.
5. In AdSense, go to **Privacy & messaging** and turn on the consent message for the EEA, the UK and Switzerland. It's served by the same AdSense script, so no code changes are needed.

Ads load lazily, only in slots that are on screen. The privacy policy is at `#/privacy` and linked from the footer; review it before going live.

## Project layout

| Path | Purpose |
|---|---|
| `index.html` | The app (screens: describe → detect → questions → plan, and My plans), plus the shared sidebar and footer |
| `css/styles.css` | Styles, light/dark themes, responsive layout; font and color tokens at the top (see `DESIGN.md`) |
| `VOICE.md` | How the site writes: voice, rules, terminology (American English); `docs/copy/` holds the copy inventories (before, after and why) |
| `DESIGN.md` | The design system: colours, type scale, spacing, icons, tap targets, loading rules |
| `js/knowledge.js` | Knowledge base: use cases, questions, cloud infrastructure catalog, training lessons, glossary |
| `js/engine.js` | Pure logic: requirement classification, approach/tier selection, infra & serving choice, plan + Markdown export |
| `js/ads.js` | AdSense config (publisher and slot IDs) and lazy ad loading; off until real IDs are set |
| `js/shell.js` | Shared by every page: sidebar, Recents, light/dark theme, glossary tooltips, site search box |
| `js/search.js` | Site search ranking (the index is `search-index.json`, generated by the build) |
| `js/app.js` | The app: hash routing (`#/build`, `#/plans`, `#/share/…`, `#/start/<model>`, `#/open/<plan>`, `#/new`), wizard, saved plans |
| `js/page.js` | Learn pages: code copy buttons, glossary search, ads |
| `js/icons.js` | The line icon set (one per model type, plus a few interface icons), shared by the app, the Learn pages and the build |
| `fonts/` | Self-hosted web fonts, subset by `scripts/subset-fonts.py` from the full files in `fonts-src/` (SIL Open Font License) |
| `js/diagram.js` | Draws the plan's architecture diagram as SVG, laid out for the width it has |
| `js/widgets/*.js` | Interactive lesson examples (splits, overfitting, learning rate, precision/recall), each loaded only when scrolled near |
| `scripts/build-site.js` | Builds `_site/`: generated pages, sitemap, robots.txt, asset versions |
| `scripts/pages.js` | Hand-written pages: About, Contact, privacy policy |
| `scripts/guides.js` | The long-form guides, one real project each |
| `tests/*.test.js` | Engine, ads, detection-quality and generated-site tests (`node --test tests/*.test.js`) |
| `tests/e2e/*.spec.js` | Browser tests (Playwright) |
| `tests/fixtures/requirements-*.json` | Example descriptions with the expected model type, used to benchmark detection |

## Extending

To add a new model type, add an entry to `USE_CASES` in `js/knowledge.js` with keywords, models per tier (`starter` / `standard` / `advanced`), code and evaluation tips. Wrap jargon in `{{term}}` and add the term to `GLOSSARY`. The tests check that every term has a definition. The build gives the new model type its own page and adds it to the sitemap automatically.

To add a guide, add an entry to `scripts/guides.js` with the model type it belongs to and its content as blocks (paragraphs, headings, lists, code, tips). It gets its own page under `/guides/`, a link from its model page and the home page, and a sitemap entry. Run any code in a guide before publishing it.
