"""
SQLAlchemy ORM models for the ChurnIQ application.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class RiskTier(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class ActionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ActionType(str, enum.Enum):
    DISCOUNT_OFFER = "discount_offer"
    PERSONAL_CALL = "personal_call"
    UPGRADE_OFFER = "upgrade_offer"
    EMAIL_CAMPAIGN = "email_campaign"


class Customer(Base):
    """Represents a SaaS/telecom customer with churn scoring metadata."""

    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    email = Column(String(200), nullable=False, unique=True, index=True)

    # Demographic & account fields (mirrors Telco dataset)
    gender = Column(String(10), nullable=False, default="Male")
    senior_citizen = Column(Integer, nullable=False, default=0)  # 0 or 1
    partner = Column(String(5), nullable=False, default="No")
    dependents = Column(String(5), nullable=False, default="No")
    tenure = Column(Integer, nullable=False, default=1)

    # Service fields
    phone_service = Column(String(5), nullable=False, default="Yes")
    multiple_lines = Column(String(30), nullable=False, default="No")
    internet_service = Column(String(30), nullable=False, default="DSL")
    online_security = Column(String(30), nullable=False, default="No")
    online_backup = Column(String(30), nullable=False, default="No")
    device_protection = Column(String(30), nullable=False, default="No")
    tech_support = Column(String(30), nullable=False, default="No")
    streaming_tv = Column(String(30), nullable=False, default="No")
    streaming_movies = Column(String(30), nullable=False, default="No")

    # Billing fields
    contract = Column(String(30), nullable=False, default="Month-to-month")
    paperless_billing = Column(String(5), nullable=False, default="Yes")
    payment_method = Column(String(50), nullable=False, default="Electronic check")
    monthly_charges = Column(Float, nullable=False, default=50.0)
    total_charges = Column(Float, nullable=False, default=50.0)

    # ML scoring
    churn_prob = Column(Float, nullable=True, default=None)
    risk_tier = Column(
        SAEnum(RiskTier, name="risk_tier_enum"),
        nullable=True,
        default=None,
    )
    last_predicted_at = Column(DateTime, nullable=True, default=None)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    predictions = relationship(
        "Prediction", back_populates="customer", cascade="all, delete-orphan"
    )
    retention_actions = relationship(
        "RetentionAction", back_populates="customer", cascade="all, delete-orphan"
    )


class Prediction(Base):
    """Stores each churn prediction made for a customer."""

    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    churn_prob = Column(Float, nullable=False)
    risk_tier = Column(
        SAEnum(RiskTier, name="risk_tier_enum"),
        nullable=False,
    )
    shap_json = Column(Text, nullable=True)  # JSON string of SHAP values
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="predictions")


class RetentionAction(Base):
    """Tracks retention interventions taken for at-risk customers."""

    __tablename__ = "retention_actions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    action_type = Column(
        SAEnum(ActionType, name="action_type_enum"),
        nullable=False,
    )
    status = Column(
        SAEnum(ActionStatus, name="action_status_enum"),
        nullable=False,
        default=ActionStatus.PENDING,
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="retention_actions")