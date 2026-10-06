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

  /** Score every use case against the requirement text. Returns a ranked list. */
  function classify(text) {
    const t = " " + String(text || "").toLowerCase() + " ";
    const ranked = Object.entries(USE_CASES).map(([id, uc]) => {
      let score = 0;
      const matched = [];
      for (const [kw, weight] of Object.entries(uc.keywords)) {
        const re = new RegExp("(^|[^a-z0-9])" + escapeRegex(kw) + "([^a-z0-9]|$)", "i");
        if (re.test(t)) {
          score += weight;
          matched.push(kw);
        }
      }
      return { id, score, matched };
    }).sort((a, b) => b.score - a.score);

    const total = ranked.reduce((s, r) => s + r.score, 0);
    return ranked.map(r => ({ ...r, confidence: total ? r.score / total : 0 }));
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
    const table = {
      low: gpu ? "≈ $10–100 / month — rent GPUs by the hour only for training (~$0.50–1.50/h), serve on CPU or via API"
               : "≈ $0–50 / month — free tiers, serverless scale-to-zero, CPU only",
      medium: gpu ? "≈ $300–2,000 / month — one small always-on GPU (~$500–900/mo) plus storage & monitoring"
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

  /** Build the full personalised plan. */
  function buildPlan(useCaseId, answers, requirement) {
    const uc = USE_CASES[useCaseId];
    if (!uc) throw new Error("Unknown use case: " + useCaseId);
    const a = Object.assign({ data: "medium", labels: "yes", skill: "intermediate", deploy: "api", latency: "interactive", cloud: "self", budget: "medium", privacy: "no" }, answers || {});
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
    if (a.privacy === "yes") warnings.push("Remove or pseudonymise personal data you don't need, and document consent and retention (GDPR / HIPAA where applicable).");
    if (a.deploy === "edge" && a.latency === "realtime" && ["llm-rag"].includes(useCaseId)) warnings.push("Real-time LLM on edge devices is hard; expect interactive (1–3 s) latency at best.");
    if (a.data === "none" && !IMPLICIT_LABELS.has(useCaseId)) warnings.push("You have no data yet — start with the pretrained/zero-shot approach and log real inputs so you can train a better model later.");

    const stack = {
      Language: ["Python 3.11+"],
      "Data & prep": useCaseId === "llm-rag" ? ["pypdf / unstructured", "LangChain text splitters (optional)"] : ["pandas", "Jupyter"],
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
      ["Secrets & access", infra.secrets]
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
        title: "Define the problem & success",
        simple: "Write down exactly what the model should do and how you'll know it's good enough.",
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
        tip: "Write the problem statement in your README. You'll refer back to it constantly."
      },
      {
        id: "setup",
        title: "Set up workspace & infrastructure",
        simple: "Get a computer, a place to store data, and the right software installed.",
        why: "A reproducible environment saves hours of 'works on my machine' pain later.",
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
        checklist: ["Cloud account / machine ready", "Python environment created", "Git repo initialised", "Storage bucket or folder for data"],
        tip: a.skill === "beginner" ? "Beginner tip: Google Colab gives you a free GPU notebook in the browser — perfect for your first experiments." : "Use a cookiecutter project layout so every project looks the same."
      },
      {
        id: "data",
        title: "Collect & label data",
        simple: "Gather real examples of the problem and, if needed, mark the correct answer for each.",
        why: "Data quality limits model quality. A smaller clean dataset beats a big messy one.",
        sections: [
          { heading: "What to collect", items: uc.dataTips },
          { heading: "Labeling", items: [uc.labeling].concat(
            a.labels === "partial" && !IMPLICIT_LABELS.has(useCaseId) ? ["Your labels are partial/messy: re-label a random sample of 200 to estimate label quality, then fix the worst categories first."] : [],
            a.labels === "no" && !IMPLICIT_LABELS.has(useCaseId) ? ["No labels yet: use the zero-shot/pretrained model to pre-label, then have humans review. You'll get labels 3–5× faster."] : [],
            a.data === "none" ? ["No data yet: start logging real inputs from day one (with consent) — they become tomorrow's training set."] : []
          ) }
        ].concat(a.privacy === "yes" ? [{ heading: "🔒 Sensitive data", items: ["Collect only the fields you need (data minimisation)", "Pseudonymise IDs and strip names/emails/phone numbers", "Restrict access and log who reads the data", "Check consent and retention rules (GDPR, HIPAA, etc.)"] }] : []),
        checklist: ["Data collected into storage", "Labeling guidelines written", "Labels checked on a random sample"],
        tip: "Look at 50 raw examples by eye before doing anything else. You will spot problems no metric shows."
      },
      {
        id: "prepare",
        title: "Explore & prepare the data",
        simple: "Clean the data and split it into a part for learning and a part for testing.",
        why: "The test set simulates the future. If it leaks into training, your scores will lie to you.",
        sections: [
          { heading: "Preparation steps", items: uc.prep },
          { heading: "Splitting", items: ["Train ≈ 70–80%, validation ≈ 10–15%, test ≈ 10–15%", "Lock the test set away — only use it for the final check", "If data has time order, split by time"] }
        ],
        checklist: ["Explored distributions & missing values", "Cleaned and transformed data", "Created train / validation / test splits"],
        tip: "Save the prepared dataset with a version (e.g. data/processed/v1). Reproducibility matters."
      },
      {
        id: "baseline",
        title: "Build a baseline",
        simple: "Try the simplest possible solution first, so you know what 'good' looks like.",
        why: "Without a baseline you can't tell whether a complex model is actually helping.",
        sections: [{ heading: "Your baseline", items: [uc.baseline, `Measure it with: ${uc.metric}`, "Record the score in your experiment tracker"] }],
        code: isStarter ? [] : [{ label: "Quick-start / zero-shot version (also a great baseline)", lang: "python", content: uc.starterCode }],
        checklist: ["Baseline implemented", "Baseline score recorded"],
        tip: "If the baseline is already good enough for the business, ship it! You can improve later."
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
              "A proven, well-documented approach with a great accuracy/effort ratio."
          ].concat(gpu && useCaseId !== "llm-rag" && !isStarter ? [`Train on a GPU: ${infra.gpuTrain}`] : []) },
          { heading: "Other levels", items: Object.entries(uc.models).filter(([k]) => k !== tier).map(([k, m]) => `${k[0].toUpperCase() + k.slice(1)}: ${m.name}`) }
        ],
        code: [{ label: isStarter ? "Starter code" : "Training code", lang: "python", content: isStarter ? uc.starterCode : uc.trainCode }]
          .concat(isStarter ? [{ label: "Next level: training code for when you have more data", lang: "python", content: uc.trainCode }] : []),
        checklist: ["Model runs end-to-end on sample data", "Training logged in experiment tracker", "Model artifact saved / registered"],
        tip: "Change one thing at a time and log every run. Future-you will thank you."
      },
      {
        id: "evaluate",
        title: "Evaluate honestly",
        simple: "Test the model on data it has never seen and look closely at its mistakes.",
        why: "Good average scores can hide failures on important groups of cases.",
        sections: [
          { heading: "How to evaluate", items: [`Metric: ${uc.metric}`].concat(uc.evaluation) },
          { heading: "Common pitfalls for this use case", items: uc.pitfalls },
          { heading: "Go / no-go", items: ["Beats the baseline by a meaningful margin?", "Meets the target you set in step 1?", "Mistakes are acceptable for the people affected?"] }
        ],
        checklist: ["Evaluated on the untouched test set", "Reviewed failure cases manually", "Compared against baseline", "Decision: ship / iterate"],
        tip: "Show 20 predictions to a domain expert. Qualitative feedback catches what metrics miss."
      },
      {
        id: "deploy",
        title: "Deploy",
        simple: a.deploy === "edge" ? "Shrink the model and put it on the device." : a.deploy === "batch" ? "Run the model on a schedule and save its predictions." : "Put the model behind an API so your app can use it.",
        why: "A model only creates value when it's used. Start with the simplest deployment that meets your latency needs.",
        sections: [
          { heading: "Serving architecture", items: [`<b>${serving}</b>`, `Latency target: ${labelFor("latency", a.latency)}`].concat(servingNotes) },
          { heading: "Release safely", items: ["Version every model (v1, v2…) in the registry", a.deploy === "api" ? "Roll out gradually (shadow mode or 10% traffic) before switching everyone" : "Validate the first runs' outputs before downstream systems consume them", "Keep the previous model ready for instant rollback", "Add a /health check and alerting"] }
        ].concat(a.privacy === "yes" ? [{ heading: "🔒 Privacy in production", items: [infra.privacy, "Don't log raw sensitive inputs; log hashed IDs and model outputs"] }] : []),
        code: [servingCode(useCaseId, a)],
        checklist: ["Model packaged (container / export)", "Deployed to staging and tested", "Rolled out to production", "Rollback plan documented"],
        tip: managed ? `Use ${infra.name}'s managed services first; move to Kubernetes only when you outgrow them.` : "Start with Docker on a single VM. Kubernetes is only worth it at real scale."
      },
      {
        id: "monitor",
        title: "Monitor & improve",
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

    return {
      useCaseId,
      useCase: uc,
      requirement: requirement || "",
      answers: a,
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

  function labelFor(qid, value) {
    const q = KB.QUESTIONS.find(x => x.id === qid);
    const o = q && q.options.find(x => x.value === value);
    return o ? o.label : value;
  }

  const stripTags = s => String(s).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\{\{([^}]+)\}\}/g, "$1");

  /** Export a plan as Markdown. */
  function toMarkdown(plan) {
    const L = [];
    L.push(`# ML Plan: ${plan.useCase.name}`, "");
    if (plan.requirement) L.push(`> ${plan.requirement}`, "");
    L.push(`**Approach:** ${stripTags(plan.model.name)} (${plan.tier})`, "");
    L.push(`**Estimated cost:** ${plan.cost}`, "");
    if (plan.warnings.length) { L.push("## Heads-up"); plan.warnings.forEach(w => L.push(`- ${stripTags(w)}`)); L.push(""); }
    L.push("## Tech stack");
    Object.entries(plan.stack).forEach(([k, v]) => L.push(`- **${k}:** ${v.join(", ")}`));
    L.push("", `## Infrastructure (${plan.infraName})`, "| Component | Choice |", "|---|---|");
    plan.infraRows.forEach(([k, v]) => L.push(`| ${k} | ${v} |`));
    L.push("", "## Architecture", plan.architecture.map(n => n.label).join(" → "), "");
    plan.steps.forEach((s, i) => {
      L.push(`## Step ${i + 1}: ${s.title}`, "", `*${s.simple}*`, "", `**Why:** ${stripTags(s.why)}`, "");
      s.sections.forEach(sec => { L.push(`### ${sec.heading}`); sec.items.forEach(it => L.push(`- ${stripTags(it)}`)); L.push(""); });
      (s.code || []).forEach(c => L.push(`**${c.label}**`, "", "```" + c.lang, c.content, "```", ""));
      L.push("**Checklist**"); s.checklist.forEach(c => L.push(`- [ ] ${c}`)); L.push("", `> 💡 ${s.tip}`, "");
    });
    return L.join("\n");
  }

  const API = { escapeHtml, classify, buildPlan, chooseTier, toMarkdown, IMPLICIT_LABELS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.HM_ENGINE = API;
})(typeof window !== "undefined" ? window : globalThis);
