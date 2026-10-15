import { apiFetch } from "./api";
import type {
  DashboardData,
  EventFilters,
  EventPage,
  EventStatus,
} from "./types";

// `VITE_MOCK_API=true` (in `.env.local`) serves the Fatia D endpoints from
// `mock-data.ts` until the backend ships them. The flag is replaced at build
// time, so the mock is left out of the bundle when it is off.
const USE_MOCK = import.meta.env.VITE_MOCK_API === "true";

export async function fetchDashboard(date?: string): Promise<DashboardData> {
  if (USE_MOCK) return (await import("./mock-data")).mockFetchDashboard(date);
  const query = date ? `?date=${date}` : "";
  return apiFetch<DashboardData>(`/dashboard${query}`);
}

export async function fetchEvents(filters: EventFilters): Promise<EventPage> {
  if (USE_MOCK) return (await import("./mock-data")).mockFetchEvents(filters);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<EventPage>(`/events${query}`);
}

export async function updateEventStatus(
  id: string,
  status: EventStatus,
): Promise<void> {
  if (USE_MOCK) {
    return (await import("./mock-data")).mockUpdateEventStatus(id, status);
  }
  await apiFetch(`/events/${id}`, { method: "PATCH", body: { status } });
}
