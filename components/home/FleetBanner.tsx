import fs from "node:fs";
import path from "node:path";
import { Phone } from "@phosphor-icons/react/dist/ssr";
import { business } from "@/lib/business";
import { dict, type Lang } from "@/lib/i18n";

/** The office-lot photo, once it's in public/media. Until then the band is
 *  plain, so the test copy never shows a broken image. */
const PHOTO = "/media/fleet-lot.jpg";
const hasPhoto = fs.existsSync(path.join(process.cwd(), "public", PHOTO));

/**
 * Fleet and corporate rates, a slim band (test copy only, lib/preview.ts).
 * The lines drift left to right on a loop and fade in and out at the edges;
 * the call button stays put. Yellow accents by day, red at night.
 */
export function FleetBanner({ lang }: { lang: Lang }) {
  const f = dict(lang).home.fleet;
  return (
    <section className={`fleet${hasPhoto ? " fleet--photo" : ""}`} aria-label={f.label}>
      <div className="fleet__inner page">
        {hasPhoto && <span className="fleet__photo" style={{ backgroundImage: `url(${PHOTO})` }} aria-hidden="true" />}
        <p className="fleet__tag">{f.label}</p>
        <div className="fleet__window">
          <ul className="fleet__track">
            {[0, 1, 2, 3].flatMap((copy) =>
              f.lines.map((x) => (
                <li key={`${copy}-${x}`} aria-hidden={copy > 0 ? true : undefined}>{x}</li>
              )),
            )}
          </ul>
        </div>
        <a className="fleet__call" href={`tel:${business.phone.tel}`}>
          <Phone size={17} weight="bold" aria-hidden />
          <span>{f.call}</span>
        </a>
      </div>
    </section>
  );
}
