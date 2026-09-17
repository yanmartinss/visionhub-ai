import type { RequestHandler } from "express";
import { createRuleSchema } from "../schemas/create-rule-schema.ts";
import * as ruleService from "../services/rule.service.ts";

export const addRule: RequestHandler = async (req, res, next) => {
  const result = createRuleSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid rule data" });
  try {
    const created = await ruleService.addRule(result.data);
    return res.status(201).json({
      id: created.id,
      cameraId: created.cameraId,
      eventType: created.eventType,
      timeLimitSeconds: created.timeLimitSeconds,
    });
  } catch (err) {
    next(err);
  }
};
