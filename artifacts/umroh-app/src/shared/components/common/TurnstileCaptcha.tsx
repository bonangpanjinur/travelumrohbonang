import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_ID = "cf-turnstile-script";

/**
 * Cloudflare Turnstile captcha widget.
 * If VITE_TURNSTILE_SITE_KEY is not set, the component is a no-op (auto-verifies)
 * so dev environments aren't blocked.
 */
const TurnstileCaptcha = ({ onVerify, onExpire }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) {
      // Dev / not configured — auto pass
      onVerify("dev-bypass");
      return;
    }

    const render = () => {
      if (!containerRef.current || !window.turnstile) return;
      if (widgetId.current) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
      });
    };

    if (window.turnstile) {
      render();
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      const i = setInterval(() => {
        if (window.turnstile) {
          render();
          clearInterval(i);
        }
      }, 200);
      return () => clearInterval(i);
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch {}
        widgetId.current = null;
      }
    };
  }, [onVerify, onExpire]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="my-2" />;
};

export default TurnstileCaptcha;
