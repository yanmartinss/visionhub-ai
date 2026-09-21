import type { RequestHandler } from "express";
import { discardUpload, receiveUpload } from "../lib/receive-upload.ts";
import { attachLinkSegmentSchema } from "../schemas/attach-link-segment-schema.ts";
import { uploadSegmentFieldsSchema } from "../schemas/upload-segment-fields-schema.ts";
import { uuidParamSchema } from "../schemas/uuid-param-schema.ts";
import * as recordingDayService from "../services/recording-day.service.ts";
import * as segmentService from "../services/segment.service.ts";

export const attachLinkSegment: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid recording day id" });

  const body = attachLinkSegmentSchema.safeParse(req.body);
  if (!body.success)
    return res.status(400).json({ error: "Invalid segment data" });

  try {
    const { segment, created } = await segmentService.attachLinkSegment(
      params.data.id,
      body.data.url,
      body.data.startedAt,
    );
    return res.status(created ? 202 : 200).json(segment);
  } catch (err) {
    next(err);
  }
};

export const uploadSegment: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid recording day id" });

  try {
    // Fail before receiving a multi-GB body for a day that does not exist.
    await recordingDayService.assertRecordingDayExists(params.data.id);

    const upload = await receiveUpload(req);

    const fields = uploadSegmentFieldsSchema.safeParse(upload.fields);
    if (!fields.success) {
      await discardUpload(upload);
      return res.status(400).json({ error: "Invalid segment data" });
    }

    const { segment, created } = await segmentService.attachUploadedSegment(
      params.data.id,
      upload,
      fields.data.startedAt,
    );
    return res.status(created ? 202 : 200).json(segment);
  } catch (err) {
    next(err);
  }
};

export const reprocessSegment: RequestHandler = async (req, res, next) => {
  const params = uuidParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid segment id" });

  try {
    const segment = await segmentService.reprocessSegment(params.data.id);
    return res.status(202).json(segment);
  } catch (err) {
    next(err);
  }
};
