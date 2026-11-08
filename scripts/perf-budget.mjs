#!/usr/bin/env node
/* Performance budget: gzip weight of the first screen, the lazy scene
   modules, and a couple of runtime numbers. Deterministic on purpose — no
   throttling, so it can run in CI without flakes. Budgets carry ~12%
   headroom over the measured build; raise them deliberately, never to make
   a red build pass. */
import fs from "node:fs";
import zlib from "node:zlib";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8001/";
const KB = 1024;
const gz = (p) => zlib.gzipSync(fs.readFileSync(p)).length;

const FIRST_SCREEN = ["index.html", "css/style.css", "js/data_bundle.js", "js/scenes.js", "js/historical.js",
  "js/entities.js", "js/theatre.js", "js/audio.js", "js/statechanges.js", "js/map.js", "js/i18n_extra.js",
  "js/app.js", "data/world.geo.json", "data/historical_entities.json", "data/state_changes.json"];
const LAZY = ["js/hero-scenes.js", "js/variant-scenes.js"];
const PER_FILE = {
  "index.html": 10, "css/style.css": 20, "js/data_bundle.js": 235, "js/app.js": 72,
  "data/world.geo.json": 270, "data/historical_entities.json": 75,
  "js/theatre.js": 28, "js/map.js": 18, "js/scenes.js": 32,
  // variant-scenes grew with the per-event silhouettes (facades, landmarks,
  // quake cities, wave coasts); it is lazy-loaded and the lazy total still
  // has headroom, so the per-file budget moves with the art pass.
  "js/hero-scenes.js": 95, "js/variant-scenes.js": 32,
};
const BUDGET = { firstScreen: 780, lazy: 120, total: 900, domNodes: 2400 };

let failed = 0;
const row = (name, actual, budget, unit) => {
  const ok = actual <= budget;
  if (!ok) failed += 1;
  const u = unit || "KB";
  const fmt = u === "KB" ? actual.toFixed(1) : String(Math.round(actual));
  console.log((ok ? "  ok  " : "  FAIL") + "  " + name.padEnd(38) + (fmt + " " + u).padStart(11) + "  ≤ " + budget + " " + u);
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error title=perf-budget::${name} ${fmt} ${u} over ${budget} ${u}`);
};

let first = 0, lazy = 0;
for (const f of FIRST_SCREEN) {
  const n = gz(f) / KB;
  first += n;
  if (PER_FILE[f]) row(f, n, PER_FILE[f]);
}
for (const f of LAZY) {
  const n = gz(f) / KB;
  lazy += n;
  if (PER_FILE[f]) row(f, n, PER_FILE[f]);
}
row("first screen (total)", first, BUDGET.firstScreen);
row("lazy scene modules (total)", lazy, BUDGET.lazy);
row("everything (total)", first + lazy, BUDGET.total);

// Runtime: DOM size after boot. A page that balloons past this is a warning
// that the panel is rendering far more than it should.
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await ctx.newPage();
await page.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const runtime = await page.evaluate(() => ({
  nodes: document.querySelectorAll("*").length,
  scripts: document.querySelectorAll("script[src]").length,
}));
await browser.close();
row("DOM nodes after boot", runtime.nodes, BUDGET.domNodes, "nodes");
console.log("  info  script tags:", runtime.scripts);

console.log("\n" + (failed ? failed + " budget check(s) failed" : "all budget checks passed"));
process.exit(failed ? 1 : 0);
