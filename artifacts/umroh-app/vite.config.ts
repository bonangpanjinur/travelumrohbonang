import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

const basePath = process.env.BASE_PATH ?? "/";

// Real Supabase project URL — used only for proxying /auth/v1 in dev.
// Data queries (REST/storage) are routed to the local API server via Vite proxy
// because client.ts uses window.location.origin in dev mode (same-origin, no CORS).
const realSupabaseUrl = process.env.VITE_SUPABASE_URL ?? "https://reuwfhuaabdhxjkomred.supabase.co";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    (runtimeErrorOverlay as any)(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — never changes, cache long
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],
          // TanStack Query
          "vendor-query": ["@tanstack/react-query"],
          // UI / animation libraries
          "vendor-ui": ["framer-motion", "lucide-react", "sonner", "class-variance-authority", "clsx", "tailwind-merge"],
          // Radix UI primitives (many small packages → one chunk)
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
            "@radix-ui/react-tabs",
            "@radix-ui/react-switch",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-slot",
            "@radix-ui/react-label",
            "@radix-ui/react-separator",
            "@radix-ui/react-avatar",
            "@radix-ui/react-progress",
          ],
          // Date utilities
          "vendor-date": ["date-fns"],
          // Charts
          "vendor-charts": ["recharts"],
          // PDF / export utilities
          "vendor-pdf": ["jspdf"],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      // Auth stays on real Supabase (login/signup/session)
      "/auth/v1": { target: realSupabaseUrl, changeOrigin: true },
      // Forward API and Supabase-compat data routes to local Express server
      "/api": { target: "http://localhost:8080", changeOrigin: true },
      "/rest/v1": { target: "http://localhost:8080", changeOrigin: true },
      "/storage/v1": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
