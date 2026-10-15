import { ApiError, apiFetch } from "./api";
import type { DaySummary } from "./types";

// `VITE_MOCK_SUMMARY=true` (in `.env.local`) serves a fixed summary until the
// backend ships `GET /recording-days/:id/summary`. Remove with the endpoint.
const USE_MOCK = import.meta.env.VITE_MOCK_SUMMARY === "true";

// `null` = the day has no summary yet (404), not an error.
export async function fetchDaySummary(
  recordingDayId: string,
): Promise<DaySummary | null> {
  if (USE_MOCK) {
    return {
      generatedText:
        "Resumo de exemplo: o dia foi monitorado sem interrupções. Houve 2 ocorrências de portão aberto por mais tempo que o limite, ambas já resolvidas, e 1 carro parado em área proibida ainda pendente.",
      createdAt: new Date().toISOString(),
    };
  }
  try {
    return await apiFetch<DaySummary>(`/recording-days/${recordingDayId}/summary`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
