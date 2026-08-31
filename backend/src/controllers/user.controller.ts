import type { RequestHandler } from "express";
import { passwordSchema } from "../schemas/password-schema.ts";
import * as userService from "../services/user.service.ts";

/** PATCH /api/users/me/password — requer auth. */
export const changePassword: RequestHandler = async (req, res, next) => {
  const result = passwordSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ error: "A senha precisa ter entre 8 e 72 caracteres" });
  }

  try {
    await userService.changePassword(req.user!.id, result.data.newPassword);
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};
