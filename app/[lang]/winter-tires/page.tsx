import type { Metadata } from "next";
import { ArrowRight, CalendarCheck, House, Snowflake, Wrench } from "@phosphor-icons/react/dist/ssr";
import { bySlug, TIRE_CHOICES } from "@/lib/services";
import { alternates, dict, href, isLang, plain, price, serviceIn, type Lang } from "@/lib/i18n";
import { PageHead } from "@/components/site/PageHead";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict(lang);
  return { title: t.meta.winter[0], description: plain(t.meta.winter[1]), alternates: alternates(lang, "/winter-tires") };
}

const HOW = [CalendarCheck, House, Wrench];

/** The winter-tire guide: the Québec rule, when to switch, which of the two
 *  tire services fits, and how the visit goes. Not in the top menu; linked
 *  from the tire services and the footer. */
export default async function WinterTires({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const t = dict(lang);
  const w = t.pages.winter;
  const p = t.pages.service;
  return (
    <>
      <PageHead label={w.label} title={w.title} lead={w.lead}>
        <div className="emerg__cta">
          <a className="btn btn--red" href={`${href(lang, "/book")}?service=tires`}>
            {w.book}
            <ArrowRight size={16} weight="bold" className="arrow" aria-hidden />
          </a>
        </div>
      </PageHead>

      <section className="page" aria-labelledby="when-title">
        <h2 className="d2" id="when-title">{w.rulesTitle}</h2>
        <div className="ready">
          {w.rules.map(([title, body], i) => (
            <div key={title} className="ready__item">
              {i === 0 && <Snowflake size={26} weight="light" aria-hidden className="winter__flake" />}
              <h3 className="d4">{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page section" aria-labelledby="which-title">
        <h2 className="d2" id="which-title">{w.whichTitle}</h2>
        <ul className="how__flow emerg__covers winter__which">
          {TIRE_CHOICES.map((slug) => {
            const s = serviceIn(lang, slug)!;
            return (
              <li key={slug} className="how__step">
                <h3 className="d4">{s.name}</h3>
                <p>{slug === "tires" ? p.whichSwap : p.whichMount}</p>
                <p className="num winter__price">{price(lang, bySlug(slug)!)}</p>
                <a className="link" href={href(lang, `/services/${slug}`)}>{w.see}</a>
              </li>
            );
          })}
        </ul>
        <p className="winter__unsure">{w.unsure}</p>
      </section>

      <section className="page section" aria-labelledby="home-title">
        <h2 className="d2" id="home-title">{w.howTitle}</h2>
        <ul className="how__flow emerg__covers">
          {w.how.map(([title, body], i) => {
            const Icon = HOW[i];
            return (
              <li key={title} className="how__step">
                <span className="how__icon" aria-hidden><Icon size={26} weight="light" /></span>
                <h3 className="d4">{title}</h3>
                <p>{body}</p>
              </li>
            );
          })}
        </ul>
        <div className="emerg__cta">
          <a className="btn btn--red" href={`${href(lang, "/book")}?service=tires`}>
            {w.book}
            <ArrowRight size={16} weight="bold" className="arrow" aria-hidden />
          </a>
        </div>
      </section>
    </>
  );
}
