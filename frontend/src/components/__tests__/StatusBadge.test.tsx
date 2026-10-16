import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DayStatusBadge,
  EventStatusBadge,
  EventTypeBadge,
  SegmentStatusBadge,
} from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders day status labels", () => {
    render(<DayStatusBadge status="completed" />);
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });

  it("renders segment status labels", () => {
    render(<SegmentStatusBadge status="failed" />);
    expect(screen.getByText("Falhou")).toBeInTheDocument();
  });

  it("renders event status labels", () => {
    render(<EventStatusBadge status="inProgress" />);
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });

  it("renders the false positive status", () => {
    render(<EventStatusBadge status="falsePositive" />);
    expect(screen.getByText("Falso positivo")).toBeInTheDocument();
  });

  it("renders event type labels", () => {
    render(<EventTypeBadge type="petWaste" />);
    expect(screen.getByText("Necessidade de animal não recolhida")).toBeInTheDocument();
  });
});