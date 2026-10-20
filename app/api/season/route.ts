import { seasonOn } from "@/lib/season";

/** GET /api/season: the season the home hero is showing right now (same
 *  schedule and HERO_SEASON_OVERRIDE), for the standalone links page. */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify({ season: seasonOn() }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300" },
  });
}
