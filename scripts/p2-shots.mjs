import { chromium } from "playwright";
const BASE = "http://localhost:8001/";
const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
async function openPage(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(BASE + "?year=1500&lang=zh", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { const b = document.querySelector("#ob-start"); if (b) b.click(); });
  await page.waitForTimeout(300);
  return { ctx, page };
}
const shots = [
  ["war-kadesh", "battle-of-kadesh", 2200],
  ["war-constantine", "fall-of-constantinople", 2400],
  ["revolution-haiti", "haitian-revolution", 2200],
  ["city-jericho", "jericho", 2200],
  ["trade-lapita", "lapita-voyagers", 2200],
  ["trade-sheba", "sheba-and-the-incense-road", 2200],
  ["atomic-bikini", "bikini-atoll-tests", 7000],
  ["founding-carthage", "founding-of-carthage", 2200],
  ["disaster-thera", "thera-eruption", 2200],
  ["hero-silk", "the-silk-road", 2200],
  ["hero-giza", "pyramids-of-giza", 2200],
  ["hero-hiroshima", "hiroshima", 6800],
  ["hero-xuanzang", "xuanzangs-journey-to-the-west", 2400],
  ["variant-magellan", "magellans-circumnavigation", 2200],
  ["variant-mayflower", "the-mayflower", 2200],
];
const { ctx, page } = await openPage({ width: 1440, height: 900 });
for (const [name, id, wait] of shots) {
  const ok = await page.evaluate((id) => {
    const ev = window.WORLD_ATLAS.events.find((e) => e.id === id);
    if (!ev) return false;
    window.atlasAPI.openEvent(ev);
    return true;
  }, id);
  if (!ok) { console.log("MISSING", id); continue; }
  await page.waitForTimeout(wait);
  const info = await page.evaluate(() => ({
    mode: window.MapTheatre.mode, hero: window.MapTheatre.hero, vb: window.MapTheatre.variant,
    active: window.MapTheatre.active, alpha: +window.MapTheatre.alpha.toFixed(2),
    stageR: window.MapTheatre.stage ? Math.round(window.MapTheatre.stageR(window.atlasAPI.map)) : 0,
    targetW: Math.round(window.MapTheatre.sceneTargetW(window.atlasAPI.map)),
  }));
  await page.screenshot({ path: `docs/p2-shots/p2-1-${name}.jpg`, type: "jpeg", quality: 82 });
  console.log(name, JSON.stringify(info));
}
await page.waitForTimeout(16500);
const still = await page.evaluate(() => ({
  active: window.MapTheatre.active,
  units: window.MapTheatre.units.length,
  still: !!window.MapTheatre.still,
  stillP: window.MapTheatre.still && window.MapTheatre.still.p,
}));
console.log("after16s", JSON.stringify(still));
await page.screenshot({ path: "docs/p2-shots/p2-1-still-after-16s.jpg", type: "jpeg", quality: 82 });
await ctx.close();

const mob = await openPage({ width: 390, height: 844 });
for (const [name, id, wait] of [["m-war-kadesh","battle-of-kadesh",2200],["m-trade-lapita","lapita-voyagers",2200],["m-rev-haiti","haitian-revolution",2200],["m-hero-giza","pyramids-of-giza",2200]]) {
  await mob.page.evaluate((id) => { const ev = window.WORLD_ATLAS.events.find((e) => e.id === id); window.atlasAPI.openEvent(ev); }, id);
  await mob.page.waitForTimeout(wait);
  await mob.page.screenshot({ path: `docs/p2-shots/p2-1-${name}.jpg`, type: "jpeg", quality: 82 });
}
await mob.ctx.close();
console.log("ERRORS", errors.length, errors.slice(0, 5).join(" | "));
await browser.close();
