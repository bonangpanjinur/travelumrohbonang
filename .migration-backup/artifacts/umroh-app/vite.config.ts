import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig(async ({ command }): Promise<UserConfig> => {
  // PORT and BASE_PATH are only required when running the dev/preview server,
  // not during a static build (e.g. Vercel CI).
  const isBuild = command === 'build';

  const rawPort = process.env.PORT;
  if (!isBuild && !rawPort) {
    throw new Error(
      'PORT environment variable is required but was not provided.',
    );
  }
  const port = rawPort ? Number(rawPort) : 5173;
  if (!isBuild && (Number.isNaN(port) || port <= 0)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH;
  if (!isBuild && !basePath) {
    throw new Error(
      'BASE_PATH environment variable is required but was not provided.',
    );
  }

  return {
    base: basePath ?? '/',
    plugins: [
      react(),
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
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
