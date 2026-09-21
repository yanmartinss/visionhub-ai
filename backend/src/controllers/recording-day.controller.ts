import type { RequestHandler } from "express";
import { createRecordingDaySchema } from "../schemas/create-recording-day-schema.ts";
import { listRecordingDaysSchema } from "../schemas/list-recording-days-schema.ts";
import { uuidParamSchema } from "../schemas/uuid-param-schema.ts";
import * as recordingDayService from "../services/recording-day.service.ts";

export const createRecordingDay: RequestHandler = async (req, res, next) => {
  const result = createRecordingDaySchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid recording day data" });

  try {
    const { recordingDay, created } =
      await recordingDayService.getOrCreateRecordingDay(
        result.data.cameraId,
        result.data.date,
        req.user!.id,
      );
    return res.status(created ? 201 : 200).json(recordingDay);
  } catch (err) {
    next(err);
  }
};

export const listRecordingDays: RequestHandler = async (req, res, next) => {
  const result = listRecordingDaysSchema.safeParse(req.query);
  if (!result.success)
    return res.status(400).json({ error: "Invalid filters" });

  try {
    const recordingDays = await recordingDayService.listRecordingDays(
      result.data,
    );
    return res.status(200).json(recordingDays);
  } catch (err) {
    next(err);
  }
};

export const getRecordingDay: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid recording day id" });

  try {
    const recordingDay = await recordingDayService.getRecordingDay(
      params.data.id,
    );
    return res.status(200).json(recordingDay);
  } catch (err) {
    next(err);
  }
};

export const listDayEvents: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid recording day id" });

  try {
    const events = await recordingDayService.listDayEvents(params.data.id);
    return res.status(200).json(events);
  } catch (err) {
    next(err);
  }
};
