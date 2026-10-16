"""Compara o detector `python` (serviço de visão) com o detector simulado (JSON) num segmento.

Só biblioteca padrão. Uso (serviço no ar, vídeo e fixture dentro de STORAGE_DIR):

    python vision/scripts/compare_detectors.py <segmentId> [--url http://localhost:8000]
        [--storage backend/storage] [--file uploads/<segmentId>] [--gap 3]

A fixture simulada é `<storage>/uploads/<segmentId>.json` (mesmo formato de
`backend/fixtures/example-detections.json`). Sem fixture, só imprime o lado `python`.
"""

import argparse
import json
import urllib.request
from collections import defaultdict
from pathlib import Path


def intervals(detections: list[dict], gap: float) -> dict[str, list[tuple[float, float]]]:
    """Funde detecções do mesmo label em intervalos (mesma ideia do Passo A do backend)."""
    times: dict[str, list[float]] = defaultdict(list)
    for item in detections:
        times[item["label"]].append(item["timeSec"])
    merged: dict[str, list[tuple[float, float]]] = {}
    for label, values in times.items():
        values.sort()
        start = end = values[0]
        out: list[tuple[float, float]] = []
        for t in values[1:]:
            if t - end <= gap:
                end = t
            else:
                out.append((start, end))
                start = end = t
        out.append((start, end))
        merged[label] = out
    return merged


def overlap(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> float:
    return sum(
        max(0.0, min(x1, y1) - max(x0, y0)) for x0, x1 in a for y0, y1 in b
    )


def total(spans: list[tuple[float, float]]) -> float:
    return sum(end - start for start, end in spans)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("segment_id")
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--storage", default="backend/storage")
    parser.add_argument("--file", help="caminho do vídeo relativo ao storage (default uploads/<id>)")
    parser.add_argument("--gap", type=float, default=3.0, help="tolerância de fusão (s)")
    args = parser.parse_args()

    file_path = args.file or f"uploads/{args.segment_id}"
    request = urllib.request.Request(
        f"{args.url.rstrip('/')}/detect",
        data=json.dumps({"segmentId": args.segment_id, "filePath": file_path}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=3600) as response:
        python_detections = json.load(response)["detections"]

    fixture = Path(args.storage) / "uploads" / f"{args.segment_id}.json"
    simulated = json.loads(fixture.read_text("utf-8")) if fixture.is_file() else []
    if not simulated:
        print(f"(sem fixture simulada em {fixture})")

    py, sim = intervals(python_detections, args.gap), intervals(simulated, args.gap)
    print(f"{'label':<14}{'python':>8}{'simulado':>10}{'seg py':>9}{'seg sim':>9}{'sobrepos.':>11}")
    for label in sorted(set(py) | set(sim)):
        p, s = py.get(label, []), sim.get(label, [])
        print(
            f"{label:<14}{len(p):>8}{len(s):>10}{total(p):>9.1f}{total(s):>9.1f}"
            f"{overlap(p, s):>11.1f}"
        )
    print("\nintervalos do python:")
    for label, spans in sorted(py.items()):
        print(f"  {label}: " + ", ".join(f"{a:.1f}-{b:.1f}s" for a, b in spans))


if __name__ == "__main__":
    main()
