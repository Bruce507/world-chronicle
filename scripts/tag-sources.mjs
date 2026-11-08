#!/usr/bin/env node
/* Stamp every dossier source with its tier. Idempotent; run after adding
   sources. The QA report cross-checks the stamped tier against the domain
   rules so the field can never silently drift from the classifier. */
import fs from "node:fs";
import { classifySource } from "./sources-lib.mjs";

const PATH = "data/event_details.json";
const details = JSON.parse(fs.readFileSync(PATH, "utf8"));
const counts = { institutional: 0, encyclopedic: 0, secondary: 0 };
let changed = 0;
for (const d of Object.values(details)) {
  for (const s of d.sources || []) {
    if (!s.url) continue;
    const tier = classifySource(s.url);
    counts[tier] += 1;
    if (s.tier !== tier) { s.tier = tier; changed += 1; }
  }
}
fs.writeFileSync(PATH, JSON.stringify(details, null, 2) + "\n");
console.log(`✓ ${PATH} — ${counts.institutional} institutional, ${counts.encyclopedic} encyclopedic, ${counts.secondary} secondary (${changed} changed)`);
