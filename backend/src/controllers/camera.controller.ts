import type { RequestHandler } from "express";
import { createCameraSchema } from "../schemas/create-camera-schema.ts";
import * as cameraService from "../services/camera.service.ts";
import { discardImage, receiveImage } from "../lib/receive-image.ts";

export const addCamera: RequestHandler = async (req, res, next) => {
  const result = createCameraSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid camera data" });

  const { name, location } = result.data;

  try {
    const camera = await cameraService.addCamera(name, location);
    return res.status(201).json(camera);
  } catch (err) {
    next(err);
  }
};

export const listCameras: RequestHandler = async (req, res, next) => {
  try {
    const cameras = await cameraService.listCameras();
    return res.status(200).json(cameras);
  } catch (err) {
    next(err);
  }
};

export const getCamera: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id as string;
  try {
    const camera = await cameraService.getCamera(cameraId);
    return res.status(200).json(camera);
  } catch (err) {
    next(err);
  }
};

export const reactivateCamera: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id;
  try {
    const resultCamera = await cameraService.reactivateCamera(
      cameraId as string,
    );
    return res.status(200).json(resultCamera);
  } catch (err) {
    next(err);
  }
};

export const deactivateCamera: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id;
  try {
    const resultCamera = await cameraService.deactivateCamera(
      cameraId as string,
    );
    return res.status(200).json(resultCamera);
  } catch (err) {
    next(err);
  }
};

export const updateCamera: RequestHandler = async (req, res, next) => {
  const result = createCameraSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid camera data" });
  const cameraId = req.params.id;
  const { name, location } = result.data;
  try {
    const updatedCamera = await cameraService.updateCamera(
      cameraId as string,
      name,
      location,
    );
    return res.status(200).json(updatedCamera);
  } catch (err) {
    next(err);
  }
};

export const uploadReferenceImage: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id as string;
  let image: Awaited<ReturnType<typeof receiveImage>> | undefined;
  try {
    image = await receiveImage(req);
    await cameraService.updateReferenceImage(cameraId, image);
    return res.status(204).end();
  } catch (err) {
    if (image) await discardImage(image);
    next(err);
  }
};

export const getReferenceImage: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id as string;
  try {
    const imagePath = await cameraService.getReferenceImagePath(cameraId);
    return res.sendFile(imagePath, {
      headers: { "Cache-Control": "private, max-age=0, must-revalidate" },
    });
  } catch (err) {
    next(err);
  }
};
