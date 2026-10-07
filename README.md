# hello-model

**Hello Model** is an interactive website that teaches people how to build an AI/ML model for their own use case.

1. **Describe** what you want the model to do, in plain words.
2. **Confirm** the detected model type: classification, forecasting, RAG chatbot, object detection, and so on.
3. **Answer 8 quick questions** about data, labels, experience, deployment target, latency, cloud, budget and privacy.
4. **Follow a personalised 9-step guide** with checklists, copy-ready code, glossary tooltips and saved progress.
5. **See your tech stack and infrastructure**: recommended approach, architecture diagram, cost estimate, and concrete services for AWS, Google Cloud, Azure or a self-hosted setup.
6. **Export** the whole plan as Markdown to share with your team.

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

### Deployment

`.github/workflows/pages.yml` runs the tests on every pull request and push. On `main`, it then publishes the site to GitHub Pages, but only if the tests pass. When publishing, it adds the commit ID to every CSS and JS link (e.g. `js/app.js?v=3ab6d7c`), so browsers never mix a new page with old cached files.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Ads (Google AdSense)

AdSense support is built in but **switched off** until you add your own IDs. While the placeholder IDs are in place, no Google script loads and no ad boxes appear.

1. Use a custom domain for the site (Settings → Pages → Custom domain). AdSense won't approve a `*.github.io` address.
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
| `tests/*.test.js` | Engine and ads tests (`node --test tests/*.test.js`) |

## Extending

To add a new model type, add an entry to `USE_CASES` in `js/knowledge.js` with keywords, models per tier (`starter` / `standard` / `advanced`), code and evaluation tips. Wrap jargon in `{{term}}` and add the term to `GLOSSARY`. The tests check that every term has a definition.
