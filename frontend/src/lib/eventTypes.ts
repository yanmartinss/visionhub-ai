import { formatDuration } from "./format";
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

// Types offered by the rule wizard (`other` is never triggered automatically).
export const WIZARD_EVENT_TYPES: EventType[] = EVENT_TYPES.filter(
  (type) => type !== "other",
);

// Plain-language copy used by the wizard and the monitoring list.
export const RULE_COPY: Record<
  EventType,
  { plain: string; areaHint: string | null }
> = {
  gateOpen: {
    plain: "Avisa se o portão ficar aberto tempo demais.",
    areaHint: null,
  },
  occupancy: {
    plain: "Avisa se alguém ficar parado numa área sensível por muito tempo.",
    areaHint:
      "Marque a área sensível (por exemplo, a porta da guarita) onde ficar parado é suspeito.",
  },
  restrictedArea: {
    plain: "Avisa se alguém entrar numa área restrita.",
    areaHint: "Marque no desenho a área onde ninguém deve entrar.",
  },
  abandonedObject: {
    plain: "Avisa se um objeto ficar abandonado por muito tempo.",
    areaHint: null,
  },
  illegalParking: {
    plain: "Avisa se um carro ficar parado num lugar proibido.",
    areaHint: "Marque no desenho onde é proibido estacionar.",
  },
  childRunning: {
    plain: "Avisa se uma criança correr no estacionamento.",
    areaHint:
      "Marque a área do estacionamento onde crianças não deveriam correr.",
  },
  petWaste: {
    plain: "Avisa se houver dejeto de animal fora da lixeira.",
    areaHint:
      "Marque onde ficam as lixeiras. Dejetos detectados fora dessas áreas geram o aviso.",
  },
  other: { plain: "", areaHint: null },
};

// Natural-language sentence for a configured rule, e.g.
// "Avisar quando o portão ficar aberto por mais de 3 min."
export function describeRule(
  type: EventType,
  timeLimitSeconds: number | null,
): string {
  const time = timeLimitSeconds
    ? formatDuration(timeLimitSeconds)
    : "o tempo definido";
  switch (type) {
    case "gateOpen":
      return `Avisar quando o portão ficar aberto por mais de ${time}.`;
    case "occupancy":
      return `Avisar quando alguém ficar parado na área sensível por mais de ${time}.`;
    case "restrictedArea":
      return "Avisar quando alguém entrar na área restrita.";
    case "abandonedObject":
      return `Avisar quando um objeto ficar abandonado por mais de ${time}.`;
    case "illegalParking":
      return `Avisar quando um carro ficar parado em área proibida por mais de ${time}.`;
    case "childRunning":
      return "Avisar quando uma criança correr no estacionamento.";
    case "petWaste":
      return "Avisar quando houver dejeto de animal fora da lixeira.";
    default:
      return EVENT_TYPE_INFO[type].label;
  }
}
