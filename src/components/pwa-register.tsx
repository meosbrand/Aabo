"use client";

import { useEffect } from "react";

/** Registers the service worker (offline checker shell, push alerts, share target install). */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
