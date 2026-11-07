#!/usr/bin/env node
/* Emulated low-end profile: 4× CPU slowdown + Slow 4G.
   This is NOT a real-device measurement; use it as a regression budget. */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8001/";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false, latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const t0 = Date.now();
await page.goto(BASE + "?year=1937", { waitUntil: "load" });
const loadMs = Date.now() - t0;
await page.waitForFunction(() => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features && window.atlasAPI.map.features.length > 0, null, { timeout: 60000 });
const readyMs = Date.now() - t0;
await page.waitForTimeout(1500);
await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
const theatre = await page.evaluate(async () => {
  const ev = window.WORLD_ATLAS.events.find((e) => e.id === "hiroshima");
  await window.atlasAPI.openEvent(ev);
  await new Promise((r) => setTimeout(r, 1200));
  const deltas = []; let last = performance.now();
  await new Promise((resolve) => {
    const start = performance.now();
    function tick(now) { deltas.push(now - last); last = now; if (now - start < 2500) requestAnimationFrame(tick); else resolve(); }
    requestAnimationFrame(tick);
  });
  deltas.sort((a, b) => a - b);
  return { avg: +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1), p95: +deltas[Math.floor(deltas.length * .95)].toFixed(1), frames: deltas.length };
});
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType("navigation")[0] || {};
  const res = performance.getEntriesByType("resource");
  const sum = (re) => res.filter((r) => re.test(r.name)).reduce((a, r) => a + (r.transferSize || 0), 0);
  return { fcp: Math.round((performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime || 0), js: sum(/\.js(\?|$)/), json: sum(/\.json(\?|$)/), total: sum(/./) };
});
console.log(JSON.stringify({ profile: "Slow 4G 1.6Mbps / 150ms + CPU 4×", mobile: true, loadMs, readyMs, theatre, nav }, null, 2));
await browser.close();
