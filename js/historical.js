/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Historical borders layer
   Simplified snapshots from aourednik/historical-basemaps (GPL-3.0).
   Polygons are schematic, loaded lazily and cached.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const BASE = "data/historical/";
  const V = "?v=20261106w";
  const H = (window.HistoricalBorders = {
    enabled: true,
    manifest: null,
    cache: {},
    loading: {},
    current: null,
    currentSnapshot: null,
    map: null,
    lang: "zh",

    init(map) {
      this.map = map;
      fetch(BASE + "manifest.json" + V)
        .then((r) => { if (!r.ok) throw new Error("manifest " + r.status); return r.json(); })
        .then((m) => {
          this.manifest = (m.snapshots || []).filter((s) => s.year <= 1994);
          this.onYear(map.year);
        })
        .catch((err) => {
          console.warn("Historical borders unavailable:", err.message);
          this.manifest = [];
        });
    },

    setLang(lang) { this.lang = lang; if (this.map) this.map.drawBase(); window.dispatchEvent(new CustomEvent("historicalchange")); },
    setEnabled(on) {
      this.enabled = !!on;
      if (this.map) this.map.drawBase();
      window.dispatchEvent(new CustomEvent("historicalchange"));
    },

    nearest(year) {
      if (!this.manifest || !this.manifest.length) return null;
      if (year < -3000 || year > 1995) return null;
      // Nearest snapshot for the schematic base polygons. Historical labels
      // come from the entity layer, which suppresses future polities, so the
      // polygon base can use the closest visual match without leaking names.
      let best = null, bd = Infinity;
      for (const s of this.manifest) {
        const d = Math.abs(s.year - year);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    },

    onYear(year) {
      if (!this.manifest) return;
      const s = this.nearest(year);
      if (!s) {
        if (this.current) { this.current = null; this.currentSnapshot = null; if (this.map) this.map.drawBase(); window.dispatchEvent(new CustomEvent("historicalchange")); }
        return;
      }
      if (this.currentSnapshot === s.year) return;
      if (this.cache[s.year]) { this._set(this.cache[s.year]); return; }
      if (this.loading[s.year]) return;
      this.loading[s.year] = true;
      fetch(BASE + s.file + V)
        .then((r) => { if (!r.ok) throw new Error("snapshot " + r.status); return r.json(); })
        .then((fc) => {
          this.cache[s.year] = fc;
          this.loading[s.year] = false;
          const want = this.nearest(this.map ? this.map.year : year);
          if (want && want.year === s.year) this._set(fc);
        })
        .catch((err) => { this.loading[s.year] = false; console.warn("Historical snapshot failed:", err.message); });
    },

    _set(fc) {
      this.current = fc;
      this.currentSnapshot = fc.year;
      if (this.map) this.map.drawBase();
      window.dispatchEvent(new CustomEvent("historicalchange"));
    },

    label() {
      if (!this.current) return "";
      const y = this.current.year;
      const lang = this.lang;
      if (lang === "zh") return (y < 0 ? "前" + (-y) : String(y)) + " 年疆域";
      return String(y < 0 ? -y + " BCE" : y + " CE") + " borders";
    },

    draw(ctx, map) {
      if (!this.enabled || !this.current) return false;
      const fc = this.current;
      if (!fc || !fc.features) return false;
      const zoom = map.view.zoom;
      ctx.save();
      ctx.lineJoin = "round";
      // Fills first. Same subject color makes adjacent territories read as one polity.
      for (const f of fc.features) {
        const p = f.properties || {};
        const col = p.color || "#9a7a55";
        this._trace(ctx, map, f.geometry);
        ctx.fillStyle = hexA(col, 0.40);
        ctx.fill("evenodd");
      }
      // A hairline border, tinted to the polity color so internal seams stay quiet.
      for (const f of fc.features) {
        const p = f.properties || {};
        const col = p.color || "#9a7a55";
        this._trace(ctx, map, f.geometry);
        ctx.strokeStyle = hexA(col, 0.55);
        ctx.lineWidth = zoom > 2 ? 0.8 : 0.55;
        ctx.stroke();
      }
      // Labels, decluttered, largest first. Suppressed while a map theatre plays.
      const theatre = window.MapTheatre && window.MapTheatre.active;
      const useEntities = window.HistoricalEntities && window.HistoricalEntities.ready;
      const all = (fc.labels || []).slice().sort((a, b) => b.area - a.area);
      const states = all.filter((l) => l.kind !== "culture").slice(0, 16);
      const cultures = all.filter((l) => l.kind === "culture").slice(0, fc.year < -1000 ? 8 : 3);
      const labels = states.concat(cultures);
      const placed = [];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (!theatre && !useEntities) for (const lb of labels) {
        const pos = map.project(lb.lon, lb.lat);
        if (pos.x < 30 || pos.x > map.W - 30 || pos.y < 24 || pos.y > map.H - 24) continue;
        const name = this.lang === "zh" && lb.zh ? lb.zh : lb.name;
        const culture = lb.kind === "culture";
        const size = (culture ? clamp(9.5 + Math.sqrt(lb.area) * 0.12, 9.5, 12) : clamp(11 + Math.sqrt(lb.area) * 0.2, 11, 15)) * (map.W < 600 ? 0.85 : 1);
        ctx.font = (culture ? "italic 400 " : "500 ") + size.toFixed(1) + "px " + (this.lang === "zh" ? "'Songti SC','Noto Serif SC',serif" : "Georgia,serif");
        const w = ctx.measureText(name).width;
        if (w > map.W * 0.5) continue;
        const r = [pos.x - w / 2 - 5, pos.y - size / 2 - 3, pos.x + w / 2 + 5, pos.y + size / 2 + 3];
        let hit = false;
        for (const q of placed) if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { hit = true; break; }
        if (hit) continue;
        placed.push(r);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = "rgba(247,241,229,0.86)";
        ctx.strokeText(name, pos.x, pos.y);
        ctx.fillStyle = culture ? "rgba(78,66,50,0.62)" : "rgba(52,40,27,0.92)";
        ctx.fillText(name, pos.x, pos.y);
      }
      ctx.restore();
      return true;
    },

    _trace(ctx, map, geom) {
      const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
      ctx.beginPath();
      for (const poly of polys) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length; i++) {
            const p = map.project(ring[i][0], ring[i][1]);
            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
        }
      }
    },
  });

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
})();
