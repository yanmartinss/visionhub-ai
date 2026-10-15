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

# Heurística de `child_running` (não existe classe COCO): pessoa de caixa pequena que se move
# rápido entre amostras. Altura normalizada máxima da caixa para contar como "criança".
CHILD_MAX_BOX_HEIGHT = _float("CHILD_MAX_BOX_HEIGHT", 0.35)

# Velocidade mínima do centro, em alturas-de-corpo por segundo (caminhar ~1, correr ~2,5).
RUN_SPEED_BODIES_PER_SEC = _float("RUN_SPEED_BODIES_PER_SEC", 1.8)

# Deslocamento máximo (normalizado) do centro entre amostras para considerar a mesma pessoa.
TRACK_MAX_DISTANCE = _float("TRACK_MAX_DISTANCE", 0.3)
