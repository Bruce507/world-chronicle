#!/usr/bin/env node
/* Build the historical label/entity layer from the simplified snapshots,
   the modern state-birth table and a small curated set of key entities.
   Source data: aourednik/historical-basemaps (GPL-3.0). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const manifest = read("data/historical/manifest.json");
const world = read("data/world.geo.json");
const states = read("data/state_changes.json");
const curated = read("data/entities_curated.json");
const nameGloss = read("data/name_gloss.json");
const nameI18n = read("data/entity_name_i18n.json").names || {};
// ES/FR/AR for high-frequency snapshot labels. Anything missing stays English
// on purpose: an invented translation is worse than a visible fallback.
function withI18n(name, base) {
  const extra = nameI18n[name];
  if (extra) for (const lang of ["es", "fr", "ar"]) if (extra[lang]) base[lang] = extra[lang];
  return base;
}
const clamps = read("data/entity_clamps.json");
const clampByName = clamps.byName || {};
const clampById = clamps.byId || {};
const dropNames = new Set((clamps.drop || []).map((n) => String(n).toLowerCase()));

const slug = (s) => String(s).toLowerCase().normalize("NFKD")
  .replace(/[̀-ͯ]/g, "").replace(/['’]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "entity";

const years = manifest.snapshots.map((s) => s.year);
const snapshots = manifest.snapshots.map((s) => ({ ...s, data: read(path.join("data/historical", s.file)) }));

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}
function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
  }
  if (Math.abs(a) < 1e-9) {
    const n = ring.length || 1;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function geometryLabel(geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let best = null;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 3) continue;
    const a = Math.abs(ringArea(ring));
    if (!best || a > best.area) best = { ring, area: a };
  }
  if (!best) return null;
  let [lon, lat] = ringCentroid(best.ring);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (!pointInRing(lon, lat, best.ring)) {
    // concave / malformed ring: use the bbox centre, then the first vertex
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of best.ring) {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }
    lon = (minX + maxX) / 2; lat = (minY + maxY) / 2;
    if (!pointInRing(lon, lat, best.ring)) { lon = best.ring[0][0]; lat = best.ring[0][1]; }
  }
  return { lat, lon, area: best.area };
}

function kindOf(name) {
  const n = String(name || "").toLowerCase();
  if (/hunter|gather|farmer|herder|nomad|peoples|people|culture|aborig|inuit|thule|siber|bantu|maya|olmec|polyn|melanes|micron|chiefdom|tribe|clan/.test(n)) return "culture";
  return "state";
}

const modernBirth = new Map();
for (const b of states.births || []) {
  const en = String(b.name && b.name.en || "").trim().toLowerCase();
  const zh = String(b.name && b.name.zh || "").trim();
  if (en) modernBirth.set(en, b.year);
  if (zh) modernBirth.set(zh, b.year);
  if (b.key) modernBirth.set(b.key.toLowerCase(), b.year);
}
const modernAliases = {
  "united states of america": "united states of america",
  "united states": "united states of america",
  "republic of china": "china",
  "people's republic of china": "china",
  "russian federation": "russia",
  "soviet union": "russia",
  "united kingdom of great britain and ireland": "united kingdom",
  "great britain": "united kingdom",
};
function modernYearFor(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return null;
  if (modernBirth.has(n)) return modernBirth.get(n);
  const alias = modernAliases[n];
  if (alias && modernBirth.has(alias)) return modernBirth.get(alias);
  return null;
}

const occurrences = new Map();
for (const snap of snapshots) {
  const labelByName = new Map();
  for (const l of snap.data.labels || []) labelByName.set(l.name, l);
  const seen = new Set();
  for (const f of snap.data.features || []) {
    const p = f.properties || {};
    const name = (p.name || "").trim();
    if (!name || name === "Antarctica") continue;
    if (seen.has(name)) continue;
    seen.add(name);
    const label = labelByName.get(name);
    const pos = label ? { lat: label.lat, lon: label.lon, area: label.area || 0 } : geometryLabel(f.geometry);
    if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lon)) continue;
    if (!occurrences.has(name)) occurrences.set(name, []);
    occurrences.get(name).push({
      year: snap.year,
      lat: pos.lat, lon: pos.lon, area: pos.area || 0,
      zh: p.zh || (label && label.zh) || "",
      kind: (label && label.kind) || kindOf(name),
      color: p.color || "#9a7a55",
    });
  }
}

function gapAround(year) {
  let i = years.indexOf(year);
  const prev = i > 0 ? years[i - 1] : year - 1000;
  const next = i < years.length - 1 ? years[i + 1] : 2026;
  return { before: Math.max(80, (year - prev) / 2), after: Math.max(80, (next - year) / 2) };
}

const entities = [];
for (const [name, list] of occurrences) {
  list.sort((a, b) => a.year - b.year);
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const rep = group.slice().sort((a, b) => b.area - a.area)[0];
    const first = group[0], last = group[group.length - 1];
    const g1 = gapAround(first.year), g2 = gapAround(last.year);
    let from = Math.max(-12000, Math.round(first.year - g1.before));
    let to = Math.min(2026, Math.round(last.year + g2.after));
    let kind = rep.kind || kindOf(name);
    const mb = modernYearFor(name);
    if (mb != null && mb > from) from = mb;
    // Taiwan is handled as China's province from 1949; do not keep a
    // generated "state" label for it after that date.
    if (String(name).toLowerCase() === "taiwan") { kind = "region"; to = Math.min(to, 1948); }
    const area = rep.area || 0;
    entities.push({
      id: "hist-" + slug(name) + "-" + from,
      name: withI18n(name, { zh: rep.zh || nameGloss[name] || "", en: name }),
      type: kind,
      from, to,
      lat: Math.round(rep.lat * 100) / 100,
      lon: Math.round(rep.lon * 100) / 100,
      priority: kind === "culture" ? 48 : 62,
      area: Math.round(area),
      minZoom: area > 500 ? 1.0 : area > 120 ? 1.35 : 1.8,
      approx: true,
      source: "historical-basemaps",
    });
    group = [];
  };
  for (const o of list) {
    if (group.length && o.year - group[group.length - 1].year > 330) flush();
    group.push(o);
  }
  flush();
}


function geometrySpanArea(geom) {
  if (!geom) return 0;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let total = 0;
  for (const poly of polys) {
    if (!poly || !poly[0] || poly[0].length < 3) continue;
    total += Math.abs(ringArea(poly[0]));
  }
  return total;
}

const MAJOR_POWERS = new Set(["USA","CHN","RUS","IND","JPN","GBR","FRA","DEU","ITA","ESP","BRA","CAN","AUS","MEX","IDN","NGA","EGY","TUR","IRN","SAU","KOR","ZAF","ARG","PAK","UKR","POL"]);
const byIso = new Map();
for (const f of world.features) {
  const p = f.properties;
  if (p.iso3) byIso.set(p.iso3, f);
  if (p.iso2) byIso.set(p.iso2, f);
}
for (const b of states.births || []) {
  const f = byIso.get(b.iso3) || byIso.get(b.iso2);
  const p = f ? f.properties : {};
  entities.push({
    id: "modern-" + (b.iso3 || b.key),
    name: withI18n(b.name.en || "", { zh: b.name.zh || b.name.en, en: b.name.en || b.name.zh }),
    type: "modern",
    from: b.year,
    to: 2026,
    lat: b.lat != null ? b.lat : (p.ly || 0),
    lon: b.lon != null ? b.lon : (p.lx || 0),
    priority: 86 + (MAJOR_POWERS.has(b.iso3 || b.key) ? 8 : 0),
    area: Math.round(geometrySpanArea(f && f.geometry)),
    minZoom: 1.0,
    approx: false,
    code: b.iso3 || b.key,
    source: "state_changes",
  });
}

for (const e of curated) entities.push({ ...e, source: e.source || "curated" });

// Curated entries win over generated entries with the same id.
const dedup = new Map();
for (const e of entities) dedup.set(e.id, e);

// Generated labels from historical-basemaps carry the span between snapshots,
// which can overrun the polity's actual lifetime (Qing to 1994, warlords to
// 2018, colonial labels to 2018...). entity_clamps.json holds hand-checked
// corrections; curated entries are never clamped.
for (const e of dedup.values()) {
  if (e.source === "curated" || e.type === "modern" || e.type === "province") continue;
  const name = String((e.name && e.name.en) || "").trim();
  const c = Object.assign({}, clampByName[name], clampById[e.id] || {});
  if (c) {
    if (typeof c.from === "number") e.from = Math.max(e.from, c.from);
    if (typeof c.to === "number") e.to = Math.min(e.to, c.to);
    if (e.from > e.to) e.from = e.to;
    if (c.zh) e.name.zh = c.zh;
    if (c.en) e.name.en = c.en;
    if (typeof c.lat === "number") e.lat = c.lat;
    if (typeof c.lon === "number") e.lon = c.lon;
  }
}
const out = [...dedup.values()]
  .filter((e) => !(e.source !== "curated" && dropNames.has(String((e.name && e.name.en) || "").trim().toLowerCase())))
  .sort((a, b) => a.from - b.from || a.priority - b.priority);

fs.writeFileSync(path.join(ROOT, "data/historical_entities.json"), JSON.stringify({
  // Stable on purpose: the file is committed, and a timestamp would make
  // every rebuild look like a change.
  generated: "on build",
  source: "historical-basemaps + state_changes + curated",
  license: "GPL-3.0",
  note: "Approximate label positions and date ranges; blank where the source has no named entity. Entity end years are clamped by entity_clamps.json where the snapshot interpolation overruns the polity.",
  clamps: clampByName,
  clampsById: clampById,
  drop: [...dropNames],
  entities: out,
}, null, 0));
console.log(`✓ data/historical_entities.json — ${out.length} entities (${entities.length - curated.length} generated, ${curated.length} curated, ${dropNames.size} dropped)`);
