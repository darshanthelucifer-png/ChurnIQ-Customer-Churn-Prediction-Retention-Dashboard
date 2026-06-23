"""
ML pipeline: preprocessing, training, SHAP explanations,
customer risk scoring, and retention suggestion logic.
"""

from __future__ import annotations

import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR        = Path(__file__).resolve().parent.parent
MODEL_PATH      = BASE_DIR / "model.pkl"
SHAP_GLOBAL_PATH = BASE_DIR / "shap_global.json"
MODEL_META_PATH  = BASE_DIR / "model_meta.json"

# ─── Column definitions ───────────────────────────────────────────────────────
BINARY_COLS = [
    "gender", "Partner", "Dependents",
    "PhoneService", "PaperlessBilling",
]
MULTI_COLS = [
    "MultipleLines", "InternetService", "OnlineSecurity",
    "OnlineBackup", "DeviceProtection", "TechSupport",
    "StreamingTV", "StreamingMovies", "Contract", "PaymentMethod",
]
NUMERIC_COLS = ["tenure", "MonthlyCharges", "TotalCharges"]


# ─── Preprocessing helpers ────────────────────────────────────────────────────

def _load_raw_data(csv_path: str) -> pd.DataFrame:
    """Load the Telco CSV, clean TotalCharges, encode target."""
    df = pd.read_csv(csv_path)
    df = df.drop(columns=["customerID"], errors="ignore")
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df["TotalCharges"] = df["TotalCharges"].fillna(df["TotalCharges"].median())
    df["Churn"] = (df["Churn"] == "Yes").astype(int)
    return df


def _build_preprocessor() -> ColumnTransformer:
    """Build ColumnTransformer: binary OHE (drop first) + multi OHE + scaler."""
    return ColumnTransformer(
        transformers=[
            ("binary",  OneHotEncoder(drop="first", sparse_output=False,
                                      handle_unknown="ignore"), BINARY_COLS),
            ("multi",   OneHotEncoder(drop=None,    sparse_output=False,
                                      handle_unknown="ignore"), MULTI_COLS),
            ("numeric", StandardScaler(),                        NUMERIC_COLS),
        ],
        remainder="drop",
    )


# ─── Feature name helper ──────────────────────────────────────────────────────

def _get_feature_names(preprocessor: ColumnTransformer) -> List[str]:
    """
    Return feature names that EXACTLY match the columns produced by
    preprocessor.transform().

    Strategy
    --------
    1. Try preprocessor.get_feature_names_out()  — sklearn >= 1.0, always
       returns the right count.
    2. Fall back to per-transformer extraction, skipping 'remainder'.

    Always returns a plain list[str] so plain-int indexing is safe.
    """
    # ── Strategy 1: ask the whole ColumnTransformer (most reliable) ──────────
    try:
        return [str(n) for n in preprocessor.get_feature_names_out()]
    except Exception as exc:
        logger.warning(
            "_get_feature_names: get_feature_names_out() failed (%s) — "
            "falling back to manual extraction.", exc
        )

    # ── Strategy 2: manual, skip remainder ───────────────────────────────────
    names: List[str] = []
    for tname, transformer, cols in preprocessor.transformers_:
        if tname == "remainder":          # always skip — it's "drop" or passthrough
            continue
        if transformer == "drop":         # explicit drop transformer
            continue
        if hasattr(transformer, "get_feature_names_out"):
            names.extend(transformer.get_feature_names_out(cols).tolist())
        else:
            names.extend(cols if isinstance(cols, list) else [cols])
    return names


def _sync_feature_names(
    feature_names: List[str],
    n_cols: int,
) -> List[str]:
    """
    Guarantee len(feature_names) == n_cols.
    Trims if too long; pads with generic names if too short.
    Logs a warning whenever a mismatch is detected.
    """
    if len(feature_names) == n_cols:
        return feature_names

    logger.warning(
        "_sync_feature_names: feature_names has %d entries but "
        "transformed array has %d columns — reconciling.",
        len(feature_names), n_cols,
    )
    if len(feature_names) > n_cols:
        return feature_names[:n_cols]

    # Too few names — pad
    padding = [f"feature_{j}" for j in range(len(feature_names), n_cols)]
    return feature_names + padding


# ─── Training ─────────────────────────────────────────────────────────────────

def train_and_save(csv_path: str) -> Dict[str, Any]:
    """
    Full training pipeline:
      1. Load + preprocess data
      2. Train RF and XGBoost
      3. Compare on held-out test set
      4. Save best model + SHAP globals + metadata
    Returns evaluation metrics dict.
    """
    logger.info("Loading training data from %s", csv_path)
    df = _load_raw_data(csv_path)

    X = df.drop(columns=["Churn"])
    y = df["Churn"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Class imbalance ratio for XGBoost
    neg, pos  = (y_train == 0).sum(), (y_train == 1).sum()
    scale_pos = float(neg) / float(pos)

    # ── Pipelines ─────────────────────────────────────────────────────────────
    rf_pipeline = Pipeline([
        ("prep", _build_preprocessor()),
        ("clf",  RandomForestClassifier(
            n_estimators=200,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    xgb_pipeline = Pipeline([
        ("prep", _build_preprocessor()),
        ("clf",  XGBClassifier(
            n_estimators=200,
            scale_pos_weight=scale_pos,
            eval_metric="logloss",
            random_state=42,
            use_label_encoder=False,
            verbosity=0,
        )),
    ])

    logger.info("Training RandomForest...")
    rf_pipeline.fit(X_train, y_train)

    logger.info("Training XGBoost...")
    xgb_pipeline.fit(X_train, y_train)

    # ── Evaluate ──────────────────────────────────────────────────────────────
    def _metrics(pipeline: Pipeline, name: str) -> Dict[str, float]:
        y_prob = pipeline.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)
        return {
            "name":      name,
            "roc_auc":   round(float(roc_auc_score(y_test,  y_prob)), 4),
            "f1":        round(float(f1_score(y_test,        y_pred)), 4),
            "recall":    round(float(recall_score(y_test,    y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred)), 4),
        }

    rf_metrics  = _metrics(rf_pipeline,  "RandomForest")
    xgb_metrics = _metrics(xgb_pipeline, "XGBoost")

    logger.info("RF   → ROC-AUC: %.4f  F1: %.4f", rf_metrics["roc_auc"],  rf_metrics["f1"])
    logger.info("XGB  → ROC-AUC: %.4f  F1: %.4f", xgb_metrics["roc_auc"], xgb_metrics["f1"])

    # Choose best by ROC-AUC
    if xgb_metrics["roc_auc"] >= rf_metrics["roc_auc"]:
        best_pipeline, best_metrics = xgb_pipeline, xgb_metrics
        other_metrics               = rf_metrics
    else:
        best_pipeline, best_metrics = rf_pipeline, rf_metrics
        other_metrics               = xgb_metrics

    logger.info("Best model: %s", best_metrics["name"])

    # ── Confusion matrix & ROC curve ─────────────────────────────────────────
    y_prob_best = best_pipeline.predict_proba(X_test)[:, 1]
    y_pred_best = (y_prob_best >= 0.5).astype(int)
    cm          = confusion_matrix(y_test, y_pred_best).tolist()
    fpr, tpr, thresholds = roc_curve(y_test, y_prob_best)

    # ── SHAP global feature importances ──────────────────────────────────────
    logger.info("Computing SHAP values...")

    prep = best_pipeline.named_steps["prep"]
    clf  = best_pipeline.named_steps["clf"]

    X_sample           = X_test.iloc[:300] if len(X_test) > 300 else X_test
    X_sample_transform = prep.transform(X_sample)
    n_cols             = X_sample_transform.shape[1]

    # ✅ Get names then sync length to actual transformed column count
    raw_names    = _get_feature_names(prep)
    feature_names = _sync_feature_names(raw_names, n_cols)

    logger.info(
        "Transformed shape: %s | feature_names: %d",
        X_sample_transform.shape, len(feature_names),
    )

    explainer       = shap.TreeExplainer(clf)
    shap_values_arr = explainer.shap_values(X_sample_transform)

    # Normalise to 2-D (n_samples, n_features) for positive / churn class
    if isinstance(shap_values_arr, list):
        sv = shap_values_arr[1]           # [neg, pos] → take pos
    elif shap_values_arr.ndim == 3:
        sv = shap_values_arr[:, :, 1]    # (samples, features, classes) → pos
    else:
        sv = shap_values_arr              # already (samples, features)

    # ✅ Trim SHAP matrix columns to match n_cols (safety guard)
    sv                = sv[:, :n_cols]
    global_importance = np.abs(sv).mean(axis=0)   # (n_features,)

    top_idx     = np.argsort(global_importance)[::-1][:15]
    shap_global = [
        {
            "feature":    feature_names[int(i)],
            "importance": float(global_importance[int(i)]),
        }
        for i in top_idx
    ]

    with open(SHAP_GLOBAL_PATH, "w") as fh:
        json.dump(shap_global, fh, indent=2)

    logger.info(
        "SHAP saved — top feature: %s (%.4f)",
        shap_global[0]["feature"], shap_global[0]["importance"],
    )

    # ── Save model ────────────────────────────────────────────────────────────
    joblib.dump(best_pipeline, MODEL_PATH)
    logger.info("Model saved to %s", MODEL_PATH)

    # ── Feature importances from model ───────────────────────────────────────
    fi = (
        clf.feature_importances_
        if hasattr(clf, "feature_importances_")
        else np.zeros(n_cols)
    )
    fi_sorted_idx        = np.argsort(fi)[::-1][:15]
    feature_importances_list = [
        {
            "feature":    feature_names[int(i)],
            "importance": float(fi[int(i)]),
        }
        for i in fi_sorted_idx
    ]

    # ── Metadata ──────────────────────────────────────────────────────────────
    meta = {
        "best_model_name":     best_metrics["name"],
        "roc_auc":             best_metrics["roc_auc"],
        "f1":                  best_metrics["f1"],
        "recall":              best_metrics["recall"],
        "precision":           best_metrics["precision"],
        "other_model":         other_metrics,
        "confusion_matrix":    cm,
        "feature_importances": feature_importances_list,
        "fpr":                 fpr.tolist(),
        "tpr":                 tpr.tolist(),
        "thresholds":          thresholds.tolist(),
        "trained_at":          datetime.datetime.utcnow().isoformat(),
    }

    with open(MODEL_META_PATH, "w") as fh:
        json.dump(meta, fh, indent=2)

    return meta


# ─── Inference helpers ────────────────────────────────────────────────────────

def _input_to_dataframe(data: Dict[str, Any]) -> pd.DataFrame:
    """Convert flat API/seed dict → DataFrame with Telco column names."""
    mapping = {
        "gender":            "gender",
        "senior_citizen":    "SeniorCitizen",
        "partner":           "Partner",
        "dependents":        "Dependents",
        "tenure":            "tenure",
        "phone_service":     "PhoneService",
        "multiple_lines":    "MultipleLines",
        "internet_service":  "InternetService",
        "online_security":   "OnlineSecurity",
        "online_backup":     "OnlineBackup",
        "device_protection": "DeviceProtection",
        "tech_support":      "TechSupport",
        "streaming_tv":      "StreamingTV",
        "streaming_movies":  "StreamingMovies",
        "contract":          "Contract",
        "paperless_billing": "PaperlessBilling",
        "payment_method":    "PaymentMethod",
        "monthly_charges":   "MonthlyCharges",
        "total_charges":     "TotalCharges",
    }
    row = {v: data.get(k, data.get(v)) for k, v in mapping.items()}
    return pd.DataFrame([row])


def assign_risk_tier(churn_prob: float) -> str:
    """Map probability → named risk tier."""
    if churn_prob >= 0.70:
        return "High"
    elif churn_prob >= 0.40:
        return "Medium"
    return "Low"


# ─── ChurnPredictor ───────────────────────────────────────────────────────────

class ChurnPredictor:
    """
    Wraps a trained sklearn Pipeline for prediction and SHAP explanations.
    Loaded once at app startup via FastAPI lifespan.
    """

    def __init__(self) -> None:
        self.pipeline:      Optional[Pipeline]           = None
        self.feature_names: List[str]                    = []
        self.explainer:     Optional[shap.TreeExplainer] = None
        self.meta:          Dict[str, Any]               = {}

    # ── load ──────────────────────────────────────────────────────────────────
    def load(self) -> None:
        """Load saved pipeline + build SHAP explainer."""
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. Run train.py first."
            )
        logger.info("Loading model from %s", MODEL_PATH)
        self.pipeline = joblib.load(MODEL_PATH)

        prep = self.pipeline.named_steps["prep"]
        clf  = self.pipeline.named_steps["clf"]

        # Dry-run to get exact column count
        _probe_cols    = BINARY_COLS + MULTI_COLS + NUMERIC_COLS
        _probe_df      = pd.DataFrame(
            [["Male", "Yes", "No", "Yes", "Yes",          # BINARY_COLS (5)
              "No", "Fiber optic", "No", "No", "No",      # MULTI_COLS first 5
              "No", "No", "No", "Month-to-month",         # MULTI_COLS next 4
              "Electronic check",                          # MULTI_COLS last 1
              1, 29.85, 29.85]],                          # NUMERIC_COLS
            columns=BINARY_COLS + MULTI_COLS + NUMERIC_COLS,
        )
        _probe_out     = prep.transform(_probe_df)
        n_cols         = _probe_out.shape[1]

        raw_names          = _get_feature_names(prep)
        self.feature_names = _sync_feature_names(raw_names, n_cols)
        self.explainer     = shap.TreeExplainer(clf)

        if MODEL_META_PATH.exists():
            with open(MODEL_META_PATH) as fh:
                self.meta = json.load(fh)

        logger.info(
            "Model loaded — best: %s | features: %d",
            self.meta.get("best_model_name", "unknown"),
            len(self.feature_names),
        )

    # ── predict ───────────────────────────────────────────────────────────────
    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Full prediction for one customer.
        Returns churn_prob, risk_tier, local SHAP, retention suggestions.
        """
        df            = _input_to_dataframe(data)
        X_transformed = self.pipeline.named_steps["prep"].transform(df)

        # ✅ Ground-truth column count comes from the actual array
        n_cols        = X_transformed.shape[1]
        feature_names = _sync_feature_names(self.feature_names, n_cols)

        prob = float(
            self.pipeline.named_steps["clf"].predict_proba(X_transformed)[0, 1]
        )
        tier = assign_risk_tier(prob)

        # ── Local SHAP ────────────────────────────────────────────────────────
        shap_vals = self.explainer.shap_values(X_transformed)

        if isinstance(shap_vals, list):
            sv_row = shap_vals[1][0]           # list[neg, pos] → pos, first sample
        elif shap_vals.ndim == 3:
            sv_row = shap_vals[0, :, 1]        # (1, features, classes) → pos
        else:
            sv_row = shap_vals[0]              # (1, features) → first sample

        # ✅ Trim both to n_cols — prevents any residual mismatch
        sv_row = sv_row[:n_cols]

        shap_features = [
            {
                "feature":   feature_names[i],
                "raw_value": float(X_transformed[0, i]),
                "impact":    float(sv_row[i]),
            }
            for i in range(n_cols)             # ✅ iterate n_cols, not len(feature_names)
        ]
        shap_features.sort(key=lambda x: x["impact"], reverse=True)

        # Top 5 pushing toward churn (positive SHAP impact)
        positive = [
            {
                "feature":   f["feature"],
                "value":     round(f["raw_value"], 4),
                "impact":    round(abs(f["impact"]), 4),
                "direction": "increases_churn",
            }
            for f in shap_features if f["impact"] > 0
        ][:5]

        # Top 5 protective (most negative SHAP impact)
        negative = [
            {
                "feature":   f["feature"],
                "value":     round(f["raw_value"], 4),
                "impact":    round(abs(f["impact"]), 4),
                "direction": "decreases_churn",
            }
            for f in sorted(shap_features, key=lambda x: x["impact"])[:5]
        ]

        shap_local = positive + negative

        return {
            "churn_prob":            round(prob, 4),
            "risk_tier":             tier,
            "shap_local":            shap_local,
            "shap_full":             shap_features,
            "retention_suggestions": _build_suggestions(data, prob),
        }


# ─── Retention suggestion logic ───────────────────────────────────────────────

def _build_suggestions(data: Dict[str, Any], churn_prob: float) -> List[str]:
    """Targeted retention suggestions from customer attributes + churn probability."""
    suggestions:  List[str] = []
    contract     = data.get("contract",        data.get("Contract",        ""))
    tenure       = int(data.get("tenure",      0))
    monthly      = float(data.get("monthly_charges", data.get("MonthlyCharges", 0)))
    tech_support = data.get("tech_support",    data.get("TechSupport",     "No"))

    if contract == "Month-to-month" and churn_prob > 0.7:
        suggestions.append(
            "Offer an annual contract at 20 % discount to increase commitment."
        )
    if tenure < 12 and churn_prob > 0.6:
        suggestions.append(
            "Assign a dedicated onboarding specialist — "
            "early-tenure customers need guidance."
        )
    if monthly > 70 and churn_prob > 0.6:
        suggestions.append(
            "Schedule a plan review call to offer a lower-tier plan "
            "that better fits their usage."
        )
    if tech_support in ("No", "No internet service"):
        suggestions.append(
            "Offer a free 3-month TechSupport trial — "
            "support access significantly reduces churn."
        )
    if not suggestions:
        suggestions.append(
            "Schedule a personal check-in call to understand their "
            "experience and address concerns."
        )
    return suggestions


# ─── Singleton ────────────────────────────────────────────────────────────────
predictor = ChurnPredictor()