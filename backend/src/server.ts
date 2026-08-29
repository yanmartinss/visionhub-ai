import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { routes } from "./routes/main";
import { apiLimiter } from "./middleware/rate-limit";

const server = express();

server.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
server.use(cors());
server.use(cookieParser());
server.use(express.static("public"));
server.use(express.json());
server.use("/api", apiLimiter, routes);

server.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  return res.status(500).json({ message: "Internal Server Error" });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 8080}`);
});
