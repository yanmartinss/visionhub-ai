import type { RequestHandler } from "express";
import { passwordSchema } from "../schemas/password-schema.ts";
import * as userService from "../services/user.service.ts";
import { createUserSchema } from "../schemas/create-user-schema.ts";

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

export const registerUser: RequestHandler = async (req, res, next) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid user data" });

  try {
    const user = await userService.createUser(
      result.data.name,
      result.data.email,
      result.data.role,
      false,
    );
    return res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};
