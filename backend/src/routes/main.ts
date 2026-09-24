import { Router } from "express";
import * as requestController from "../controllers/request.controller.ts";
import * as authController from "../controllers/auth.controller.ts";
import * as userController from "../controllers/user.controller.ts";
import * as condominiumController from "../controllers/condominium.controller.ts";
import * as cameraController from "../controllers/camera.controller.ts";
import * as ruleController from "../controllers/rule.controller.ts";
import * as areaController from "../controllers/area.controller.ts";
import * as recordingDayController from "../controllers/recording-day.controller.ts";
import * as segmentController from "../controllers/segment.controller.ts";
import * as eventController from "../controllers/event.controller.ts";
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

// CAMERA ROUTES
routes.post(
  "/cameras",
  requireAuth,
  requireManager,
  cameraController.addCamera,
);
routes.get(
  "/cameras",
  requireAuth,
  requireManager,
  cameraController.listCameras,
);
routes.get(
  "/cameras/:id",
  requireAuth,
  requireManager,
  cameraController.getCamera,
);
routes.patch(
  "/cameras/:id/reactivate",
  requireAuth,
  requireManager,
  cameraController.reactivateCamera,
);
routes.patch(
  "/cameras/:id/deactivate",
  requireAuth,
  requireManager,
  cameraController.deactivateCamera,
);
routes.patch(
  "/cameras/:id",
  requireAuth,
  requireManager,
  cameraController.updateCamera,
);
routes.post(
  "/cameras/:id/reference-image",
  requireAuth,
  requireManager,
  cameraController.uploadReferenceImage,
);
routes.get(
  "/cameras/:id/reference-image",
  requireAuth,
  requireManager,
  cameraController.getReferenceImage,
);

// RULES ROUTES
routes.get(
  "/cameras/:id/rules",
  requireAuth,
  requireManager,
  ruleController.listRules,
);
routes.put(
  "/cameras/:id/rules/:eventType",
  requireAuth,
  requireManager,
  ruleController.upsertRule,
);
routes.delete(
  "/cameras/:id/rules/:eventType",
  requireAuth,
  requireManager,
  ruleController.deleteRule,
);

// AREAS ROUTES
routes.get(
  "/cameras/:id/areas",
  requireAuth,
  requireManager,
  areaController.listAreas,
);
routes.post(
  "/cameras/:id/areas",
  requireAuth,
  requireManager,
  areaController.createArea,
);
routes.patch(
  "/areas/:id",
  requireAuth,
  requireManager,
  areaController.updateArea,
);
routes.delete(
  "/areas/:id",
  requireAuth,
  requireManager,
  areaController.deleteArea,
);

// RECORDING DAY (BATCH) ROUTES
routes.post(
  "/recording-days",
  requireAuth,
  requireManager,
  recordingDayController.createRecordingDay,
);
routes.get(
  "/recording-days",
  requireAuth,
  recordingDayController.listRecordingDays,
);
routes.get(
  "/recording-days/:id",
  requireAuth,
  recordingDayController.getRecordingDay,
);
routes.get(
  "/recording-days/:id/events",
  requireAuth,
  recordingDayController.listDayEvents,
);
routes.post(
  "/recording-days/:id/segments/link",
  requireAuth,
  requireManager,
  segmentController.attachLinkSegment,
);
routes.post(
  "/recording-days/:id/segments/upload",
  requireAuth,
  requireManager,
  segmentController.uploadSegment,
);

// SEGMENT ROUTES
routes.post(
  "/segments/:id/reprocess",
  requireAuth,
  requireManager,
  segmentController.reprocessSegment,
);

// EVENT ROUTES
// Any authenticated role: operational triage (mark seen/resolved), not camera
// configuration — unlike rules/areas/segments above, which stay manager-only.
routes.patch("/events/:id", requireAuth, eventController.updateEventStatus);
