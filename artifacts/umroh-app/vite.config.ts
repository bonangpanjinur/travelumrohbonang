import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig(async ({ command }) => {
  // `vite build` (e.g. on Vercel) never reads `server.port`/`preview.port` —
  // only `vite`/`vite preview` (command === "serve") do. Requiring PORT at
  // build time broke external build pipelines (Vercel) that don't set it, so
  // only enforce it when actually starting a dev/preview server.
  const isServe = command === 'serve';
  const rawPort = process.env.PORT;

  if (isServe && !rawPort) {
    throw new Error(
      'PORT environment variable is required but was not provided.',
    );
  }

  const port = Number(rawPort ?? 5173);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // BASE_PATH affects build output (asset URLs), so it's read at build time
  // too, but defaults to "/" for external deployments (e.g. Vercel) that
  // serve the app at the domain root instead of Replit's path-based routing.
  const basePath = process.env.BASE_PATH ?? '/';

  // Map server-side Supabase secrets to VITE_ env vars so they are available
  // to the browser bundle without requiring duplicate env entries.
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
  // Extract project-ref (subdomain) from the URL, e.g. https://abcdef.supabase.co → abcdef
  const supabaseProjectId = process.env.VITE_SUPABASE_PROJECT_ID
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
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({ error: 'API server tidak tersedia', detail: 'Pastikan workflow api-server berjalan.' }));
            });
          },
        },
        '/rest/v1': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({ error: 'API server tidak tersedia', detail: 'REST proxy tidak bisa dijangkau. Pastikan workflow api-server berjalan.' }));
            });
          },
        },
        '/storage/v1': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({ error: 'Storage server tidak tersedia' }));
            });
          },
        },
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
