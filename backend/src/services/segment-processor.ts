import { UnrecoverableError } from "bullmq";
import { stat } from "node:fs/promises";
import { probeVideo } from "../lib/probe-video.ts";
import { prisma } from "../lib/prisma.ts";
import { detectSegment } from "./segment-detection.service.ts";

const startMismatchToleranceMs = () =>
  (Number(process.env.START_TIME_MISMATCH_MIN) || 5) * 60_000;

export type SegmentProcessorInput = {
  segmentId: string;
  filePath: string;
  startedAt: Date;
  cameraId: string;
};

export type SegmentProcessor = (input: SegmentProcessorInput) => Promise<void>;

// Plug point for Fatia G (the real vision service). Today: probe the file for
// duration/creation time (ffprobe, best-effort), then run the configured
// `Detector` (simulated by default) and turn its output into per-segment
// `DetectionInterval` rows. `finalizeRecordingDay` fuses those across segments
// into `Event`s once the whole batch is done.
export const processSegmentFile: SegmentProcessor = async ({
  segmentId,
  filePath,
  startedAt,
  cameraId,
}) => {
  const info = await stat(filePath).catch(() => null);
  if (!info || info.size === 0) {
    throw new UnrecoverableError("Stored file is missing or empty");
  }

  const probed = await probeVideo(filePath);

  let warning: string | null = null;
  if (probed.creationTime) {
    const diffMs = Math.abs(
      probed.creationTime.getTime() - startedAt.getTime(),
    );
    if (diffMs > startMismatchToleranceMs()) {
      warning = `O horário informado (${startedAt.toISOString()}) difere do registrado no arquivo (${probed.creationTime.toISOString()}). Confira.`;
    }
  }

  await prisma.segment.update({
    where: { id: segmentId },
    data: {
      durationSec:
        probed.durationSec !== null ? Math.round(probed.durationSec) : null,
      metadataStartedAt: probed.creationTime,
      warning,
    },
  });

  await detectSegment({
    segmentId,
    filePath,
    cameraId,
    durationSec: probed.durationSec,
  });
};
