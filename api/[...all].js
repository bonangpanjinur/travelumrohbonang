/**
 * Vercel serverless function entry.
 * Imports the pre-built Express app (compiled by `pnpm --filter @workspace/api-server run build`).
 * Vercel picks this file up automatically because it lives in the /api directory.
 */
import app from "../artifacts/api-server/dist/vercel.mjs";
export default app;
