import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8001/";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(BASE + "?year=1937", { waitUntil: "load" });
const loadMs = Date.now() - t0;
await page.waitForFunction(() => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features && window.atlasAPI.map.features.length > 0, null, { timeout: 30000 });
const readyMs = Date.now() - t0;
await page.waitForTimeout(800);
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType("navigation")[0] || {};
  const res = performance.getEntriesByType("resource");
  const sum = (re) => res.filter((r) => re.test(r.name)).reduce((a, r) => a + (r.transferSize || 0), 0);
  return {
    dom: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0),
    fcp: Math.round((performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime || 0),
    jsBytes: sum(/\.js/), jsonBytes: sum(/\.json/), totalBytes: sum(/./),
    resources: res.length,
  };
});
const zoom = await page.evaluate(async () => {
  const m = window.atlasAPI.map;
  const t = performance.now();
  for (let i = 0; i < 6; i++) m.zoomAt(1.25, m.W / 2, m.H / 2);
  return Math.round(performance.now() - t);
});
const all = await page.evaluate(() => {
  const m = window.atlasAPI.map;
  m.setYear(2026);
  m.toggles.allEvents = true;
  m.view.zoom = 1; m.view.panX = 0; m.view.panY = 0;
  m._clustersKey = "";
  const t = performance.now();
  for (let i = 0; i < 3; i++) { m._clustersKey = ""; m.drawBase(); }
  const base = performance.now() - t;
  const t2 = performance.now();
  m._clustersKey = "";
  m._drawPins(m.fx, performance.now());
  const pins = performance.now() - t2;
  const t3 = performance.now();
  for (let i = 0; i < 3; i++) { m._clustersKey = ""; m._clusters(); }
  const clusters = performance.now() - t3;
  const n = m.visibleEvents().length;
  m.toggles.allEvents = false;
  return { drawBase: Math.round(base / 3), pins: Math.round(pins), clusters: Math.round(clusters / 3), events: n };
});
const theatre = await page.evaluate(async () => {
  const ev = window.WORLD_ATLAS.events.find((e) => e.id === "hiroshima");
  window.atlasAPI.openEvent(ev);
  await new Promise((r) => setTimeout(r, 900));
  const deltas = [];
  let last = performance.now();
  await new Promise((resolve) => {
    const start = performance.now();
    function tick(now) {
      deltas.push(now - last); last = now;
      if (now - start < 2500) requestAnimationFrame(tick); else resolve();
    }
    requestAnimationFrame(tick);
  });
  deltas.sort((a, b) => a - b);
  return {
    avg: +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1),
    p95: +deltas[Math.floor(deltas.length * 0.95)].toFixed(1),
    max: +Math.max(...deltas).toFixed(1),
    frames: deltas.length,
  };
});
const mobile = await (async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  const s = Date.now();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForFunction(() => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features.length > 0, null, { timeout: 30000 });
  const r = { readyMs: Date.now() - s };
  await c.close();
  return r;
})();
console.log(JSON.stringify({ loadMs, readyMs, nav, zoomMs: zoom, all, theatre, mobile }, null, 2));
await browser.close();
