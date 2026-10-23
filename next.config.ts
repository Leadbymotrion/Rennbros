import type { NextConfig } from "next";

/**
 * Two languages, one public URL per page each.
 *
 * Every page lives at app/[lang]/…. English is served at clean URLs:
 *   - REWRITE  /services  ->  /en/services   (internal; the URL stays clean)
 *   - REDIRECT /en/…      ->  /…             (so /en/ never becomes a second
 *                                             indexable copy of every page)
 * French is simply /fr/…, matched by [lang] directly.
 *
 * Excluded from the rewrite: /fr, /en (handled by the redirect), Next's own
 * /_next, the API, and anything with a file extension (media, fonts, icons,
 * the map vendor files, robots.txt, sitemap.xml).
 */
/**
 * Content Security Policy: the only places the browser may load code, frames
 * and data from on this site. Anything else (an injected script, a skimmer
 * posting card data to a foreign server) is refused by the browser.
 *   Square Web Payments (card, Google Pay, Apple Pay, 3-D Secure), the map
 *   (OpenFreeMap tiles; Google Maps if a key is ever set), the address lookup
 *   (Photon), the VIN decoder (NHTSA) and VIN photo reader (Tesseract).
 * Next.js writes small inline scripts into every page, hence 'unsafe-inline'
 * for scripts; foreign script sources are still limited to this list.
 */
const SQUARE = "https://*.squarecdn.com https://*.squareup.com https://*.squareupsandbox.com https://*.cardinalcommerce.com";
const GOOGLE = "https://pay.google.com https://*.gstatic.com https://maps.googleapis.com https://*.googleapis.com";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ${SQUARE} ${GOOGLE} https://cdn.jsdelivr.net`,
  "style-src 'self' 'unsafe-inline' https://*.squarecdn.com https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://tiles.openfreemap.org ${SQUARE} ${GOOGLE}`,
  "font-src 'self' data: https://*.squarecdn.com https://fonts.gstatic.com",
  `connect-src 'self' https://photon.komoot.io https://vpic.nhtsa.dot.gov https://tiles.openfreemap.org https://cdn.jsdelivr.net https://tessdata.projectnaptha.com ${SQUARE} ${GOOGLE}`,
  `frame-src 'self' ${SQUARE} https://pay.google.com https://www.google.com`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "form-action 'self' https://*.squareup.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  /* Which deploy a page came from, so a home-screen copy can tell it's out of
     date (components/site/AutoUpdate.tsx). Netlify sets COMMIT_REF and
     DEPLOY_ID while building; locally it's the build time. */
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.DEPLOY_ID || process.env.COMMIT_REF || String(Date.now()),
    /* Features still being tried out show on the test copy only (NOINDEX=1 is
       set on rennbros-test alone), so staging can merge without exposing them. */
    NEXT_PUBLIC_PREVIEW: process.env.NOINDEX === "1" ? "1" : "",
  },
  /* The root layout lives in app/[lang]; global-not-found.tsx renders a
     complete page for a URL that matches nothing. */
  experimental: {
    globalNotFound: true,
    // Only the icons actually used, not the whole Phosphor set.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  devIndicators: false,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [
      // The test copy (rennbros-test) stays out of search: NOINDEX=1 is set
      // on that Netlify site only, never on the real one.
      ...(process.env.NOINDEX === "1" ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
      // Downloads as a contact card on phones.
      { source: "/rennbros.vcf", headers: [{ key: "Content-Type", value: "text/vcard; charset=utf-8" }, { key: "Content-Disposition", value: 'attachment; filename="Renn-Bros.vcf"' }] },
      {
        // Security headers on every response. No full Content-Security-Policy
        // (Square, Apple Pay, Google Pay, the map and the VIN reader load from
        // their own domains); frame-ancestors alone stops other sites from
        // framing the booking pages (clickjacking, look-alike wrappers).
        source: "/:path*",
        headers: [
          // Enforced on the test copy first; on rennbros.com it reports only
          // (browser console) until a real payment has been tried with it on.
          { key: "Content-Security-Policy", value: process.env.NOINDEX === "1" || process.env.CSP_ENFORCE === "1" ? CSP : "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests" },
          ...(process.env.NOINDEX === "1" || process.env.CSP_ENFORCE === "1" ? [] : [{ key: "Content-Security-Policy-Report-Only", value: CSP }]),
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=(), browsing-topics=(), payment=(self \"https://pay.google.com\" \"https://web.squarecdn.com\")" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
    ];
  },
  /* Don't advertise the framework in every response. */
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/en", destination: "/", permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
      // The prices now live on the services page.
      { source: "/pricing", destination: "/services", permanent: true },
      { source: "/fr/pricing", destination: "/fr/services", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // The QR-code links page: a standalone file in public/.
        { source: "/links", destination: "/links.html" },
        { source: "/", destination: "/en" },
        {
          source: "/:path((?!fr(?:/|$)|en(?:/|$)|_next/|api/|\\.well-known/)(?!.*\\.[a-zA-Z0-9]+$).+)",
          destination: "/en/:path",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
