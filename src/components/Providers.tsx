"use client";
import { useEffect, type ReactNode } from "react";
import { useT } from "@/lib/i18n";

/** Sets text direction for RTL languages and registers the offline service worker (PWA). */
export function Providers({ children }: { children: ReactNode }) {
  const { lang, dir } = useT();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return <>{children}</>;
}
