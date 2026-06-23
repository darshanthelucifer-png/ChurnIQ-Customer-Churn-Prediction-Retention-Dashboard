"""
Standalone training script. Run this before starting the API server.

Usage:
    cd backend
    python train.py
"""

import logging
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("train")

DATA_URL = (
    "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d"
    "/master/data/Telco-Customer-Churn.csv"
)

LOCAL_CSV = Path(__file__).parent / "telco_churn.csv"


def download_data() -> str:
    """Download the Telco dataset if not already cached locally."""
    if LOCAL_CSV.exists():
        logger.info("Using cached dataset: %s", LOCAL_CSV)
        return str(LOCAL_CSV)

    logger.info("Downloading dataset from GitHub...")
    import requests

    response = requests.get(DATA_URL, timeout=30)
    response.raise_for_status()
    LOCAL_CSV.write_bytes(response.content)
    logger.info("Dataset saved to %s (%d bytes)", LOCAL_CSV, LOCAL_CSV.stat().st_size)
    return str(LOCAL_CSV)


def main() -> None:
    csv_path = download_data()

    # Import here so sys.path adjustments in CI/CD don't matter
    sys.path.insert(0, str(Path(__file__).parent))
    from app.model import train_and_save

    meta = train_and_save(csv_path)

    logger.info("=" * 60)
    logger.info("Training complete!")
    logger.info("Best model  : %s", meta["best_model_name"])
    logger.info("ROC-AUC     : %.4f", meta["roc_auc"])
    logger.info("F1 Score    : %.4f", meta["f1"])
    logger.info("Recall      : %.4f", meta["recall"])
    logger.info("Precision   : %.4f", meta["precision"])
    logger.info("=" * 60)
    logger.info("Other model : %s", meta["other_model"]["name"])
    logger.info("  ROC-AUC   : %.4f", meta["other_model"]["roc_auc"])
    logger.info("  F1 Score  : %.4f", meta["other_model"]["f1"])
    logger.info("=" * 60)


if __name__ == "__main__":
    main()