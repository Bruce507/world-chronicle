#!/usr/bin/env node
/* Emulated low-end profile: 4× CPU slowdown + Slow 4G + DPR 3.
   This is NOT a real-device measurement; use it as a regression budget.
   Reports cold load, warm (service-worker) load, theatre frame time and the
   JS/canvas memory footprint so a regression is visible without hardware. */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8001/";
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-precise-memory-info", "--js-flags=--expose-gc"],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
const slow = {
  offline: false, latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};
await cdp.send("Network.emulateNetworkConditions", slow);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const READY = () => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features && window.atlasAPI.map.features.length > 0;
const mem = () => page.evaluate(() => {
  const m = performance.memory || {};
  const cv = (id) => { const c = document.querySelector(id); return c ? c.width * c.height * 4 : 0; };
  return {
    jsHeapMB: m.usedJSHeapSize ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null,
    jsHeapTotalMB: m.totalJSHeapSize ? +(m.totalJSHeapSize / 1048576).toFixed(1) : null,
    canvasMB: +((cv("#map-canvas") + cv("#fx-canvas") + cv("#minimap-canvas") + cv("#tick-canvas") + cv("#scene-canvas")) / 1048576).toFixed(1),
    dpr: window.devicePixelRatio,
    mapDpr: window.atlasAPI.map.dpr,
  };
});

async function timedLoad(label) {
  const t0 = Date.now();
  await page.goto(BASE + "?year=1937", { waitUntil: "load" });
  const loadMs = Date.now() - t0;
  await page.waitForFunction(READY, null, { timeout: 90000 });
  const readyMs = Date.now() - t0;
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
  const nav = await page.evaluate(() => {
    const res = performance.getEntriesByType("resource");
    const sum = (re) => res.filter((r) => re.test(r.name)).reduce((a, r) => a + (r.transferSize || 0), 0);
    return {
      fcp: Math.round((performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime || 0),
      js: sum(/\.js(\?|$)/), json: sum(/\.json(\?|$)/), total: sum(/./),
      sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    };
  });
  return { label, loadMs, readyMs, nav, ...(await mem()) };
}

const cold = await timedLoad("cold");

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
const afterTheatre = await mem();

// Second visit in the same context: the service worker is now in control and
// versioned assets are served from cache (stale-while-revalidate).
await page.evaluate(() => navigator.serviceWorker.ready);
const warm = await timedLoad("warm");

console.log(JSON.stringify({
  profile: "Slow 4G 1.6Mbps / 150ms + CPU 4× + DPR 3 (emulated, not a real device)",
  mobile: true,
  cold, warm, theatre, afterTheatre,
}, null, 2));
await browser.close();
