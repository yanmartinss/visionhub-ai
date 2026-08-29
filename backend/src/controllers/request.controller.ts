import { RequestHandler } from "express";
import { requestSchema } from "../schemas/request-schema";

export const requestRegistration: RequestHandler = async (req, res) => {
  const result = requestSchema.safeParse(req.body);

  if (!result.success)
    return res.status(400).json({ error: "Invalid input data" });
};
