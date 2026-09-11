import type { RequestHandler } from "express";
import * as condominiumService from "../services/condominium.service.ts";
import { updateCondominiumSchema } from "../schemas/update-condominium-schema.ts";

export const getCondominium: RequestHandler = async (req, res, next) => {
  try {
    const condominium = await condominiumService.getCondominium();
    return res.status(200).json(condominium);
  } catch (err) {
    next(err);
  }
};

export const updateCondominium: RequestHandler = async (req, res, next) => {
  const result = updateCondominiumSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid condominium data" });
  try {
    const condominium = await condominiumService.updateCondominium(result.data);
    return res.status(200).json(condominium);
  } catch (err) {
    next(err);
  }
};
