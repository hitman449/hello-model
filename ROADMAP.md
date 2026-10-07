# Roadmap

Ideas for improving Hello Model, most valuable first. Nothing here is scheduled yet.

## 1. Understand descriptions better
- **Done: quick win.**
  - Word-form matching, a larger vocabulary and phrases that rule a model type out.
  - When two model types score about the same, the site asks which is closer.
  - When nothing matches, it asks what kind of data the model will use.
  - Benchmarked in `tests/classify.test.js`. On 40 fresh descriptions it was never tuned against, the old matcher got 22 right and matched nothing for 11. The new one gets 25 right, offers the right answer in a question for 3, asks a data question for 6, and is wrong for 6. The remaining misses need real language understanding.
- **Next: real fix.** Send the description to Claude through a small serverless function (e.g. a Cloudflare Worker) that keeps the API key off the page. Use it to classify the use case and tailor the plan's wording. Needs an Anthropic API key; costs a fraction of a cent per plan.

## 2. Get found by search engines (key for AdSense income)
Pages are rendered in the browser behind `#/` URLs, which search engines index poorly.
- Generate real static pages for the Model library, Training basics and Glossary (e.g. `/models/image-classification/`).
- Add a sitemap, per-page titles and descriptions, and Open Graph tags for link previews.
- Move to a custom domain (also required for AdSense approval).

## 3. Shareable plans: done
- **Share:** creates a link (`#/share/<token>`) holding the model type, answers, description and, optionally, checklist progress. Opening it saves the plan to the recipient's My plans; opening the same link again reuses that copy. The token sits after `#`, so it is never sent to a server.
- **Save as PDF:** a print-ready version of the whole plan, with every step expanded, all code and checklist ticks, saved through the browser's print dialog.

## 4. Runnable code
- Add an "Open in Colab" button to each code snippet so beginners can run it in one click.

## 5. Keep content trustworthy
- Show a "last reviewed" date and a link to the official docs for each cloud service.
- Review the cloud comparison, cost estimates and model names regularly; they change often.

## 6. Protect what's built
- Run the Playwright browser checks (layout, saved plans, no horizontal scrolling) in the GitHub Actions workflow.
- Do a full accessibility pass: keyboard navigation, screen readers, colour contrast.
- Optionally add privacy-friendly analytics (e.g. GoatCounter or Plausible) and update the privacy policy to match.
