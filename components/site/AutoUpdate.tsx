"use client";

import { useEffect } from "react";

/** The build this page came from (set in next.config.ts at build time). */
const BUILT = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
/** About three times a week: at most one check every 56 hours. */
const EVERY = 56 * 60 * 60 * 1000;
const LAST_KEY = "rennbros.updateCheckedAt";

/** Saved to a home screen and opened from there (app mode). */
const isApp = () =>
  matchMedia("(display-mode: standalone)").matches ||
  matchMedia("(display-mode: fullscreen)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Keeps the home-screen app current. A phone freezes a home-screen app in the
 * background and can show the old page when it's reopened; so, about three
 * times a week, when the app is opened or brought back, it asks Netlify which
 * version is live and quietly reloads if there's a newer one.
 *
 * Only in app mode: a normal browser tab already gets the latest version from
 * Netlify on every visit. Nothing runs on a schedule while the app is closed
 * (phones don't allow that for web apps); the check happens the next time it
 * is opened. Never mid-booking: once someone has started filling in the
 * booking form, the reload waits.
 */
export function AutoUpdate() {
  useEffect(() => {
    if (!BUILT || !isApp()) return;
    let busy = false; // the visitor has started filling in the booking form

    const onBooking = () => /\/book\/?$/.test(location.pathname);
    const markBusy = (e: Event) => {
      if (onBooking() && (e.target as Element | null)?.closest?.("form")) busy = true;
    };

    const due = () => {
      try {
        return Date.now() - Number(localStorage.getItem(LAST_KEY) ?? 0) >= EVERY;
      } catch {
        return true;
      }
    };

    const check = async () => {
      if (document.visibilityState !== "visible" || busy || !due()) return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { build } = (await r.json()) as { build?: string };
        try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch {}
        if (build && build !== BUILT && !busy) location.reload();
      } catch {
        // offline or a hiccup: try again the next time the app is opened
      }
    };

    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check); // back from the browser's page cache
    document.addEventListener("input", markBusy, true);
    document.addEventListener("change", markBusy, true);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("input", markBusy, true);
      document.removeEventListener("change", markBusy, true);
    };
  }, []);
  return null;
}
