"""Mapeia classes COCO do YOLO para os labels do contrato 3.1 (docs/agentes/README.md).

Só os labels derivados direto de uma classe COCO vivem aqui: `person`, `car` e `object`.
`gate_open`, `child_running` e `pet_waste` não são classes COCO e saem de heurísticas
próprias (ver `docs/agentes/README.md` §3.1).
"""

# Veículos que contam como "car" para a regra de estacionamento irregular.
_CAR_CLASSES = {"car", "motorcycle", "bus", "truck"}

# Objetos que alguém pode esquecer; é o que a regra de objeto abandonado procura.
_OBJECT_CLASSES = {"backpack", "handbag", "suitcase", "umbrella", "bottle", "sports ball"}


def label_for_class(class_name: str) -> str | None:
    """Devolve o label do contrato para a classe COCO, ou None se ela não interessa."""
    if class_name == "person":
        return "person"
    if class_name in _CAR_CLASSES:
        return "car"
    if class_name in _OBJECT_CLASSES:
        return "object"
    return None
