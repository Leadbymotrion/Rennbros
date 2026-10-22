import type { MetadataRoute } from "next";
import { business } from "@/lib/business";

/** Crawlers that copy whole sites for AI training, content scraping or SEO
 *  harvesting. robots.txt is honoured by reputable bots only; it is a clear
 *  "no" on record, not a lock. Search engines (Google, Bing) stay allowed. */
const BLOCKED = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai",
  "CCBot", "Google-Extended", "Applebot-Extended", "PerplexityBot", "Bytespider",
  "Amazonbot", "meta-externalagent", "FacebookBot", "Diffbot", "ImagesiftBot",
  "Omgilibot", "cohere-ai", "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot",
  "PetalBot", "DataForSeoBot", "BLEXBot", "HTTrack", "Wget", "SiteSucker",
];

export default function robots(): MetadataRoute.Robots {
  // The test copy (rennbros-test): closed to every crawler.
  if (process.env.NOINDEX === "1") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/book/received", "/review", "/fr/review"] },
      { userAgent: BLOCKED, disallow: "/" },
    ],
    sitemap: `https://${business.domain.toLowerCase()}/sitemap.xml`,
  };
}
