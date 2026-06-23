"""
Analytics and model-info endpoints powering the Overview and Model Insights pages.
"""

from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import MODEL_META_PATH, predictor, train_and_save
from app.models_db import Customer
from app.schemas import (
    ChurnTrendPoint,
    FeatureImportance,
    ModelInfoResponse,
    OverviewResponse,
    RiskSegment,
    RocCurveResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analytics"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent


# ─── JSON sanitizer helper ────────────────────────────────────────────────────

def _sanitize(obj):
    """
    Recursively replace inf / -inf / nan with None so FastAPI can serialize.
    sklearn's roc_curve() prepends threshold[0] = inf which breaks json.dumps.
    """
    if isinstance(obj, float):
        return None if not math.isfinite(obj) else obj
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    return obj


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/analytics/overview", response_model=OverviewResponse)
def get_overview(db: Session = Depends(get_db)) -> OverviewResponse:
    """Aggregate KPIs and segment data for the Overview dashboard."""
    total = db.query(func.count(Customer.id)).scalar() or 0

    high = (
        db.query(func.count(Customer.id))
        .filter(Customer.risk_tier == "High")
        .scalar()
        or 0
    )
    medium = (
        db.query(func.count(Customer.id))
        .filter(Customer.risk_tier == "Medium")
        .scalar()
        or 0
    )
    low = (
        db.query(func.count(Customer.id))
        .filter(Customer.risk_tier == "Low")
        .scalar()
        or 0
    )
    avg_prob_row = db.query(func.avg(Customer.churn_prob)).scalar()
    avg_prob = round(float(avg_prob_row or 0), 4)

    # ── Simulated 6-month churn trend ──
    churn_trend: List[ChurnTrendPoint] = []
    for i in range(5, -1, -1):
        month_dt = datetime.utcnow() - timedelta(days=i * 30)
        month_label = month_dt.strftime("%b %Y")
        start = month_dt.replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1)
        avg_row = (
            db.query(func.avg(Customer.churn_prob))
            .filter(Customer.created_at >= start, Customer.created_at < end)
            .scalar()
        )
        rate = round(float(avg_row or avg_prob) * 100, 2)
        churn_trend.append(ChurnTrendPoint(month=month_label, churn_rate=rate))

    # ── Top risk segments by contract type ──
    contract_rows = (
        db.query(
            Customer.contract,
            func.count(Customer.id),
            func.avg(Customer.churn_prob),
        )
        .group_by(Customer.contract)
        .all()
    )
    segments = [
        RiskSegment(
            segment_name=row[0] or "Unknown",
            count=row[1],
            avg_prob=round(float(row[2] or 0), 4),
        )
        for row in sorted(contract_rows, key=lambda r: r[2] or 0, reverse=True)
    ]

    return OverviewResponse(
        total_customers=total,
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
        avg_churn_prob=avg_prob,
        churn_trend=churn_trend,
        top_risk_segments=segments,
    )


@router.get("/model/info", response_model=ModelInfoResponse)
def get_model_info() -> ModelInfoResponse:
    """Return saved model metrics, feature importances, and confusion matrix."""
    if not MODEL_META_PATH.exists():
        raise HTTPException(status_code=404, detail="Model metadata not found. Train first.")

    with open(MODEL_META_PATH) as f:
        meta: Dict[str, Any] = json.load(f)

    return ModelInfoResponse(
        best_model_name=meta["best_model_name"],
        roc_auc=meta["roc_auc"],
        f1=meta["f1"],
        recall=meta["recall"],
        precision=meta["precision"],
        feature_importances=[
            FeatureImportance(**fi) for fi in meta.get("feature_importances", [])
        ],
        confusion_matrix=meta["confusion_matrix"],
        trained_at=meta.get("trained_at"),
    )


@router.get("/model/roc-curve", response_model=RocCurveResponse)
def get_roc_curve() -> RocCurveResponse:
    """Return fpr, tpr, threshold arrays for the ROC curve chart."""
    if not MODEL_META_PATH.exists():
        raise HTTPException(status_code=404, detail="Model metadata not found. Train first.")

    with open(MODEL_META_PATH) as f:
        meta: Dict[str, Any] = json.load(f)

    # ✅ CRITICAL FIX: sanitize before processing
    # sklearn's roc_curve prepends inf to thresholds → breaks JSON serialization
    meta = _sanitize(meta)

    fpr = meta.get("fpr", [])
    tpr = meta.get("tpr", [])
    thresholds = meta.get("thresholds", [])

    # Downsample to 200 points for frontend performance
    step = max(1, len(fpr) // 200)

    # Filter out None values created by sanitizer, then round
    def safe_round(lst):
        return [round(v, 5) for v in lst[::step] if v is not None]

    return RocCurveResponse(
        fpr=safe_round(fpr),
        tpr=safe_round(tpr),
        thresholds=safe_round(thresholds),
    )


@router.post("/model/retrain")
def retrain_model() -> Dict[str, Any]:
    """
    Trigger a model retrain using the cached local CSV.
    In production this would be an async Celery task.
    """
    csv_path = BASE_DIR / "telco_churn.csv"
    if not csv_path.exists():
        raise HTTPException(
            status_code=400,
            detail="Training CSV not found. Run train.py manually first.",
        )

    logger.info("Retraining triggered via API...")
    meta = train_and_save(str(csv_path))
    predictor.load()  # Reload the freshly trained model

    return {
        "message": "Model retrained successfully.",
        "best_model": meta["best_model_name"],
        "roc_auc": meta["roc_auc"],
        "trained_at": meta.get("trained_at"),
    }