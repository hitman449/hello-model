/*
 * Knowledge base for Hello Model.
 * Use cases, follow-up questions, infrastructure catalog and glossary.
 * Text may contain {{term}} markers which the UI turns into glossary tooltips.
 */
(function (root) {
  const USE_CASES = {
    "tabular-classification": {
      name: "Tabular Classification",
      icon: "📊",
      tagline: "Predict a category (yes/no, A/B/C) from rows of a spreadsheet or database.",
      examples: ["Predict which customers will churn", "Flag fraudulent transactions", "Approve or reject loan applications"],
      keywords: {
        churn: 3, fraud: 3, "will leave": 3, "yes or no": 2, approve: 2, reject: 1, default: 2, "loan": 2,
        classify: 1, category: 1, spreadsheet: 2, csv: 2, tabular: 3, customers: 1, "lead scoring": 3,
        "likely to": 2, "whether": 1, "risk": 1, "convert": 1, "database": 1, "excel": 2
      },
      needsGPU: false,
      metric: "{{F1 score}} and {{ROC-AUC}} (use {{precision}}/{{recall}} if one kind of mistake is costlier)",
      dataTips: [
        "Export one row per entity (customer, transaction) with the outcome you want to predict as a column.",
        "Make sure every feature is something you would actually know at prediction time — otherwise you get {{data leakage}}.",
        "Aim for at least a few hundred examples of the rarest class."
      ],
      labeling: "Labels usually already exist in your systems (e.g. 'cancelled_subscription = true'). Join them from your CRM / billing database.",
      prep: ["Handle missing values (impute median / 'unknown' category)", "Encode categories (one-hot or target encoding)", "Split by time if the data has dates, to mimic the future", "Check {{class imbalance}} and consider class weights"],
      baseline: "Predict the majority class, then try a {{logistic regression}}. Any real model must beat both.",
      models: {
        starter: { name: "AutoML (e.g. AutoGluon / Vertex AutoML / SageMaker Autopilot)", why: "Tries dozens of models for you. Great when you are new or want a strong result fast.", libs: ["AutoGluon", "pandas"] },
        standard: { name: "Gradient-boosted trees (XGBoost / LightGBM)", why: "The best accuracy-to-effort ratio for tabular data. Fast, CPU-only, explainable with SHAP.", libs: ["LightGBM", "scikit-learn", "pandas", "SHAP"] },
        advanced: { name: "Tuned LightGBM/CatBoost ensemble + feature store", why: "At scale, careful feature engineering and hyperparameter search beat fancier architectures.", libs: ["LightGBM", "CatBoost", "Optuna", "Feast"] }
      },
      starterCode: `# pip install autogluon
from autogluon.tabular import TabularPredictor
import pandas as pd

df = pd.read_csv("customers.csv")
predictor = TabularPredictor(label="churned").fit(df, time_limit=600)
print(predictor.leaderboard())`,
      trainCode: `# pip install lightgbm scikit-learn pandas
import pandas as pd, lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

df = pd.read_csv("customers.csv")
X = df.drop(columns=["churned"])
y = df["churned"]
X = pd.get_dummies(X)  # simple categorical encoding

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
model = lgb.LGBMClassifier(n_estimators=500, learning_rate=0.05, class_weight="balanced")
model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)])

pred = model.predict_proba(X_te)[:, 1]
print("ROC-AUC:", roc_auc_score(y_te, pred))
print(classification_report(y_te, pred > 0.5))
model.booster_.save_model("model.txt")`,
      evaluation: ["Confusion matrix on a held-out test set", "Pick the decision threshold from business cost, not 0.5 by default", "Explain predictions with SHAP to build trust"],
      monitoring: ["Feature {{data drift}} (distribution shift vs training)", "Prediction rate per class", "Real outcome vs prediction once labels arrive"],
      pitfalls: ["{{Data leakage}} — a feature that secretly contains the answer", "Optimising accuracy on imbalanced data (99% accuracy can mean useless)"]
    },

    "regression": {
      name: "Regression (Predict a Number)",
      icon: "📈",
      tagline: "Estimate a numeric value such as a price, a duration or a score.",
      examples: ["Estimate house prices from features", "Predict delivery time for an order", "Estimate insurance claim cost"],
      keywords: {
        price: 3, estimate: 2, "how much": 3, "how long": 2, value: 1, cost: 2, salary: 3, revenue: 1,
        amount: 1, number: 1, "predict the": 1, duration: 2, "delivery time": 3, valuation: 3, score: 1
      },
      needsGPU: false,
      metric: "{{MAE}} (easy to explain: 'off by $X on average') and {{RMSE}} (punishes big misses)",
      dataTips: ["Collect one row per item with the true value you want to predict.", "Look for outliers in the target — a few extreme values can dominate training.", "A few thousand rows is usually enough for a solid start."],
      labeling: "The target is usually a historical number (sold price, actual delivery minutes). Pull it from your transactional database.",
      prep: ["Log-transform skewed targets like prices", "Impute missing values", "Encode categories", "Remove impossible values (negative prices, etc.)"],
      baseline: "Predict the mean or median of the target. Then try {{linear regression}}.",
      models: {
        starter: { name: "AutoML regression (AutoGluon / Vertex AutoML)", why: "Lets you get a robust model without tuning anything by hand.", libs: ["AutoGluon", "pandas"] },
        standard: { name: "Gradient-boosted trees (LightGBM / XGBoost)", why: "Handles non-linear relationships and mixed feature types out of the box.", libs: ["LightGBM", "scikit-learn", "pandas"] },
        advanced: { name: "LightGBM with quantile objectives for prediction intervals", why: "Gives a range ('$310k–$345k'), which is often more useful than one number.", libs: ["LightGBM", "Optuna", "MLflow"] }
      },
      starterCode: `# pip install autogluon
from autogluon.tabular import TabularPredictor
import pandas as pd

df = pd.read_csv("houses.csv")
predictor = TabularPredictor(label="price", problem_type="regression").fit(df, time_limit=600)
print(predictor.leaderboard())`,
      trainCode: `# pip install lightgbm scikit-learn pandas numpy
import numpy as np, pandas as pd, lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

df = pd.read_csv("houses.csv")
X = pd.get_dummies(df.drop(columns=["price"]))
y = np.log1p(df["price"])  # log target for skewed prices

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
model = lgb.LGBMRegressor(n_estimators=1000, learning_rate=0.03)
model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)])

pred = np.expm1(model.predict(X_te))
print("MAE:", mean_absolute_error(np.expm1(y_te), pred))
model.booster_.save_model("model.txt")`,
      evaluation: ["Plot predicted vs actual", "Check error per segment (cheap vs expensive items)", "Report MAE in business units"],
      monitoring: ["Input {{data drift}}", "Error once true values arrive", "Share of predictions outside the training range"],
      pitfalls: ["Extrapolation — models can't predict well outside the range they saw", "Using features only known after the fact"]
    },

    "forecasting": {
      name: "Time-Series Forecasting",
      icon: "⏱️",
      tagline: "Predict future values from history: demand, traffic, sales, load.",
      examples: ["Forecast weekly sales per store", "Predict website traffic next month", "Forecast energy demand per hour"],
      keywords: {
        forecast: 4, "next month": 3, "next week": 3, "next year": 2, demand: 3, "over time": 2, trend: 2,
        seasonal: 3, "time series": 4, "timeseries": 4, future: 2, inventory: 2, "stock price": 2, daily: 1,
        weekly: 1, monthly: 1, hourly: 1, sales: 1, traffic: 1, capacity: 1
      },
      needsGPU: false,
      metric: "{{MAPE}} or {{MAE}} measured with {{backtesting}} over several past periods",
      dataTips: ["You need a timestamp column and the value, ideally 2+ full seasonal cycles (e.g. 2 years for yearly patterns).", "Include known future events: holidays, promotions, price changes.", "Keep the timestamps regular (fill gaps explicitly)."],
      labeling: "No manual labeling needed — the future values in your history are the labels.",
      prep: ["Resample to a regular frequency", "Fill or flag missing periods", "Add calendar features (day of week, holiday)", "Never shuffle — always split by time"],
      baseline: "A {{seasonal naive}} forecast: 'same as the same day last week'. Surprisingly hard to beat.",
      models: {
        starter: { name: "Pretrained forecasting model (Chronos / TimesFM) or Prophet", why: "Zero-shot foundation models forecast without training; Prophet is simple and explainable.", libs: ["chronos-forecasting", "Prophet", "pandas"] },
        standard: { name: "StatsForecast (AutoETS/AutoARIMA) + LightGBM with lag features", why: "Fast, reliable statistical models plus a tree model for extra signals.", libs: ["StatsForecast", "MLForecast", "LightGBM"] },
        advanced: { name: "Global deep models (N-HiTS / TFT) across many series", why: "When you have thousands of related series, one global model learns shared patterns.", libs: ["NeuralForecast", "PyTorch", "Ray"] }
      },
      starterCode: `# pip install chronos-forecasting pandas torch
import pandas as pd, torch
from chronos import BaseChronosPipeline

df = pd.read_csv("sales.csv", parse_dates=["date"])
pipe = BaseChronosPipeline.from_pretrained("amazon/chronos-bolt-small")
quantiles, mean = pipe.predict_quantiles(
    context=torch.tensor(df["sales"].values), prediction_length=28,
    quantile_levels=[0.1, 0.5, 0.9])
print(mean)`,
      trainCode: `# pip install statsforecast pandas
import pandas as pd
from statsforecast import StatsForecast
from statsforecast.models import AutoETS, SeasonalNaive

df = pd.read_csv("sales.csv", parse_dates=["date"])
df = df.rename(columns={"store_id": "unique_id", "date": "ds", "sales": "y"})

sf = StatsForecast(models=[AutoETS(season_length=7), SeasonalNaive(season_length=7)], freq="D")
cv = sf.cross_validation(df=df, h=28, n_windows=4)   # backtesting
print(cv.head())
forecast = sf.forecast(df=df, h=28)
forecast.to_csv("forecast.csv", index=False)`,
      evaluation: ["Rolling-origin {{backtesting}}", "Compare against the seasonal naive baseline", "Check prediction intervals actually contain ~80–90% of outcomes"],
      monitoring: ["Forecast error each period", "Structural breaks (new store, pandemic-style shocks)", "Retraining on a schedule (weekly/monthly)"],
      pitfalls: ["Random train/test split leaks the future", "Ignoring holidays and promotions"]
    },

    "text-classification": {
      name: "Text Classification",
      icon: "🏷️",
      tagline: "Sort text into categories: sentiment, topic, intent, spam, priority.",
      examples: ["Detect sentiment of product reviews", "Route support tickets to the right team", "Filter spam emails"],
      keywords: {
        sentiment: 4, review: 2, reviews: 2, ticket: 3, tickets: 3, email: 2, emails: 2, spam: 4, text: 2,
        tweets: 3, comments: 2, intent: 3, topic: 2, feedback: 2, "toxic": 3, "moderation": 3, categorize: 2,
        route: 2, messages: 1, "nlp": 3, "language": 1
      },
      needsGPU: true,
      metric: "{{F1 score}} per class (macro-F1 when classes are imbalanced)",
      dataTips: ["Collect real text examples from the place the model will run (tickets, reviews).", "200–500 labeled examples per class is enough for fine-tuning a small transformer.", "Write a one-page labeling guide so everyone labels the same way."],
      labeling: "Use Label Studio or Argilla. Or bootstrap: let an LLM pre-label and have humans correct it.",
      prep: ["Remove duplicates and boilerplate (signatures, quoted replies)", "Keep raw text — modern models don't need stemming/stop-word removal", "Stratified train/validation/test split"],
      baseline: "{{TF-IDF}} + logistic regression. Trains in seconds and is often 80–90% as good.",
      models: {
        starter: { name: "LLM zero-shot / few-shot classification via API", why: "No training needed — describe the categories in a prompt. Great for prototyping or < 100 examples.", libs: ["Anthropic / OpenAI SDK", "pydantic"] },
        standard: { name: "Fine-tuned small transformer (DistilBERT / ModernBERT) or SetFit", why: "Cheap to run, fast, and accurate once you have a few hundred labels.", libs: ["Hugging Face Transformers", "SetFit", "datasets"] },
        advanced: { name: "Fine-tuned larger encoder + active learning loop", why: "Maximises accuracy on large, evolving datasets while keeping labeling cost low.", libs: ["Transformers", "Argilla", "MLflow", "ONNX Runtime"] }
      },
      starterCode: `# pip install anthropic
import anthropic
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY

LABELS = ["billing", "bug", "feature_request", "other"]
def classify(text: str) -> str:
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001", max_tokens=10,
        messages=[{"role": "user", "content":
            f"Classify this support ticket into one of {LABELS}. "
            f"Answer with the label only.\\n\\n{text}"}])
    return msg.content[0].text.strip()

print(classify("I was charged twice this month"))`,
      trainCode: `# pip install transformers datasets evaluate accelerate
from datasets import load_dataset
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                          TrainingArguments, Trainer)

ds = load_dataset("csv", data_files={"train": "train.csv", "test": "test.csv"})
labels = sorted(set(ds["train"]["label"]))
l2id = {l: i for i, l in enumerate(labels)}
ds = ds.map(lambda x: {"labels": l2id[x["label"]]})

name = "distilbert-base-uncased"
tok = AutoTokenizer.from_pretrained(name)
ds = ds.map(lambda b: tok(b["text"], truncation=True, max_length=256), batched=True)
model = AutoModelForSequenceClassification.from_pretrained(name, num_labels=len(labels))

args = TrainingArguments("out", num_train_epochs=3, per_device_train_batch_size=16,
                         eval_strategy="epoch", learning_rate=2e-5)
trainer = Trainer(model=model, args=args, train_dataset=ds["train"],
                  eval_dataset=ds["test"], tokenizer=tok)
trainer.train()
trainer.save_model("model")`,
      evaluation: ["Per-class precision/recall", "Read 50 misclassified examples — they reveal labeling issues", "Test on very short and very long inputs"],
      monitoring: ["Class distribution over time", "Low-confidence rate (send to human review)", "New vocabulary / topics appearing"],
      pitfalls: ["Inconsistent labels between annotators", "Training on clean text but serving messy text"]
    },

    "image-classification": {
      name: "Image Classification",
      icon: "🖼️",
      tagline: "Assign a label to a whole image: defect/ok, species, product type, diagnosis.",
      examples: ["Detect defective products on a production line", "Identify plant diseases from leaf photos", "Classify X-ray images"],
      keywords: {
        image: 3, images: 3, photo: 3, photos: 3, picture: 3, pictures: 3, "x-ray": 3, xray: 3, scan: 2,
        defect: 2, "visual": 2, leaf: 2, skin: 1, "classify images": 4, camera: 1, medical: 1, "screenshot": 2
      },
      needsGPU: true,
      metric: "{{Accuracy}} and per-class {{recall}} (for defect detection, missed defects matter most)",
      dataTips: ["Collect images in the same conditions as production (lighting, angle, camera).", "Start with 100–300 images per class for {{transfer learning}}.", "Organise as folders: data/train/<class>/*.jpg"],
      labeling: "Folder-per-class is enough. For larger sets use Label Studio, CVAT or Roboflow.",
      prep: ["Resize to model input size (e.g. 224×224)", "{{Data augmentation}}: flips, rotations, color jitter", "Remove near-duplicate images across train/test splits"],
      baseline: "A pretrained model used as a frozen feature extractor + logistic regression.",
      models: {
        starter: { name: "No-code / AutoML vision (Teachable Machine, Roboflow, Vertex AutoML)", why: "Upload labeled images and get a model in minutes, no code required.", libs: ["Roboflow", "Teachable Machine"] },
        standard: { name: "Fine-tuned pretrained CNN/ViT (ConvNeXt, EfficientNet) via timm", why: "{{Transfer learning}} gets high accuracy from a few hundred images per class.", libs: ["PyTorch", "timm", "torchvision"] },
        advanced: { name: "Vision foundation model (DINOv2 / CLIP) fine-tuning + distillation to a small edge model", why: "Best accuracy, then compress for fast/cheap inference.", libs: ["PyTorch", "timm", "ONNX", "TensorRT"] }
      },
      starterCode: `# Zero-shot with CLIP: no training needed
# pip install transformers pillow torch
from transformers import pipeline
clf = pipeline("zero-shot-image-classification", model="openai/clip-vit-base-patch32")
print(clf("leaf.jpg", candidate_labels=["healthy leaf", "leaf with rust disease"]))`,
      trainCode: `# pip install torch torchvision timm
import timm, torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

tf = transforms.Compose([transforms.RandomResizedCrop(224), transforms.RandomHorizontalFlip(),
                         transforms.ToTensor(), transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])
train = datasets.ImageFolder("data/train", tf)
loader = DataLoader(train, batch_size=32, shuffle=True)

model = timm.create_model("convnext_tiny", pretrained=True, num_classes=len(train.classes))
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
opt = torch.optim.AdamW(model.parameters(), lr=1e-4)

for epoch in range(5):
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        loss = torch.nn.functional.cross_entropy(model(x), y)
        opt.zero_grad(); loss.backward(); opt.step()
    print(epoch, loss.item())
torch.save(model.state_dict(), "model.pt")`,
      evaluation: ["Confusion matrix", "Look at misclassified images in a grid", "Test on images from a different day/camera"],
      monitoring: ["Image brightness/size drift", "Prediction confidence distribution", "Sample images for periodic human audit"],
      pitfalls: ["Model learns the background, not the object", "Same item photographed twice ends up in train and test"]
    },

    "object-detection": {
      name: "Object Detection",
      icon: "🎯",
      tagline: "Find and locate objects in images or video with bounding boxes; count and track them.",
      examples: ["Count people entering a store from CCTV", "Detect helmets on construction workers", "Find damaged areas on cars"],
      keywords: {
        detect: 2, detection: 3, locate: 3, "bounding box": 4, count: 2, counting: 3, video: 3, cctv: 4,
        cameras: 2, track: 2, tracking: 3, "where in": 3, yolo: 4, "in real time": 1, drone: 2, segmentation: 3,
        "license plate": 3, helmet: 2, people: 1, vehicles: 2
      },
      needsGPU: true,
      metric: "{{mAP}} (mean Average Precision) at IoU 0.5, plus FPS for video",
      dataTips: ["Collect frames covering different lighting, distances and occlusions.", "Start with ~200–500 annotated images; more for small or rare objects.", "Sample video frames sparsely so the dataset isn't full of near-duplicates."],
      labeling: "Draw boxes in CVAT, Label Studio or Roboflow. Use a pretrained model to pre-annotate and just correct it.",
      prep: ["Export labels in YOLO or COCO format", "Augment with mosaic, scaling, brightness", "Split by video/scene, not by frame"],
      baseline: "A COCO-pretrained YOLO model with no fine-tuning — it may already detect people, cars, etc.",
      models: {
        starter: { name: "Pretrained YOLO / open-vocabulary detector (YOLO-World, Grounding DINO)", why: "Detect common objects or describe new ones in words — no training needed.", libs: ["Ultralytics", "supervision"] },
        standard: { name: "Fine-tuned YOLO (Ultralytics) on your labeled images", why: "Excellent speed/accuracy, simple training CLI, exports to ONNX/TensorRT/CoreML.", libs: ["Ultralytics", "PyTorch", "supervision"] },
        advanced: { name: "RT-DETR / YOLO + tracking (ByteTrack) + TensorRT on edge GPUs", why: "Production-grade real-time video pipelines with multi-camera tracking.", libs: ["Ultralytics", "NVIDIA DeepStream", "TensorRT", "ByteTrack"] }
      },
      starterCode: `# pip install ultralytics
from ultralytics import YOLO
model = YOLO("yolo11n.pt")            # pretrained on 80 COCO classes
results = model("store_entrance.jpg")
people = [b for b in results[0].boxes if int(b.cls) == 0]
print("people detected:", len(people))`,
      trainCode: `# pip install ultralytics
from ultralytics import YOLO

# data.yaml lists train/val image folders and class names
model = YOLO("yolo11s.pt")
model.train(data="data.yaml", epochs=100, imgsz=640, batch=16)
metrics = model.val()
print("mAP50:", metrics.box.map50)
model.export(format="onnx")   # or "engine" (TensorRT), "coreml", "tflite"`,
      evaluation: ["mAP per class", "Visualise predictions on held-out video", "Measure FPS on the real target hardware"],
      monitoring: ["Detections per frame over time", "Camera health (blank/blurred frames)", "Periodic human review of sampled frames"],
      pitfalls: ["Tiny objects need higher input resolution", "Testing on frames from the same video clip as training"]
    },

    "llm-rag": {
      name: "LLM Assistant / RAG Chatbot",
      icon: "💬",
      tagline: "A chatbot or assistant that answers questions using your own documents and data.",
      examples: ["Chatbot that answers questions from our PDF manuals", "Internal assistant over company wiki", "Customer support bot using our FAQ"],
      keywords: {
        chatbot: 5, chat: 3, assistant: 3, "answer questions": 4, questions: 1, documents: 3, pdf: 3, pdfs: 3,
        wiki: 3, "knowledge base": 4, llm: 4, gpt: 3, rag: 5, "q&a": 4, faq: 3, conversational: 3, summarize: 3,
        summarise: 3, "generate": 2, agent: 2, manuals: 2, "search our": 2, "write": 1, docs: 2, policies: 1
      },
      needsGPU: false,
      metric: "Answer correctness and {{groundedness}} on a golden Q&A set; latency and cost per answer",
      dataTips: ["Gather the documents the bot should know (PDF, HTML, Notion, Confluence…).", "Write 30–100 real questions with ideal answers — your {{golden set}}.", "Note which sources are authoritative and which are outdated."],
      labeling: "No training labels needed. Your golden Q&A set is the evaluation 'label'.",
      prep: ["Extract text from documents (keep headings & page numbers)", "Split into {{chunks}} of ~300–800 tokens with overlap", "Create {{embeddings}} and store them in a {{vector database}}", "Attach metadata (source, date, permissions) to each chunk"],
      baseline: "Just put a few documents in the prompt of a hosted LLM and see how well it answers the golden set.",
      models: {
        starter: { name: "Hosted LLM API (Claude) + managed RAG / long context", why: "No infrastructure to run; small corpora can even fit in the context window.", libs: ["Anthropic SDK", "pypdf"] },
        standard: { name: "{{RAG}}: hosted LLM + embeddings + vector DB", why: "Scales to thousands of documents, answers cite sources, data stays updatable without retraining.", libs: ["Anthropic SDK", "sentence-transformers", "pgvector / Qdrant / Chroma", "FastAPI"] },
        advanced: { name: "Hybrid search + reranker + agentic tool use, or self-hosted open-weights LLM", why: "Higher answer quality, and full data control when privacy requires on-prem.", libs: ["vLLM", "BM25 + embeddings", "cross-encoder reranker", "Ragas / promptfoo"] }
      },
      starterCode: `# pip install anthropic pypdf
import anthropic
from pypdf import PdfReader

text = "\\n".join(p.extract_text() for p in PdfReader("manual.pdf").pages)
client = anthropic.Anthropic()
resp = client.messages.create(
    model="claude-sonnet-5-5", max_tokens=1024,
    system="Answer only from the provided manual. If unsure, say you don't know.",
    messages=[{"role": "user", "content": f"<manual>{text}</manual>\\n\\nHow do I reset the device?"}])
print(resp.content[0].text)`,
      trainCode: `# pip install anthropic chromadb sentence-transformers
import anthropic, chromadb
from chromadb.utils import embedding_functions

ef = embedding_functions.SentenceTransformerEmbeddingFunction("all-MiniLM-L6-v2")
db = chromadb.PersistentClient("./index").get_or_create_collection("docs", embedding_function=ef)

# 1) Index: chunks = list of (id, text, source)
# db.add(ids=[c[0] for c in chunks], documents=[c[1] for c in chunks],
#        metadatas=[{"source": c[2]} for c in chunks])

# 2) Retrieve + generate
def answer(question: str) -> str:
    hits = db.query(query_texts=[question], n_results=5)
    context = "\\n\\n".join(f"[{m['source']}] {d}" for d, m in
                           zip(hits["documents"][0], hits["metadatas"][0]))
    msg = anthropic.Anthropic().messages.create(
        model="claude-sonnet-5-5", max_tokens=800,
        system="Answer using only the context. Cite sources in [brackets].",
        messages=[{"role": "user", "content": f"Context:\\n{context}\\n\\nQuestion: {question}"}])
    return msg.content[0].text

print(answer("What is the refund policy?"))`,
      evaluation: ["Run the golden set after every change (prompt, chunking, model)", "Check retrieval hit-rate separately from answer quality", "Use an LLM-as-judge plus human spot checks", "Red-team: prompt injection, off-topic and unanswerable questions"],
      monitoring: ["Thumbs up/down feedback", "Cost and tokens per conversation", "Questions with no good retrieval hits (content gaps)", "Latency p95"],
      pitfalls: ["{{Hallucination}} when retrieval misses — instruct the model to say 'I don't know'", "Leaking documents users shouldn't see — filter by permissions at retrieval time"]
    },

    "recommendation": {
      name: "Recommendation System",
      icon: "🛍️",
      tagline: "Suggest relevant products, content or people to each user.",
      examples: ["Recommend products based on purchase history", "'You might also like' for articles", "Suggest courses to learners"],
      keywords: {
        recommend: 5, recommendation: 5, recommendations: 5, suggest: 3, "similar items": 4, "similar products": 4,
        personalize: 4, personalise: 4, personalized: 4, "you might like": 4, "next best": 3, playlist: 2,
        "users who": 3, catalog: 2, "purchase history": 3, ranking: 2, feed: 2
      },
      needsGPU: false,
      metric: "{{Recall@K}} / {{NDCG}} offline; click-through and conversion in an {{A/B test}} online",
      dataTips: ["Interaction logs are the key: user_id, item_id, timestamp, event (view/click/buy).", "Item metadata (title, category, description) helps with new items ({{cold start}}).", "Thousands of users with several interactions each is a good start."],
      labeling: "Implicit feedback (clicks, purchases) acts as labels — no manual labeling.",
      prep: ["Deduplicate events, remove bots", "Split by time: train on the past, test on the next period", "Build item text/feature representations for cold start"],
      baseline: "Recommend the most popular items (overall or per category). Many systems barely beat this — measure it!",
      models: {
        starter: { name: "Popularity + content-based similarity (embeddings of item descriptions)", why: "Works with little interaction data and handles new items.", libs: ["sentence-transformers", "pandas", "scikit-learn"] },
        standard: { name: "Collaborative filtering (implicit ALS / LightFM) + content features", why: "Learns taste from behaviour; proven and cheap to run.", libs: ["implicit", "LightFM", "pandas"] },
        advanced: { name: "Two-tower retrieval + ranking model (+ real-time features)", why: "Industry-standard architecture for millions of users and items.", libs: ["TensorFlow Recommenders / TorchRec", "FAISS", "Feast", "LightGBM ranker"] }
      },
      starterCode: `# Content-based "similar items"
# pip install sentence-transformers pandas
import pandas as pd
from sentence_transformers import SentenceTransformer, util

items = pd.read_csv("items.csv")            # id, title, description
model = SentenceTransformer("all-MiniLM-L6-v2")
emb = model.encode((items.title + ". " + items.description).tolist(), convert_to_tensor=True)
scores = util.cos_sim(emb[0], emb)[0]
print(items.iloc[scores.argsort(descending=True)[1:6].cpu()].title)`,
      trainCode: `# pip install implicit pandas scipy
import pandas as pd, scipy.sparse as sp
from implicit.als import AlternatingLeastSquares

ev = pd.read_csv("events.csv")              # user_id, item_id, weight
users = ev.user_id.astype("category"); items = ev.item_id.astype("category")
mat = sp.csr_matrix((ev.weight, (users.cat.codes, items.cat.codes)))

model = AlternatingLeastSquares(factors=64, iterations=20)
model.fit(mat)
uid = 0
ids, scores = model.recommend(uid, mat[uid], N=10)
print([items.cat.categories[i] for i in ids])`,
      evaluation: ["Recall@10 on a time-based holdout", "Coverage & diversity (are you only showing best-sellers?)", "Online A/B test vs popularity baseline"],
      monitoring: ["CTR and conversion", "Catalog coverage", "Feedback loops (popular gets more popular)"],
      pitfalls: ["Random splits leak future behaviour", "Ignoring the cold-start problem for new users/items"]
    },

    "anomaly-detection": {
      name: "Anomaly Detection",
      icon: "🚨",
      tagline: "Spot unusual events: failing machines, suspicious logins, odd transactions.",
      examples: ["Detect machine failures from sensor data", "Find unusual login activity", "Spot abnormal spikes in server metrics"],
      keywords: {
        anomaly: 5, anomalies: 5, outlier: 4, outliers: 4, unusual: 4, abnormal: 4, suspicious: 3, intrusion: 4,
        sensor: 3, sensors: 3, "predictive maintenance": 5, failure: 2, failures: 2, spike: 3, spikes: 3,
        monitoring: 1, iot: 3, "rare": 2, logs: 2
      },
      needsGPU: false,
      metric: "{{Precision}} at a fixed alert budget (e.g. top 50 alerts/day) and recall on known incidents",
      dataTips: ["Collect mostly 'normal' history — anomalies are rare by definition.", "Keep a list of known past incidents with timestamps; they become your test set.", "For sensors, keep raw high-frequency data plus aggregates."],
      labeling: "Usually unlabeled. Label a small set of confirmed incidents for evaluation; domain experts review alerts.",
      prep: ["Normalise each signal", "Create rolling-window features (mean, std, rate of change)", "Separate by entity (per machine/user) since 'normal' differs"],
      baseline: "Simple statistical thresholds: alert when a value is > 3 standard deviations from its rolling mean.",
      models: {
        starter: { name: "Statistical rules + Isolation Forest", why: "Unsupervised, fast and easy to explain.", libs: ["scikit-learn", "pandas"] },
        standard: { name: "Isolation Forest / ECOD ensembles via PyOD with rolling features", why: "Strong unsupervised detectors with tunable alert volume.", libs: ["PyOD", "scikit-learn", "pandas"] },
        advanced: { name: "Autoencoder / sequence models + supervised model once labels accumulate", why: "Captures complex multivariate patterns; supervised layer reduces false alarms.", libs: ["PyTorch", "PyOD", "Kafka / Flink for streaming"] }
      },
      starterCode: `import pandas as pd
df = pd.read_csv("sensor.csv", parse_dates=["ts"]).set_index("ts")
roll = df["temperature"].rolling("1h")
z = (df["temperature"] - roll.mean()) / roll.std()
alerts = df[z.abs() > 3]
print(alerts.head())`,
      trainCode: `# pip install scikit-learn pandas
import pandas as pd
from sklearn.ensemble import IsolationForest

df = pd.read_csv("sensor.csv", parse_dates=["ts"]).set_index("ts")
feats = pd.DataFrame({
    "mean_1h": df["temperature"].rolling("1h").mean(),
    "std_1h": df["temperature"].rolling("1h").std(),
    "vibration": df["vibration"],
}).dropna()

model = IsolationForest(n_estimators=300, contamination=0.005, random_state=42)
feats["anomaly"] = model.fit_predict(feats) == -1
feats["score"] = -model.score_samples(feats.drop(columns="anomaly"))
print(feats.sort_values("score", ascending=False).head(20))`,
      evaluation: ["Check detections against known incidents", "Ask experts to review the top-N alerts", "Tune threshold to an alert volume the team can handle"],
      monitoring: ["Alert volume per day", "Alert acknowledgement / false-positive rate", "Sensor dropouts"],
      pitfalls: ["Alert fatigue from too many false positives", "Treating seasonality (e.g. night vs day) as anomalies"]
    },

    "speech": {
      name: "Speech & Audio",
      icon: "🎙️",
      tagline: "Transcribe speech, classify sounds or build voice interfaces.",
      examples: ["Transcribe customer calls and summarise them", "Voice commands for a mobile app", "Detect machine sounds that indicate faults"],
      keywords: {
        speech: 5, audio: 4, voice: 4, transcribe: 5, transcription: 5, calls: 2, call: 1, podcast: 3,
        "speech to text": 5, meeting: 2, meetings: 2, sound: 3, sounds: 3, spoken: 3, microphone: 2, subtitles: 3
      },
      needsGPU: true,
      metric: "{{WER}} (Word Error Rate) for transcription; accuracy/F1 for sound classification",
      dataTips: ["Collect real recordings: same microphones, accents, background noise as production.", "For custom vocabulary (product names), gather a list of terms.", "1–10 hours of transcribed audio is enough to fine-tune for a domain."],
      labeling: "Correct auto-generated transcripts rather than typing from scratch (Label Studio supports audio).",
      prep: ["Convert to 16 kHz mono WAV", "Split long recordings into segments (voice activity detection)", "Remove personal data from transcripts if required"],
      baseline: "Off-the-shelf Whisper or a cloud speech-to-text API on your recordings — measure WER.",
      models: {
        starter: { name: "Cloud speech-to-text API or Whisper (pretrained)", why: "State-of-the-art accuracy out of the box in ~100 languages.", libs: ["faster-whisper", "Cloud STT APIs"] },
        standard: { name: "Whisper (faster-whisper) self-hosted + LLM for summaries", why: "Cheap at volume, private, and an LLM turns transcripts into insights.", libs: ["faster-whisper", "pyannote (speakers)", "Anthropic SDK"] },
        advanced: { name: "Fine-tuned Whisper / streaming ASR + speaker diarization", why: "Domain vocabulary, real-time streaming and who-said-what.", libs: ["Transformers", "NVIDIA NeMo", "pyannote", "Triton"] }
      },
      starterCode: `# pip install faster-whisper
from faster_whisper import WhisperModel
model = WhisperModel("small", device="auto")
segments, info = model.transcribe("call.wav")
for s in segments:
    print(f"[{s.start:.1f}s] {s.text}")`,
      trainCode: `# pip install faster-whisper anthropic
from faster_whisper import WhisperModel
import anthropic

asr = WhisperModel("large-v3", device="cuda", compute_type="float16")
segments, _ = asr.transcribe("call.wav", vad_filter=True)
transcript = " ".join(s.text for s in segments)

summary = anthropic.Anthropic().messages.create(
    model="claude-haiku-4-5-20251001", max_tokens=400,
    messages=[{"role": "user", "content":
        f"Summarise this support call in 3 bullets and list action items:\\n{transcript}"}])
print(summary.content[0].text)`,
      evaluation: ["WER on a held-out set of real recordings", "Check names/numbers specifically", "Evaluate per accent / noise level"],
      monitoring: ["Average confidence per recording", "Audio quality (clipping, silence)", "Processing time vs audio length"],
      pitfalls: ["Testing on clean audio but deploying in noisy environments", "Storing voice data without consent"]
    }
  };

  const QUESTIONS = [
    {
      id: "data",
      title: "How much example data do you have?",
      help: "Examples = rows, documents, images or recordings that look like what the model will see.",
      options: [
        { value: "none", label: "None yet", hint: "We'll start with pretrained models that need no training." },
        { value: "small", label: "A little (under ~1,000)", hint: "Enough for transfer learning or few-shot prompting." },
        { value: "medium", label: "A fair amount (1k – 100k)", hint: "Enough to train or fine-tune a solid model." },
        { value: "large", label: "Lots (over 100k)", hint: "Custom training and bigger models become worthwhile." }
      ]
    },
    {
      id: "labels",
      title: "Is your data labeled with the right answers?",
      help: "A label is the correct answer for each example, e.g. 'spam' / 'not spam' or the actual sale price.",
      options: [
        { value: "yes", label: "Yes, mostly labeled", hint: "We can train supervised models right away." },
        { value: "partial", label: "Partially / messy", hint: "We'll add a labeling + cleanup step." },
        { value: "no", label: "No labels", hint: "We'll use pretrained, zero-shot or unsupervised methods first." }
      ]
    },
    {
      id: "skill",
      title: "What's your team's ML experience?",
      help: "Be honest — this changes how much we automate for you.",
      options: [
        { value: "beginner", label: "Beginner", hint: "New to ML. Prefer managed services and AutoML." },
        { value: "intermediate", label: "Some experience", hint: "Comfortable with Python and notebooks." },
        { value: "expert", label: "Experienced", hint: "Have trained and deployed models before." }
      ]
    },
    {
      id: "deploy",
      title: "Where will the model run?",
      help: "This drives the serving architecture.",
      options: [
        { value: "api", label: "Online API / web app", hint: "Requests come in, answers go out in real time." },
        { value: "batch", label: "Batch / scheduled", hint: "Score a whole dataset nightly or weekly." },
        { value: "edge", label: "On device / edge", hint: "Phone, browser, camera or factory hardware." }
      ]
    },
    {
      id: "latency",
      title: "How fast must each prediction be?",
      help: "Latency is the time between asking and getting an answer.",
      options: [
        { value: "realtime", label: "Instant (< 100 ms)", hint: "Fraud checks, video frames, autocomplete." },
        { value: "interactive", label: "Interactive (< 2–3 s)", hint: "Chatbots, user-facing features." },
        { value: "relaxed", label: "Not critical", hint: "Minutes or hours is fine." }
      ]
    },
    {
      id: "cloud",
      title: "Which cloud or infrastructure do you prefer?",
      help: "Pick what your company already uses — it's usually the easiest path.",
      options: [
        { value: "aws", label: "AWS", hint: "Amazon Web Services" },
        { value: "gcp", label: "Google Cloud", hint: "GCP / Vertex AI" },
        { value: "azure", label: "Microsoft Azure", hint: "Azure ML / AI Foundry" },
        { value: "self", label: "Open-source / self-hosted", hint: "Docker, Kubernetes or your own servers" }
      ]
    },
    {
      id: "budget",
      title: "What's your monthly budget for infrastructure?",
      help: "Rough is fine. We'll size compute accordingly.",
      options: [
        { value: "low", label: "Minimal (< $100)", hint: "Free tiers, serverless, CPU." },
        { value: "medium", label: "Moderate ($100 – $2,000)", hint: "Some GPU time, managed services." },
        { value: "high", label: "Enterprise (> $2,000)", hint: "Dedicated GPUs, HA, full MLOps." }
      ]
    },
    {
      id: "privacy",
      title: "Is the data sensitive (personal, medical, financial)?",
      help: "Sensitive data affects which APIs you can use and where data may live.",
      options: [
        { value: "no", label: "Not really", hint: "Public or low-risk data." },
        { value: "yes", label: "Yes, sensitive", hint: "We'll add privacy & compliance steps." }
      ]
    }
  ];

  // Infrastructure catalog per cloud provider.
  const INFRA = {
    aws: {
      name: "AWS",
      storage: "Amazon S3",
      notebook: "SageMaker Studio notebooks",
      cpuTrain: "SageMaker Training (ml.m5 instances)",
      gpuTrain: "SageMaker Training on ml.g5.xlarge (A10G) / ml.p4d for large jobs",
      platform: "Amazon SageMaker (experiments, model registry)",
      serveServerless: "AWS Lambda (container image) or SageMaker Serverless Inference",
      serveContainer: "Amazon ECS Fargate or App Runner (Docker + FastAPI)",
      serveGPU: "SageMaker real-time endpoint on ml.g5 / Inferentia2",
      batch: "SageMaker Batch Transform, scheduled by EventBridge",
      pipeline: "SageMaker Pipelines or Step Functions",
      vectorDb: "Amazon OpenSearch Serverless or RDS PostgreSQL + pgvector",
      llm: "Amazon Bedrock (Claude and others)",
      monitoring: "CloudWatch + SageMaker Model Monitor",
      secrets: "AWS Secrets Manager + IAM roles",
      privacy: "VPC endpoints, KMS encryption, HIPAA-eligible services, keep data in one region"
    },
    gcp: {
      name: "Google Cloud",
      storage: "Cloud Storage (GCS)",
      notebook: "Vertex AI Workbench / Colab Enterprise",
      cpuTrain: "Vertex AI custom training (n2 machines)",
      gpuTrain: "Vertex AI custom training with L4 (g2) / A100 (a2) GPUs",
      platform: "Vertex AI (experiments, model registry)",
      serveServerless: "Cloud Run (scales to zero)",
      serveContainer: "Cloud Run or GKE Autopilot",
      serveGPU: "Vertex AI Endpoint with GPU, or Cloud Run with L4 GPU",
      batch: "Vertex AI Batch Prediction, scheduled by Cloud Scheduler",
      pipeline: "Vertex AI Pipelines (Kubeflow)",
      vectorDb: "AlloyDB / Cloud SQL + pgvector or Vertex AI Vector Search",
      llm: "Vertex AI Model Garden (Claude, Gemini and others)",
      monitoring: "Cloud Monitoring + Vertex AI Model Monitoring",
      secrets: "Secret Manager + service accounts",
      privacy: "VPC Service Controls, CMEK encryption, data residency regions"
    },
    azure: {
      name: "Microsoft Azure",
      storage: "Azure Blob Storage / Data Lake Gen2",
      notebook: "Azure ML compute instance notebooks",
      cpuTrain: "Azure ML compute clusters (D-series)",
      gpuTrain: "Azure ML compute clusters on NC-series (T4 / A100) GPUs",
      platform: "Azure Machine Learning (MLflow-based registry)",
      serveServerless: "Azure Functions (container) or Azure Container Apps (scale to zero)",
      serveContainer: "Azure Container Apps or AKS",
      serveGPU: "Azure ML managed online endpoint on GPU SKUs",
      batch: "Azure ML batch endpoints, scheduled by Azure ML schedules",
      pipeline: "Azure ML pipelines",
      vectorDb: "Azure AI Search or Azure Database for PostgreSQL + pgvector",
      llm: "Azure AI Foundry (Claude, OpenAI and others)",
      monitoring: "Azure Monitor / Application Insights + Azure ML model monitoring",
      secrets: "Azure Key Vault + managed identities",
      privacy: "Private endpoints, customer-managed keys, regional data residency"
    },
    self: {
      name: "Open-source / self-hosted",
      storage: "Local disk / MinIO (S3-compatible) / PostgreSQL",
      notebook: "JupyterLab or VS Code",
      cpuTrain: "Your laptop or any VM",
      gpuTrain: "A local NVIDIA GPU, or rented GPUs (RunPod, Lambda, Vast.ai)",
      platform: "MLflow (tracking + model registry)",
      serveServerless: "Docker container on a small VM (or Fly.io / Render)",
      serveContainer: "Docker + FastAPI behind Nginx, or Kubernetes (k3s)",
      serveGPU: "Triton Inference Server / vLLM / BentoML on a GPU box",
      batch: "Cron or Prefect/Airflow job running a Python script",
      pipeline: "Prefect, Dagster or Airflow",
      vectorDb: "Qdrant, Chroma or PostgreSQL + pgvector",
      llm: "Ollama or vLLM serving an open-weights model (Llama, Qwen, Mistral)",
      monitoring: "Prometheus + Grafana + Evidently AI",
      secrets: ".env files locally; Vault / Docker secrets in production",
      privacy: "Everything stays on your hardware; encrypt disks and restrict network access"
    }
  };

  const EDGE_FORMATS = "ONNX Runtime (cross-platform), TensorFlow Lite / LiteRT (Android, microcontrollers), Core ML (iOS/macOS), TensorRT (NVIDIA Jetson), ONNX Runtime Web / Transformers.js (browser)";

  const GLOSSARY = {
    "F1 score": "The balance between precision and recall in one number (0–1). Good for imbalanced classes.",
    "ROC-AUC": "How well the model ranks positives above negatives across all thresholds. 0.5 = random, 1.0 = perfect.",
    "precision": "Of everything the model flagged, how much was actually correct.",
    "Precision": "Of everything the model flagged, how much was actually correct.",
    "recall": "Of everything that should have been flagged, how much the model found.",
    "Accuracy": "Share of predictions that are correct. Misleading when one class is rare.",
    "data leakage": "When training data contains information that won't exist at prediction time — results look great in testing and fail in reality.",
    "Data leakage": "When training data contains information that won't exist at prediction time — results look great in testing and fail in reality.",
    "class imbalance": "When one category is much rarer than others (e.g. 1% fraud).",
    "logistic regression": "A simple, fast model that draws a straight boundary between classes. A great baseline.",
    "linear regression": "Fits a straight line (or plane) through the data. The simplest baseline for predicting numbers.",
    "MAE": "Mean Absolute Error — on average, how far off predictions are, in real units.",
    "RMSE": "Root Mean Squared Error — like MAE but punishes large errors more.",
    "MAPE": "Mean Absolute Percentage Error — average error as a percentage of the true value.",
    "backtesting": "Testing a forecast by pretending to be at several past dates and comparing predictions to what actually happened.",
    "seasonal naive": "A forecast that just repeats the value from the same point in the previous season (e.g. last week).",
    "TF-IDF": "Turns text into numbers by counting words, down-weighting very common ones.",
    "transfer learning": "Starting from a model already trained on huge data and adapting it to your task with far less data.",
    "Transfer learning": "Starting from a model already trained on huge data and adapting it to your task with far less data.",
    "Data augmentation": "Creating extra training examples by slightly modifying existing ones (flip, crop, recolor).",
    "mAP": "Mean Average Precision — the standard accuracy score for object detection.",
    "groundedness": "Whether the answer is actually supported by the retrieved documents, not made up.",
    "golden set": "A fixed list of test questions with known good answers used to measure quality after every change.",
    "chunks": "Small passages a document is split into so the most relevant pieces can be retrieved.",
    "embeddings": "Lists of numbers that capture meaning; similar texts get similar embeddings.",
    "vector database": "A database that finds items with the most similar embeddings quickly.",
    "RAG": "Retrieval-Augmented Generation — look up relevant documents first, then let the LLM answer using them.",
    "Hallucination": "When a language model states something confidently that is not true.",
    "Recall@K": "Of the items a user actually liked, how many appear in the top K recommendations.",
    "NDCG": "Ranking quality score that rewards putting the most relevant items at the top.",
    "A/B test": "Showing two versions to random groups of users and comparing real outcomes.",
    "cold start": "The problem of recommending for brand-new users or items with no history.",
    "WER": "Word Error Rate — share of words the transcription got wrong. Lower is better.",
    "data drift": "When live data starts looking different from the training data, which usually degrades accuracy.",
    "baseline": "The simplest reasonable solution. Your model must beat it to be worth deploying.",
    "inference": "Using a trained model to make predictions.",
    "fine-tuning": "Continuing to train a pretrained model on your own data so it specialises.",
    "zero-shot": "Using a model on a task without giving it any training examples for that task.",
    "MLOps": "Practices and tools for reliably deploying, monitoring and updating ML models."
  };


  // Short lessons for the "Training basics" page. Items may use {{term}} glossary markers.
  const TRAINING_TOPICS = [
    {
      id: "workflow",
      title: "The ML workflow at a glance",
      simple: "Every model project follows the same loop: define, collect, prepare, train, evaluate, deploy, monitor.",
      items: [
        "<b>Define</b> the problem and pick one success metric before touching data.",
        "<b>Collect & label</b> real examples that look like what the model will see in production.",
        "<b>Prepare</b> the data and lock away a test set.",
        "<b>Train</b> a simple {{baseline}} first, then something better.",
        "<b>Evaluate</b> on data the model has never seen, and read its mistakes.",
        "<b>Deploy</b> the simplest way that meets your speed needs, then <b>monitor</b> for {{data drift}}."
      ],
      tip: "Most of the effort goes into data and evaluation, not the model itself."
    },
    {
      id: "approach",
      title: "Prompting vs fine-tuning vs training from scratch",
      simple: "Start with the cheapest option that could work, and only move up when you have the data and a reason.",
      items: [
        "<b>Prompting / {{zero-shot}}</b>: use a pretrained model or LLM as-is. No training data needed; great for prototypes.",
        "<b>{{fine-tuning}}</b> / {{transfer learning}}: adapt a pretrained model with hundreds to thousands of your own examples. The usual sweet spot.",
        "<b>Training from scratch</b>: only for large, unusual datasets (e.g. tabular data with gradient-boosted trees, or very specialised domains).",
        "For tabular data, 'from scratch' with LightGBM/XGBoost is cheap and normal; for text, images and audio, fine-tune instead."
      ],
      tip: "If prompting already reaches your target metric, ship it and collect data for later."
    },
    {
      id: "splits",
      title: "Train, validation and test splits",
      simple: "Split your data so you can check the model on examples it has never seen.",
      items: [
        "<b>Train</b> (~70–80%): the model learns from this.",
        "<b>Validation</b> (~10–15%): you use this to compare models and tune settings.",
        "<b>Test</b> (~10–15%): touch it once, at the end, for an honest final score.",
        "If your data has dates, split by time so the test set is 'the future'.",
        "Watch for {{data leakage}}: duplicates or features that secretly contain the answer."
      ],
      tip: "If your test score is suspiciously good, look for leakage before celebrating."
    },
    {
      id: "fit",
      title: "Overfitting and underfitting",
      simple: "Overfitting is memorising the training data; underfitting is not learning enough from it.",
      items: [
        "<b>Overfitting</b>: training score keeps improving while validation score gets worse.",
        "Fixes: more data, {{Data augmentation}}, simpler model, regularisation, early stopping.",
        "<b>Underfitting</b>: both training and validation scores are poor.",
        "Fixes: a more powerful model, better features, train longer.",
        "Plot training vs validation scores per epoch — the gap tells you which problem you have."
      ],
      tip: "Early stopping (stop when validation stops improving) is the easiest overfitting fix."
    },
    {
      id: "hyperparams",
      title: "Hyperparameters that matter most",
      simple: "Hyperparameters are the settings you choose before training. A few matter far more than the rest.",
      items: [
        "<b>Learning rate</b>: how big each update step is. The single most important setting.",
        "<b>Epochs</b>: how many passes over the data. Use early stopping instead of guessing.",
        "<b>Batch size</b>: examples per update. Bigger is faster but needs more GPU memory.",
        "For tree models: number of trees, depth and learning rate.",
        "Tune automatically with Optuna or your cloud's tuning service once a baseline works."
      ],
      tip: "Change one thing at a time and log every run in an experiment tracker."
    },
    {
      id: "compute",
      title: "CPU vs GPU, and keeping costs down",
      simple: "Tabular models train fine on a laptop CPU; images, text, audio and LLMs usually need a GPU.",
      items: [
        "CPU is enough for: tabular data, classical ML, small text models with few examples.",
        "GPU helps for: fine-tuning transformers, vision and speech models, self-hosting LLMs.",
        "Start free: Google Colab and Kaggle notebooks include GPUs.",
        "Rent GPUs by the hour for training, then serve on CPU with a smaller or quantised model where possible.",
        "Use spot/preemptible instances for training jobs — often 60–90% cheaper."
      ],
      tip: "Turn off idle notebooks and endpoints. Forgotten GPUs are the most common surprise bill."
    },
    {
      id: "metrics",
      title: "Picking the right metric",
      simple: "The metric should match what a mistake costs in real life.",
      items: [
        "Classification: {{precision}} when false alarms are costly, {{recall}} when misses are costly, {{F1 score}} for a balance.",
        "Imbalanced classes: avoid plain {{Accuracy}}; use {{ROC-AUC}} or F1.",
        "Numbers: {{MAE}} is easy to explain; {{RMSE}} punishes big misses.",
        "Forecasts: {{MAPE}} or MAE with {{backtesting}}.",
        "Chatbots / RAG: answer correctness and {{groundedness}} on a {{golden set}}."
      ],
      tip: "Always report your metric next to the baseline's, so people can see the improvement."
    },
    {
      id: "mlops",
      title: "Reproducibility and MLOps",
      simple: "Make every result repeatable: same data + same code + same settings = same model.",
      items: [
        "Version your code (Git), your data (dated folders or DVC) and your models (a model registry).",
        "Log every experiment: parameters, metrics, and the data version used (MLflow or your cloud's tracker).",
        "Pin package versions in requirements.txt.",
        "Automate retraining with a pipeline once the model is in production — that's {{MLOps}}."
      ],
      tip: "If you can't reproduce last week's model, you can't safely improve it."
    }
  ];


  // Components shown on the Cloud comparison page, in display order.
  const INFRA_COMPONENTS = [
    ["storage", "Data storage"], ["notebook", "Notebooks"], ["gpuTrain", "GPU training"], ["platform", "ML platform & registry"],
    ["serveServerless", "Serverless serving"], ["serveGPU", "GPU serving"], ["batch", "Batch predictions"],
    ["pipeline", "Pipelines"], ["vectorDb", "Vector database"], ["llm", "LLM access"], ["monitoring", "Monitoring"], ["privacy", "Privacy controls"]
  ];

  // Why each service helps when building or running a model. Keys match INFRA and INFRA_COMPONENTS.
  const INFRA_ADVANTAGES = {
    aws: {
      storage: ["Practically unlimited, highly durable storage for datasets and model files", "SageMaker, Athena and Glue read straight from S3, so you train without copying data", "Versioning keeps old dataset versions; lifecycle rules move cold data to cheaper tiers"],
      notebook: ["Managed JupyterLab with nothing to install", "Switch the instance from CPU to GPU when you need more power", "Built-in access to S3 data, experiments and the model registry"],
      gpuTrain: ["Billed only while the training job runs; machines shut down automatically", "Managed Spot Training can cut training costs dramatically", "Scales from one GPU to distributed multi-GPU training"],
      platform: ["One place for experiments, the model registry, approvals and deployment", "Lineage shows which data and code produced each model", "Access controlled with IAM roles"],
      serveServerless: ["Scales to zero, so you pay nothing when nobody is using the model", "Handles spiky traffic automatically", "No servers to patch or manage"],
      serveGPU: ["Low-latency real-time predictions with autoscaling", "Inferentia2 chips can lower the cost per prediction", "Production variants let you A/B test two models"],
      batch: ["Scores millions of rows without keeping a server running", "Reads input from S3 and writes results back to S3", "You pay only for the job's duration"],
      pipeline: ["Repeatable train → evaluate → register workflows", "Conditional steps, e.g. only deploy if accuracy beats a threshold", "Retraining on a schedule or when new data arrives"],
      vectorDb: ["Managed similarity search for RAG chatbots", "Hybrid keyword + vector search in OpenSearch", "pgvector keeps embeddings next to your relational data"],
      llm: ["Claude and other models through one API, with no GPUs to manage", "Prompts and data stay in your AWS account and region", "Built-in guardrails, knowledge bases and agents"],
      monitoring: ["Alerts on latency, errors and traffic", "Model Monitor detects data drift against a training baseline", "Central logs make debugging predictions easier"],
      privacy: ["VPC endpoints keep traffic off the public internet", "Encrypt data and models with your own KMS keys", "Many HIPAA-eligible services and compliance certifications"]
    },
    gcp: {
      storage: ["One global namespace with strong consistency", "Vertex AI and BigQuery read directly from Cloud Storage", "Autoclass moves rarely used data to cheaper storage automatically"],
      notebook: ["Familiar Colab / Jupyter experience on managed machines", "Query BigQuery with SQL and analyse in Python in one place", "Idle shutdown keeps costs under control"],
      gpuTrain: ["Wide choice of accelerators: L4, A100, H100 GPUs and TPUs", "Spot VMs make long training runs much cheaper", "Billed only while the job runs"],
      platform: ["Datasets, training, registry and endpoints in one product", "Experiments and TensorBoard built in", "AutoML for teams without ML specialists"],
      serveServerless: ["Deploy any container and scale to zero", "A generous free tier for small projects", "Can attach an L4 GPU when you need one"],
      serveGPU: ["Autoscaling endpoints with traffic splitting for safe rollouts", "Cloud Run GPUs scale to zero, so idle GPUs don't cost money", "Use prebuilt containers or your own"],
      batch: ["Predict over files in Cloud Storage or whole BigQuery tables", "No always-on endpoint to pay for", "Results land in BigQuery for analysis and dashboards"],
      pipeline: ["Managed Kubeflow / TFX pipelines", "Tracks the lineage of every dataset, model and metric", "Schedule retraining with Cloud Scheduler"],
      vectorDb: ["Vertex AI Vector Search handles billions of vectors at low latency", "AlloyDB / Cloud SQL with pgvector keeps vectors beside app data", "Managed backups and high availability"],
      llm: ["Claude, Gemini and open models in one catalogue", "Enterprise data governance: your prompts aren't used to train the models", "Tuning and evaluation tools built in"],
      monitoring: ["Model Monitoring alerts on feature skew and drift", "Dashboards for latency and errors in Cloud Monitoring", "Export logs to BigQuery to analyse predictions"],
      privacy: ["VPC Service Controls build a perimeter against data leaks", "Customer-managed encryption keys (CMEK)", "Choose the region where data is stored"]
    },
    azure: {
      storage: ["Data Lake Gen2 adds folders and fast analytics on big datasets", "Connects to Azure ML datastores, Synapse and Databricks", "Hot, cool and archive tiers to balance speed and cost"],
      notebook: ["Managed notebooks that also open in VS Code", "Attach datastores and compute in a few clicks", "Auto-shutdown schedules stop forgotten machines"],
      gpuTrain: ["NC / ND GPUs from T4 up to A100 and H100", "Low-priority VMs reduce training costs", "Compute clusters scale to zero when idle"],
      platform: ["MLflow-native tracking and registry, portable to other platforms", "Responsible AI dashboard for fairness and explanations", "Designer and AutoML for low-code model building"],
      serveServerless: ["Container Apps scale to zero between requests", "Pay per request or per second of use", "Trigger predictions from queues or new files with Functions"],
      serveGPU: ["Managed online endpoints with blue/green deployments", "Autoscaling and built-in monitoring", "Secure with keys or Microsoft Entra ID"],
      batch: ["Process large datasets in parallel on a cluster", "Clusters shut down when the job finishes", "Results written to Blob Storage"],
      pipeline: ["Reusable components shared across projects", "Schedules and triggers for automatic retraining", "Lineage between data, runs and registered models"],
      vectorDb: ["Azure AI Search combines keyword, vector and semantic ranking", "Plugs straight into Azure AI Foundry for RAG", "PostgreSQL + pgvector for relational and vector data together"],
      llm: ["Claude, OpenAI and open models under Azure governance", "Content safety filters built in", "Private networking and regional deployments"],
      monitoring: ["Application Insights traces each request end to end", "Azure ML watches for data drift and prediction quality", "Alerts can go to email or Teams"],
      privacy: ["Private endpoints keep traffic on Microsoft's network", "Customer-managed encryption keys", "Fine-grained access with Microsoft Entra ID"]
    },
    self: {
      storage: ["No cloud bill, and data never leaves your hardware", "MinIO speaks the S3 API, so code moves to the cloud unchanged later", "PostgreSQL is a solid home for structured data"],
      notebook: ["Free, and runs on any laptop or server", "Full control over packages and extensions", "Works offline"],
      gpuTrain: ["An owned GPU has no hourly cost after purchase", "GPU rental marketplaces are often cheaper than the big clouds", "Choose the exact GPU model you need"],
      platform: ["Open-source, vendor-neutral experiment tracking and registry", "The same MLflow API works locally and on Databricks or Azure ML", "Easy to self-host with Docker"],
      serveServerless: ["Simple and cheap for low or steady traffic", "A container runs the same anywhere", "Predictable flat monthly price"],
      serveGPU: ["Request batching squeezes the most throughput out of a GPU", "vLLM is a leading engine for serving LLMs fast", "No per-request fees"],
      batch: ["Just a scheduled Python script, easy to understand", "No vendor lock-in", "Runs on servers you already have"],
      pipeline: ["Open source with large communities", "Workflows are plain Python", "Run locally or move to any cloud later"],
      vectorDb: ["Free and open source", "Chroma is great for prototypes; Qdrant scales to production", "pgvector reuses an existing PostgreSQL database"],
      llm: ["Prompts and documents never leave your network", "No per-token charges, only hardware costs", "Pick, and even fine-tune, any open-weights model"],
      monitoring: ["Industry-standard open-source monitoring", "Evidently produces ready-made drift and quality reports", "Build a dashboard for any metric"],
      privacy: ["Full control over where data lives", "Works in air-gapped environments", "You set the encryption and access rules (and own the security work)"]
    }
  };

  const KB = { USE_CASES, QUESTIONS, INFRA, INFRA_COMPONENTS, INFRA_ADVANTAGES, EDGE_FORMATS, GLOSSARY, TRAINING_TOPICS };
  if (typeof module !== "undefined" && module.exports) module.exports = KB;
  else root.HM_KB = KB;
})(typeof window !== "undefined" ? window : globalThis);
