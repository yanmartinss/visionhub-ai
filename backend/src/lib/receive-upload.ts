import busboy from "busboy";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { AppError } from "./app-error.ts";
import { createHashCounter } from "./hash-counter.ts";
import {
  ensureStorageDirs,
  maxSegmentBytes,
  removeFile,
  tmpDir,
} from "./storage.ts";

export type ReceivedUpload = {
  tmpPath: string;
  hash: string;
  size: number;
  extension: string;
  originalName: string;
  fields: Record<string, string>;
};

type ReceivedFile = Omit<ReceivedUpload, "fields">;

const safeExtension = (filename: string) => {
  const extension = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : "";
};

export const discardUpload = (upload: ReceivedUpload) =>
  removeFile(upload.tmpPath);

// Streams the multipart body straight to disk (never buffers the file in memory)
// while hashing it. On any failure the partial file is removed.
export const receiveUpload = async (req: Request): Promise<ReceivedUpload> => {
  await ensureStorageDirs();

  return new Promise((resolve, reject) => {
    let parser: busboy.Busboy;
    try {
      parser = busboy({
        headers: req.headers,
        defParamCharset: "utf8",
        limits: { files: 1, fields: 10, fileSize: maxSegmentBytes() },
      });
    } catch {
      return reject(new AppError(400, "Expected multipart/form-data"));
    }

    const fields: Record<string, string> = {};
    let file: ReceivedFile | null = null;
    let fileDone: Promise<void> = Promise.resolve();
    let tmpPath: string | null = null;
    let writeStream: ReturnType<typeof createWriteStream> | null = null;
    let settled = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      req.unpipe(parser);
      writeStream?.destroy();
      if (tmpPath) void removeFile(tmpPath);
      reject(err);
    };

    parser.on("field", (name, value) => {
      fields[name] = value;
    });

    parser.on("file", (name, stream, info) => {
      if (name !== "file" || !info.filename || file || tmpPath) {
        stream.resume();
        return;
      }

      const currentPath = path.join(tmpDir(), `${randomUUID()}.part`);
      tmpPath = currentPath;
      writeStream = createWriteStream(currentPath);

      const counter = createHashCounter();

      stream.on("limit", () =>
        fail(new AppError(413, "File exceeds the maximum allowed size")),
      );

      fileDone = pipeline(stream, counter.stream, writeStream).then(() => {
        file = {
          tmpPath: currentPath,
          hash: counter.digest(),
          size: counter.size(),
          extension: safeExtension(info.filename),
          originalName: info.filename,
        };
      });
      fileDone.catch(fail);
    });

    parser.on("error", fail);
    // A client that disconnects mid-upload surfaces as an "aborted" error.
    req.on("error", () => fail(new AppError(400, "Upload interrupted")));
    req.on("close", () => {
      if (!req.complete) fail(new AppError(400, "Upload interrupted"));
    });

    parser.on("close", async () => {
      if (settled) return;
      try {
        await fileDone;
        if (settled) return;
        if (!file) throw new AppError(400, "File is required");
        if (file.size === 0) throw new AppError(400, "File is empty");
        settled = true;
        resolve({ ...file, fields });
      } catch (err) {
        fail(err);
      }
    });

    req.pipe(parser);
  });
};
