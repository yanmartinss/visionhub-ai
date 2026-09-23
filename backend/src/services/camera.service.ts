import { rename } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../lib/app-error.ts";
import { cameraImagesDir } from "../lib/camera-images.ts";
import { prisma } from "../lib/prisma.ts";
import type { ReceivedImage } from "../lib/receive-image.ts";
import { removeFile } from "../lib/storage.ts";

const cameraSelect = {
  id: true,
  name: true,
  location: true,
  active: true,
  referenceImagePath: true,
} as const;

// `referenceImagePath` is an internal disk path; every response replaces it
// with a boolean and serves the bytes through `GET /cameras/:id/reference-image`.
const toPublicCamera = <T extends { referenceImagePath: string | null }>(
  camera: T,
) => {
  const { referenceImagePath, ...rest } = camera;
  return { ...rest, hasReferenceImage: referenceImagePath !== null };
};

export const addCamera = async (name: string, location: string) => {
  const camera = await prisma.camera.create({
    data: { name, location },
    select: cameraSelect,
  });
  return toPublicCamera(camera);
};

export const listCameras = async () => {
  const cameras = await prisma.camera.findMany({ select: cameraSelect });
  return cameras.map(toPublicCamera);
};

export const getCamera = async (cameraId: string) => {
  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
    select: cameraSelect,
  });
  if (!camera) throw new AppError(404, "Camera not found");
  return toPublicCamera(camera);
};

export const findCameraById = async (cameraId: string) => {
  return await prisma.camera.findUnique({
    where: { id: cameraId },
  });
};

export const reactivateCamera = async (cameraId: string) => {
  const findCamera = await findCameraById(cameraId);
  if (!findCamera) throw new AppError(404, "Camera not found");

  const camera = await prisma.camera.update({
    where: { id: cameraId },
    data: { active: true },
    select: cameraSelect,
  });
  return toPublicCamera(camera);
};

export const deactivateCamera = async (cameraId: string) => {
  const findCamera = await findCameraById(cameraId);
  if (!findCamera) throw new AppError(404, "Camera not found");

  const camera = await prisma.camera.update({
    where: { id: cameraId },
    data: { active: false },
    select: cameraSelect,
  });
  return toPublicCamera(camera);
};

export const updateCamera = async (
  cameraId: string,
  name: string,
  location: string,
) => {
  const findCamera = await findCameraById(cameraId);
  if (!findCamera) throw new AppError(404, "Camera not found");
  const camera = await prisma.camera.update({
    where: { id: cameraId },
    data: { name, location },
    select: { ...cameraSelect, updatedAt: true },
  });
  return toPublicCamera(camera);
};

// Stores the new reference image and removes the previous one (if any), so a
// camera never accumulates more than one file on disk.
export const updateReferenceImage = async (
  cameraId: string,
  image: ReceivedImage,
) => {
  const camera = await findCameraById(cameraId);
  if (!camera) throw new AppError(404, "Camera not found");

  const finalPath = path.join(
    cameraImagesDir(),
    `${cameraId}${image.extension}`,
  );

  try {
    await rename(image.tmpPath, finalPath);
  } catch (err) {
    await removeFile(image.tmpPath);
    throw err;
  }

  const previousPath = camera.referenceImagePath;
  await prisma.camera.update({
    where: { id: cameraId },
    data: { referenceImagePath: finalPath },
  });

  if (previousPath && previousPath !== finalPath) {
    await removeFile(previousPath);
  }
};

export const getReferenceImagePath = async (cameraId: string) => {
  const camera = await findCameraById(cameraId);
  if (!camera) throw new AppError(404, "Camera not found");
  if (!camera.referenceImagePath) {
    throw new AppError(404, "No reference image for this camera");
  }
  return camera.referenceImagePath;
};
