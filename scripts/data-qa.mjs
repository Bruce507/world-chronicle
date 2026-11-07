#!/usr/bin/env node
/* Data QA report: sources, metadata ranges, sensitive entries and label collisions. */
import fs from "node:fs";
import { chromium } from "playwright";
const details = JSON.parse(fs.readFileSync("data/event_details.json", "utf8"));
const events = JSON.parse(fs.readFileSync("data/events.json", "utf8"));
/* Three-way source classification. "Institutional" means a museum, archive,
   library, university, UN body or government agency — the kind of source the
   P3-7 target counts. Encyclopedias are useful but are not institutions. */
const ENCY = /(^|\.)britannica\.com$|(^|\.)wikipedia\.org$/;
const INSTITUTIONAL = [
  /(^|\.)unesco\.org$/, /(^|\.)un\.org$/, /(^|\.)who\.int$/, /(^|\.)iaea\.org$/, /(^|\.)unfccc\.int$/,
  /(^|\.)oecd\.org$/, /(^|\.)worldbank\.org$/, /(^|\.)imf\.org$/, /(^|\.)europa\.eu$/,
  /(^|\.)archives\.gov$/, /(^|\.)loc\.gov$/, /(^|\.)nps\.gov$/, /(^|\.)si\.edu$/, /(^|\.)nasa\.gov$/,
  /(^|\.)usgs\.gov$/, /(^|\.)army\.mil$/, /(^|\.)defense\.gov$/, /(^|\.)congress\.gov$/, /(^|\.)state\.gov$/,
  /(^|\.)nationalarchives\.gov\.uk$/, /(^|\.)parliament\.uk$/, /(^|\.)bl\.uk$/, /(^|\.)britishmuseum\.org$/,
  /(^|\.)iwm\.org\.uk$/, /(^|\.)nam\.ac\.uk$/, /(^|\.)railwaymuseum\.org\.uk$/,
  /(^|\.)ushmm\.org$/, /(^|\.)yadvashem\.org$/, /(^|\.)auschwitz\.org$/, /(^|\.)nobelprize\.org$/,
  /(^|\.)metmuseum\.org$/, /(^|\.)hpmmuseum\.jp$/, /(^|\.)911memorial\.org$/, /(^|\.)19371213\.(net|com\.cn|org\.cn)$/,
  /(^|\.)teara\.govt\.nz$/, /(^|\.)tepapa\.govt\.nz$/, /(^|\.)chateauversailles\.fr$/,
  /(^|\.)edu$/, /(^|\.)ac\.uk$/, /(^|\.)ac\.nz$/, /(^|\.)cern\.ch$/,
];
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const isInstitutional = (u) => INSTITUTIONAL.some((re) => re.test(host(u)));
const isEncyclopedic = (u) => ENCY.test(host(u));
const entries = Object.entries(details);
const sources = entries.flatMap(([id, d]) => (d.sources || []).filter((s) => s.url).map((s) => ({ id, ...s, host: host(s.url) })));
const institutional = sources.filter((s) => isInstitutional(s.url));
const encyclopedic = sources.filter((s) => isEncyclopedic(s.url));
const other = sources.filter((s) => !isInstitutional(s.url) && !isEncyclopedic(s.url));
const byEntry = {};
for (const e of entries) byEntry[e[0]] = (e[1].sources || []).filter((s) => s.url);
const withoutInstitution = entries.filter(([id]) => !(byEntry[id] || []).some((s) => isInstitutional(s.url))).map(([id]) => id);
const missingTwo = entries.filter(([id]) => (byEntry[id] || []).length < 2).map(([id]) => id);
const dupUrls = Object.entries(sources.reduce((a, s) => { a[s.url] = (a[s.url] || 0) + 1; return a; }, {})).filter(([, n]) => n > 1);
const slug = (str) => String(str).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "event";
const ids = {};
const dupIds = [];
events.forEach((e) => { const id = e.id || slug(e.t[1]); ids[id] = (ids[id] || 0) + 1; if (ids[id] === 2) dupIds.push(id); });
const badGeo = events.filter((e) => !(e.y >= -12000 && e.y <= 2026) || !(e.lat >= -90 && e.lat <= 90) || !(e.lon >= -180 && e.lon <= 180));
const SENS = /南京|大屠杀|屠杀|奥斯维辛|核爆|广岛|长崎|印巴|分治|殖民|奴隶|西藏|新疆|台湾|战争|袭击|饥荒|瘟疫/;
const sensitive = entries.filter(([id, d]) => SENS.test(JSON.stringify(d))).map(([id]) => id);
// Mixed CJK/ASCII spacing ("是 近代 史上") is a translation-merge artefact.
const cjkSpacing = entries.filter(([id, d]) => /[\u4e00-\u9fff]\s+[\u4e00-\u9fff]/.test(JSON.stringify(d))).map(([id]) => id);
const report = {
  entries: entries.length,
  sources: sources.length,
  uniqueUrls: new Set(sources.map((s) => s.url)).size,
  institutionalSources: institutional.length,
  institutionalShare: +(institutional.length / Math.max(1, sources.length)).toFixed(3),
  encyclopedicSources: encyclopedic.length,
  encyclopedicShare: +(encyclopedic.length / Math.max(1, sources.length)).toFixed(3),
  otherSources: other.length,
  otherShare: +(other.length / Math.max(1, sources.length)).toFixed(3),
  entriesWithoutInstitution: withoutInstitution.length,
  entriesWithoutInstitutionList: withoutInstitution,
  missingTwoSources: missingTwo,
  duplicateUrls: dupUrls.slice(0, 5),
  duplicateEventIds: dupIds,
  badGeo: badGeo.map((e) => e.id),
  cjkSpacingIssues: cjkSpacing,
  sensitiveEntries: sensitive.length,
  sensitiveSample: sensitive.slice(0, 12),
  topHosts: Object.entries(sources.reduce((a, s) => { a[s.host] = (a[s.host] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8),
};
// label collision sample
const browser = await chromium.launch({ channel: "chrome" });
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage();
  const rows = [];
  for (const year of [1000, 1300, 1500, 1700, 1800, 1815, 1914, 1937, 1945, 2026]) {
    await page.goto(`http://localhost:8001/?year=${year}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.HistoricalEntities && window.HistoricalEntities.ready, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(500);
    rows.push(await page.evaluate(() => ({
      labels: (window.HistoricalEntities.lastLabels || []).length,
      skipped: (window.HistoricalEntities.lastSkipped || []).length,
      edge: (window.HistoricalEntities.lastLabels || []).filter(([n, x, y]) => x < 24 || y < 24).length,
    })));
  }
  report[`labelCollision_${vp.width}`] = rows;
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
