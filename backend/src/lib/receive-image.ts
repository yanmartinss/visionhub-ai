import busboy from "busboy";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { AppError } from "./app-error.ts";
import {
  cameraImagesDir,
  extensionForImageMime,
  maxReferenceImageBytes,
} from "./camera-images.ts";
import { ensureDir, removeFile, tmpDir } from "./storage.ts";

export type ReceivedImage = { tmpPath: string; extension: string };

// Small synchronous multipart receiver for reference images (a few MB, no
// hashing/idempotency needed — unlike recording segments, which go through
// the queue in `lib/receive-upload.ts`).
export const receiveImage = async (req: Request): Promise<ReceivedImage> => {
  await ensureDir(tmpDir());
  await ensureDir(cameraImagesDir());

  return new Promise((resolve, reject) => {
    let parser: busboy.Busboy;
    try {
      parser = busboy({
        headers: req.headers,
        limits: { files: 1, fields: 0, fileSize: maxReferenceImageBytes() },
      });
    } catch {
      return reject(new AppError(400, "Expected multipart/form-data"));
    }

    let tmpPath: string | null = null;
    let writeStream: ReturnType<typeof createWriteStream> | null = null;
    let fileDone: Promise<ReceivedImage> | null = null;
    let settled = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      req.unpipe(parser);
      writeStream?.destroy();
      if (tmpPath) void removeFile(tmpPath);
      reject(err);
    };

    parser.on("file", (name, stream, info) => {
      if (name !== "image" || tmpPath) {
        stream.resume();
        return;
      }

      const extension = extensionForImageMime(info.mimeType);
      if (!extension) {
        stream.resume();
        fail(new AppError(400, "Only JPEG, PNG or WebP images are accepted"));
        return;
      }

      const currentPath = path.join(tmpDir(), `${randomUUID()}.part`);
      tmpPath = currentPath;
      writeStream = createWriteStream(currentPath);

      stream.on("limit", () =>
        fail(new AppError(413, "Image exceeds the maximum allowed size")),
      );

      fileDone = pipeline(stream, writeStream).then(() => ({
        tmpPath: currentPath,
        extension,
      }));
      fileDone.catch(fail);
    });

    parser.on("error", fail);
    req.on("error", () => fail(new AppError(400, "Upload interrupted")));
    req.on("close", () => {
      if (!req.complete) fail(new AppError(400, "Upload interrupted"));
    });

    parser.on("close", async () => {
      if (settled) return;
      try {
        if (!fileDone) throw new AppError(400, "Image is required");
        const file = await fileDone;
        if (settled) return;
        settled = true;
        resolve(file);
      } catch (err) {
        fail(err);
      }
    });

    req.pipe(parser);
  });
};

export const discardImage = (image: ReceivedImage) => removeFile(image.tmpPath);
