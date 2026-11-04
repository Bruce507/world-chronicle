#!/usr/bin/env node
/* Validate the collaborative atlas data. No dependencies. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const errs = [];
const warns = [];
const add = (msg) => errs.push(msg);
const warn = (msg) => warns.push(msg);

function slugify(str) {
  return String(str).toLowerCase().normalize("NFKD")
    .replace(/[̀-ͯ]/g, "").replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "event";
}

const meta = read("data/meta.json");
const polities = read("data/polities.json");
const events = read("data/events.json");
const theatre = read("data/theatre.json");
const world = read("data/world.geo.json");

const { regions, categories, scenes, eras } = meta;
for (const key of ["meta", "regions", "categories", "scenes", "eras"]) {
  if (!meta[key]) add(`meta.json missing ${key}`);
}
if (!Array.isArray(eras) || !eras.length) add("meta.json eras must be a non-empty array");
for (const e of eras || []) {
  for (const k of ["id", "zh", "en", "from", "to", "weight"]) if (e[k] === undefined) add(`era ${e.id || "?"} missing ${k}`);
  if (e.from >= e.to) add(`era ${e.id}: from must be < to`);
  if (!(e.weight > 0)) add(`era ${e.id}: weight must be > 0`);
}

const iso = new Set();
for (const f of world.features) {
  const p = f.properties;
  if (p.iso2 && p.iso2 !== "-99") iso.add(p.iso2);
  if (p.iso3 && p.iso3 !== "-99") iso.add(p.iso3);
}

const ids = new Map();
const titles = new Map();
for (let i = 0; i < events.length; i++) {
  const e = events[i];
  const at = `event[${i}] (${e.t && e.t[1] || "?"})`;
  if (typeof e.y !== "number" || !Number.isFinite(e.y)) add(`${at}: y must be a number`);
  if (e.y < -12000 || e.y > 2026) add(`${at}: y out of range (${e.y})`);
  if (!Number.isFinite(e.lat) || e.lat < -90 || e.lat > 90) add(`${at}: bad lat`);
  if (!Number.isFinite(e.lon) || e.lon < -180 || e.lon > 180) add(`${at}: bad lon`);
  if (!Array.isArray(e.t) || e.t.length !== 2 || !e.t[0] || !e.t[1]) add(`${at}: t must be [zh,en]`);
  if (!Array.isArray(e.d) || e.d.length !== 2 || !e.d[0] || !e.d[1]) add(`${at}: d must be [zh,en]`);
  if (!categories[e.k]) add(`${at}: unknown category ${e.k}`);
  if (!scenes[e.s]) add(`${at}: unknown scene ${e.s}`);
  if (!regions[e.rg]) add(`${at}: unknown region ${e.rg}`);
  if (e.c && !iso.has(e.c)) warn(`${at}: country code ${e.c} not in Natural Earth`);
  if (e.link !== undefined) {
    if (!Array.isArray(e.link)) add(`${at}: link must be an array`);
    else e.link.forEach((p, j) => {
      if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) add(`${at}: link[${j}] must be [lat,lon]`);
    });
  }
  if (e.v !== undefined && typeof e.v !== "string") add(`${at}: v must be a string`);
  for (const key of ["tx", "dx"]) {
    if (e[key] !== undefined) {
      if (typeof e[key] !== "object" || Array.isArray(e[key])) add(`${at}: ${key} must be an object`);
      else for (const l of ["es", "fr", "ar"]) {
        if (e[key][l] !== undefined && (typeof e[key][l] !== "string" || !e[key][l].trim())) add(`${at}: ${key}.${l} must be a non-empty string`);
      }
    }
  }
  if (e.t && e.t[1]) {
    const id = slugify(e.t[1]);
    if (ids.has(id)) add(`duplicate slug "${id}" for ${at} and ${ids.get(id)}`);
    else ids.set(id, at);
    if (titles.has(e.t[1])) warn(`duplicate English title "${e.t[1]}"`);
    titles.set(e.t[1], true);
  }
}

for (const p of polities) {
  if (!p.id || !p.n || !p.n.zh || !p.n.en) add(`polity ${p.id || "?"}: id and bilingual name required`);
  if (!(p.y1 < p.y2)) add(`polity ${p.id}: y1 must be < y2`);
  if (!regions[p.rg]) add(`polity ${p.id}: unknown region ${p.rg}`);
  if (!(p.r > 0)) add(`polity ${p.id}: radius must be positive`);
}

const keys = Object.keys(theatre.theatres || {});
for (const k of keys) {
  const th = theatre.theatres[k];
  if (!ids.has(k)) add(`theatre key "${k}" does not match any event slug`);
  if (!["war", "trade", "atomic", "disaster", "civic", "march", "pilgrim"].includes(th.mode)) add(`theatre ${k}: bad mode ${th.mode}`);
  for (const s of th.sides || []) {
    for (const m of s.members || []) if (!iso.has(m) && !["SU"].includes(m)) warn(`theatre ${k}: unknown member ${m}`);
  }
  for (const f of th.fronts || []) if (!Array.isArray(f.pts) || f.pts.length < 2) add(`theatre ${k}: front needs >=2 points`);
  for (const r of th.routes || []) if (!Array.isArray(r.pts) || r.pts.length < 2) add(`theatre ${k}: route needs >=2 points`);
}
for (const r of theatre.tradeRoutes || []) {
  if (!r.id || !r.name || !Array.isArray(r.pts) || r.pts.length < 2) add(`tradeRoute ${r.id || "?"}: invalid`);
}

const states = read("data/state_changes.json");
const seenBirth = new Set();
for (const b of states.births || []) {
  if (!b.key || !b.name || !b.name.zh || !b.name.en) add(`state birth ${b.key || "?"}: key and bilingual name required`);
  if (typeof b.year !== "number" || b.year < -12000 || b.year > 2026) add(`state birth ${b.key}: bad year`);
  if (!Number.isFinite(b.lat) || !Number.isFinite(b.lon)) add(`state birth ${b.key}: bad coordinates`);
  if (seenBirth.has(b.key)) warn(`duplicate state birth key ${b.key}`);
  seenBirth.add(b.key);
}
for (const d of states.dissolutions || []) {
  if (typeof d.year !== "number" || !d.name || !d.name.zh || !d.name.en) add(`dissolution at ${d.year}: bad entry`);
  if (!Number.isFinite(d.lat) || !Number.isFinite(d.lon)) add(`dissolution ${d.name && d.name.en}: bad coordinates`);
}

const chronicles = read("data/country_chronicles.json");
const chronicleCount = Object.keys(chronicles).length;
for (const key of Object.keys(chronicles)) {
  const c = chronicles[key];
  if (!Array.isArray(c.segments) || !c.segments.length) add(`chronicle ${key}: no segments`);
  for (const seg of c.segments || []) {
    if (!(seg.from < seg.to)) add(`chronicle ${key}: segment from must be < to`);
    if (!Array.isArray(seg.events)) add(`chronicle ${key}: segment events must be an array`);
  }
}

const manifestPath = path.join(ROOT, "data/historical/manifest.json");
if (!fs.existsSync(manifestPath)) warn("historical manifest missing — historical borders will be unavailable");
else {
  const hm = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(hm.snapshots) || !hm.snapshots.length) add("historical manifest has no snapshots");
  else for (const s of hm.snapshots) {
    if (!fs.existsSync(path.join(ROOT, "data/historical", s.file))) add(`historical snapshot missing: ${s.file}`);
  }
}

console.log(`Checked ${events.length} events, ${polities.length} polities, ${keys.length} theatres, ${(theatre.tradeRoutes || []).length} trade routes, ${(states.births || []).length} state births, ${(states.dissolutions || []).length} dissolutions, ${chronicleCount} country chronicles.`);
if (warns.length) {
  console.log(`\n${warns.length} warning(s):`);
  for (const w of warns) console.log("  ⚠ " + w);
}
if (errs.length) {
  console.error(`\n${errs.length} error(s):`);
  for (const e of errs) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("✓ data valid");
