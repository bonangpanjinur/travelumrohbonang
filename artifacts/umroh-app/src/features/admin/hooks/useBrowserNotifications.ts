/**
 * useBrowserNotifications — Sprint 6
 *
 * Requests Notification API permission once and exposes a helper
 * to fire a browser notification when the admin tab is hidden/blurred.
 */

import { useEffect, useCallback } from "react";

export function useBrowserNotifications() {
  // Request permission once on mount
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  /** Show a browser notification only when the document is not visible */
  const notify = useCallback((title: string, body: string, onClick?: () => void) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return; // Admin is actively looking at the tab

    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "chat-message", // Replaces previous notification of same tag
    });

    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
      };
    }
  }, []);

  return { notify };
}
