import { AppError } from "./app-error.ts";

const allowedDomains = () =>
  (process.env.ALLOWED_LINK_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

export const validateLinkUrl = (raw: string): URL => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError(400, "Invalid link URL");
  }

  if (url.protocol !== "https:") {
    throw new AppError(400, "Link must use https");
  }
  if (url.username || url.password) {
    throw new AppError(400, "Link must not contain credentials");
  }

  const host = url.hostname.toLowerCase();
  const allowed = allowedDomains().some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
  if (!allowed) throw new AppError(400, "Link domain not allowed");

  return url;
};
