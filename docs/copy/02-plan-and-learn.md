# Copy inventory 2: plan content and Learn pages

Batch 2 of the copy rewrite (`VOICE.md`). Covers everything a plan says (`js/knowledge.js`, `js/engine.js`) and the Learn pages: guides, the model library, lessons, the interactive examples, the learning path, About, Contact and Privacy.

## Applied everywhere

| Rule | Before | After | Count |
|---|---|---|---|
| American spelling | optimising, organise, behaviour, summarise, analyse, catalogue, personalised, initialised, pseudonymise… | optimizing, organize, behavior, summarize, analyze, catalog, personalized, initialized, pseudonymize… | 25 |
| "and", not "&", in prose and titles | Define the problem & success · Data & prep · privacy & compliance | Define the problem and success · Data and prep · privacy and compliance | 16 |
| Curly apostrophes and quotes | don't · 'works on my machine' · \"ham\" | don’t · “works on my machine” · “ham” | about 175 |
| No emoji | 🔒 Sensitive data · 📘 Full walkthrough · 💡 (Markdown tips) | Sensitive data · Full walkthrough · **Tip:** | 4 |
| Arrows only for sequences | Get a personalised plan → · Build your own model → · Start with lesson 1 → | Create a plan for your project · Create a plan · Start with lesson 1 | 6 |

Code samples are left exactly as they were: their apostrophes stay straight so they still copy and run cleanly. The detection keyword lists keep British spellings on purpose, so a description written in British English still finds its model type.

## Model type names (sentence case)

| Before | After |
|---|---|
| Tabular Classification | Tabular classification |
| Regression (Predict a Number) | Number prediction (regression) |
| Time-Series Forecasting | Time-series forecasting |
| Text Classification | Text classification |
| Image Classification | Image classification |
| Object Detection | Object detection |
| LLM Assistant / RAG Chatbot | LLM assistant (RAG chatbot) |
| Recommendation System | Recommendation system |
| Anomaly Detection | Anomaly detection |
| Speech & Audio | Speech and audio |

Mid-sentence, names start lowercase ("Your time-series forecasting plan"); acronyms such as LLM stay capitalized.

## Rewritten by hand

| Where | Before | After |
|---|---|---|
| Plan step 2 | A reproducible environment saves hours of 'works on my machine' pain later. | A reproducible environment prevents hours of “works on my machine” problems later. |
| Plan step 5 tip | If the baseline is already good enough for the business, ship it! You can improve later. | If the baseline already meets the business goal, deploy it and improve later. |
| Plan step 6 tip | Change one thing at a time and log every run. Future-you will thank you. | Change one thing at a time and log every run, so you can tell which change made the difference. |
| Plan step 6 | A proven, well-documented approach with a great accuracy/effort ratio. | A proven, well-documented approach with strong accuracy for the effort. |
| Plan step 6 code | Quick-start / zero-shot version (also a great baseline) | Quick-start / zero-shot version (also a strong baseline) |
| Plan step 7 | Common pitfalls for this use case | Common pitfalls for this model type |
| Starter approach | Tries dozens of models for you. Great when you are new or want a strong result fast. | Tries dozens of models for you. A good choice when you’re new or need a strong result quickly. |
| Forecasting baseline | … Surprisingly hard to beat. | … It is often hard to beat. |
| Text classification | Great for prototyping or < 100 examples. | Good for prototypes or fewer than 100 examples. |
| Labeling tip | Use a pretrained model to pre-annotate and just correct it. | Use a pretrained model to pre-annotate, then correct its labels. |
| RAG baseline | Just put a few documents in the prompt… | Put a few documents in the prompt… |
| Churn labels | (e.g. 'cancelled_subscription = true') | (for example, a “canceled subscription” flag) |
| Recommendation baseline | Many systems barely beat this — measure it! | Many systems barely beat this, so measure it. |
| Glossary: data leakage | …results look great in testing and fail in reality. | …results look strong in testing and then fail in production. |
| Glossary: logistic regression | A great baseline. | A strong baseline. |
| Glossary: transfer learning | …trained on huge data… | …trained on a very large dataset… |
| Lesson: approach | No training data needed; great for prototypes. · If prompting already reaches your target metric, ship it… | No training data needed, and good for prototypes. · …use it, and collect data for later improvements. |
| Cloud comparison | Just a scheduled Python script, easy to understand · Chroma is great for prototypes | A plain scheduled Python script that’s easy to understand · Chroma suits prototypes |
| RAG guide | …they make great new golden-set entries. | …they make good new golden-set entries. |
| Learning-rate example | Training would take ages. | Training would take far too long. |
| Model and guide pages | Get a personalised plan → · Build a plan for this → | Create a plan for your project · Create a plan for this model type |
| Learning path | You've seen it all. Build your own model → | You’ve visited everything. Create a plan |
| About | …builds a personalised step-by-step guide… | …builds a personalized step-by-step plan… |

## Now checked automatically

`tests/voice.test.js` now builds the whole site and scans the visible text of every page, and generates every model type’s plan across 24 answer combinations. It fails on British spelling, banned phrases, exclamation marks, straight apostrophes, emoji, "&" in step titles, and model type names that aren’t in sentence case.
