import path from "node:path";
import { storageDir } from "./storage.ts";

const DEFAULT_MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 ** 2;

export const cameraImagesDir = () => path.join(storageDir(), "camera-images");

export const maxReferenceImageBytes = () =>
  Number(process.env.MAX_REFERENCE_IMAGE_BYTES) ||
  DEFAULT_MAX_REFERENCE_IMAGE_BYTES;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const extensionForImageMime = (mimeType: string) =>
  EXTENSION_BY_MIME[mimeType] ?? null;
