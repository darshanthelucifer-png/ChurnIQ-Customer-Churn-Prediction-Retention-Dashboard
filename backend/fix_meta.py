"""
One-time script: sanitize model_meta.json to remove inf/nan values.
Run once after training, before starting the API server.
"""
import json
import math
from pathlib import Path

META_PATH = Path(__file__).parent / "model_meta.json"


def sanitize(obj):
    """Recursively replace inf/nan floats with None throughout nested structure."""
    if isinstance(obj, float):
        return None if not math.isfinite(obj) else obj
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    return obj


def main():
    print(f"Reading  : {META_PATH}")
    with open(META_PATH) as f:
        meta = json.load(f)

    clean = sanitize(meta)

    # Verify no inf/nan remains
    serialized = json.dumps(clean)
    print(f"Verified : JSON serialization successful ({len(serialized):,} bytes)")

    with open(META_PATH, "w") as f:
        json.dump(clean, f, indent=2)

    print("Done     : model_meta.json sanitized.")

    # Show threshold range for confirmation
    thresholds = clean.get("thresholds", [])
    valid = [t for t in thresholds if t is not None]
    print(f"Thresholds: {len(thresholds)} total | "
          f"{len(thresholds) - len(valid)} null values | "
          f"range [{min(valid):.4f}, {max(valid):.4f}]")


if __name__ == "__main__":
    main()