#!/usr/bin/env node
/* PWA smoke: manifest, icons, service worker activation and an offline reload.
 *
 * Written to be deterministic on CI (Ubuntu + Chrome for Testing). The first
 * version read `navigator.serviceWorker.ready` and then went offline straight
 * away; on a fast runner the page can still be uncontrolled for a beat after
 * activation, and the offline navigation then fails at the network layer with
 * no cache fallback. This version waits for a real controller (reloading once
 * online if needed), audits the precache, and only then goes offline. It also
 * prints enough state to diagnose a CI-only failure from the job log.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8001/";
const CHANNEL = process.env.PW_CHANNEL || "chrome";
const SW_TIMEOUT = 25000;
const NAV_TIMEOUT = 45000;

const browser = await chromium.launch({ channel: CHANNEL });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const onlineErrors = [];   // console errors before going offline — must stay empty
const offlineErrors = [];  // network failures while offline are expected for lazy extras
const pageErrors = [];     // uncaught exceptions — always a failure
const failedRequests = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  (page._offline ? offlineErrors : onlineErrors).push(m.text());
});
page.on("requestfailed", (r) => {
  const f = r.failure()?.errorText || "";
  if (page._offline) offlineErrors.push(`${f} ${r.url()}`);
  else failedRequests.push(`${f} ${r.url()}`);
});

let failed = 0;
const check = (n, ok, d) => {
  console.log((ok ? "  ok  " : "  FAIL") + "  " + n + (d ? " — " + d : ""));
  if (!ok) { failed += 1; process.exitCode = 1; }
};

const mapReady = () => window.atlasAPI && window.atlasAPI.map && window.atlasAPI.map.features.length > 0;

async function boot() {
  await page.goto(BASE + "?year=1937", { waitUntil: "networkidle", timeout: NAV_TIMEOUT });
  await page.waitForFunction(mapReady, null, { timeout: NAV_TIMEOUT });
}

async function diagnostics() {
  try {
    const state = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const keys = await caches.keys();
      const urls = {};
      for (const k of keys) {
        const c = await caches.open(k);
        urls[k] = (await c.keys()).map((r) => r.url.replace(location.origin, ""));
      }
      return {
        controlled: !!navigator.serviceWorker.controller,
        reg: reg ? { scope: reg.scope, active: reg.active?.state, installing: reg.installing?.state, waiting: reg.waiting?.state } : null,
        caches: urls,
        online: navigator.onLine,
      };
    });
    console.log("  diag  " + JSON.stringify(state));
  } catch (err) {
    console.log("  diag  unavailable: " + String(err).split("\n")[0]);
  }
  if (failedRequests.length) console.log("  diag  failed requests: " + failedRequests.slice(0, 5).join(" | "));
}

try {
  await boot();
} catch (err) {
  check("page boots", false, String(err).split("\n")[0]);
  await diagnostics();
  await browser.close();
  process.exit(1);
}

/* 1. Manifest and icons */
try {
  const manifest = await page.evaluate(async () => {
    const r = await fetch("manifest.json");
    const j = await r.json();
    const icons = await Promise.all(j.icons.map(async (i) => (await fetch(i.src)).status));
    return { status: r.status, name: j.name, icons };
  });
  check("manifest.json and icons are reachable", manifest.status === 200 && manifest.icons.every((s) => s === 200), JSON.stringify(manifest));
} catch (err) {
  check("manifest.json and icons are reachable", false, String(err).split("\n")[0]);
}

/* 2. Service worker: activation *and* an actual controller for this page */
let swDetail = "";
let controlled = false;
try {
  swDetail = await page.evaluate(async (timeout) => {
    if (!("serviceWorker" in navigator)) return "no serviceWorker API";
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((res) => setTimeout(() => res(null), timeout)),
    ]);
    if (!reg) return "ready timed out";
    return reg.active ? reg.active.state : "no active worker";
  }, SW_TIMEOUT);
} catch (err) {
  swDetail = String(err).split("\n")[0];
}
check("service worker activates", swDetail === "activated", swDetail);

controlled = await page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false);
if (!controlled) {
  // A freshly activated worker claims the page asynchronously. One online
  // reload puts the page under the worker's control deterministically.
  try {
    await page.reload({ waitUntil: "networkidle", timeout: NAV_TIMEOUT });
    await page.waitForFunction(mapReady, null, { timeout: NAV_TIMEOUT });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    controlled = true;
  } catch (err) {
    controlled = false;
  }
}
check("page is controlled by the service worker", controlled, controlled ? "" : "no controller after reload");

/* 3. The precache holds the shell the offline page needs */
if (controlled) {
  const shell = await page.evaluate(async () => {
    const need = ["./", "index.html", "js/app.js", "js/data_bundle.js", "js/map.js", "data/world.geo.json", "css/style.css"];
    const out = {};
    for (const u of need) out[u] = !!(await caches.match(u, { ignoreSearch: true }));
    return out;
  }).catch(() => ({}));
  const missing = Object.keys(shell).filter((k) => !shell[k]);
  check("offline shell is cached", missing.length === 0, missing.length ? "missing: " + missing.join(", ") : Object.keys(shell).length + " entries");
}

/* 4. Offline navigation shows the map. The URL carries a one-off query that
 *    was never fetched online, so the document can only come from the service
 *    worker's cache (a URL this browser never saw cannot be an HTTP-cache hit).
 *    One retry: the first navigation after a context goes offline can race the
 *    network-emulation switch. */
let offlineOk = false;
let offlineErr = "";
const offlineUrl = BASE + "?year=1937&offline-check=" + Date.now();
for (let attempt = 1; attempt <= 2 && !offlineOk; attempt++) {
  try {
    await ctx.setOffline(true);
    page._offline = true;
    await page.goto(offlineUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(mapReady, null, { timeout: 30000 });
    // Let the app's idle warm-up run while offline: lazy extras may fail to
    // fetch, and that failure must not become an uncaught script error.
    await page.waitForTimeout(1200);
    offlineOk = await page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false);
    if (!offlineOk) offlineErr = "map rendered without a service worker controller";
  } catch (err) {
    offlineErr = String(err).split("\n")[0];
    if (attempt === 1) {
      // Recover to a known-good online state before retrying.
      await ctx.setOffline(false).catch(() => {});
      page._offline = false;
      await boot().catch(() => {});
    }
  }
}
check("offline navigation is served by the service worker", offlineOk, offlineOk ? "" : offlineErr);

/* 5. No uncaught exceptions; online must be console-error free.
 *    Offline, lazily warmed extras (Hero/Tier B scenes) may fail to fetch —
 *    reported, not fatal, because the shell and map already proved themselves. */
check("no uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
check("no console errors while online", onlineErrors.length === 0, onlineErrors.slice(0, 2).join(" | "));
if (offlineOk && offlineErrors.length) {
  const net = offlineErrors.filter((e) => /ERR_INTERNET_DISCONNECTED|ERR_FAILED|Failed to load resource/.test(e));
  if (net.length !== offlineErrors.length) {
    check("no script errors while offline", false, offlineErrors.filter((e) => !net.includes(e)).slice(0, 2).join(" | "));
  } else {
    console.log("  info  " + net.length + " offline request(s) failed (optional lazy assets)");
  }
}

if (failed) await diagnostics();
await browser.close();
