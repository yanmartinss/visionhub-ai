from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import config
from .detector import detect_video, yolo_predictor
from .sampling import VideoOpenError

app = FastAPI(title="VisionHub vision service")


class Box(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Detection(BaseModel):
    label: str
    box: Box
    confidence: float = Field(ge=0, le=1)
    timeSec: float = Field(ge=0)


class DetectRequest(BaseModel):
    segmentId: str
    # Relativo a STORAGE_DIR (contrato 3.1 em docs/agentes/README.md).
    filePath: str


class DetectResponse(BaseModel):
    detections: list[Detection]


def resolve_video_path(file_path: str) -> Path:
    """Resolve `file_path` dentro de STORAGE_DIR, recusando qualquer saída dele."""
    root = config.STORAGE_DIR
    candidate = (root / file_path).resolve()
    if not candidate.is_relative_to(root):
        raise HTTPException(status_code=400, detail="filePath outside storage")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="video file not found")
    return candidate


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": config.YOLO_MODEL}


@app.post("/detect", response_model=DetectResponse)
def detect(request: DetectRequest) -> DetectResponse:
    path = resolve_video_path(request.filePath)
    try:
        detections = detect_video(path, yolo_predictor())
    except VideoOpenError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return DetectResponse(detections=[Detection(**item) for item in detections])
