#!/usr/bin/env node
/* Scene diversity audit + blind-test sheets for the Tier B variants.
   Usage: python3 -m http.server 8001 --directory .   (in another shell)
          node scripts/scene-diversity.mjs [--sheets]
   Writes docs/scene-diversity-2026-11.md and, with --sheets, unlabeled
   contact sheets + a key into docs/blind-test-2026-11/. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:8001/";
const OUT = "docs/blind-test-2026-11";
const WANT_SHEETS = process.argv.includes("--sheets");
const W = 480, H = 300, T = 8, THUMB_W = 64, THUMB_H = 40;

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await ctx.newPage();
await page.goto(BASE + "?year=1937", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.HeroScenes && window.VariantScenes, null, { timeout: 20000 });

/* Render every scene to a 480×300 frame and return a 64×40 grey thumb. */
const data = await page.evaluate(({ W, H, T, TW, TH }) => {
  const render = (draw) => {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    draw(c);
    const t = document.createElement("canvas");
    t.width = TW; t.height = TH;
    const g = t.getContext("2d");
    g.drawImage(cv, 0, 0, TW, TH);
    const px = g.getImageData(0, 0, TW, TH).data;
    const grey = [];
    for (let i = 0; i < px.length; i += 4) grey.push(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    return grey;
  };
  const hero = window.HeroScenes.list().map((id) => ({ id, grey: render((c) => window.HeroScenes.drawStage(c, id, W, H, T)), title: window.HeroScenes.title(id) }));
  const variants = window.VariantScenes.list().map((id) => {
    const p = window.VariantScenes.params(id) || {};
    return {
      id, grey: render((c) => window.VariantScenes.drawStage(c, id, W, H, T)),
      family: p.family, structure: p.structure || p.kind || "", title: p.title || id,
      palette: p.palette, facade: p.facade || "", landmark: p.landmark || "", hall: p.hall || "", skyline: p.skyline || "",
    };
  });
  return { hero, variants };
}, { W, H, T, TW: THUMB_W, TH: THUMB_H });

const diff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length / 255;
};
const meanPair = (arr) => {
  if (arr.length < 2) return null;
  let s = 0, n = 0;
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { s += diff(arr[i].grey, arr[j].grey); n++; }
  return s / n;
};
const groupBy = (arr, key) => {
  const m = new Map();
  for (const x of arr) {
    const k = typeof key === "function" ? key(x) : x[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
};
const fmt = (v) => (v == null ? "—" : v.toFixed(3));
const hero = data.hero, tb = data.variants;
const heroMean = meanPair(hero);
const tbMean = meanPair(tb);
const fam = groupBy(tb, "family");
const modernSub = groupBy(tb.filter((x) => x.family === "modern"), "structure");
const disasterSub = groupBy(tb.filter((x) => x.family === "disaster"), "structure");
const subgroup = groupBy(tb, (x) => x.family + " / " + (x.structure || "—"));

let md = `# 场景多样性审计 / Scene diversity audit\n\n`;
md += `Date 2026-11-08。方法：每个场景渲染 480×300、取第 8 秒静态帧，缩到 64×40 灰度，计算两两平均绝对差（0 = 完全相同，1 = 完全不同）。Hero 作为上限参照。\n\n`;
md += `| 组 | 数量 | 平均两两差异 |\n|---|---:|---:|\n`;
md += `| Hero | ${hero.length} | **${fmt(heroMean)}** |\n`;
md += `| Tier B 全部 | ${tb.length} | **${fmt(tbMean)}** |\n`;
for (const [k, arr] of fam) md += `| Tier B · ${k} | ${arr.length} | ${fmt(meanPair(arr))} |\n`;
md += `\n## 子构图\n\n| 子构图 | 数量 | 平均两两差异 |\n|---|---:|---:|\n`;
for (const [k, arr] of subgroup) md += `| ${k} | ${arr.length} | ${fmt(meanPair(arr))} |\n`;
md += `\n## 结论\n\n`;
md += `- Tier B 整体差异为 Hero 的 **${Math.round((tbMean / heroMean) * 100)}%**。像素差异只是代理指标：本轮新增的是**剪影**，它们在小图里占比不大，但在 480×300 下可读。\n`;
md += `- modern：五个阳台变体分别有乔治式山花、加勒比瓦顶与拱廊、热带檐廊与蕉叶、歌剧院柱廊、殖民式女儿墙；三个街垒变体分别有教堂、工厂、棕榈/海堤、钟楼、城门、宣礼塔；四个议会厅分别有雕像壁龛、穹顶天窗、时钟、公众旁听席。\n`;
md += `- disaster：三次地震分别拆出里斯本河岸双塔、关东木屋与火灾、墨西哥中层街区；两次海啸拆出印度洋渔村与福岛厂区/海堤/输电塔。\n`;
md += `- siege：13 个事件加了穹顶、柱廊、工厂、棕榈、金字塔、尖塔、桨帆船、铁路、桥、坦克、芦苇等地标；城墙/营地仍是共享语法，是最弱的一组。\n`;
md += `- 盲测仍未进行。盲测包已生成（\`docs/blind-test-2026-11/\`），需要 6 名评审；本文件不把差异度当作"质量已达标"。\n`;
fs.writeFileSync("docs/scene-diversity-2026-11.md", md);
console.log(md);

/* Blind-test sheets: unlabeled, numbered; key stored separately. */
if (WANT_SHEETS) {
  fs.mkdirSync(OUT, { recursive: true });
  const sheets = [];
  for (const [family, arr] of fam) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += 10) chunks.push(arr.slice(i, i + 10));
    chunks.forEach((chunk, ci) => sheets.push({ name: family + (chunks.length > 1 ? "-" + (ci + 1) : ""), items: chunk }));
  }
  const key = {};
  for (const sheet of sheets) {
    const ids = sheet.items.map((x) => x.id);
    const url = await page.evaluate(({ ids, W, H, T }) => {
      const cols = 5, rows = Math.ceil(ids.length / cols), cellW = 320, cellH = 200, pad = 14, labelH = 26;
      const cv = document.createElement("canvas");
      cv.width = cols * (cellW + pad) + pad;
      cv.height = rows * (cellH + labelH + pad) + pad;
      const g = cv.getContext("2d");
      g.fillStyle = "#f7f2e8"; g.fillRect(0, 0, cv.width, cv.height);
      ids.forEach((id, i) => {
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        window.VariantScenes.drawStage(c.getContext("2d"), id, W, H, T);
        const x = pad + (i % cols) * (cellW + pad);
        const y = pad + Math.floor(i / cols) * (cellH + labelH + pad);
        g.drawImage(c, x, y, cellW, cellH);
        g.strokeStyle = "rgba(60,46,32,0.35)"; g.lineWidth = 1; g.strokeRect(x, y, cellW, cellH);
        g.fillStyle = "#2b241b"; g.font = "600 18px -apple-system, 'Helvetica Neue', sans-serif";
        g.fillText("#" + (i + 1), x + 6, y + cellH + 19);
      });
      return cv.toDataURL("image/png");
    }, { ids, W, H, T });
    fs.writeFileSync(path.join(OUT, "sheet-" + sheet.name + ".png"), Buffer.from(url.split(",")[1], "base64"));
    key[sheet.name] = ids;
  }
  fs.writeFileSync(path.join(OUT, "key.json"), JSON.stringify(key, null, 2) + "\n");
  console.log("blind-test sheets:", Object.keys(key).join(", "));
}

await browser.close();
