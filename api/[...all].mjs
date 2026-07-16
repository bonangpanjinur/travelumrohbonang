/**
 * Vercel serverless function entry.
 *
 * Uses a dynamic import so Vercel does NOT try to bundle the pre-built
 * dist/vercel.mjs inline (it is already a self-contained esbuild bundle).
 * The `includeFiles` directive in vercel.json makes the dist/ tree available
 * on the serverless filesystem at runtime.
 *
 * The app instance is cached across warm invocations (module-level variable),
 * so cold-start cost is paid only once per container.
 */

let _app;

async function loadApp() {
  if (!_app) {
    const mod = await import("../artifacts/api-server/dist/vercel.mjs");
    _app = mod.default;
  }
  return _app;
}

export default async function handler(req, res) {
  const app = await loadApp();
  app(req, res);
}
