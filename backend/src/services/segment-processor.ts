import { UnrecoverableError } from "bullmq";
import { stat } from "node:fs/promises";

export type SegmentProcessorInput = {
  segmentId: string;
  filePath: string;
  startedAt: Date;
};

export type SegmentProcessor = (input: SegmentProcessorInput) => Promise<void>;

// Stub. Etapa 4 replaces this body with a call to the vision service
// (frame extraction + YOLO); the worker only depends on this signature.
export const processSegmentFile: SegmentProcessor = async ({ filePath }) => {
  const info = await stat(filePath).catch(() => null);
  if (!info || info.size === 0) {
    throw new UnrecoverableError("Stored file is missing or empty");
  }
};
