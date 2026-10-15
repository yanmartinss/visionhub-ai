import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api";
import DaySummaryCard from "../DaySummaryCard";

const { fetchDaySummary } = vi.hoisted(() => ({ fetchDaySummary: vi.fn() }));
vi.mock("../../lib/summary-api", () => ({
  fetchDaySummary,
}));

describe("DaySummaryCard", () => {
  beforeEach(() => fetchDaySummary.mockClear());

  it("shows the generated text", async () => {
    fetchDaySummary.mockResolvedValue({
      generatedText: "Dia tranquilo.",
      createdAt: "2026-10-15T10:00:00Z",
    });
    render(<DaySummaryCard recordingDayId="d1" />);
    expect(await screen.findByText("Dia tranquilo.")).toBeInTheDocument();
  });

  it("explains when there is no summary yet", async () => {
    fetchDaySummary.mockResolvedValue(null);
    render(<DaySummaryCard recordingDayId="d1" />);
    expect(await screen.findByText(/ainda não está disponível/)).toBeInTheDocument();
  });

  it("shows an error message on failure", async () => {
    fetchDaySummary.mockImplementationOnce(async () => {
      throw new ApiError(500, "boom");
    });
    render(<DaySummaryCard recordingDayId="d1" />);
    expect(await screen.findByText(/Não foi possível/)).toBeInTheDocument();
  });
});
