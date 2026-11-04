#!/usr/bin/env node
/* Build the runtime bundle from the collaborative JSON sources. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

// validate first (the validator exits non-zero on error)
execFileSync(process.execPath, [path.join(ROOT, "scripts/validate-data.mjs")], { stdio: "inherit" });

const meta = read("data/meta.json");
const polities = read("data/polities.json");
const events = read("data/events.json");
const theatre = read("data/theatre.json");

const out = {
  meta: meta.meta,
  regions: meta.regions,
  categories: meta.categories,
  scenes: meta.scenes,
  eras: meta.eras,
  polities,
  events,
  theatres: theatre.theatres || {},
  tradeRoutes: theatre.tradeRoutes || [],
};

const header = `/* 寰宇时序 · generated data bundle — do not edit by hand.
   Source: data/meta.json, data/polities.json, data/events.json, data/theatre.json
   Rebuild: node scripts/build-data.mjs
   Historical borders: data/historical/*.json (aourednik/historical-basemaps, GPL-3.0)
*/
window.WORLD_ATLAS = `;
const helper = `;
(function (A) {
  A.eraOf = function (year) {
    const eras = A.eras;
    for (let i = 0; i < eras.length; i++) {
      if (year < eras[i].to || i === eras.length - 1) {
        if (year >= eras[i].from || i === 0) return eras[i];
      }
    }
    return eras[eras.length - 1];
  };
})(window.WORLD_ATLAS);
`;
fs.writeFileSync(path.join(ROOT, "js/data_bundle.js"), header + JSON.stringify(out) + helper);
const size = fs.statSync(path.join(ROOT, "js/data_bundle.js")).size;
console.log(`✓ js/data_bundle.js (${(size / 1024).toFixed(0)} KB)`);
