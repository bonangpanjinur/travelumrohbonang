import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry, Sentry } from "./lib/sentry";
import { installGlobalErrorHandlers } from "./lib/errorLogger";

initSentry();
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div>
            <h1 className="text-xl font-semibold mb-2">Terjadi kesalahan tak terduga</h1>
            <p className="text-muted-foreground mb-4">Tim kami sudah diberi tahu. Coba muat ulang halaman.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-md border">
              Muat ulang
            </button>
          </div>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
