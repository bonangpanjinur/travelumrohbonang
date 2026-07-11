import type { IncomingMessage, ServerResponse } from "node:http";

let _app: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let _loadError: { message: string; code?: string; stack?: string } | null = null;

async function loadApp(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  if (_app) return _app;
  if (_loadError) throw _loadError;
  try {
    const mod = await import("../artifacts/api-server/dist/app.mjs");
    _app = mod.default as (req: IncomingMessage, res: ServerResponse) => void;
    return _app;
  } catch (err: any) {
    _loadError = {
      message: err?.message ?? String(err),
      code: err?.code,
      stack: err?.stack,
    };
    throw _loadError;
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let app: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
  try {
    app = await loadApp();
  } catch (err: any) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Server module failed to load",
        message: err?.message ?? String(err),
        code: err?.code ?? null,
        stack: process.env.NODE_ENV !== "production" ? (err?.stack ?? null) : null,
      }),
    );
    return;
  }
  app(req, res);
}
