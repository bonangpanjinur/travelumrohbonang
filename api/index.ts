// Vercel serverless function — imports the pre-built Express app bundle.
// The bundle is produced by `pnpm --filter @workspace/api-server run build`
// (run as part of the Vercel buildCommand in vercel.json) so that all
// workspace imports (@workspace/db, @workspace/api-zod) are fully resolved
// and pg is properly externalized — avoiding @vercel/node resolution issues.
import app from "../artifacts/api-server/dist/app.mjs";
export default app;
