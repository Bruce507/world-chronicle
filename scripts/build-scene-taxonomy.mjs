#!/usr/bin/env node
/* Standard-A audit: assign every event a visual family and report mismatches.
   The generated JSON is the intended single source for data/scene_variants.json. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const events = read("data/events.json");
const A = { events };

// current runtime classifier (read-only, for the audit)
const ctx = { window: { WORLD_ATLAS: A }, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data_bundle.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/scenes.js"), "utf8"), ctx);
A.events = ctx.window.WORLD_ATLAS.events;
const currentStyle = (ev) => ctx.window.Scenes.styleFor(ev);

const OVERRIDES = {
  "gobekli-tepe": "megalith",
  "stonehenge": "megalith",
  "moai-of-rapa-nui": "megalith",
  "pyramids-of-giza": "pyramid",
  "caral": "pyramid",
  "uruk": "ziggurat",
  "ur": "ziggurat",
  "babylon": "ziggurat",
  "ziggurat-of-ur": "ziggurat",
  "taj-mahal": "mughal-tomb",
  "borobudur": "stupa",
  "bagan": "stupa",
  "angkor-wat": "stupa",
  "khmer-empire": "stupa",
  "hagia-sophia": "mosque",
  "dome-of-the-rock": "mosque",
  "notre-dame": "church",
  "forbidden-city": "palace",
  "versailles": "palace",
  "sargon-of-akkad": "ziggurat",
  "hittite-chariot-empire": "chariot",
  "carthage-founded": "castle-founding",
  "nerchinsk-treaty": "treaty",
  "treaty-of-westphalia": "treaty",
  "peace-of-westphalia": "treaty",
  "treaty-of-versailles": "treaty",
  "the-treaty-of-versailles": "treaty",
  "nanking-treaty": "treaty",
  "united-nations-founded": "treaty",
  "magna-carta": "treaty",
  "cai-lun-improves-papermaking": "paper",
  "gutenbergs-press": "printing",
  "russian-revolution": "revolution",
  "french-revolution": "revolution",
  "haitian-revolution": "revolution",
  "qing-takes-beijing": "cn-cavalry",
  "peloponnesian-war": "greek-naval",
  "the-punic-wars": "greek-naval",
  "founding-of-rome": "roman-founding",
  "roman-empire": "roman-founding",
  "song-dynasty": "cn-founding",
  "qin-unifies-china": "cn-founding",
  "tang-dynasty": "cn-founding",
  "ming-dynasty": "cn-founding",
  "peoples-republic-of-china": "modern-founding",
  "world-war-i": "trench",
  "world-war-ii-begins": "trench",
  "battle-of-stalingrad": "trench",
  "d-day": "trench",
  "battle-of-britain": "air",
  "pearl-harbor": "naval",
  "hiroshima": "atomic",
  "nagasaki": "atomic",
  "the-black-death": "plague",
  "chernobyl": "disaster",
  "fukushima-disaster": "disaster",
  "indian-ocean-tsunami": "wave",
  "sargon-and-akkad": "ziggurat",
  "assyria-and-nineveh": "ziggurat",
  "babylonian-exile": "siege",
  "cyrus-takes-babylon": "siege",
  "persepolis": "palace",
  "hittite-chariot-empire": "chariot",
  "vedic-tradition": "city-classical",
  "amarna-revolution": "temple",
  "kingdom-of-kush": "pyramid",
  "first-olympic-games": "city-classical",
  "homeric-epics": "city-classical",
  "birth-of-the-buddha": "stupa",
  "birth-of-confucius": "temple",
  "birth-of-jesus": "church",
  "moche-civilization": "pyramid",
  "teotihuacan": "pyramid",
  "gupta-golden-age": "south-asian-founding",
  "nazca-lines": "megalith",
  "majapahit": "sea-founding",
  "zheng-hes-voyages": "junk",
  "magellan-in-the-philippines": "caravel",
  "manila-galleon-trade": "galleon",
  "the-mayflower": "caravel",
  "dutch-east-india-company": "caravel",
  "english-east-india-company": "caravel",
  "the-atlantic-slave-trade": "caravel",
  "versailles": "palace",
  "unification-of-egypt": "african-founding",
  "founding-of-carthage": "african-founding",
  "mali-empire": "african-founding",
  "tenochtitlan-founded": "american-founding",
  "inca-empire": "american-founding",
  "genghis-khan": "steppe-founding",
  "timurid-empire": "steppe-founding",
  "srivijaya": "sea-founding",
  "khmer-empire": "stupa",
  "borobudur": "stupa",
  "bagan": "stupa",
  "hagia-sophia": "mosque",
  "dome-of-the-rock": "mosque",
  "cairo-founded": "islamic-founding",
  "code-of-hammurabi": "script",
  "diamond-sutra-printed": "printing",
  "united-nations-founded": "treaty",
  "notre-dame": "church",
  "forbidden-city": "palace",
  "nanking-treaty": "treaty",
  "unification-of-egypt": "pyramid",
  "founding-of-carthage": "sea-founding",
  "marrakesh-founded": "islamic-founding",
  "st-petersburg-founded": "modern-founding",
  "kyivan-rus-baptized": "church",
  "east-west-schism": "church",
  "hangul-proclaimed": "script",
  "oracle-bones-at-yinxu": "script",
};

const HERO = new Set([
  "song-dynasty", "qing-takes-beijing", "russian-revolution", "taj-mahal",
  "cai-lun-improves-papermaking", "founding-of-rome", "peloponnesian-war",
  "zheng-hes-voyages", "the-silk-road",
  "hiroshima", "nagasaki", "columbus-reaches-the-americas",
  "xuanzangs-journey-to-the-west", "apollo-11", "japan-announces-surrender",
  "pyramids-of-giza", "code-of-hammurabi", "athenian-democracy",
  "qin-unifies-china", "maurya-empire",
  "the-hijra", "genghis-khan", "mali-empire",
  "borobudur", "tenochtitlan-founded", "maori-reach-aotearoa",
  "gutenbergs-press", "vasco-da-gama-reaches-india", "fall-of-the-inca",
  "french-revolution", "partition-of-india", "the-world-wide-web",
]);

function titleOf(ev) { return ((ev.t && ev.t[0]) || "") + " " + ((ev.t && ev.t[1]) || ""); }
function has(t, re) { return re.test(t); }

function expectedStyle(ev) {
  const id = ev.id || "";
  if (OVERRIDES[id]) return OVERRIDES[id];
  const t = titleOf(ev);
  const y = ev.y, s = ev.s, k = ev.k, rg = ev.rg, c = ev.c;
  const founding = !has(t, /灭亡|崩溃|终结|陷落|战败|沦陷|fall of|collapse|end of|sack of/i)
    && has(t, /建立|建国|开国|成立|加冕|王朝|帝国|统一|独立|founded|founding|coronation|dynasty|empire|unification|independence|declares/i);
  if (founding) {
    if (y >= 1776) return "modern-founding";
    if (c === "CN" || rg === "ea") return "cn-founding";
    if (c === "IT" || c === "GR" || /rome|roman|greek|byzant/i.test(t)) return "roman-founding";
    if (rg === "ca") return "steppe-founding";
    if (rg === "sa") return "south-asian-founding";
    if (rg === "sea") return "sea-founding";
    if (rg === "af") return "african-founding";
    if (rg === "na" || rg === "la") return "american-founding";
    if (rg === "me") return "islamic-founding";
    if (y <= -3000) return "megalith";
    return "castle-founding";
  }
  if (has(t, /pyramid|金字塔/i)) return "pyramid";
  if (has(t, /ziggurat|uruk|ur\b|babylon|sumer|akkad|assyria|塔庙|巴比伦|苏美尔|阿卡德|亚述/i)) return "ziggurat";
  if (has(t, /taj mahal|泰姬陵/i)) return "mughal-tomb";
  if (has(t, /stupa|borobudur|bagan|buddhist|pagoda|佛塔|婆罗浮屠|蒲甘|吴哥|寺庙/i)) return "stupa";
  if (has(t, /mosque|hagia sophia|dome of the rock|清真寺|圣索菲亚|圆顶清真寺/i)) return "mosque";
  if (has(t, /cathedral|church|notre.dame|教堂|大教堂|圣母院/i)) return "church";
  if (has(t, /forbidden city|palace|alhambra|versailles|故宫|宫殿|凡尔赛/i)) return "palace";
  if (has(t, /stonehenge|gobekli|megalith|moai|easter island|巨石|哥贝克力|复活节岛/i)) return "megalith";
  if (k === "temple") return (rg === "sa" || rg === "sea") ? "stupa" : "temple";
  if (has(t, /treaty|peace of|和约|条约|协定|停战|投降书/i)) return "treaty";
  if (has(t, /paper|造纸|蔡伦/i)) return "paper";
  if (has(t, /printing|印刷|古腾堡/i)) return "printing";
  if (has(t, /writing|script|cuneiform|alphabet|文字|楔形|字母/i)) return "script";
  if (s === "atomic") return "atomic";
  if (s === "plague") return "plague";
  if (s === "disaster") return (rg === "oc" || /tsunami|wave|海啸/i.test(t)) ? "wave" : "disaster";
  if (s === "chariot") return "chariot";
  if (s === "phalanx") return "phalanx";
  if (s === "siege") return "siege";
  if (s === "cavalry") return (rg === "ea" || c === "CN") ? "cn-cavalry" : "cavalry";
  if (s === "naval") return (y < -200 && (rg === "eu" || rg === "me")) ? "greek-naval" : "naval";
  if (s === "cannon") return "cannon";
  if (s === "musket") return "musket";
  if (s === "trench") return "trench";
  if (s === "air") return "air";
  if (s === "camel") return "camel";
  if (s === "junk") return "junk";
  if (s === "caravel") return "caravel";
  if (s === "galleon") return "galleon";
  if (s === "ship") {
    if (k === "trade" || k === "exploration") {
      if (rg === "ea" || rg === "sea") return "junk";
      if (y >= 1450) return "caravel";
      return "ship";
    }
    return "naval";
  }
  if (s === "revolution" || s === "protest") return "revolution";
  if (has(t, /independence|独立|建国|成立/i)) return "modern-founding";
  if (s === "industry") return "industry";
  if (s === "rocket") return "rocket";
  if (s === "digital") return "digital";
  if (s === "pilgrim") return "pilgrim";
  if (s === "hunt") return "hunt";
  if (s === "agri") return "agri";
  if (s === "march") return "march";
  if (s === "city") {
    if (y < -3000) return "city-ancient";
    if (y < 500) return "city-classical";
    if (y < 1500) return "city-medieval";
    if (y < 1900) return "city-earlymodern";
    return "city-modern";
  }
  return k === "temple" ? "temple" : "city";
}

const rows = [];
const mismatches = [];
const counts = {};
for (const ev of A.events) {
  const cur = currentStyle(ev);
  const exp = expectedStyle(ev);
  counts[exp] = (counts[exp] || 0) + 1;
  const mismatch = cur !== exp;
  if (mismatch) mismatches.push({ ev, cur, exp });
  rows.push({ ev, cur, exp, mismatch });
}
// Plain code-unit comparison: localeCompare depends on the Node ICU build and
// would order rows differently on the CI runner.
rows.sort((a, b) => (a.ev.y - b.ev.y) || (a.ev.t[0] < b.ev.t[0] ? -1 : a.ev.t[0] > b.ev.t[0] ? 1 : 0));

let md = `# 场景分型审计 / Scene coverage audit\n\n`;
// No build timestamp: this file is committed and diffed in CI, and a date
// stamp makes every run after midnight fail the "generated files" check.
md += `Standard A: every event has a correct visual family; the ${HERO.size} hero entries have bespoke illustration scenes (pilot batches: 12 + 6 + 6 + 6 themes).\n\n`;
md += `- 事件总数：${A.events.length}\n- 当前分派：${Object.keys(counts).length} 个家族\n- 需要修正：${mismatches.length}\n- 英雄条目：${HERO.size}\n\n`;
md += `## 家族分布（目标）\n\n| 家族 | 事件数 |\n|---|---:|\n`;
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { md += `| \`${k}\` | ${v} |\n`; });
md += `\n## 需要修正的分派（${mismatches.length}）\n\n| 年份 | ID | 事件 | 当前 | 目标 |\n|---:|---|---|---|---|\n`;
for (const m of mismatches) {
  md += `| ${m.ev.y} | \`${m.ev.id}\` | ${m.ev.t[0]} | \`${m.cur}\` | \`${m.exp}\` |\n`;
}
md += `\n## 全量清单\n\n| 年份 | ID | 事件 | 地区 | 当前 | 目标 | 英雄 |\n|---:|---|---|---|---|---|---|\n`;
for (const r of rows) {
  md += `| ${r.ev.y} | \`${r.ev.id}\` | ${r.ev.t[0]} | ${r.ev.rg} | \`${r.cur}\` | \`${r.exp}\` | ${HERO.has(r.ev.id) ? "★" : ""} |\n`;
}

fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs/scene-coverage.md"), md);
fs.writeFileSync(path.join(ROOT, "data/scene_variants.json"), JSON.stringify(
  Object.fromEntries(rows.map((r) => [r.ev.id, r.exp])), null, 2
));
console.log(`✓ docs/scene-coverage.md — ${rows.length} events, ${mismatches.length} mismatches`);
console.log(`✓ data/scene_variants.json — ${Object.keys(counts).length} families`);
