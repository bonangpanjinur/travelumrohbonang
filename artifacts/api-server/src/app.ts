import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import restRouter from "./routes/rest";
import storageRouter from "./routes/storage";
import { logger } from "./lib/logger";
import { generalLimiter } from "./middlewares/rateLimiter";
import { requestMetrics } from "./lib/requestMetrics";
import { authMiddleware } from "./middlewares/authMiddleware";

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);
app.use("/api", generalLimiter);

// PostgREST-compatible proxy — serves Supabase JS client requests
app.use("/rest/v1/rpc", restRouter);
app.use("/rest/v1", restRouter);

// Local file storage — serves Supabase storage calls
// Use raw body parser only for storage routes (before express.json processes them)
app.use("/storage/v1", express.raw({ type: "*/*", limit: "50mb" }), storageRouter);

// Serve uploaded files as static assets
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

app.use("/api", router);

export default app;
