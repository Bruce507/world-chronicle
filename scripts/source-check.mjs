#!/usr/bin/env node
/* Live check of every source URL used by the dossiers.
 *
 * Not part of CI: it needs the open internet and polite pacing, and a site can
 * be temporarily down. Run it before a release or when adding sources.
 *
 *   python3 -m http.server 8001 --directory .   (not required — reads JSON only)
 *   node scripts/source-check.mjs [--limit N] [--json docs/source-check.json]
 *
 * Exit code 1 if any URL returns 404/410 or fails to load.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : "";

const details = JSON.parse(fs.readFileSync("data/event_details.json", "utf8"));
const seen = new Map();
for (const [id, d] of Object.entries(details)) {
  for (const s of d.sources || []) {
    if (!s.url) continue;
    if (!seen.has(s.url)) seen.set(s.url, { url: s.url, label: s.label || "", entries: [] });
    seen.get(s.url).entries.push(id);
  }
}
const urls = [...seen.values()].slice(0, limit);

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();
const out = [];
for (const item of urls) {
  let status = 0, title = "", error = "";
  try {
    const res = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = res ? res.status() : 0;
    await page.waitForTimeout(350);
    title = (await page.title()).replace(/\s+/g, " ").slice(0, 90);
  } catch (err) {
    error = String(err.message).split("\n")[0].slice(0, 80);
  }
  // 403 is usually a bot challenge, not a dead page: report it, don't fail.
  const ok = status >= 200 && status < 400;
  out.push({ ...item, status, title, error, ok });
  console.log((ok ? "  ok  " : "  !!  ") + status + "  " + item.url + (title ? " — " + title : error ? " — " + error : ""));
  await page.waitForTimeout(250);
}
await browser.close();

const bad = out.filter((r) => !r.ok);
const summary = { checked: out.length, ok: out.length - bad.length, failed: bad.length, failedUrls: bad.map((b) => ({ url: b.url, status: b.status, error: b.error })) };
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ generatedAt: new Date().toISOString(), summary, results: out }, null, 2));
console.log("\n" + JSON.stringify(summary, null, 2));
process.exit(bad.length ? 1 : 0);
