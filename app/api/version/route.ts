/** GET /api/version: the build that's live now, for AutoUpdate to compare with. */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "" }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
