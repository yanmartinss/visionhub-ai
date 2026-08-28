import { Router } from "express";

export const routes = Router();

routes.get("/ping", (req, res) => {
  res.json({ pong: true });
});
