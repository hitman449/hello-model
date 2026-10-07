# Roadmap

Ideas for improving Hello Model, most valuable first. Nothing here is scheduled yet.

## 1. Understand descriptions better
Detection today matches keywords, so unusual phrasing falls through to "pick a model type yourself".
- **Quick win:** more keywords and synonyms; ask a follow-up question when two model types score about the same.
- **Real fix:** send the description to Claude through a small serverless function (e.g. a Cloudflare Worker) that keeps the API key off the page. Use it to classify the use case and tailor the plan's wording. Needs an Anthropic API key; costs a fraction of a cent per plan.

## 2. Get found by search engines (key for AdSense income)
Pages are rendered in the browser behind `#/` URLs, which search engines index poorly.
- Generate real static pages for the Model library, Training basics and Glossary (e.g. `/models/image-classification/`).
- Add a sitemap, per-page titles and descriptions, and Open Graph tags for link previews.
- Move to a custom domain (also required for AdSense approval).

## 3. Shareable plans
Plans are saved only in one browser.
- Encode a plan's answers in the URL so it can be shared or opened on another device, with no backend.
- Add "Download as PDF" alongside the Markdown export.

## 4. Runnable code
- Add an "Open in Colab" button to each code snippet so beginners can run it in one click.

## 5. Keep content trustworthy
- Show a "last reviewed" date and a link to the official docs for each cloud service.
- Review the cloud comparison, cost estimates and model names regularly; they change often.

## 6. Protect what's built
- Run the Playwright browser checks (layout, saved plans, no horizontal scrolling) in the GitHub Actions workflow.
- Do a full accessibility pass: keyboard navigation, screen readers, colour contrast.
- Optionally add privacy-friendly analytics (e.g. GoatCounter or Plausible) and update the privacy policy to match.
