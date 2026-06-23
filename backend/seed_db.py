"""
Seeds the database with 500 realistic customers using Faker,
then scores each with the trained ML model.

Usage:
    cd backend
    python seed_db.py
"""

from __future__ import annotations

import json
import logging
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).parent))

from faker import Faker
from sqlalchemy.orm import Session

from app.database import SessionLocal, init_db
from app.model import assign_risk_tier, predictor
from app.models_db import Customer, Prediction

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("seed")

fake = Faker()
random.seed(42)

# Categorical option sets matching the Telco dataset
GENDERS = ["Male", "Female"]
YES_NO = ["Yes", "No"]
CONTRACTS = ["Month-to-month", "One year", "Two year"]
INTERNET = ["DSL", "Fiber optic", "No"]
PAYMENT = [
    "Electronic check",
    "Mailed check",
    "Bank transfer (automatic)",
    "Credit card (automatic)",
]
MULTI_LINE_OPTIONS = ["No phone service", "No", "Yes"]
INTERNET_OPTIONS = ["No internet service", "No", "Yes"]


def _random_customer() -> Dict[str, Any]:
    """Generate a single realistic fake customer feature dict."""
    tenure = random.randint(1, 72)
    contract = random.choices(
        CONTRACTS, weights=[0.55, 0.25, 0.20]
    )[0]
    internet_service = random.choices(
        INTERNET, weights=[0.35, 0.45, 0.20]
    )[0]
    monthly = round(random.uniform(18.0, 118.0), 2)
    total = round(monthly * tenure * random.uniform(0.85, 1.05), 2)

    def internet_opt() -> str:
        return random.choice(INTERNET_OPTIONS) if internet_service != "No" else "No internet service"

    return {
        "gender": random.choice(GENDERS),
        "senior_citizen": random.choices([0, 1], weights=[0.84, 0.16])[0],
        "partner": random.choice(YES_NO),
        "dependents": random.choices(YES_NO, weights=[0.70, 0.30])[0],
        "tenure": tenure,
        "phone_service": random.choices(YES_NO, weights=[0.90, 0.10])[0],
        "multiple_lines": random.choice(MULTI_LINE_OPTIONS),
        "internet_service": internet_service,
        "online_security": internet_opt(),
        "online_backup": internet_opt(),
        "device_protection": internet_opt(),
        "tech_support": internet_opt(),
        "streaming_tv": internet_opt(),
        "streaming_movies": internet_opt(),
        "contract": contract,
        "paperless_billing": random.choices(YES_NO, weights=[0.60, 0.40])[0],
        "payment_method": random.choice(PAYMENT),
        "monthly_charges": monthly,
        "total_charges": total,
    }


def seed(n: int = 500) -> None:
    """Create n fake customers, score them, and write to the database."""
    init_db()

    logger.info("Loading ML model...")
    predictor.load()

    db: Session = SessionLocal()
    try:
        existing = db.query(Customer).count()
        if existing >= n:
            logger.info("Database already has %d customers. Skipping seed.", existing)
            return

        logger.info("Seeding %d customers...", n)
        created_count = 0

        for i in range(n):
            features = _random_customer()

            # Build a unique name + email
            first = fake.first_name()
            last = fake.last_name()
            name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}{random.randint(1, 999)}@{fake.domain_name()}"

            # Score with the model
            result = predictor.predict(features)
            churn_prob: float = result["churn_prob"]
            tier: str = result["risk_tier"]
            shap_local = result["shap_local"]

            # Simulate a realistic created_at spread over the last year
            created_at = datetime.utcnow() - timedelta(days=random.randint(0, 365))

            customer = Customer(
                name=name,
                email=email,
                gender=features["gender"],
                senior_citizen=features["senior_citizen"],
                partner=features["partner"],
                dependents=features["dependents"],
                tenure=features["tenure"],
                phone_service=features["phone_service"],
                multiple_lines=features["multiple_lines"],
                internet_service=features["internet_service"],
                online_security=features["online_security"],
                online_backup=features["online_backup"],
                device_protection=features["device_protection"],
                tech_support=features["tech_support"],
                streaming_tv=features["streaming_tv"],
                streaming_movies=features["streaming_movies"],
                contract=features["contract"],
                paperless_billing=features["paperless_billing"],
                payment_method=features["payment_method"],
                monthly_charges=features["monthly_charges"],
                total_charges=features["total_charges"],
                churn_prob=churn_prob,
                risk_tier=tier,
                last_predicted_at=datetime.utcnow(),
                created_at=created_at,
            )
            db.add(customer)
            db.flush()  # get customer.id

            prediction = Prediction(
                customer_id=customer.id,
                churn_prob=churn_prob,
                risk_tier=tier,
                shap_json=json.dumps(shap_local),
                created_at=datetime.utcnow(),
            )
            db.add(prediction)
            created_count += 1

            if (i + 1) % 100 == 0:
                logger.info("  Seeded %d / %d", i + 1, n)
                db.commit()

        db.commit()
        logger.info("Done. Created %d customers.", created_count)

    except Exception:
        db.rollback()
        logger.exception("Seed failed — rolled back.")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed(500)