import type { RequestHandler } from "express";
import { AppError } from "../lib/app-error.ts";
import { getObjectStream, isMissingObject } from "../lib/object-storage.ts";
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

export const getEvent: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid event id" });

  try {
    const event = await eventService.getEventDetail(params.data.id);
    return res.status(200).json(event);
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

const serveMedia =
  (kind: eventService.EventMediaKind): RequestHandler =>
  async (req, res, next) => {
    const params = uuidParamSchema.safeParse(req.params);
    if (!params.success)
      return res.status(400).json({ error: "Invalid event id" });

    try {
      const key = await eventService.getEventMediaKey(params.data.id, kind);
      const media = await getObjectStream(key);

      res.status(200);
      res.setHeader("Content-Type", media.contentType);
      if (media.contentLength !== null)
        res.setHeader("Content-Length", String(media.contentLength));
      // Personal data (LGPD): never cached by shared caches.
      res.setHeader("Cache-Control", "private, no-store");
      media.stream.on("error", (err) => {
        console.error(`[event-media] stream failed for ${key}:`, err.message);
        res.destroy(err);
      });
      media.stream.pipe(res);
    } catch (err) {
      if (isMissingObject(err))
        return next(new AppError(404, "Media not found"));
      next(err);
    }
  };

export const getEventClip = serveMedia("clip");
export const getEventThumbnail = serveMedia("thumbnail");
