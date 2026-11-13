import { useEffect } from "react";

const refreshDatabaseIcon = () => {
  // The backend endpoint selects favicon_url first, then falls back to the
  // current branding.logo_url. A cache-busting query helps browsers notice an
  // updated logo after an admin changes the branding settings.
  const href = `/api/cms/site-icon?v=${Date.now()}`;
  document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']").forEach((link) => link.remove());

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.href = href;
  document.head.appendChild(favicon);

  const touchIcon = document.createElement("link");
  touchIcon.rel = "apple-touch-icon";
  touchIcon.href = href;
  document.head.appendChild(touchIcon);
};

export const useDynamicFavicon = () => {
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshDatabaseIcon();
    };

    refreshDatabaseIcon();
    window.addEventListener("focus", refreshDatabaseIcon);
    window.addEventListener("site-branding-updated", refreshDatabaseIcon);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshDatabaseIcon);
      window.removeEventListener("site-branding-updated", refreshDatabaseIcon);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);
};
