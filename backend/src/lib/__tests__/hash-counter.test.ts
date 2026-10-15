import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { createHashCounter } from "../hash-counter.ts";

describe("createHashCounter", () => {
  it("computes sha256 and byte size", async () => {
    const input = "hello world";
    const expected = createHash("sha256").update(input).digest("hex");

    const { stream, digest, size } = createHashCounter();
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));

    await new Promise<void>((resolve, reject) => {
      Readable.from([Buffer.from(input)]).pipe(stream);
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });

    expect(digest()).toBe(expected);
    expect(size()).toBe(input.length);
    expect(Buffer.concat(chunks).toString()).toBe(input);
  });

  it("enforces maxBytes", async () => {
    const { stream } = createHashCounter({ maxBytes: 2 });
    const errPromise = new Promise<Error>((resolve) => {
      stream.on("error", resolve);
    });
    Readable.from([Buffer.from("abcd")]).pipe(stream);
    const err = await errPromise;
    expect(err).toBeTruthy();
  });
});
