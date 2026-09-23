export type InferredStartedAt = { date: string; time: string };

// Common DVR filename timestamp shapes:
//   ch01_20260920080000.mp4        (14 digits: YYYYMMDDHHMMSS)
//   ch01_20260920_080000.mp4       (8 digits, "_", 6 digits)
//   2026-09-20_08-00-00.mp4
//   2026-09-20 08.00.00.mp4
const PATTERNS: RegExp[] = [
  /(?<y>\d{4})(?<mo>\d{2})(?<d>\d{2})(?<h>\d{2})(?<mi>\d{2})(?<s>\d{2})/,
  /(?<y>\d{4})(?<mo>\d{2})(?<d>\d{2})[_-](?<h>\d{2})(?<mi>\d{2})(?<s>\d{2})/,
  /(?<y>\d{4})-(?<mo>\d{2})-(?<d>\d{2})[_ ](?<h>\d{2})[-.](?<mi>\d{2})[-.](?<s>\d{2})/,
];

const isValidComponents = (
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
) => {
  if (mo < 1 || mo > 12) return false;
  if (h > 23 || mi > 59 || s > 59) return false;
  // Rely on Date itself for day-of-month validity (handles leap years etc.):
  // an out-of-range day rolls over into the next month, which we can detect.
  const date = new Date(y, mo - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
  );
};

// Tries to read a recording's real start time from its filename. Returns
// `null` when no pattern matches or the extracted numbers aren't a valid
// date/time — the caller always leaves the field editable either way.
export const inferStartedAt = (filename: string): InferredStartedAt | null => {
  for (const pattern of PATTERNS) {
    const match = filename.match(pattern);
    if (!match?.groups) continue;

    const y = Number(match.groups.y);
    const mo = Number(match.groups.mo);
    const d = Number(match.groups.d);
    const h = Number(match.groups.h);
    const mi = Number(match.groups.mi);
    const s = Number(match.groups.s);

    if (y < 2000 || y > 2100) continue;
    if (!isValidComponents(y, mo, d, h, mi, s)) continue;

    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${y}-${pad(mo)}-${pad(d)}`,
      time: `${pad(h)}:${pad(mi)}`,
    };
  }
  return null;
};
