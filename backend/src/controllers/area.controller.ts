import type { RequestHandler } from "express";
import { createAreaSchema, updateAreaSchema } from "../schemas/area-schema.ts";
import { uuidParamSchema } from "../schemas/uuid-param-schema.ts";
import * as areaService from "../services/area.service.ts";

export const listAreas: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id as string;
  try {
    const areas = await areaService.listAreasByCamera(cameraId);
    return res.status(200).json(areas);
  } catch (err) {
    next(err);
  }
};

export const createArea: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id as string;
  const result = createAreaSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid area data" });

  try {
    const area = await areaService.createArea(
      cameraId,
      result.data.type,
      result.data.polygon,
    );
    return res.status(201).json(area);
  } catch (err) {
    next(err);
  }
};

export const updateArea: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid area id" });

  const result = updateAreaSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid area data" });

  try {
    const area = await areaService.updateArea(params.data.id, result.data);
    return res.status(200).json(area);
  } catch (err) {
    next(err);
  }
};

export const deleteArea: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid area id" });

  try {
    await areaService.deleteArea(params.data.id);
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};
