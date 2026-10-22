/**
 * Where a website booking's details land in Square, against a fake Square
 * that records every request: profile fields (name, email/phone by the
 * customer's update choice, address), the car and contact custom fields, and
 * the seller note vs the customer note. Also: none of the extra steps may ever
 * fail a booking.
 * Run: npm run test:fields (npx tsx scripts/booking-fields.mts)
 */
import { square, type BookInput } from "../lib/booking/square";

type Req = { method: string; path: string; body: any };
type Opts = {
  existing?: { id: string; given_name?: string; email_address?: string; phone_number?: string; address?: object } | null;
  defs?: { key: string; name: string; visibility: string }[];
  failPhone?: boolean;
  failExtras?: boolean;
};

function fakeSquare(o: Opts = {}) {
  const reqs: Req[] = [];
  globalThis.fetch = (async (url: string, init: any) => {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body) : undefined;
    reqs.push({ method, path, body });
    const ok = (j: object) => new Response(JSON.stringify(j), { status: 200 });
    const err = (s: number) => new Response(JSON.stringify({ errors: [{ code: "BAD", detail: "nope" }] }), { status: s });
    if (path.startsWith("/v2/catalog/object/")) return ok({ object: { version: 7 } });
    if (path === "/v2/customers/search") {
      const f = body.query.filter;
      const hit = o.existing && ((f.email_address && f.email_address.exact === o.existing.email_address) || (f.phone_number && f.phone_number.exact === o.existing.phone_number));
      return ok(hit ? { customers: [o.existing] } : {});
    }
    if (path === "/v2/customers" && method === "POST") {
      if (o.failPhone && body.phone_number) return err(400);
      return ok({ customer: { id: "cust_new" } });
    }
    if (path.startsWith("/v2/customers/") && method === "PUT") return o.failExtras ? err(500) : ok({ customer: { id: path.split("/")[3] } });
    if (path.startsWith("/v2/customers/custom-attribute-definitions")) {
      if (o.failExtras) return err(500);
      return method === "GET" ? ok({ custom_attribute_definitions: o.defs ?? [] }) : ok({});
    }
    if (path === "/v2/customers/custom-attributes/bulk-upsert") return o.failExtras ? err(500) : ok({});
    if (path === "/v2/bookings" && method === "POST") return ok({ booking: { id: "bk_1", status: "PENDING", version: 0 } });
    if (path.startsWith("/v2/bookings/") && method === "PUT") return o.failExtras ? err(500) : ok({ booking: { id: "bk_1" } });
    return err(404);
  }) as typeof fetch;
  return reqs;
}

const provider = () =>
  square(
    { accessToken: "owner", environment: "sandbox", locationId: "L1", teamMemberId: "T1", serviceVariations: { "oil-change": "VAR1" } },
    { total: () => 90, each: () => 60 },
    { arrivals: [8, 9, 10], days: [1, 2, 3, 4, 5], finishBy: 17, buffer: 30 },
  );

const input = (over: Partial<BookInput> = {}): BookInput => ({
  slugs: ["oil-change"],
  slot: { startAt: "2026-11-03T13:00:00.000Z", minutes: 90 },
  customer: { givenName: "Jane", familyName: "Roy", email: "jane@example.com", phone: "(514) 555-0101", notify: { email: true, text: false } },
  address: "12 Lakeshore Rd, Beaconsfield",
  place: { address_line_1: "12 Lakeshore Rd", locality: "Beaconsfield", administrative_district_level_1: "QC", postal_code: "H9W 4H1", country: "CA" },
  note: "Services: oil-change\nVehicle: 2019 Honda Civic\nParking: Driveway",
  customerNote: "Gate code 1234",
  vehicle: { year: "2019", make: "Honda", model: "Civic", vin: "1HGBH41JXMN109186" },
  lang: "fr",
  idempotencyKey: "bk-test",
  ...over,
});

let failed = 0;
const check = (name: string, cond: unknown) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failed++;
};
const find = (reqs: Req[], method: string, start: string) => reqs.find((r) => r.method === method && r.path.startsWith(start));
const created = (reqs: Req[]) => reqs.find((r) => r.method === "POST" && r.path === "/v2/customers");

// 1 · New customer who wants email only.
{
  const reqs = fakeSquare();
  const r = await provider().book(input());
  const made = created(reqs)!.body;
  check("1 booking made", r.id === "bk_1");
  check("1 profile: first and last name", made.given_name === "Jane" && made.family_name === "Roy");
  check("1 profile: email in the email field", made.email_address === "jane@example.com");
  check("1 profile: no phone (customer chose email only)", !("phone_number" in made));
  check("1 profile: address in the address field", made.address?.locality === "Beaconsfield" && made.address?.postal_code === "H9W 4H1");
  const upd = find(reqs, "PUT", "/v2/bookings/bk_1")!.body.booking;
  check("1 booking: details in the seller note", upd.seller_note.includes("Vehicle: 2019 Honda Civic"));
  check("1 booking: customer note = what the customer wrote", upd.customer_note === "Gate code 1234");
  check("1 booking: updated with Square's version", upd.version === 0);
  const defs = reqs.filter((x) => x.method === "POST" && x.path === "/v2/customers/custom-attribute-definitions").map((x) => x.body.custom_attribute_definition.name);
  check("1 custom fields created: Vehicle, VIN, Updates by, Other contact", ["Vehicle", "VIN", "Updates by", "Other contact (no updates)"].every((n) => defs.includes(n)));
  const vals = Object.values(find(reqs, "POST", "/v2/customers/custom-attributes/bulk-upsert")!.body.values).map((v: any) => [v.custom_attribute.key, v.custom_attribute.value]);
  const val = (k: string) => vals.find(([key]) => key === k)?.[1];
  check("1 field: Vehicle = 2019 Honda Civic", val("rennbros-vehicle") === "2019 Honda Civic");
  check("1 field: VIN", val("rennbros-vin") === "1HGBH41JXMN109186");
  check("1 field: Updates by = email only · French", val("rennbros-updates") === "Email only (no texts) · French");
  check("1 field: phone kept in Other contact", val("rennbros-other-contact") === "Phone: (514) 555-0101");
}

// 2 · Text only: phone stored in Square's format, email goes to Other contact.
{
  const reqs = fakeSquare();
  await provider().book(input({ customer: { givenName: "Marc", email: "marc@example.com", phone: "514.555.0199", notify: { email: false, text: true } } }));
  const made = created(reqs)!.body;
  check("2 profile: phone as +15145550199", made.phone_number === "+15145550199");
  check("2 profile: no email (customer chose text only)", !("email_address" in made));
}

// 3 · Returning customer: only empty fields are filled, nothing overwritten.
{
  const reqs = fakeSquare({ existing: { id: "cust_old", given_name: "Janet", email_address: "jane@example.com" } });
  const r = await provider().book(input({ customer: { givenName: "Jane", familyName: "Roy", email: "jane@example.com", phone: "5145550101", notify: { email: true, text: true } } }));
  check("3 no duplicate customer created", !created(reqs));
  const put = find(reqs, "PUT", "/v2/customers/cust_old")!.body;
  check("3 shop's spelling of the first name kept", !("given_name" in put));
  check("3 missing last name, phone and address filled", put.family_name === "Roy" && put.phone_number === "+15145550101" && put.address?.address_line_1 === "12 Lakeshore Rd");
  check("3 booking for the existing customer", r.customerId === "cust_old");
}

// 4 · The shop already has a "Vehicle" field: use it, don't make a second one.
{
  const reqs = fakeSquare({ defs: [{ key: "sq0idp-APP:vehicle-field", name: "vehicle", visibility: "VISIBILITY_READ_WRITE_VALUES" }] });
  await provider().book(input());
  const created = reqs.filter((x) => x.method === "POST" && x.path === "/v2/customers/custom-attribute-definitions").map((x) => x.body.custom_attribute_definition.name);
  check("4 no second Vehicle field", !created.includes("Vehicle"));
  const keys = Object.values(find(reqs, "POST", "/v2/customers/custom-attributes/bulk-upsert")!.body.values).map((v: any) => v.custom_attribute.key);
  check("4 car saved in the shop's own Vehicle field", keys.includes("sq0idp-APP:vehicle-field"));
}

// 5 · Square refuses the phone: the profile and booking still go through.
{
  const reqs = fakeSquare({ failPhone: true });
  const r = await provider().book(input({ customer: { givenName: "Ana", email: "ana@example.com", phone: "5145550111", notify: { email: true, text: true } } }));
  check("5 booking made even though Square refused the phone", r.id === "bk_1");
  check("5 profile retried without the phone", reqs.filter((x) => x.method === "POST" && x.path === "/v2/customers").length === 2);
}

// 6 · Square fails on every extra step: the booking still stands.
{
  fakeSquare({ failExtras: true });
  const p = square(
    { accessToken: "owner", environment: "sandbox", locationId: "L1", teamMemberId: "T1", serviceVariations: { "oil-change": "VAR1" } },
    { total: () => 90, each: () => 60 },
    { arrivals: [8, 9, 10], days: [1, 2, 3, 4, 5], finishBy: 17, buffer: 30 },
  );
  const quiet = console.warn;
  console.warn = () => {};
  const r = await p.book(input()).catch((e) => e);
  console.warn = quiet;
  check("6 booking returned although notes and fields failed", r?.id === "bk_1");
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
