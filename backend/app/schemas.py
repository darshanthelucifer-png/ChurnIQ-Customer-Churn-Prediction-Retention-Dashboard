"""
Pydantic schemas for request validation and response serialization.
"""

from __future__ import annotations
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ─── Shared enums / literals ──────────────────────────────────────────────────

class RiskTierEnum(str):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


# ─── Customer schemas ─────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    email: str
    gender: str = "Male"
    senior_citizen: int = Field(0, ge=0, le=1)
    partner: str = "No"
    dependents: str = "No"
    tenure: int = Field(1, ge=0, le=72)
    phone_service: str = "Yes"
    multiple_lines: str = "No phone service"
    internet_service: str = "DSL"
    online_security: str = "No"
    online_backup: str = "No"
    device_protection: str = "No"
    tech_support: str = "No"
    streaming_tv: str = "No"
    streaming_movies: str = "No"
    contract: str = "Month-to-month"
    paperless_billing: str = "Yes"
    payment_method: str = "Electronic check"
    monthly_charges: float = Field(50.0, ge=0)
    total_charges: float = Field(50.0, ge=0)


class CustomerCreate(CustomerBase):
    pass


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    churn_prob: float
    risk_tier: str
    shap_json: Optional[str] = None
    created_at: datetime


class RetentionActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_type: str
    status: str
    created_at: datetime


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    churn_prob: Optional[float] = None
    risk_tier: Optional[str] = None
    last_predicted_at: Optional[datetime] = None
    created_at: datetime


class CustomerDetail(CustomerOut):
    predictions: List[PredictionOut] = []
    retention_actions: List[RetentionActionOut] = []


class CustomerListResponse(BaseModel):
    total: int
    page: int
    limit: int
    customers: List[CustomerOut]


# ─── Prediction request/response ──────────────────────────────────────────────

class PredictRequest(BaseModel):
    """Raw feature input for a new or simulated customer prediction."""
    gender: str = "Male"
    senior_citizen: int = Field(0, ge=0, le=1)
    partner: str = "No"
    dependents: str = "No"
    tenure: int = Field(12, ge=0, le=72)
    phone_service: str = "Yes"
    multiple_lines: str = "No phone service"
    internet_service: str = "DSL"
    online_security: str = "No"
    online_backup: str = "No"
    device_protection: str = "No"
    tech_support: str = "No"
    streaming_tv: str = "No"
    streaming_movies: str = "No"
    contract: str = "Month-to-month"
    paperless_billing: str = "Yes"
    payment_method: str = "Electronic check"
    monthly_charges: float = Field(65.0, ge=0)
    total_charges: float = Field(780.0, ge=0)


class ShapFeature(BaseModel):
    feature: str
    value: Any
    impact: float
    direction: str  # "increases_churn" | "decreases_churn"


class PredictResponse(BaseModel):
    churn_prob: float
    risk_tier: str
    shap_local: List[ShapFeature]
    retention_suggestions: List[str]


# ─── Analytics schemas ────────────────────────────────────────────────────────

class ChurnTrendPoint(BaseModel):
    month: str
    churn_rate: float


class RiskSegment(BaseModel):
    segment_name: str
    count: int
    avg_prob: float


class OverviewResponse(BaseModel):
    total_customers: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    avg_churn_prob: float
    churn_trend: List[ChurnTrendPoint]
    top_risk_segments: List[RiskSegment]


# ─── Model info schemas ───────────────────────────────────────────────────────

class FeatureImportance(BaseModel):
    feature: str
    importance: float


class ModelInfoResponse(BaseModel):
    best_model_name: str
    roc_auc: float
    f1: float
    recall: float
    precision: float
    feature_importances: List[FeatureImportance]
    confusion_matrix: List[List[int]]
    trained_at: Optional[str] = None


class RocCurveResponse(BaseModel):
    fpr: List[float]
    tpr: List[float]
    thresholds: List[float]


# ─── Retention action request ─────────────────────────────────────────────────

class RetentionActionCreate(BaseModel):
    action_type: str  # discount_offer | personal_call | upgrade_offer | email_campaign


class RetentionActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    action_type: str
    status: str
    created_at: datetime