import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

type ProxyOpts = {
  vitePort: number;
  supabaseUrl: string;
  apiTargetOverride?: string;
  apiPort: number;
};

/**
 * Build dev proxies.
 *
 * IMPORTANT: the API target must never be the Vite dev-server port itself.
 * Proxying to our own port makes every /api and /rest/v1 request loop back
 * into Vite, exhausting local sockets (`connect EAGAIN 127.0.0.1:8080`) and
 * making even the HTML document take >15s to load (blank/slow homepage).
 *
 * When no separate API server is configured, /rest/v1 and /storage/v1 are
 * proxied straight to Supabase so the public pages still get their data,
 * and /api answers with a fast 503 instead of hanging.
 */
function buildProxy({ vitePort, supabaseUrl, apiTargetOverride, apiPort }: ProxyOpts) {
  const fail = (detail: string) => ({
    configure: (proxy: any) => {
      proxy.on('error', (_err: unknown, _req: unknown, res: any) => {
        if (!res || res.headersSent) return;
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API server tidak tersedia', detail }));
      });
    },
  });

  const rawApiTarget =
    apiTargetOverride ??
    (apiPort && apiPort !== vitePort ? `http://localhost:${apiPort}` : undefined);

  // Guard against self-proxy loops regardless of how the target was provided.
  const apiTarget =
    rawApiTarget && !new RegExp(`:${vitePort}(/|$)`).test(rawApiTarget)
      ? rawApiTarget
      : undefined;

  const dataTarget = apiTarget ?? (supabaseUrl || undefined);

  const proxy: Record<string, any> = {};

  if (apiTarget) {
    proxy['/api'] = {
      target: apiTarget,
      changeOrigin: true,
      ...fail('Pastikan workflow api-server berjalan.'),
    };
  }

  if (dataTarget) {
    proxy['/rest/v1'] = {
      target: dataTarget,
      changeOrigin: true,
      secure: true,
      ...fail('REST proxy tidak bisa dijangkau.'),
    };
    proxy['/storage/v1'] = {
      target: dataTarget,
      changeOrigin: true,
      secure: true,
      ...fail('Storage server tidak tersedia.'),
    };
  }

  return proxy;
}


export default defineConfig(async ({ command, mode }) => {
  // Load .env files so SUPABASE_* / VITE_SUPABASE_* are available here even
  // when they are not exported into the shell environment.
  const fileEnv = loadEnv(mode, path.resolve(import.meta.dirname, '..', '..'), '');
  const env = { ...fileEnv, ...process.env } as Record<string, string | undefined>;

  // `vite build` (e.g. on Vercel) never reads `server.port`/`preview.port` —
  // only `vite`/`vite preview` (command === "serve") do. PORT is optional:
  // some environments pass `--port` on the CLI instead, so fall back to 8080
  // for dev/preview and 5173 otherwise instead of throwing.
  const isServe = command === 'serve';
  const rawPort = env.PORT;

  const port = Number(rawPort ?? (isServe ? 8080 : 5173));


  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // BASE_PATH affects build output (asset URLs), so it's read at build time
  // too, but defaults to "/" for external deployments (e.g. Vercel) that
  // serve the app at the domain root instead of Replit's path-based routing.
  const basePath = env.BASE_PATH ?? '/';

  // Map server-side Supabase secrets to VITE_ env vars so they are available
  // to the browser bundle without requiring duplicate env entries.
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey =
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';
  // Extract project-ref (subdomain) from the URL, e.g. https://abcdef.supabase.co → abcdef
  const supabaseProjectId = env.VITE_SUPABASE_PROJECT_ID
    ?? (supabaseUrl ? (new URL(supabaseUrl).hostname.split('.')[0]) : '');


  return {
    base: basePath,
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(supabaseProjectId),
    },
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      // Without a local api-server, /api has no proxy. Answer immediately with
      // a JSON 503 instead of letting Vite serve index.html (which surfaced as
      // confusing "non-JSON response" errors and slow, hanging pages).
      {
        name: 'api-unavailable-fallback',
        configureServer(server: any) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (!apiAvailable && req.url?.startsWith('/api/')) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'API server tidak tersedia',
                  detail:
                    'Jalankan workflow api-server (API_PORT/API_PROXY_TARGET) agar endpoint /api aktif.',
                }),
              );
              return;
            }
            next();
          });
        },
      },

      ...(process.env.NODE_ENV !== 'production' &&
      process.env.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, '..'),
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
      proxy: buildProxy({ vitePort: port, supabaseUrl, apiTargetOverride: process.env.API_PROXY_TARGET, apiPort: Number(process.env.API_PORT ?? 3001) }),
    },

    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
