# Copy inventory 1: app screens

Batch 1 of the copy rewrite (`VOICE.md`). Covers the app: home, model detection, questions, plan, sharing, My plans, sidebar and page metadata. Plan content (steps, model types) and the Learn pages are batch 2.

## Page and sidebar

| Where | Before | After | Problem |
|---|---|---|---|
| Page title | Hello Model: build your own AI model, step by step | Hello Model: plan your machine learning project | Says what you actually get |
| Meta description | Describe what you want an AI model to do and get an interactive, step-by-step guide with the right tech stack and infrastructure. | Describe what you want a model to do and get a step-by-step plan: the right model, tools, infrastructure and a cost estimate. Free, and it stays in your browser. | "Guide" means something else here; adds the privacy promise |
| Sidebar | Build your model | Create a plan | It creates a plan, not a model |
| Sidebar | Recents | Recent plans | Says what's listed |
| Sidebar | Light / dark theme | Switch theme | Verb first |

## Home

| Before | After | Problem |
|---|---|---|
| Build your own AI model, step by step. | Plan your machine learning project in three minutes. | Generic; doesn't say what you get |
| Tell us what you want a model to do. We'll turn it into a simple, personalised plan. | Describe what you want to predict or automate. You’ll get a step-by-step plan with the right model, tools and a cost estimate. | British spelling; vague |
| e.g. I run an online store and want to predict which customers are likely to stop buying from us next month, using our order history in a CSV. | For example: I run an online store and want to predict which customers will stop buying next month, using our order history. | Shorter |
| Get my plan → | Create plan | Verb first, no decorative arrow |
| or see an example plan | View an example plan | Lowercase fragment |
| Or start from an example: | Or start from an example | No colon on a label |
| Follow your plan, step by step | Work through your plan | Repeats the headline |
| Not sure what kind of model you need? Browse the model library → | Not sure which model type you need? Browse the model library | One term ("model type"), no arrow |
| Please describe your use case in a sentence or two… | Describe your idea in a sentence or two. | "Use case" isn't used anywhere else; pleading |
| Sounds like **Text Classification** | Likely model type: **Text Classification** | Casual |
| Tip: say what data you have, like photos, sales history or emails. | Add what data you have, such as photos, sales records or emails, to get a clearer match. | Says why |
| Could be X or Y. We'll ask which. | Could be X or Y. You’ll choose next. | Clearer |
| See the full example plan → | View the full example plan | No arrow |

## Model detection

| Before | After | Problem |
|---|---|---|
| ← Edit description | ← Edit your description | |
| Here's what we think you're building | Recommended model type | Chatty heading |
| 100% match | Strong match / Likely match / Possible match | False precision from keyword matching |
| Because you mentioned: | Based on: | Shorter |
| Yes, continue → | Use this model type | Says what happens |
| Not quite right? Pick another: | Or choose a different model type | Casual, trailing colon |
| Or pick a model type directly: | Or choose a model type | |
| None of these? Pick another: | None of these? Choose another model type | |
| Your description fits more than one kind of model. Pick the one that matches your goal: | Your description fits more than one model type. Choose the one closest to your goal. | One term, no colon |
| Let's narrow it down | What will your model work with? | Says nothing |
| We couldn't tell from your description. What will your model work with? | Your description didn’t point to one model type. Choose the kind of data you have. | |

## Questions

| Before | After | Problem |
|---|---|---|
| Last one! | Last question | Exclamation mark |
| About 2 min left | About 2 minutes left | Spell out units |
| Examples = rows, documents, images or recordings that look like what the model will see. | Examples are the rows, documents, images or recordings the model will learn from, like the ones it will see later. | Shorthand "=" |
| A little (under ~1,000) / A fair amount (1k – 100k) / Lots (over 100k) | A little (under 1,000) / A moderate amount (1,000–100,000) / A lot (over 100,000) | Mixed notation |
| Custom training and bigger models become worthwhile. | Training your own model, including larger ones, becomes worthwhile. | |
| e.g. 'spam' / 'not spam' | such as “spam” or “not spam” | Straight quotes, slash |
| Partially / messy | Partly, or messy | Slash |
| We'll add a labeling + cleanup step. | We’ll add a step to label and clean the data. | "+" as a word |
| What's your team's ML experience? | How much machine learning experience does your team have? | Abbreviation |
| Be honest — this changes how much we automate for you. | This decides how much of the setup the plan hands to managed tools. | Says what it does |
| This drives the serving architecture. | This shapes how the model is served. | Jargon |
| Online API / web app · Requests come in, answers go out in real time. | Online, behind an API or web app · Answers each request in real time. | Slashes |
| Batch / scheduled · Score a whole dataset nightly or weekly. | On a schedule (batch) · Processes a whole dataset nightly or weekly. | |
| On device / edge | On a device (edge) | |
| How fast must each prediction be? | How fast does each prediction need to be? | |
| Instant (< 100 ms) / Interactive (< 2–3 s) | Instant (under 100 ms) / Interactive (under 3 seconds) | Symbols in prose |
| Minutes or hours is fine. | Minutes or hours are fine. | Grammar |
| Pick what your company already uses — it's usually the easiest path. | Choose what your company already uses. It’s usually the easiest path. | Dash |
| Rough is fine. We'll size compute accordingly. | A rough figure is fine. The plan sizes computing power to match. | Jargon |
| Minimal (< $100) / Moderate ($100 – $2,000) / Enterprise (> $2,000) | Minimal (under $100) / Moderate ($100–$2,000) / Enterprise (over $2,000) | Symbols, spaced dash |
| We'll keep costs minimal; you can scale up later. | We’ll keep costs minimal. You can scale up later. | |
| We'll add privacy & compliance steps. / We'll play it safe and include privacy steps. | We’ll add privacy and compliance steps. / We’ll include privacy steps to be safe. | Ampersand, idiom |

## Plan

| Before | After | Problem |
|---|---|---|
| Build a plan for your idea → | Create your own plan | Verb first, no arrow |
| Download as Markdown / Start over | Download Markdown / Start a new plan | |
| Your plan at a glance | Plan summary | Shorter |
| GPU needed? | GPU needed | Label, not a question |
| Yes, for training and/or serving (see Tech stack & infrastructure). | Yes, for training, serving or both. See Tech stack and infrastructure. | "and/or", ampersand |
| Your first 3 steps | First 3 steps | |
| You weren't sure about one thing, so we assumed: | You answered “Not sure” to 1 question, so we assumed: | Precise |
| Change answers | Change these answers | |
| Step-by-step guide (tab) | Steps | "Guide" is the Learn section |
| Tech stack & infrastructure (tab) | Tech stack and infrastructure | Ampersand |
| 1 of 9 steps done · 3/30 tasks | 1 of 9 steps complete · 3 of 30 tasks | Notation |
| (a rough guide) | (estimate) | One term |
| You've finished every step. Well done! | All 9 steps complete. | Exclamation, pat on the head |
| Finish → (then "Done. Export the plan to share it with your team." in a disabled button) | Share this plan (opens sharing) | Text in a dead button |
| Step 1 done! 8 to go. | Step 1 complete. 8 remaining. | Exclamation |
| Step 5 done. You're halfway there! | Step 5 complete. You’re halfway through the plan. | Exclamation |
| That's every step done. Your model is built. Well done! | All 9 steps complete. | Claims what we can't know |
| Copied ✓ | Copied | Symbol as a word |

## Sharing, My plans, printing

| Before | After | Problem |
|---|---|---|
| It's saved to their My plans when they open it. | Opening it saves a copy to their My plans. | Clearer |
| This share link is broken or incomplete. | This share link is incomplete. Ask the sender to copy it again. | Says what to do |
| My ML plan — Hello Model | My machine learning plan · Hello Model | Abbreviation |
| No plans yet. · Create your first plan → | No plans yet. Plans you create are saved here, in this browser. · Create a plan | Says what appears and where |
| updated 10/8/2026 | Updated 10/8/2026 | Sentence case |
| 🧠 Hello Model · ML plan (printout) | Hello Model · Machine learning plan | No emoji |
| Heads-up (printout) | Watch out for | Clearer |

## Left for batch 2

Model type names (in Title Case, such as "Time-Series Forecasting"), taglines and the plan's step text live in `js/knowledge.js` and `js/engine.js`. They're shown on these screens too, but they change with the plan content and Learn pages so that the names stay consistent everywhere.
