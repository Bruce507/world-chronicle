#!/usr/bin/env node
/* Phase 0 reports: major-event inventory, region × era coverage, entity gaps. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const events = read("data/events.json");
const meta = read("data/meta.json");
const theatre = read("data/theatre.json").theatres || {};
const details = read("data/event_details.json");
const groups = read("data/event_groups.json");
const entities = read("data/historical_entities.json").entities || [];

const slug = (s) => String(s).toLowerCase().normalize("NFKD")
  .replace(/[̀-ͯ]/g, "").replace(/['’]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "event";
const used = {};
events.forEach((e) => {
  let base = e.id || slug(e.t[1]);
  let id = base, n = 2;
  while (used[id]) id = base + "-" + n++;
  used[id] = 1;
  e.id = id;
});
const byId = Object.fromEntries(events.map((e) => [e.id, e]));
const groupOf = {};
for (const g of Object.values(groups)) for (const id of g.events || []) groupOf[id] = g.id;
const regions = meta.regions || {};
const eras = meta.eras || [];
const eraOf = (y) => eras.find((e, i) => (y >= e.from && y < e.to) || i === eras.length - 1) || eras[0];

const level = (e) => {
  const d = details[e.id];
  if (!d) return "brief";
  return d.background && d.course && d.outcome ? "full" : "brief";
};
const featured = events.filter((e) => e.f).sort((a, b) => (a.y - b.y) || (a.t[0] < b.t[0] ? -1 : a.t[0] > b.t[0] ? 1 : 0));

let md = `# 重大事件清单 / Major events inventory\n\n`;
md += `Source: \`data/events.json\`.\n\n`;
md += `| 总数 | 重点事件 | 有专属动态 | 完整详情 | 结构化简版 |\n|---:|---:|---:|---:|---:|\n`;
md += `| ${events.length} | ${featured.length} | ${featured.filter((e) => theatre[e.id]).length} | ${featured.filter((e) => level(e) === "full").length} | ${featured.filter((e) => level(e) === "brief").length} |\n\n`;
md += `## 重点事件（\`f:1\`）\n\n`;
md += `| 年份 | ID | 事件 | 地域 | 国家/实体 | 动态 | 详情 | 事件组 |\n|---:|---|---|---|---|---|---|---|\n`;
for (const e of featured) {
  const dyn = theatre[e.id] ? "专属" : "示意/无";
  md += `| ${e.y} | \`${e.id}\` | ${e.t[0]} / ${e.t[1]} | ${regions[e.rg] ? regions[e.rg].zh : e.rg} | ${e.c || "—"} | ${dyn} | ${level(e)} | ${groupOf[e.id] || "—"} |\n`;
}
md += `\n## 日本 1945 事件链\n\n`;
md += `| 年份 | ID | 事件 | 动态 | 详情 |\n|---:|---|---|---|---|\n`;
for (const id of groups["japan-1945"].events) {
  const e = byId[id];
  if (!e) continue;
  md += `| ${e.y} | \`${id}\` | ${e.t[0]} / ${e.t[1]} | ${theatre[id] ? "专属" : "事件组/示意"} | ${level(e)} |\n`;
}

const regionKeys = Object.keys(regions);
let cm = `# 地区 × 时代覆盖矩阵\n\n`;
cm += `重点事件数 / 全部事件数。历史实体数为该地区在代表年份 active 的实体数。\n\n`;
cm += `| 地区 | ${eras.map((e) => e.zh).join(" | ")} |\n|---|${eras.map(() => "---:").join("|")}|\n`;
for (const rg of regionKeys) {
  const cells = eras.map((era) => {
    const evs = events.filter((e) => e.rg === rg && e.y >= era.from && (e.y < era.to || era === eras[eras.length - 1]));
    const f = evs.filter((e) => e.f).length;
    return `${f} / ${evs.length}`;
  });
  cm += `| ${regions[rg].zh} | ${cells.join(" | ")} |\n`;
}
cm += `\n## 历史实体覆盖（按代表年份）\n\n| 年份 | 活跃实体 | 其中现代国家 | 策展实体 |\n|---:|---:|---:|---:|\n`;
for (const y of [-3000, -1000, 1, 500, 1000, 1500, 1770, 1901, 1945, 2026]) {
  const active = entities.filter((e) => e.from <= y && e.to >= y);
  cm += `| ${y} | ${active.length} | ${active.filter((e) => e.type === "modern").length} | ${active.filter((e) => e.source === "curated").length} |\n`;
}
cm += `\n## 数据缺口说明\n\n`;
cm += `- 历史实体由 18 个全球快照、现代国家形成年与少量策展实体生成；快照之间的年份为近似区间，已标 \`approx: true\`。\n`;
cm += `- 没有命名实体的地区/年份留空，不回退现代国名。\n`;
cm += `- 前 3000 年以前、太平洋岛屿与部分原住民群体覆盖不足；需继续补充专门数据，不以推测填补。\n`;

fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs/major-events.md"), md);
fs.writeFileSync(path.join(ROOT, "docs/coverage-matrix.md"), cm);
console.log(`✓ docs/major-events.md (${featured.length} featured events)`);
console.log("✓ docs/coverage-matrix.md");
