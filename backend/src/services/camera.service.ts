import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";

export const addCamera = async (name: string, location: string) => {
  return await prisma.camera.create({
    data: {
      name,
      location,
    },
  });
};

export const listCameras = async () => {
  return await prisma.camera.findMany({
    select: { id: true, name: true, location: true, active: true },
  });
};

export const findCameraById = async (cameraId: string) => {
  return await prisma.camera.findUnique({
    where: { id: cameraId },
  });
};

export const reactivateCamera = async (cameraId: string) => {
  const findCamera = await findCameraById(cameraId);
  if (!findCamera) throw new AppError(404, "Camera not found");

  return await prisma.camera.update({
    where: { id: cameraId },
    data: { active: true },
    select: { id: true, name: true, location: true, active: true },
  });
};

export const deactivateCamera = async (cameraId: string) => {
  const findCamera = await findCameraById(cameraId);
  if (!findCamera) throw new AppError(404, "Camera not found");

  return await prisma.camera.update({
    where: { id: cameraId },
    data: { active: false },
    select: { id: true, name: true, location: true, active: true },
  });
};

export const updateCamera = async (
  cameraId: string,
  name: string,
  location: string,
) => {
  const findCamera = await findCameraById(cameraId);
  if (!findCamera) throw new AppError(404, "Camera not found");
  const updatedCamera = await prisma.camera.update({
    where: { id: cameraId },
    data: { name, location },
    select: {
      id: true,
      name: true,
      location: true,
      active: true,
      updatedAt: true,
    },
  });
  return updatedCamera;
};
