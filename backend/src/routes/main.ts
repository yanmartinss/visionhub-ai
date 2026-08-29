import { Router } from "express";
import * as requestController from "../controllers/request.controller.ts";

export const routes = Router();

routes.get("/ping", (req, res) => {
  res.json({ pong: true });
});

routes.post("/requests", requestController.requestRegistration);
