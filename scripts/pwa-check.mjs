#!/usr/bin/env node
/* PWA smoke: manifest, icons, service worker activation and an offline reload. */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8001/";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const check = (n, ok, d) => { console.log((ok ? "  ok  " : "  FAIL") + "  " + n + (d ? " — " + d : "")); if (!ok) process.exitCode = 1; };
await page.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const manifest = await page.evaluate(async () => {
  const r = await fetch("manifest.json"); const j = await r.json();
  const icons = await Promise.all(j.icons.map(async (i) => (await fetch(i.src)).status));
  return { status: r.status, name: j.name, icons };
});
check("manifest.json and icons are reachable", manifest.status === 200 && manifest.icons.every((s) => s === 200), JSON.stringify(manifest));
const sw = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return null;
  const r = await navigator.serviceWorker.ready;
  return r.active ? r.active.state : null;
});
check("service worker activates", sw === "activated", sw);
await ctx.setOffline(true);
let offlineOk = false;
try {
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features.length > 0, null, { timeout: 30000 });
  offlineOk = true;
} catch (err) { offlineOk = false; }
check("offline reload still shows the map", offlineOk, "");
check("no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
