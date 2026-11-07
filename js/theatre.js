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
    style: null,
    hero: null,
    variant: null,
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
    craft: null,
    city: null,
    monument: null,
    revolution: null,
    byIso: null,
    lastP: 0,

    init(map) { this.map = map; },
    setLang(lang) { this.lang = lang; },

    playEvent(ev) {
      if (!this.map || !ev) return;
      const data = (A.theatres && A.theatres[ev.id]) || this.defaultTheatre(ev);
      this.ev = ev;
      this.data = data;
      this.style = (window.Scenes && window.Scenes.styleFor) ? window.Scenes.styleFor(ev) : ev.s;
      const sm = this.style;
      this.mode = data.mode || (sm === "paper" || sm === "printing" ? "craft" : sm === "mughal-tomb" || sm === "monument" ? "monument" : sm === "revolution" ? "revolution" : this.modeFor(ev));
      this.hero = (window.HeroScenes && window.HeroScenes.has(ev.id)) ? ev.id : null;
      this.variant = (window.VariantScenes && window.VariantScenes.has(ev.id)) ? ev.id : null;
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
      this.craft = data.craft || null;
      this.city = data.city || null;
      this.monument = data.monument || null;
      this.revolution = data.revolution || null;
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
      this.hero = null;
      this.variant = null;
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
      this.craft = null;
      this.city = null;
      this.monument = null;
      this.revolution = null;
      this.style = null;
      this.hero = null;
      this.variant = null;
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
      const st = (window.Scenes && window.Scenes.styleFor) ? window.Scenes.styleFor(ev) : s;
      if (st.endsWith("-founding")) return "founding";
      if (st === "paper" || st === "printing" || st === "treaty" || st === "script") return "craft";
      if (["mughal-tomb", "monument", "pyramid", "ziggurat", "stupa", "mosque", "church", "palace", "megalith"].includes(st)) return "monument";
      if (st === "revolution") return "revolution";
      if (st === "city" || st.startsWith("city-")) return "city";
      if (["steppe-founding", "south-asian-founding", "sea-founding", "african-founding", "american-founding"].includes(st)) return "founding";
      if (st === "galleon") return "trade";
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
      } else if (mode === "city") {
        data.city = { lat: ev.lat, lon: ev.lon, label: [ev.t[0], ev.t[1]], date: String(ev.y) };
        data.zoom = 3.1;
      } else if (mode === "craft") {
        data.craft = { lat: ev.lat, lon: ev.lon, label: [ev.t[0], ev.t[1]], date: String(ev.y) };
        data.zoom = 3.25;
      } else if (mode === "monument") {
        data.monument = { lat: ev.lat, lon: ev.lon, label: [ev.t[0], ev.t[1]], date: String(ev.y) };
        data.zoom = 3.0;
      } else if (mode === "revolution") {
        data.revolution = { lat: ev.lat, lon: ev.lon, label: [ev.t[0], ev.t[1]], date: String(ev.y) };
        data.zoom = 3.2;
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
      (data.battles || []).slice(0, 4).forEach((b) => {
        bases.forEach((side) => {
          const n = b.kind === "crowd" ? 2 : 2;
          for (let i = 0; i < n; i++) {
            if (units.length >= 16) break;
            units.push({
              type: b.kind === "crowd" ? "crowd" : kind,
              side: side.key,
              color: side.color,
              lat: b.lat, lon: b.lon,
              battle: true,
              r: 0.38 + (i / n) * 0.42 + rand() * 0.18,
              a: (i / n) * TAU + rand() * 0.5,
              speed: 0.12 + rand() * 0.12,
              phase: rand(),
              size: 0.72 + rand() * 0.18,
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
        const n = r.mode === "march" ? 3 : 1;
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

      if (this.hero) {
        this.drawHeroScene(ctx, map, p);
      } else if (this.variant) {
        this.drawVariantScene(ctx, map, p);
      } else {
        this.drawSideTints(ctx, map, p);
        const specialWar = this.mode === "war" && (this.style === "greek-naval" || this.style === "cn-cavalry" || this.style === "cavalry");
        if (!specialWar) {
          this.drawRoutes(ctx, map, p);
          this.drawFronts(ctx, map, p);
          this.drawBattles(ctx, map, p);
          if (this.mode !== "founding" && this.mode !== "craft" && this.mode !== "city" && this.mode !== "monument" && this.mode !== "revolution") this.drawUnits(ctx, map, p);
        } else if (this.style === "greek-naval") {
          this.drawNavalScene(ctx, map, p);
        } else {
          this.drawCavalryScene(ctx, map, p);
        }
        if (this.mode === "atomic") this.drawAtomic(ctx, map, p);
        else if (this.mode === "founding") this.drawFounding(ctx, map, p);
        else if (this.mode === "craft") this.drawCraft(ctx, map, p);
        else if (this.mode === "city") this.drawCity(ctx, map, p);
        else if (this.mode === "monument") this.drawMonument(ctx, map, p);
        else if (this.mode === "revolution") this.drawRevolution(ctx, map, p);
        else if (this.mode === "disaster") this.drawDisaster(ctx, map, p);
        this.drawEnd(ctx, map, p);
      }
      this.drawLabels(ctx, map, p);
      ctx.restore();
    },

    drawHeroScene(ctx, map, p) {
      if (!this.hero || !this.ev || !window.HeroScenes) return;
      const pos = map.project(this.ev.lon, this.ev.lat);
      if (pos.x < -140 || pos.x > map.W + 140 || pos.y < -60 || pos.y > map.H + 160) return;
      const s = clamp(1.9 + map.view.zoom * 0.32, 2.0, 3.6);
      window.HeroScenes.drawMap(ctx, this.hero, pos.x, pos.y + 7 * s, s, p);
    },

    drawVariantScene(ctx, map, p) {
      if (!this.variant || !this.ev || !window.VariantScenes) return;
      const pos = map.project(this.ev.lon, this.ev.lat);
      if (pos.x < -140 || pos.x > map.W + 140 || pos.y < -60 || pos.y > map.H + 160) return;
      const s = clamp(1.9 + map.view.zoom * 0.32, 2.0, 3.6);
      window.VariantScenes.drawMap(ctx, this.variant, pos.x, pos.y + 7 * s, s, p);
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
      const scale = clamp(0.5 + zoom * 0.24, 0.8, 1.5);
      for (const u of this.units) {
        let lat, lon, ang = 0;
        if (u.path) {
          const t = (u.phase + p * u.speed) % 1;
          const q = pointAt(u.path, t);
          lat = q[0]; lon = q[1];
          const q2 = pointAt(u.path, Math.min(1, t + 0.01));
          ang = Math.atan2(-(q2[0] - q[0]), q2[1] - q[1]);
        } else {
          const a = u.a + p * u.speed * TAU;
          lat = u.lat + Math.sin(a) * u.r;
          lon = u.lon + Math.cos(a) * u.r * 1.4;
          ang = -a;
        }
        const sp = map.project(lon, lat);
        if (sp.x < -30 || sp.x > map.W + 30 || sp.y < -30 || sp.y > map.H + 30) continue;
        if (this.mode === "trade" && (u.type === "ship" || u.type === "camel")) {
          this.drawTradeUnit(ctx, u.type, sp.x, sp.y, scale * 1.18, p, u.color);
        } else {
          this.drawUnit(ctx, u.type, sp.x, sp.y, scale * (u.size || 1), p, u.color, ang, u.side);
        }
      }
    },

    drawTradeUnit(ctx, type, x, y, s, p, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      if (type === "camel") {
        ctx.strokeStyle = "rgba(92,66,43,0.95)"; ctx.fillStyle = "rgba(126,92,58,0.95)"; ctx.lineCap = "round";
        ctx.lineWidth = 1.4;
        const g = Math.sin(p * 5 + x);
        ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-5 + g, 0); ctx.moveTo(-1, -4); ctx.lineTo(-g, 0); ctx.moveTo(3, -4); ctx.lineTo(4 - g, 0); ctx.moveTo(5, -4); ctx.lineTo(6 + g, 0); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, -7, 6, 3, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(-2, -10, 2.2, Math.PI, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(2, -10, 2, Math.PI, TAU); ctx.fill();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, -7); ctx.quadraticCurveTo(8, -12, 9, -14); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(10, -14, 2, 1.2, 0.3, 0, TAU); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-9, -2); ctx.stroke();
      } else {
        // upright cartographic ship, no rotation: bow to the right, warm hull, colored sail
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-4, 5, 12, 1); ctx.lineTo(17, -3); ctx.lineTo(10, -1); ctx.quadraticCurveTo(0, 2, -11, -3); ctx.closePath();
        ctx.fillStyle = "rgba(148,106,64,0.95)"; ctx.fill(); ctx.strokeStyle = "rgba(74,54,36,0.9)"; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, -18); ctx.strokeStyle = "rgba(74,54,36,0.9)"; ctx.lineWidth = 1; ctx.stroke();
        const wave = Math.sin(p * 2 + x) * 1;
        ctx.beginPath(); ctx.moveTo(-7, -17); ctx.quadraticCurveTo(0, -19 + wave, 7, -17); ctx.lineTo(6, -7); ctx.quadraticCurveTo(0, -5 + wave, -6, -7); ctx.closePath();
        ctx.fillStyle = "rgba(242,230,205,0.95)"; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(5, -15); ctx.lineTo(0, -12); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = "rgba(230,220,200,0.55)"; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(-18, 3); ctx.quadraticCurveTo(0, 7, 18, 3); ctx.stroke();
      }
      ctx.restore();
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
      // a small shield and two spears, not a black X
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = "rgba(232,216,186,0.85)"; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = "rgba(74,54,36,0.9)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, 7); ctx.moveTo(7, -7); ctx.lineTo(-7, 7); ctx.stroke();
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
      if (this.style === "roman-founding") return this.drawRomanFounding(ctx, map, p);
      if (this.style === "islamic-founding") return this.drawIslamicFounding(ctx, map, p);
      if (this.style === "modern-founding") return this.drawModernFounding(ctx, map, p);
      if (this.style === "megalith") return this.drawMegalithFounding(ctx, map, p);
      if (this.style === "castle-founding") return this.drawCastleFounding(ctx, map, p);
      if (this.style === "steppe-founding") return this.drawSteppeFounding(ctx, map, p);
      if (this.style === "south-asian-founding") return this.drawSouthAsianFounding(ctx, map, p);
      if (this.style === "sea-founding") return this.drawSeaFounding(ctx, map, p);
      if (this.style === "african-founding") return this.drawAfricanFounding(ctx, map, p);
      if (this.style === "american-founding") return this.drawAmericanFounding(ctx, map, p);
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

    drawRomanFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(232,220,198,0.92)", gold = "rgba(176,138,62,0.95)", red = "rgba(176,67,44,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 92, "#c9a45f", 0.16);
      ctx.beginPath(); ctx.ellipse(0, 4, 58, 12, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.13)"; ctx.fill();
      // steps
      ctx.fillStyle = "rgba(210,192,164,0.65)"; ctx.fillRect(-48, 0, 96, 9); ctx.strokeStyle = ink; ctx.strokeRect(-48, 0, 96, 9);
      ctx.fillStyle = "rgba(226,210,184,0.8)"; ctx.fillRect(-44, -7, 88, 7); ctx.strokeRect(-44, -7, 88, 7);
      // columns
      for (let i = -2; i <= 2; i++) {
        const x = i * 15;
        ctx.fillStyle = stone; ctx.fillRect(x - 3, -45, 6, 38); ctx.strokeStyle = ink; ctx.strokeRect(x - 3, -45, 6, 38);
        ctx.fillStyle = "rgba(184,156,112,0.8)"; ctx.fillRect(x - 5, -47, 10, 3); ctx.fillRect(x - 5, -9, 10, 3);
      }
      // pediment
      ctx.beginPath(); ctx.moveTo(-44, -47); ctx.lineTo(0, -66); ctx.lineTo(44, -47); ctx.closePath(); ctx.fillStyle = stone; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-32, -48); ctx.lineTo(0, -60); ctx.lineTo(32, -48); ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.stroke();
      // eagle standard
      ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(43, 4); ctx.lineTo(43, -55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(43, -55); ctx.lineTo(36, -61); ctx.lineTo(43, -59); ctx.lineTo(50, -61); ctx.closePath(); ctx.fillStyle = gold; ctx.fill();
      // laurel
      ctx.strokeStyle = "rgba(80,110,70,0.8)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, -30, 54, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      // standards
      for (const bx of [-34, 34]) {
        ctx.strokeStyle = red; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, -42); ctx.stroke();
        ctx.fillStyle = red; ctx.beginPath(); ctx.moveTo(bx, -42); ctx.lineTo(bx + 11, -39); ctx.lineTo(bx, -35); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    drawIslamicFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(238,225,198,0.94)", gold = "rgba(176,138,62,0.95)", green = "rgba(70,100,82,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 92, "#c9a45f", 0.16);
      ctx.beginPath(); ctx.ellipse(0, 4, 58, 12, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.13)"; ctx.fill();
      ctx.fillStyle = "rgba(220,202,170,0.6)"; ctx.fillRect(-42, -5, 84, 12); ctx.strokeStyle = ink; ctx.strokeRect(-42, -5, 84, 12);
      // central dome + iwan
      ctx.beginPath(); ctx.moveTo(-26, -5); ctx.quadraticCurveTo(-26, -48, 0, -56); ctx.quadraticCurveTo(26, -48, 26, -5); ctx.closePath(); ctx.fillStyle = stone; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(0, -65); ctx.strokeStyle = gold; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -65, 3, Math.PI, TAU); ctx.strokeStyle = gold; ctx.stroke();
      // minarets
      for (const mx of [-40, 40]) {
        ctx.fillStyle = stone; ctx.fillRect(mx - 3, -58, 6, 58); ctx.strokeStyle = ink; ctx.strokeRect(mx - 3, -58, 6, 58);
        ctx.beginPath(); ctx.moveTo(mx - 5, -58); ctx.lineTo(mx, -68); ctx.lineTo(mx + 5, -58); ctx.closePath(); ctx.fillStyle = green; ctx.fill();
      }
      // arches + gate
      for (let i = -1; i <= 1; i++) {
        const x = i * 16;
        ctx.beginPath(); ctx.moveTo(x - 5, 8); ctx.lineTo(x - 5, -11); ctx.quadraticCurveTo(x, -18, x + 5, -11); ctx.lineTo(x + 5, 8); ctx.closePath(); ctx.fillStyle = i === 0 ? "rgba(78,58,40,0.55)" : "rgba(120,92,58,0.28)"; ctx.fill();
      }
      ctx.restore();
    },

    drawModernFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(236,228,212,0.95)", gold = "rgba(176,138,62,0.95)", red = "rgba(176,67,44,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 90, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 4, 58, 12, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.13)"; ctx.fill();
      ctx.fillStyle = "rgba(214,202,182,0.65)"; ctx.fillRect(-48, 0, 96, 9); ctx.strokeStyle = ink; ctx.strokeRect(-48, 0, 96, 9);
      ctx.fillStyle = stone; ctx.fillRect(-38, -36, 76, 38); ctx.strokeRect(-38, -36, 76, 38);
      for (let i = -4; i <= 4; i++) { ctx.fillStyle = "rgba(180,164,140,0.55)"; ctx.fillRect(i * 8 - 2, -32, 4, 30); }
      // dome / pediment
      ctx.beginPath(); ctx.moveTo(-24, -36); ctx.lineTo(0, -56); ctx.lineTo(24, -36); ctx.closePath(); ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
      // flag
      ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(44, 4); ctx.lineTo(44, -52); ctx.stroke();
      const wave = Math.sin(p * 2.4) * 3;
      ctx.beginPath(); ctx.moveTo(44, -50); ctx.quadraticCurveTo(56 + wave, -49, 63 + wave, -44); ctx.lineTo(44, -40); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      // crowd spaced, not a blob
      for (let i = -3; i <= 3; i++) {
        const cx = i * 9 + Math.sin(p * 2 + i) * 1;
        ctx.strokeStyle = "rgba(102,76,52,0.85)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx - 1, 13); ctx.moveTo(cx, 8); ctx.lineTo(cx + 1, 13); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, 6.5, 1.4, 0, TAU); ctx.fillStyle = "rgba(126,94,64,0.95)"; ctx.fill();
      }
      ctx.restore();
    },

    drawMegalithFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(158,144,118,0.85)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 84, "#c9a45f", 0.12);
      ctx.beginPath(); ctx.ellipse(0, 4, 52, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.13)"; ctx.fill();
      for (const bx of [-34, -12, 12, 34]) {
        ctx.fillStyle = stone; ctx.fillRect(bx - 5, -38, 10, 42); ctx.strokeStyle = ink; ctx.strokeRect(bx - 5, -38, 10, 42);
      }
      ctx.fillStyle = stone; ctx.fillRect(-42, -44, 84, 9); ctx.strokeRect(-42, -44, 84, 9);
      const fl = 0.6 + 0.4 * Math.sin(p * 4);
      glow(ctx, 0, 0, 14 * fl, "#d0783a", 0.4);
      ctx.beginPath(); ctx.moveTo(-3, 4); ctx.quadraticCurveTo(-1, -4, 0, -8 * fl); ctx.quadraticCurveTo(2, -4, 3, 4); ctx.closePath(); ctx.fillStyle = "rgba(214,120,58,0.8)"; ctx.fill();
      ctx.restore();
    },

    drawCastleFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(206,184,148,0.75)", red = "rgba(176,67,44,0.9)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 86, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 4, 54, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.13)"; ctx.fill();
      ctx.fillStyle = stone; ctx.fillRect(-30, -34, 60, 38); ctx.strokeStyle = ink; ctx.strokeRect(-30, -34, 60, 38);
      for (const tx of [-44, 30]) {
        ctx.fillStyle = "rgba(214,194,158,0.85)"; ctx.fillRect(tx, -48, 14, 52); ctx.strokeRect(tx, -48, 14, 52);
        ctx.beginPath(); ctx.moveTo(tx - 2, -48); ctx.lineTo(tx + 7, -60); ctx.lineTo(tx + 16, -48); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      }
      for (let i = -30; i < 30; i += 10) { ctx.fillStyle = "rgba(214,194,158,0.9)"; ctx.fillRect(i, -38, 5, 5); }
      ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-7, -10); ctx.quadraticCurveTo(0, -18, 7, -10); ctx.lineTo(7, 4); ctx.closePath(); ctx.fillStyle = "rgba(80,58,40,0.62)"; ctx.fill();
      ctx.strokeStyle = gold; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, -57); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -57); ctx.lineTo(10, -54); ctx.lineTo(0, -50); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      ctx.restore();
    },

    drawSteppeFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", warm = "rgba(206,174,128,0.9)", red = "rgba(176,67,44,0.9)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 84, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 5, 52, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      for (const tx of [-30, 0, 30]) {
        ctx.beginPath(); ctx.moveTo(tx - 20, 4); ctx.quadraticCurveTo(tx - 16, -22, tx, -28); ctx.quadraticCurveTo(tx + 16, -22, tx + 20, 4); ctx.closePath(); ctx.fillStyle = warm; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx - 4, 4); ctx.lineTo(tx - 4, -8); ctx.quadraticCurveTo(tx, -13, tx + 4, -8); ctx.lineTo(tx + 4, 4); ctx.closePath(); ctx.fillStyle = "rgba(92,66,43,0.5)"; ctx.fill();
      }
      ctx.strokeStyle = gold; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, -48); ctx.stroke();
      const wave = Math.sin(p * 2.5) * 3;
      ctx.beginPath(); ctx.moveTo(0.5, -47); ctx.quadraticCurveTo(14 + wave, -45, 20 + wave, -39); ctx.lineTo(0.5, -34); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      ctx.restore();
    },

    drawSouthAsianFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(236,220,190,0.95)", gold = "rgba(176,138,62,0.95)", warm = "rgba(204,168,112,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 88, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 5, 52, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      ctx.fillStyle = "rgba(220,196,158,0.65)"; ctx.fillRect(-46, 0, 92, 10); ctx.strokeStyle = ink; ctx.strokeRect(-46, 0, 92, 10);
      // Indian shikhara + torana gate
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-22, -46, 0, -60); ctx.quadraticCurveTo(22, -46, 26, 0); ctx.closePath(); ctx.fillStyle = warm; ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 2, -8 - i * 9); ctx.lineTo(18 - i * 2, -8 - i * 9); ctx.strokeStyle = "rgba(120,90,55,0.35)"; ctx.lineWidth = 0.7; ctx.stroke(); }
      for (const tx of [-38, 38]) { ctx.fillStyle = stone; ctx.fillRect(tx - 4, -32, 8, 32); ctx.strokeRect(tx - 4, -32, 8, 32); ctx.beginPath(); ctx.arc(tx, -32, 7, Math.PI, TAU); ctx.fillStyle = warm; ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-44, -26); ctx.quadraticCurveTo(0, -38, 44, -26); ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -72); ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
    },

    drawSeaFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(230,212,180,0.9)", gold = "rgba(176,138,62,0.95)", red = "rgba(176,67,44,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 88, "#8aa8a0", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 14, 56, 10, 0, 0, TAU); ctx.fillStyle = "rgba(80,130,140,0.10)"; ctx.fill();
      // port godown + stupa
      ctx.fillStyle = "rgba(220,196,158,0.6)"; ctx.fillRect(-40, -2, 80, 12); ctx.strokeStyle = ink; ctx.strokeRect(-40, -2, 80, 12);
      ctx.beginPath(); ctx.arc(0, -10, 18, Math.PI, TAU); ctx.lineTo(18, 6); ctx.lineTo(-18, 6); ctx.closePath(); ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, -42); ctx.strokeStyle = gold; ctx.lineWidth = 1.3; ctx.stroke();
      // small junk
      ctx.beginPath(); ctx.moveTo(26, 12); ctx.quadraticCurveTo(36, 17, 52, 13); ctx.lineTo(56, 9); ctx.lineTo(48, 10); ctx.quadraticCurveTo(38, 12, 28, 8); ctx.closePath(); ctx.fillStyle = "rgba(118,82,50,0.9)"; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(40, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, -7); ctx.lineTo(51, -4); ctx.lineTo(40, 0); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      ctx.restore();
    },

    drawAfricanFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", warm = "rgba(206,172,120,0.88)", gold = "rgba(176,138,62,0.95)", red = "rgba(176,67,44,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 84, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 6, 52, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      for (const hx of [-30, 4, 32]) {
        ctx.beginPath(); ctx.arc(hx, -2, 17, Math.PI, TAU); ctx.lineTo(hx + 17, 8); ctx.lineTo(hx - 17, 8); ctx.closePath(); ctx.fillStyle = warm; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx - 4, 8); ctx.lineTo(hx - 4, 0); ctx.quadraticCurveTo(hx, -5, hx + 4, 0); ctx.lineTo(hx + 4, 8); ctx.closePath(); ctx.fillStyle = "rgba(92,66,43,0.5)"; ctx.fill();
      }
      // earthwork wall + drum
      ctx.strokeStyle = "rgba(120,90,58,0.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 8, 52, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      ctx.strokeStyle = gold; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(11, -37); ctx.lineTo(0, -33); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      ctx.restore();
    },

    drawAmericanFounding(ctx, map, p) {
      const f = this.founding; if (!f) return;
      const pos = map.project(f.lon, f.lat);
      const s = clamp(1.0 + map.view.zoom * 0.28, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", stone = "rgba(218,188,144,0.9)", gold = "rgba(176,138,62,0.95)", red = "rgba(176,67,44,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 86, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 6, 52, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      for (let i = 0; i < 4; i++) {
        const w = 56 - i * 11;
        ctx.fillStyle = i % 2 ? "rgba(206,172,120,0.9)" : "rgba(226,198,154,0.95)";
        ctx.fillRect(-w / 2, 4 - (i + 1) * 8, w, 8);
        ctx.strokeStyle = "rgba(90,64,42,0.55)"; ctx.lineWidth = 0.8; ctx.strokeRect(-w / 2, 4 - (i + 1) * 8, w, 8);
      }
      // temple door + standard
      ctx.beginPath(); ctx.moveTo(-5, -28); ctx.lineTo(-5, -38); ctx.quadraticCurveTo(0, -44, 5, -38); ctx.lineTo(5, -28); ctx.closePath(); ctx.fillStyle = "rgba(92,66,43,0.6)"; ctx.fill();
      ctx.strokeStyle = gold; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(22, -28); ctx.lineTo(22, -50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, -50); ctx.lineTo(33, -47); ctx.lineTo(22, -43); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      ctx.restore();
    },

    drawCraft(ctx, map, p) {
      const c = this.craft; if (!c) return;
      if (this.style === "treaty" || this.style === "script") return this.drawDocumentScene(ctx, map, p);
      const pos = map.project(c.lon, c.lat);
      const s = clamp(1.0 + map.view.zoom * 0.3, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", paper = "rgba(246,236,214,0.95)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 84, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 6, 46, 10, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      if (this.style === "printing") {
        ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(-30, -30, 60, 30);
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -54); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-14, -54); ctx.lineTo(14, -54); ctx.stroke();
        ctx.strokeStyle = gold; ctx.lineWidth = 1.2;
        for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 2.5, -52); ctx.lineTo(i * 2.5, -36); ctx.stroke(); }
        ctx.fillStyle = paper; ctx.fillRect(-24, 0, 48, 10); ctx.strokeStyle = ink; ctx.strokeRect(-24, 0, 48, 10);
      } else {
        // paper sheet, vat, brush
        ctx.fillStyle = paper; ctx.strokeStyle = ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-30, -32); ctx.lineTo(20, -38); ctx.lineTo(28, 8); ctx.lineTo(-22, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-22, -24 + i * 7); ctx.lineTo(20, -28 + i * 7); ctx.strokeStyle = "rgba(90,70,50,0.35)"; ctx.lineWidth = 0.8; ctx.stroke(); }
        ctx.fillStyle = "rgba(126,92,56,0.65)"; ctx.fillRect(-40, 16, 26, 8); ctx.strokeRect(-40, 16, 26, 8);
        ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, -24); ctx.lineTo(44, -46); ctx.stroke();
      }
      ctx.restore();
    },

    drawMonument(ctx, map, p) {
      const m = this.monument; if (!m) return;
      if (this.style && this.style !== "mughal-tomb") return this.drawArchitecture(ctx, map, p, this.style);
      const pos = map.project(m.lon, m.lat);
      const s = clamp(1.0 + map.view.zoom * 0.3, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.8)", stone = "rgba(246,236,216,0.96)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 92, "#d0b070", 0.16);
      ctx.beginPath(); ctx.ellipse(0, 8, 54, 12, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      // platform
      ctx.fillStyle = "rgba(232,220,198,0.9)"; ctx.fillRect(-42, 0, 84, 12); ctx.strokeStyle = ink; ctx.strokeRect(-42, 0, 84, 12);
      // central dome
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.quadraticCurveTo(-24, -48, 0, -58); ctx.quadraticCurveTo(24, -48, 24, 0); ctx.closePath(); ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(0, -68); ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.stroke();
      // minarets
      for (const mx of [-38, 38]) {
        ctx.fillStyle = stone; ctx.fillRect(mx - 2.5, -44, 5, 46); ctx.strokeRect(mx - 2.5, -44, 5, 46);
        ctx.beginPath(); ctx.moveTo(mx - 4, -44); ctx.lineTo(mx, -54); ctx.lineTo(mx + 4, -44); ctx.closePath(); ctx.fillStyle = gold; ctx.fill();
      }
      // pool
      ctx.strokeStyle = "rgba(80,130,140,0.55)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-30, 18); ctx.lineTo(30, 18); ctx.stroke();
      ctx.restore();
    },

    drawRevolution(ctx, map, p) {
      const r = this.revolution; if (!r) return;
      const pos = map.project(r.lon, r.lat);
      const s = clamp(1.0 + map.view.zoom * 0.3, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", red = "rgba(176,67,44,0.92)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 84, "#c0603a", 0.16);
      // Winter Palace-like facade behind the barricade
      ctx.fillStyle = "rgba(226,212,186,0.32)";
      ctx.fillRect(-52, -32, 104, 34);
      ctx.strokeStyle = "rgba(86,64,44,0.45)"; ctx.lineWidth = 0.8;
      ctx.strokeRect(-52, -32, 104, 34);
      ctx.beginPath(); ctx.moveTo(-54, -32); ctx.lineTo(0, -40); ctx.lineTo(54, -32); ctx.stroke();
      for (let i = -4; i <= 4; i++) {
        ctx.fillStyle = "rgba(250,242,224,0.35)";
        ctx.fillRect(i * 10 - 1, -29, 3, 27);
        ctx.strokeStyle = "rgba(86,64,44,0.3)"; ctx.strokeRect(i * 10 - 1, -29, 3, 27);
      }
      ctx.fillStyle = "rgba(86,64,44,0.25)"; ctx.fillRect(-7, -24, 14, 22);
      // barricade
      ctx.strokeStyle = "rgba(102,74,48,0.9)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-42, 8); ctx.lineTo(42, -4); ctx.moveTo(-42, -4); ctx.lineTo(42, 8); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 12, 44, 6, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      // flag
      ctx.strokeStyle = gold; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -48); ctx.stroke();
      const wave = Math.sin(p * 2.6) * 4;
      ctx.beginPath(); ctx.moveTo(0.5, -46); ctx.quadraticCurveTo(18 + wave, -44, 28 + wave, -36); ctx.lineTo(0.5, -28); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
      // spaced crowd, warm ink
      for (let i = -4; i <= 4; i++) {
        const cx = i * 9 + Math.sin(p * 2 + i) * 1.4;
        ctx.strokeStyle = i % 2 ? "rgba(102,76,52,0.9)" : "rgba(74,54,36,0.9)"; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(cx, 6); ctx.lineTo(cx - 1, 12); ctx.moveTo(cx, 6); ctx.lineTo(cx + 1, 12); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, 4, 1.5, 0, TAU); ctx.fillStyle = "rgba(126,94,64,0.95)"; ctx.fill();
      }
      ctx.restore();
    },

    drawCavalryScene(ctx, map, p) {
      const ev = this.ev; if (!ev) return;
      const pos = map.project(ev.lon, ev.lat);
      const s = clamp(0.9 + map.view.zoom * 0.28, 1.1, 2.8);
      const ink = "rgba(74,54,36,0.8)", red = "rgba(176,67,44,0.9)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 84, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 8, 52, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.13)"; ctx.fill();
      // city gate behind
      ctx.fillStyle = "rgba(214,190,150,0.38)"; ctx.fillRect(-38, -20, 76, 28); ctx.strokeStyle = ink; ctx.strokeRect(-38, -20, 76, 28);
      ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(-10, -10); ctx.quadraticCurveTo(0, -22, 10, -10); ctx.lineTo(10, 8); ctx.closePath(); ctx.fillStyle = "rgba(90,64,44,0.45)"; ctx.fill();
      // three riders, warm ink
      for (let i = 0; i < 3; i++) {
        const hx = -24 + i * 22;
        this.drawHorseIcon(ctx, hx, 4, 1.05, p + i * 0.5, i === 1 ? red : "rgba(96,70,46,0.95)");
        const bob = Math.sin(p * 7 + i) * 1.2;
        ctx.strokeStyle = i === 1 ? red : "rgba(74,54,36,0.9)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(hx, -12 + bob); ctx.lineTo(hx, -20 + bob); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, -22 + bob, 2, 0, TAU); ctx.fillStyle = "rgba(126,94,64,0.95)"; ctx.fill();
        ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + 5, -12); ctx.lineTo(hx + 5, -28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx + 5, -27); ctx.lineTo(hx + 13, -25); ctx.lineTo(hx + 5, -22); ctx.closePath(); ctx.fillStyle = i === 1 ? red : gold; ctx.fill();
      }
      // dust
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-30 + i * 16, 12 + Math.sin(p + i) * 2, 5 + i, 0, TAU); ctx.fillStyle = "rgba(180,150,110,0.07)"; ctx.fill(); }
      ctx.restore();
    },

    drawNavalScene(ctx, map, p) {
      const ev = this.ev; if (!ev) return;
      const pos = map.project(ev.lon, ev.lat);
      const s = clamp(0.9 + map.view.zoom * 0.28, 1.1, 2.8);
      const ink = "rgba(74,54,36,0.8)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      // sea wash + foam
      ctx.beginPath(); ctx.ellipse(0, 2, 60, 24, 0, 0, TAU); ctx.fillStyle = "rgba(80,130,140,0.08)"; ctx.fill();
      for (let i = 0; i < 3; i++) {
        const sx = -38 + i * 30, bob = Math.sin(p * 2 + i) * 2;
        ctx.save(); ctx.translate(sx, bob);
        // hull
        ctx.beginPath(); ctx.moveTo(-18, -2); ctx.quadraticCurveTo(-8, 5, 13, 1); ctx.lineTo(19, -3); ctx.lineTo(12, -1); ctx.quadraticCurveTo(0, 2, -15, -4); ctx.closePath(); ctx.fillStyle = "rgba(118,82,50,0.9)"; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(19, -3); ctx.lineTo(24, -1); ctx.lineTo(19, 0); ctx.closePath(); ctx.fillStyle = gold; ctx.fill();
        // oars
        ctx.strokeStyle = "rgba(74,54,36,0.7)"; ctx.lineWidth = 0.7;
        for (let j = -12; j <= 8; j += 4) { ctx.beginPath(); ctx.moveTo(j, 2); ctx.lineTo(j - 4, 7); ctx.stroke(); }
        // mast + sail
        ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -22); ctx.stroke();
        const wave = Math.sin(p * 2 + i) * 1;
        ctx.beginPath(); ctx.moveTo(-9, -21); ctx.quadraticCurveTo(0, -24 + wave, 9, -21); ctx.lineTo(7, -9); ctx.quadraticCurveTo(0, -7 + wave, -7, -9); ctx.closePath(); ctx.fillStyle = "rgba(240,228,204,0.95)"; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(13, -2, 1.2, 0, TAU); ctx.fillStyle = ink; ctx.fill();
        ctx.restore();
      }
      // foam lines
      ctx.strokeStyle = "rgba(230,220,200,0.45)"; ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-50, 16 + i * 3); ctx.quadraticCurveTo(0, 20 + i * 3, 50, 16 + i * 3); ctx.stroke(); }
      ctx.restore();
    },

    drawCity(ctx, map, p) {
      const c = this.city; if (!c) return;
      const pos = map.project(c.lon, c.lat);
      const s = clamp(1.0 + map.view.zoom * 0.3, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.8)";
      const era = (this.style || "city").replace("city-", "");
      const roofs = era === "modern" ? "rgba(138,148,152,0.75)" : era === "medieval" ? "rgba(158,98,60,0.85)" : "rgba(196,154,102,0.85)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 88, "#c9a45f", 0.12);
      ctx.beginPath(); ctx.ellipse(0, 6, 56, 12, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      if (era === "modern") {
        ctx.fillStyle = "rgba(220,218,210,0.85)";
        for (let i = -4; i <= 4; i++) { const h = 22 + (i % 3 + 3) * 9; ctx.fillRect(i * 11 - 3, 4 - h, 6, h); ctx.strokeStyle = "rgba(90,80,70,0.35)"; ctx.strokeRect(i * 11 - 3, 4 - h, 6, h); }
      } else {
        ctx.fillStyle = "rgba(208,184,146,0.55)"; ctx.fillRect(-48, 0, 96, 10); ctx.strokeStyle = ink; ctx.strokeRect(-48, 0, 96, 10);
        for (let i = -3; i <= 3; i++) {
          const h = era === "medieval" ? 30 : 22;
          ctx.fillStyle = "rgba(226,208,180,0.75)"; ctx.fillRect(i * 13 - 4, 4 - h, 8, h); ctx.strokeRect(i * 13 - 4, 4 - h, 8, h);
          ctx.beginPath(); ctx.moveTo(i * 13 - 7, 4 - h); ctx.lineTo(i * 13, 4 - h - 9); ctx.lineTo(i * 13 + 7, 4 - h); ctx.closePath(); ctx.fillStyle = roofs; ctx.fill(); ctx.stroke();
        }
      }
      ctx.restore();
    },

    drawArchitecture(ctx, map, p, style) {
      const m = this.monument; if (!m) return;
      const pos = map.project(m.lon, m.lat);
      const s = clamp(1.0 + map.view.zoom * 0.3, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.82)", stone = "rgba(240,228,206,0.95)", gold = "rgba(176,138,62,0.95)", red = "rgba(176,67,44,0.9)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 90, "#c9a45f", 0.14);
      ctx.beginPath(); ctx.ellipse(0, 5, 54, 11, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.12)"; ctx.fill();
      if (style === "pyramid") {
        ctx.beginPath(); ctx.moveTo(-44, 4); ctx.lineTo(0, -52); ctx.lineTo(44, 4); ctx.closePath(); ctx.fillStyle = "rgba(218,190,140,0.9)"; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.stroke();
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-44 + i * 7.3, 4 - i * 9.3); ctx.lineTo(44 - i * 7.3, 4 - i * 9.3); ctx.strokeStyle = "rgba(120,90,55,0.35)"; ctx.lineWidth = 0.6; ctx.stroke(); }
      } else if (style === "ziggurat") {
        for (let i = 0; i < 4; i++) { const w = 80 - i * 16; ctx.fillStyle = i % 2 ? "rgba(204,176,132,0.9)" : "rgba(224,196,152,0.95)"; ctx.fillRect(-w / 2, 4 - (i + 1) * 10, w, 10); ctx.strokeStyle = ink; ctx.lineWidth = 0.7; ctx.strokeRect(-w / 2, 4 - (i + 1) * 10, w, 10); }
        ctx.fillStyle = "rgba(92,66,43,0.6)"; ctx.fillRect(-4, -40, 8, 10);
      } else if (style === "stupa") {
        ctx.fillStyle = "rgba(228,208,174,0.9)"; ctx.fillRect(-40, 0, 80, 8); ctx.strokeStyle = ink; ctx.strokeRect(-40, 0, 80, 8);
        ctx.beginPath(); ctx.arc(0, -10, 28, Math.PI, TAU); ctx.lineTo(28, 0); ctx.lineTo(-28, 0); ctx.closePath(); ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
        ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, -54); ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, -16 - i * 3, 6 - i, 0, TAU); ctx.strokeStyle = "rgba(176,138,62,0.7)"; ctx.lineWidth = 0.8; ctx.stroke(); }
      } else if (style === "mosque") {
        ctx.fillStyle = "rgba(224,204,168,0.8)"; ctx.fillRect(-40, 0, 80, 8); ctx.strokeRect(-40, 0, 80, 8);
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-22, -42, 0, -50); ctx.quadraticCurveTo(22, -42, 22, 0); ctx.closePath(); ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -60); ctx.strokeStyle = gold; ctx.lineWidth = 1.3; ctx.stroke();
        for (const mx of [-40, 40]) { ctx.fillStyle = stone; ctx.fillRect(mx - 3, -48, 6, 50); ctx.strokeRect(mx - 3, -48, 6, 50); ctx.beginPath(); ctx.moveTo(mx - 5, -48); ctx.lineTo(mx, -58); ctx.lineTo(mx + 5, -48); ctx.closePath(); ctx.fillStyle = gold; ctx.fill(); }
      } else if (style === "church") {
        ctx.fillStyle = "rgba(230,218,196,0.9)"; ctx.fillRect(-34, -24, 68, 28); ctx.strokeStyle = ink; ctx.strokeRect(-34, -24, 68, 28);
        ctx.beginPath(); ctx.moveTo(-36, -24); ctx.lineTo(0, -46); ctx.lineTo(36, -24); ctx.closePath(); ctx.fillStyle = "rgba(190,156,104,0.85)"; ctx.fill(); ctx.stroke();
        ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -62); ctx.moveTo(-5, -57); ctx.lineTo(5, -57); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -16, 7, Math.PI, TAU); ctx.fillStyle = red; ctx.fill();
      } else if (style === "palace") {
        ctx.fillStyle = "rgba(230,216,190,0.9)"; ctx.fillRect(-44, -18, 88, 24); ctx.strokeStyle = ink; ctx.strokeRect(-44, -18, 88, 24);
        for (let i = -4; i <= 4; i++) { ctx.fillStyle = "rgba(244,232,212,0.95)"; ctx.fillRect(i * 9 - 1.5, -30, 3, 12); ctx.strokeRect(i * 9 - 1.5, -30, 3, 12); }
        ctx.beginPath(); ctx.moveTo(-46, -30); ctx.lineTo(0, -42); ctx.lineTo(46, -30); ctx.closePath(); ctx.fillStyle = "rgba(204,168,112,0.9)"; ctx.fill(); ctx.stroke();
      } else {
        // megalith
        for (const bx of [-32, -10, 12, 32]) { ctx.fillStyle = "rgba(160,144,116,0.85)"; ctx.fillRect(bx - 4, -28, 8, 32); ctx.strokeStyle = ink; ctx.strokeRect(bx - 4, -28, 8, 32); }
        ctx.fillStyle = "rgba(170,154,126,0.9)"; ctx.fillRect(-38, -36, 76, 8); ctx.strokeRect(-38, -36, 76, 8);
        const fl = 0.6 + 0.4 * Math.sin(p * 4); glow(ctx, 0, 0, 15 * fl, "#d0783a", 0.4);
      }
      ctx.restore();
    },

    drawDocumentScene(ctx, map, p) {
      const c = this.craft; if (!c) return;
      const pos = map.project(c.lon, c.lat);
      const s = clamp(1.0 + map.view.zoom * 0.3, 1.2, 2.8);
      const ink = "rgba(74,54,36,0.85)", paper = "rgba(246,236,214,0.95)", gold = "rgba(176,138,62,0.95)";
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(s, s);
      glow(ctx, 0, 0, 84, "#c9a45f", 0.12);
      ctx.fillStyle = paper; ctx.strokeStyle = ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-38, -24); ctx.lineTo(30, -30); ctx.lineTo(38, 18); ctx.lineTo(-30, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-28, -16 + i * 6); ctx.lineTo(28, -20 + i * 6); ctx.strokeStyle = "rgba(90,70,50,0.35)"; ctx.lineWidth = 0.8; ctx.stroke(); }
      if (this.style === "script") {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { ctx.fillStyle = "rgba(90,64,42,0.6)"; ctx.fillRect(-14 + c * 5, -10 + r * 6, 3, 3); }
        ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(28, -26); ctx.lineTo(46, -42); ctx.stroke();
      } else {
        // seal and quill
        ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(26, 8); ctx.lineTo(42, -10); ctx.stroke();
        ctx.fillStyle = "rgba(176,67,44,0.8)"; ctx.fillRect(-34, 16, 9, 9);
      }
      ctx.restore();
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
      const seenLabels = new Set();
      const chip = (lat, lon, text, color, dx, dy, size) => {
        const key = String(text).replace(/\s+/g, " ").trim();
        if (!key || seenLabels.has(key)) return;
        seenLabels.add(key);
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
      if (this.hero) {
        const ev = this.ev;
        const title = this.lang === "zh" ? ev.t[0] : ev.t[1];
        chip(ev.lat, ev.lon, title, "#a83e2c", 0, 54, 10);
        return;
      }
      // side labels at a representative member (not for narrative modes,
      // where side and scene labels would duplicate the event name)
      if (!["founding", "craft", "city", "monument", "revolution"].includes(this.mode)) for (const side of this.sides) {
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
      if (this.craft && this.craft.label) chip(this.craft.lat, this.craft.lon, this.craft.label[this.lang === "zh" ? 0 : 1] + " · " + this.craft.date, "#a83e2c", 0, -48, 9.5);
      if (this.city && this.city.label) chip(this.city.lat, this.city.lon, this.city.label[this.lang === "zh" ? 0 : 1] + " · " + this.city.date, "#a83e2c", 0, -48, 9.5);
      if (this.monument && this.monument.label) chip(this.monument.lat, this.monument.lon, this.monument.label[this.lang === "zh" ? 0 : 1] + " · " + this.monument.date, "#a83e2c", 0, -56, 9.5);
      if (this.revolution && this.revolution.label) chip(this.revolution.lat, this.revolution.lon, this.revolution.label[this.lang === "zh" ? 0 : 1] + " · " + this.revolution.date, "#a83e2c", 0, -56, 9.5);
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
