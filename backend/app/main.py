"""
FastAPI application entry point.
Configures CORS, mounts all routers, and loads the ML model at startup.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.model import predictor
from app.routers import analytics, customers, predictions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize DB schema and load ML model on startup."""
    logger.info("Starting ChurnIQ API...")
    init_db()
    try:
        predictor.load()
        logger.info("ML model loaded successfully.")
    except FileNotFoundError as exc:
        logger.warning("Model file not found: %s — run train.py first.", exc)
    yield
    logger.info("Shutting down ChurnIQ API.")


app = FastAPI(
    title="ChurnIQ API",
    description="Customer churn prediction and retention analytics backend.",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(customers.router)
app.include_router(predictions.router)
app.include_router(analytics.router)


@app.get("/health", tags=["health"])
def health_check() -> dict:
    """Simple liveness probe."""
    return {
        "status": "ok",
        "model_loaded": predictor.pipeline is not None,
    }