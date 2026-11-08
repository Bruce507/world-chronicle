import { chromium } from "playwright";
import fs from "node:fs";
const det = JSON.parse(fs.readFileSync("data/event_details.json", "utf8"));
const ids = Object.keys(det);
const browser = await chromium.launch({ channel: "chrome" });
// Pin the browser locale: CI runners default to en-US and the app follows
// navigator.language, which would render English section headings.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:8001/?year=1500", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
await page.evaluate(() => window.atlasAPI.openEvent(window.WORLD_ATLAS.events[0]));
await page.waitForFunction(() => window.WORLD_ATLAS.eventDetails && !window.WORLD_ATLAS.detailsLoading, null, { timeout: 20000 });
let fail = [];
for (const id of ids) {
  const res = await page.evaluate((id) => {
    const ev = window.WORLD_ATLAS.events.find((e) => e.id === id);
    if (!ev) return { missing: true };
    window.atlasAPI.openEvent(ev);
    const body = document.querySelector("#panel-body");
    const text = body.textContent;
    return {
      bg: text.includes("背景"),
      missingBg: text.includes("详细背景待补"),
      why: text.includes("为何重要"),
      links: body.querySelectorAll(".ev-detail-section a").length,
      summary: !!body.querySelector(".ev-detail-section"),
    };
  }, id);
  const needWhy = !!det[id].why;
  if (res.missing || res.missingBg || !res.bg || (needWhy && !res.why) || res.links < 2) fail.push([id, res]);
}
console.log("checked", ids.length, "fail", fail.length);
console.log(JSON.stringify(fail.slice(0, 20)));
console.log("errors", errs.length, errs.slice(0, 3));
await browser.close();
