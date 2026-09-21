import { createHash } from "node:crypto";
import { Transform } from "node:stream";

type HashCounterOptions = {
  maxBytes?: number;
  // Error to raise when the stream passes `maxBytes`.
  limitError?: () => Error;
};

// Pass-through stream that computes a SHA-256 and counts bytes while a file
// is being written, so large videos are never read a second time.
export const createHashCounter = (options: HashCounterOptions = {}) => {
  const hash = createHash("sha256");
  let size = 0;

  const stream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      if (options.maxBytes !== undefined && size > options.maxBytes) {
        return callback(
          options.limitError?.() ?? new Error("Size limit exceeded"),
        );
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  return { stream, digest: () => hash.digest("hex"), size: () => size };
};
