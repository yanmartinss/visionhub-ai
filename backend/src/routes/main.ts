import { Router } from "express";
import * as requestController from "../controllers/request.controller.ts";
import * as authController from "../controllers/auth.controller.ts";
import * as userController from "../controllers/user.controller.ts";
import * as condominiumController from "../controllers/condominium.controller.ts";
import { requireAuth } from "../middleware/require-auth.ts";
import { requireAdmin } from "../middleware/require-admin.ts";
import { authLimiter, requestLimiter } from "../middleware/rate-limit.ts";
import { requireManager } from "../middleware/require-manager.ts";

export const routes = Router();

// HEALTH ROUTE
routes.get("/ping", (_req, res) => {
  res.json({ pong: true });
});

// AUTH ROUTES
routes.post("/login", authLimiter, authController.login);
routes.post("/logout", authController.logout);
routes.post(
  "/auth/forgot-password",
  requestLimiter,
  authController.forgotPassword,
);
routes.post("/auth/reset-password", authLimiter, authController.resetPassword);

// USER ROUTES
routes.get("/me", requireAuth, authController.me);
routes.patch("/users/me/password", requireAuth, userController.changePassword);
routes.post(
  "/users/register",
  requireAuth,
  requireManager,
  userController.registerUser,
);
routes.get("/users", requireAuth, requireManager, userController.listUsers);
routes.patch("/users/me", requireAuth, userController.updateProfile);
routes.patch(
  "/users/:id/reactivate",
  requireAuth,
  requireManager,
  userController.reactivateUser,
);
routes.patch(
  "/users/:id/deactivate",
  requireAuth,
  requireManager,
  userController.deactivateUser,
);

// REQUEST ROUTES
routes.post("/requests", requestLimiter, requestController.requestRegistration);
routes.get(
  "/requests",
  requireAuth,
  requireAdmin,
  requestController.listRequests,
);
routes.patch(
  "/requests/:id/approve",
  requireAuth,
  requireAdmin,
  requestController.approveRequest,
);
routes.patch(
  "/requests/:id/reject",
  requireAuth,
  requireAdmin,
  requestController.rejectRequest,
);

// CONDOMINIUM ROUTES
routes.get(
  "/condominium",
  requireAuth,
  requireManager,
  condominiumController.getCondominium,
);
routes.patch(
  "/condominium",
  requireAuth,
  requireManager,
  condominiumController.updateCondominium,
);
