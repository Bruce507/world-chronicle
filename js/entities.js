/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Historical entity labels
   Data-driven names for the polity / culture / modern state that
   actually held a place in the current year. No fallback to modern
   country names when the year is outside the entity's lifetime.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const BASE = "data/historical_entities.json";
  const V = "?v=20261108p";

  // A curated polity suppresses the rough snapshot labels that name the same
  // ground under an older or generic name (清 / 中国 / 中国军阀 while the
  // Republic of China is the charted polity, "Japan (USA)" while the Empire
  // of Japan is, Annam/Tonkin while French Indochina is).
  const CURATED_ALIASES = {
    "curated-china-roc": ["china", "manchu empire", "chinese warlords", "qing", "republic of china", "中国", "清", "中国军阀", "中华民国"],
    "curated-japan-empire": ["empire of japan", "imperial japan", "japan", "japan (usa)", "dai nippon teikoku", "大日本帝国", "日本", "日本帝国"],
    "curated-french-indochina": ["french indochina", "french indo-china", "annam", "tonkin", "cochinchina", "cochin china", "安南", "东京", "交趾支那"],
    "curated-british-raj": ["british raj", "british india", "india (uk)", "英属印度", "英国"],
    "curated-dutch-east-indies": ["dutch east indies", "netherlands east indies", "netherlands indies", "荷属东印度"],
    "curated-british-malaya": ["british malaya", "malaya", "英属马来亚"],
    "curated-australia-federation": ["australia", "澳大利亚"],
    "curated-new-spain": ["spain", "新西班牙", "西班牙"],
    "curated-spanish-peru": ["spain", "秘鲁", "西班牙"],
    "curated-colonial-brazil": ["portugal", "brazil", "葡属巴西", "葡萄牙", "巴西"],
    "curated-new-france": ["france", "新法兰西", "法国"],
    "curated-china-qing": ["china", "manchu empire", "qing", "中国", "清", "大清"],
    "curated-china-prc": ["china", "people's republic of china", "中华人民共和国", "中国"],
    "curated-france": ["france", "french republic", "french empire", "kingdom of france", "法国", "法兰西"],
    "curated-germany": ["germany", "german empire", "weimar republic", "nazi germany", "third reich", "german reich", "德国", "德意志帝国", "魏玛共和国"],
  };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const normName = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const lonDelta = (a, b) => ((a - b + 540) % 360) - 180;

  const E = (window.HistoricalEntities = {
    ready: false,
    loading: false,
    list: [],
    clamps: {},
    map: null,

    init(map) {
      this.map = map;
      if (this.loading || this.ready) return;
      this.loading = true;
      fetch(BASE + V)
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then((d) => {
          const clampTable = d.clamps || {};
          const clampById = d.clampsById || {};
          this.clamps = clampTable;
          this.list = (d.entities || [])
            .filter((e) => e && e.from <= e.to)
            .map((e) => {
              if (e.source === "curated" || e.type === "modern" || e.type === "province") return e;
              const c = Object.assign({}, clampTable[(e.name && e.name.en) || ""], clampById[e.id] || {});
              if (!c) return e;
              const out = { ...e, name: { ...(e.name || {}) } };
              if (typeof c.from === "number") out.from = Math.max(out.from, c.from);
              if (typeof c.to === "number") out.to = Math.min(out.to, c.to);
              if (out.from > out.to) out.from = out.to;
              if (c.zh) out.name.zh = c.zh;
              if (c.en) out.name.en = c.en;
              if (typeof c.lat === "number") out.lat = c.lat;
              if (typeof c.lon === "number") out.lon = c.lon;
              return out;
            });
          this.ready = true;
          this.loading = false;
          this.fadeStart = (this.map && this.map.reduceMotion) ? 0 : performance.now();
          if (this.map) this.map.drawBase();
          if (this.fadeStart) {
            let n = 0;
            const tick = () => {
              if (this.map) this.map.drawBase();
              if (++n < 8) setTimeout(tick, 70);
            };
            setTimeout(tick, 0);
          }
          window.dispatchEvent(new CustomEvent("historicalentitieschange"));
        })
        .catch((err) => {
          this.loading = false;
          console.warn("Historical entities unavailable:", err.message);
        });
    },

    labelOf(e, lang) {
      if (!e.name) return "";
      if (lang === "zh") return e.name.zh || "";
      if (lang !== "en" && e.type === "modern" && e.code && this.map) {
        if (!this._byCode) {
          this._byCode = {};
          for (const f of this.map.features || []) {
            if (f.properties.iso3) this._byCode[f.properties.iso3] = f;
            if (f.properties.iso2) this._byCode[f.properties.iso2] = f;
          }
        }
        const f = this._byCode[e.code];
        const n = f && f.properties && f.properties[lang];
        if (n) return n;
      }
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

      const labelScore = (e) => (e.priority || 50) + Math.min(28, Math.sqrt(Math.max(0, e.area || 0)) * 0.55);
      active.sort((a, b) => labelScore(b) - labelScore(a));
      const curated = active.filter((e) => e.source === "curated" && (e.priority || 0) >= 88);
      const curatedAll = active.filter((e) => e.source === "curated");
      const moderns = active.filter((e) => e.type === "modern");
      const aliasBlocks = curatedAll
        .map((c) => ({ c, set: new Set((CURATED_ALIASES[c.id] || []).map(normName)) }))
        .filter((x) => x.set.size);
      const seenNames = new Set();
      const chosen = [];
      for (const e of active) {
        const name = this.labelOf(e, this.map ? this.map.lang : "zh");
        if (!name) continue;
        const norm = normName(name);
        if (seenNames.has(norm) && e.source !== "curated") continue;
        // A curated high-priority state suppresses the rough snapshot labels
        // of the same polity/region (e.g. 日本帝国 vs Japan / Japan (USA)).
        if (e.source !== "curated") {
          let shadowed = false;
          for (const c of curated) {
            if (c === e) continue;
            const d = Math.hypot((e.lat - c.lat) * 0.9, lonDelta(e.lon, c.lon));
            if (d < 7 && (c.type === "empire" || c.type === "state") && (e.type === "state" || e.type === "culture")) { shadowed = true; break; }
          }
          if (!shadowed) {
            const en = normName(e.name.en);
            const zh = String(e.name.zh || "").trim();
            for (const blk of aliasBlocks) {
              if (!blk.set.has(en) && !blk.set.has(zh)) continue;
              const d = Math.hypot((e.lat - blk.c.lat) * 0.9, lonDelta(e.lon, blk.c.lon));
              if (d < 30) { shadowed = true; break; }
            }
          }
          if (!shadowed && e.type !== "modern") {
            const a = String(e.name.en || "").toLowerCase();
            for (const m of moderns) {
              const b = String(m.name.en || "").toLowerCase();
              if (!a || !b) continue;
              if (!(a === b || a.startsWith(b + " ") || b.startsWith(a + " "))) continue;
              if (Math.hypot((e.lat - m.lat) * 0.9, lonDelta(e.lon, m.lon)) < 6) { shadowed = true; break; }
            }
          }
          if (shadowed) continue;
        }
        const edge = map.W < 620 ? 14 : 20;
        const p = map.project(e.lon, e.lat);
        if (p.x < edge || p.x > map.W - edge || p.y < edge || p.y > map.H - edge) continue;
        // Avoid labels hidden under the side panel / theatre card.
        if (p.x > map.W - map.reservedRight - 8 && map.reservedRight > 40) continue;
        seenNames.add(norm);
        chosen.push({ e, name, x: p.x, y: p.y });
      }

      const rects = [];
      const nodeRects = [];
      // Keep map labels clear of the event medallions, which are drawn on the
      // layer above and would otherwise bite a hole out of "中华民国" in 1937.
      if (map.toggles && map.toggles.events && map.hotEvents && map.visibleEvents) {
        for (const ev of map.hotEvents(map.visibleEvents())) {
          const q = map.project(ev.lon, ev.lat);
          nodeRects.push([q.x - 9, q.y - 9, q.x + 9, q.y + 12]);
        }
      }
      const limit = narrow
        ? (zoom < 1.4 ? 22 : zoom < 2.2 ? 32 : 44)
        : (zoom < 1.4 ? 46 : zoom < 2.2 ? 58 : 78);
      const offsets = narrow ? [0, -12, 12, -24, 24, -36, 36] : [0, -14, 14, -28, 28, -42, 42];
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const c of chosen) {
        if (rects.length >= limit) break;
        const pr = c.e.priority || 50;
        const modern = c.e.type === "modern";
        let size = modern ? 11.6 : c.e.type === "culture" ? 10.8 : 12.2;
        size = (size + (zoom - 1) * 0.9) * (narrow ? 0.93 : 1);
        size = Math.max(narrow ? 10.5 : 11, Math.min(15, size));
        const font = modern
          ? "500 " + size.toFixed(1) + "px 'PingFang SC','Noto Sans SC',sans-serif"
          : (c.e.type === "culture" ? "italic 400 " : "500 ") + size.toFixed(1) + "px " + (this.map && this.map.lang === "zh" ? "'Songti SC','Noto Serif SC',serif" : "Georgia,serif");
        ctx.font = font;
        const w = ctx.measureText(c.name).width;
        if (w > map.W * 0.46) continue;
        // Low-priority snapshot labels need more room at world zoom.
        if (zoom < 1.7 && pr < 60 && w > map.W * 0.14) continue;
        const h = size + 4;
        let drawY = null, placed = null;
        // Nudge dense labels up/down before dropping them; this keeps Europe
        // and East Asia from overprinting without shrinking the type.
        for (const dy of offsets) {
          const y = c.y + dy;
          if (y < 14 || y > map.H - 14) continue;
          const r = [c.x - w / 2 - 4, y - h / 2 - 2, c.x + w / 2 + 4, y + h / 2 + 2];
          let hit = false;
          for (const q of nodeRects) {
            if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { hit = true; break; }
          }
          if (!hit) for (const q of rects) {
            if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { hit = true; break; }
          }
          if (!hit) { placed = r; drawY = y; break; }
        }
        if (!placed) continue;
        rects.push(placed);
        c.drawY = drawY;
        const wgt = ((window.MapTheatre && window.MapTheatre.labelWeight) ? window.MapTheatre.labelWeight(c.x, c.drawY) : 1) *
          (this.fadeStart ? clamp((performance.now() - this.fadeStart) / 450, 0, 1) : 1);
        c.weight = wgt;
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = "rgba(250,246,238," + (0.92 * wgt) + ")";
        ctx.strokeText(c.name, c.x, c.drawY);
        ctx.fillStyle = modern ? "rgba(54,45,34," + (0.74 * wgt) + ")" : c.e.type === "culture" ? "rgba(88,72,54," + (0.7 * wgt) + ")" : "rgba(48,40,31," + (0.86 * wgt) + ")";
        ctx.fillText(c.name, c.x, c.drawY);
      }
      ctx.restore();
      this.lastLabels = chosen.filter((c) => c.drawY != null).map((c) => [c.name, Math.round(c.x), Math.round(c.drawY)]);
      this.lastSkipped = chosen.filter((c) => c.drawY == null).map((c) => c.name);
      return rects.length > 0;
    },
  });
})();
