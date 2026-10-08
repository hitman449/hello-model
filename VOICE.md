# Hello Model voice

How Hello Model writes. Every string on the site follows this: buttons, messages, plan content, guides and page descriptions. `DESIGN.md` covers how things look; this covers what they say.

## The voice in one line

A knowledgeable colleague who explains things plainly: confident, precise and calm. Never cute, never hyped, never condescending.

## Principles

1. **Clear before clever.** Say exactly what something is or does. If a sentence needs rereading, rewrite it.
2. **Mature is not jargon.** Write for a smart reader who is new to machine learning. Use the real term when it matters, and explain it once (glossary tooltip or "What do these words mean?").
3. **Specific over general.** Numbers, named tools and concrete outcomes. "About 23 hours of focused work", not "a little while".
4. **Calm, not excited.** No exclamation marks, no "Well done!", no "Awesome". Report facts: "Step 3 complete."
5. **Honest about uncertainty.** Estimates say they're estimates. Detection says "Likely" or "Strong match", never a false "100%". Don't promise outcomes ("Your model is built") the site can't know.
6. **Respect the reader's time.** Main point first. Short sentences. One idea per sentence.

## Rules

**Spelling:** American English (labeled, optimize, behavior, color, personalized).

**Case:** Sentence case for everything: headings, buttons, labels, menu items, tabs ("Tech stack and infrastructure", not "Tech Stack & Infrastructure"). Product and tool names keep their own case (AWS, scikit-learn, Vertex AI).

**Person and voice:** Second person ("your plan"), active voice ("We assumed a small dataset", not "A small dataset was assumed"). "We" is Hello Model; use it sparingly, for things the site decided.

**Buttons:** Start with a verb and say what happens: "Create plan", "Copy link", "Save as PDF", "Use this model type". Avoid "OK", "Submit", "Click here".

**Arrows:** Only for moving through a sequence: "← Previous", "Next: Build a baseline →", "← Back". Never decorative arrows on other buttons or links.

**Messages after an action** (toasts): State what happened, in past tense or as a fact: "Copied", "Step 3 complete. 6 remaining.", "Plan saved to My plans."

**Errors:** Say what went wrong and what to do next, without apology or blame: "This share link is incomplete. Ask the sender to copy it again."

**Empty states:** Say what will appear here and how to start: "No plans yet. Plans you create are saved here, in this browser." plus one button.

**Questions and labels:** Questions end with a question mark; labels have no colon at the end of a heading ("Or start from an example", not "Or start from an example:"). A colon is fine before an inline value ("In plain words: …").

**Numbers:** Numerals for all counts ("3 steps", "1,000 rows"). Thousands separators. Ranges with an en dash and no spaces ("$100–$2,000", "2–4 weeks"). "Under" and "over" instead of < and > in prose ("under 100 ms"). Units: ms, seconds, minutes, hours, days.

**Punctuation:** Curly quotes (“ ” and ’). Em dashes sparingly; prefer a period or a colon. Ellipsis only for text that really continues. No emoji in the interface or content.

**Estimates:** Label them: "About 23 hours of focused work (estimate)", "≈ $0–30 per month".

## Terminology

Use one term per concept, everywhere.

| Use | For | Don't use |
|---|---|---|
| **plan** | What the app makes for you: summary, steps, tech stack | guide (for the plan), roadmap, project |
| **step** | One of the plan's stages (9 of them) | stage, phase, lesson |
| **task** | One checklist item inside a step | to-do, item, check |
| **checklist** | The list of tasks in a step | — |
| **model type** | Tabular classification, Forecasting, RAG chatbot… | use case, kind of model, category |
| **approach** | Starter, standard or advanced recommendation | tier, level |
| **your idea / your description** | What the person typed on the home page | requirement, use case, prompt |
| **guide** | The long-form, real-project articles under Guides | tutorial, walkthrough (as a name) |
| **lesson** | The short articles under Training basics | module, chapter |
| **learning path** | The ordered route through lessons and guides | course, curriculum |
| **My plans** | Plans saved in this browser | dashboard, history |
| **example plan** | The bakery plan anyone can open | demo, sample |
| **tech stack** | The tools in a plan | stack (alone), toolchain |
| **estimate** | Any time or cost figure | guess, approx. |

## Examples

| Before | After | Why |
|---|---|---|
| Last one! | Last question | No exclamation marks |
| Step 3 done! 6 to go. | Step 3 complete. 6 remaining. | Calm, factual |
| That's every step done. Your model is built. Well done! | All 9 steps complete. | Don't claim what we can't know |
| Get my plan → | Create plan | Verb first, no decorative arrow |
| Here's what we think you're building | Recommended model type | Says what it is |
| 100% match | Strong match | Honest about certainty |
| Please describe your use case in a sentence or two… | Describe your idea in a sentence or two. | One term ("idea"), no pleading |
| Copied ✓ | Copied | No symbols as words |
