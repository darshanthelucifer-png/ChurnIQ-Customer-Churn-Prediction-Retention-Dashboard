"""
Prediction endpoints — ad-hoc churn prediction for a feature payload.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.model import predictor
from app.schemas import PredictRequest, PredictResponse, ShapFeature

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["predictions"])


@router.post("/predict", response_model=PredictResponse)
def predict_churn(body: PredictRequest) -> PredictResponse:
    """
    Run the churn model on an arbitrary feature payload.
    Used by the Predict & Simulate page.
    """
    if predictor.pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train the model first.",
        )

    data = body.model_dump()
    result = predictor.predict(data)

    shap_local = [ShapFeature(**item) for item in result["shap_local"]]

    return PredictResponse(
        churn_prob=result["churn_prob"],
        risk_tier=result["risk_tier"],
        shap_local=shap_local,
        retention_suggestions=result["retention_suggestions"],
    )