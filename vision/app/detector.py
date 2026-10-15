from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import config
from .classes import label_for_class
from .sampling import sample_frames


@dataclass(frozen=True)
class RawBox:
    """Uma caixa crua do modelo: classe COCO, confiança e xyxy normalizado [0,1]."""

    class_name: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float


# Recebe um frame BGR e devolve as caixas cruas. Separado do YOLO para testar sem o modelo.
Predictor = Callable[[np.ndarray], Iterable[RawBox]]


def _clamp(value: float) -> float:
    return min(1.0, max(0.0, value))


def detect_video(
    path: Path,
    predict: Predictor,
    interval_sec: float = config.SAMPLE_INTERVAL_SEC,
    min_confidence: float = config.MIN_CONFIDENCE,
) -> list[dict]:
    """Amostra o vídeo, roda o modelo e devolve `Detection[]` do contrato 3.1."""
    detections: list[dict] = []
    for time_sec, frame in sample_frames(path, interval_sec):
        for raw in predict(frame):
            label = label_for_class(raw.class_name)
            if label is None or raw.confidence < min_confidence:
                continue
            x1, y1, x2, y2 = _clamp(raw.x1), _clamp(raw.y1), _clamp(raw.x2), _clamp(raw.y2)
            if x2 <= x1 or y2 <= y1:
                continue
            detections.append(
                {
                    "label": label,
                    "box": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
                    "confidence": min(1.0, raw.confidence),
                    "timeSec": time_sec,
                }
            )
    return detections


_model = None


def yolo_predictor() -> Predictor:
    """Carrega o YOLO uma vez (lazy: o import do ultralytics é pesado) e devolve o predictor."""
    global _model
    if _model is None:
        from ultralytics import YOLO

        _model = YOLO(config.YOLO_MODEL)
    model = _model

    def predict(frame: np.ndarray) -> list[RawBox]:
        result = model.predict(frame, conf=config.MIN_CONFIDENCE, verbose=False)[0]
        names = result.names
        boxes = result.boxes
        out: list[RawBox] = []
        for cls, conf, xyxyn in zip(
            boxes.cls.tolist(), boxes.conf.tolist(), boxes.xyxyn.tolist(), strict=True
        ):
            x1, y1, x2, y2 = xyxyn
            out.append(RawBox(names[int(cls)], float(conf), x1, y1, x2, y2))
        return out

    return predict
