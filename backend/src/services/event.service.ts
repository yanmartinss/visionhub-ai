import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";
import type { EventStatus } from "../../generated/prisma/client.ts";

export const updateEventStatus = async (
  eventId: string,
  status: EventStatus,
) => {
  const updated = await prisma.event.updateMany({
    where: { id: eventId },
    data: { status },
  });
  if (updated.count === 0) throw new AppError(404, "Event not found");

  return await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: {
      id: true,
      cameraId: true,
      type: true,
      status: true,
      technicalDescription: true,
      startedAt: true,
      endedAt: true,
      segmentId: true,
      occurredAt: true,
      confidence: true,
      thumbnailPath: true,
      clipPath: true,
      createdAt: true,
    },
  });
};
