import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { routes } from "./routes/main";
import { apiLimiter } from "./middleware/rate-limit";
import { AppError } from "./lib/app-error";

const server = express();

server.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
server.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:5173",
    credentials: true,
  }),
);
server.use(cookieParser());
server.use(express.static("public"));
server.use(express.json());
server.use("/api", apiLimiter, routes);

server.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal Server Error" });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 8080}`);
});
