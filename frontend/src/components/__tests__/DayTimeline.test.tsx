import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DayTimeline from "../DayTimeline";
import type { DetectedEvent } from "../../lib/types";

vi.mock("../../hooks/useEventMedia", () => ({
  useEventMedia: () => ({ status: "idle" }),
}));

function event(id: string, occurredAt: string): DetectedEvent {
  return {
    id,
    cameraId: "c1",
    type: "gateOpen",
    status: "pending",
    technicalDescription: null,
    startedAt: occurredAt,
    endedAt: null,
    segmentId: null,
    occurredAt,
    confidence: 0.9,
    thumbnailPath: null,
    clipPath: null,
    createdAt: occurredAt,
  };
}

describe("DayTimeline", () => {
  it("renders nothing without events", () => {
    const { container } = render(<DayTimeline events={[]} onOpen={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens the event when a row is clicked", () => {
    const onOpen = vi.fn();
    render(
      <DayTimeline
        events={[event("late", "2026-10-15T20:00:00Z"), event("early", "2026-10-15T09:00:00Z")]}
        onOpen={onOpen}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    fireEvent.click(rows[0].querySelector("button")!);
    expect(onOpen).toHaveBeenCalledWith("early");
  });
});
