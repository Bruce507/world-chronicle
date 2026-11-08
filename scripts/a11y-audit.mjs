#!/usr/bin/env node
/* Focused WCAG-oriented audit for the static atlas.
   axe-core (devDependency) covers the DOM; the rest is tailored to the map.
   Not a substitute for NVDA/VoiceOver manual testing. */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8001/";
const AXE = "node_modules/axe-core/axe.min.js";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail) }); console.log((ok ? "  ok  " : "  FAIL") + "  " + name + (detail ? " — " + detail : "")); };

const contrast = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const tok = (k) => cs.getPropertyValue(k).trim();
  const hex = (c) => c.replace("#", "");
  function lum(c) {
    const [r, g, b] = hex(c).match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function ratio(a, b) { let x = lum(a), y = lum(b); if (x < y) [x, y] = [y, x]; return +((x + 0.05) / (y + 0.05)).toFixed(2); }
  const paper = tok("--paper"), paper2 = tok("--paper-2"), verm = tok("--verm");
  return {
    "ink/paper": ratio(tok("--ink"), paper),
    "ink2/paper": ratio(tok("--ink-2"), paper),
    "muted/paper2": ratio(tok("--muted"), paper2),
    "verm/paper2": ratio(verm, paper2),
    "gold/paper2": ratio(tok("--gold"), paper2),
    "white/verm": ratio("ffffff", verm),
    values: { paper, paper2, verm, muted: tok("--muted"), gold: tok("--gold") },
  };
});
for (const [k, v] of Object.entries(contrast)) if (k !== "values") check("contrast " + k + " ≥ 4.5", v >= 4.5, v);

const a11y = await page.evaluate(() => {
  const unlabeled = [...document.querySelectorAll("button")].filter((b) => {
    if (b.offsetParent === null) return false;
    const name = (b.getAttribute("aria-label") || b.textContent || b.getAttribute("title") || "").trim();
    return !name;
  }).map((b) => b.id || b.className || b.tagName);
  const landmarks = { header: !!document.querySelector("header"), main: !!document.querySelector("main"), aside: !!document.querySelector("aside"), footer: !!document.querySelector("footer"), navs: document.querySelectorAll("nav").length };
  const slider = document.querySelector("#track");
  const canvas = [...document.querySelectorAll("canvas")].map((c) => ({ id: c.id, label: c.getAttribute("aria-label") || c.getAttribute("aria-hidden") || "" }));
  return { unlabeled, landmarks, slider: { role: slider.getAttribute("role"), min: slider.getAttribute("aria-valuemin"), max: slider.getAttribute("aria-valuemax"), text: slider.getAttribute("aria-valuetext") }, canvas, skip: !!document.querySelector(".skip-link") };
});
check("all visible buttons have an accessible name", a11y.unlabeled.length === 0, a11y.unlabeled.join(","));
check("landmarks are present", a11y.landmarks.header && a11y.landmarks.main && a11y.landmarks.aside && a11y.landmarks.footer && a11y.landmarks.navs >= 2, JSON.stringify(a11y.landmarks));
check("timeline slider exposes role/range/text", a11y.slider.role === "slider" && !!a11y.slider.min && !!a11y.slider.max && !!a11y.slider.text, JSON.stringify(a11y.slider));
check("skip link exists", a11y.skip, "");
check("map/minimap canvases are labelled or hidden", a11y.canvas.every((c) => !!c.label), JSON.stringify(a11y.canvas));

/* axe-core: WCAG 2.2 A/AA on the main view (DOM only — canvas text is covered below). */
await page.addScriptTag({ path: AXE });
const axeMain = await page.evaluate(async () => {
  const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag22aa"] } });
  return r.violations.map((v) => v.id + "(" + v.nodes.length + ")");
});
check("axe-core: no WCAG A/AA violations on the main view", axeMain.length === 0, axeMain.join(", "));

/* Canvas labels: the atlas paints them as a light halo (rgba(250,246,238,0.92))
   under a coloured fill whose alpha depends on the entity type — 0.74 for
   modern states, 0.84 for cultures, 0.86 for other polities. Sample the real
   map colour under each label, composite halo then glyph, and require 4.5:1
   at full label weight (no theatre running, fade-in complete). */
const labelRatios = await page.evaluate(() => {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (fg, bg, a) => [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
  const cv = document.querySelector("#map-canvas");
  const c2 = cv.getContext("2d", { willReadFrequently: true });
  const dpr = cv.width / cv.clientWidth;
  const sample = (x, y) => { const d = c2.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data; return [d[0], d[1], d[2]]; };
  const HE = window.HistoricalEntities;
  const list = (HE && HE.list) || [];
  const out = [];
  for (const [name, x, y] of ((HE && HE.lastLabels) || []).slice(0, 16)) {
    const e = list.find((q) => q.name && (q.name.en === name || q.name.zh === name));
    const kind = e ? e.type : "polity";
    const ink = kind === "modern" ? [54, 45, 34] : kind === "culture" ? [88, 72, 54] : [48, 40, 31];
    const alpha = kind === "modern" ? 0.74 : kind === "culture" ? 0.84 : 0.86;
    const bg = sample(x, Math.max(4, y - 18));
    const halo = mix([250, 246, 238], bg, 0.92);
    const glyph = mix(ink, halo, alpha);
    out.push({ name, kind, ratio: +ratio(glyph, halo).toFixed(2) });
  }
  return out;
});
const worstLabel = labelRatios.slice().sort((a, b) => a.ratio - b.ratio)[0] || null;
check("canvas historical labels ≥ 4.5:1 at full density", labelRatios.length > 0 && worstLabel.ratio >= 4.5,
  JSON.stringify({ n: labelRatios.length, worst: worstLabel }));

/* Modern country names are off by default, and the historical-border layer
   suppresses them below zoom 2.2; switch both so the layer actually paints. */
await page.evaluate(() => {
  for (const key of ["labels", "historical"]) {
    const cb = document.querySelector('[data-toggle="' + key + '"]');
    if (!cb) continue;
    cb.checked = key === "labels";
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
await page.waitForTimeout(600);
const countryRatios = await page.evaluate(() => {
  const map = window.atlasAPI.map;
  const cv = document.querySelector("#map-canvas");
  const c2 = cv.getContext("2d", { willReadFrequently: true });
  const dpr = cv.width / cv.clientWidth;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (fg, bg, a) => [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
  const out = [];
  for (const r of (map._labels || []).slice(0, 14)) {
    const sx = Math.round((r[0] - 8) * dpr), sy = Math.round((r[1] + r[3]) / 2 * dpr);
    if (sx < 0 || sy < 0 || sx >= cv.width || sy >= cv.height) continue;
    const d = c2.getImageData(sx, sy, 1, 1).data;
    const halo = mix([250, 246, 238], [d[0], d[1], d[2]], 0.9);
    const glyph = mix([48, 40, 31], halo, 0.84);
    out.push(+ratio(glyph, halo).toFixed(2));
  }
  return out;
});
check("canvas modern country labels ≥ 4.5:1 at full density", countryRatios.length > 0 && Math.min(...countryRatios) >= 4.5,
  JSON.stringify({ n: countryRatios.length, min: countryRatios.length ? Math.min(...countryRatios) : null, values: countryRatios.slice(0, 6) }));

/* Accessibility tree (the browser's own, via CDP). Playwright 1.64 removed
   page.accessibility, so read Chromium's computed AX tree directly. This is
   the order a screen reader walks, not the DOM source order. */
const axClient = await page.context().newCDPSession(page);
await axClient.send("Accessibility.enable");
const axRaw = await axClient.send("Accessibility.getFullAXTree");
const axById = new Map(axRaw.nodes.map((n) => [n.nodeId, n]));
const axOrder = [];
(function walk(n) { if (!n) return; axOrder.push(n); (n.childIds || []).forEach((id) => walk(axById.get(id))); })(axRaw.nodes.find((n) => !n.parentId));
const ax = axOrder.filter((n) => !n.ignored && n.role && n.role.value !== "none");
const axRole = (n) => n.role.value;
const axName = (n) => ((n.name && n.name.value) || "").trim();
const axIdx = (role, name) => ax.findIndex((n) => axRole(n) === role && (!name || axName(n).includes(name)));

const landmarks = { banner: axIdx("banner"), main: axIdx("main"), complementary: axIdx("complementary"), contentinfo: axIdx("contentinfo") };
check("AX tree: landmarks in reading order (banner → main → panel → timeline)",
  landmarks.banner >= 0 && landmarks.main > landmarks.banner && landmarks.complementary > landmarks.main && landmarks.contentinfo > landmarks.complementary,
  JSON.stringify(landmarks));

const skipIdx = ax.findIndex((n) => axRole(n) === "link" && /跳到详情面板/.test(axName(n)));
check("AX tree: the skip link is read before the banner",
  skipIdx >= 0 && skipIdx < landmarks.banner, JSON.stringify({ skipIdx, banner: landmarks.banner }));

const INTERACTIVE = ["button", "link", "slider", "searchbox", "checkbox", "combobox", "textbox", "menuitem", "tab", "switch"];
const axUnnamed = ax.filter((n) => INTERACTIVE.includes(axRole(n)) && !axName(n)).map((n) => axRole(n));
check("AX tree: every interactive node has an accessible name", axUnnamed.length === 0, axUnnamed.slice(0, 8).join(","));

const sliderNode = ax.find((n) => axRole(n) === "slider");
const sliderProp = (k) => { const p = sliderNode && (sliderNode.properties || []).find((q) => q.name === k); return p ? String(p.value && p.value.value) : ""; };
// Chromium's CDP tree reports an empty `valuetext` for role=slider even when
// aria-valuetext is set (reproduced on a minimal page), so the human-readable
// year is asserted on the DOM attribute above; here we check name/range/value.
check("AX tree: the year slider exposes name, range and value",
  !!sliderNode && /时间轴年份/.test(axName(sliderNode)) && sliderProp("valuemin") === "-12000" && sliderProp("valuemax") === "2026" && Number(sliderNode.value && sliderNode.value.value) === 1937,
  JSON.stringify({ name: sliderNode && axName(sliderNode), min: sliderProp("valuemin"), max: sliderProp("valuemax"), value: sliderNode && sliderNode.value }));

const headings = ax.filter((n) => axRole(n) === "heading" && axName(n)).map((n) => axName(n));
check("AX tree: panel headings are exposed", headings.length >= 2 && headings.some((h) => /世界/.test(h)), JSON.stringify(headings.slice(0, 5)));

const nodeLabels = await page.$$eval("#a11y-nodes .a11y-node", (els) => els.map((e) => e.getAttribute("aria-label") || ""));
const axButtons = new Set(ax.filter((n) => axRole(n) === "button").map(axName));
check("AX tree: map node overlays are named buttons", nodeLabels.length > 0 && nodeLabels.every((l) => axButtons.has(l)),
  JSON.stringify({ n: nodeLabels.length, sample: nodeLabels.slice(0, 2), missing: nodeLabels.filter((l) => !axButtons.has(l)).slice(0, 2) }));

/* Year and theatre live regions: announce changes, not just carry the attribute. */
const liveAttrs = await page.evaluate(() => {
  const pick = (id) => { const e = document.getElementById(id); return e ? { live: e.getAttribute("aria-live"), atomic: e.getAttribute("aria-atomic") } : null; };
  return { year: pick("a11y-live"), theatre: pick("theatre-live") };
});
await page.evaluate(() => window.atlasAPI.setYear(1938));
await page.waitForTimeout(350);
const yearLive = await page.evaluate(() => document.querySelector("#a11y-live").textContent);
check("year changes are announced through a polite live region",
  liveAttrs.year && liveAttrs.year.live === "polite" && liveAttrs.year.atomic === "true" && /1938/.test(yearLive), JSON.stringify({ ...liveAttrs.year, yearLive }));
check("the theatre has a polite live region", liveAttrs.theatre && liveAttrs.theatre.live === "polite", JSON.stringify(liveAttrs.theatre));

/* Skipping the long map/panel tab path: both skip links must land focus. */
await page.evaluate(() => document.activeElement.blur());
await page.keyboard.press("Tab");
const skip1 = await page.evaluate(() => document.activeElement && document.activeElement.className);
await page.keyboard.press("Tab");
const skip2 = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
await page.keyboard.press("Enter");
await page.waitForTimeout(250);
const skipped = await page.evaluate(() => ({ id: document.activeElement && document.activeElement.id, tag: document.activeElement && document.activeElement.tagName }));
check("skip links reach the panel and the timeline",
  /skip-link/.test(skip1) && /跳到时间轴/.test(skip2) && skipped.id === "timeline", JSON.stringify({ skip1, skip2, skipped }));


/* Contrast sample for the small type raised in D7: 9.5px text must still
   clear 4.5:1 against its real (composited) background. Canvas overlays are
   sampled separately above and are excluded here. */
const CONTRAST_SAMPLE = [
  ".brand-text small", ".kicker", ".p-section h3", ".event-row .er-meta", ".event-row .er-year",
  ".tl-scope", ".tl-era-select", ".era-band small", ".era-band b", ".now-divider span",
  ".cat-chip small", ".route-chip small", ".panel-note-inline", "#map-note",
];
async function contrastSample(target, sels) {
  return target.evaluate((list) => {
    const parse = (c) => {
      const m = String(c).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    const mix = (f, b, a) => ({ r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a), a: 1 });
    const bgOf = (el) => {
      const stack = [];
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0) stack.push(c);
      }
      let base = { r: 250, g: 246, b: 238, a: 1 };
      for (let i = stack.length - 1; i >= 0; i--) base = mix(stack[i], base, stack[i].a);
      return base;
    };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
    const out = [];
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (!el || !el.offsetParent) continue;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      if (!fg) continue;
      const bg = bgOf(el);
      out.push({ sel, size: cs.fontSize, ratio: ratio(mix(fg, bg, fg.a), bg) });
    }
    return out;
  }, sels);
}
// Normalise to the era list so every sampled selector exists (a dossier or a
// country view would hide most of them).
await page.evaluate(() => {
  window.atlasAPI.state.autoEvent = false;
  document.querySelector("[data-ev-close]")?.click();
  window.atlasAPI.setPanel(true);
  window.atlasAPI.setYear(1938);
});
await page.waitForTimeout(600);
const smallContrast = await contrastSample(page, CONTRAST_SAMPLE);
const worstSmall = smallContrast.slice().sort((a, b) => a.ratio - b.ratio)[0] || null;
check("small-type contrast sample ≥ 4.5:1 (9.5px text on its real background)",
  smallContrast.length >= 10 && worstSmall.ratio >= 4.5,
  JSON.stringify({ n: smallContrast.length, worst: worstSmall, all: smallContrast.map((x) => x.sel + ":" + x.ratio) }));

const zoomCtx = await browser.newContext({ viewport: { width: 720, height: 450 } });
const zp = await zoomCtx.newPage();
await zp.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await zp.waitForTimeout(1000);
await zp.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
await zp.waitForTimeout(300);
const zoom = await zp.evaluate(() => ({
  docW: document.documentElement.scrollWidth,
  win: innerWidth,
  track: !!document.querySelector("#track").offsetParent,
  title: document.querySelector("#panel-title").textContent,
}));
check("200% zoom (720×450) reflows without horizontal scrolling", zoom.docW <= zoom.win + 1 && zoom.track && !!zoom.title, JSON.stringify(zoom));
await zp.addScriptTag({ path: AXE });
const axeZoom = await zp.evaluate(async () => {
  const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag22aa"] } });
  return r.violations.map((v) => v.id + "(" + v.nodes.length + ")");
});
check("axe-core: no WCAG A/AA violations at 200% zoom", axeZoom.length === 0, axeZoom.join(", "));
await zoomCtx.close();

/* Forced colours (Windows high contrast). */
const fcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, forcedColors: "active" });
const fp = await fcCtx.newPage();
await fp.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await fp.waitForTimeout(1000);
await fp.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
await fp.waitForTimeout(300);
const fc = await fp.evaluate(() => {
  const on = matchMedia("(forced-colors: active)").matches;
  const docW = document.documentElement.scrollWidth, win = innerWidth;
  const cv = document.querySelector("#map-canvas");
  const d = cv.getContext("2d").getImageData(Math.floor(cv.width / 2), Math.floor(cv.height / 2), 1, 1).data;
  return { on, overflow: docW > win + 1, painted: d[3] > 0 };
});
let fcFocus = "";
await fp.keyboard.press("Tab");
await fp.keyboard.press("Tab");
fcFocus = await fp.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return "none"; const cs = getComputedStyle(a); return (cs.outlineStyle || "none") + ":" + (cs.outlineWidth || "0"); });
check("forced colours active: layout intact, map painted, focus outline kept", fc.on && !fc.overflow && fc.painted && !/^none/.test(fcFocus), JSON.stringify({ ...fc, fcFocus }));
await fcCtx.close();

/* 400% zoom: a 1440×900 window behaves like 320×256 CSS px (WCAG 1.4.10
   asks for 320 px width). The panel is opened as a half sheet because that
   is the densest state at this size. */
const z4Ctx = await browser.newContext({ viewport: { width: 320, height: 256 } });
const z4p = await z4Ctx.newPage();
await z4p.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await z4p.waitForTimeout(1000);
await z4p.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
await z4p.waitForTimeout(300);
await z4p.evaluate(() => { window.atlasAPI.setPanel(true); window.atlasAPI.setSheet("half"); });
await z4p.waitForTimeout(400);
const zoom400 = await z4p.evaluate(() => {
  const de = document.documentElement;
  const body = document.querySelector("#panel-body");
  const track = document.querySelector("#track").getBoundingClientRect();
  const close = document.querySelector("#panel-close").getBoundingClientRect();
  return {
    docW: de.scrollWidth, win: innerWidth,
    panelOverflow: body.scrollWidth - body.clientWidth,
    trackVisible: track.width > 100 && track.top < innerHeight,
    closeInView: close.width > 0 && close.top >= 0 && close.bottom <= innerHeight,
  };
});
check("400% zoom (320×256) reflows without horizontal scrolling", zoom400.docW <= zoom400.win && zoom400.panelOverflow <= 1 && zoom400.trackVisible && zoom400.closeInView, JSON.stringify(zoom400));
await z4p.addScriptTag({ path: AXE });
const axe400 = await z4p.evaluate(async () => {
  const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag22aa"] } });
  return r.violations.map((v) => v.id + "(" + v.nodes.length + ")");
});
check("axe-core: no WCAG A/AA violations at 400% zoom", axe400.length === 0, axe400.join(", "));
await z4Ctx.close();

/* 400% zoom + forced colours together (the combination the review asked for). */
const zfcCtx = await browser.newContext({ viewport: { width: 320, height: 256 }, forcedColors: "active" });
const zfp = await zfcCtx.newPage();
await zfp.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await zfp.waitForTimeout(1000);
await zfp.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
await zfp.waitForTimeout(300);
const zfc = await zfp.evaluate(() => {
  const de = document.documentElement;
  const track = document.querySelector("#track").getBoundingClientRect();
  return { on: matchMedia("(forced-colors: active)").matches, docW: de.scrollWidth, win: innerWidth, trackVisible: track.width > 100 };
});
let zfcFocus = "";
for (let i = 0; i < 3; i++) await zfp.keyboard.press("Tab");
zfcFocus = await zfp.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return "none"; const cs = getComputedStyle(a); return (cs.outlineStyle || "none") + ":" + (cs.outlineWidth || "0"); });
check("400% zoom + forced colours: layout intact, timeline reachable, focus outline kept",
  zfc.on && zfc.docW <= zfc.win && zfc.trackVisible && !/^none/.test(zfcFocus), JSON.stringify({ ...zfc, zfcFocus }));
await zfcCtx.close();

await page.evaluate(() => { const ev = window.WORLD_ATLAS.events.find((e) => e.id === "hiroshima"); window.atlasAPI.openEventModal(ev); });
await page.waitForTimeout(900);
const modal = await page.evaluate(() => ({
  open: !document.querySelector("#event-modal").hidden,
  inert: document.getElementById("app").inert,
  focusInside: document.querySelector("#event-modal").contains(document.activeElement),
}));
let trapped = true;
for (let i = 0; i < 14; i++) {
  await page.keyboard.press("Tab");
  const inside = await page.evaluate(() => document.querySelector("#event-modal").contains(document.activeElement));
  if (!inside) trapped = false;
}
check("event modal opens, background is inert and focus stays inside", modal.open && modal.inert && modal.focusInside && trapped, JSON.stringify({ ...modal, trapped }));
const modalContrast = await contrastSample(page, [".ev-meta span", ".ev-contemp-title", ".ev-link-chip", ".ev-detail-kicker", ".ev-detail-section h4"]);
const worstModal = modalContrast.slice().sort((a, b) => a.ratio - b.ratio)[0] || null;
check("event-modal small-type contrast ≥ 4.5:1", modalContrast.length >= 4 && worstModal.ratio >= 4.5, JSON.stringify({ n: modalContrast.length, worst: worstModal }));
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const afterClose = await page.evaluate(() => ({ hidden: document.querySelector("#event-modal").hidden, inert: document.getElementById("app").inert, focus: document.activeElement.id }));
check("closing the modal restores focus and inert state", afterClose.hidden && !afterClose.inert && afterClose.focus === "panel-title", JSON.stringify(afterClose));

/* Theatre state is announced: the canvas is decorative, so a scene starting,
 * pausing or settling must reach an aria-live region. */
await page.evaluate(() => { const ev = window.WORLD_ATLAS.events.find((e) => e.id === "hiroshima"); window.atlasAPI.openEvent(ev); });
await page.waitForTimeout(900);
const livePlay = await page.evaluate(() => document.querySelector("#theatre-live").textContent);
await page.evaluate(() => { const b = document.querySelector("[data-theatre-pause]"); if (b) b.click(); });
await page.waitForTimeout(400);
const livePause = await page.evaluate(() => document.querySelector("#theatre-live").textContent);
check("theatre state is announced through a live region", /广岛|Hiroshima/.test(livePlay) && livePause.length > 0 && livePause !== livePlay, JSON.stringify({ livePlay, livePause }));

check("no console errors during audit", errors.length === 0, errors.slice(0, 2).join(" | "));
const failed = results.filter((r) => !r.ok);
console.log("\n" + (failed.length ? failed.length + " audit check(s) failed" : "all " + results.length + " audit checks passed"));
await browser.close();
process.exit(failed.length ? 1 : 0);
