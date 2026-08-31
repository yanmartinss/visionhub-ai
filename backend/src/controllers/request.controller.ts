import type { RequestHandler } from "express";
import { requestSchema } from "../schemas/request-schema.ts";
import * as requestService from "../services/request.service.ts";

export const requestRegistration: RequestHandler = async (req, res, next) => {
  const result = requestSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  try {
    const created = await requestService.createRequest(result.data);
    return res.status(201).json({
      id: created.id,
      status: created.status,
      message: "Solicitação recebida",
    });
  } catch (err) {
    next(err);
  }
};

export const listRequests: RequestHandler = async (_req, res, next) => {
  try {
    const requests = await requestService.listRequests();
    return res.json(requests);
  } catch (err) {
    next(err);
  }
};

export const approveRequest: RequestHandler = async (req, res, next) => {
  try {
    const result = await requestService.approveRequest(req.params.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const rejectRequest: RequestHandler = async (req, res, next) => {
  try {
    const result = await requestService.rejectRequest(req.params.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
