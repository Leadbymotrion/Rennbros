import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import { business } from "@/lib/business";
import { townPage, townPageFor, townPages, nearby } from "@/lib/towns";
import { LANGS, alternates, dict, href, isLang, plain, price, servicesIn, town, type Lang } from "@/lib/i18n";
import { PageHead } from "@/components/site/PageHead";

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.flatMap((lang) => townPages.map((p) => ({ lang, town: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; town: string }> }): Promise<Metadata> {
  const { lang, town: slug } = await params;
  const tp = townPage(slug);
  if (!isLang(lang) || !tp) return {};
  const t = dict(lang);
  const name = plain(town(lang, tp.key));
  return { title: t.pages.town.title(name), description: t.pages.town.desc(name), alternates: alternates(lang, `/area/${slug}`) };
}

/** One town of the service area: what we do there, at what price, and the
 *  towns next to it. Linked from the service area page. */
export default async function Town({ params }: { params: Promise<{ lang: string; town: string }> }) {
  const { lang: l, town: slug } = await params;
  const lang = l as Lang;
  const tp = townPage(slug);
  if (!tp) notFound();
  const t = dict(lang);
  const p = t.pages.town;
  const name = town(lang, tp.key);
  const plainName = plain(name);
  return (
    <>
      <PageHead label={p.label} title={p.title(plainName)} lead={tp[lang]}>
        <div className="emerg__cta">
          <a className="btn btn--red" href={href(lang, "/book")}>
            {t.nav.book}
            <ArrowRight size={16} weight="bold" className="arrow" aria-hidden />
          </a>
          <a className="btn btn--ghost" href={`tel:${business.phone.tel}`}>
            <Phone size={20} weight="light" aria-hidden />
            <span className="num">{business.phone.display}</span>
          </a>
        </div>
      </PageHead>

      <section className="page" aria-labelledby="town-services">
        <h2 className="d2" id="town-services">{p.servicesTitle(plainName)}</h2>
        <ul className="town__services">
          {servicesIn(lang).map((s) => (
            <li key={s.slug}>
              <a href={href(lang, `/services/${s.slug}`)}>
                <span>{s.name}</span>
                <span className="num">{price(lang, s)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="page section" aria-labelledby="town-good">
        <h2 className="d2" id="town-good">{p.goodTitle}</h2>
        <div className="ready">
          {p.good.map(([title, body]) => (
            <div key={title} className="ready__item">
              <h3 className="d4">{title}</h3>
              <p>{body(plainName)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page section" aria-labelledby="town-near">
        <h2 className="d3" id="town-near">{p.nearTitle}</h2>
        <ul className="town__near">
          {nearby(tp.key).map((key) => {
            const page = townPageFor(key);
            return (
              <li key={key}>
                <a className="link" href={href(lang, page ? `/area/${page.slug}` : "/area")}>
                  <MapPin size={16} weight="light" aria-hidden />{town(lang, key)}
                </a>
              </li>
            );
          })}
        </ul>
        <p><a className="link" href={href(lang, "/area")}>{p.allTowns}</a></p>
      </section>
    </>
  );
}
