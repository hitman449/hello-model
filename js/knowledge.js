/*
 * Knowledge base for Hello Model.
 * Use cases, follow-up questions, infrastructure catalog and glossary.
 * Text may contain {{term}} markers which the UI turns into glossary tooltips.
 */
(function (root) {
  const USE_CASES = {
    "tabular-classification": {
      name: "Tabular classification",
      icon: "table", // see js/icons.js
      tagline: "Predict a category (yes/no, A/B/C) from rows of a spreadsheet or database.",
      examples: ["Predict which customers will churn", "Flag fraudulent transactions", "Approve or reject loan applications"],
      keywords: {
        "churn": 4, "attrition": 4, "will leave": 3, "cancel": 3, "cancellation": 3, "unsubscribe": 3, "stop buying": 3, "stop using": 3, "quit": 3, "retention": 2, "at risk": 2, "fraud": 3, "fraudulent": 3, "default": 3, "credit risk": 4, "credit score": 3, "loan": 2, "approve": 2, "approval": 2, "reject": 2, "decline": 2, "yes or no": 3, "whether": 1, "likely to": 2, "which customers": 3, "which users": 3, "which employees": 3, "which patients": 3, "which visitors": 2, "customers": 1, "subscribers": 2, "applicant": 2, "application": 1, "readmitted": 3, "readmission": 3, "lead scoring": 4, "score leads": 4, "leads": 2, "convert": 2, "conversion": 2, "will buy": 3, "manual review": 2, "insurance claim": 2, "records": 1, "tabular": 3, "spreadsheet": 3, "csv": 3, "excel": 3, "database": 1, "crm": 2, "hr data": 2, "customer data": 2, "classify": 1, "category": 1, "fake": 3, "scam": 3, "no show": 4, "turn up": 3, "show up": 3, "competitor": 2
      },
      question: "Sort each record (customer, transaction, application) into a category, like yes/no or high/low risk",
      needsGPU: false,
      metric: "{{F1 score}} and {{ROC-AUC}} (use {{precision}}/{{recall}} if one kind of mistake is costlier)",
      dataTips: [
        "Export one row per entity (customer, transaction) with the outcome you want to predict as a column.",
        "Make sure every feature is something you would actually know at prediction time — otherwise you get {{data leakage}}.",
        "Aim for at least a few hundred examples of the rarest class."
      ],
      labeling: "Labels usually already exist in your systems (for example, a “canceled subscription” flag). Join them from your CRM / billing database.",
      prep: ["Handle missing values (impute median / “unknown” category)", "Encode categories (one-hot or target encoding)", "Split by time if the data has dates, to mimic the future", "Check {{class imbalance}} and consider class weights"],
      baseline: "Predict the majority class, then try a {{logistic regression}}. Any real model must beat both.",
      models: {
        starter: { name: "AutoML (e.g. AutoGluon / Vertex AutoML / SageMaker Autopilot)", why: "Tries dozens of models for you. A good choice when you’re new or need a strong result quickly.", libs: ["AutoGluon", "pandas"] },
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
      pitfalls: ["{{Data leakage}} — a feature that secretly contains the answer", "Optimizing accuracy on imbalanced data (99% accuracy can mean useless)"]
    },

    "regression": {
      name: "Number prediction (regression)",
      icon: "trend", // see js/icons.js
      tagline: "Estimate a numeric value such as a price, a duration or a score.",
      examples: ["Estimate house prices from features", "Predict delivery time for an order", "Estimate insurance claim cost"],
      keywords: {
        "price": 3, "pricing": 2, "how much": 3, "how long": 3, "how many minutes": 3, "estimate": 2, "market value": 4, "value": 1, "valuation": 4, "worth": 3, "cost": 2, "salary": 4, "wage": 3, "rent": 3, "lifetime value": 4, "spend": 2, "revenue": 1, "amount": 1, "duration": 3, "delivery time": 4, "time to": 2, "resolution time": 3, "calories": 3, "consumption": 2, "score": 1, "predict the": 1, "number": 1, "yield": 2, "house prices": 4, "apartment": 2, "property": 2, "second hand": 2, "used car": 3, "how many days": 3, "how many hours": 3, "how long it will take": 3
      },
      question: "Predict a single number for each item, like a price, a cost or a duration",
      needsGPU: false,
      metric: "{{MAE}} (easy to explain: “off by $X on average”) and {{RMSE}} (punishes big misses)",
      dataTips: ["Collect one row per item with the true value you want to predict.", "Look for outliers in the target — a few extreme values can dominate training.", "A few thousand rows is usually enough for a solid start."],
      labeling: "The target is usually a historical number (sold price, actual delivery minutes). Pull it from your transactional database.",
      prep: ["Log-transform skewed targets like prices", "Impute missing values", "Encode categories", "Remove impossible values (negative prices, etc.)"],
      baseline: "Predict the mean or median of the target. Then try {{linear regression}}.",
      models: {
        starter: { name: "AutoML regression (AutoGluon / Vertex AutoML)", why: "Lets you get a robust model without tuning anything by hand.", libs: ["AutoGluon", "pandas"] },
        standard: { name: "Gradient-boosted trees (LightGBM / XGBoost)", why: "Handles non-linear relationships and mixed feature types out of the box.", libs: ["LightGBM", "scikit-learn", "pandas"] },
        advanced: { name: "LightGBM with quantile objectives for prediction intervals", why: "Gives a range (“$310k–$345k”), which is often more useful than one number.", libs: ["LightGBM", "Optuna", "MLflow"] }
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
      pitfalls: ["Extrapolation — models can’t predict well outside the range they saw", "Using features only known after the fact"]
    },

    "forecasting": {
      name: "Time-series forecasting",
      icon: "forecast", // see js/icons.js
      tagline: "Predict future values from history: demand, traffic, sales, load.",
      examples: ["Forecast weekly sales per store", "Predict website traffic next month", "Forecast energy demand per hour"],
      keywords: {
        "forecast": 5, "time series": 5, "timeseries": 5, "seasonal": 3, "seasonality": 3, "demand": 3, "next month": 3, "next week": 3, "next year": 2, "next quarter": 2, "coming weeks": 3, "coming months": 3, "next few weeks": 3, "next few months": 3, "next weekend": 3, "tomorrow": 3, "each day": 2, "daily": 2, "weekly": 2, "monthly": 2, "hourly": 2, "per day": 2, "each week": 2, "project": 1, "future": 2, "upcoming": 2, "holiday season": 2, "over time": 2, "trend": 2, "inventory": 2, "stock": 1, "stock price": 2, "sales": 1, "traffic": 1, "footfall": 3, "visitors": 1, "volume": 2, "staffing": 3, "capacity planning": 3, "capacity": 1, "usage": 1, "electricity demand": 3, "how many units": 2, "will sell": 3, "plan": 1, "how many": 1, "every day": 2, "each morning": 2, "every morning": 2, "each evening": 2, "every evening": 2, "every week": 2, "run out": 3, "waste": 2, "bake": 2, "order each": 2, "booked": 2, "bookings": 2, "busy": 2, "shift": 2, "next season": 3, "summer": 1, "winter": 1, "christmas": 2
      },
      question: "Predict how a number will change over time, like sales next month or demand per day",
      needsGPU: false,
      metric: "{{MAPE}} or {{MAE}} measured with {{backtesting}} over several past periods",
      dataTips: ["You need a timestamp column and the value, ideally 2+ full seasonal cycles (e.g. 2 years for yearly patterns).", "Include known future events: holidays, promotions, price changes.", "Keep the timestamps regular (fill gaps explicitly)."],
      labeling: "No manual labeling needed — the future values in your history are the labels.",
      prep: ["Resample to a regular frequency", "Fill or flag missing periods", "Add calendar features (day of week, holiday)", "Never shuffle — always split by time"],
      baseline: "A {{seasonal naive}} forecast: “same as the same day last week”. It is often hard to beat.",
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
      name: "Text classification",
      icon: "tag", // see js/icons.js
      tagline: "Sort text into categories: sentiment, topic, intent, spam, priority.",
      examples: ["Detect sentiment of product reviews", "Route support tickets to the right team", "Filter spam emails"],
      keywords: {
        "sentiment": 5, "positive or negative": 4, "review": 2, "ticket": 3, "email": 2, "e mail": 2, "message": 2, "sms": 2, "spam": 4, "phishing": 4, "tweet": 3, "post": 1, "forum": 2, "comment": 2, "free text": 3, "survey": 2, "feedback": 2, "text": 2, "intent": 3, "topic": 3, "theme": 2, "toxic": 3, "toxicity": 3, "hate speech": 6, "abuse": 2, "offensive": 3, "moderation": 3, "moderate": 2, "categorise": 3, "categorize": 3, "tag": 2, "route": 2, "label": 1, "article": 2, "news": 1, "document": 1, "what language": 3, "nlp": 3, "sarcasm": 3, "emotion": 3, "classify text": 4, "into categories": 3, "abusive": 3, "rude": 3, "bullying": 3, "harassment": 3, "complaint": 2
      },
      question: "Sort pieces of text (emails, reviews, tickets, posts) into categories",
      needsGPU: true,
      metric: "{{F1 score}} per class (macro-F1 when classes are imbalanced)",
      dataTips: ["Collect real text examples from the place the model will run (tickets, reviews).", "200–500 labeled examples per class is enough for fine-tuning a small transformer.", "Write a one-page labeling guide so everyone labels the same way."],
      labeling: "Use Label Studio or Argilla. Or bootstrap: let an LLM pre-label and have humans correct it.",
      prep: ["Remove duplicates and boilerplate (signatures, quoted replies)", "Keep raw text — modern models don’t need stemming/stop-word removal", "Stratified train/validation/test split"],
      baseline: "{{TF-IDF}} + logistic regression. Trains in seconds and is often 80–90% as good.",
      models: {
        starter: { name: "LLM zero-shot / few-shot classification via API", why: "No training needed — describe the categories in a prompt. Good for prototypes or fewer than 100 examples.", libs: ["Anthropic / OpenAI SDK", "pydantic"] },
        standard: { name: "Fine-tuned small transformer (DistilBERT / ModernBERT) or SetFit", why: "Cheap to run, fast, and accurate once you have a few hundred labels.", libs: ["Hugging Face Transformers", "SetFit", "datasets"] },
        advanced: { name: "Fine-tuned larger encoder + active learning loop", why: "Maximizes accuracy on large, evolving datasets while keeping labeling cost low.", libs: ["Transformers", "Argilla", "MLflow", "ONNX Runtime"] }
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
      name: "Image classification",
      icon: "image", // see js/icons.js
      tagline: "Assign a label to a whole image: defect/ok, species, product type, diagnosis.",
      examples: ["Detect defective products on a production line", "Identify plant diseases from leaf photos", "Classify X-ray images"],
      keywords: {
        "image": 3, "photo": 3, "picture": 3, "photograph": 3, "x ray": 4, "xray": 4, "scan": 2, "mri": 4, "ct scan": 4, "radiology": 3, "diagnose": 2, "defect": 2, "defective": 2, "visual inspection": 3, "inspection": 1, "pass or fail": 2, "leaf": 2, "plant": 1, "species": 3, "bird": 2, "skin": 2, "food": 1, "dish": 1, "satellite": 3, "selfie": 2, "screenshot": 2, "classify images": 5, "recognise": 2, "recognize": 2, "identify": 1, "blurry": 2, "visual": 2
      },
      question: "Give each whole image one label, like defect/OK, a species or a diagnosis",
      needsGPU: true,
      metric: "{{Accuracy}} and per-class {{recall}} (for defect detection, missed defects matter most)",
      dataTips: ["Collect images in the same conditions as production (lighting, angle, camera).", "Start with 100–300 images per class for {{transfer learning}}.", "Organize as one folder per class, e.g. data/train/cat/*.jpg and data/train/dog/*.jpg"],
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
      name: "Object detection",
      icon: "scan", // see js/icons.js
      tagline: "Find and locate objects in images or video with bounding boxes; count and track them.",
      examples: ["Count people entering a store from CCTV", "Detect helmets on construction workers", "Find damaged areas on cars"],
      keywords: {
        "detect": 2, "detection": 2, "locate": 3, "bounding box": 5, "boxes": 3, "count": 2, "how many people": 3, "video": 3, "footage": 3, "cctv": 4, "camera": 2, "webcam": 3, "camera feed": 3, "track": 2, "tracking": 3, "drone": 2, "segmentation": 3, "license plate": 4, "number plate": 4, "plate": 2, "helmet": 2, "hard hat": 3, "ppe": 3, "people": 1, "vehicle": 2, "car": 1, "pallet": 2, "player": 2, "where in": 3, "yolo": 5, "real time": 1, "objects": 2, "find where": 4, "where exactly": 4, "how many cars": 3
      },
      question: "Find where things are in images or video, and count or track them",
      needsGPU: true,
      metric: "{{mAP}} (mean Average Precision) at IoU 0.5, plus FPS for video",
      dataTips: ["Collect frames covering different lighting, distances and occlusions.", "Start with ~200–500 annotated images; more for small or rare objects.", "Sample video frames sparsely so the dataset isn’t full of near-duplicates."],
      labeling: "Draw boxes in CVAT, Label Studio or Roboflow. Use a pretrained model to pre-annotate, then correct its labels.",
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
      evaluation: ["mAP per class", "Visualize predictions on held-out video", "Measure FPS on the real target hardware"],
      monitoring: ["Detections per frame over time", "Camera health (blank/blurred frames)", "Periodic human review of sampled frames"],
      pitfalls: ["Tiny objects need higher input resolution", "Testing on frames from the same video clip as training"]
    },

    "llm-rag": {
      name: "LLM assistant (RAG chatbot)",
      icon: "chat", // see js/icons.js
      tagline: "A chatbot or assistant that answers questions using your own documents and data.",
      examples: ["Chatbot that answers questions from our PDF manuals", "Internal assistant over company wiki", "Customer support bot using our FAQ"],
      keywords: {
        "chatbot": 5, "chat": 3, "bot": 3, "assistant": 4, "helper": 3, "copilot": 4, "ask questions": 5, "answer": 2, "question": 2, "q&a": 4, "documents": 3, "pdf": 3, "manual": 2, "handbook": 3, "wiki": 3, "confluence": 4, "notion": 3, "sharepoint": 4, "knowledge base": 5, "docs": 2, "policies": 2, "faq": 4, "llm": 5, "gpt": 3, "rag": 6, "language model": 4, "generative": 3, "generate": 2, "draft": 3, "write": 2, "summarise": 4, "summarize": 4, "summary": 3, "citation": 2, "virtual assistant": 5, "agent": 2, "search across": 3
      },
      question: "Answer questions or write text using your own documents, like a chatbot over your manuals",
      needsGPU: false,
      metric: "Answer correctness and {{groundedness}} on a golden Q&A set; latency and cost per answer",
      dataTips: ["Gather the documents the bot should know (PDF, HTML, Notion, Confluence…).", "Write 30–100 real questions with ideal answers — your {{golden set}}.", "Note which sources are authoritative and which are outdated."],
      labeling: "No training labels needed. Your golden Q&A set is the evaluation “label”.",
      prep: ["Extract text from documents (keep headings and page numbers)", "Split into {{chunks}} of ~300–800 tokens with overlap", "Create {{embeddings}} and store them in a {{vector database}}", "Attach metadata (source, date, permissions) to each chunk"],
      baseline: "Put a few documents in the prompt of a hosted LLM and see how well it answers the golden set.",
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
      pitfalls: ["{{Hallucination}} when retrieval misses — instruct the model to say “I don’t know”", "Leaking documents users shouldn’t see — filter by permissions at retrieval time"]
    },

    "recommendation": {
      name: "Recommendation system",
      icon: "star", // see js/icons.js
      tagline: "Suggest relevant products, content or people to each user.",
      examples: ["Recommend products based on purchase history", "“You might also like” for articles", "Suggest courses to learners"],
      keywords: {
        "recommend": 5, "recommendation": 5, "suggest": 3, "suggestion": 3, "similar items": 4, "similar": 3, "also bought": 5, "also like": 4, "might like": 4, "personalise": 4, "personalize": 4, "for each user": 3, "for each shopper": 3, "match": 2, "matching": 2, "next song": 4, "playlist": 3, "feed": 2, "purchase history": 4, "watch history": 4, "browsing history": 4, "history": 1, "catalog": 2, "catalogue": 2, "rank": 2, "ranking": 3, "cross sell": 4, "upsell": 3, "users who": 3, "enjoy": 2, "what they watched": 3, "go well with": 4, "goes well with": 4, "goes with": 3, "basket": 2, "what they bought": 3
      },
      question: "Suggest the right items (products, content, jobs) to each person",
      needsGPU: false,
      metric: "{{Recall@K}} / {{NDCG}} offline; click-through and conversion in an {{A/B test}} online",
      dataTips: ["Interaction logs are the key: user_id, item_id, timestamp, event (view/click/buy).", "Item metadata (title, category, description) helps with new items ({{cold start}}).", "Thousands of users with several interactions each is a good start."],
      labeling: "Implicit feedback (clicks, purchases) acts as labels — no manual labeling.",
      prep: ["Deduplicate events, remove bots", "Split by time: train on the past, test on the next period", "Build item text/feature representations for cold start"],
      baseline: "Recommend the most popular items (overall or per category). Many systems barely beat this, so measure it.",
      models: {
        starter: { name: "Popularity + content-based similarity (embeddings of item descriptions)", why: "Works with little interaction data and handles new items.", libs: ["sentence-transformers", "pandas", "scikit-learn"] },
        standard: { name: "Collaborative filtering (implicit ALS / LightFM) + content features", why: "Learns taste from behavior; proven and cheap to run.", libs: ["implicit", "LightFM", "pandas"] },
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
      evaluation: ["Recall@10 on a time-based holdout", "Coverage and diversity (are you only showing best-sellers?)", "Online A/B test vs popularity baseline"],
      monitoring: ["CTR and conversion", "Catalog coverage", "Feedback loops (popular gets more popular)"],
      pitfalls: ["Random splits leak future behavior", "Ignoring the cold-start problem for new users/items"]
    },

    "anomaly-detection": {
      name: "Anomaly detection",
      icon: "pulse", // see js/icons.js
      tagline: "Spot unusual events: failing machines, suspicious logins, odd transactions.",
      examples: ["Detect machine failures from sensor data", "Find unusual login activity", "Spot abnormal spikes in server metrics"],
      keywords: {
        "anomaly": 5, "outlier": 5, "unusual": 4, "abnormal": 4, "odd": 3, "strange": 3, "weird": 3, "suspicious": 3, "from normal": 3, "normal": 1, "breaks down": 4, "breakdown": 4, "failure": 3, "predictive maintenance": 6, "maintenance": 2, "vibration": 3, "sensor": 3, "temperature": 2, "readings": 3, "iot": 3, "telemetry": 3, "logs": 2, "intrusion": 5, "attack": 3, "network traffic": 4, "cpu": 3, "spike": 3, "drift": 2, "unlabelled": 3, "unlabeled": 3, "without labels": 3, "without labelled": 3, "no labels": 3, "alert": 2, "warn": 2, "monitor": 1, "leak": 2, "isn't normal": 4, "not normal": 4, "than normal": 3, "out of the ordinary": 4, "unexpected": 2
      },
      question: "Spot rare events that look different from normal, like failing machines or suspicious activity",
      needsGPU: false,
      metric: "{{Precision}} at a fixed alert budget (e.g. top 50 alerts/day) and recall on known incidents",
      dataTips: ["Collect mostly “normal” history — anomalies are rare by definition.", "Keep a list of known past incidents with timestamps; they become your test set.", "For sensors, keep raw high-frequency data plus aggregates."],
      labeling: "Usually unlabeled. Label a small set of confirmed incidents for evaluation; domain experts review alerts.",
      prep: ["Normalize each signal", "Create rolling-window features (mean, std, rate of change)", "Separate by entity (per machine/user) since “normal” differs"],
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
      name: "Speech and audio",
      icon: "mic", // see js/icons.js
      tagline: "Transcribe speech, classify sounds or build voice interfaces.",
      examples: ["Transcribe customer calls and summarize them", "Voice commands for a mobile app", "Detect machine sounds that indicate faults"],
      keywords: {
        "speech": 5, "audio": 4, "voice": 4, "voice command": 5, "talk": 3, "speak": 3, "spoken": 3, "dictate": 4, "dictation": 4, "transcribe": 5, "transcription": 5, "transcript": 5, "speech to text": 6, "subtitle": 4, "caption": 3, "podcast": 4, "recording": 3, "recorded": 2, "lecture": 2, "call": 1, "phone": 2, "meeting": 2, "zoom": 2, "microphone": 3, "sound": 3, "noise": 2, "listen": 2, "recordings of": 2, "song": 2, "birdsong": 4, "talking": 3, "by voice": 4
      },
      question: "Work with spoken audio or sounds: transcribe, caption or recognize them",
      negative: {
        "hate speech": 5, "free speech": 5
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
        f"Summarize this support call in 3 bullets and list action items:\\n{transcript}"}])
print(summary.content[0].text)`,
      evaluation: ["WER on a held-out set of real recordings", "Check names/numbers specifically", "Evaluate per accent / noise level"],
      monitoring: ["Average confidence per recording", "Audio quality (clipping, silence)", "Processing time vs audio length"],
      pitfalls: ["Testing on clean audio but deploying in noisy environments", "Storing voice data without consent"]
    }
  };

  const QUESTIONS = [
    {
      id: "data", terms: ["pretrained model", "transfer learning", "few-shot", "fine-tuning"],
      assume: "small", // used when the answer is "Not sure"
      title: "How much example data do you have?",
      help: "Examples are the rows, documents, images or recordings the model will learn from, like the ones it will see later.",
      options: [
        { value: "none", label: "None yet", hint: "We’ll start with pretrained models that need no training." },
        { value: "small", label: "A little (under 1,000)", hint: "Enough for transfer learning or few-shot prompting." },
        { value: "medium", label: "A moderate amount (1,000–100,000)", hint: "Enough to train or fine-tune a solid model." },
        { value: "large", label: "A lot (over 100,000)", hint: "Training your own model, including larger ones, becomes worthwhile." },
        { value: "unsure", label: "Not sure", hint: "We’ll assume a small amount and start simple." }
      ]
    },
    {
      id: "labels", terms: ["supervised learning", "unsupervised learning", "zero-shot"],
      assume: "partial", // used when the answer is "Not sure"
      title: "Is your data labeled with the right answers?",
      help: "A label is the correct answer for each example, such as “spam” or “not spam”, or the actual sale price.",
      options: [
        { value: "yes", label: "Yes, mostly labeled", hint: "We can train supervised models right away." },
        { value: "partial", label: "Partly, or messy", hint: "We’ll add a step to label and clean the data." },
        { value: "no", label: "No labels", hint: "We’ll use pretrained, zero-shot or unsupervised methods first." },
        { value: "unsure", label: "Not sure", hint: "We’ll assume partly labeled and add a labeling step." }
      ]
    },
    {
      id: "skill", terms: ["AutoML", "managed service", "notebook"],
      title: "How much machine learning experience does your team have?",
      help: "This decides how much of the setup the plan hands to managed tools.",
      options: [
        { value: "beginner", label: "Beginner", hint: "New to machine learning. The plan leans on managed services and AutoML." },
        { value: "intermediate", label: "Some experience", hint: "Comfortable with Python and notebooks." },
        { value: "expert", label: "Experienced", hint: "Has trained and deployed models before." }
      ]
    },
    {
      id: "deploy", terms: ["API", "batch", "edge"],
      assume: "api", // used when the answer is "Not sure"
      title: "Where will the model run?",
      help: "This shapes how the model is served.",
      options: [
        { value: "api", label: "Online, behind an API or web app", hint: "Answers each request in real time." },
        { value: "batch", label: "On a schedule (batch)", hint: "Processes a whole dataset nightly or weekly." },
        { value: "edge", label: "On a device (edge)", hint: "Phone, browser, camera or factory hardware." },
        { value: "unsure", label: "Not sure", hint: "We’ll assume an online API, the most common setup." }
      ]
    },
    {
      id: "latency", terms: ["latency"],
      assume: "interactive", // used when the answer is "Not sure"
      title: "How fast does each prediction need to be?",
      help: "Latency is the time between asking for a prediction and getting it.",
      options: [
        { value: "realtime", label: "Instant (under 100 ms)", hint: "Fraud checks, video frames, autocomplete." },
        { value: "interactive", label: "Interactive (under 3 seconds)", hint: "Chatbots, user-facing features." },
        { value: "relaxed", label: "Not critical", hint: "Minutes or hours are fine." },
        { value: "unsure", label: "Not sure", hint: "We’ll assume a few seconds is fine." }
      ]
    },
    {
      id: "cloud", terms: ["Docker", "Kubernetes"],
      assume: "self", // used when the answer is "Not sure"
      title: "Which cloud or infrastructure do you prefer?",
      help: "Choose what your company already uses. It’s usually the easiest path.",
      options: [
        { value: "aws", label: "AWS", hint: "Amazon Web Services" },
        { value: "gcp", label: "Google Cloud", hint: "GCP / Vertex AI" },
        { value: "azure", label: "Microsoft Azure", hint: "Azure ML / AI Foundry" },
        { value: "self", label: "Open-source / self-hosted", hint: "Docker, Kubernetes or your own servers" },
        { value: "unsure", label: "Not sure", hint: "We’ll use open-source tools that run anywhere, including your laptop." }
      ]
    },
    {
      id: "budget", terms: ["serverless", "CPU", "GPU", "managed service", "high availability", "MLOps"],
      assume: "low", // used when the answer is "Not sure"
      title: "What’s your monthly budget for infrastructure?",
      help: "A rough figure is fine. The plan sizes computing power to match.",
      options: [
        { value: "low", label: "Minimal (under $100)", hint: "Free tiers, serverless, CPU." },
        { value: "medium", label: "Moderate ($100–$2,000)", hint: "Some GPU time, managed services." },
        { value: "high", label: "Enterprise (over $2,000)", hint: "Dedicated GPUs, high availability, full MLOps." },
        { value: "unsure", label: "Not sure", hint: "We’ll keep costs minimal. You can scale up later." }
      ]
    },
    {
      id: "privacy",
      assume: "yes", // used when the answer is "Not sure"
      title: "Is the data sensitive (personal, medical, financial)?",
      help: "Sensitive data affects which APIs you can use and where data may live.",
      options: [
        { value: "no", label: "Not really", hint: "Public or low-risk data." },
        { value: "yes", label: "Yes, sensitive", hint: "We’ll add privacy and compliance steps." },
        { value: "unsure", label: "Not sure", hint: "We’ll include privacy steps to be safe." }
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
    "data leakage": "When training data contains information that won’t exist at prediction time — results look strong in testing and then fail in production.",
    "Data leakage": "When training data contains information that won’t exist at prediction time — results look strong in testing and then fail in production.",
    "class imbalance": "When one category is much rarer than others (e.g. 1% fraud).",
    "logistic regression": "A simple, fast model that draws a straight boundary between classes. A strong baseline.",
    "linear regression": "Fits a straight line (or plane) through the data. The simplest baseline for predicting numbers.",
    "MAE": "Mean Absolute Error — on average, how far off predictions are, in real units.",
    "RMSE": "Root Mean Squared Error — like MAE but punishes large errors more.",
    "MAPE": "Mean Absolute Percentage Error — average error as a percentage of the true value.",
    "backtesting": "Testing a forecast by pretending to be at several past dates and comparing predictions to what actually happened.",
    "seasonal naive": "A forecast that repeats the value from the same point in the previous season (e.g. last week).",
    "WAPE": "Weighted Absolute Percentage Error: the total forecast error as a share of total actual sales. Unlike MAPE, it still works when some days sell nothing.",
    "lag feature": "A feature built from an earlier value of what you’re forecasting, such as sales on the same day two weeks ago.",
    "TF-IDF": "Turns text into numbers by counting words, down-weighting very common ones.",
    "transfer learning": "Starting from a model already trained on a very large dataset and adapting it to your task with far less data.",
    "Transfer learning": "Starting from a model already trained on a very large dataset and adapting it to your task with far less data.",
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
    "fine-tuning": "Continuing to train a pretrained model on your own data so it specializes.",
    "zero-shot": "Using a model on a task without giving it any training examples for that task.",
    "MLOps": "Practices and tools for reliably deploying, monitoring and updating ML models.",
    // Words used in the questions (shown under "What do these words mean?")
    "few-shot": "Showing a model a handful of worked examples in the prompt, instead of training it, so it follows the pattern.",
    "pretrained model": "A model someone else already trained on lots of data. You can use it as it is, or adapt it to your task with far less data.",
    "supervised learning": "Training a model on examples that come with the right answer (a label), so it learns to predict that answer for new examples.",
    "unsupervised learning": "Finding patterns in data that has no right answers attached, like grouping similar customers or spotting unusual events.",
    "AutoML": "Tools that try many models and settings for you and pick the best one. A good way to get a strong result without ML expertise.",
    "notebook": "An interactive document, such as Jupyter, where you run code in small pieces and see the results and charts right under each piece.",
    "managed service": "A cloud product where the provider runs the servers for you, such as SageMaker or Vertex AI. It costs more, but there’s much less to set up and look after.",
    "API": "A web address your app sends a request to and gets an answer back from. For example, send an email’s text and get back “spam” or “not spam”.",
    "batch": "Scoring a whole dataset at once on a schedule, say every night, instead of answering requests one at a time.",
    "edge": "Running the model on the device itself (a phone, browser, camera or machine) instead of in the cloud. Fast and private, but the model must be small.",
    "latency": "How long you wait for an answer after asking. Measured in milliseconds (ms): 1,000 ms is one second.",
    "Docker": "A way to package your code with everything it needs, so it runs the same on your laptop and on a server.",
    "Kubernetes": "A system that runs many Docker containers across several servers and keeps them up. Powerful, but only worth it at real scale.",
    "serverless": "Running code without looking after a server: the cloud starts it when needed and you pay only while it runs. Cheap for occasional jobs.",
    "CPU": "A computer’s ordinary processor. Fine for spreadsheet-style models and small jobs, and much cheaper than a GPU.",
    "GPU": "A graphics chip that does many calculations at once. It makes training and running big models (images, text, speech) much faster, but costs more than a CPU.",
    "high availability": "Set up so the service keeps running even if a server fails, usually by running copies in more than one place."
  };


  // Short lessons for the "Training basics" page. Items may use {{term}} glossary markers.
  const TRAINING_TOPICS = [
    {
      id: "workflow",
      title: "The ML workflow at a glance",
      simple: "Every model project follows the same loop: define, collect, prepare, train, evaluate, deploy, monitor.",
      items: [
        "<b>Define</b> the problem and pick one success metric before touching data.",
        "<b>Collect and label</b> real examples that look like what the model will see in production.",
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
        "<b>Prompting / {{zero-shot}}</b>: use a pretrained model or LLM as-is. No training data needed, and good for prototypes.",
        "<b>{{fine-tuning}}</b> / {{transfer learning}}: adapt a pretrained model with hundreds to thousands of your own examples. The usual sweet spot.",
        "<b>Training from scratch</b>: only for large, unusual datasets (e.g. tabular data with gradient-boosted trees, or very specialized domains).",
        "For tabular data, “from scratch” with LightGBM/XGBoost is cheap and normal; for text, images and audio, fine-tune instead."
      ],
      tip: "If prompting already reaches your target metric, use it, and collect data for later improvements."
    },
    {
      id: "splits",
      title: "Train, validation and test splits",
      simple: "Split your data so you can check the model on examples it has never seen.",
      items: [
        "<b>Train</b> (~70–80%): the model learns from this.",
        "<b>Validation</b> (~10–15%): you use this to compare models and tune settings.",
        "<b>Test</b> (~10–15%): touch it once, at the end, for an honest final score.",
        "If your data has dates, split by time so the test set is “the future”.",
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
        "Tune automatically with Optuna or your cloud’s tuning service once a baseline works."
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
      tip: "Always report your metric next to the baseline’s, so people can see the improvement."
    },
    {
      id: "mlops",
      title: "Reproducibility and MLOps",
      simple: "Make every result repeatable: same data + same code + same settings = same model.",
      items: [
        "Version your code (Git), your data (dated folders or DVC) and your models (a model registry).",
        "Log every experiment: parameters, metrics, and the data version used (MLflow or your cloud’s tracker).",
        "Pin package versions in requirements.txt.",
        "Automate retraining with a pipeline once the model is in production — that’s {{MLOps}}."
      ],
      tip: "If you can’t reproduce last week’s model, you can’t safely improve it."
    }
  ];


  // Components shown on the Cloud comparison page, in display order.
  const INFRA_COMPONENTS = [
    ["storage", "Data storage"], ["notebook", "Notebooks"], ["gpuTrain", "GPU training"], ["platform", "ML platform and registry"],
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
      batch: ["Scores millions of rows without keeping a server running", "Reads input from S3 and writes results back to S3", "You pay only for the job’s duration"],
      pipeline: ["Repeatable train → evaluate → register workflows", "Conditional steps, e.g. only deploy if accuracy beats a threshold", "Retraining on a schedule or when new data arrives"],
      vectorDb: ["Managed similarity search for RAG chatbots", "Hybrid keyword + vector search in OpenSearch", "pgvector keeps embeddings next to your relational data"],
      llm: ["Claude and other models through one API, with no GPUs to manage", "Prompts and data stay in your AWS account and region", "Built-in guardrails, knowledge bases and agents"],
      monitoring: ["Alerts on latency, errors and traffic", "Model Monitor detects data drift against a training baseline", "Central logs make debugging predictions easier"],
      privacy: ["VPC endpoints keep traffic off the public internet", "Encrypt data and models with your own KMS keys", "Many HIPAA-eligible services and compliance certifications"]
    },
    gcp: {
      storage: ["One global namespace with strong consistency", "Vertex AI and BigQuery read directly from Cloud Storage", "Autoclass moves rarely used data to cheaper storage automatically"],
      notebook: ["Familiar Colab / Jupyter experience on managed machines", "Query BigQuery with SQL and analyze in Python in one place", "Idle shutdown keeps costs under control"],
      gpuTrain: ["Wide choice of accelerators: L4, A100, H100 GPUs and TPUs", "Spot VMs make long training runs much cheaper", "Billed only while the job runs"],
      platform: ["Datasets, training, registry and endpoints in one product", "Experiments and TensorBoard built in", "AutoML for teams without ML specialists"],
      serveServerless: ["Deploy any container and scale to zero", "A generous free tier for small projects", "Can attach an L4 GPU when you need one"],
      serveGPU: ["Autoscaling endpoints with traffic splitting for safe rollouts", "Cloud Run GPUs scale to zero, so idle GPUs don’t cost money", "Use prebuilt containers or your own"],
      batch: ["Predict over files in Cloud Storage or whole BigQuery tables", "No always-on endpoint to pay for", "Results land in BigQuery for analysis and dashboards"],
      pipeline: ["Managed Kubeflow / TFX pipelines", "Tracks the lineage of every dataset, model and metric", "Schedule retraining with Cloud Scheduler"],
      vectorDb: ["Vertex AI Vector Search handles billions of vectors at low latency", "AlloyDB / Cloud SQL with pgvector keeps vectors beside app data", "Managed backups and high availability"],
      llm: ["Claude, Gemini and open models in one catalog", "Enterprise data governance: your prompts aren’t used to train the models", "Tuning and evaluation tools built in"],
      monitoring: ["Model Monitoring alerts on feature skew and drift", "Dashboards for latency and errors in Cloud Monitoring", "Export logs to BigQuery to analyze predictions"],
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
      privacy: ["Private endpoints keep traffic on Microsoft’s network", "Customer-managed encryption keys", "Fine-grained access with Microsoft Entra ID"]
    },
    self: {
      storage: ["No cloud bill, and data never leaves your hardware", "MinIO speaks the S3 API, so code moves to the cloud unchanged later", "PostgreSQL is a solid home for structured data"],
      notebook: ["Free, and runs on any laptop or server", "Full control over packages and extensions", "Works offline"],
      gpuTrain: ["An owned GPU has no hourly cost after purchase", "GPU rental marketplaces are often cheaper than the big clouds", "Choose the exact GPU model you need"],
      platform: ["Open-source, vendor-neutral experiment tracking and registry", "The same MLflow API works locally and on Databricks or Azure ML", "Easy to self-host with Docker"],
      serveServerless: ["Simple and cheap for low or steady traffic", "A container runs the same anywhere", "Predictable flat monthly price"],
      serveGPU: ["Request batching squeezes the most throughput out of a GPU", "vLLM is a leading engine for serving LLMs fast", "No per-request fees"],
      batch: ["A plain scheduled Python script that’s easy to understand", "No vendor lock-in", "Runs on servers you already have"],
      pipeline: ["Open source with large communities", "Workflows are plain Python", "Run locally or move to any cloud later"],
      vectorDb: ["Free and open source", "Chroma suits prototypes; Qdrant scales to production", "pgvector reuses an existing PostgreSQL database"],
      llm: ["Prompts and documents never leave your network", "No per-token charges, only hardware costs", "Pick, and even fine-tune, any open-weights model"],
      monitoring: ["Industry-standard open-source monitoring", "Evidently produces ready-made drift and quality reports", "Build a dashboard for any metric"],
      privacy: ["Full control over where data lives", "Works in air-gapped environments", "You set the encryption and access rules (and own the security work)"]
    }
  };

  // Fallback when a description matches nothing: "what will the model work with?"
  const DATA_TYPES = [
    { label: "Rows in a spreadsheet or database", hint: "Customers, transactions, applications, products…", ids: ["tabular-classification", "regression", "anomaly-detection"] },
    { label: "Numbers recorded over time", hint: "Daily sales, hourly sensor readings, website traffic…", ids: ["forecasting", "anomaly-detection"] },
    { label: "Text", hint: "Emails, reviews, tickets, social posts…", ids: ["text-classification", "llm-rag"] },
    { label: "Documents to ask questions about", hint: "PDFs, manuals, policies, a wiki…", ids: ["llm-rag"] },
    { label: "Images or photos", hint: "Product photos, scans, X-rays…", ids: ["image-classification", "object-detection"] },
    { label: "Video or camera feeds", hint: "CCTV, drone footage, webcams…", ids: ["object-detection"] },
    { label: "Audio or voice", hint: "Calls, meetings, voice commands, sounds…", ids: ["speech"] },
    { label: "What people click, buy or watch", hint: "Purchase history, views, ratings…", ids: ["recommendation"] }
  ];

  // "See an example plan": a finished plan a first-time visitor can explore before typing anything.
  // The home page's "What you’ll get" preview is built from it too.
  const EXAMPLE_PLAN = {
    useCaseId: "forecasting",
    requirement: "I run a small bakery and want to know how many loaves of each bread to bake every morning so we waste less",
    answers: { data: "small", skill: "beginner", deploy: "batch", latency: "relaxed", cloud: "unsure", budget: "low", privacy: "no" }
  };

  // What each part of the tech stack is for, in plain words (shown next to the tools).
  const STACK_WHY = {
    "Language": "What you write the code in.",
    "Data and prep": "Load, clean and explore your data.",
    "Modeling": "The libraries that train or run the model.",
    "Vector search": "Finds the passages most related to a question.",
    "Experiment tracking": "Remembers which settings gave which results, so you can compare runs and go back.",
    "Serving": "How the model’s answers reach your users or systems.",
    "Monitoring": "Tells you when the model starts getting worse, so you know when to retrain."
  };

  const KB = { DATA_TYPES, EXAMPLE_PLAN, STACK_WHY, USE_CASES, QUESTIONS, INFRA, INFRA_COMPONENTS, INFRA_ADVANTAGES, EDGE_FORMATS, GLOSSARY, TRAINING_TOPICS };
  if (typeof module !== "undefined" && module.exports) module.exports = KB;
  else root.HM_KB = KB;
})(typeof window !== "undefined" ? window : globalThis);
