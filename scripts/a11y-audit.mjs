#!/usr/bin/env node
/* Focused WCAG-oriented audit for the static atlas.
   Not a substitute for NVDA/VoiceOver manual testing. */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8001/";
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
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const afterClose = await page.evaluate(() => ({ hidden: document.querySelector("#event-modal").hidden, inert: document.getElementById("app").inert, focus: document.activeElement.id }));
check("closing the modal restores focus and inert state", afterClose.hidden && !afterClose.inert && afterClose.focus === "panel-title", JSON.stringify(afterClose));

check("no console errors during audit", errors.length === 0, errors.slice(0, 2).join(" | "));
const failed = results.filter((r) => !r.ok);
console.log("\n" + (failed.length ? failed.length + " audit check(s) failed" : "all " + results.length + " audit checks passed"));
await browser.close();
process.exit(failed.length ? 1 : 0);
