#!/usr/bin/env node
/* End-to-end smoke test for the static atlas.
   Usage: python3 -m http.server 8001 --directory .   (in another shell)
          node scripts/ux-smoke.mjs
   Env: BASE_URL (default http://localhost:8001/), SKIP_CLEANUP=1 to skip the 17s timer. */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:8001/";
const SKIP_CLEANUP = process.env.SKIP_CLEANUP === "1";
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail) });
  console.log((ok ? "  ok  " : "  FAIL") + "  " + name + (detail ? " — " + detail : ""));
  // On CI, surface each failed check as a GitHub annotation: job logs need
  // admin rights to read, annotations are visible on the run summary.
  if (!ok && process.env.GITHUB_ACTIONS) {
    const msg = (name + (detail ? " — " + detail : "")).replace(/%/g, "%25").replace(/\r?\n/g, " ").slice(0, 900);
    console.log("::error title=smoke::" + msg);
  }
}

async function openPage(browser, viewport) {
  // The assertions below are written against the Chinese interface; without
  // this the CI runner's en-US browser renders English and they fail.
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "zh-CN" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await page.waitForFunction(() => window.HistoricalEntities && window.HistoricalEntities.ready, null, { timeout: 20000 });
  await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
  await page.waitForTimeout(250);
  return { ctx, page, errors };
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  const desktop = await openPage(browser, { width: 1440, height: 900 });
  const d = desktop.page;

  await d.waitForFunction(() => window.HeroScenes && window.VariantScenes, null, { timeout: 15000 });
  const counts = await d.evaluate(() => ({
    events: window.WORLD_ATLAS.events.length,
    families: new Set(Object.values(window.WORLD_ATLAS.sceneVariants)).size,
    hero: window.HeroScenes.list().length,
    tierB: window.VariantScenes.list().length,
  }));
  check("events = 521", counts.events === 521, counts.events);
  check("scene families = 56", counts.families === 56, counts.families);
  check("Hero scenes = 32", counts.hero === 32, counts.hero);
  check("Tier B variants = 57", counts.tierB === 57, counts.tierB);

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
  await d.waitForFunction(() => window.WORLD_ATLAS.eventDetails && !window.WORLD_ATLAS.detailsLoading, null, { timeout: 15000 });
  const detailsState = await d.evaluate(() => ({ n: Object.keys(window.WORLD_ATLAS.eventDetails || {}).length, loading: !!window.WORLD_ATLAS.detailsLoading }));
  check("event details load lazily and completely (112)", detailsState.n === 112 && !detailsState.loading, JSON.stringify(detailsState));

  const focusOnOpen = await d.evaluate(() => document.activeElement && document.activeElement.id);
  check("opening an event moves focus to the panel title", focusOnOpen === "panel-title", focusOnOpen);

  const actions = await d.evaluate(() => {
    const top = [...document.querySelectorAll(".ev-detail-actions > button")].map((b) => b.textContent.trim());
    return {
      top,
      sub: document.querySelector("#panel-sub").textContent,
      more: document.querySelectorAll(".ev-more-menu button").length,
      details: !!document.querySelector(".ev-more summary"),
    };
  });
  check("event panel has two primary actions plus a more menu", actions.top.length === 2 && actions.details && actions.more >= 3 && actions.sub.indexOf("Marco Polo") < 0, JSON.stringify(actions));
  await d.focus(".ev-more summary");
  await d.keyboard.press("Enter");
  await d.waitForTimeout(150);
  const menuOpen = await d.evaluate(() => document.querySelector(".ev-more").open);
  await d.keyboard.press("Escape");
  await d.waitForTimeout(120);
  const menuClosed = await d.evaluate(() => !document.querySelector(".ev-more").open);
  check("more menu is keyboard operable and closes on Escape", menuOpen && menuClosed, JSON.stringify({ menuOpen, menuClosed }));

  const stage = await d.evaluate(() => {
    const t = window.MapTheatre, m = window.atlasAPI.map;
    const usable = Math.max(100, m.W - m.reservedRight);
    return {
      phase: t.phase, stage: !!t.stage,
      r: Math.round(t.stageR(m)),
      ratio: +(t.sceneTargetW(m) / usable).toFixed(2),
      farLabel: +t.labelWeight(2, 2).toFixed(2),
    };
  });
  check("theatre has a unified stage at 28–45% of usable width", stage.stage && stage.r > 150 && stage.ratio >= 0.28 && stage.ratio <= 0.45, JSON.stringify(stage));
  check("map labels recede outside the stage while theatre is open", stage.farLabel <= 0.2, stage.farLabel);

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
  const focusBack = await d.evaluate(() => ({ id: document.activeElement && document.activeElement.id, cls: document.activeElement && document.activeElement.className }));
  check("closing the event returns focus to the trigger or map node", focusBack.id === "search" || String(focusBack.cls).indexOf("a11y-node") >= 0 || focusBack.id === "track", JSON.stringify(focusBack));
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

  await d.click("[data-route-strip-toggle]");
  await d.waitForTimeout(200);
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
  await d.click("[data-route-strip-toggle]");
  await d.waitForTimeout(200);
  const routeChips = await d.evaluate(() => document.querySelectorAll("[data-route]").length);
  check("six themed routes are available", routeChips === 6, routeChips);

  await d.evaluate(() => { window.atlasAPI.state.autoEvent = false; window.atlasAPI.setYear(2026); });
  await d.waitForTimeout(700);
  const evClose = await d.$("[data-ev-close]");
  if (evClose) { await evClose.click(); await d.waitForTimeout(300); }
  const taiwan = await d.evaluate(() => {
    const e = window.HistoricalEntities.list.find((x) => x.code === "TWN" || x.id === "curated-taiwan-province");
    const modernStates = (window.HistoricalEntities.list || []).filter((x) => x.type === "modern" && x.code === "TWN").length;
    const inModernChips = !!document.querySelector('#panel-body [data-country-open="TWN"]');
    return { name: e && e.name.zh, type: e && e.type, code: e && e.code, parent: e && e.parent, modernStates, inModernChips };
  });
  check("Taiwan is a non-sovereign Chinese entity labelled 台湾", taiwan.name === "台湾" && taiwan.code === "TWN" && taiwan.type === "modern" && taiwan.parent === "china" && !taiwan.inModernChips, JSON.stringify(taiwan));
  const modern = await d.evaluate(() => ({
    heading: Array.prototype.map.call(document.querySelectorAll("#panel-body .p-section h3"), (h) => h.textContent).find((t) => t.indexOf("现代国家") >= 0) || "",
    chips: document.querySelectorAll("#panel-body [data-country-open]").length,
    empty: !!document.querySelector("#panel-body .panel-empty"),
  }));
  check("2026 shows modern states instead of a false empty state", modern.heading.indexOf("现代国家") >= 0 && modern.chips >= 8 && !modern.empty, JSON.stringify(modern));

  const brushBtn = await d.$("#tl-brush-btn");
  const scope0 = await d.evaluate(() => document.querySelector("#tl-scope").textContent);
  if (brushBtn) {
    await brushBtn.click();
    const box = await d.locator("#track").boundingBox();
    await d.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2);
    await d.mouse.down();
    await d.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2, { steps: 8 });
    await d.mouse.up();
    await d.waitForTimeout(500);
  }
  const brush = await d.evaluate(() => ({ scope: document.querySelector("#tl-scope").textContent, pressed: document.querySelector("#tl-brush-btn").getAttribute("aria-pressed") }));
  check("explicit range button selects and exposes a time window", !!brushBtn && brush.scope !== scope0 && brush.pressed === "false", JSON.stringify({ scope0, ...brush }));

  await d.evaluate(() => { window.atlasAPI.setYear(1500); window.atlasAPI.setPanel(true); });
  await d.waitForTimeout(400);
  await d.click("#fav-toggle");
  await d.waitForTimeout(250);
  const saved = await d.evaluate(() => ({ count: document.querySelector("#fav-count").textContent, stored: JSON.parse(localStorage.getItem("world-atlas-favorites") || "[]").length }));
  await d.click("#fav-btn");
  await d.waitForTimeout(400);
  const favPanel = await d.evaluate(() => ({ rows: document.querySelectorAll(".fav-row").length, title: document.querySelector("#panel-title").textContent, url: location.search }));
  check("saving a moment and opening favourites works", saved.count === "1" && saved.stored === 1 && favPanel.rows === 1 && favPanel.title.indexOf("收藏") >= 0 && favPanel.url.indexOf("favorites=1") >= 0, JSON.stringify({ saved, favPanel }));
  await d.click(".fav-open");
  await d.waitForTimeout(500);
  await d.click("#fav-btn");
  await d.waitForTimeout(350);
  // Export → clear → import: the JSON backup is the only way to carry
  // favourites between browsers, so exercise the real file path.
  const [favDl] = await Promise.all([d.waitForEvent("download", { timeout: 8000 }), d.click("[data-fav-export]")]);
  const favPath = await favDl.path();
  const favJson = JSON.parse(fs.readFileSync(favPath, "utf8"));
  await d.evaluate(() => document.querySelector("[data-fav-clear]")?.click());
  await d.waitForTimeout(250);
  const [favChooser] = await Promise.all([d.waitForEvent("filechooser", { timeout: 8000 }), d.click("[data-fav-import]")]);
  await favChooser.setFiles(favPath);
  await d.waitForTimeout(600);
  const reimported = await d.evaluate(() => JSON.parse(localStorage.getItem("world-atlas-favorites") || "[]").length);
  check("favourites export and import round trip", favJson.kind === "favorites" && favJson.favorites.length >= 1 && reimported === favJson.favorites.length, JSON.stringify({ kind: favJson.kind, exported: favJson.favorites.length, reimported }));

  // Clearing is now a two-step confirm.
  await d.evaluate(() => document.querySelector("[data-fav-clear]")?.click());
  await d.waitForTimeout(250);
  const armed = await d.evaluate(() => ({ confirm: !!document.querySelector(".fav-confirm"), rows: document.querySelectorAll(".fav-row").length }));
  await d.evaluate(() => document.querySelector("[data-fav-clear-no]")?.click());
  await d.waitForTimeout(250);
  const cancelled = await d.evaluate(() => ({ confirm: !!document.querySelector(".fav-confirm"), rows: document.querySelectorAll(".fav-row").length }));
  await d.evaluate(() => document.querySelector("[data-fav-clear]")?.click());
  await d.waitForTimeout(200);
  await d.evaluate(() => document.querySelector("[data-fav-clear-yes]")?.click());
  await d.waitForTimeout(250);
  const cleared = await d.evaluate(() => document.querySelectorAll(".fav-row").length);
  check("clearing favourites asks first and can be cancelled", armed.confirm && armed.rows === 1 && !cancelled.confirm && cancelled.rows === 1 && cleared === 0, JSON.stringify({ armed, cancelled, cleared }));

  // Country and route share cards reuse the event card renderer.
  const cardSize = async () => d.evaluate(async () => {
    const b = await window.atlasAPI.cardBlob(window.atlasAPI.state.country ? "country" : "route");
    const bmp = await createImageBitmap(b);
    return { w: bmp.width, h: bmp.height, bytes: b.size };
  });
  await d.goto(BASE + "?year=1937&country=FRA", { waitUntil: "networkidle" });
  await d.waitForTimeout(800);
  const countryCard = await cardSize();
  const countryTools = await d.evaluate(() => ({
    topbar: !!document.querySelector(".panel-topbar [data-country-share]"),
    back: !!document.querySelector(".panel-topbar [data-back]"),
  }));
  await d.goto(BASE + "?route=silk-sea", { waitUntil: "networkidle" });
  await d.waitForTimeout(800);
  const routeCard = await cardSize();
  const routeTools = await d.evaluate(() => !!document.querySelector(".panel-topbar [data-route-share]"));
  check("country and route tools sit in one top bar", countryTools.topbar && countryTools.back && routeTools, JSON.stringify({ countryTools, routeTools }));

  // The China chronicle is no longer a separate mode: the rival regimes live
  // in the China country lens, and the old ?theme=china link still works.
  await d.goto(BASE + "?year=1200&country=CHN", { waitUntil: "networkidle" });
  await d.waitForTimeout(900);
  const chinaLens = await d.evaluate(() => ({
    heading: (document.querySelector("#panel-body h3") || {}).textContent || "",
    chips: [...document.querySelectorAll("#panel-body .polity-chip")].map((c) => c.textContent.trim()),
    themeChip: !!document.querySelector('.region-chip[data-region="china-theme"]'),
  }));
  await d.goto(BASE + "?year=1200&theme=china", { waitUntil: "networkidle" });
  await d.waitForTimeout(900);
  const oldChinaLink = await d.evaluate(() => !!(window.atlasAPI.state.country && window.atlasAPI.state.country.properties.iso3 === "CHN"));
  check("China lens lists rival regimes, no theme chip, old link opens it",
    /并立政权|RIVAL REGIMES/.test(chinaLens.heading) && chinaLens.chips.length >= 3 && !chinaLens.themeChip && oldChinaLink,
    JSON.stringify({ chinaLens, oldChinaLink }));
  check("country and route share cards render at 1200×630",
    countryCard.w === 1200 && countryCard.h === 630 && routeCard.w === 1200 && routeCard.h === 630 && countryCard.bytes > 20000 && routeCard.bytes > 20000,
    JSON.stringify({ countryCard, routeCard }));

  await d.fill("#search", "丝路");
  await d.waitForTimeout(500);
  const searchUI = await d.evaluate(() => ({
    clear: !document.querySelector("#search-clear").hidden,
    regionLabel: document.querySelector("#region-nav .region-label")?.textContent || "",
  }));
  await d.click("#search-clear");
  await d.waitForTimeout(350);
  const searchCleared = await d.evaluate(() => ({ value: document.querySelector("#search").value, hidden: document.querySelector("#search-clear").hidden, results: document.querySelector("#search-results").hidden }));
  check("search has a clear button and the region row is labelled", searchUI.clear && searchUI.regionLabel.length > 0 && searchCleared.value === "" && searchCleared.hidden && searchCleared.results, JSON.stringify({ searchUI, searchCleared }));

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
  const mActs = await m.evaluate(() => {
    const a = document.querySelector(".ev-detail-actions").getBoundingClientRect();
    const b = document.querySelector("#panel-body").getBoundingClientRect();
    return { aw: Math.round(a.width), bw: Math.round(b.width), buttons: document.querySelectorAll(".ev-detail-actions > button").length };
  });
  check("mobile event actions fit inside the half sheet", mActs.aw <= mActs.bw && mActs.buttons === 2, JSON.stringify(mActs));

  await m.evaluate(() => { document.querySelector("[data-ev-close]")?.click(); window.atlasAPI.setSheet("half"); });
  await m.waitForTimeout(400);
  const drawer = await m.evaluate(() => {
    const head = document.querySelector(".panel-head").getBoundingClientRect();
    const body = document.querySelector("#panel-body");
    const br = body.getBoundingClientRect();
    const rows = [...body.querySelectorAll(".event-row")];
    const visible = rows.filter((r) => { const q = r.getBoundingClientRect(); return q.top >= br.top - 1 && q.bottom <= br.bottom + 1; }).length;
    return {
      head: Math.round(head.height), body: Math.round(body.clientHeight), visible,
      filterRows: getComputedStyle(document.querySelector(".cat-filter")).flexWrap,
      routeToggle: !!document.querySelector("[data-route-strip-toggle]"),
      routeOpen: document.querySelector("[data-route-strip-toggle]")?.getAttribute("aria-expanded") === "true",
    };
  });
  // Thresholds allow a few pixels for platform font metrics (CI runs Linux).
  check("half drawer shows 4–5 events with a compact head", drawer.head <= 104 && drawer.body >= 220 && drawer.visible >= 4 && drawer.filterRows === "nowrap", JSON.stringify(drawer));
  check("route strip is collapsed to one line by default", drawer.routeToggle && drawer.routeOpen === false, JSON.stringify(drawer));

  await m.evaluate(() => {
    const ev = window.WORLD_ATLAS.events.find((e) => e.t[1] === "Marco Polo Bridge Incident");
    window.atlasAPI.openEvent(ev);
  });
  await m.waitForTimeout(600);
  await m.evaluate(() => window.atlasAPI.setSheet("peek"));
  await m.waitForTimeout(400);
  const peek = await m.evaluate(() => ({
    state: window.atlasAPI.state.sheet,
    h: Math.round(document.querySelector("#side-panel").getBoundingClientRect().height),
    body: getComputedStyle(document.querySelector("#panel-body")).display,
    title: document.querySelector("#panel-title").textContent,
  }));
  check("peek state shows the event title", peek.state === "peek" && peek.h < 170 && peek.body === "none" && peek.title.includes("卢沟桥"), JSON.stringify(peek));
  const expandVisible = await m.evaluate(() => getComputedStyle(document.querySelector("#sheet-expand")).display !== "none");
  await m.click("#sheet-expand");
  await m.waitForTimeout(400);
  const expanded = await m.evaluate(() => window.atlasAPI.state.sheet);
  check("peek has a visible expand action", expandVisible && expanded === "half", expanded);
  const expandFocus = await m.evaluate(() => document.activeElement && document.activeElement.id);
  check("expanding the drawer keeps focus on the handle", expandFocus === "sheet-handle", expandFocus);

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
  const mini = await m.evaluate(() => {
    const box = document.querySelector("#minimap");
    const cv = document.querySelector("#minimap-canvas");
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let painted = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
    return {
      hidden: box.hidden, w: cv.clientWidth, h: cv.clientHeight, bw: cv.width, bh: cv.height,
      painted: +(painted / (d.length / 4)).toFixed(2), stored: localStorage.getItem("world-atlas-fit"),
    };
  });
  // bw/bh guard: a hidden canvas once doubled its backing store every frame.
  check("fill view shows a painted minimap with a sane backing store",
    !mini.hidden && mini.w >= 90 && mini.h >= 50 && mini.stored === "fill" && mini.painted > 0.5 && mini.bw <= mini.w * 2 + 4 && mini.bh <= mini.h * 2 + 4,
    JSON.stringify(mini));
  await m.focus("#minimap-canvas");
  const pan0 = await m.evaluate(() => window.atlasAPI.map.view.panX);
  await m.keyboard.press("ArrowLeft");
  await m.waitForTimeout(200);
  const pan1 = await m.evaluate(() => window.atlasAPI.map.view.panX);
  check("minimap is keyboard operable", Math.abs(pan1 - pan0) > 5, pan0 + " → " + pan1);
  const focus0 = await m.evaluate(() => ({ lon: window.atlasAPI.map.focus.lon }));
  const box = await m.locator("#minimap-canvas").boundingBox();
  await m.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await m.waitForTimeout(750);
  const focus1 = await m.evaluate(() => ({ lon: window.atlasAPI.map.focus.lon }));
  check("clicking the minimap recentres the camera", Math.abs(focus1.lon - focus0.lon) > 10, JSON.stringify([focus0, focus1]));
  await m.click("#zoom-fit");
  await m.waitForTimeout(400);
  const world = await m.evaluate(() => ({ mode: window.atlasAPI.map.fitMode, zoom: window.atlasAPI.map.view.zoom }));
  check("full-map button restores world view", world.mode === "world" && Math.abs(world.zoom - 1) < 0.05, JSON.stringify(world));

  await m.evaluate(() => {
    document.querySelector("[data-ev-close]")?.click();
    window.atlasAPI.state.autoEvent = false;
    window.atlasAPI.setYear(2026);
    window.atlasAPI.setPanel(true);
    window.atlasAPI.setSheet("half");
  });
  await m.waitForTimeout(600);
  const modernDefault = await m.evaluate(() => ({
    chips: document.querySelectorAll("#panel-body [data-country-open]").length,
    toggle: (document.querySelector("[data-modern-toggle]") || {}).textContent || "",
  }));
  check("2026 modern states use a compact entry", modernDefault.chips === 0 && modernDefault.toggle.includes("196"), JSON.stringify(modernDefault));
  await m.evaluate(() => document.querySelector("[data-modern-toggle]")?.click());
  await m.waitForTimeout(400);
  const modernExpanded = await m.evaluate(() => ({
    chips: document.querySelectorAll("#panel-body [data-country-open]").length,
    more: (document.querySelector("[data-modern-more]") || {}).textContent || "",
  }));
  check("expanding modern states shows 8 plus '全部 196'", modernExpanded.chips === 8 && modernExpanded.more.includes("196"), JSON.stringify(modernExpanded));
  await m.evaluate(() => document.querySelector("[data-modern-toggle]")?.click());
  await m.waitForTimeout(350);
  const density = await m.evaluate(() => {
    const body = document.querySelector("#panel-body"); const br = body.getBoundingClientRect();
    const rows = [...body.querySelectorAll(".event-row")];
    const visible = rows.filter((r) => { const q = r.getBoundingClientRect(); return q.top >= br.top - 1 && q.bottom <= br.bottom + 1; }).length;
    const meta = parseFloat(getComputedStyle(document.querySelector(".event-row .er-meta")).fontSize);
    const head = parseFloat(getComputedStyle(document.querySelector(".p-section h3")).fontSize);
    return { visible, meta, head, modernToggle: !!document.querySelector("[data-modern-toggle]") };
  });
  check("2026 half shows at least 5 events and 10px body type", density.visible >= 5 && density.meta >= 10 && density.head >= 10 && density.modernToggle, JSON.stringify(density));
  await m.evaluate(() => document.querySelector("#about-btn")?.click());
  await m.waitForTimeout(300);
  const legend = await m.evaluate(() => {
    const i = document.querySelector("#legend-cats .lg i") || document.querySelector(".legend-grid .lg i");
    return i ? { w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height) } : null;
  });
  check("legend shapes are at least 10px", legend && legend.w >= 10 && legend.h >= 10, JSON.stringify(legend));
  await m.evaluate(() => document.querySelector("#about-modal [data-close]")?.click());

  const rtl = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar" });
  const rp = await rtl.newPage();
  await rp.goto(BASE + "?year=1500&lang=ar", { waitUntil: "networkidle" });
  await rp.waitForTimeout(900);
  await rp.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); window.atlasAPI.setPanel(true); window.atlasAPI.setSheet("half"); });
  await rp.waitForTimeout(500);
  const rtlOverflow = await rp.evaluate(() => ({ docW: document.documentElement.scrollWidth, win: innerWidth }));
  check("RTL 390×844 has no horizontal overflow", rtlOverflow.docW <= rtlOverflow.win, JSON.stringify(rtlOverflow));
  const rtlLabels = await rp.evaluate(() => (window.HistoricalEntities.lastLabels || []).map((x) => x[0]).slice(0, 5));
  check("Arabic mode uses Arabic map names where available", rtlLabels.some((s) => /[\u0600-\u06FF]/.test(s)), rtlLabels.join(","));
  await rtl.close();

  await m.click("#zoom-fill");
  await m.waitForTimeout(500);
  await m.reload({ waitUntil: "networkidle" });
  await m.waitForTimeout(1100);
  const persisted = await m.evaluate(() => ({ mode: window.atlasAPI.map.fitMode, mini: !document.querySelector("#minimap").hidden }));
  check("fill view persists across reload", persisted.mode === "fill" && persisted.mini, JSON.stringify(persisted));

  const moment = await m.evaluate(() => ({
    hidden: document.querySelector("#panel-reopen").hidden,
    text: document.querySelector("#panel-reopen").textContent.trim(),
  }));
  await m.click("#panel-reopen");
  await m.waitForTimeout(600);
  const momentOpen = await m.evaluate(() => window.atlasAPI.state.panelOpen);
  check("mobile has a moment entry with a node count that opens the panel", !moment.hidden && /·\s*\d+/.test(moment.text) && momentOpen === true, JSON.stringify({ moment, momentOpen }));

  check("mobile page has no console errors", mobile.errors.length === 0, mobile.errors.slice(0, 2).join(" | "));

  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", locale: "zh-CN" });
  const rmp = await rm.newPage();
  const rmErrors = [];
  rmp.on("pageerror", (e) => rmErrors.push(String(e)));
  await rmp.goto(BASE + "?year=1945", { waitUntil: "networkidle" });
  await rmp.waitForTimeout(1000);
  await rmp.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
  await rmp.evaluate(() => { const ev = window.WORLD_ATLAS.events.find((e) => e.id === "hiroshima"); window.atlasAPI.openEvent(ev); });
  await rmp.waitForTimeout(800);
  const rmState = await rmp.evaluate(() => {
    const t = window.MapTheatre;
    const p1 = t.lastP;
    return { reduce: t.reduceMotion, alpha: t.alpha, auto: window.atlasAPI.state.autoEvent, paused: t.paused, p1 };
  });
  await rmp.waitForTimeout(600);
  const rmP2 = await rmp.evaluate(() => window.MapTheatre.lastP);
  check("reduced motion makes the theatre static and disables autoplay", rmState.reduce && rmState.alpha === 1 && rmState.auto === false && Math.abs(rmP2 - rmState.p1) < 0.001, JSON.stringify({ ...rmState, p2: rmP2 }));
  await rmp.evaluate(() => document.querySelector("#ob-close")?.click());
  await rmp.waitForTimeout(400);
  const node = await rmp.evaluate(() => {
    const n = [...document.querySelectorAll("#a11y-nodes .a11y-node")].find((x) => x.getBoundingClientRect().width > 0);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    n.focus();
    return { w: Math.round(r.width), h: Math.round(r.height), focused: document.activeElement === n, aria: n.getAttribute("aria-label") };
  });
  check("map nodes keep a 44px focusable overlay", !!node && node.w >= 44 && node.h >= 44 && node.focused && !!node.aria, JSON.stringify(node));
  check("reduced-motion page has no console errors", rmErrors.length === 0, rmErrors.slice(0, 2).join(" | "));
  await rm.close();

  if (!SKIP_CLEANUP) {
    await d.evaluate(() => {
      const ev = window.WORLD_ATLAS.events.find((e) => e.t[1] === "Hiroshima");
      window.atlasAPI.openEvent(ev);
    });
    await d.waitForTimeout(17200);
    const cleanup = await d.evaluate(() => ({
      active: window.MapTheatre.active,
      units: window.MapTheatre.units.length,
      still: !!window.MapTheatre.still,
    }));
    check("theatre clears after 16 seconds and keeps a static last frame", !cleanup.active && cleanup.units === 0 && cleanup.still, JSON.stringify(cleanup));
  }

  // Offline status bar (and the install/update bar being present but hidden).
  const netCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-CN" });
  const np = await netCtx.newPage();
  await np.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
  await np.waitForTimeout(800);
  const bars = await np.evaluate(() => ({ offline: !!document.querySelector("#offline-bar"), pwa: !!document.querySelector("#pwa-bar"), pwaHidden: document.querySelector("#pwa-bar").hidden }));
  await netCtx.setOffline(true);
  await np.waitForTimeout(400);
  const barOff = await np.evaluate(() => ({
    hidden: document.querySelector("#offline-bar").hidden,
    text: document.querySelector("#offline-bar .sysbar-text").textContent,
    noteHidden: document.querySelector("#panel-offline").hidden,
    note: document.querySelector("#panel-offline").textContent,
  }));
  await netCtx.setOffline(false);
  await np.waitForTimeout(400);
  const barOn = await np.evaluate(() => ({ bar: document.querySelector("#offline-bar").hidden, note: document.querySelector("#panel-offline").hidden }));
  check("offline status bar and panel note appear while offline",
    bars.offline && bars.pwa && !barOff.hidden && barOff.text.length > 4 && !barOff.noteHidden && barOff.note.length > 10 && barOn.bar === true && barOn.note === true,
    JSON.stringify({ bars, barOff: { ...barOff, text: barOff.text.slice(0, 12), note: barOff.note.slice(0, 12) }, barOn }));
  await netCtx.close();

  await desktop.ctx.close();
  await mobile.ctx.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log("\n" + (failed.length ? failed.length + " check(s) failed" : "all " + results.length + " checks passed"));
process.exit(failed.length ? 1 : 0);
