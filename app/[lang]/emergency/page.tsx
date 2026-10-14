import type { Metadata } from "next";
import { BatteryWarning, ChatText, Key, Phone, Tire, Warning } from "@phosphor-icons/react/dist/ssr";
import { business } from "@/lib/business";
import { alternates, dict, isLang, plain, type Lang } from "@/lib/i18n";
import { PageHead } from "@/components/site/PageHead";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict(lang);
  return { title: t.meta.emergency[0], description: plain(t.meta.emergency[1]), alternates: alternates(lang, "/emergency") };
}

const ICONS = [BatteryWarning, Tire, Key];

/** Same-day emergencies, by phone only: what we cover, and what to expect
 *  (same day, not immediate; premium price agreed on the phone). */
export default async function Emergency({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const t = dict(lang);
  const e = t.pages.emergency;
  return (
    <>
      <PageHead label={e.label} title={e.title} lead={e.lead}>
        <div className="emerg__cta">
          <a className="btn btn--red" href={`tel:${business.phone.tel}`}>
            <Phone size={20} weight="bold" aria-hidden />
            {e.call} · <span className="num">{business.phone.display}</span>
          </a>
          <a className="btn btn--ghost" href={`sms:${business.phone.tel}`}>
            <ChatText size={20} weight="light" aria-hidden />
            {e.text}
          </a>
        </div>
      </PageHead>

      <section className="page" aria-labelledby="covers-title">
        <h2 className="d2" id="covers-title">{e.coversTitle}</h2>
        <ul className="how__flow emerg__covers">
          {e.covers.map(([title, body], i) => {
            const Icon = ICONS[i];
            return (
              <li key={title} className="how__step">
                <span className="how__icon" aria-hidden><Icon size={26} weight="light" /></span>
                <h3 className="d4">{title}</h3>
                <p>{body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="page section" aria-labelledby="before-title">
        <h2 className="d2" id="before-title">{e.howTitle}</h2>
        <div className="ready">
          {e.how.map(([title, body]) => (
            <div key={title} className="ready__item">
              <h3 className="d4">{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
        <p className="emerg__safety"><Warning size={20} weight="bold" aria-hidden />{e.safety}</p>
        <div className="emerg__cta">
          <a className="btn btn--red" href={`tel:${business.phone.tel}`}>
            <Phone size={20} weight="bold" aria-hidden />
            {e.call} · <span className="num">{business.phone.display}</span>
          </a>
        </div>
      </section>
    </>
  );
}
