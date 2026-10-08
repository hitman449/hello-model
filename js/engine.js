/*
 * Hello Model engine: turns a free-text requirement + answers into a plan.
 * Pure functions, no DOM — runs in the browser and in Node (for tests).
 */
(function (root) {
  const KB = typeof module !== "undefined" && module.exports ? require("./knowledge.js") : root.HM_KB;
  const { USE_CASES, INFRA, EDGE_FORMATS } = KB;

  // Use cases whose "labels" come for free from history or aren't needed.
  const IMPLICIT_LABELS = new Set(["forecasting", "recommendation", "llm-rag", "anomaly-detection", "speech"]);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Common words a trimmed keyword must never turn into ("theme" -> "them" made "sort them" look like topic detection).
  const COMMON_WORDS = new Set("them then than there these those they their where were here have some more make made take done does like also just only very into onto over under about after before again ours yours whom whose what when which while once".split(" "));

  /**
   * Reduce a word to a rough base form so "forecasting", "forecasts" and
   * "forecast" all match. Deliberately simple: it only has to agree with itself.
   */
  function stem(word) {
    let w = word.toLowerCase();
    if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
    // Plural first, so "recordings" and "recording" both become "record".
    if (w.length > 4 && /(ss|x|ch|sh)es$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
    else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
    if (w.length > 3 && w.endsWith("e") && !COMMON_WORDS.has(w.slice(0, -1))) w = w.slice(0, -1);
    return w;
  }

  /** Split text into stemmed word tokens ("X-rays" -> ["x", "ray"]). */
  function tokenize(text) {
    return String(text || "").toLowerCase().replace(/[’']s\b/g, "").split(/[^a-z0-9&]+/).filter(Boolean).map(stem);
  }

  /** True when the token sequence `phrase` appears contiguously in `tokens`. */
  function hasPhrase(tokens, phrase) {
    outer: for (let i = 0; i + phrase.length <= tokens.length; i++) {
      for (let j = 0; j < phrase.length; j++) if (tokens[i + j] !== phrase[j]) continue outer;
      return true;
    }
    return false;
  }

  // Keyword phrases are tokenized once, on first use.
  const phraseCache = new Map();
  const phraseTokens = kw => {
    if (!phraseCache.has(kw)) phraseCache.set(kw, tokenize(kw));
    return phraseCache.get(kw);
  };

  // Below this score a match is a guess from one weak word (e.g. "number"), so we ask instead.
  const MIN_SCORE = 2;

  /** Score every model type against the description. Returns a ranked list. */
  function classify(text) {
    const tokens = tokenize(text);
    const ranked = Object.entries(USE_CASES).map(([id, uc]) => {
      let score = 0;
      const matched = [];
      const seen = new Set(); // "price" and "pricing" share a base form; count it once
      for (const [kw, weight] of Object.entries(uc.keywords)) {
        const key = phraseTokens(kw).join(" ");
        if (!seen.has(key) && hasPhrase(tokens, phraseTokens(kw))) { score += weight; matched.push(kw); seen.add(key); }
      }
      // Phrases that look like a keyword but mean something else (e.g. "hate speech" is text, not audio).
      for (const [kw, weight] of Object.entries(uc.negative || {})) {
        if (hasPhrase(tokens, phraseTokens(kw))) score -= weight;
      }
      return { id, score: Math.max(0, score), matched };
    }).sort((a, b) => b.score - a.score);

    const total = ranked.reduce((s, r) => s + r.score, 0);
    return ranked.map(r => ({ ...r, confidence: total ? r.score / total : 0 }));
  }

  /**
   * Is the top match clear, or should we ask? Returns the use-case ids worth
   * asking about (2-3) when the top scores are close, otherwise an empty list.
   */
  function ambiguousTop(ranked) {
    const top = ranked[0];
    if (!top || top.score < MIN_SCORE) return [];
    const close = ranked.filter(r => r.score > 0 && r.score >= top.score * 0.75).slice(0, 3);
    return close.length > 1 ? close.map(r => r.id) : [];
  }

  /** Decide how ambitious the approach should be. */
  function chooseTier(useCaseId, a) {
    const labelsMissing = !IMPLICIT_LABELS.has(useCaseId) && a.labels === "no";
    if (a.data === "none" || labelsMissing) return "starter";
    if (a.skill === "beginner") return a.data === "large" && a.labels === "yes" ? "standard" : "starter";
    if (a.data === "large" && a.skill === "expert" && a.budget !== "low") return "advanced";
    if (a.data === "small" && a.skill === "intermediate") return "starter";
    return "standard";
  }

  function needsGPU(useCaseId, tier, a) {
    const uc = USE_CASES[useCaseId];
    if (useCaseId === "llm-rag") return a.cloud === "self" && a.privacy === "yes";
    if (!uc.needsGPU) return tier === "advanced" && ["forecasting", "recommendation", "anomaly-detection"].includes(useCaseId) && a.data === "large";
    return tier !== "starter" || ["object-detection", "speech"].includes(useCaseId);
  }

  function chooseServing(useCaseId, tier, a, infra, gpu) {
    const notes = [];
    let serving;
    if (a.deploy === "edge") {
      serving = "On-device: export the model to " + EDGE_FORMATS.split(",")[0] + " or a platform-specific format";
      notes.push("Edge formats: " + EDGE_FORMATS + ".");
      notes.push("Quantize to INT8/FP16 to shrink the model 2–4× and speed it up.");
      if (useCaseId === "llm-rag") notes.push("On-device LLMs are limited to small models (1–8B params) — consider a hybrid: small local model + cloud fallback.");
    } else if (a.deploy === "batch" && useCaseId === "llm-rag") {
      serving = "Scheduled job (" + infra.pipeline + ") that calls the LLM in bulk — e.g. nightly summaries or pre-computed answers";
      notes.push("Many LLM providers offer batch APIs at ~50% lower cost for non-urgent workloads.");
    } else if (a.deploy === "batch") {
      serving = infra.batch;
      notes.push("Write predictions back to your database / warehouse so other systems can use them.");
    } else if (useCaseId === "llm-rag") {
      serving = infra.serveContainer + " running your RAG API; LLM via " + (a.privacy === "yes" && a.cloud === "self" ? infra.llm : (a.cloud === "self" ? "the Claude API" : infra.llm));
      if (gpu) notes.push("A self-hosted LLM needs a GPU with enough memory (e.g. 24 GB for an 8B model, 80 GB for 70B quantized).");
    } else if (gpu && a.latency !== "relaxed") {
      serving = a.budget === "low" ? infra.serveServerless + " (CPU, with a quantized ONNX model)" : infra.serveGPU;
      if (a.budget === "low") notes.push("GPU endpoints cost $300+/mo when always on. On a minimal budget, serve a small quantized model on CPU or use a hosted API.");
    } else if (a.budget === "low") {
      serving = infra.serveServerless;
    } else {
      serving = infra.serveContainer;
    }
    if (a.deploy === "api" && a.latency === "realtime" && /Lambda|Functions|Serverless|Cloud Run \(scales/.test(serving)) {
      notes.push("Serverless can have 'cold starts' of 1–10 s. For < 100 ms latency, keep at least one instance warm (min instances = 1).");
    }
    return { serving, notes };
  }

  function estimateCost(a, gpu, useCaseId) {
    // Batch jobs and on-device models have nothing running between uses, so they cost less than an always-on API.
    const batch = {
      low: gpu ? "≈ $10–100 / month — rent GPUs by the hour for training and scheduled scoring"
               : "≈ $0–30 / month — a scheduled job on serverless or a small VM, CPU only",
      medium: gpu ? "≈ $100–1,000 / month — GPU time only while jobs run, plus storage and monitoring"
                  : "≈ $30–300 / month — scheduled jobs, managed storage and monitoring; nothing runs between jobs",
      high: gpu ? "≈ $1,000+ / month — large scheduled GPU jobs, orchestrated pipelines and full MLOps"
                : "≈ $500+ / month — orchestrated pipelines, a data warehouse, monitoring and dedicated environments"
    };
    const edge = {
      low: "≈ $0–50 / month — train on free or hourly-rented GPUs; predictions run on the devices themselves",
      medium: "≈ $50–500 / month — training compute, model storage and update delivery; predictions run on the devices",
      high: "≈ $1,000+ / month — large-scale training, device fleet management and monitoring"
    };
    const table = a.deploy === "edge" ? edge : a.deploy === "batch" && useCaseId !== "llm-rag" ? batch : {
      low: gpu ? "≈ $10–100 / month — rent GPUs by the hour only for training (~$0.50–1.50/h), serve on CPU or via API"
               : "≈ $0–50 / month — free tiers, serverless scale-to-zero, CPU only",
      medium: gpu ? "≈ $300–2,000 / month — one small always-on GPU (~$500–900/mo) plus storage and monitoring"
                  : "≈ $100–500 / month — a couple of always-on containers, managed database, monitoring",
      high: gpu ? "≈ $2,000+ / month — autoscaling GPU endpoints, multi-zone high availability, full MLOps"
                : "≈ $1,000+ / month — high availability, feature store, pipelines and dedicated environments"
    };
    let cost = table[a.budget] || table.medium;
    if (useCaseId === "llm-rag" && !gpu) cost += ". LLM usage is billed per token — roughly $0.001–0.02 per question depending on model and context size.";
    return cost;
  }

  function architecture(useCaseId, a, infra, serving) {
    if (useCaseId === "llm-rag") {
      return [
        { label: "Your documents", detail: "PDF, wiki, web pages" },
        { label: "Ingestion", detail: "extract → chunk → embed" },
        { label: "Vector DB", detail: infra.vectorDb.split(" or ")[0] },
        { label: "RAG API", detail: "retrieve + prompt LLM" },
        { label: "Users", detail: "chat UI / Slack / app" },
        { label: "Monitoring", detail: "feedback, cost, quality" }
      ];
    }
    const last = a.deploy === "batch" ? { label: "Database / BI", detail: "predictions table" }
      : a.deploy === "edge" ? { label: "Device", detail: "app / camera / browser" }
      : { label: "Your app", detail: "calls the API" };
    return [
      { label: "Data sources", detail: "DB, files, sensors" },
      { label: "Storage", detail: infra.storage.split(" (")[0].split(" / ")[0] },
      { label: "Train", detail: "notebook → training job" },
      { label: "Model registry", detail: infra.platform.split(" (")[0] },
      { label: a.deploy === "edge" ? "Export" : a.deploy === "batch" ? "Batch job" : "Model API", detail: a.deploy === "edge" ? "ONNX / TFLite / CoreML" : serving.split(" (")[0].split(",")[0] },
      last,
      { label: "Monitoring", detail: "drift, errors, outcomes" }
    ];
  }

  function servingCode(useCaseId, a) {
    if (a.deploy === "edge") {
      return {
        label: "Export for on-device use (PyTorch → ONNX, then run with ONNX Runtime)",
        lang: "python",
        content: `import torch
model.eval()
dummy = torch.randn(1, 3, 224, 224)            # match your input shape
torch.onnx.export(model, dummy, "model.onnx", opset_version=17,
                  input_names=["input"], output_names=["output"])

# Optional: quantize to INT8 for a ~4x smaller model
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic("model.onnx", "model.int8.onnx", weight_type=QuantType.QInt8)

# On the device:
import onnxruntime as ort, numpy as np
sess = ort.InferenceSession("model.int8.onnx")
print(sess.run(None, {"input": np.random.rand(1, 3, 224, 224).astype("float32")}))`
      };
    }
    if (a.deploy === "batch") {
      return {
        label: "Batch scoring script (run it on a schedule)",
        lang: "python",
        content: `# score.py — run nightly via cron / scheduler
import pandas as pd, joblib, datetime as dt

model = joblib.load("model.joblib")          # or load from your model registry
df = pd.read_parquet("input/latest.parquet") # new rows to score
df["prediction"] = model.predict(df[model.feature_names_in_])
df["scored_at"] = dt.datetime.utcnow()
df.to_parquet(f"output/predictions_{dt.date.today()}.parquet")
print(f"Scored {len(df)} rows")`
      };
    }
    const predictBody = useCaseId === "llm-rag"
      ? `    return {"answer": answer(req.text)}   # answer() from the training step`
      : `    result = model.predict([req.text])        # adapt to your model's input
    return {"prediction": result[0]}`;
    return {
      label: "Serve the model as an HTTP API (FastAPI) and package it with Docker",
      lang: "python",
      content: `# app.py — pip install fastapi uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
# model = load_model("model/")  # load once at startup, not per request

class Request(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(req: Request):
${predictBody}

# ---- Dockerfile ----
# FROM python:3.12-slim
# WORKDIR /app
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# COPY . .
# CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]`
    };
  }

  /** Build the full personalized plan. */
  function buildPlan(useCaseId, answers, requirement) {
    const uc = USE_CASES[useCaseId];
    if (!uc) throw new Error("Unknown use case: " + useCaseId);
    const a = Object.assign({ data: "medium", labels: "yes", skill: "intermediate", deploy: "api", latency: "interactive", cloud: "self", budget: "medium", privacy: "no" }, answers || {});
    // "Not sure" answers become a sensible default, and the plan says what it assumed.
    const assumed = [];
    KB.QUESTIONS.forEach(q => {
      if (a[q.id] === "unsure" && q.assume) {
        a[q.id] = q.assume;
        assumed.push({ id: q.id, question: q.title, label: labelFor(q.id, q.assume) });
      }
    });
    const infra = INFRA[a.cloud] || INFRA.self;
    const tier = chooseTier(useCaseId, a);
    const model = uc.models[tier];
    const gpu = needsGPU(useCaseId, tier, a);
    const { serving, notes: servingNotes } = chooseServing(useCaseId, tier, a, infra, gpu);
    const managed = a.cloud !== "self";
    const warnings = [];

    if (useCaseId === "llm-rag" && a.privacy === "yes") {
      warnings.push(a.cloud === "self"
        ? "Sensitive data + self-hosted: run an open-weights LLM locally so no data leaves your network."
        : `Sensitive data: call the LLM through ${infra.llm.split(" (")[0]} inside your own cloud account so data stays under your agreements and region.`);
    }
    if (a.privacy === "yes") warnings.push("Remove or pseudonymize personal data you don’t need, and document consent and retention (GDPR / HIPAA where applicable).");
    if (a.deploy === "edge" && a.latency === "realtime" && ["llm-rag"].includes(useCaseId)) warnings.push("Real-time LLM on edge devices is hard; expect interactive (1–3 s) latency at best.");
    if (a.data === "none" && !IMPLICIT_LABELS.has(useCaseId)) warnings.push("You have no data yet — start with the pretrained/zero-shot approach and log real inputs so you can train a better model later.");

    const stack = {
      Language: ["Python 3.11+"],
      "Data and prep": useCaseId === "llm-rag" ? ["pypdf / unstructured", "LangChain text splitters (optional)"] : ["pandas", "Jupyter"],
      "Modeling": model.libs,
      "Experiment tracking": [managed ? infra.platform.split(" (")[0] : "MLflow"],
      "Serving": a.deploy === "edge" ? ["ONNX Runtime / TFLite / Core ML"] : a.deploy === "batch" ? ["Scheduled Python job"] : ["FastAPI", "Docker"],
      "Monitoring": [infra.monitoring]
    };
    if (useCaseId === "llm-rag") stack["Vector search"] = [infra.vectorDb];

    const infraRows = [
      ["Data storage", infra.storage],
      ["Development", infra.notebook],
      ["Training compute", useCaseId === "llm-rag" ? "None — no training needed (embedding runs on CPU)" : (gpu ? infra.gpuTrain : infra.cpuTrain)],
      ["Model registry", infra.platform],
      ["Serving", serving],
      ["Automation", infra.pipeline],
      ["Monitoring", infra.monitoring],
      ["Secrets and access", infra.secrets]
    ];
    if (useCaseId === "llm-rag") infraRows.splice(3, 0, ["Vector database", infra.vectorDb], ["LLM provider", a.cloud === "self" ? (a.privacy === "yes" ? infra.llm : "Claude API (Anthropic) or a self-hosted model via Ollama/vLLM") : infra.llm]);
    if (a.privacy === "yes") infraRows.push(["Privacy controls", infra.privacy]);

    const libsInstall = model.libs
      .map(l => l.toLowerCase())
      .filter(l => !/\/| sdk|teachable|roboflow|cloud stt|deepstream|feast|flink|kafka|\(/.test(l))
      .map(l => ({ "hugging face transformers": "transformers", "pytorch": "torch", "scikit-learn": "scikit-learn" }[l] || l.replace(/\s+/g, "-")));
    const pipInstall = Array.from(new Set(["pandas", "mlflow", ...libsInstall, ...(model.libs.some(l => /anthropic/i.test(l)) ? ["anthropic"] : [])])).join(" ");

    const isStarter = tier === "starter";
    const steps = [
      {
        id: "define",
        title: "Define the problem and success",
        simple: "Write down exactly what the model should do and how you’ll know it’s good enough.",
        why: "Most ML projects fail from a fuzzy goal, not from bad models. A clear metric tells you when to stop.",
        sections: [
          { heading: "Your problem, framed for ML", items: [
            `Requirement: “${escapeHtml((requirement || uc.examples[0]).trim())}”`,
            `ML task type: <b>${uc.name}</b> — ${uc.tagline}`,
            `Primary metric: ${uc.metric}`,
            `Baseline to beat: ${uc.baseline}`
          ] },
          { heading: "Answer these before writing code", items: [
            "Who uses the prediction, and what action do they take with it?",
            "What does a wrong prediction cost? (Is a false alarm worse than a miss?)",
            "What target value of the metric would make this worth shipping?",
            "Could a simple rule or existing tool already solve 80% of it?"
          ] }
        ],
        checklist: ["Wrote a one-sentence problem statement", "Chose a primary metric and a target value", "Agreed on the baseline to beat"],
        tip: "Write the problem statement in your README. You’ll refer back to it constantly."
      },
      {
        id: "setup",
        title: "Set up workspace and infrastructure",
        simple: "Get a computer, a place to store data, and the right software installed.",
        why: "A reproducible environment prevents hours of “works on my machine” problems later.",
        sections: [
          { heading: `Your ${infra.name} setup`, items: [
            `Store raw data in: ${infra.storage}`,
            `Experiment in: ${infra.notebook}`,
            `Track experiments & models with: ${infra.platform}`,
            `Keep API keys and passwords in: ${infra.secrets}`
          ].concat(gpu && useCaseId !== "llm-rag" ? [`GPU for training: ${infra.gpuTrain}. Free alternative to try first: Google Colab or Kaggle notebooks.`] : []) },
          { heading: "Project hygiene", items: ["Use Git from day one", "Pin package versions in requirements.txt", "Never commit data or secrets — add them to .gitignore"] }
        ],
        code: [{ label: "Create a Python environment", lang: "bash", content:
`python -m venv .venv && source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install ${pipInstall}
pip freeze > requirements.txt
mkdir -p data/raw data/processed notebooks src models` }],
        checklist: ["Cloud account / machine ready", "Python environment created", "Git repo initialized", "Storage bucket or folder for data"],
        tip: a.skill === "beginner" ? "Beginner tip: Google Colab gives you a free GPU notebook in the browser — perfect for your first experiments." : "Use a cookiecutter project layout so every project looks the same."
      },
      {
        id: "data",
        title: "Collect and label data",
        simple: "Gather real examples of the problem and, if needed, mark the correct answer for each.",
        why: "Data quality limits model quality. A smaller clean dataset beats a big messy one.",
        sections: [
          { heading: "What to collect", items: uc.dataTips },
          { heading: "Labeling", items: [uc.labeling].concat(
            a.labels === "partial" && !IMPLICIT_LABELS.has(useCaseId) ? ["Your labels are partial/messy: re-label a random sample of 200 to estimate label quality, then fix the worst categories first."] : [],
            a.labels === "no" && !IMPLICIT_LABELS.has(useCaseId) ? ["No labels yet: use the zero-shot/pretrained model to pre-label, then have humans review. You’ll get labels 3–5× faster."] : [],
            a.data === "none" ? ["No data yet: start logging real inputs from day one (with consent) — they become tomorrow’s training set."] : []
          ) }
        ].concat(a.privacy === "yes" ? [{ heading: "Sensitive data", items: ["Collect only the fields you need (data minimization)", "Pseudonymize IDs and strip names/emails/phone numbers", "Restrict access and log who reads the data", "Check consent and retention rules (GDPR, HIPAA, etc.)"] }] : []),
        checklist: ["Data collected into storage", "Labeling guidelines written", "Labels checked on a random sample"],
        tip: "Look at 50 raw examples by eye before doing anything else. You will spot problems no metric shows."
      },
      {
        id: "prepare",
        title: "Explore and prepare the data",
        simple: "Clean the data and split it into a part for learning and a part for testing.",
        why: "The test set simulates the future. If it leaks into training, your scores will lie to you.",
        sections: [
          { heading: "Preparation steps", items: uc.prep },
          { heading: "Splitting", items: ["Train ≈ 70–80%, validation ≈ 10–15%, test ≈ 10–15%", "Lock the test set away — only use it for the final check", "If data has time order, split by time"] }
        ],
        checklist: ["Explored distributions and missing values", "Cleaned and transformed data", "Created train / validation / test splits"],
        tip: "Save the prepared dataset with a version (e.g. data/processed/v1). Reproducibility matters."
      },
      {
        id: "baseline",
        title: "Build a baseline",
        simple: "Try the simplest possible solution first, so you know what “good” looks like.",
        why: "Without a baseline you can’t tell whether a complex model is actually helping.",
        sections: [{ heading: "Your baseline", items: [uc.baseline, `Measure it with: ${uc.metric}`, "Record the score in your experiment tracker"] }],
        code: isStarter ? [] : [{ label: "Quick-start / zero-shot version (also a strong baseline)", lang: "python", content: uc.starterCode }],
        checklist: ["Baseline implemented", "Baseline score recorded"],
        tip: "If the baseline already meets the business goal, deploy it and improve later."
      },
      {
        id: "train",
        title: isStarter ? "Get your first model working" : "Train your model",
        simple: isStarter ? "Use a ready-made model so you get results without heavy training." : "Teach the model using your training data.",
        why: model.why,
        sections: [
          { heading: "Recommended approach", items: [`<b>${model.name}</b>`, model.why, `Libraries: ${model.libs.join(", ")}`] },
          { heading: "Why this fits you", items: [
            `Data: ${labelFor("data", a.data)} · Labels: ${labelFor("labels", a.labels)} · Experience: ${labelFor("skill", a.skill)}`,
            isStarter ? "Starting simple gets you a working result fast; graduate to the standard approach once you have more labeled data." :
              tier === "advanced" ? "You have the data and experience to benefit from a more powerful setup." :
              "A proven, well-documented approach with strong accuracy for the effort."
          ].concat(gpu && useCaseId !== "llm-rag" && !isStarter ? [`Train on a GPU: ${infra.gpuTrain}`] : []) },
          { heading: "Other levels", items: Object.entries(uc.models).filter(([k]) => k !== tier).map(([k, m]) => `${k[0].toUpperCase() + k.slice(1)}: ${m.name}`) }
        ],
        code: [{ label: isStarter ? "Starter code" : "Training code", lang: "python", content: isStarter ? uc.starterCode : uc.trainCode }]
          .concat(isStarter ? [{ label: "Next level: training code for when you have more data", lang: "python", content: uc.trainCode }] : []),
        checklist: ["Model runs end-to-end on sample data", "Training logged in experiment tracker", "Model artifact saved / registered"],
        tip: "Change one thing at a time and log every run, so you can tell which change made the difference."
      },
      {
        id: "evaluate",
        title: "Evaluate honestly",
        simple: "Test the model on data it has never seen and look closely at its mistakes.",
        why: "Good average scores can hide failures on important groups of cases.",
        sections: [
          { heading: "How to evaluate", items: [`Metric: ${uc.metric}`].concat(uc.evaluation) },
          { heading: "Common pitfalls for this model type", items: uc.pitfalls },
          { heading: "Go / no-go", items: ["Beats the baseline by a meaningful margin?", "Meets the target you set in step 1?", "Mistakes are acceptable for the people affected?"] }
        ],
        checklist: ["Evaluated on the untouched test set", "Reviewed failure cases manually", "Compared against baseline", "Decision: ship / iterate"],
        tip: "Show 20 predictions to a domain expert. Qualitative feedback catches what metrics miss."
      },
      {
        id: "deploy",
        title: "Deploy",
        simple: a.deploy === "edge" ? "Shrink the model and put it on the device." : a.deploy === "batch" ? "Run the model on a schedule and save its predictions." : "Put the model behind an API so your app can use it.",
        why: "A model only creates value when it’s used. Start with the simplest deployment that meets your latency needs.",
        sections: [
          { heading: "Serving architecture", items: [`<b>${serving}</b>`, `Latency target: ${labelFor("latency", a.latency)}`].concat(servingNotes) },
          { heading: "Release safely", items: ["Version every model (v1, v2…) in the registry", a.deploy === "api" ? "Roll out gradually (shadow mode or 10% traffic) before switching everyone" : "Validate the first runs' outputs before downstream systems consume them", "Keep the previous model ready for instant rollback", "Add a /health check and alerting"] }
        ].concat(a.privacy === "yes" ? [{ heading: "Privacy in production", items: [infra.privacy, "Don’t log raw sensitive inputs; log hashed IDs and model outputs"] }] : []),
        code: [servingCode(useCaseId, a)],
        checklist: ["Model packaged (container / export)", "Deployed to staging and tested", "Rolled out to production", "Rollback plan documented"],
        tip: managed ? `Use ${infra.name}'s managed services first; move to Kubernetes only when you outgrow them.` : "Start with Docker on a single VM. Kubernetes is only worth it at real scale."
      },
      {
        id: "monitor",
        title: "Monitor and improve",
        simple: "Watch how the model behaves in the real world and retrain it when it gets worse.",
        why: "The world changes. Every model degrades over time without monitoring and retraining.",
        sections: [
          { heading: "What to monitor", items: uc.monitoring.concat(["Latency, errors and cost", `Tooling: ${infra.monitoring}`]) },
          { heading: "Close the loop", items: ["Collect user feedback and true outcomes", "Add hard / wrong cases to the training set", `Automate retraining with ${infra.pipeline}`, "Retrain on a schedule or when drift alerts fire"] }
        ],
        checklist: ["Dashboards created", "Alerts configured", "Feedback collection in place", "Retraining process defined"],
        tip: "Your first deployment is version 1, not the finish line. Plan a review after 2–4 weeks."
      }
    ];
    // A rough time estimate per step, so people know what they're signing up for.
    const pace = SKILL_PACE[a.skill] || 1;
    steps.forEach(st => { st.hours = Math.max(1, Math.round((STEP_HOURS[st.id] || 2) * pace)); });

    return {
      useCaseId,
      useCase: uc,
      requirement: requirement || "",
      answers: a,
      assumed,
      tier,
      model,
      gpu,
      infraName: infra.name,
      serving,
      cost: estimateCost(a, gpu, useCaseId),
      stack,
      infraRows,
      architecture: architecture(useCaseId, a, infra, serving),
      warnings,
      steps
    };
  }

  // Hours of focused work per step for someone with some Python experience; beginners take longer.
  const STEP_HOURS = { define: 1, setup: 2, data: 4, prepare: 3, baseline: 1, train: 4, evaluate: 2, deploy: 4, monitor: 2 };
  const SKILL_PACE = { beginner: 1.5, intermediate: 1, expert: 0.7 };

  /** "about 1 hour", "about 6 hours", "about 2 days" (a day is 6 hours of focused work). */
  function formatHours(h) {
    if (h <= 1) return "about 1 hour";
    if (h < 12) return `about ${h} hours`;
    return `about ${Math.round(h / 6)} days`;
  }

  // Everyday tech words that plans use all the time; the first mention in each step gets a glossary tooltip.
  // (Words like "edge" and "batch" are left out: they also have ordinary meanings, as in "edge cases".)
  const AUTO_TERMS = {
    "GPU": /\bGPUs?\b/, "CPU": /\bCPUs?\b/, "API": /\bAPIs?\b/, "Docker": /\bDocker\b/, "Kubernetes": /\bKubernetes\b/,
    "AutoML": /\bAutoML\b/, "serverless": /\b[Ss]erverless\b/, "managed service": /\b[Mm]anaged services?\b/,
    "notebook": /\b[Nn]otebooks?\b/, "pretrained model": /\b[Pp]re-?trained models?\b/, "few-shot": /\b[Ff]ew-shot\b/,
    "latency": /\b[Ll]atency\b/, "high availability": /\b[Hh]igh availability\b/
  };
  const AUTO_RE = new RegExp(Object.values(AUTO_TERMS).map(r => `(${r.source})`).join("|"), "g");
  const AUTO_KEYS = Object.keys(AUTO_TERMS);

  /**
   * Mark the first mention of each everyday tech word (AUTO_TERMS) as a glossary tooltip.
   * `seen` is shared across one step, so a word is explained once per step. Code, links and
   * words already marked with {{term}} are left alone.
   */
  function explainTerms(html, seen = new Set()) {
    html = String(html);
    // Words someone already marked by hand are explained there, not here.
    for (const m of html.matchAll(/\{\{([^}]+)\}\}/g)) seen.add(m[1]);
    const explain = text => text.replace(AUTO_RE, (match, ...groups) => {
      const term = AUTO_KEYS[groups.slice(0, AUTO_KEYS.length).findIndex(g => g !== undefined)];
      if (seen.has(term)) return match;
      seen.add(term);
      return `<span class="term" tabindex="0" data-term="${escapeHtml(term)}">${match}</span>`;
    });
    // Only plain text is touched: tags, code, links and {{markers}} are copied as they are.
    let out = "", last = 0;
    for (const m of html.matchAll(/<(code|pre|a)\b[\s\S]*?<\/\1>|<[^>]+>|\{\{[^}]+\}\}/g)) {
      out += explain(html.slice(last, m.index)) + m[0];
      last = m.index + m[0].length;
    }
    return out + explain(html.slice(last));
  }

  /** A model type name in the middle of a sentence: "Your time-series forecasting plan" (acronyms like LLM stay). */
  function inSentence(name) {
    return /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name;
  }

  function labelFor(qid, value) {
    const q = KB.QUESTIONS.find(x => x.id === qid);
    const o = q && q.options.find(x => x.value === value);
    return o ? o.label : value;
  }

  // ---------- "Why this?", confidence and the three approaches ----------
  const TIERS = ["starter", "standard", "advanced"];
  const TIER_FITS = {
    starter: "You have little or no data, no labels yet, or you’re new to machine learning.",
    standard: "You have a moderate amount of labeled data and some experience.",
    advanced: "You have a lot of labeled data, an experienced team and more than a minimal budget."
  };

  /** Plain-English reasons for the approach, the GPU answer and the cost, traced from the answers. */
  function explainPlan(plan) {
    const { useCaseId, answers: a, tier, gpu } = plan, uc = plan.useCase;
    const assumedIds = new Set(plan.assumed.map(x => x.id));
    const note = id => (assumedIds.has(id) ? " (assumed, because you answered “Not sure”)" : "");
    const approach = [];
    if (a.data === "none") approach.push(`You don’t have example data yet${note("data")}, so the plan starts with a ready-made model that needs no training.`);
    else if (!IMPLICIT_LABELS.has(useCaseId) && a.labels === "no") approach.push(`Your data isn’t labeled${note("labels")}, so the plan starts with methods that need few or no labels.`);
    else if (a.skill === "beginner") approach.push(tier === "starter"
      ? "You’re new to machine learning, so the plan uses tools that do most of the work for you."
      : `You’re new to machine learning, but you have a lot of labeled data${note("data")}, so training a proven model is worth it.`);
    else if (tier === "advanced") approach.push("You have a lot of data, an experienced team and more than a minimal budget, so a more advanced setup will pay off.");
    else if (tier === "starter") approach.push(`You have a little data${note("data")}, so the plan starts simple and saves bigger models for when you have more.`);
    else approach.push(`Your amount of data${note("data")} and your team’s experience suit a proven, standard approach.`);

    const gpuWhy = [];
    if (useCaseId === "llm-rag") gpuWhy.push(gpu
      ? "You chose self-hosting with sensitive data, so the language model runs on your own GPU and no data leaves your network."
      : "The language model runs through a hosted API, and turning documents into embeddings runs fine on a CPU.");
    else if (!uc.needsGPU) gpuWhy.push(gpu
      ? "With this much data, the advanced approach trains much faster on a GPU."
      : `Models for ${inSentence(uc.name)} train quickly on ordinary CPUs.`);
    else gpuWhy.push(gpu
      ? "This kind of model is a neural network, which trains far faster on a GPU."
      : "The starter approach uses ready-made models and managed tools, so you don’t need your own GPU.");

    const where = { api: "an always-on service is the main running cost", batch: "nothing runs between scheduled jobs, which keeps costs down", edge: "predictions run on the devices themselves" }[a.deploy];
    const cost = [
      `Your budget: “${labelFor("budget", a.budget)}”${note("budget")}.`,
      `Where it runs: “${labelFor("deploy", a.deploy)}”${note("deploy")}${where ? `. ${where[0].toUpperCase() + where.slice(1)}` : ""}.`,
      gpu ? "It needs a GPU, which is usually the biggest cost." : "It runs on CPUs, which keeps costs down.",
      "These are rough ranges. Check your cloud provider’s pricing calculator before you commit."
    ];
    return { approach, gpu: gpuWhy, cost };
  }

  /**
   * How sure the plan can be that it fits what was described: "high", "medium" or "low", with the reasons.
   * It says nothing about how accurate the model will be; only the baseline and evaluation steps can tell.
   */
  function confidence(plan) {
    const reasons = [];
    let points = Math.min(plan.assumed.length, 3);
    if (plan.assumed.length) reasons.push(`${plan.assumed.length === 1 ? "1 answer was" : plan.assumed.length + " answers were"} assumed, because you answered “Not sure”.`);
    const words = (plan.requirement || "").trim().split(/\s+/).filter(Boolean).length;
    if (!words) { points++; reasons.push("There’s no description, so the plan is built from your answers alone."); }
    else if (words < 5) { points++; reasons.push("Your description is short, so the model type is a best guess."); }
    if (plan.answers.data === "none") { points++; reasons.push("You don’t have data yet, so the approach may change once you collect some."); }
    else if (!IMPLICIT_LABELS.has(plan.useCaseId) && plan.answers.labels === "no") { points++; reasons.push("Your data isn’t labeled yet, so the approach may change once it is."); }
    const level = points === 0 ? "high" : points <= 2 ? "medium" : "low";
    const summary = {
      high: "Your description and answers point clearly to this approach.",
      medium: "A reasonable starting point, with a few open questions.",
      low: "A rough starting point. Several things are still uncertain."
    }[level];
    return { level, label: level[0].toUpperCase() + level.slice(1), summary, reasons };
  }

  /** The three approaches side by side, for the same answers. */
  function compareApproaches(plan) {
    const uc = plan.useCase, a = plan.answers;
    return TIERS.filter(t => uc.models[t]).map(tier => {
      // The advanced approach is only recommended with a lot of data, so judge its GPU need on that.
      const model = uc.models[tier], gpu = needsGPU(plan.useCaseId, tier, tier === "advanced" ? Object.assign({}, a, { data: "large" }) : a);
      return {
        tier, name: model.name, why: model.why, libs: model.libs, gpu,
        cost: estimateCost(a, gpu, plan.useCaseId).split(" — ")[0].split(". ")[0],
        fits: TIER_FITS[tier], recommended: tier === plan.tier
      };
    });
  }

  // ---------- share links ----------
  // A plan is shared as URL-safe base64 of a small JSON object:
  //   { v: 1, u: useCaseId, a: "2103-110" (option index per question, "-" = unanswered),
  //     r: requirement text, c: "hex" (optional checklist bits, in step/checklist order) }
  const SHARE_VERSION = 1;
  const MAX_REQUIREMENT = 2000;

  function toBase64Url(str) {
    let bin = "";
    new TextEncoder().encode(str).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromBase64Url(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
  }

  /** Checklist keys ("stepId:index") in a fixed order for a given plan. */
  function checklistKeys(useCaseId, answers, requirement) {
    return buildPlan(useCaseId, answers, requirement).steps.flatMap(s => s.checklist.map((_, j) => `${s.id}:${j}`));
  }

  /** Encode a plan into the token used in "#/share/<token>". */
  function encodeShare({ useCaseId, answers = {}, requirement = "", checks = {} }, includeProgress = true) {
    const a = KB.QUESTIONS.map(q => {
      const i = q.options.findIndex(o => o.value === answers[q.id]);
      return i >= 0 ? String(i) : "-";
    }).join("");
    const payload = { v: SHARE_VERSION, u: useCaseId, a, r: String(requirement).slice(0, MAX_REQUIREMENT) };
    if (includeProgress) {
      const bits = checklistKeys(useCaseId, answers, requirement).map(k => (checks[k] ? "1" : "0")).join("");
      if (bits.includes("1")) {
        let hex = "";
        for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4).padEnd(4, "0"), 2).toString(16);
        payload.c = hex;
      }
    }
    return toBase64Url(JSON.stringify(payload));
  }

  /** Decode a share token. Returns { useCaseId, answers, requirement, checks } or null if invalid. */
  function decodeShare(token) {
    let p;
    try { p = JSON.parse(fromBase64Url(String(token || ""))); } catch (_) { return null; }
    if (!p || p.v !== SHARE_VERSION || typeof p.u !== "string" || !Object.prototype.hasOwnProperty.call(USE_CASES, p.u)) return null;
    if (typeof p.a !== "string" || p.a.length !== KB.QUESTIONS.length) return null;
    const answers = {};
    for (let i = 0; i < KB.QUESTIONS.length; i++) {
      const ch = p.a[i];
      if (ch === "-") continue;
      const q = KB.QUESTIONS[i], idx = Number(ch);
      if (!/^[0-9]$/.test(ch) || idx >= q.options.length) return null;
      answers[q.id] = q.options[idx].value;
    }
    if (typeof p.r !== "string" || p.r.length > MAX_REQUIREMENT) return null;
    const checks = {};
    if (p.c !== undefined) {
      if (typeof p.c !== "string" || !/^[0-9a-f]*$/.test(p.c)) return null;
      const bits = [...p.c].map(h => parseInt(h, 16).toString(2).padStart(4, "0")).join("");
      checklistKeys(p.u, answers, p.r).forEach((k, i) => { if (bits[i] === "1") checks[k] = true; });
    }
    return { useCaseId: p.u, answers, requirement: p.r, checks };
  }

  const stripTags = s => String(s).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\{\{([^}]+)\}\}/g, "$1");

  /** Export a plan as Markdown. */
  function toMarkdown(plan) {
    const L = [];
    L.push(`# ML Plan: ${plan.useCase.name}`, "");
    if (plan.requirement) L.push(`> ${plan.requirement}`, "");
    L.push(`**Approach:** ${stripTags(plan.model.name)} (${plan.tier})`, "");
    L.push(`**Estimated cost:** ${plan.cost}`, "");
    L.push(`**Estimated time:** ${formatHours(plan.steps.reduce((n, s) => n + s.hours, 0))} of focused work`, "");
    if (plan.assumed.length) { L.push("## Assumptions (you answered “Not sure”)"); plan.assumed.forEach(x => L.push(`- ${x.question} **${x.label}**`)); L.push(""); }
    if (plan.warnings.length) { L.push("## Heads-up"); plan.warnings.forEach(w => L.push(`- ${stripTags(w)}`)); L.push(""); }
    L.push("## Tech stack");
    Object.entries(plan.stack).forEach(([k, v]) => L.push(`- **${k}:** ${v.join(", ")}`));
    L.push("", `## Infrastructure (${plan.infraName})`, "| Component | Choice |", "|---|---|");
    plan.infraRows.forEach(([k, v]) => L.push(`| ${k} | ${v} |`));
    L.push("", "## Architecture", plan.architecture.map(n => n.label).join(" → "), "");
    plan.steps.forEach((s, i) => {
      L.push(`## Step ${i + 1}: ${s.title} (${formatHours(s.hours)})`, "", `*${s.simple}*`, "", `**Why:** ${stripTags(s.why)}`, "");
      s.sections.forEach(sec => { L.push(`### ${sec.heading}`); sec.items.forEach(it => L.push(`- ${stripTags(it)}`)); L.push(""); });
      (s.code || []).forEach(c => L.push(`**${c.label}**`, "", "```" + c.lang, c.content, "```", ""));
      L.push("**Checklist**"); s.checklist.forEach(c => L.push(`- [ ] ${c}`)); L.push("", `> **Tip:** ${s.tip}`, "");
    });
    return L.join("\n");
  }

  const API = { encodeShare, decodeShare, MIN_SCORE, escapeHtml, formatHours, inSentence, explainTerms, AUTO_TERMS, stem, tokenize, classify, ambiguousTop, buildPlan, chooseTier, explainPlan, confidence, compareApproaches, labelFor, toMarkdown, IMPLICIT_LABELS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.HM_ENGINE = API;
})(typeof window !== "undefined" ? window : globalThis);
