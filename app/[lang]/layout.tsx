import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { business } from "@/lib/business";
import { LANGS, alternates, dict, isLang, plain } from "@/lib/i18n";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileBar } from "@/components/site/MobileBar";
import { Chrome } from "@/components/site/Chrome";
import { AutoUpdate } from "@/components/site/AutoUpdate";
import { StructuredData } from "@/components/site/StructuredData";
import { clash, general } from "../fonts";
import { PREVIEW } from "@/lib/preview";
import { FleetBanner } from "@/components/home/FleetBanner";
import { HomeOnly } from "@/components/home/HomeOnly";
import "../globals.css";
import "../site.css";
import "../sections.css";
import "../pages.css";

/* Both languages are built; nothing else is a language. */
export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict(lang);
  return {
    metadataBase: new URL(`https://${business.domain.toLowerCase()}`),
    title: { default: plain(t.meta.homeTitle), template: `%s — ${business.name}` },
    description: plain(t.meta.homeDescription),
    alternates: alternates(lang, "/"),
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "32x32" }, { url: "/favicon.svg", type: "image/svg+xml" }],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    // Saved to a phone's home screen, the site opens full screen like an app.
    appleWebApp: { capable: true, title: "Renn Bros", statusBarStyle: "default" },
    openGraph: {
      siteName: business.name,
      locale: lang === "fr" ? "fr_CA" : "en_CA",
      type: "website",
      images: [{ url: "/og.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#f5f6f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* Runs before first paint: marks JS as present and applies a stored dark
   theme, so a dark visit never flashes light. */
// Safety net: a page caught mid-deploy can point at the previous build's
// stylesheet and load unstyled. If the site's design tokens are missing once
// the page has loaded, reload once (never more than once a minute).
const boot = `document.documentElement.classList.add("js");try{if(localStorage.getItem("rennbros.theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}
addEventListener("load",function(){try{if(getComputedStyle(document.documentElement).getPropertyValue("--color-paper").trim())return;var k="rennbros.cssReload",t=+sessionStorage.getItem(k)||0;if(Date.now()-t<6e4)return;sessionStorage.setItem(k,String(Date.now()));location.reload()}catch(e){}});`;

/* Test copy only (lib/preview.ts): the first visit opens in the visitor's
   language, read from the phone's or computer's language settings (the
   browser reports them): English stays English, French opens the French
   site, and any other language opens French too (Québec). After that, the
   visitor's own pick with the EN/FR link always wins. Only plain page
   visits are redirected; search engines index both languages as they are. */
const frenchFirst = `try{var k="rennbros.lang";document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[hreflang]");if(a)localStorage.setItem(k,a.getAttribute("hreflang"))},true);if(!localStorage.getItem(k)&&!/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)){var l=((navigator.languages&&navigator.languages[0])||navigator.language||"").toLowerCase(),want=/^en(-|_|$)/.test(l)?"en":"fr",here=document.documentElement.lang.slice(0,2);localStorage.setItem(k,want);if(want!==here){var p=location.pathname,to=want==="fr"?"/fr"+(p==="/"?"":p):(p==="/fr"||p.indexOf("/fr/")===0?p.slice(3)||"/":p);location.replace(to+location.search+location.hash)}}}catch(e){}`;

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  return (
    <html lang={t.locale} className={`${clash.variable} ${general.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREVIEW ? boot + frenchFirst : boot }} />
        <StructuredData lang={lang} />
      </head>
      <body>
        <a className="skip" href="#main">{t.nav.skip}</a>
        <span className="edge-sentinel edge-sentinel--top" aria-hidden="true" />
        <span className="edge-sentinel edge-sentinel--fold" aria-hidden="true" />
        {PREVIEW && <HomeOnly><FleetBanner lang={lang} /></HomeOnly>}
        <SiteHeader lang={lang} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter lang={lang} />
        <MobileBar lang={lang} />
        <span className="edge-sentinel edge-sentinel--end" aria-hidden="true" />
        <Chrome label={t.nav.top} />
        <AutoUpdate />
      </body>
    </html>
  );
}
