import { apiFetch } from "./api";
import type { AccuracyFilters, AccuracyReport } from "./types";

// Admin only; the API answers 403 to the other roles.
export function fetchAccuracy(
  filters: AccuracyFilters = {},
): Promise<AccuracyReport> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<AccuracyReport>(`/stats/accuracy${query}`);
}
