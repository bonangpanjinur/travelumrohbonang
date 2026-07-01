/**
 * Vercel Serverless Function — wraps the Express API server.
 *
 * All requests matching /api/* are routed here by vercel.json.
 * Vercel's Node.js runtime handles Express apps natively as the default export.
 */
export { default } from "../artifacts/api-server/src/app";
