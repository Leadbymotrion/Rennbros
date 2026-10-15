import { provider, earliest, pickServices } from "@/lib/booking/config";
import { SquareError } from "@/lib/booking/square";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?services=brakes,oil-change&days=31
 * Open arrival windows for a visit made of those services, back to back.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // ?check=services: which configured Square services still exist (no ids or secrets returned).
  if (url.searchParams.get("check") === "services") {
    const p = provider();
    try {
      return json({ provider: p.name, services: p.checkServices ? await p.checkServices() : null });
    } catch (e) {
      return json({ error: "check_failed", status: e instanceof SquareError ? e.status : null }, 502);
    }
  }
  const slugs = pickServices((url.searchParams.get("services") ?? url.searchParams.get("service") ?? "").split(","));
  if (!slugs) return json({ error: "unknown_service" }, 400);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 21, 1), 31);
  const p = provider();
  try {
    const from = earliest();
    const slots = (await p.availability(slugs, from, days)).filter((s) => new Date(s.startAt) >= from);
    return json({ live: p.live, provider: p.name, slots });
  } catch (e) {
    console.error("[availability]", e);
    // Square's own error code (never credentials), so a failure can be
    // diagnosed from the response when the function logs aren't at hand.
    const reason =
      e instanceof SquareError
        ? { status: e.status, codes: (Array.isArray(e.detail) ? e.detail : []).map((x: { code?: string; field?: string }) => [x.code, x.field].filter(Boolean).join(" ")) }
        : { message: e instanceof Error ? e.message.slice(0, 120) : "error" };
    return json({ error: "unavailable", reason }, 502);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
