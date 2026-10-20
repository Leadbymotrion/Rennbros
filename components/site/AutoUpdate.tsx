"use client";

import { useEffect } from "react";

/** The build this page came from (set in next.config.ts at build time). */
const BUILT = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
/** How often to look for a new version, and how long in the background
 *  before a reopened page is refreshed anyway. */
const EVERY = 25 * 60 * 1000;

/**
 * Keeps the site current when it's saved to a phone's home screen. Phones
 * freeze a home-screen app in the background and show the old page when it's
 * reopened; this checks for a newer deploy every 25 minutes and each time the
 * app comes back, and reloads when one is out. A page left in the background
 * for 25 minutes or more is also refreshed when reopened.
 *
 * Never mid-booking: once someone has typed or picked anything in the booking
 * form, the reload waits until they leave that page.
 */
export function AutoUpdate() {
  useEffect(() => {
    if (!BUILT) return;
    let busy = false; // the visitor has started filling in the booking form
    let hiddenAt = 0;

    const onBooking = () => /\/book\/?$/.test(location.pathname);
    const markBusy = (e: Event) => {
      if (onBooking() && (e.target as Element | null)?.closest?.("form")) busy = true;
    };

    const newer = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { build } = (await r.json()) as { build?: string };
        return !!build && build !== BUILT;
      } catch {
        return false; // offline or a hiccup: try again next time
      }
    };

    const refresh = () => {
      if (busy) return;
      location.reload();
    };

    const check = async () => {
      if (document.visibilityState !== "visible" || busy) return;
      if (await newer()) refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt >= EVERY) refresh();
      else check();
      hiddenAt = 0;
    };

    const timer = window.setInterval(check, EVERY);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", check); // back from the browser's page cache
    document.addEventListener("input", markBusy, true);
    document.addEventListener("change", markBusy, true);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("input", markBusy, true);
      document.removeEventListener("change", markBusy, true);
    };
  }, []);
  return null;
}
