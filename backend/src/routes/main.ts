import { Router } from "express";
import * as requestController from "../controllers/request.controller.ts";
import * as authController from "../controllers/auth.controller.ts";
import * as userController from "../controllers/user.controller.ts";
import { requireAuth } from "../middleware/require-auth.ts";
import { requireAdmin } from "../middleware/require-admin.ts";
import { authLimiter, requestLimiter } from "../middleware/rate-limit.ts";

export const routes = Router();

routes.get("/ping", (_req, res) => {
  res.json({ pong: true });
});

routes.post("/requests", requestLimiter, requestController.requestRegistration);
routes.post("/login", authLimiter, authController.login);
routes.post("/logout", authController.logout);

routes.get("/me", requireAuth, authController.me);
routes.patch("/users/me/password", requireAuth, userController.changePassword);

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
