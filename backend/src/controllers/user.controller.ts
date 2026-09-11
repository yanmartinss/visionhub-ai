import type { RequestHandler } from "express";
import { passwordSchema } from "../schemas/password-schema.ts";
import * as userService from "../services/user.service.ts";
import { createUserSchema } from "../schemas/create-user-schema.ts";
import { updateProfileSchema } from "../schemas/update-profile-schema.ts";
import { canManageUser } from "../lib/can-manage-user.ts";

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

export const listUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await userService.listUsers();
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Invalid profile data" });

  try {
    const user = await userService.updateProfile(
      req.user!.id,
      result.data.name,
    );
    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const getUserById: RequestHandler = async (req, res, next) => {
  const userId = req.params.id;

  try {
    const user = await userService.getUserById(userId as string);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const reactivateUser: RequestHandler = async (req, res, next) => {
  const userId = req.params.id;
  const actor = req.user!;

  try {
    const targetUser = await userService.getUserById(userId as string);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (!canManageUser(actor, targetUser)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedUser = await userService.reactivateUser(userId as string);
    return res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
};

export const deactivateUser: RequestHandler = async (req, res, next) => {
  const userId = req.params.id;
  const actor = req.user!;

  try {
    const targetUser = await userService.getUserById(userId as string);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (!canManageUser(actor, targetUser)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedUser = await userService.deactivateUser(userId as string);
    return res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
};
