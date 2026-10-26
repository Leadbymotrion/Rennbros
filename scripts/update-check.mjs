/**
 * The home-screen update check (components/site/AutoUpdate.tsx), end to end:
 * a normal tab never checks; a home-screen open (?source=homescreen) drops
 * the marker and checks; no reload when nothing changed; exactly one reload
 * when the deploy changed; none while a form or popup is open.
 *   SITE_URL=http://localhost:3100 node scripts/update-check.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.SITE_URL ?? "http://localhost:3100";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let failed = 0;
const ok = (c, name, info = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${info ? `  (${info})` : ""}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(path, { changed = () => false } = {}) {
  const p = await b.newPage();
  const errors = [], heads = [];
  let loads = 0;
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && !/Content Security Policy|report-only/i.test(m.text()) && errors.push(m.text()));
  p.on("load", () => loads++);
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    if (r.url().endsWith("/api/version") && r.method() === "HEAD") {
      heads.push(Date.now());
      if (changed()) return r.respond({ status: 200, headers: { etag: '"a-newer-deploy"', "cache-control": "no-store" }, body: "" });
    }
    r.continue();
  });
  await p.goto(BASE + path, { waitUntil: "networkidle2" });
  await wait(800);
  return { p, errors, heads, loads: () => loads };
}
const backToFront = (p) => p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
const makeDue = (p) => p.evaluate(() => localStorage.setItem("rennbros.updateCheckedAt", String(Date.now() - 49 * 3600e3)));

// 1. Normal browser tab: the checker doesn't run.
{
  const { p, errors, heads } = await open("/?lang=x#top");
  await makeDue(p); await backToFront(p); await wait(800);
  ok(heads.length === 0, "normal tab: no version checks at all");
  ok(errors.length === 0, "normal tab: no console errors", errors.join(" | "));
  await p.close();
}

// 2–5. Home-screen open.
{
  let change = false;
  const { p, errors, heads, loads } = await open("/?source=homescreen&ref=qr#menu", { changed: () => change });
  const url = new URL(p.url());
  ok(!url.searchParams.has("source") && url.searchParams.get("ref") === "qr" && url.hash === "#menu", "home screen: marker gone from the address bar, other parameter and #hash kept", p.url());
  ok(heads.length === 1, "home screen: fingerprint taken on load", `${heads.length} HEAD`);

  await backToFront(p); await wait(600);
  ok(heads.length === 1, "home screen: no second check within 48 h of the last one");

  await makeDue(p); await backToFront(p); await wait(800);
  ok(heads.length === 2 && loads() === 1, "48 h later, nothing changed: checks, no reload", `loads ${loads()}`);

  // A form or popup open: no reload even though the deploy changed.
  change = true;
  await makeDue(p);
  await p.evaluate(() => { const d = document.createElement("dialog"); d.id = "t"; d.textContent = "x"; document.body.append(d); d.showModal(); });
  await backToFront(p); await wait(800);
  ok(loads() === 1, "popup open, deploy changed: no reload");
  await p.evaluate(() => document.getElementById("t").close());

  // Typing in a field: no reload.
  await p.evaluate(() => { const i = document.createElement("input"); i.id = "ti"; document.body.append(i); i.focus(); });
  await backToFront(p); await wait(800);
  ok(loads() === 1, "typing in a field, deploy changed: no reload");
  await p.evaluate(() => { document.activeElement.blur(); document.getElementById("ti").remove(); });

  // Deploy changed, nothing open: exactly one reload.
  await makeDue(p); await backToFront(p); await wait(2500);
  ok(loads() === 2, "deploy changed: exactly one reload", `loads ${loads()}`);
  await backToFront(p); await wait(1200);
  ok(loads() === 2, "after the reload: no reload loop", `loads ${loads()}`);
  ok(errors.length === 0, "home screen: no console errors", errors.join(" | "));
  await p.close();
}

await b.close();
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
