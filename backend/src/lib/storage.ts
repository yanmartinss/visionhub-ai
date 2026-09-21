import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_SEGMENT_BYTES = 5 * 1024 ** 3;

export const storageDir = () =>
  path.resolve(process.env.STORAGE_DIR || "storage");

export const uploadsDir = () => path.join(storageDir(), "uploads");

export const tmpDir = () => path.join(storageDir(), "tmp");

export const maxSegmentBytes = () =>
  Number(process.env.MAX_SEGMENT_SIZE_BYTES) || DEFAULT_MAX_SEGMENT_BYTES;

export const ensureStorageDirs = async () => {
  await mkdir(uploadsDir(), { recursive: true });
  await mkdir(tmpDir(), { recursive: true });
};

export const removeFile = async (filePath: string) => {
  await rm(filePath, { force: true }).catch(() => {});
};
