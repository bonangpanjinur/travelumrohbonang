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

// Trust the first hop proxy (Vercel's edge network / Replit's proxy) so that
// req.ip and the X-Forwarded-For header are read correctly. Without this,
// express-rate-limit throws a ValidationError on every single request when
// it detects X-Forwarded-For but "trust proxy" is disabled — which manifests
// as a blanket 500 on all routes in production.
app.set("trust proxy", 1);

// Build a strict CORS allowlist from environment or fall back to same-origin.
// ALLOWED_ORIGINS can be a comma-separated list, e.g.:
//   https://umrohplus.vercel.app,https://www.umrohplus.com
const rawOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);

function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  // Same-origin (server-side) requests have no Origin header — always allow.
  if (!origin) return callback(null, true);
  // In development, allow all origins for local convenience.
  if (process.env.NODE_ENV !== "production") return callback(null, true);
  if (rawOrigins.includes(origin)) return callback(null, true);
  callback(new Error(`CORS: origin '${origin}' not allowed`));
}

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
app.use(cors({ credentials: true, origin: corsOrigin }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);
app.use("/api", generalLimiter);

// PostgREST-compatible proxy — serves Supabase JS client requests
// Apply rate limiting to the REST proxy as well.
app.use("/rest/v1", generalLimiter);
app.use("/rest/v1/rpc", restRouter);
app.use("/rest/v1", restRouter);

// Local file storage — serves Supabase storage calls
// Use raw body parser only for storage routes (before express.json processes them)
app.use("/storage/v1", generalLimiter, express.raw({ type: "*/*", limit: "50mb" }), storageRouter);

// Serve uploaded files as static assets
// Use /tmp on Vercel (read-only filesystem), local uploads/ in dev
const uploadsDir =
  process.env.VERCEL === "1"
    ? "/tmp/uploads"
    : path.resolve(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch {
  // Filesystem may be read-only (serverless); uploads will not persist
}
app.use("/uploads", express.static(uploadsDir));

app.use("/api", router);

// ── 404 catch-all (unknown routes) ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  console.error("[app] unhandled error:", err?.message ?? err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
