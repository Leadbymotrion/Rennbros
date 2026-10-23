"use client";

import { useEffect, useRef } from "react";
import { ChatText, Check, EnvelopeSimple, MapPin, Phone, WarningCircle } from "@phosphor-icons/react";
import { business } from "@/lib/business";
import { coverage, townPoints, center } from "@/lib/area";
import { dict, href, plain, town, type Lang } from "@/lib/i18n";

/**
 * The service area on a real, light basemap (MapLibre + OpenFreeMap's
 * positron, or Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_KEY is set), loaded
 * when it nears the screen. Town buttons anywhere on the page ([data-town])
 * drop a pin and fly there; the address check does the same for an address.
 */
export function ServiceMap({ lang, check = true }: { lang: Lang; check?: boolean }) {
  const t = dict(lang);
  const o = t.book.outside;
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cfg = {
      lang,
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
      center,
      coverage,
      towns: business.area.towns.map((key) => ({ key, name: plain(town(lang, key)), at: townPoints[key] })),
      gestures: t.map.gestures,
      text: { searching: t.check.searching, in: t.check.in, out: t.check.out, none: t.check.none, error: t.check.error, failed: t.map.failed },
      bookHref: href(lang, "/book"),
    };
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const { mountMap } = await import("@/lib/map/mount");
        mountMap(el, cfg);
      },
      { rootMargin: "1600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lang, t]);

  return (
    <div className="smap" ref={root}>
      <div className="smap__canvas light-surface" role="region" aria-label={t.map.aria}>
        <div className="smap__map" data-map />
        <p className="smap__status" data-map-status>{t.map.loading}</p>
        {/* A snapshot of this exact map, shown at once; the live map fades in under it (scripts/map-snapshot.mjs). */}
        <picture className="smap__snap" aria-hidden>
          <source media="(min-width: 37.5em)" srcSet="/media/map/area-wide.webp" />
          <img src="/media/map/area-tall.webp" alt="" width={780} height={975} decoding="async" />
        </picture>
        <p className="smap__legend"><span className="smap__swatch" aria-hidden />{t.map.legend}</p>
      </div>
      {check && (
        <form className="smap__check" data-check>
          <label className="field">
            <span>{t.check.label}</span>
            <span className="smap__row">
              <input className="input" name="q" type="text" autoComplete="street-address" placeholder={t.check.placeholder} required />
              <button className="btn btn--ghost" type="submit">{t.check.button}</button>
            </span>
          </label>
          <div className="smap__result" data-result aria-live="polite" hidden>
            <Check size={20} weight="bold" className="smap__yes" aria-hidden />
            <WarningCircle size={20} weight="light" className="smap__no" aria-hidden />
            <p data-result-text />
            <a className="link smap__book" href={href(lang, "/book")}>{t.check.book}</a>
          </div>
          {/* Out of the area: never a dead end. Call, text or email right away. */}
          <dialog className="notice" data-outside-dialog aria-labelledby="smap-outside-title">
            <div className="notice__head">
              <MapPin size={22} weight="fill" aria-hidden />
              <h3 className="notice__title" id="smap-outside-title">{o.title}</h3>
              <button type="button" className="notice__x" data-outside-close aria-label={t.book.office.close}>×</button>
            </div>
            <p>{o.body}</p>
            <p className="notice__phone num"><a className="link" href={`tel:${business.phone.tel}`}>{business.phone.display}</a> · <a className="link" href={`mailto:${business.email}`}>{business.email}</a></p>
            <div className="notice__actions">
              <a className="btn btn--red" href={`tel:${business.phone.tel}`}><Phone size={16} weight="bold" aria-hidden />{o.call}</a>
              <a className="btn btn--ghost" href={`sms:${business.phone.tel}`}><ChatText size={16} weight="bold" aria-hidden />{o.text}</a>
              <a className="btn btn--ghost" href={`mailto:${business.email}?subject=${encodeURIComponent(o.emailSubject)}`}><EnvelopeSimple size={16} weight="bold" aria-hidden />{o.email}</a>
            </div>
            <button type="button" className="link notice__change" data-outside-close>{o.tryAnother}</button>
          </dialog>
        </form>
      )}
    </div>
  );
}
