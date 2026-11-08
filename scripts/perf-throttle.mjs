#!/usr/bin/env node
/* Emulated device profiles. This is NOT a real-device measurement: it exists
   to catch regressions and to expose code-level problems (it is how the
   hidden-canvas blow-up was found). Use it as a budget, not as a verdict on
   how a phone feels.
   Profiles:
     low  - low-end Android proxy: 6x CPU, DPR 3, 1.0 Mbps / 200 ms
     mid  - mid-range phone:       2x CPU, DPR 2, 4.0 Mbps / 100 ms
   Reports cold load, warm (service-worker) load, theatre frame time and the
   JS/canvas memory footprint for each profile. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8001/";
const PROFILES = {
  low: { label: "low-end Android proxy", cpu: 6, dpr: 3, latency: 200, down: 1.0, up: 0.5 },
  mid: { label: "mid-range phone", cpu: 2, dpr: 2, latency: 100, down: 4.0, up: 1.5 },
};
const only = process.env.PROFILE || "";
const READY = () => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features && window.atlasAPI.map.features.length > 0;

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-precise-memory-info", "--js-flags=--expose-gc"],
});

async function runProfile(key) {
  const cfg = PROFILES[key];
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: cfg.dpr,
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: cfg.latency,
    downloadThroughput: (cfg.down * 1024 * 1024) / 8,
    uploadThroughput: (cfg.up * 1024 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cfg.cpu });

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

  async function timedLoad() {
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
    return { loadMs, readyMs, nav, ...(await mem()) };
  }

  const cold = await timedLoad();

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

  // Second visit in the same context: the service worker is in control and
  // versioned assets come from its cache.
  await page.evaluate(() => navigator.serviceWorker.ready);
  const warm = await timedLoad();

  await ctx.close();
  return { profile: key, label: cfg.label, cpu: cfg.cpu + "x", dpr: cfg.dpr, net: cfg.down + " Mbps / " + cfg.latency + " ms", cold, warm, theatre, afterTheatre };
}

const out = [];
for (const key of Object.keys(PROFILES)) {
  if (only && only !== key) continue;
  out.push(await runProfile(key));
}
console.log(JSON.stringify({ note: "emulated profiles, not real devices", results: out }, null, 2));
await browser.close();
