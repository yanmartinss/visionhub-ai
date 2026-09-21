import z from "zod";

// ISO 8601 with an explicit offset (e.g. 2026-09-20T08:00:00-03:00) so the
// real recording time is never guessed from the server's timezone.
export const segmentStartedAtSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));
