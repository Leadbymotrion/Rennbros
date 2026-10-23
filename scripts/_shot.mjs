import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1000, height: 800, deviceScaleFactor: 2 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
const el = await p.$(".foot__follow");
await el.scrollIntoView();
await el.screenshot({ path: process.argv[2] });
await b.close();
