import type { RequestHandler } from "express";
import { updateEventStatusSchema } from "../schemas/update-event-status-schema.ts";
import { uuidParamSchema } from "../schemas/uuid-param-schema.ts";
import * as eventService from "../services/event.service.ts";
import { listEventsSchema } from "../schemas/list-events-schema.ts";

export const listEvents: RequestHandler = async (req, res, next) => {
  const result = listEventsSchema.safeParse(req.query);
  if (!result.success)
    return res.status(400).json({ error: "Invalid filters" });

  try {
    const page = await eventService.listEvents(result.data);
    return res.status(200).json(page);
  } catch (err) {
    next(err);
  }
};

export const updateEventStatus: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid event id" });

  const result = updateEventStatusSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid event status" });

  try {
    const event = await eventService.updateEventStatus(
      params.data.id,
      result.data.status,
    );
    return res.status(200).json(event);
  } catch (err) {
    next(err);
  }
};
