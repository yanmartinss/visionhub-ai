export const EVENT_TYPES = [
  "gateOpen",
  "occupancy",
  "restrictedArea",
  "abandonedObject",
  "illegalParking",
  "childRunning",
  "petWaste",
  "other",
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number];

export const AREA_TYPES = [
  "restricted",
  "sensitive",
  "noParking",
  "parkingLot",
  "trash",
] as const;

export type AreaTypeValue = (typeof AREA_TYPES)[number];

export type Containment = "inside" | "outside" | null;

// Single source of truth for what a rule of each event type needs: a matching
// area on the camera, and/or a time limit. `Rule` has no FK to `Area` — the
// two are linked only by this shared `areaType`, matched at detection time.
//
// `detectionLabel`/`containment` are the detector-facing half of the same
// contract: which raw label a `Detector` (simulated or real) must emit, and
// whether a detection only counts when its center point falls inside or
// outside an area of `areaType` on the same camera. `containment: null` means
// the whole camera counts (no area needed). `detectionLabel: null` (`other`)
// means this event type is never triggered automatically.
export const EVENT_TYPE_REQUIREMENTS: Record<
  EventTypeValue,
  {
    areaType: AreaTypeValue | null;
    requiresTimeLimit: boolean;
    detectionLabel: string | null;
    containment: Containment;
  }
> = {
  gateOpen: {
    areaType: null,
    requiresTimeLimit: true,
    detectionLabel: "gate_open",
    containment: null,
  },
  occupancy: {
    areaType: "sensitive",
    requiresTimeLimit: true,
    detectionLabel: "person",
    containment: "inside",
  },
  restrictedArea: {
    areaType: "restricted",
    requiresTimeLimit: false,
    detectionLabel: "person",
    containment: "inside",
  },
  abandonedObject: {
    areaType: null,
    requiresTimeLimit: true,
    detectionLabel: "object",
    containment: null,
  },
  illegalParking: {
    areaType: "noParking",
    requiresTimeLimit: true,
    detectionLabel: "car",
    containment: "inside",
  },
  childRunning: {
    areaType: "parkingLot",
    requiresTimeLimit: false,
    detectionLabel: "child_running",
    containment: "inside",
  },
  petWaste: {
    areaType: "trash",
    requiresTimeLimit: false,
    detectionLabel: "pet_waste",
    containment: "outside",
  },
  other: {
    areaType: null,
    requiresTimeLimit: false,
    detectionLabel: null,
    containment: null,
  },
};
