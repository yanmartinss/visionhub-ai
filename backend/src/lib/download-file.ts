import dns from "node:dns";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { AppError } from "./app-error.ts";
import { createHashCounter } from "./hash-counter.ts";
import { isPrivateIp } from "./is-private-ip.ts";
import {
  ensureStorageDirs,
  maxSegmentBytes,
  removeFile,
  tmpDir,
} from "./storage.ts";
import { validateLinkUrl } from "./validate-link-url.ts";

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

const connectTimeoutMs = () =>
  Number(process.env.DOWNLOAD_CONNECT_TIMEOUT_MS) || 15_000;
const idleTimeoutMs = () =>
  Number(process.env.DOWNLOAD_IDLE_TIMEOUT_MS) || 60_000;

// `retryable` tells the worker whether trying again can help. Messages are
// short and safe to show to users (they end up in `segments.error`).
export class DownloadError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "DownloadError";
    this.retryable = retryable;
  }
}

export type DownloadedFile = { tmpPath: string; hash: string; size: number };

const validateHop = (rawUrl: string): URL => {
  let url: URL;
  try {
    url = validateLinkUrl(rawUrl);
  } catch (err) {
    if (err instanceof AppError) throw new DownloadError(err.message, false);
    throw err;
  }

  // Literal IPs skip DNS, so they never reach the guarded lookup below.
  const literalHost = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(literalHost) && isPrivateIp(literalHost)) {
    throw new DownloadError("Link resolves to a private address", false);
  }
  return url;
};

// The address checked here is the one the socket connects to, which closes
// the DNS-rebinding gap a separate "resolve, then fetch" check would leave.
const guardedLookup = (
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | dns.LookupAddress[],
    family?: number,
  ) => void,
) => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err, "");

    const addresses: dns.LookupAddress[] = Array.isArray(address)
      ? address
      : [{ address, family: family ?? 0 }];
    if (addresses.some((entry) => isPrivateIp(entry.address))) {
      return callback(
        new DownloadError("Link resolves to a private address", false),
        "",
      );
    }
    if (Array.isArray(address)) return callback(null, address);
    callback(null, address, family);
  });
};

const requestOnce = (url: URL) =>
  new Promise<IncomingMessage>((resolve, reject) => {
    const request = https.get(
      url,
      {
        lookup: guardedLookup,
        headers: { "User-Agent": "VisionHub-AI/1.0", Accept: "*/*" },
      },
      resolve,
    );

    request.setTimeout(idleTimeoutMs(), () =>
      request.destroy(new DownloadError("Download timed out", true)),
    );
    request.on("socket", (socket) => {
      if (!socket.connecting) return;
      const timer = setTimeout(
        () => request.destroy(new DownloadError("Connection timed out", true)),
        connectTimeoutMs(),
      );
      socket.once("connect", () => clearTimeout(timer));
      request.once("close", () => clearTimeout(timer));
    });
    request.on("error", (err) =>
      reject(
        err instanceof DownloadError
          ? err
          : new DownloadError("Could not connect to the link", true),
      ),
    );
  });

const saveResponse = async (response: IncomingMessage) => {
  const contentType = String(response.headers["content-type"] ?? "");
  if (contentType.toLowerCase().startsWith("text/html")) {
    response.resume();
    throw new DownloadError("Link is not a direct file download", false);
  }

  const maxBytes = maxSegmentBytes();
  const tooLarge = () =>
    new DownloadError("File exceeds the maximum allowed size", false);
  const declaredLength = Number(response.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    response.resume();
    throw tooLarge();
  }

  await ensureStorageDirs();
  const tmpPath = path.join(tmpDir(), `${randomUUID()}.part`);
  const counter = createHashCounter({ maxBytes, limitError: tooLarge });

  try {
    await pipeline(response, counter.stream, createWriteStream(tmpPath));
  } catch (err) {
    await removeFile(tmpPath);
    if (err instanceof DownloadError) throw err;
    throw new DownloadError("Download interrupted", true);
  }

  if (counter.size() === 0) {
    await removeFile(tmpPath);
    throw new DownloadError("Downloaded file is empty", false);
  }
  return { tmpPath, hash: counter.digest(), size: counter.size() };
};

// Streams a recording from a public https link to `storage/tmp/`. Every hop
// (including redirects) must be https, on the allowlist and resolve to a
// public address; the body is never held in memory.
export const downloadFile = async (rawUrl: string): Promise<DownloadedFile> => {
  let url = validateHop(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await requestOnce(url);
    const status = response.statusCode ?? 0;

    if (REDIRECT_STATUSES.includes(status)) {
      response.resume();
      const location = response.headers.location;
      if (!location) {
        throw new DownloadError("Redirect without a location", false);
      }
      let next: string;
      try {
        next = new URL(location, url).toString();
      } catch {
        throw new DownloadError("Invalid redirect location", false);
      }
      url = validateHop(next);
      continue;
    }

    if (status !== 200) {
      response.resume();
      const retryable = status >= 500 || status === 429 || status === 408;
      throw new DownloadError(`Download failed (HTTP ${status})`, retryable);
    }

    return await saveResponse(response);
  }

  throw new DownloadError("Too many redirects", false);
};
