import os
from pathlib import Path


def _float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    return float(raw) if raw else default


# Mesmo diretório que o backend usa (STORAGE_DIR); no container fica montado em /storage.
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", "/storage")).resolve()

# Modelo YOLO (MVP: o menor, roda em CPU).
YOLO_MODEL = os.environ.get("YOLO_MODEL", "yolov8n.pt")

# Intervalo entre frames amostrados, em segundos (1–2 s, ver CLAUDE.md).
SAMPLE_INTERVAL_SEC = _float("SAMPLE_INTERVAL_SEC", 1.5)

# Confiança mínima das detecções do YOLO.
MIN_CONFIDENCE = _float("MIN_CONFIDENCE", 0.35)
