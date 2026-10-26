"use client";

import { useEffect } from "react";

/** At most one check every 48 hours. */
const EVERY = 48 * 60 * 60 * 1000;
const LAST_KEY = "rennbros.updateCheckedAt";
const HOME_KEY = "rennbros.homescreen";
/** The home-screen icon opens /?source=homescreen (public/site.webmanifest). */
const MARKER = "source";
const MARKER_VALUE = "homescreen";

const store = {
  get: (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } },
  set: (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch {} },
};

/** Opened from a home-screen icon: the start_url marker (remembered for the
 *  session), or the app display modes, or iPhone's navigator.standalone. */
function isHomeScreen(): boolean {
  const url = new URL(location.href);
  if (url.searchParams.get(MARKER) === MARKER_VALUE) {
    store.set(sessionStorage, HOME_KEY, "1");
    // Take only the marker out of the address bar; other parameters and #hash stay.
    url.searchParams.delete(MARKER);
    try { history.replaceState(history.state, "", url.pathname + url.search + url.hash); } catch {}
  }
  return (
    store.get(sessionStorage, HOME_KEY) === "1" ||
    ["standalone", "fullscreen", "minimal-ui"].some((m) => matchMedia(`(display-mode: ${m})`).matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** The live version's fingerprint: the ETag (or Last-Modified) of /api/version,
 *  which changes only when Netlify publishes a new deploy. */
async function fingerprint(): Promise<string | null> {
  try {
    const r = await fetch("/api/version", { method: "HEAD", cache: "no-store" });
    if (!r.ok) return null;
    return r.headers.get("etag") ?? r.headers.get("last-modified");
  } catch {
    return null; // offline or a hiccup
  }
}

/**
 * Keeps a home-screen copy of the site current. Phones keep a home-screen app
 * paused in memory for days; when it comes back to the front, at most once
 * every 48 hours, this asks whether a newer version is live and reloads once
 * if so. Browser tabs and desktop PCs never reload on their own: they get the
 * newest version on every visit anyway (the pages are sent with
 * Cache-Control: max-age=0, must-revalidate).
 *
 * Never while a form or popup is open or someone is typing: it skips and tries
 * again the next time the app comes back.
 */
export function AutoUpdate() {
  useEffect(() => {
    if (!isHomeScreen()) return;
    let atLoad: string | null = null;
    let started = false; // the visitor has started filling in a form on this page
    const markStarted = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("form")) started = true;
    };

    const busy = () => {
      const a = document.activeElement as HTMLElement | null;
      const typing = !!a && (a.matches?.("input, textarea, select") || a.isContentEditable);
      let popup = !!document.querySelector("dialog[open], .sheet[data-open='true']");
      try { popup ||= !!document.querySelector("[popover]:popover-open"); } catch {} // older browsers lack :popover-open
      return started || typing || popup;
    };

    const due = () => Date.now() - Number(store.get(localStorage, LAST_KEY) ?? 0) >= EVERY;

    const check = async () => {
      if (document.visibilityState !== "visible" || !due() || busy()) return;
      const now = await fingerprint();
      if (!now) return; // couldn't ask: try again on the next return
      store.set(localStorage, LAST_KEY, String(Date.now()));
      if (atLoad && now !== atLoad && !busy()) location.reload();
    };

    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) check(); };

    // The fingerprint on load counts as a check: the next one is 48 h later.
    fingerprint().then((f) => {
      atLoad = f;
      if (f) store.set(localStorage, LAST_KEY, String(Date.now()));
    });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("input", markStarted, true);
    document.addEventListener("change", markStarted, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("input", markStarted, true);
      document.removeEventListener("change", markStarted, true);
    };
  }, []);
  return null;
}
