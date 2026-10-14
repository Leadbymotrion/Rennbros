import { googleReviewHref } from "@/lib/business";

/** rennbros.com/review: the short link printed on the review card (QR code).
 *  It forwards to Google's review form, so the card never needs reprinting
 *  when the review link or Place ID is set (see googleReviewHref). */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 302, headers: { Location: googleReviewHref(), "Cache-Control": "no-store" } });
}
