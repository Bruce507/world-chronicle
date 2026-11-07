#!/usr/bin/env node
/* Bump the static asset cache token used by index.html and runtime fetches.
   Usage: node scripts/bump-version.mjs [YYYYMMDD]
   Without an argument the current local date is used. Letters run a→z. */
import fs from "node:fs";
const files = ["index.html", "js/app.js", "js/entities.js", "sw.js"];
const src = fs.readFileSync("index.html", "utf8");
const m = src.match(/\?v=(\d{8})([a-z])/);
if (!m) { console.error("No ?v=YYYYMMDDx token found in index.html"); process.exit(1); }
const oldToken = m[1] + m[2];
const d = new Date();
const date = process.argv[2] || `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
if (!/^\d{8}$/.test(date)) { console.error("Date must be YYYYMMDD"); process.exit(1); }
// Never move the token backwards when the machine clock is behind the last
// release (e.g. a future-dated token in the repo).
const baseDate = date < m[1] ? m[1] : date;
let letter = "a";
if (baseDate === m[1]) {
  if (m[2] === "z") { console.error("Letter token exhausted; pass a later YYYYMMDD"); process.exit(1); }
  letter = String.fromCharCode(m[2].charCodeAt(0) + 1);
}
const newToken = baseDate + letter;
if (newToken === oldToken) { console.error("Token unchanged"); process.exit(1); }
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, s.split(oldToken).join(newToken));
}
console.log(`${oldToken} → ${newToken} (${files.join(", ")})`);
