from collections.abc import Iterator
from pathlib import Path

import cv2
import numpy as np

_FALLBACK_FPS = 25.0


class VideoOpenError(Exception):
    """O OpenCV não conseguiu abrir o arquivo (formato/codec não suportado)."""


def sample_frames(path: Path, interval_sec: float) -> Iterator[tuple[float, np.ndarray]]:
    """Gera (timeSec, frame BGR) a cada ~`interval_sec`, lendo o vídeo em streaming.

    Só um frame fica em memória por vez; os frames entre as amostras são descartados com
    `grab()` (sem decodificar para imagem).
    """
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        capture.release()
        raise VideoOpenError(f"cannot open video: {path.name}")
    try:
        fps = capture.get(cv2.CAP_PROP_FPS)
        if not fps or fps != fps or fps <= 0:  # 0, NaN ou negativo
            fps = _FALLBACK_FPS
        step = max(1, round(fps * interval_sec))
        index = 0
        while True:
            if not capture.grab():
                return
            if index % step == 0:
                ok, frame = capture.retrieve()
                if ok:
                    yield index / fps, frame
            index += 1
    finally:
        capture.release()
