/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Map Theatre
   Event dynamics drawn directly in geographic space, not in a
   detached stage: fronts, armies, fleets, caravans, fire, fallout.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const A = window.WORLD_ATLAS;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }
  function rng(seed) {
    let s = Math.floor(seed * 233280) || 17;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function pointAt(pts, t) {
    if (!pts || !pts.length) return [0, 0];
    if (pts.length === 1) return pts[0];
    const total = [];
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
      total.push(d); sum += d;
    }
    let target = clamp(t, 0, 1) * sum;
    for (let i = 0; i < total.length; i++) {
      if (target <= total[i]) {
        const r = total[i] ? target / total[i] : 0;
        return [lerp(pts[i][0], pts[i + 1][0], r), lerp(pts[i][1], pts[i + 1][1], r)];
      }
      target -= total[i];
    }
    return pts[pts.length - 1];
  }
  function unwrapPts(pts) {
    const out = [];
    for (const p of pts) {
      let lon = p[1];
      if (out.length) {
        const prev = out[out.length - 1][1];
        while (lon - prev > 180) lon -= 360;
        while (lon - prev < -180) lon += 360;
      }
      out.push([p[0], lon]);
    }
    return out;
  }
  function bearing(a, b) {
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  function nameOf(arr) {
    if (!arr) return "";
    if (Array.isArray(arr)) return T.lang === "zh" ? arr[0] : (arr[1] || arr[0]);
    return T.lang === "zh" ? (arr.zh || arr.en) : (arr.en || arr.zh);
  }

  const T = (window.MapTheatre = {
    map: null,
    active: false,
    ev: null,
    data: null,
    mode: null,
    lang: "zh",
    started: 0,
    paused: false,
    frozen: 0,
    sides: [],
    fronts: [],
    battles: [],
    routes: [],
    units: [],
    end: null,
    atomic: null,
    disaster: null,
    founding: null,
    byIso: null,
    lastP: 0,

    init(map) { this.map = map; },
    setLang(lang) { this.lang = lang; },

    playEvent(ev) {
      if (!this.map || !ev) return;
      const data = (A.theatres && A.theatres[ev.id]) || this.defaultTheatre(ev);
      this.ev = ev;
      this.data = data;
      this.mode = data.mode || this.modeFor(ev);
      this.sides = data.sides || this.defaultSides(ev);
      this.fronts = (data.fronts || []).map((f) => f.pts ? Object.assign({}, f, { pts: unwrapPts(f.pts) }) : f);
      this.battles = data.battles || [];
      this.routes = (data.routes || []).map((r) => r.pts ? Object.assign({}, r, { pts: unwrapPts(r.pts) }) : r);
      this.end = data.end || null;
      this.atomic = data.atomic || null;
      if (this.mode === "atomic" && !this.atomic) {
        this.atomic = { lat: ev.lat, lon: ev.lon, city: [ev.t[0], ev.t[1]], date: String(ev.y) };
      }
      this.disaster = data.disaster || null;
      this.founding = data.founding || null;
      this.started = performance.now();
      this.paused = false;
      this.frozen = 0;
      this.byIso = this.byIso || this.buildIso();
      this.units = this.buildUnits(ev, data);
      this.active = true;
      this.map.setTheatreActive(true);
      clearTimeout(this._stopTimer);
      this._stopTimer = setTimeout(() => { if (this.active) this.clear(); }, 16000);
      const c = data.center || [ev.lat, ev.lon];
      const z = data.zoom || this.defaultZoom(this.mode, ev);
      this.map.flyTo(c[0], c[1], z, 950);
    },

    playCountry(f) {
      if (!this.map || !f) return false;
      const year = this.map.year;
      const iso = f.properties.iso2;
      const routes = (A.tradeRoutes || []).filter((r) => {
        if (r.era && (year < r.era[0] || year > r.era[1])) return false;
        if (r.countries && iso && r.countries.indexOf(iso) >= 0) return true;
        return r.pts.some((p) => this.inBBox(p[1], p[0], f._rawBBox));
      });
      if (!routes.length) { this.clear(); return false; }
      this.ev = null;
      this.data = null;
      this.mode = "trade";
      this.sides = [];
      this.fronts = [];
      this.battles = [];
      this.end = null;
      this.atomic = null;
      this.disaster = null;
      this.started = performance.now();
      this.paused = false;
      this.frozen = 0;
      this.routes = routes.map((r) => ({ mode: r.mode, label: r.name, pts: unwrapPts(r.pts) }));
      this.units = this.buildUnits(null, { routes: this.routes, mode: "trade" });
      this.active = true;
      this.map.setTheatreActive(true);
      return true;
    },

    clear() {
      this.active = false;
      this.ev = null;
      this.units = [];
      this.fronts = [];
      this.routes = [];
      this.battles = [];
      this.atomic = null;
      this.founding = null;
      clearTimeout(this._stopTimer);
      if (this.map) this.map.setTheatreActive(false);
    },

    togglePause() {
      if (!this.active) return this.paused;
      if (this.paused) {
        this.started = performance.now() - this.frozen * 1000;
        this.paused = false;
      } else {
        this.frozen = (performance.now() - this.started) / 1000;
        this.paused = true;
      }
      return this.paused;
    },

    elapsed(now) {
      if (this.paused) return this.frozen;
      return (now - this.started) / 1000;
    },

    inBBox(lon, lat, b) {
      if (!b) return false;
      return lon >= b[0] - 1 && lon <= b[2] + 1 && lat >= b[1] - 1 && lat <= b[3] + 1;
    },

    buildIso() {
      const m = {};
      if (this.map && this.map.features) {
        for (const f of this.map.features) {
          if (f.properties.iso2 && f.properties.iso2 !== "-99") m[f.properties.iso2] = f;
          if (f.properties.iso3 && f.properties.iso3 !== "-99") m[f.properties.iso3] = f;
          m[f.properties.n] = f;
        }
        const aliases = { FR: "France", NO: "Norway", TO: "Tonga", PF: "French Polynesia", MH: "Marshall Islands", HK: "Hong Kong", TW: "Taiwan", PS: "Palestine", XK: "Kosovo" };
        for (const k in aliases) if (m[aliases[k]]) m[k] = m[aliases[k]];
      }
      return m;
    },

    modeFor(ev) {
      const s = ev.s;
      const title = ((ev.t && ev.t[0]) || "") + " " + ((ev.t && ev.t[1]) || "");
      const ending = /灭亡|崩溃|终结|陷落|战败|沦陷|fall of|collapse|end of|sack of/i.test(title);
      if (!ending && /建立|建国|开国|成立|加冕|王朝|帝国|统一|独立|founded|founding|coronation|dynasty|empire|unification|independence|declares/i.test(title)) return "founding";
      if (s === "atomic") return "atomic";
      if (["chariot", "phalanx", "siege", "cavalry", "naval", "cannon", "musket", "trench", "air"].indexOf(s) >= 0) return "war";
      if (s === "camel" || s === "ship") return ev.k === "trade" || ev.k === "exploration" ? "trade" : "war";
      if (s === "disaster" || s === "plague") return "disaster";
      if (s === "revolution" || s === "protest") return "civic";
      if (s === "march") return "march";
      if (s === "pilgrim") return "pilgrim";
      return "civic";
    },

    defaultSides(ev) {
      const mine = ev._country ? ev._country.properties.iso2 : "";
      const evName = ev.t ? (this.lang === "zh" ? ev.t[0] : ev.t[1]) : (this.lang === "zh" ? "此地" : "This place");
      if (this.mode === "founding") {
        return [{ key: "a", name: [evName, evName], color: "#a83e2c", members: mine ? [mine] : [] }];
      }
      return [
        { key: "a", name: [evName, evName], color: "#a83e2c", members: mine ? [mine] : [] },
        { key: "b", name: ["对手", "Rivals"], color: "#3f6278", members: [] },
      ];
    },

    defaultZoom(mode, ev) {
      if (mode === "atomic") return 4.4;
      if (mode === "trade") return 2.2;
      if (mode === "disaster") return 3.4;
      if (mode === "march") return 3.2;
      if (mode === "war") return ev.link && ev.link.length > 4 ? 2.1 : 4;
      return 3.8;
    },

    defaultTheatre(ev) {
      const mode = this.modeFor(ev);
      const links = ev.link || [];
      const data = { mode, center: [ev.lat, ev.lon], zoom: this.defaultZoom(mode, ev) };
      if (mode === "war" || mode === "march" || mode === "pilgrim") {
        data.battles = [{ lat: ev.lat, lon: ev.lon, name: [ev.t[0], ev.t[1]], side: "a", kind: mode === "war" ? "land" : "camp" }];
        if (mode === "pilgrim") {
          data.routes = [{ mode: "pilgrim", side: "a", label: [ev.t[0], ev.t[1]], pts: [[ev.lat, ev.lon]].concat(links) }];
        } else if (links.length) {
          data.fronts = links.slice(0, 6).map((l) => ({ side: "b", pts: [[ev.lat, ev.lon], [l[0], l[1]]] }));
        }
      } else if (mode === "trade") {
        const pts = [[ev.lat, ev.lon]].concat(links);
        data.routes = [{ mode: ev.s === "camel" ? "camel" : "ship", pts, label: [ev.t[0], ev.t[1]] }];
        if (pts.length > 1) {
          const lats = pts.map((p) => p[0]), lons = pts.map((p) => p[1]);
          data.center = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lons) + Math.max(...lons)) / 2];
          const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons));
          data.zoom = span > 100 ? 1.5 : span > 50 ? 1.9 : span > 20 ? 2.4 : 3.2;
        }
      } else if (mode === "atomic") {
        data.atomic = { lat: ev.lat, lon: ev.lon, city: [ev.t[0], ev.t[1]], date: String(ev.y) };
      } else if (mode === "disaster") {
        data.disaster = { lat: ev.lat, lon: ev.lon, label: [ev.t[0], ev.t[1]] };
      } else if (mode === "founding") {
        data.founding = { lat: ev.lat, lon: ev.lon, label: [ev.t[0], ev.t[1]], date: String(ev.y) };
        data.zoom = 3.35;
      } else if (mode === "civic") {
        data.battles = [{ lat: ev.lat, lon: ev.lon, name: [ev.t[0], ev.t[1]], side: "a", kind: "crowd" }];
      }
      return data;
    },

    unitKind(ev) {
      const s = ev ? ev.s : "march";
      if (s === "chariot") return "chariot";
      if (s === "cavalry") return "horse";
      if (s === "siege" || s === "cannon" || s === "musket") return "soldier";
      if (s === "naval" || s === "ship") return "ship";
      if (s === "trench") return "soldier";
      if (s === "air") return "plane";
      if (s === "camel") return "camel";
      if (s === "march") return "march";
      if (s === "pilgrim") return "monk";
      return "soldier";
    },

    buildUnits(ev, data) {
      const units = [];
      const rand = rng(hash((ev && ev.id) || "country") + 0.13);
      const bases = this.sides.length ? this.sides : [{ key: "a", color: "#a83e2c" }];
      const kind = this.unitKind(ev || { s: "march" });
      // battles: two sides eddying around the point
      (data.battles || []).slice(0, 10).forEach((b, bi) => {
        bases.forEach((side, si) => {
          const n = b.kind === "crowd" ? 7 : 3;
          for (let i = 0; i < n; i++) {
            units.push({
              type: b.kind === "crowd" ? "crowd" : kind,
              side: side.key,
              color: side.color,
              lat: b.lat, lon: b.lon,
              battle: true,
              r: 0.16 + rand() * 0.5,
              a: rand() * TAU,
              speed: 0.22 + rand() * 0.3,
              phase: rand(),
              size: 0.85 + rand() * 0.4,
            });
          }
        });
      });
      // front patrols
      (data.fronts || []).slice(0, 8).forEach((f) => {
        bases.forEach((side) => {
          for (let i = 0; i < 2; i++) {
            units.push({
              type: kind, side: side.key, color: side.color, path: f.pts,
              phase: rand(), speed: 0.018 + rand() * 0.02, size: 0.9 + rand() * 0.3,
            });
          }
        });
      });
      // route traffic
      (data.routes || []).forEach((r) => {
        const n = r.mode === "march" ? 6 : 3;
        for (let i = 0; i < n; i++) {
          units.push({
            type: r.mode === "camel" ? "camel" : r.mode === "ship" ? "ship" : r.mode === "air" ? "plane" : r.mode === "pilgrim" ? "monk" : "march",
            side: r.side || "trade",
            color: r.side ? (this.sideColor(r.side) || "#b98a34") : "#b98a34",
            path: r.pts,
            phase: i / n + rand() * 0.05,
            speed: 0.012 + rand() * 0.01,
            size: 1,
          });
        }
      });
      return units;
    },

    sideColor(key) {
      const s = this.sides.find((x) => x.key === key);
      return s ? s.color : null;
    },

    /* ── main draw ─────────────────────────────────── */
    draw(ctx, map, now) {
      if (!this.active) return;
      const p = this.elapsed(now);
      this.lastP = p;
      ctx.save();
      ctx.setTransform(map.dpr, 0, 0, map.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);

      this.drawSideTints(ctx, map, p);
      this.drawRoutes(ctx, map, p);
      this.drawFronts(ctx, map, p);
      this.drawBattles(ctx, map, p);
      if (this.mode !== "founding") this.drawUnits(ctx, map, p);
      if (this.mode === "atomic") this.drawAtomic(ctx, map, p);
      else if (this.mode === "founding") this.drawFounding(ctx, map, p);
      else if (this.mode === "disaster") this.drawDisaster(ctx, map, p);
      this.drawEnd(ctx, map, p);
      this.drawLabels(ctx, map, p);
      ctx.restore();
    },

    drawSideTints(ctx, map, p) {
      if (!this.sides.length || !map.features) return;
      const pulse = 0.5 + 0.5 * Math.sin(p * 1.6);
      for (const side of this.sides) {
        if (!side.members || !side.members.length) continue;
        for (const iso of side.members) {
          const f = this.byIso && (this.byIso[iso] || this.byIso[iso.replace(/^SU$/, "RU")]);
          if (!f) continue;
          map._trace(ctx, f);
          ctx.fillStyle = hexA(side.color, 0.13 + pulse * 0.03);
          ctx.fill("evenodd");
          ctx.strokeStyle = hexA(side.color, 0.62 + pulse * 0.15);
          ctx.lineWidth = 1.1;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -p * 7;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    },

    drawFronts(ctx, map, p) {
      for (const front of this.fronts) {
        if (!front.pts || front.pts.length < 2) continue;
        const spts = front.pts.map((q) => map.project(q[1], q[0]));
        const col = this.sideColor(front.side) || "#a83e2c";
        ctx.beginPath();
        for (let i = 0; i < spts.length; i++) {
          const q = spts[i];
          if (i === 0) ctx.moveTo(q.x, q.y);
          else {
            const prev = spts[i - 1];
            const mx = (prev.x + q.x) / 2, my = (prev.y + q.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
          }
        }
        ctx.strokeStyle = hexA(col, 0.13);
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.strokeStyle = hexA(col, 0.82);
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 5]);
        ctx.lineDashOffset = -p * 12;
        ctx.stroke();
        ctx.setLineDash([]);
        // embers along the line
        const rand = rng(hash((front.label && front.label[1]) || "front"));
        for (let i = 0; i < 10; i++) {
          const q = pointAt(front.pts, (i / 10 + p * 0.02) % 1);
          const sp = map.project(q[1], q[0]);
          const fl = 0.4 + 0.6 * Math.abs(Math.sin(p * 3 + i + rand()));
          ctx.beginPath();
          ctx.arc(sp.x + Math.sin(p * 2 + i) * 3, sp.y + Math.cos(p * 3 + i) * 2, 1.2 + fl * 1.6, 0, TAU);
          ctx.fillStyle = "rgba(255,150,60," + (0.5 * fl) + ")";
          ctx.fill();
        }
      }
    },

    drawRoutes(ctx, map, p) {
      for (const route of this.routes) {
        if (!route.pts || route.pts.length < 2) continue;
        const spts = route.pts.map((q) => map.project(q[1], q[0]));
        const col = route.mode === "ship" ? "#3f7a83" : route.mode === "camel" || route.mode === "pilgrim" ? "#b98a34" : "#8a6a3f";
        ctx.beginPath();
        for (let i = 0; i < spts.length; i++) {
          const q = spts[i];
          if (i === 0) ctx.moveTo(q.x, q.y);
          else {
            const prev = spts[i - 1];
            const cx = (prev.x + q.x) / 2 + (q.y - prev.y) * 0.08;
            const cy = (prev.y + q.y) / 2 - (q.x - prev.x) * 0.08;
            ctx.quadraticCurveTo(cx, cy, (prev.x + q.x) / 2, (prev.y + q.y) / 2);
          }
        }
        ctx.strokeStyle = hexA(col, 0.16);
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = hexA(col, 0.7);
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 6]);
        ctx.lineDashOffset = -p * 8;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },

    drawBattles(ctx, map, p) {
      for (const b of this.battles) {
        const pos = map.project(b.lon, b.lat);
        if (pos.x < -50 || pos.x > map.W + 50 || pos.y < -50 || pos.y > map.H + 50) continue;
        const col = this.sideColor(b.side) || "#a83e2c";
        const kind = b.kind || "land";
        if (kind === "outbreak" || kind === "wave" || kind === "atomic") continue;
        const pulse = (p * 0.35 + hash(b.name ? b.name[1] : "b")) % 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10 + pulse * 26, 0, TAU);
        ctx.strokeStyle = hexA(col, 0.4 * (1 - pulse));
        ctx.lineWidth = 1.2;
        ctx.stroke();
        if (kind === "air" || kind === "naval") this.drawAir(ctx, pos.x, pos.y, 0.8, p, col);
        else if (kind === "urban" || kind === "artillery" || kind === "siege") this.drawFire(ctx, pos.x, pos.y, 0.9, p, col);
        else if (kind === "cavalry") this.drawHorseIcon(ctx, pos.x, pos.y, 0.8, p, col);
        else if (kind === "crowd") this.drawCrowd(ctx, pos.x, pos.y, 0.8, p, col);
        else this.drawCrossed(ctx, pos.x, pos.y, 0.8, col);
      }
    },

    drawUnits(ctx, map, p) {
      const zoom = map.view.zoom;
      const scale = clamp(0.5 + zoom * 0.34, 0.8, 2.2);
      for (const u of this.units) {
        let lat, lon, ang = 0;
        if (u.path) {
          const t = (u.phase + p * u.speed) % 1;
          const q = pointAt(u.path, t);
          lat = q[0]; lon = q[1];
          const q2 = pointAt(u.path, Math.min(1, t + 0.01));
          ang = Math.atan2(q2[0] - q[0], q2[1] - q[1]);
        } else {
          const a = u.a + p * u.speed * TAU;
          lat = u.lat + Math.sin(a) * u.r;
          lon = u.lon + Math.cos(a) * u.r * 1.4;
          ang = -a;
        }
        const sp = map.project(lon, lat);
        if (sp.x < -30 || sp.x > map.W + 30 || sp.y < -30 || sp.y > map.H + 30) continue;
        this.drawUnit(ctx, u.type, sp.x, sp.y, scale * (u.size || 1), p, u.color, ang, u.side);
      }
    },

    drawUnit(ctx, type, x, y, s, p, color, ang, side) {
      ctx.save();
      ctx.translate(x, y);
      if (type === "ship" || type === "plane") ctx.rotate(ang || 0);
      ctx.scale(s, s);
      ctx.fillStyle = "#4a3624";
      ctx.strokeStyle = "#4a3624";
      ctx.lineCap = "round";
      if (type === "ship") {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, 4, 9, 0); ctx.lineTo(6, -2); ctx.lineTo(-6, -2); ctx.closePath(); ctx.fillStyle = "#3b2d1e"; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -11); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(1, -10); ctx.quadraticCurveTo(8, -7, 1, -3); ctx.closePath(); ctx.fillStyle = color; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-12, 2); ctx.quadraticCurveTo(0, 5, 12, 2); ctx.stroke();
      } else if (type === "plane") {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 1.8, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, -5); ctx.lineTo(-1, -5); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 5); ctx.lineTo(-1, 5); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill();
      } else if (type === "camel") {
        ctx.lineWidth = 1.4;
        const g = Math.sin(p * 6 + x);
        ctx.beginPath();
        ctx.moveTo(-4, -5); ctx.lineTo(-5 + g, 0); ctx.moveTo(-1, -5); ctx.lineTo(0 - g, 0);
        ctx.moveTo(3, -5); ctx.lineTo(4 - g, 0); ctx.moveTo(5, -5); ctx.lineTo(6 + g, 0);
        ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, -8, 6, 3.2, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(-2, -11, 2.4, Math.PI, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -11, 2.2, Math.PI, TAU); ctx.fill();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(5, -8); ctx.quadraticCurveTo(8, -13, 9, -15); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(10, -15.2, 2, 1.2, 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-9, -4); ctx.stroke();
      } else if (type === "chariot") {
        this.drawHorseIcon(ctx, 7, 0, 0.7, p, color);
        ctx.strokeStyle = "#4a3624"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, -4, 3.4, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + p * 6; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(Math.cos(a) * 3, -4 + Math.sin(a) * 3); ctx.stroke(); }
        ctx.fillStyle = color; ctx.fillRect(-4, -12, 7, 4);
      } else if (type === "horse") {
        this.drawHorseIcon(ctx, 0, 0, 1, p, color);
      } else if (type === "crowd") {
        this.drawCrowd(ctx, 0, 0, 1, p, color);
      } else if (type === "monk") {
        const sw = Math.sin(p * 5 + x);
        ctx.fillStyle = color || "#b98a34";
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.quadraticCurveTo(-5, -6, -4 + sw * 1.6, 0);
        ctx.lineTo(4 - sw * 1.6, 0);
        ctx.quadraticCurveTo(5, -6, 0, -16);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#e0c48a"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(2, -22); ctx.lineTo(4, 1); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -18, 2.1, 0, TAU); ctx.fillStyle = "#4a3624"; ctx.fill();
        ctx.beginPath(); ctx.arc(0, -19.5, 2.8, Math.PI, TAU); ctx.fillStyle = color || "#b98a34"; ctx.fill();
        ctx.fillStyle = "#7a4a2e"; ctx.fillRect(-5, -14, 2.5, 5);
      } else if (type === "march") {
        const sw = Math.sin(p * 7 + x);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(sw * 2.4, 0); ctx.moveTo(0, -7); ctx.lineTo(-sw * 2.4, 0); ctx.stroke();
        ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, -7); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -15, 1.8, 0, TAU); ctx.fillStyle = "#4a3624"; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(2, -13); ctx.lineTo(2, -21); ctx.stroke();
        ctx.fillStyle = color; ctx.fillRect(2, -21, 5, 3);
      } else {
        // soldier
        const sw = Math.sin(p * 7 + x);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-1.4, -5); ctx.lineTo(-2 + sw * 1.6, 0);
        ctx.moveTo(1.4, -5); ctx.lineTo(2 - sw * 1.6, 0);
        ctx.moveTo(0, -5); ctx.lineTo(0, -12);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -14, 1.9, 0, TAU); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(3, -10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(8, -17); ctx.stroke();
      }
      ctx.restore();
    },

    drawHorseIcon(ctx, x, y, s, p, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      const g = Math.sin(p * 7 + x);
      ctx.fillStyle = "#4a3624"; ctx.strokeStyle = "#4a3624"; ctx.lineCap = "round";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-8 + g * 2, 0); ctx.moveTo(-2, -8); ctx.lineTo(-1 - g * 2, 0);
      ctx.moveTo(4, -8); ctx.lineTo(5 - g * 2, 0); ctx.moveTo(7, -8); ctx.lineTo(9 + g * 2, 0); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -12, 9, 4.2, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, -13); ctx.quadraticCurveTo(13, -20, 16, -20); ctx.lineTo(17, -15); ctx.quadraticCurveTo(11, -13, 10, -9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(4, -18); ctx.stroke();
      ctx.restore();
    },

    drawCrowd(ctx, x, y, s, p, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      for (let i = 0; i < 6; i++) {
        const dx = (i - 2.5) * 4 + Math.sin(p * 2 + i) * 1.2;
        const dy = (i % 2) * 2;
        ctx.strokeStyle = "rgba(92,66,43,0.92)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(dx, dy - 6); ctx.lineTo(dx - 1, dy); ctx.moveTo(dx, dy - 6); ctx.lineTo(dx + 1, dy); ctx.stroke();
        ctx.beginPath(); ctx.arc(dx, dy - 8, 1.6, 0, TAU); ctx.fillStyle = "rgba(126,94,64,0.95)"; ctx.fill();
        if (i === 2) { ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx + 1, dy - 8); ctx.lineTo(dx + 1, dy - 16); ctx.stroke(); ctx.fillStyle = color; ctx.fillRect(dx + 1, dy - 16, 4, 3); }
      }
      ctx.restore();
    },

    drawCrossed(ctx, x, y, s, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.strokeStyle = color; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
      ctx.restore();
    },

    drawFire(ctx, x, y, s, p, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      const f = 0.6 + 0.4 * Math.sin(p * 7 + x);
      glow(ctx, 0, 0, 20 * f, "#ff8a3a", 0.35);
      ctx.beginPath(); ctx.moveTo(-4, 4); ctx.quadraticCurveTo(-2, -6, 0, -12 * f); ctx.quadraticCurveTo(2, -6, 4, 4); ctx.closePath();
      ctx.fillStyle = "rgba(255,150,60,0.85)"; ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(Math.sin(p + i) * 6, -14 - i * 5 - (p * 10 % 10), 3 + i, 0, TAU);
        ctx.fillStyle = "rgba(200,190,170,0.08)"; ctx.fill();
      }
      ctx.restore();
    },

    drawAir(ctx, x, y, s, p, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const a = p * 1.6 + i * Math.PI;
        const r = 12 + Math.sin(p * 2 + i) * 3;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.6, 1.6, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    },

    drawFounding(ctx, map, p) {
      const f = this.founding;
      if (!f) return;
      const pos = map.project(f.lon, f.lat);
      if (pos.x < -80 || pos.x > map.W + 80 || pos.y < -80 || pos.y > map.H + 80) return;
      const s = clamp(1.08 + map.view.zoom * 0.32, 1.25, 3.0);
      const ink = "rgba(72,52,34,0.82)";
      const warm = "rgba(176,67,44,0.9)";
      const gold = "rgba(184,138,62,0.9)";
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(s, s);
      // soft parchment halo + ground shadow
      glow(ctx, 0, 0, 96, "#c99a55", 0.18);
      ctx.beginPath();
      ctx.ellipse(0, 3, 58, 12, 0, 0, TAU);
      ctx.fillStyle = "rgba(120,96,64,0.14)";
      ctx.fill();
      // city wall with crenellations
      ctx.beginPath();
      ctx.rect(-48, -28, 96, 31);
      ctx.fillStyle = "rgba(210,180,136,0.34)";
      ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
      for (let i = -48; i <= 44; i += 12) {
        ctx.fillStyle = "rgba(210,180,136,0.5)";
        ctx.fillRect(i, -34, 7, 7);
        ctx.strokeRect(i, -34, 7, 7);
      }
      // gate
      ctx.beginPath();
      ctx.moveTo(-9, 3); ctx.lineTo(-9, -13); ctx.quadraticCurveTo(0, -27, 9, -13); ctx.lineTo(9, 3); ctx.closePath();
      ctx.fillStyle = "rgba(92,66,43,0.58)"; ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();
      // palace roof behind wall
      ctx.beginPath();
      ctx.moveTo(-42, -28);
      ctx.quadraticCurveTo(-28, -40, -20, -44);
      ctx.quadraticCurveTo(-5, -55, 0, -55);
      ctx.quadraticCurveTo(5, -55, 20, -44);
      ctx.quadraticCurveTo(28, -40, 42, -28);
      ctx.closePath();
      ctx.fillStyle = "rgba(150,92,58,0.72)"; ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, -43); ctx.quadraticCurveTo(0, -52, 18, -43);
      ctx.strokeStyle = gold; ctx.lineWidth = 1.3; ctx.stroke();
      // banner poles + waving flags
      for (const bx of [-35, 35]) {
        const wave = Math.sin(p * 2.2 + bx) * 2.4;
        ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, -48); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + 1, -46);
        ctx.quadraticCurveTo(bx + 12 + wave, -45, bx + 17 + wave, -40);
        ctx.lineTo(bx + 2, -36);
        ctx.closePath();
        ctx.fillStyle = bx < 0 ? warm : gold; ctx.fill();
      }
      // crowd: warm ink figures, colored robes
      for (let i = 0; i < 9; i++) {
        const cx = (i - 4) * 8 + Math.sin(p * 2 + i) * 1.2;
        const cy = 7 + (i % 2) * 3;
        ctx.strokeStyle = i % 3 === 0 ? warm : "rgba(92,66,43,0.9)";
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx - 1, cy); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 1, cy); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy - 7, 1.7, 0, TAU); ctx.fillStyle = "rgba(126,94,64,0.95)"; ctx.fill();
      }
      // imperial seal / sun disc
      ctx.beginPath(); ctx.arc(0, -64, 14, 0, TAU);
      ctx.fillStyle = "rgba(176,67,44,0.14)"; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -64, 9, 0, TAU);
      ctx.strokeStyle = gold; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    },

    drawAtomic(ctx, map, p) {
      const a = this.atomic;
      if (!a) return;
      const target = map.project(a.lon, a.lat);
      const flashAt = 2.6;
      if (p < flashAt + 0.5) {
        // bomber approach from the east
        const t = clamp(p / flashAt, 0, 1);
        const start = map.project(a.lon + 14, a.lat + 5);
        const x = lerp(start.x, target.x, t);
        const y = lerp(start.y, target.y, t) - Math.sin(t * Math.PI) * 40;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6);
        ctx.fillStyle = "#4a3624";
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 2.4, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, -8); ctx.lineTo(-1, -8); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, 8); ctx.lineTo(-1, 8); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (t > 0.82) {
          const bp = (t - 0.82) / 0.18;
          const bx = lerp(x, target.x, bp), by = lerp(y, target.y, bp * bp);
          ctx.beginPath(); ctx.ellipse(bx, by, 2, 4, 0, 0, TAU); ctx.fillStyle = "#4a3624"; ctx.fill();
        }
      }
      if (p >= flashAt) {
        const f = clamp(1 - (p - flashAt) / 0.55, 0, 1);
        if (f > 0) {
          ctx.fillStyle = "rgba(255,248,228," + (0.94 * f) + ")";
          ctx.fillRect(0, 0, map.W, map.H);
        }
        for (let i = 0; i < 3; i++) {
          const q = clamp((p - flashAt - i * 0.25) / 3.2, 0, 1);
          if (q <= 0 || q >= 1) continue;
          ctx.beginPath();
          ctx.arc(target.x, target.y, 20 + q * Math.max(map.W, map.H) * 0.55, 0, TAU);
          ctx.strokeStyle = "rgba(255,190,120," + (0.5 * (1 - q)) + ")";
          ctx.lineWidth = 2.5 * (1 - q) + 0.5;
          ctx.stroke();
        }
        // fires and mushroom
        const grow = ease(clamp((p - flashAt - 0.8) / 5.5, 0, 1));
        if (grow > 0) {
          const base = map.project(a.lon, a.lat);
          const scale = (map.W < 600 ? 0.62 : 1.12) * (0.3 + grow * 0.9);
          ctx.save(); ctx.translate(base.x, base.y);
          glow(ctx, 0, 0, 120 * scale, "#ff9a45", 0.25);
          // stem
          ctx.beginPath();
          ctx.moveTo(-9 * scale, 0);
          ctx.quadraticCurveTo(-4 * scale, -80 * scale, -26 * scale, -120 * scale);
          ctx.lineTo(26 * scale, -120 * scale);
          ctx.quadraticCurveTo(4 * scale, -80 * scale, 9 * scale, 0);
          ctx.closePath();
          ctx.fillStyle = "rgba(214,150,86,0.85)"; ctx.fill();
          // cap
          const capG = ctx.createRadialGradient(0, -125 * scale, 2, 0, -125 * scale, 64 * scale);
          capG.addColorStop(0, "rgba(255,214,150,0.95)");
          capG.addColorStop(0.5, "rgba(220,145,80,0.9)");
          capG.addColorStop(1, "rgba(110,60,35,0.05)");
          ctx.beginPath(); ctx.ellipse(0, -125 * scale, 62 * scale, 42 * scale, 0, 0, TAU);
          ctx.fillStyle = capG; ctx.fill();
          for (let i = 0; i < 8; i++) {
            const ang = i / 8 * TAU;
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * 40 * scale, -125 * scale + Math.sin(ang) * 26 * scale, 24 * scale, 0, TAU);
            ctx.fillStyle = "rgba(196,130,78,0.22)"; ctx.fill();
          }
          // ground debris
          ctx.beginPath(); ctx.ellipse(0, 2, 90 * scale, 16 * scale, 0, 0, TAU);
          ctx.fillStyle = "rgba(180,140,100,0.14)"; ctx.fill();
          ctx.restore();
        }
      }
      // japan / us tint and labels handled by side tints/labels
    },

    drawDisaster(ctx, map, p) {
      const d = this.disaster;
      const epic = d ? map.project(d.lon, d.lat) : null;
      if (epic) {
        for (let i = 0; i < 4; i++) {
          const q = ((p * 0.16 + i * 0.25) % 1);
          ctx.beginPath();
          ctx.arc(epic.x, epic.y, 10 + q * Math.max(map.W, map.H) * 0.4, 0, TAU);
          ctx.strokeStyle = "rgba(150,50,40," + (0.4 * (1 - q)) + ")";
          ctx.lineWidth = 1.6 * (1 - q) + 0.4;
          ctx.stroke();
        }
        glow(ctx, epic.x, epic.y, 80, "#b04030", 0.2);
      }
      for (const b of this.battles) {
        const pos = map.project(b.lon, b.lat);
        const k = b.kind || "outbreak";
        const col = k === "wave" ? "#3f7a83" : "#a83e2c";
        for (let i = 0; i < 3; i++) {
          const q = ((p * 0.3 + i * 0.3 + hash(b.name ? b.name[1] : "x")) % 1);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6 + q * 70, 0, TAU);
          ctx.strokeStyle = hexA(col, 0.34 * (1 - q));
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 3.2, 0, TAU); ctx.fillStyle = hexA(col, 0.9); ctx.fill();
      }
    },

    drawEnd(ctx, map, p) {
      if (!this.end) return;
      const pos = map.project(this.end.lon, this.end.lat);
      if (pos.x < -40 || pos.x > map.W + 40 || pos.y < -40 || pos.y > map.H + 40) return;
      const pulse = 0.6 + 0.4 * Math.sin(p * 2);
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 9 + pulse * 4, 0, TAU);
      ctx.strokeStyle = "rgba(63,98,120," + (0.6 * pulse) + ")";
      ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 3, 0, TAU);
      ctx.fillStyle = "#3f6278"; ctx.fill();
    },

    drawLabels(ctx, map, p) {
      const placed = [];
      const chip = (lat, lon, text, color, dx, dy, size) => {
        const pos = map.project(lon, lat);
        if (pos.x < 20 || pos.x > map.W - 20 || pos.y < 20 || pos.y > map.H - 20) return;
        size = size || 9.5;
        ctx.font = "500 " + size + "px " + (this.lang === "zh" ? "'PingFang SC',sans-serif" : "Georgia,serif");
        const w = ctx.measureText(text).width;
        const x = pos.x + (dx || 0), y = pos.y + (dy || 0);
        const r = [x - w / 2 - 5, y - size - 2, x + w / 2 + 5, y + 3];
        for (const q of placed) if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) return;
        placed.push(r);
        ctx.fillStyle = "rgba(250,246,238,0.88)";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(r[0], r[1], r[2] - r[0], r[3] - r[1], 2.5); ctx.fill(); }
        ctx.strokeStyle = hexA(color || "#8a6a3f", 0.45); ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = "rgba(48,38,28,0.9)";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(text, x, (r[1] + r[3]) / 2);
      };
      // side labels at a representative member
      for (const side of this.sides) {
        if (!side.members || !side.members.length) continue;
        const f = this.byIso && this.byIso[side.members[0]];
        if (!f || f.properties.lx == null) continue;
        chip(f.properties.ly, f.properties.lx, nameOf(side.name), side.color, 0, -30, 10);
      }
      for (const front of this.fronts) {
        if (!front.label || !front.pts) continue;
        const q = pointAt(front.pts, 0.5);
        chip(q[0], q[1], nameOf(front.label), this.sideColor(front.side), 0, -14, 9.5);
      }
      for (const route of this.routes) {
        if (!route.label || !route.pts) continue;
        const q = pointAt(route.pts, 0.5);
        chip(q[0], q[1], nameOf(route.label), "#b98a34", 0, -12, 9.5);
      }
      for (const b of this.battles.slice(0, 8)) {
        if (!b.name) continue;
        chip(b.lat, b.lon, nameOf(b.name), this.sideColor(b.side), 0, 10, 8.5);
      }
      if (this.end && this.end.label) {
        chip(this.end.lat, this.end.lon, nameOf(this.end.label) + " · " + this.end.year, "#3f6278", 0, 16, 9);
      }
      if (this.atomic && this.atomic.city) {
        chip(this.atomic.lat, this.atomic.lon, this.atomic.city[this.lang === "zh" ? 0 : 1] + " · " + this.atomic.date, "#a83e2c", 0, -30, 9.5);
      }
      if (this.founding && this.founding.label) {
        chip(this.founding.lat, this.founding.lon, this.founding.label[this.lang === "zh" ? 0 : 1] + " · " + this.founding.date, "#a83e2c", 0, -66, 9.5);
      }
    },
  });

  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, a));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  // expose for the app
  window.MapTheatre = T;
})();
