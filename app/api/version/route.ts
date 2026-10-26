/**
 * /api/version: the deploy that's live now. Its ETag is the deploy id, so it
 * changes only when Netlify publishes a new version (page ETags also change
 * when the hourly home page regenerates). AutoUpdate fingerprints it with a
 * HEAD request.
 */
export const dynamic = "force-dynamic";

const build = () => process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const headers = () => ({ "content-type": "application/json", "cache-control": "no-store", etag: `"${build()}"` });

export function GET() {
  return new Response(JSON.stringify({ build: build() }), { headers: headers() });
}

export function HEAD() {
  return new Response(null, { headers: headers() });
}
