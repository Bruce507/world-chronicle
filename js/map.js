/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Cartographic engine
   Robinson projection · parchment atlas · picking · halos · pins
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const A = window.WORLD_ATLAS;

  // Robinson projection tables (5° intervals, 0–90°)
  const XT = [1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
  const YT = [0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1];
  const KX = 0.8487, KY = 1.3523;
  const WORLD_W = KX * Math.PI * 2;
  const WORLD_H = KY * 2;

  function lerpTable(t, a) {
    const i = Math.min(17, Math.floor(a / 5));
    const f = (a - i * 5) / 5;
    return t[i] + (t[i + 1] - t[i]) * f;
  }
  function robX(lon, lat) {
    return KX * (lon * Math.PI) / 180 * lerpTable(XT, Math.abs(Math.max(-90, Math.min(90, lat))));
  }
  function robY(lat) {
    const s = lat < 0 ? -1 : 1;
    return KY * lerpTable(YT, Math.abs(Math.max(-90, Math.min(90, lat)))) * s;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }
  function fmtYearShort(y) {
    if (y < 0) return "前" + (-y);
    return String(y);
  }

  const SHAPE_BY_CAT = {
    war: "diamond", politics: "square", trade: "circle", exploration: "circle",
    culture: "square", religion: "square", science: "square",
    disaster: "triangle", plague: "triangle",
    city: "hex", agri: "hex", industry: "hex", hunt: "hex", digital: "hex",
  };
  function shapeFor(k) { return SHAPE_BY_CAT[k] || "circle"; }
  function shapePath(ctx, x, y, r, shape) {
    if (shape === "square") {
      const a = r * 0.82;
      ctx.rect(x - a, y - a, a * 2, a * 2);
    } else if (shape === "triangle") {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.96, y + r * 0.78);
      ctx.lineTo(x - r * 0.96, y + r * 0.78);
      ctx.closePath();
    } else if (shape === "hex") {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === "diamond") {
      const d = r + 0.8;
      ctx.moveTo(x, y - d);
      ctx.lineTo(x + d, y);
      ctx.lineTo(x, y + d);
      ctx.lineTo(x - d, y);
      ctx.closePath();
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }

  const CONTINENT_FILL = {
    Africa: "#e9d6b4",
    Asia: "#efe1c4",
    Europe: "#ebdfc7",
    "North America": "#e8d9bb",
    "South America": "#ead9b9",
    Oceania: "#e9ddc4",
    Antarctica: "#f0e9da",
    "Seven seas (open ocean)": "#e9ddc4",
  };

  class AtlasMap {
    constructor(canvas, fxCanvas, opts) {
      this.canvas = canvas;
      this.fxCanvas = fxCanvas;
      this.c = canvas.getContext("2d");
      this.fx = fxCanvas.getContext("2d");
      this.opts = opts || {};
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.view = { zoom: 1, panX: 0, panY: 0 };
      this.year = -3000;
      this.lang = "zh";
      this.selected = null;
      this.hovered = null;
      this.highlight = null;
      this.toggles = { events: true, polities: true, links: true, labels: false, historicalLabels: true, allEvents: false };
      this.dragging = false;
      this.moved = false;
      this.pointers = new Map();
      this.paused = false;
      this.theatreActive = false;
      this.fly = null;
      this.labels = [];
      this.W = 1; this.H = 1;
      this.originX = 0; this.originY = 0;
      this.baseScale = 1;
      this.reservedRight = 370;
      this.viewOffsetY = 0;
      this.fitMode = "world";
      try { if (localStorage.getItem("world-atlas-fit") === "fill") this.fitMode = "fill"; } catch (err) { /* file:// */ }
      this.focus = { lat: 25, lon: 80 };
      this.coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
      this.catFilter = null;
      this.reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      this._a11ySig = "";
      this._a11yButtons = [];
      this._a11yAt = 0;
      this.mini = null;
      this._miniWorld = null;
      this._miniAt = 0;

      this._initEvents();
      this._bindEvents();
      this.resize();
      this._loop = this._loop.bind(this);
      this.fxRaf = requestAnimationFrame(this._loop);
    }

    /* ── data / geometry ─────────────────────────────── */
    setWorld(geojson) {
      this.geo = geojson;
      this.features = [];
      geojson.features.forEach((f, idx) => {
        const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
        const rings = [];
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let rawMinX = Infinity, rawMaxX = -Infinity, rawMinY = Infinity, rawMaxY = -Infinity;
        for (const poly of polys) {
          for (const ring of poly) {
            const pts = new Float32Array(ring.length * 2);
            for (let i = 0; i < ring.length; i++) {
              const lon = ring[i][0], lat = ring[i][1];
              if (lon < rawMinX) rawMinX = lon; if (lon > rawMaxX) rawMaxX = lon;
              if (lat < rawMinY) rawMinY = lat; if (lat > rawMaxY) rawMaxY = lat;
              const x = robX(lon, lat), y = robY(lat);
              pts[i * 2] = x; pts[i * 2 + 1] = y;
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
            rings.push(pts);
          }
        }
        const p = f.properties;
        const seed = hash(p.n || String(idx));
        const base = CONTINENT_FILL[p.cont] || "#e5dcc9";
        // subtle per-country variation
        const shade = Math.round((seed - 0.5) * 10);
        f._rings = rings;
        f._bbox = [minX, minY, maxX, maxY];
        f._rawBBox = [rawMinX, rawMinY, rawMaxX, rawMaxY];
        f._area = (maxX - minX) * (maxY - minY);
        f._color = shade > 0 ? base : base;
        f._shade = shade;
        f._idx = idx;
        this.features.push(f);
      });
      this._pickCanvas = document.createElement("canvas");
      this._pickCtx = this._pickCanvas.getContext("2d", { willReadFrequently: true });
      this.resize();
    }

    setPolities(list) { this.polities = list; }

    setYear(y) {
      this.year = clamp(Math.round(y), -12000, 2026);
      if (window.HistoricalBorders) window.HistoricalBorders.onYear(this.year);
    }
    setLang(l) { this.lang = l; this.drawBase(); }
    setSelected(ev) { this.selected = ev; }
    setHighlight(feature) { this.highlight = feature; }
    setToggles(t) {
      this.toggles = t;
      if (window.HistoricalBorders && typeof t.historical === "boolean") window.HistoricalBorders.setEnabled(t.historical);
      if (!t.labels) { this._labels = []; }
      this.drawBase();
    }
    setPaused(p) { this.paused = p; }
    setTheatreActive(on) { this.theatreActive = !!on; }

    _initEvents() {
      this.events = A.events.slice().sort((a, b) => a.y - b.y);
      this.events.forEach((e, i) => {
        e.id = e.id || "e" + i;
        e.seed = hash(e.id);
      });
    }

    /* ── sizing / projection ─────────────────────────── */
    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.W = Math.max(1, rect.width);
      this.H = Math.max(1, rect.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      [this.canvas, this.fxCanvas].forEach((cv) => {
        cv.width = Math.round(this.W * this.dpr);
        cv.height = Math.round(this.H * this.dpr);
        cv.style.width = this.W + "px";
        cv.style.height = this.H + "px";
      });
      this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.fx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._miniWorld = null;
      if (this._pickCanvas) {
        this._pickCanvas.width = Math.round(this.W);
        this._pickCanvas.height = Math.round(this.H);
      }
      this._computeFit();
      this.drawBase();
    }

    _computeFit() {
      const panel = document.getElementById("side-panel");
      const wide = window.innerWidth > 860;
      const panelOpen = panel && !panel.classList.contains("collapsed");
      this.reservedRight = wide && panelOpen ? Math.min(this.W * 0.44, (panel.getBoundingClientRect().width || 320) + 34) : 18;
      const padL = wide ? 26 : 12, padT = 14, padB = 16;
      const availW = Math.max(100, this.W - padL - this.reservedRight);
      const availH = Math.max(100, this.H - padT - padB);
      this.originX = padL + availW / 2;
      this.originY = padT + availH / 2;
      this.baseScale = Math.min(availW / WORLD_W, availH / WORLD_H) * 0.96 * (this.W < 620 ? 1.08 : 1);
    }

    /* Portrait "fill" zoom: fit the inhabited land band (72N–50S) to the
       stage height. It is expressed as a normal zoom level, so pinching out
       still returns to the full-world view and node flyTo values stay sane. */
    _fillZoom() {
      const padT = 14, padB = 16;
      const availH = Math.max(100, this.H - padT - padB);
      const landH = Math.max(0.8, robY(72) - robY(-50));
      return clamp((availH * 0.98) / (landH * this.baseScale), 1, 9);
    }

    fit(resetView) {
      this._computeFit();
      if (resetView !== false) {
        if (this.fitMode === "fill") {
          this.view.zoom = this._fillZoom();
          const c = this.focus || { lat: 25, lon: 80 };
          const s = this.scale();
          this.view.panX = -robX(c.lon, c.lat) * s;
          this.view.panY = robY(c.lat) * s - this.viewOffsetY;
        } else {
          this.view = { zoom: 1, panX: 0, panY: -this.viewOffsetY };
        }
      }
      this.clampPan();
      this.drawBase();
    }

    setFitMode(mode) {
      this.fitMode = mode === "fill" ? "fill" : "world";
      try { localStorage.setItem("world-atlas-fit", this.fitMode); } catch (err) { /* file:// */ }
      this.fit(true);
      return this.fitMode;
    }

    toggleFitMode() {
      return this.setFitMode(this.fitMode === "fill" ? "world" : "fill");
    }

    /* Shift the map's optical centre up when a mobile bottom sheet covers the
       lower part of the stage, so a focused node stays visible above it. */
    setViewOffset(y) {
      y = Math.max(0, Math.round(y || 0));
      const d = y - this.viewOffsetY;
      this.viewOffsetY = y;
      this.view.panY -= d;
      this.clampPan();
      this.drawBase();
    }

    /* Fit a [west, south, east, north] box inside the usable map area. */
    fitBounds(bbox, dur) {
      if (!bbox || bbox.length !== 4) return;
      let [west, south, east, north] = bbox.map(Number);
      if (![west, south, east, north].every(Number.isFinite)) return;
      if (east < west) east += 360;
      const midLat = (south + north) / 2;
      const midLon = (west + east) / 2;
      const x1 = robX(west, midLat), x2 = robX(east, midLat);
      const yN = robY(north), yS = robY(south);
      const pw = Math.max(0.2, Math.abs(x2 - x1));
      const ph = Math.max(0.2, Math.abs(yS - yN));
      const pad = 34;
      const availW = Math.max(120, this.W - this.reservedRight - pad * 2);
      const availH = Math.max(120, this.H - pad * 2);
      const z = clamp(Math.min(availW / (pw * this.baseScale), availH / (ph * this.baseScale)), 1, 9);
      let lon = midLon;
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      this.flyTo(midLat, lon, z, dur || 900);
    }

    scale() { return this.baseScale * this.view.zoom; }

    /* ── minimap: world silhouette + current viewport (mobile fill mode) ── */
    setMinimap(cv) {
      if (!cv) return;
      this.mini = cv;
      this.miniCtx = cv.getContext("2d");
      cv.addEventListener("click", (e) => {
        const r = cv.getBoundingClientRect();
        const px = (e.clientX - r.left) / Math.max(1, r.width);
        const py = (e.clientY - r.top) / Math.max(1, r.height);
        const wx = (px - 0.5) * WORLD_W;
        const wy = (0.5 - py) * WORLD_H;
        const ll = this.unprojectWorld(wx, wy);
        if (ll) this.flyTo(ll.lat, ll.lon, Math.max(1.6, this.view.zoom), 520);
      });
    }

    unprojectWorld(x, y) {
      let lo = -90, hi = 90;
      for (let i = 0; i < 26; i++) {
        const mid = (lo + hi) / 2;
        if (robY(mid) < y) lo = mid; else hi = mid;
      }
      const lat = (lo + hi) / 2;
      const factor = lerpTable(XT, Math.abs(lat));
      let lon = x / (KX * factor) * 180 / Math.PI;
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      return { lat, lon };
    }

    _buildMiniWorld(w, h) {
      const cv = document.createElement("canvas");
      cv.width = Math.round(w * 2);
      cv.height = Math.round(h * 2);
      const c = cv.getContext("2d");
      c.scale(2, 2);
      c.fillStyle = "rgba(178,201,197,0.95)";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(226,213,186,0.98)";
      c.strokeStyle = "rgba(120,98,70,0.35)";
      c.lineWidth = 0.35;
      for (const f of this.features) {
        c.beginPath();
        for (const ring of f._rings) {
          for (let i = 0; i < ring.length; i += 2) {
            const x = (ring[i] / WORLD_W + 0.5) * w;
            const y = (0.5 - ring[i + 1] / WORLD_H) * h;
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
          }
          c.closePath();
        }
        c.fill();
        c.stroke();
      }
      this._miniWorld = cv;
    }

    _drawMinimap() {
      const cv = this.mini, ctx = this.miniCtx;
      if (!cv || !ctx) return;
      const w = Math.max(1, cv.clientWidth || cv.width);
      const h = Math.max(1, cv.clientHeight || cv.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        this._miniWorld = null;
      }
      if (!this._miniWorld) this._buildMiniWorld(w, h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, 0, w, h, 3); else ctx.rect(0, 0, w, h);
      ctx.clip();
      ctx.drawImage(this._miniWorld, 0, 0, w, h);
      // current viewport
      const s = this.scale();
      const x0 = (-this.originX - this.view.panX) / s;
      const x1 = (this.W - this.originX - this.view.panX) / s;
      const y0 = (this.originY + this.view.panY) / s;
      const y1 = (this.originY + this.view.panY - this.H) / s;
      const px = (v) => (v / WORLD_W + 0.5) * w;
      const py = (v) => (0.5 - v / WORLD_H) * h;
      let rx = px(x0), ry = py(y0), rw = px(x1) - rx, rh = py(y1) - ry;
      rx = Math.max(-2, Math.min(w + 2, rx));
      ry = Math.max(-2, Math.min(h + 2, ry));
      rw = Math.max(3, Math.min(w + 4 - rx, rw));
      rh = Math.max(3, Math.min(h + 4 - ry, rh));
      ctx.fillStyle = "rgba(250,246,238,0.10)";
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = "rgba(176,67,44,0.9)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(rx + 0.5, ry + 0.5, Math.max(1, rw - 1), Math.max(1, rh - 1));
      ctx.restore();
      // north mark
      ctx.fillStyle = "rgba(74,54,36,0.72)";
      ctx.font = "600 7px Georgia,serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("N", w - 4, 3);
    }
    project(lon, lat) {
      const s = this.scale();
      return { x: this.originX + robX(lon, lat) * s + this.view.panX, y: this.originY - robY(lat) * s + this.view.panY };
    }

    clampPan() {
      const s = this.scale();
      const w = WORLD_W * s, h = WORLD_H * s;
      // once zoomed in, allow a focus point near the map edge to reach the middle
      const extraX = this.view.zoom > 1.15 ? this.W * 0.44 : 0;
      const extraY = this.view.zoom > 1.15 ? this.H * 0.4 : 0;
      const mx = Math.max(0, (w - this.W) / 2 + 40 + extraX);
      const my = Math.max(0, (h - this.H) / 2 + 40 + extraY);
      this.view.panX = clamp(this.view.panX, -mx, mx);
      this.view.panY = clamp(this.view.panY, -my, my);
    }

    zoomAt(factor, sx, sy) {
      const z0 = this.view.zoom;
      const z1 = clamp(z0 * factor, 1, 9);
      if (z1 === z0) return;
      const s0 = this.baseScale * z0, s1 = this.baseScale * z1;
      this.view.panX = sx - this.originX - ((sx - this.originX - this.view.panX) / s0) * s1;
      this.view.panY = sy - this.originY - ((sy - this.originY - this.view.panY) / s0) * s1;
      this.view.zoom = z1;
      this.clampPan();
      this.drawBase();
    }

    flyTo(lat, lon, zoom, dur) {
      zoom = zoom || 2.3;
      this.focus = { lat: lat, lon: lon };
      dur = dur || 800;
      const s1 = this.baseScale * clamp(zoom, 1, 9);
      const target = {
        zoom: clamp(zoom, 1, 9),
        panX: -robX(lon, lat) * s1,
        panY: robY(lat) * s1 - this.viewOffsetY,
      };
      const start = { ...this.view };
      const t0 = performance.now();
      const self = this;
      if (this._flyRaf) cancelAnimationFrame(this._flyRaf);
      function step(now) {
        const p = clamp((now - t0) / dur, 0, 1);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        self.view.zoom = start.zoom + (target.zoom - start.zoom) * e;
        self.view.panX = start.panX + (target.panX - start.panX) * e;
        self.view.panY = start.panY + (target.panY - start.panY) * e;
        self._flying = true;
        self.drawBase();
        if (p < 1) self._flyRaf = requestAnimationFrame(step);
        else { self._flyRaf = null; self._flying = false; self.clampPan(); self.drawBase(); self._drawPicking(); }
      }
      this._flyRaf = requestAnimationFrame(step);
    }

    /* ── base drawing ────────────────────────────────── */
    drawBase() {
      if (!this.geo) return;
      const ctx = this.c, W = this.W, H = this.H;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);
      ctx.save();
      ctx.clearRect(0, 0, W, H);

      // Ocean
      const og = ctx.createLinearGradient(0, 0, 0, H);
      og.addColorStop(0, "#d5e2de");
      og.addColorStop(0.45, "#c9d9d5");
      og.addColorStop(1, "#bed1cd");
      ctx.fillStyle = og;
      ctx.fillRect(0, 0, W, H);
      // soft radial light
      const rg = ctx.createRadialGradient(W * 0.35, H * 0.2, 0, W * 0.35, H * 0.2, Math.max(W, H) * 0.9);
      rg.addColorStop(0, "rgba(255,252,243,0.38)");
      rg.addColorStop(1, "rgba(255,252,243,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      this._drawGraticule(ctx);
      this._drawOceanNames(ctx);

      // Land
      for (const f of this.features) {
        if (!this._inView(f)) continue;
        this._trace(ctx, f);
        ctx.fillStyle = this._landColor(f);
        ctx.fill("evenodd");
      }
      // Coast/borders
      ctx.lineJoin = "round";
      for (const f of this.features) {
        if (!this._inView(f)) continue;
        this._trace(ctx, f);
        ctx.strokeStyle = "rgba(88,72,54,0.56)";
        ctx.lineWidth = 0.72;
        ctx.stroke();
      }
      // Inner highlight on coast for lift
      ctx.strokeStyle = "rgba(255,252,245,0.28)";
      ctx.lineWidth = 0.45;
      for (const f of this.features) {
        if (!this._inView(f)) continue;
        this._trace(ctx, f);
        ctx.stroke();
      }

      if (window.HistoricalBorders) window.HistoricalBorders.draw(ctx, this);
      if (this.toggles.historicalLabels && window.HistoricalEntities) window.HistoricalEntities.draw(ctx, this);
      if (this.toggles.labels) this._drawCountryLabels(ctx);
      ctx.restore();
      this._drawMinimap();

      if (!this.dragging && !this._flying) { this._drawPicking(); this._syncA11y(); }
    }

    _syncA11y() {
      const host = document.getElementById("a11y-nodes");
      if (!host || !this.geo) return;
      const now = performance.now();
      if (this._a11yAt && now - this._a11yAt < 150) return;
      this._a11yAt = now;
      const list = this.hotEvents(this.visibleEvents()).slice(0, 10);
      const sig = list.map((e) => e.id).join("|");
      if (sig !== this._a11ySig) {
        this._a11ySig = sig;
        this._a11yButtons = [];
        host.innerHTML = "";
        for (const ev of list) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "a11y-node";
          b.dataset.ev = ev.id;
          b.addEventListener("click", () => { if (this.opts.onEventClick) this.opts.onEventClick(ev); });
          b.addEventListener("focus", () => {
            this.hovered = ev;
            if (this.opts.onHover) { const p = this.project(ev.lon, ev.lat); this.opts.onHover(ev, p.x, p.y); }
          });
          b.addEventListener("blur", () => {
            this.hovered = null;
            if (this.opts.onHover) this.opts.onHover(null);
          });
          host.appendChild(b);
          this._a11yButtons.push({ ev, b });
        }
      }
      for (const pair of this._a11yButtons) {
        const p = this.project(pair.ev.lon, pair.ev.lat);
        pair.b.style.left = p.x + "px";
        pair.b.style.top = p.y + "px";
        pair.b.style.display = (p.x < 0 || p.x > this.W || p.y < 0 || p.y > this.H) ? "none" : "block";
        const name = this.lang === "zh" ? pair.ev.t[0] : pair.ev.t[1];
        pair.b.setAttribute("aria-label", name + " · " + (pair.ev.y < 0 ? "前" + (-pair.ev.y) : pair.ev.y));
      }
    }

    _landColor(f) {
      const base = CONTINENT_FILL[f.properties.cont] || "#e5dcc9";
      if (!f._shade) return base;
      const n = parseInt(base.slice(1), 16);
      const d = f._shade;
      const r = clamp(((n >> 16) & 255) + d, 0, 255);
      const g = clamp(((n >> 8) & 255) + d, 0, 255);
      const b = clamp((n & 255) + d, 0, 255);
      return "rgb(" + r + "," + g + "," + b + ")";
    }

    _inView(f) {
      const s = this.scale();
      const x0 = this.originX + f._bbox[0] * s + this.view.panX;
      const x1 = this.originX + f._bbox[2] * s + this.view.panX;
      const y0 = this.originY - f._bbox[3] * s + this.view.panY;
      const y1 = this.originY - f._bbox[1] * s + this.view.panY;
      return x1 > -60 && x0 < this.W + 60 && y1 > -60 && y0 < this.H + 60;
    }

    _trace(ctx, f) {
      const s = this.scale(), ox = this.originX + this.view.panX, oy = this.originY + this.view.panY;
      ctx.beginPath();
      for (const ring of f._rings) {
        for (let i = 0; i < ring.length; i += 2) {
          const x = ox + ring[i] * s;
          const y = oy - ring[i + 1] * s;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
    }

    _ringPath(ctx, f) {
      this._trace(ctx, f);
    }

    _drawGraticule(ctx) {
      const W = this.W, H = this.H;
      ctx.save();
      ctx.lineWidth = 0.55;
      // meridians
      ctx.strokeStyle = "rgba(88,110,112,0.15)";
      let p = [];
      for (let lon = -180; lon <= 180; lon += 30) {
        ctx.beginPath();
        for (let lat = -85; lat <= 85; lat += 4) {
          const s = this.scale();
          const x = this.originX + robX(lon, lat) * s + this.view.panX;
          const y = this.originY - robY(lat) * s + this.view.panY;
          if (lat === -85) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lon = -180; lon <= 180; lon += 4) {
          const s = this.scale();
          const x = this.originX + robX(lon, lat) * s + this.view.panX;
          const y = this.originY - robY(lat) * s + this.view.panY;
          if (lon === -180) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lat === 0 ? "rgba(88,110,112,0.26)" : "rgba(88,110,112,0.13)";
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawOceanNames(ctx) {
      const names = [
        { zh: "太 平 洋", en: "PACIFIC OCEAN", es: "OCÉANO PACÍFICO", fr: "OCÉAN PACIFIQUE", ar: "المحيط الهادئ", lon: -152, lat: 2, size: 20 },
        { zh: "大 西 洋", en: "ATLANTIC OCEAN", es: "OCÉANO ATLÁNTICO", fr: "OCÉAN ATLANTIQUE", ar: "المحيط الأطلسي", lon: -32, lat: 26, size: 16 },
        { zh: "印 度 洋", en: "INDIAN OCEAN", es: "OCÉANO ÍNDICO", fr: "OCÉAN INDIEN", ar: "المحيط الهندي", lon: 78, lat: -26, size: 16 },
        { zh: "北 冰 洋", en: "ARCTIC OCEAN", es: "OCÉANO ÁRTICO", fr: "OCÉAN ARCTIQUE", ar: "المحيط المتجمد الشمالي", lon: 0, lat: 79, size: 12 },
        { zh: "南 大 洋", en: "SOUTHERN OCEAN", es: "OCÉANO AUSTRAL", fr: "OCÉAN AUSTRAL", ar: "المحيط الجنوبي", lon: -55, lat: -57, size: 13 },
      ];
      ctx.save();
      ctx.textAlign = "center";
      for (const n of names) {
        const p = this.project(n.lon, n.lat);
        if (p.x < -80 || p.x > this.W + 80 || p.y < -40 || p.y > this.H + 40) continue;
        const z = Math.min(1.5, this.view.zoom);
        ctx.font = "400 " + (n.size * z).toFixed(1) + "px " + (this.lang === "zh" ? "'STKaiti','Kaiti SC',serif" : "Georgia,serif");
        ctx.fillStyle = "rgba(52,88,92,0.26)";
        ctx.fillText(this.lang === "zh" ? n.zh : (n[this.lang] || n.en), p.x, p.y);
      }
      ctx.restore();
    }

    _drawCountryLabels(ctx) {
      const s = this.scale();
      const zoom = this.view.zoom;
      const hist = window.HistoricalBorders && window.HistoricalBorders.enabled && window.HistoricalBorders.current;
      if (hist && zoom < 2.2) return;
      const narrow = this.W < 600;
      const fs = clamp(9.6 + (zoom - 1) * 0.85, 9.6, 14) * (narrow ? 0.82 : 1);
      const cands = [];
      for (const f of this.features) {
        const p = f.properties;
        if (!p.lx && p.lx !== 0) continue;
        if (p.cont === "Antarctica") continue;
        if (p.n === "Antarctica") continue;
        const areaPx = f._area * s * s;
        if (areaPx < (zoom < 1.5 ? (narrow ? 1700 : 900) : zoom < 2.5 ? 320 : 140)) continue;
        const pos = this.project(p.lx, p.ly);
        if (pos.x < 4 || pos.x > this.W - 4 || pos.y < 4 || pos.y > this.H - 4) continue;
        const name = this.lang === "zh" ? (p.zh || p.n) : this.lang === "en" ? (p.n || p.zh) : (p[this.lang] || p.n || p.zh);
        if (!name) continue;
        cands.push({ f, name, pos, area: areaPx, fs });
      }
      cands.sort((a, b) => b.area - a.area);
      const rects = [];
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const c of cands) {
        const size = clamp(c.fs * (c.area > 9000 ? 1.08 : c.area > 3000 ? 1 : 0.92), 8.5, 14.5);
        ctx.font = "500 " + size.toFixed(1) + "px " + (this.lang === "zh" ? "'PingFang SC','Noto Sans SC',sans-serif" : "Georgia,serif");
        const w = ctx.measureText(c.name).width;
        const h = size + 4;
        const r = [c.pos.x - w / 2 - 4, c.pos.y - h / 2 - 2, c.pos.x + w / 2 + 4, c.pos.y + h / 2 + 2];
        let hit = false;
        for (const q of rects) {
          if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { hit = true; break; }
        }
        if (hit) continue;
        // Don't label if text is much wider than the country at low zoom
        if (zoom < 1.8 && w > Math.sqrt(c.area) * 2.1) continue;
        rects.push(r);
        const wgt = (window.MapTheatre && window.MapTheatre.labelWeight) ? window.MapTheatre.labelWeight(c.pos.x, c.pos.y) : 1;
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = "rgba(250,246,238," + (0.9 * wgt) + ")";
        ctx.strokeText(c.name, c.pos.x, c.pos.y);
        ctx.fillStyle = "rgba(48,40,31," + (0.84 * wgt) + ")";
        ctx.fillText(c.name, c.pos.x, c.pos.y);
      }
      ctx.restore();
      this._labels = rects;
    }

    _drawPicking() {
      if (!this._pickCtx) return;
      const ctx = this._pickCtx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this._pickCanvas.width, this._pickCanvas.height);
      for (const f of this.features) {
        if (!this._inView(f)) continue;
        const id = f._idx + 1;
        const col = "rgb(" + (id & 255) + "," + ((id >> 8) & 255) + "," + ((id >> 16) & 255) + ")";
        this._trace(ctx, f);
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.fill("evenodd");
        ctx.stroke();
      }
    }

    pickCountry(sx, sy) {
      if (!this._pickCtx) return null;
      const x = Math.round(sx), y = Math.round(sy);
      if (x < 0 || y < 0 || x >= this._pickCanvas.width || y >= this._pickCanvas.height) return null;
      const d = this._pickCtx.getImageData(x, y, 1, 1).data;
      const id = d[0] | (d[1] << 8) | (d[2] << 16);
      if (!id) return null;
      return this.features[id - 1] || null;
    }

    locateCountry(lon, lat) {
      if (!this.features) return null;
      for (const f of this.features) {
        const b = f._rawBBox;
        if (b && (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3])) continue;
        if (pointInFeature(lon, lat, f.geometry)) return f;
      }
      return null;
    }

    /* ── animated overlay ────────────────────────────── */
    _loop(ts) {
      this.fxRaf = requestAnimationFrame(this._loop);
      if (this.paused) return;
      this._drawFX(ts);
    }

    _drawFX(ts) {
      const ctx = this.fx, W = this.W, H = this.H;
      // defensive reset: a leaked transform must never poison the frame buffer
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);
      ctx.clearRect(0, 0, W, H);
      if (!this.geo) return;

      if (this.highlight) this._drawHighlight(ctx, ts);
      if (this.toggles.polities) this._drawHalos(ctx, ts);
      if (window.StateChanges) window.StateChanges.draw(ctx, this, ts);
      if (this.toggles.links && !this.theatreActive) this._drawLinks(ctx, ts);
      if (window.MapTheatre) window.MapTheatre.draw(ctx, this, ts);
      if (this.toggles.events) this._drawPins(ctx, ts);
    }

    _drawHighlight(ctx, ts) {
      const f = this.highlight;
      const pulse = 0.5 + 0.5 * Math.sin(ts * 0.003);
      this._trace(ctx, f);
      ctx.fillStyle = "rgba(176,67,44," + (0.10 + pulse * 0.04) + ")";
      ctx.fill("evenodd");
      ctx.strokeStyle = "rgba(176,67,44," + (0.45 + pulse * 0.25) + ")";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    activePolities() {
      const out = [];
      const y = this.year;
      for (const p of this.polities) {
        if (y < p.y1 || y > p.y2) continue;
        const span = Math.max(1, p.y2 - p.y1);
        const edge = Math.min(span * 0.06, 30);
        let a = 1;
        if (y < p.y1 + edge) a = (y - p.y1) / edge;
        if (y > p.y2 - edge) a = Math.min(a, (p.y2 - y) / edge);
        if (a <= 0.02) continue;
        out.push({ p, a: clamp(a, 0, 1) });
      }
      return out;
    }

    _haloRadius(p) {
      const zf = Math.min(1.25, 0.85 + this.view.zoom * 0.12);
      const cos = Math.max(0.22, Math.cos(p.lat * Math.PI / 180));
      const c = this.project(p.lon, p.lat);
      const ex = this.project(p.lon + (p.r * p.sx) / cos, p.lat);
      const ey = this.project(p.lon, p.lat + p.r);
      let rx = Math.max(9, Math.abs(ex.x - c.x) * 0.92) * zf;
      let ry = Math.max(8, Math.abs(ey.y - c.y) * 0.92) * zf;
      rx = Math.min(rx, Math.max(110, this.W * 0.22));
      ry = Math.min(ry, Math.max(90, this.H * 0.3));
      return { x: rx, y: ry };
    }

    _drawHalos(ctx, ts) {
      const list = this.activePolities();
      if (!list.length) return;
      const s = this.scale();
      const zf = Math.min(1.25, 0.85 + this.view.zoom * 0.12);
      // fills first, large to small
      list.sort((a, b) => b.p.r - a.p.r);
      for (const { p, a } of list) {
        const pos = this.project(p.lon, p.lat);
        if (pos.x < -400 || pos.x > this.W + 400 || pos.y < -400 || pos.y > this.H + 400) continue;
        const rad = this._haloRadius(p);
        const rx = rad.x, ry = rad.y;
        const col = (A.regions[p.rg] || {}).color || "#8a6a3f";
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(rx, ry);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, rgba(col, 0.17 * a));
        g.addColorStop(0.55, rgba(col, 0.09 * a));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // outlines
      for (const { p, a } of list) {
        const pos = this.project(p.lon, p.lat);
        const rad = this._haloRadius(p);
        const rx = rad.x, ry = rad.y;
        const col = (A.regions[p.rg] || {}).color || "#8a6a3f";
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = -(ts * 0.006) % 8;
        ctx.strokeStyle = rgba(col, 0.5 * a);
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
      // labels, small to large (so important labels last)
      const placed = [];
      list.sort((a, b) => a.p.r - b.p.r);
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const { p, a } of list) {
        if (a < 0.25) continue;
        if (this.W < 600 && this.view.zoom < 1.35) continue;
        const pos = this.project(p.lon, p.lat);
        if (pos.x < 50 || pos.x > this.W - 50 || pos.y < 20 || pos.y > this.H - 20) continue;
        const name = this.lang === "zh" ? p.n.zh : p.n.en;
        const size = clamp(11.5 + p.r * 0.28, 11.5, 15) * (this.W < 600 ? 0.82 : 1);
        ctx.font = "italic 500 " + size.toFixed(1) + "px " + (this.lang === "zh" ? "'STKaiti','Kaiti SC',serif" : "Georgia,serif");
        const w = ctx.measureText(name).width;
        const r = [pos.x - w / 2 - 5, pos.y - size / 2 - 3, pos.x + w / 2 + 5, pos.y + size / 2 + 3];
        let hit = false;
        for (const q of placed) if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { hit = true; break; }
        if (hit) continue;
        placed.push(r);
        const wgt = (window.MapTheatre && window.MapTheatre.labelWeight) ? window.MapTheatre.labelWeight(pos.x, pos.y) : 1;
        ctx.fillStyle = "rgba(249,244,234," + (0.44 * a * wgt) + ")";
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(r[0] + 1, r[1] + 1, r[2] - r[0] - 2, r[3] - r[1] - 2, 3);
          ctx.fill();
        }
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(248,242,230," + (0.85 * a * wgt) + ")";
        ctx.strokeText(name, pos.x, pos.y);
        ctx.fillStyle = "rgba(66,48,30," + (0.92 * a * wgt) + ")";
        ctx.fillText(name, pos.x, pos.y);
      }
      ctx.restore();
    }

    visibleEvents() {
      if (!this.toggles.events) return [];
      const y = this.year;
      let list;
      if (this.toggles.allEvents) {
        list = this.events.filter((e) => e.y <= y + 0.5);
      } else {
        const era = A.eraOf(y);
        const win = Math.max(1.2, (era.to - era.from) / 14);
        list = this.events.filter((e) => e.y >= y - win && e.y <= y + win * 0.35);
      }
      if (this.catFilter) list = list.filter((e) => e.k === this.catFilter);
      if (this.selected && list.indexOf(this.selected) < 0) list.push(this.selected);
      return list;
    }

    setCatFilter(k) {
      this.catFilter = k || null;
      this.drawBase();
    }

    hotEvents(list) {
      const y = this.year;
      return list
        .filter((e) => Math.abs(e.y - y) <= Math.max(2, (A.eraOf(y).to - A.eraOf(y).from) / 30))
        .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))
        .slice(0, this.W < 600 ? 4 : 7);
    }

    _drawLinks(ctx, ts) {
      const y = this.year;
      const cands = this.visibleEvents()
        .filter((e) => e.f && e.link && e.link.length && e.y <= y + 0.5)
        .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))
        .slice(0, 3);
      if (this.selected && this.selected.link && !cands.includes(this.selected)) cands.unshift(this.selected);
      for (const ev of cands) {
        const from = this.project(ev.lon, ev.lat);
        const col = (A.categories[ev.k] || {}).color || "#b04a32";
        const alpha = ev === this.selected ? 1 : 0.82;
        const n = ev.link.length;
        for (let i = 0; i < n; i++) {
          const [la, lo] = ev.link[i];
          const to = this.project(lo, la);
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          const dx = to.x - from.x, dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const cx = mx - (dy / len) * len * 0.18;
          const cy = my + (dx / len) * len * 0.18;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(cx, cy, to.x, to.y);
          // soft underglow
          ctx.strokeStyle = rgba(col, alpha * 0.13);
          ctx.lineWidth = 5;
          ctx.stroke();
          // animated dashed route
          ctx.strokeStyle = rgba(col, alpha * 0.78);
          ctx.lineWidth = ev === this.selected ? 1.7 : 1.3;
          ctx.setLineDash([3, 4.5]);
          ctx.lineDashOffset = this.reduceMotion ? 0 : -((ts * 0.022 + i * 8) % 7.5);
          ctx.stroke();
          ctx.setLineDash([]);
          // travelling light
          if (!this.reduceMotion) {
            const t = ((ts * 0.00035 + i * 0.17 + ev.seed) % 1);
            const qx = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x;
            const qy = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y;
            ctx.beginPath();
            ctx.arc(qx, qy, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = rgba(col, alpha * (0.55 + 0.45 * Math.sin(t * Math.PI)));
            ctx.fill();
          }
          // endpoint ring
          const pulse = this.reduceMotion ? 0.5 : (Math.sin(ts * 0.003 + i) + 1) / 2;
          ctx.beginPath();
          ctx.arc(to.x, to.y, 4 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(col, alpha * (0.6 - pulse * 0.3));
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    _clusters() {
      const list = this.visibleEvents();
      if (!list.length) return [];
      const sel = this.selected;
      if (this.theatreActive) {
        return list.map((ev) => {
          const p = this.project(ev.lon, ev.lat);
          return { members: [ev], count: 1, lead: ev, x: p.x, y: p.y, n: 1, sx: p.x, sy: p.y };
        });
      }
      const radius = this.W < 600 ? 34 : 26;
      const clusters = [];
      for (const ev of list) {
        if (ev === sel) continue;
        const p = this.project(ev.lon, ev.lat);
        if (p.x < -30 || p.x > this.W + 30 || p.y < -30 || p.y > this.H + 30) continue;
        let best = null, bd = radius * radius;
        for (const c of clusters) {
          const dx = p.x - c.x, dy = p.y - c.y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = c; }
        }
        if (best) {
          best.sx += p.x; best.sy += p.y; best.n++;
          best.members.push(ev);
          best.x = best.sx / best.n; best.y = best.sy / best.n;
        } else {
          clusters.push({ members: [ev], n: 1, sx: p.x, sy: p.y, x: p.x, y: p.y, count: 1, lead: ev });
        }
      }
      for (const c of clusters) {
        c.count = c.members.length;
        c.lead = c.members.slice().sort((a, b) => Math.abs(a.y - this.year) - Math.abs(b.y - this.year))[0];
      }
      if (sel) {
        const p = this.project(sel.lon, sel.lat);
        clusters.push({ members: [sel], n: 1, sx: p.x, sy: p.y, x: p.x, y: p.y, count: 1, lead: sel, selected: true });
      }
      return clusters;
    }

    _drawPins(ctx, ts) {
      const clusters = this._clusters();
      if (!clusters.length) return;
      const hot = new Set(this.hotEvents(this.visibleEvents()));
      for (const c of clusters) {
        if (c.count > 1) this._drawCluster(ctx, ts, c);
        else this._drawPin(ctx, ts, c.members[0], hot);
      }
    }

    _drawCluster(ctx, ts, c) {
      const r = clamp(9 + Math.sqrt(c.count) * 2.4, 11, 18);
      const pulse = this.reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(ts * 0.002 + c.x * 0.01);
      ctx.beginPath();
      ctx.arc(c.x, c.y, r + 7 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250,246,238,0.26)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250,246,238,0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(90,70,48,0.55)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const kinds = [];
      for (const ev of c.members) if (kinds.indexOf(ev.k) < 0) kinds.push(ev.k);
      const shown = kinds.slice(0, 6);
      const step = (Math.PI * 2) / Math.max(1, shown.length);
      shown.forEach((k, i) => {
        const a = -Math.PI / 2 + i * step;
        const col = (A.categories[k] || {}).color || "#8a6a3f";
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(a) * (r - 3.5), c.y + Math.sin(a) * (r - 3.5), 2.1, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      });
      ctx.fillStyle = "#2b2118";
      ctx.font = "600 10px " + (this.lang === "zh" ? "'PingFang SC',sans-serif" : "Georgia,serif");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(c.count), c.x, c.y + 0.5);
    }

    _drawPin(ctx, ts, ev, hot) {
      {
        const p = this.project(ev.lon, ev.lat);
        if (p.x < -30 || p.x > this.W + 30 || p.y < -30 || p.y > this.H + 30) return;
        if (this.theatreActive && ev !== this.selected) {
          const cc = A.categories[ev.k] || { color: "#8a6a3f" };
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = rgba(cc.color, 0.2); ctx.fill();
          return;
        }
        const past = ev.y <= this.year + 0.5;
        const near = hot.has(ev);
        const isSel = ev === this.selected;
        const isHov = ev === this.hovered;
        const cat = A.categories[ev.k] || { color: "#8a6a3f" };
        const alpha = past ? 1 : 0.38;
        const baseR = ev.f ? 5.2 : 4.2;

        // broad halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, (ev.f ? 12 : 9.5) * (isHov || isSel ? 1.35 : 1), 0, Math.PI * 2);
        ctx.fillStyle = rgba(cat.color, 0.13 * alpha);
        ctx.fill();

        // pulse rings for near events
        if (near && past && !this.reduceMotion) {
          const ph = (ts * 0.0006 + ev.seed) % 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 + ph * 21, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(cat.color, 0.34 * (1 - ph) * alpha);
          ctx.lineWidth = 1;
          ctx.stroke();
          const ph2 = (ph + 0.5) % 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 + ph2 * 16, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(cat.color, 0.2 * (1 - ph2) * alpha);
          ctx.stroke();
        }

        // featured rotating seal
        if (ev.f && !this.reduceMotion) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((ts * 0.00012 + ev.seed * 6) % (Math.PI * 2));
          ctx.strokeStyle = rgba(cat.color, 0.55 * alpha);
          ctx.lineWidth = 0.9;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          ctx.setLineDash([]);
        }

        // core — shape encodes the event category (legend repeats it)
        ctx.beginPath();
        shapePath(ctx, p.x, p.y, baseR, shapeFor(ev.k));
        ctx.fillStyle = rgba(cat.color, 0.92 * alpha);
        ctx.fill();
        ctx.strokeStyle = "rgba(250,246,236," + (0.9 * alpha) + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();

        if (isSel || isHov) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16 + (isSel ? 2 : 0), 0, Math.PI * 2);
          ctx.strokeStyle = rgba(cat.color, 0.85);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // year chip
        const showYear = (past && this.view.zoom >= 1.65) || isHov || isSel || (ev.f && past && this.view.zoom >= 1.35);
        if (showYear) {
          const label = fmtYearShort(ev.y);
          const fs = isSel || isHov ? 9.5 : 8.5;
          ctx.font = "500 " + fs + "px " + (this.lang === "zh" ? "'PingFang SC',sans-serif" : "Georgia,serif");
          ctx.textAlign = "center";
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(249,244,234," + (0.86 * alpha) + ")";
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(p.x - tw / 2 - 3.5, p.y + 12, tw + 7, fs + 5, 2.5);
            ctx.fill();
          }
          ctx.fillStyle = rgba(cat.color, 0.95 * alpha);
          ctx.fillText(label, p.x, p.y + 20);
        }

        // miniature living scene, lifted on a thin staff
        if (near && past && window.Scenes && !(this.theatreActive && ev === this.selected) && this.view.zoom >= 1.35 && !(this.W < 600 && this.view.zoom < 1.55)) {
          const scale = clamp(0.95 + this.view.zoom * 0.16, 1.0, 1.48) * (this.W < 600 ? 0.82 : 1);
          const lift = Math.min(40, 24 + this.view.zoom * 5) * (this.W < 600 ? 0.85 : 1);
          const mx = p.x, my = p.y - lift;
          const discR = 21 * scale;
          ctx.save();
          // staff
          ctx.strokeStyle = rgba(cat.color, 0.28 * alpha);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 8);
          ctx.lineTo(p.x, my + discR * 0.55);
          ctx.stroke();
          // living medallion
          const bg = ctx.createRadialGradient(mx, my - discR * 0.25, 0, mx, my - discR * 0.25, discR);
          bg.addColorStop(0, "rgba(250,246,238," + (0.72 * alpha) + ")");
          bg.addColorStop(0.72, "rgba(250,246,238," + (0.38 * alpha) + ")");
          bg.addColorStop(1, "rgba(250,246,238,0)");
          ctx.beginPath();
          ctx.arc(mx, my - discR * 0.25, discR, 0, Math.PI * 2);
          ctx.fillStyle = bg;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(mx, my - discR * 0.25, discR * 0.86, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(cat.color, 0.22 * alpha);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(mx, my + 2, 11 * scale, 3.2 * scale, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(120,100,75," + (0.12 * alpha) + ")";
          ctx.fill();
          window.Scenes.mini(ctx, window.Scenes.styleFor ? window.Scenes.styleFor(ev) : ev.s, mx, my, scale, ts * 0.001, cat.color, ev.seed);
          ctx.restore();
        }
      }
    }

    /* ── interaction ─────────────────────────────────── */
    _bindEvents() {
      const el = this.fxCanvas.parentElement;
      el.style.touchAction = "none";
      el.addEventListener("pointerdown", (e) => this._down(e));
      el.addEventListener("pointermove", (e) => this._move(e));
      el.addEventListener("pointerup", (e) => this._up(e));
      el.addEventListener("pointercancel", (e) => this._up(e));
      el.addEventListener("pointerleave", () => { if (this.hovered) { this.hovered = null; if (this.opts.onHover) this.opts.onHover(null); } });
      el.addEventListener("wheel", (e) => {
        // Overlays inside the stage (side panel, theatre card, zoom buttons)
        // keep their own wheel/scroll behaviour; never zoom the map under them.
        if (e.target.closest && e.target.closest("#side-panel, #panel-reopen, #theatre-card, #map-zoom, #hint")) return;
        e.preventDefault();
        const r = this.canvas.getBoundingClientRect();
        this.zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });
      el.addEventListener("dblclick", (e) => {
        const r = this.canvas.getBoundingClientRect();
        this.zoomAt(1.7, e.clientX - r.left, e.clientY - r.top);
      });
    }

    _local(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    _down(e) {
      if (e.button !== undefined && e.button !== 0) return;
      // Only the map surfaces start a pan. Overlays inside #map-stage
      // (side panel, reopen tab, zoom controls, hint, theatre card) must
      // keep their native pointer events; otherwise setPointerCapture
      // retargets mouseup/click to the stage and their buttons never fire.
      const stage = this.canvas.parentElement;
      if (e.target !== this.canvas && e.target !== this.fxCanvas && e.target !== stage) return;
      this.pointers.set(e.pointerId, this._local(e));
      try {
        if (this.canvas.parentElement.setPointerCapture) this.canvas.parentElement.setPointerCapture(e.pointerId);
      } catch (err) { /* synthetic events have no active pointer */ }
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.moved = false;
        this.dragStart = this._local(e);
        this.dragPan = { x: this.view.panX, y: this.view.panY };
        this.canvas.style.cursor = "grabbing";
      } else if (this.pointers.size === 2) {
        this.dragging = false;
        const pts = [...this.pointers.values()];
        this.pinch = {
          d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          zoom: this.view.zoom,
          mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        };
      }
    }

    _move(e) {
      const p = this._local(e);
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);

      if (this.pointers.size === 2 && this.pinch) {
        const pts = [...this.pointers.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const f = d / (this.pinch.d || 1);
        this.view.zoom = clamp(this.pinch.zoom * f, 1, 9);
        this.clampPan();
        this.drawBase();
        this.moved = true;
        return;
      }

      if (this.dragging && this.pointers.size === 1) {
        const dx = p.x - this.dragStart.x, dy = p.y - this.dragStart.y;
        if (Math.hypot(dx, dy) > 3) this.moved = true;
        if (this.moved) {
          this.view.panX = this.dragPan.x + dx;
          this.view.panY = this.dragPan.y + dy;
          this.clampPan();
          this.drawBase();
        }
        return;
      }

      // hover detection
      const hit = this._eventAt(p.x, p.y);
      if (hit !== this.hovered) {
        this.hovered = hit;
        this.canvas.style.cursor = hit ? "pointer" : "grab";
        if (this.opts.onHover) this.opts.onHover(hit, p.x, p.y);
      } else if (hit && this.opts.onHoverMove) {
        this.opts.onHoverMove(p.x, p.y);
      }
    }

    _up(e) {
      // Only a pointer that began on the map surface may end a pan/pick.
      // Pointerups from the side panel, sheet handle, theatre card or zoom
      // buttons bubble through the stage and must not trigger map picking.
      const wasTracked = this.pointers.has(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (!wasTracked) return;
      if (this.pointers.size === 0) {
        this.dragging = false;
        this.canvas.style.cursor = this.hovered ? "pointer" : "grab";
        this._drawPicking();
        if (!this.moved) {
          const p = this._local(e);
          const hit = this._eventAt(p.x, p.y, this.coarse ? 26 : 18);
          if (hit) {
            if (this.opts.onEventClick) this.opts.onEventClick(hit);
          } else {
            const f = this.pickCountry(p.x, p.y);
            if (this.opts.onCountryClick) this.opts.onCountryClick(f, p.x, p.y);
          }
        }
      }
    }

    _eventAt(sx, sy, tol) {
      tol = tol || 16;
      let best = null, bd = tol * tol;
      for (const c of this._clusters()) {
        const dx = c.x - sx, dy = c.y - sy;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) return null;
      if (best.count > 1) {
        let lat = 0, lon = 0;
        for (const ev of best.members) { lat += ev.lat; lon += ev.lon; }
        return { __cluster: best.members, count: best.count, lat: lat / best.members.length, lon: lon / best.members.length, x: best.x, y: best.y };
      }
      return best.members[0];
    }
  }

  /* point-in-polygon for country lookup */
  function ringContains(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function pointInFeature(x, y, geom) {
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
      if (ringContains(x, y, poly[0])) {
        let hole = false;
        for (let k = 1; k < poly.length; k++) if (ringContains(x, y, poly[k])) { hole = true; break; }
        if (!hole) return true;
      }
    }
    return false;
  }

  window.AtlasMap = AtlasMap;
})();
