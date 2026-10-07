# hello-model

**Hello Model** is an interactive website that teaches people how to build an AI/ML model for their own use case.

Live at **https://sayhellomodel.com**.

1. **Describe** what you want the model to do, in plain words.
2. **Confirm** the detected model type: classification, forecasting, RAG chatbot, object detection, and so on.
3. **Answer 8 quick questions** about data, labels, experience, deployment target, latency, cloud, budget and privacy.
4. **Follow a personalised 9-step guide** with checklists, copy-ready code, glossary tooltips and saved progress.
5. **See your tech stack and infrastructure**: recommended approach, architecture diagram, cost estimate, and concrete services for AWS, Google Cloud, Azure or a self-hosted setup.
6. **Share or export:**
   - **Share** gives you a link that recreates the plan, optionally with checklist progress, for a teammate or another device.
   - **Save as PDF** gives you a printable copy.
   - **Markdown** exports the plan as a text file.

The left sidebar (collapsible; a slide-out drawer on mobile) gives quick access to:

- **New plan** and **Build your model**: the guided flow above.
- **My plans** and **Recents**: every plan is saved in your browser with its checklist progress.
- **Model library**: a page for each model type, with three ways to build it, metrics, data needs and pitfalls.
- **Training basics**: short lessons on splits, overfitting, fine-tuning vs prompting, compute and metrics.
- **Cloud comparison**: the matching service on AWS, Google Cloud, Azure and open-source, side by side.
- **Glossary**: searchable plain-English definitions.

## Supported model types

Tabular classification · Regression · Time-series forecasting · Text classification · Image classification · Object detection · LLM assistant / RAG chatbot · Recommendation · Anomaly detection · Speech & audio

## Run it

It's a static site with no build step and no backend. Everything runs in the browser.

```bash
# open directly
open index.html
# or serve locally
python3 -m http.server 8000   # then visit http://localhost:8000
```

### Tests

```bash
npm test             # unit tests: engine, detection benchmarks, share links, ads (node --test)
npm install          # first time only, for the browser tests
npx playwright install chromium   # first time only
npm run test:e2e     # browser tests (Playwright) against the site served on port 4173
```

The browser tests in `tests/e2e/` cover:
- every sidebar page, the back button and the theme switch
- the full build flow, with saved progress, Recents and My plans
- the detection questions
- no horizontal scrolling on any page at 1366, 1024 and 390 pixels wide
- the mobile drawer
- share links opened in a fresh browser
- the print/PDF view
- ads staying off

Any JavaScript or console error fails a test. To use an existing Chromium install instead, set `CHROMIUM_PATH=/path/to/chromium`.

### Deployment

`.github/workflows/pages.yml` runs both test suites on every pull request and push. On `main`, it then publishes the site to GitHub Pages, but only if both suites pass. When the browser tests fail, the Playwright report, with screenshots and traces, is attached to the workflow run. When publishing, it adds the commit ID to every CSS and JS link (e.g. `js/app.js?v=3ab6d7c`), so browsers never mix a new page with old cached files.

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
| `index.html` | Page structure (4 screens: describe → detect → questions → plan) |
| `css/styles.css` | Styles, light/dark themes, responsive layout |
| `js/knowledge.js` | Knowledge base: use cases, questions, cloud infrastructure catalog, training lessons, glossary |
| `js/engine.js` | Pure logic: requirement classification, approach/tier selection, infra & serving choice, plan + Markdown export |
| `js/ads.js` | AdSense config (publisher and slot IDs) and lazy ad loading; off until real IDs are set |
| `js/app.js` | UI controller: sidebar and hash routing (`#/build`, `#/plans`, `#/models`, `#/training`, `#/clouds`, `#/glossary`), wizard, saved plans, tooltips |
| `tests/*.test.js` | Engine, ads and detection-quality tests (`node --test tests/*.test.js`) |
| `tests/fixtures/requirements-*.json` | Example descriptions with the expected model type, used to benchmark detection |

## Extending

To add a new model type, add an entry to `USE_CASES` in `js/knowledge.js` with keywords, models per tier (`starter` / `standard` / `advanced`), code and evaluation tips. Wrap jargon in `{{term}}` and add the term to `GLOSSARY`. The tests check that every term has a definition.
