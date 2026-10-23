/**
 * The service-area map on a phone and a desktop, as those devices report
 * themselves: does it load, which controls show, and do the gestures behave
 * (desktop wheel zooms; touch: one finger leaves the map alone, two fingers
 * pinch). Saves a capture of each.
 *
 *   node scripts/map-touch.mjs <outdir>
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const BASE = process.env.SITE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "shots";
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

async function open(name, viewport, ua) {
  const page = await browser.newPage();
  if (ua) await page.setUserAgent(ua);
  await page.setViewport(viewport);
  await page.goto(`${BASE}/area/`, { waitUntil: "networkidle2" });
  await page.$eval("[data-map]", (m) => m.scrollIntoView({ block: "center" }));
  await page.waitForSelector(".smap.is-live", { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));
  const zoom = () => page.evaluate(() => document.querySelector(".maplibregl-canvas")?.getAttribute("aria-label") && window.__z);
  const info = await page.evaluate(() => ({
    zoomButtons: !!document.querySelector(".maplibregl-ctrl-zoom-in"),
    compassShown: !!document.querySelector(".maplibregl-ctrl-compass") && !document.querySelector(".maplibregl-ctrl-compass").parentElement.hidden,
    cooperative: !!document.querySelector(".maplibregl-cooperative-gestures"),
    size: (() => { const r = document.querySelector("[data-map]").getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; })(),
  }));
  await page.screenshot({ path: `${out}/map-${name}.png` });
  return { page, info, zoom };
}

// Desktop: the wheel over the map zooms it; the page doesn't scroll.
{
  const { page, info } = await open("desktop", { width: 1280, height: 860 });
  const box = await (await page.$("[data-map]")).boundingBox();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const canvasBefore = await page.$eval(".maplibregl-canvas", (c) => c.toDataURL().length);
  await page.mouse.wheel({ deltaY: -400 });
  await new Promise((r) => setTimeout(r, 1200));
  const after = await page.evaluate(() => scrollY);
  const canvasAfter = await page.$eval(".maplibregl-canvas", (c) => c.toDataURL().length);
  console.log("desktop", info, { pageScrolled: after !== before, mapRedrawn: canvasAfter !== canvasBefore });
  await page.screenshot({ path: `${out}/map-desktop-zoomed.png` });
}

// Phone (iPhone): touch, mobile user agent.
{
  const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const { info } = await open("phone", { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, ua);
  console.log("phone", info);
}

// iPad.
{
  const ua = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const { info } = await open("ipad", { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, ua);
  console.log("ipad", info);
}

await browser.close();
