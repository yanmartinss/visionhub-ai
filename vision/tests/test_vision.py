from pathlib import Path

import cv2
import numpy as np
import pytest

from app.classes import label_for_class
from app.detector import RawBox, detect_video
from app.sampling import VideoOpenError, sample_frames


def make_video(path: Path, seconds: int = 6, fps: int = 10) -> Path:
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (64, 48))
    for _ in range(seconds * fps):
        writer.write(np.zeros((48, 64, 3), dtype=np.uint8))
    writer.release()
    return path


def test_label_mapping():
    assert label_for_class("person") == "person"
    assert label_for_class("truck") == "car"
    assert label_for_class("backpack") == "object"
    assert label_for_class("dog") is None


def test_sampling_interval(tmp_path):
    video = make_video(tmp_path / "v.mp4")
    times = [t for t, _ in sample_frames(video, 2.0)]
    assert times == pytest.approx([0.0, 2.0, 4.0])


def test_sampling_unreadable(tmp_path):
    bad = tmp_path / "bad.mp4"
    bad.write_bytes(b"not a video")
    with pytest.raises(VideoOpenError):
        list(sample_frames(bad, 1.0))


def test_detect_video_maps_filters_and_clamps(tmp_path):
    video = make_video(tmp_path / "v.mp4", seconds=2)

    def predict(_frame):
        return [
            RawBox("car", 0.9, 0.1, 0.2, 0.5, 0.6),
            RawBox("person", 0.1, 0, 0, 1, 1),  # abaixo da confiança mínima
            RawBox("dog", 0.9, 0, 0, 1, 1),  # classe ignorada
            RawBox("person", 0.8, -0.1, 0.5, 0.4, 1.2),  # fora do quadro: recortada
        ]

    out = detect_video(video, predict, interval_sec=1.0, min_confidence=0.35)
    assert len(out) == 4  # 2 amostras x 2 detecções válidas
    assert out[0]["label"] == "car"
    assert out[0]["box"]["width"] == pytest.approx(0.4)
    assert out[1]["box"] == {"x": 0.0, "y": 0.5, "width": 0.4, "height": 0.5}
    assert out[2]["timeSec"] == pytest.approx(1.0)
