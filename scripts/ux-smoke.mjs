#!/usr/bin/env node
/* End-to-end smoke test for the static atlas.
   Usage: python3 -m http.server 8001 --directory .   (in another shell)
          node scripts/ux-smoke.mjs
   Env: BASE_URL (default http://localhost:8001/), SKIP_CLEANUP=1 to skip the 17s timer. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8001/";
const SKIP_CLEANUP = process.env.SKIP_CLEANUP === "1";
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail) });
  console.log((ok ? "  ok  " : "  FAIL") + "  " + name + (detail ? " — " + detail : ""));
}

async function openPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
  await page.waitForTimeout(250);
  return { ctx, page, errors };
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  const desktop = await openPage(browser, { width: 1440, height: 900 });
  const d = desktop.page;

  const counts = await d.evaluate(() => ({
    events: window.WORLD_ATLAS.events.length,
    families: new Set(Object.values(window.WORLD_ATLAS.sceneVariants)).size,
    hero: window.HeroScenes.list().length,
    tierB: window.VariantScenes.list().length,
  }));
  check("events = 521", counts.events === 521, counts.events);
  check("scene families = 56", counts.families === 56, counts.families);
  check("Hero scenes = 32", counts.hero === 32, counts.hero);
  check("Tier B variants = 29", counts.tierB === 29, counts.tierB);

  const aria = await d.getAttribute("#track", "aria-valuetext");
  check("timeline slider has aria-valuetext", !!aria && /1937/.test(aria), aria);
  const y0 = await d.evaluate(() => window.atlasAPI.state.year);
  await d.focus("#track");
  await d.keyboard.press("ArrowUp");
  await d.waitForTimeout(120);
  const y1 = await d.evaluate(() => window.atlasAPI.state.year);
  check("↑ moves exactly one year", y1 === y0 + 1, y0 + " → " + y1);

  await d.click("#search");
  await d.type("#search", "卢沟桥", { delay: 20 });
  await d.waitForTimeout(350);
  await d.keyboard.press("ArrowDown");
  await d.keyboard.press("Enter");
  await d.waitForTimeout(900);
  const searched = await d.evaluate(() => ({
    ev: window.atlasAPI.state.eventView && window.atlasAPI.state.eventView.t[1],
    panel: window.atlasAPI.state.panelOpen,
    theatre: window.MapTheatre.active,
  }));
  check("search Enter opens the event panel and theatre", searched.ev === "Marco Polo Bridge Incident" && searched.panel && searched.theatre, JSON.stringify(searched));

  await d.goBack();
  await d.waitForTimeout(600);
  const back = await d.evaluate(() => ({ ev: window.atlasAPI.state.eventView, url: location.search }));
  check("browser back closes the event and restores the year view", !back.ev && back.url.indexOf("event=") < 0, JSON.stringify(back));
  await d.goForward();
  await d.waitForTimeout(700);
  const forward = await d.evaluate(() => ({ ev: window.atlasAPI.state.eventView && window.atlasAPI.state.eventView.t[1], theatre: window.MapTheatre.active }));
  check("browser forward reopens the event", forward.ev === "Marco Polo Bridge Incident" && forward.theatre, JSON.stringify(forward));

  await d.evaluate(() => document.querySelector("[data-ev-close]")?.click());
  await d.waitForTimeout(300);
  const beforeFilter = await d.evaluate(() => window.atlasAPI.map.visibleEvents().length);
  const warChip = await d.$('[data-cat-filter="war"]');
  if (warChip) await warChip.click();
  await d.waitForTimeout(350);
  const afterFilter = await d.evaluate(() => ({
    visible: window.atlasAPI.map.visibleEvents().length,
    filter: window.atlasAPI.state.catFilter,
  }));
  check("category filter changes map nodes", afterFilter.filter === "war" && afterFilter.visible < beforeFilter, beforeFilter + " → " + afterFilter.visible);

  const beforeScroll = await d.evaluate(() => {
    const b = document.querySelector("#panel-body");
    b.scrollTop = 0;
    return { z: window.atlasAPI.map.view.zoom, st: b.scrollTop };
  });
  await d.evaluate(() => { const b = document.querySelector("#panel-body"); b.scrollTop = 140; b.dispatchEvent(new Event("scroll")); });
  const afterScroll = await d.evaluate(() => ({
    z: window.atlasAPI.map.view.zoom,
    st: document.querySelector("#panel-body").scrollTop,
  }));
  check("panel scroll does not change map zoom", afterScroll.z === beforeScroll.z && afterScroll.st > 0, JSON.stringify(afterScroll));

  await d.click("#search");
  await d.type("#search", "战争", { delay: 15 });
  await d.waitForTimeout(350);
  const more = await d.$("[data-search-all]");
  if (more) await more.click();
  await d.waitForTimeout(500);
  const allSearch = await d.evaluate(() => ({
    q: window.atlasAPI.state.searchQuery,
    n: window.atlasAPI.state.searchResults.length,
    title: document.querySelector("#panel-title").textContent,
    url: location.search,
  }));
  check("search 'see all' opens the full result panel", allSearch.q === "战争" && allSearch.n > 6 && allSearch.title === "战争" && allSearch.url.indexOf("search=") >= 0, JSON.stringify(allSearch));
  await d.evaluate(() => document.querySelector("[data-search-close]")?.click());
  await d.waitForTimeout(300);

  await d.click('[data-route="silk-sea"]');
  await d.waitForTimeout(500);
  const route = await d.evaluate(() => ({
    route: window.atlasAPI.state.route,
    title: document.querySelector("#panel-title").textContent,
    rows: document.querySelectorAll("#panel-body .event-row").length,
    url: location.search,
  }));
  check("themed route opens with its events", route.route === "silk-sea" && route.rows >= 8 && route.url.indexOf("route=silk-sea") >= 0, JSON.stringify(route));
  await d.evaluate(() => document.querySelector("[data-route-close]")?.click());
  await d.waitForTimeout(300);

  await d.evaluate(() => { window.atlasAPI.state.autoEvent = false; window.atlasAPI.setYear(2026); });
  await d.waitForTimeout(700);
  const evClose = await d.$("[data-ev-close]");
  if (evClose) { await evClose.click(); await d.waitForTimeout(300); }
  const taiwan = await d.evaluate(() => {
    const list = window.HistoricalEntities.list.filter((e) => e.type === "province" && e.from <= 2026 && e.to >= 2026);
    return list.map((e) => e.name.zh);
  });
  check("Taiwan remains a province in 2026", taiwan.includes("台湾省"), taiwan.join(","));
  const modern = await d.evaluate(() => ({
    heading: Array.prototype.map.call(document.querySelectorAll("#panel-body .p-section h3"), (h) => h.textContent).find((t) => t.indexOf("现代国家") >= 0) || "",
    chips: document.querySelectorAll("#panel-body [data-country-open]").length,
    empty: !!document.querySelector("#panel-body .panel-empty"),
  }));
  check("2026 shows modern states instead of a false empty state", modern.heading.indexOf("现代国家") >= 0 && modern.chips >= 10 && !modern.empty, JSON.stringify(modern));

  check("desktop page has no console errors", desktop.errors.length === 0, desktop.errors.slice(0, 2).join(" | "));

  const mobile = await openPage(browser, { width: 390, height: 844 });
  const m = mobile.page;
  const overflow = await m.evaluate(() => ({ docW: document.documentElement.scrollWidth, win: innerWidth }));
  check("mobile 390×844 has no horizontal overflow", overflow.docW <= overflow.win, JSON.stringify(overflow));

  await m.evaluate(() => {
    const ev = window.WORLD_ATLAS.events.find((e) => e.t[1] === "Marco Polo Bridge Incident");
    window.atlasAPI.openEvent(ev);
  });
  await m.waitForTimeout(900);
  const sheet = await m.evaluate(() => ({
    open: window.atlasAPI.state.panelOpen,
    state: window.atlasAPI.state.sheet,
    theatre: window.MapTheatre.active,
    h: Math.round(document.querySelector("#side-panel").getBoundingClientRect().height),
  }));
  check("mobile node opens half sheet and theatre", sheet.open && sheet.state === "half" && sheet.theatre && sheet.h > 250, JSON.stringify(sheet));

  await m.evaluate(() => window.atlasAPI.setSheet("peek"));
  await m.waitForTimeout(400);
  const peek = await m.evaluate(() => ({
    state: window.atlasAPI.state.sheet,
    h: Math.round(document.querySelector("#side-panel").getBoundingClientRect().height),
    body: getComputedStyle(document.querySelector("#panel-body")).display,
    title: document.querySelector("#panel-title").textContent,
  }));
  check("peek state shows the event title", peek.state === "peek" && peek.h < 160 && peek.body === "none" && peek.title.includes("卢沟桥"), JSON.stringify(peek));
  const expandVisible = await m.evaluate(() => getComputedStyle(document.querySelector("#sheet-expand")).display !== "none");
  await m.click("#sheet-expand");
  await m.waitForTimeout(400);
  const expanded = await m.evaluate(() => window.atlasAPI.state.sheet);
  check("peek has a visible expand action", expandVisible && expanded === "half", expanded);

  await m.evaluate(() => window.atlasAPI.setSheet("full"));
  await m.waitForTimeout(400);
  const full = await m.evaluate(() => Math.round(document.querySelector("#side-panel").getBoundingClientRect().height));
  check("full sheet is taller than half", full > sheet.h, sheet.h + " → " + full);

  await m.evaluate(() => window.atlasAPI.setPanel(false));
  await m.waitForTimeout(300);
  await m.click("#zoom-fill");
  await m.waitForTimeout(500);
  const fill = await m.evaluate(() => ({
    mode: window.atlasAPI.map.fitMode,
    zoom: window.atlasAPI.map.view.zoom,
    pressed: document.querySelector("#zoom-fill").getAttribute("aria-pressed"),
  }));
  const fillLabel = await m.evaluate(() => document.querySelector("#zoom-fill .zf-label").textContent);
  check("mobile fill view is labelled and zooms in", fill.mode === "fill" && fill.zoom > 2 && fill.pressed === "true" && fillLabel.length > 0, JSON.stringify(fill) + " label=" + fillLabel);
  await m.click("#zoom-fit");
  await m.waitForTimeout(400);
  const world = await m.evaluate(() => ({ mode: window.atlasAPI.map.fitMode, zoom: window.atlasAPI.map.view.zoom }));
  check("full-map button restores world view", world.mode === "world" && Math.abs(world.zoom - 1) < 0.05, JSON.stringify(world));

  check("mobile page has no console errors", mobile.errors.length === 0, mobile.errors.slice(0, 2).join(" | "));

  if (!SKIP_CLEANUP) {
    await d.evaluate(() => {
      const ev = window.WORLD_ATLAS.events.find((e) => e.t[1] === "Hiroshima");
      window.atlasAPI.openEvent(ev);
    });
    await d.waitForTimeout(17200);
    const cleanup = await d.evaluate(() => ({ active: window.MapTheatre.active, units: window.MapTheatre.units.length }));
    check("theatre clears after 16 seconds", !cleanup.active && cleanup.units === 0, JSON.stringify(cleanup));
  }

  await desktop.ctx.close();
  await mobile.ctx.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log("\n" + (failed.length ? failed.length + " check(s) failed" : "all " + results.length + " checks passed"));
process.exit(failed.length ? 1 : 0);
