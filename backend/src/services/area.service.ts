import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";
import { findCameraById } from "./camera.service.ts";
import type { AreaTypeValue } from "../lib/event-types.ts";

type Point = { x: number; y: number };

const areaSelect = {
  id: true,
  cameraId: true,
  type: true,
  polygon: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const listAreasByCamera = async (cameraId: string) => {
  const camera = await findCameraById(cameraId);
  if (!camera) throw new AppError(404, "Camera not found");

  return await prisma.area.findMany({
    where: { cameraId },
    select: areaSelect,
    orderBy: { createdAt: "asc" },
  });
};

export const createArea = async (
  cameraId: string,
  type: AreaTypeValue,
  polygon: Point[],
) => {
  const camera = await findCameraById(cameraId);
  if (!camera) throw new AppError(404, "Camera not found");

  return await prisma.area.create({
    data: { cameraId, type, polygon },
    select: areaSelect,
  });
};

const findAreaById = (areaId: string) =>
  prisma.area.findUnique({ where: { id: areaId }, select: areaSelect });

export const updateArea = async (
  areaId: string,
  data: { type?: AreaTypeValue; polygon?: Point[] },
) => {
  const area = await findAreaById(areaId);
  if (!area) throw new AppError(404, "Area not found");

  return await prisma.area.update({
    where: { id: areaId },
    data,
    select: areaSelect,
  });
};

export const deleteArea = async (areaId: string) => {
  const area = await findAreaById(areaId);
  if (!area) throw new AppError(404, "Area not found");

  await prisma.area.delete({ where: { id: areaId } });
};
