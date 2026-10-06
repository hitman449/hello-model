# hello-model

**Hello Model** is an interactive website that teaches people how to build an AI/ML model for their own use case.

1. **Describe** what you want the model to do, in plain words.
2. **Confirm** the detected model type: classification, forecasting, RAG chatbot, object detection, and so on.
3. **Answer 8 quick questions** about data, labels, experience, deployment target, latency, cloud, budget and privacy.
4. **Follow a personalised 9-step guide** with checklists, copy-ready code, glossary tooltips and saved progress.
5. **See your tech stack and infrastructure**: recommended approach, architecture diagram, cost estimate, and concrete services for AWS, Google Cloud, Azure or a self-hosted setup.
6. **Export** the whole plan as Markdown to share with your team.

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

To publish it, enable **GitHub Pages** on this repo (Settings → Pages → deploy from branch, root folder).

## Project layout

| Path | Purpose |
|---|---|
| `index.html` | Page structure (4 screens: describe → detect → questions → plan) |
| `css/styles.css` | Styles, light/dark themes, responsive layout |
| `js/knowledge.js` | Knowledge base: use cases, questions, cloud infrastructure catalog, glossary |
| `js/engine.js` | Pure logic: requirement classification, approach/tier selection, infra & serving choice, plan + Markdown export |
| `js/app.js` | UI controller: wizard, stepper, checklists, tooltips, persistence |
| `tests/engine.test.js` | Engine tests (`node --test tests/*.test.js`) |

## Extending

To add a new model type, add an entry to `USE_CASES` in `js/knowledge.js` with keywords, models per tier (`starter` / `standard` / `advanced`), code and evaluation tips. Wrap jargon in `{{term}}` and add the term to `GLOSSARY`. The tests check that every term has a definition.
