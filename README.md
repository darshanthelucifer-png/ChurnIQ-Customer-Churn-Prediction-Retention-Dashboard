# ChurnIQ — Customer Churn Prediction & Retention Dashboard

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?style=flat-square&logo=scikitlearn&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.0-FF6600?style=flat-square)
![SHAP](https://img.shields.io/badge/SHAP-0.45-blueviolet?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Recharts](https://img.shields.io/badge/Recharts-2.12-22b5bf?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-dev-003B57?style=flat-square&logo=sqlite)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-prod-336791?style=flat-square&logo=postgresql&logoColor=white)

---

## Problem Statement & Business Impact

SaaS and telecom companies lose **5–25% of annual revenue** to customer churn. 
Acquiring a new customer costs 5–7× more than retaining an existing one.

ChurnIQ solves three problems simultaneously:

1. **Predict** — which customers are likely to leave in the next billing cycle
2. **Explain** — why each customer is at risk (powered by SHAP)
3. **Act** — surface targeted retention actions before the customer churns

This is not a notebook. It is a production-structured system: ML pipeline → REST API → 
multi-page dashboard — built to the standard of a real B2B analytics product.

churniq/
│
├── backend/                          # Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py              # Package marker
│   │   ├── main.py                  # FastAPI app, CORS, lifespan
│   │   ├── model.py                 # ChurnPredictor class, SHAP, retention logic
│   │   ├── database.py              # SQLAlchemy engine + session factory
│   │   ├── models_db.py             # ORM models (Customer, Prediction, RetentionAction)
│   │   ├── schemas.py               # Pydantic request/response schemas
│   │   └── routers/
│   │       ├── __init__.py          # Package marker
│   │       ├── customers.py         # Customer CRUD endpoints
│   │       ├── predictions.py       # POST /api/predict
│   │       └── analytics.py         # Overview, model info, ROC curve
│   │
│   ├── train.py                     # Standalone training script
│   ├── seed_db.py                   # Database seeding with Faker
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Environment variables (optional)
│   ├── churniq.db                   # SQLite database (created by seed_db.py)
│   ├── model.pkl                    # Trained Pipeline (created by train.py)
│   ├── model_meta.json              # Metrics, feature importances, ROC
│   ├── shap_global.json             # Top 15 global SHAP importances
│   └── telco_churn.csv              # Downloaded dataset (cached)
│
├── frontend/                        # React Vite frontend
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js            # Axios base config
│   │   │   └── endpoints.js         # All API call functions
│   │   │
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Persistent nav sidebar
│   │   │   ├── TopBar.jsx           # Page header component
│   │   │   ├── RiskBadge.jsx        # Colored High/Medium/Low pill
│   │   │   ├── MetricCard.jsx       # KPI summary card
│   │   │   ├── ChurnGauge.jsx       # Animated SVG arc gauge
│   │   │   ├── ShapChart.jsx        # Horizontal SHAP bar chart
│   │   │   ├── TrendChart.jsx       # Line chart for time series
│   │   │   ├── RetentionPanel.jsx   # 4-button action panel
│   │   │   ├── Toast.jsx            # Auto-dismiss notifications
│   │   │   ├── Sidebar.css          # Sidebar styles
│   │   │   ├── TopBar.css           # TopBar styles
│   │   │   ├── RiskBadge.css        # Badge styles
│   │   │   ├── MetricCard.css       # Card styles
│   │   │   ├── ChurnGauge.css       # Gauge styles
│   │   │   ├── ShapChart.css        # Chart tooltip styles
│   │   │   ├── TrendChart.css       # Chart styles
│   │   │   └── RetentionPanel.css   # Action button styles
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAnalytics.js      # Overview data fetching
│   │   │   ├── useCustomers.js      # Paginated customer list
│   │   │   └── usePrediction.js     # Prediction with loading/error
│   │   │
│   │   ├── pages/
│   │   │   ├── Overview.jsx         # Dashboard with KPIs + charts
│   │   │   ├── CustomerList.jsx     # Filterable/sortable table
│   │   │   ├── CustomerProfile.jsx  # Profile + SHAP + actions
│   │   │   ├── PredictSimulate.jsx  # Form + live prediction + what-if
│   │   │   ├── ModelInsights.jsx    # Metrics, importances, ROC, CM
│   │   │   ├── Overview.css         # Page-specific styles
│   │   │   ├── CustomerList.css     # Table + filter bar styles
│   │   │   ├── CustomerProfile.css  # Profile layout styles
│   │   │   ├── PredictSimulate.css  # Form + simulator styles
│   │   │   └── ModelInsights.css    # Charts + matrix styles
│   │   │
│   │   ├── styles/
│   │   │   └── global.css           # Global styles, CSS variables, utilities
│   │   │
│   │   ├── App.jsx                  # React Router setup
│   │   └── main.jsx                 # React app entry point
│   │
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # Node dependencies
│   ├── vite.config.js               # Vite configuration
│   └── .env                         # Frontend env vars (optional)
│
├── docs/
│   └── screenshots/                 # App screenshots for README
│       ├── overview.png
│       ├── customer-list.png
│       ├── customer-profile.png
│       ├── predict-simulate.png
│       └── model-insights.png
│
├── .gitignore                       # Git ignore patterns
├── README.md                        # This file
└── LICENSE                          # MIT License



---

## Tech Stack

| Layer | Technology |
|---|---|
| ML Pipeline | scikit-learn, XGBoost, SHAP, pandas, numpy |
| API | FastAPI, SQLAlchemy, Pydantic v2, Uvicorn |
| Database | SQLite (dev), PostgreSQL (prod) |
| Frontend | React 18, Vite, React Router v6 |
| Charts | Recharts |
| Icons | Lucide React |
| Data | IBM Telco Customer Churn Dataset (7,043 records) |

---

## Model Performance

| Model | ROC-AUC | F1 Score | Recall | Precision | Status |
|---|---|---|---|---|---|
| **XGBoost** | **0.8421** | **0.6234** | **0.7891** | **0.5112** | ✅ Active |
| RandomForest | 0.8187 | 0.5978 | 0.7102 | 0.5161 | Inactive |

> Metrics computed on 20% held-out stratified test split.
> `class_weight="balanced"` / `scale_pos_weight` used to handle the ~26% churn rate imbalance.

---

## Features That Make This Non-Trivial

1. **SHAP Local Explainability** — Per-customer SHAP breakdown stored in DB and served via API
2. **What-If Simulator** — Live re-prediction with 400ms debounce as sliders change
3. **Risk Segmentation** — Automated tiering (High/Medium/Low) stored on every customer record
4. **Retention Logic Engine** — Rule-based suggestion system layered on model outputs
5. **Full ML Pipeline** — ColumnTransformer with mixed encoders + StandardScaler inside Pipeline
6. **Dual Model Training** — RF and XGB trained, compared, best saved automatically
7. **ROC Curve API** — Downsampled to 200pts for frontend chart performance
8. **Prediction History** — Every prediction logged with SHAP JSON for audit trail

---

## Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- `pip` and `npm`

Backend Setup

cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train the ML model (downloads Telco CSV automatically)
python train.py

# Seed the database with 500 realistic customers
python seed_db.py

# Start the API server
uvicorn app.main:app --reload --port 8000


Frontend Setup
cd frontend

npm install
npm run dev

