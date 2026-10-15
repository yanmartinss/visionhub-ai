import { ApiError, apiFetch, apiFetchBlob } from "./api";
import type {
  DashboardData,
  EventDetail,
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

export function fetchEventDetail(id: string): Promise<EventDetail> {
  return apiFetch<EventDetail>(`/events/${id}`);
}

export type EventMediaKind = "clip" | "thumbnail";

// 404 ("Media not found") just means there is no media yet or retention
// removed it, so it is `null` rather than an error. Clip requests are logged
// by the API (LGPD): call this only when the user asks to watch.
export async function fetchEventMedia(
  id: string,
  kind: EventMediaKind,
): Promise<Blob | null> {
  try {
    return await apiFetchBlob(`/events/${id}/${kind}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
