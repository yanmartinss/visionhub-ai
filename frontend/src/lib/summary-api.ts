import { ApiError, apiFetch } from "./api";
import type { DaySummary } from "./types";

// `null` = the day has no summary yet (404), not an error.
export async function fetchDaySummary(
  recordingDayId: string,
): Promise<DaySummary | null> {
  try {
    return await apiFetch<DaySummary>(`/recording-days/${recordingDayId}/summary`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
