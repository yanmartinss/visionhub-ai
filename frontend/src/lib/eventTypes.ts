import type { AreaType, EventType } from "./types";

// Mirrors backend/src/lib/event-types.ts. Duplicated on purpose: the two
// apps don't share a package in this project.
export const EVENT_TYPES: EventType[] = [
  "gateOpen",
  "occupancy",
  "restrictedArea",
  "abandonedObject",
  "illegalParking",
  "childRunning",
  "petWaste",
  "other",
];

export const AREA_TYPES: AreaType[] = [
  "restricted",
  "sensitive",
  "noParking",
  "parkingLot",
  "trash",
];

export const EVENT_TYPE_INFO: Record<
  EventType,
  {
    label: string;
    description: string;
    areaType: AreaType | null;
    requiresTimeLimit: boolean;
  }
> = {
  gateOpen: {
    label: "Portão aberto",
    description: "Portão detectado aberto por mais tempo que o limite.",
    areaType: null,
    requiresTimeLimit: true,
  },
  occupancy: {
    label: "Permanência suspeita",
    description:
      "Pessoa parada numa área sensível por mais tempo que o limite.",
    areaType: "sensitive",
    requiresTimeLimit: true,
  },
  restrictedArea: {
    label: "Acesso a área restrita",
    description: "Qualquer detecção dentro de uma área restrita.",
    areaType: "restricted",
    requiresTimeLimit: false,
  },
  abandonedObject: {
    label: "Objeto abandonado",
    description:
      "Objeto parado, sem dono aparente, por mais tempo que o limite.",
    areaType: null,
    requiresTimeLimit: true,
  },
  illegalParking: {
    label: "Carro em local inapropriado",
    description:
      'Veículo parado numa área de "proibido estacionar" por mais tempo que o limite.',
    areaType: "noParking",
    requiresTimeLimit: true,
  },
  childRunning: {
    label: "Criança correndo",
    description:
      "Criança em movimento rápido dentro de uma área de estacionamento.",
    areaType: "parkingLot",
    requiresTimeLimit: false,
  },
  petWaste: {
    label: "Necessidade de animal não recolhida",
    description: "Dejeto detectado fora de uma área de lixeira.",
    areaType: "trash",
    requiresTimeLimit: false,
  },
  other: {
    label: "Outro",
    description: "Evento sem regra específica.",
    areaType: null,
    requiresTimeLimit: false,
  },
};

export const AREA_TYPE_INFO: Record<
  AreaType,
  { label: string; color: string }
> = {
  restricted: { label: "Restrita", color: "#dc2626" },
  sensitive: { label: "Sensível", color: "#2563eb" },
  noParking: { label: "Proibido estacionar", color: "#d97706" },
  parkingLot: { label: "Estacionamento", color: "#7c3aed" },
  trash: { label: "Lixeira", color: "#059669" },
};
