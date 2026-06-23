"""
CRUD endpoints for customer records.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models_db import ActionStatus, ActionType, Customer, Prediction, RetentionAction
from app.schemas import (
    CustomerDetail,
    CustomerListResponse,
    CustomerOut,
    RetentionActionCreate,
    RetentionActionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    risk_tier: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("churn_prob"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
) -> CustomerListResponse:
    """
    Return paginated, filterable, sortable customer list.
    """
    query = db.query(Customer)

    if risk_tier and risk_tier != "All":
        query = query.filter(Customer.risk_tier == risk_tier)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(Customer.name.ilike(term), Customer.email.ilike(term))
        )

    # Dynamic sort column
    sort_col_map = {
        "churn_prob": Customer.churn_prob,
        "tenure": Customer.tenure,
        "monthly_charges": Customer.monthly_charges,
        "name": Customer.name,
        "created_at": Customer.created_at,
    }
    sort_col = sort_col_map.get(sort_by, Customer.churn_prob)
    if order == "desc":
        query = query.order_by(sort_col.desc().nullslast())
    else:
        query = query.order_by(sort_col.asc().nullsfirst())

    total = query.count()
    customers = query.offset((page - 1) * limit).limit(limit).all()

    return CustomerListResponse(
        total=total,
        page=page,
        limit=limit,
        customers=[CustomerOut.model_validate(c) for c in customers],
    )


@router.get("/{customer_id}", response_model=CustomerDetail)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
) -> CustomerDetail:
    """Return full customer profile including last 5 predictions and all actions."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found.")

    # Sort predictions descending, return last 5
    preds = (
        db.query(Prediction)
        .filter(Prediction.customer_id == customer_id)
        .order_by(Prediction.created_at.desc())
        .limit(5)
        .all()
    )
    actions = (
        db.query(RetentionAction)
        .filter(RetentionAction.customer_id == customer_id)
        .order_by(RetentionAction.created_at.desc())
        .all()
    )

    detail = CustomerDetail.model_validate(customer)
    detail.predictions = preds  # type: ignore[assignment]
    detail.retention_actions = actions  # type: ignore[assignment]
    return detail


@router.post("/{customer_id}/actions", response_model=RetentionActionResponse)
def create_retention_action(
    customer_id: int,
    body: RetentionActionCreate,
    db: Session = Depends(get_db),
) -> RetentionActionResponse:
    """Log a new retention action for the specified customer."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found.")

    # Validate action_type
    valid_types = {a.value for a in ActionType}
    if body.action_type not in valid_types:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid action_type. Must be one of: {', '.join(valid_types)}",
        )

    action = RetentionAction(
        customer_id=customer_id,
        action_type=body.action_type,
        status=ActionStatus.PENDING,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    return RetentionActionResponse(
        id=action.id,
        customer_id=action.customer_id,
        action_type=action.action_type.value,
        status=action.status.value,
        created_at=action.created_at,
    )