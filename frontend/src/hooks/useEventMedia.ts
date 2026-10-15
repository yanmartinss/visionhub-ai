import { useEffect, useState } from "react";
import { fetchEventMedia, type EventMediaKind } from "../lib/dashboard-api";

export type MediaState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "missing" }
  | { status: "error" };

// Loads an event's thumbnail/clip as an authenticated Blob and exposes an
// object URL (revoked on cleanup). With `enabled` false nothing is requested:
// clips are only fetched when the user presses play (the API logs each access).
export function useEventMedia(
  eventId: string,
  kind: EventMediaKind,
  enabled: boolean,
): MediaState {
  const [result, setResult] = useState<{
    key: string;
    state: MediaState;
  } | null>(null);
  const key = `${eventId}:${kind}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchEventMedia(eventId, kind)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setResult({ key, state: { status: "missing" } });
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setResult({ key, state: { status: "ready", url: objectUrl } });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, state: { status: "error" } });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eventId, kind, enabled, key]);

  if (!enabled) return { status: "idle" };
  return result?.key === key ? result.state : { status: "loading" };
}
