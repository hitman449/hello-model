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

`.github/workflows/pages.yml` runs the tests on every pull request and push. On `main`, it then publishes the site to GitHub Pages, but only if the tests pass.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Project layout

| Path | Purpose |
|---|---|
| `index.html` | Page structure (4 screens: describe → detect → questions → plan) |
| `css/styles.css` | Styles, light/dark themes, responsive layout |
| `js/knowledge.js` | Knowledge base: use cases, questions, cloud infrastructure catalog, training lessons, glossary |
| `js/engine.js` | Pure logic: requirement classification, approach/tier selection, infra & serving choice, plan + Markdown export |
| `js/app.js` | UI controller: sidebar and hash routing (`#/build`, `#/plans`, `#/models`, `#/training`, `#/clouds`, `#/glossary`), wizard, saved plans, tooltips |
| `tests/engine.test.js` | Engine tests (`node --test tests/*.test.js`) |

## Extending

To add a new model type, add an entry to `USE_CASES` in `js/knowledge.js` with keywords, models per tier (`starter` / `standard` / `advanced`), code and evaluation tips. Wrap jargon in `{{term}}` and add the term to `GLOSSARY`. The tests check that every term has a definition.
