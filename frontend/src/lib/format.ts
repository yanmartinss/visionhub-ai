// `RecordingDay.date` is a calendar day stored as midnight UTC: it must be
// formatted in UTC or it shifts to the previous day in Brazil (UTC-3).
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

// `<input type="datetime-local">` gives "2026-09-20T08:00" in the browser's
// timezone; the API wants an ISO 8601 instant with an explicit offset.
export function toApiDateTime(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString();
}

// YYYY-MM-DD in the browser's timezone (what a person means by "today").
export function todayLocalDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// The API day (midnight UTC) as YYYY-MM-DD, for form defaults.
export function dayToInputDate(iso: string): string {
  return iso.slice(0, 10);
}
