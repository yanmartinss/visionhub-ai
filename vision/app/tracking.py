import math

# (cx, cy, altura) de uma pessoa, em coordenadas normalizadas.
Person = tuple[float, float, float]


class SpeedEstimator:
    """Casa pessoas entre amostras consecutivas (vizinho mais próximo, guloso) e estima a
    velocidade do centro em alturas-de-corpo por segundo. Sem identidade persistente: só o
    par (amostra anterior, atual) importa, o suficiente para a heurística de corrida."""

    def __init__(self, max_distance: float) -> None:
        self._max_distance = max_distance
        self._previous: list[Person] = []
        self._previous_time: float | None = None

    def update(self, time_sec: float, people: list[Person]) -> list[float | None]:
        """Devolve, para cada pessoa, a velocidade (None se não houve correspondência)."""
        speeds: list[float | None] = [None] * len(people)
        dt = None if self._previous_time is None else time_sec - self._previous_time
        if dt and dt > 0 and self._previous:
            pairs = sorted(
                (math.dist(cur[:2], prev[:2]), i, j)
                for i, cur in enumerate(people)
                for j, prev in enumerate(self._previous)
            )
            used_cur: set[int] = set()
            used_prev: set[int] = set()
            for distance, i, j in pairs:
                if distance > self._max_distance:
                    break
                if i in used_cur or j in used_prev:
                    continue
                used_cur.add(i)
                used_prev.add(j)
                height = max(people[i][2], 1e-6)
                speeds[i] = distance / dt / height
        self._previous = people
        self._previous_time = time_sec
        return speeds
