import { apiFetch } from "./api";
import type {
  DashboardData,
  EventFilters,
  EventPage,
  EventStatus,
} from "./types";

export function fetchDashboard(date?: string): Promise<DashboardData> {
  const query = date ? `?date=${date}` : "";
  return apiFetch<DashboardData>(`/dashboard${query}`);
}

export function fetchEvents(filters: EventFilters): Promise<EventPage> {
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
  await apiFetch(`/events/${id}`, { method: "PATCH", body: { status } });
}
