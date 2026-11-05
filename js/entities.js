/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Historical entity labels
   Data-driven names for the polity / culture / modern state that
   actually held a place in the current year. No fallback to modern
   country names when the year is outside the entity's lifetime.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const BASE = "data/historical_entities.json";
  const V = "?v=20261106w";

  const E = (window.HistoricalEntities = {
    ready: false,
    loading: false,
    list: [],
    map: null,

    init(map) {
      this.map = map;
      if (this.loading || this.ready) return;
      this.loading = true;
      fetch(BASE + V)
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then((d) => {
          this.list = (d.entities || []).filter((e) => e && e.from <= e.to);
          this.ready = true;
          this.loading = false;
          if (this.map) this.map.drawBase();
        })
        .catch((err) => {
          this.loading = false;
          console.warn("Historical entities unavailable:", err.message);
        });
    },

    labelOf(e, lang) {
      if (!e.name) return "";
      if (lang === "zh") return e.name.zh || "";
      return e.name.en || e.name.zh || "";
    },

    draw(ctx, map) {
      if (!this.ready || !this.list.length) return false;
      const year = map.year;
      const zoom = map.view.zoom;
      const modernOnly = year >= 1995;
      const narrow = map.W < 620;

      const active = [];
      for (const e of this.list) {
        if (year < e.from || year > e.to) continue;
        if (modernOnly && e.type !== "modern" && e.type !== "province") continue;
        const minZ = e.source === "curated" && (e.priority || 0) >= 75 ? 1 : (e.minZoom || 1);
        if (zoom + 0.001 < minZ) continue;
        active.push(e);
      }
      if (!active.length) return false;

      active.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      const curated = active.filter((e) => e.source === "curated" && (e.priority || 0) >= 88);
      const moderns = active.filter((e) => e.type === "modern");
      const seenNames = new Set();
      const chosen = [];
      for (const e of active) {
        const name = this.labelOf(e, this.map ? this.map.lang : "zh");
        if (!name) continue;
        const norm = name.toLowerCase().replace(/\s+/g, " ");
        if (seenNames.has(norm) && e.source !== "curated") continue;
        // A curated high-priority state suppresses the rough snapshot label
        // of the same polity/region (e.g. 日本帝国 vs Japan / Japan (USA)).
        if (e.source !== "curated") {
          let shadowed = false;
          for (const c of curated) {
            if (c === e) continue;
            const d = Math.hypot((e.lat - c.lat) * 0.9, e.lon - c.lon);
            if (d < 7 && (c.type === "empire" || c.type === "state") && (e.type === "state" || e.type === "culture")) { shadowed = true; break; }
          }
          if (!shadowed && e.type !== "modern") {
            const a = String(e.name.en || "").toLowerCase();
            for (const m of moderns) {
              const b = String(m.name.en || "").toLowerCase();
              if (!a || !b) continue;
              if (!(a === b || a.startsWith(b + " ") || b.startsWith(a + " "))) continue;
              if (Math.hypot((e.lat - m.lat) * 0.9, e.lon - m.lon) < 6) { shadowed = true; break; }
            }
          }
          if (shadowed) continue;
        }
        const p = map.project(e.lon, e.lat);
        if (p.x < 8 || p.x > map.W - 8 || p.y < 8 || p.y > map.H - 8) continue;
        // Avoid labels hidden under the side panel / theatre card.
        if (p.x > map.W - map.reservedRight - 8 && map.reservedRight > 40) continue;
        seenNames.add(norm);
        chosen.push({ e, name, x: p.x, y: p.y });
      }

      const rects = [];
      const limit = zoom < 1.4 ? 46 : zoom < 2.2 ? 58 : 78;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const c of chosen) {
        if (rects.length >= limit) break;
        const pr = c.e.priority || 50;
        const modern = c.e.type === "modern";
        let size = modern ? 11.2 : c.e.type === "culture" ? 10.2 : 11.8;
        size = (size + (zoom - 1) * 0.9) * (narrow ? 0.84 : 1);
        size = Math.max(8.6, Math.min(15, size));
        const font = modern
          ? "500 " + size.toFixed(1) + "px 'PingFang SC','Noto Sans SC',sans-serif"
          : (c.e.type === "culture" ? "italic 400 " : "500 ") + size.toFixed(1) + "px " + (this.map && this.map.lang === "zh" ? "'Songti SC','Noto Serif SC',serif" : "Georgia,serif");
        ctx.font = font;
        const w = ctx.measureText(c.name).width;
        if (w > map.W * 0.46) continue;
        const h = size + 4;
        const r = [c.x - w / 2 - 4, c.y - h / 2 - 2, c.x + w / 2 + 4, c.y + h / 2 + 2];
        let hit = false;
        for (const q of rects) {
          if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { hit = true; break; }
        }
        if (hit) continue;
        // Low-priority snapshot labels need more room at world zoom.
        if (zoom < 1.7 && pr < 60 && w > map.W * 0.14) continue;
        rects.push(r);
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = "rgba(250,246,238,0.92)";
        ctx.strokeText(c.name, c.x, c.y);
        ctx.fillStyle = modern ? "rgba(54,45,34,0.74)" : c.e.type === "culture" ? "rgba(88,72,54,0.7)" : "rgba(48,40,31,0.86)";
        ctx.fillText(c.name, c.x, c.y);
      }
      ctx.restore();
      return rects.length > 0;
    },
  });
})();
