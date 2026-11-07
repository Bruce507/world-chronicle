#!/usr/bin/env node
/* Coverage of ES/FR/AR historical-entity labels on the map. */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8001/";
const browser = await chromium.launch({ channel: "chrome" });
const rows = [];
for (const lang of ["es", "fr", "ar"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const year of [1500, 1800, 1937, 2026]) {
    await page.goto(`${BASE}?year=${year}&lang=${lang}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.HistoricalEntities && window.HistoricalEntities.ready, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(450);
    const r = await page.evaluate(({ lang, year }) => {
      const E = window.HistoricalEntities, map = window.atlasAPI.map;
      const active = E.list.filter((e) => {
        if (year < e.from || year > e.to) return false;
        if (year >= 1995 && e.type !== "modern" && e.type !== "province") return false;
        const minZ = e.source === "curated" && (e.priority || 0) >= 75 ? 1 : (e.minZoom || 1);
        return map.view.zoom + 0.001 >= minZ;
      });
      const trNames = new Set();
      const translated = active.filter((e) => {
        const n = (e.name && e.name[lang]) || (e.type === "modern" && e.code && window.WORLD_ATLAS.featureByCode && window.WORLD_ATLAS.featureByCode[e.code] && window.WORLD_ATLAS.featureByCode[e.code].properties[lang]);
        if (n) trNames.add(n);
        return n;
      });
      const shownNames = (E.lastLabels || []).map((x) => x[0]);
      return { active: active.length, translated: translated.length, shown: shownNames.length, shownTranslated: shownNames.filter((n) => trNames.has(n)).length, labels: shownNames.slice(0, 6) };
    }, { lang, year });
    rows.push({ lang, year, ...r, coverage: r.active ? +(r.translated / r.active).toFixed(2) : 1, shownCoverage: r.shown ? +(r.shownTranslated / r.shown).toFixed(2) : 1 });
  }
  await ctx.close();
}
console.table(rows);
const total = rows.reduce((a, r) => ({ active: a.active + r.active, translated: a.translated + r.translated, shown: a.shown + r.shown, shownTranslated: a.shownTranslated + r.shownTranslated }), { active: 0, translated: 0, shown: 0, shownTranslated: 0 });
console.log("weighted coverage", (total.translated / total.active).toFixed(2), "shown coverage", (total.shownTranslated / total.shown).toFixed(2));
/* Nominal coverage (all three languages present) and the labels most worth
   translating next, ranked by how many sampled years they appear in. */
import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("data/historical_entities.json", "utf8"));
const ents = data.entities || [];
const full = ents.filter((e) => e.name && e.name.es && e.name.fr && e.name.ar).length;
const freq = new Map();
for (const year of [1500, 1800, 1937, 2026]) {
  for (const e of ents) {
    if (year < e.from || year > e.to) continue;
    if (e.name && (e.name.es || e.name.fr || e.name.ar)) continue;
    const key = (e.name && e.name.en) || "";
    if (!key) continue;
    freq.set(key, (freq.get(key) || 0) + 1);
  }
}
const next = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, c]) => n + " (" + c + ")");
console.log("entities with ES/FR/AR:", full, "/", ents.length, "(" + Math.round((full / Math.max(1, ents.length)) * 100) + "%)");
console.log("next labels to translate:", next.join(" · "));
await browser.close();
