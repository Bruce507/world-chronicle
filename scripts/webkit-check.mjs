#!/usr/bin/env node
/* WebKit (Safari engine) regression for the static atlas.
   Usage: python3 -m http.server 8001 --directory .   (in another shell)
          node scripts/webkit-check.mjs
   Env: BASE_URL (default http://localhost:8001/), SKIP_CLEANUP=1 to skip the 17s timer.

   This is the same set of user-visible paths as the Chrome smoke suite, run on
   Playwright's WebKit build. It is NOT a real iPhone/Safari test: no iOS
   install, no Safari JIT, no real memory pressure. A pass only means the
   engine renders and the scripts run; see docs/webkit-a11y-2026-11.md.

   Service Workers are not implemented in Playwright WebKit. That part is
   reported as "not supported by this engine build", never as a pass. */
import { webkit } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8001/";
const SKIP_CLEANUP = process.env.SKIP_CLEANUP === "1";
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail) });
  console.log((ok ? "  ok  " : "  FAIL") + "  " + name + (detail ? " — " + detail : ""));
}
function note(name, detail) {
  results.push({ name, ok: true, note: true, detail: detail == null ? "" : String(detail) });
  console.log("  note  " + name + (detail ? " — " + detail : ""));
}

const browser = await webkit.launch();

async function openPage(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: "zh-CN", ...extra });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.waitForFunction(() => window.HistoricalEntities && window.HistoricalEntities.ready, null, { timeout: 20000 });
  await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

try {
  const desktop = await openPage({ width: 1440, height: 900 });
  const d = desktop.page;

  /* 1. First paint: the map, timeline and event layer are all alive. */
  await d.waitForFunction(() => window.HeroScenes && window.VariantScenes, null, { timeout: 20000 });
  const first = await d.evaluate(() => {
    const cv = document.querySelector("#map-canvas");
    const c2 = cv.getContext("2d", { willReadFrequently: true });
    const dpr = cv.width / cv.clientWidth;
    const data = c2.getImageData(0, 0, cv.width, cv.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
    return {
      painted: +(painted / (data.length / 4)).toFixed(2),
      dpr: +dpr.toFixed(2),
      year: window.atlasAPI.state.year,
      visible: window.atlasAPI.map.visibleEvents().length,
      hudYear: document.querySelector("#hud-year").textContent,
      era: document.querySelector("#hud-era").textContent,
      track: !!document.querySelector("#track").offsetParent,
    };
  });
  check("first paint: map canvas painted, timeline present, year 1937",
    first.painted > 0.5 && first.track && first.year === 1937 && first.visible > 0 && first.hudYear.indexOf("1937") >= 0,
    JSON.stringify(first));

  /* 2. Search → event panel → theatre. */
  await d.click("#search");
  await d.type("#search", "卢沟桥", { delay: 25 });
  await d.waitForTimeout(450);
  await d.keyboard.press("ArrowDown");
  await d.keyboard.press("Enter");
  await d.waitForTimeout(1200);
  const searched = await d.evaluate(() => ({
    ev: window.atlasAPI.state.eventView && window.atlasAPI.state.eventView.t[1],
    panel: window.atlasAPI.state.panelOpen,
    theatre: window.MapTheatre.active,
    title: document.querySelector("#panel-title").textContent,
    focus: document.activeElement && document.activeElement.id,
  }));
  check("search opens the Marco Polo Bridge dossier and the theatre",
    searched.ev === "Marco Polo Bridge Incident" && searched.panel && searched.theatre && /卢沟桥/.test(searched.title),
    JSON.stringify(searched));

  await d.waitForFunction(() => window.WORLD_ATLAS.eventDetails && !window.WORLD_ATLAS.detailsLoading, null, { timeout: 20000 });
  const dossier = await d.evaluate(() => ({
    sections: document.querySelectorAll(".ev-detail-section").length,
    sources: document.querySelectorAll(".ev-detail-section a[href]").length,
    summary: (document.querySelector(".ev-detail-section p") || {}).textContent || "",
    focus: document.activeElement && document.activeElement.id,
  }));
  check("event dossier loads detail sections and sources", dossier.sections >= 2 && dossier.sources >= 2 && dossier.summary.length > 20 && dossier.focus === "panel-title", JSON.stringify({ ...dossier, summary: dossier.summary.slice(0, 24) }));

  /* 3. Theatre: canvas frame count, stage geometry, then the 16 s still frame. */
  const stage = await d.evaluate(() => {
    const t = window.MapTheatre, m = window.atlasAPI.map;
    return { phase: t.phase, stage: !!t.stage, r: Math.round(t.stageR(m)), ratio: +(t.sceneTargetW(m) / Math.max(100, m.W - m.reservedRight)).toFixed(2), alpha: t.alpha };
  });
  check("theatre draws a staged scene at 28–45% of usable width", stage.stage && stage.r > 150 && stage.ratio >= 0.28 && stage.ratio <= 0.45, JSON.stringify(stage));

  if (!SKIP_CLEANUP) {
    await d.waitForTimeout(17200);
    const cleanup = await d.evaluate(() => ({
      active: window.MapTheatre.active,
      units: window.MapTheatre.units.length,
      still: !!window.MapTheatre.still,
      sceneVisible: !!document.querySelector("#scene-canvas"),
    }));
    check("theatre clears after 16 s and keeps a static last frame", !cleanup.active && cleanup.units === 0 && cleanup.still && cleanup.sceneVisible, JSON.stringify(cleanup));
  } else {
    note("theatre 16 s cleanup skipped", "SKIP_CLEANUP=1");
  }

  /* 4. Favourites: save a moment, reopen it, remove it. */
  await d.evaluate(() => { document.querySelector("[data-ev-close]")?.click(); window.atlasAPI.setYear(1500); window.atlasAPI.setPanel(true); });
  await d.waitForTimeout(500);
  await d.click("#fav-toggle");
  await d.waitForTimeout(300);
  const saved = await d.evaluate(() => ({ count: document.querySelector("#fav-count").textContent, stored: JSON.parse(localStorage.getItem("world-atlas-favorites") || "[]").length }));
  await d.click("#fav-btn");
  await d.waitForTimeout(500);
  const favPanel = await d.evaluate(() => ({ rows: document.querySelectorAll(".fav-row").length, title: document.querySelector("#panel-title").textContent }));
  check("saving and opening a favourite works", saved.stored === 1 && favPanel.rows === 1 && /收藏/.test(favPanel.title), JSON.stringify({ saved, favPanel }));

  /* 4b. The event modal (desktop "open scene" path) paints its own canvas. */
  await d.evaluate(() => {
    document.querySelector("[data-fav-close]")?.click();
    const ev = window.WORLD_ATLAS.events.find((e) => e.id === "hiroshima");
    window.atlasAPI.openEventModal(ev);
  });
  await d.waitForTimeout(1400);
  const modal = await d.evaluate(() => {
    const cv = document.querySelector("#scene-canvas");
    const c2 = cv.getContext("2d", { willReadFrequently: true });
    let painted = 0;
    if (cv.width && cv.height) {
      const data = c2.getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
      painted = +(painted / (data.length / 4)).toFixed(2);
    }
    return {
      open: !document.querySelector("#event-modal").hidden,
      w: Math.round(cv.getBoundingClientRect().width),
      h: Math.round(cv.getBoundingClientRect().height),
      painted,
      title: document.querySelector("#ev-title").textContent,
    };
  });
  check("event modal paints a full scene canvas", modal.open && modal.w > 200 && modal.h > 120 && modal.painted > 0.5 && /广岛/.test(modal.title), JSON.stringify(modal));
  await d.evaluate(() => document.querySelector("#event-modal [data-close='event']")?.click());
  await d.waitForTimeout(400);

  /* 5. WebKit-specific surface checks: CSS features the UI relies on. */
  const support = await d.evaluate(() => ({
    backdrop: CSS.supports("backdrop-filter", "blur(4px)") || CSS.supports("-webkit-backdrop-filter", "blur(4px)"),
    dvh: CSS.supports("height", "100dvh"),
    aspect: CSS.supports("aspect-ratio", "1 / 1"),
    gap: CSS.supports("gap", "4px"),
    pointer: typeof PointerEvent !== "undefined",
    resizeObserver: typeof ResizeObserver !== "undefined",
    structuredClone: typeof structuredClone === "function",
    intl: typeof Intl !== "undefined" && !!Intl.DateTimeFormat,
    safeArea: CSS.supports("padding-top", "env(safe-area-inset-top)"),
    lineClamp: CSS.supports("-webkit-line-clamp", "3"),
  }));
  check("CSS/JS features used by the UI are supported in WebKit",
    support.backdrop && support.dvh && support.aspect && support.gap && support.pointer && support.resizeObserver && support.structuredClone && support.intl && support.safeArea && support.lineClamp,
    JSON.stringify(support));

  /* 6. Mobile layout: the iOS viewport is the one Safari users actually get. */
  const mobile = await openPage({ width: 390, height: 844 });
  const m = mobile.page;
  const overflow = await m.evaluate(() => ({ docW: document.documentElement.scrollWidth, win: innerWidth, vh: innerHeight }));
  check("390×844 reflows without horizontal overflow", overflow.docW <= overflow.win, JSON.stringify(overflow));
  await m.evaluate(() => { const ev = window.WORLD_ATLAS.events.find((e) => e.t[1] === "Marco Polo Bridge Incident"); window.atlasAPI.openEvent(ev); });
  await m.waitForTimeout(1200);
  const sheet = await m.evaluate(() => {
    const cv = document.querySelector("#map-canvas");
    const c2 = cv.getContext("2d", { willReadFrequently: true });
    // Theatre units are drawn on the map canvas; sample the stage centre.
    const d = c2.getImageData(Math.round(cv.width / 2), Math.round(cv.height / 2), 1, 1).data;
    return {
      open: window.atlasAPI.state.panelOpen,
      sheet: window.atlasAPI.state.sheet,
      theatre: window.MapTheatre.active,
      units: window.MapTheatre.units.length,
      h: Math.round(document.querySelector("#side-panel").getBoundingClientRect().height),
      stagePainted: d[3] > 0,
    };
  });
  check("mobile event opens a half sheet with the theatre drawn on the map",
    sheet.open && sheet.sheet === "half" && sheet.theatre && sheet.units > 0 && sheet.h > 250 && sheet.stagePainted,
    JSON.stringify(sheet));

  /* 7. Service worker / offline shell.
     Playwright WebKit does not implement Service Workers; probe instead of assuming. */
  const sw = await m.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { api: false, reason: "navigator.serviceWorker missing" };
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((res) => setTimeout(() => res(null), 8000)),
      ]);
      return { api: true, reg: !!reg, active: !!(reg && reg.active), controller: !!navigator.serviceWorker.controller };
    } catch (err) {
      return { api: true, error: String(err).split("\n")[0] };
    }
  });
  if (!sw.api || sw.error) {
    note("service worker/offline shell: not supported by this WebKit build", JSON.stringify(sw));
  } else {
    check("service worker activates and controls the page in WebKit", sw.active && sw.controller, JSON.stringify(sw));
    if (sw.active && sw.controller) {
      const shell = await m.evaluate(async () => {
        const need = ["./", "index.html", "js/app.js", "js/data_bundle.js", "js/map.js", "data/world.geo.json", "css/style.css"];
        const out = {};
        for (const u of need) out[u] = !!(await caches.match(u, { ignoreSearch: true }));
        return out;
      });
      const missing = Object.keys(shell).filter((k) => !shell[k]);
      check("offline shell is precached", missing.length === 0, missing.length ? "missing: " + missing.join(", ") : Object.keys(shell).length + " entries");
      await mobile.ctx.setOffline(true);
      let offlineOk = false, offlineErr = "";
      try {
        await m.goto(BASE + "?year=1937&offline-check=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 30000 });
        await m.waitForFunction(() => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features && window.atlasAPI.map.features.length > 0, null, { timeout: 30000 });
        offlineOk = true;
      } catch (err) {
        offlineErr = String(err).split("\n")[0];
      }
      await mobile.ctx.setOffline(false).catch(() => {});
      check("offline navigation is served from cache", offlineOk, offlineOk ? "" : offlineErr);
    }
  }

  check("desktop page has no console errors", desktop.errors.length === 0, desktop.errors.slice(0, 3).join(" | "));
  check("mobile page has no console errors", mobile.errors.length === 0, mobile.errors.slice(0, 3).join(" | "));

  await desktop.ctx.close();
  await mobile.ctx.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log("\n" + (failed.length ? failed.length + " WebKit check(s) failed" : "all " + results.length + " WebKit checks passed"));
process.exit(failed.length ? 1 : 0);
