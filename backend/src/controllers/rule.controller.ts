import type { RequestHandler } from "express";
import { eventTypeParamSchema } from "../schemas/event-type-param-schema.ts";
import { createUpsertRuleSchema } from "../schemas/upsert-rule-schema.ts";
import * as ruleService from "../services/rule.service.ts";

export const listRules: RequestHandler = async (req, res, next) => {
  const cameraId = req.params.id as string;
  try {
    const rules = await ruleService.listRulesByCamera(cameraId);
    return res.status(200).json(rules);
  } catch (err) {
    next(err);
  }
};

export const upsertRule: RequestHandler = async (req, res, next) => {
  const params = eventTypeParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid camera id or event type" });

  const result = createUpsertRuleSchema(params.data.eventType).safeParse(
    req.body,
  );
  if (!result.success) {
    return res
      .status(400)
      .json({ error: result.error.issues[0]?.message ?? "Invalid rule data" });
  }

  try {
    const rule = await ruleService.upsertRule(
      params.data.id,
      params.data.eventType,
      result.data,
    );
    return res.status(200).json(rule);
  } catch (err) {
    next(err);
  }
};

export const deleteRule: RequestHandler = async (req, res, next) => {
  const params = eventTypeParamSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ error: "Invalid camera id or event type" });

  try {
    await ruleService.deleteRule(params.data.id, params.data.eventType);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
