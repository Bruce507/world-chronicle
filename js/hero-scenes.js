/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Hero illustration scenes
   Twelve hand-composed woodcut / parchment scenes. Each event gets
   its own composition, drawn both as a map-anchored vignette
   (MapTheatre) and as the full illustration stage (event chronicle).
   Palette: parchment, ink-brown, vermilion, ochre-gold. No black mass.
   Scale: stage is 100 units wide, a standing figure is ~4 units.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  const INK = "#43301d";
  const INK2 = "rgba(67,48,29,0.62)";
  const INK3 = "rgba(67,48,29,0.28)";
  const RED = "#a8402c";
  const RED2 = "#c2603f";
  const GOLD = "#b98a3e";
  const GOLD2 = "#d8b266";
  const SEA = "#6f8f8c";
  const SEA2 = "#9db6ae";
  const BLUE = "#4e6a7a";
  const GREEN = "#77804f";

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function withA(color, a) {
    if (!color) return color;
    if (color.charAt(0) === "#") return hexA(color, a);
    const m = color.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(",");
      return "rgba(" + p[0].trim() + "," + p[1].trim() + "," + p[2].trim() + "," + a + ")";
    }
    return color;
  }
  function rng(seed) {
    let s = Math.floor(seed * 9301 + 49297) % 233280 || 12345;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  /* ── shared paper, grain, vignette ───────────────────────── */
  function paper(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#f8efd8");
    g.addColorStop(0.48, "#f1e1bd");
    g.addColorStop(1, "#ddc69b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W * 0.5, H * 0.42, Math.min(W, H) * 0.26, W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
    v.addColorStop(0, "rgba(120,80,40,0)");
    v.addColorStop(0.70, "rgba(120,80,40,0.05)");
    v.addColorStop(1, "rgba(90,58,30,0.22)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  let grainCache = null;
  function grain(ctx, W, H) {
    if (!grainCache) {
      const c = document.createElement("canvas");
      c.width = 150; c.height = 150;
      const g = c.getContext("2d");
      const r = rng(11);
      for (let i = 0; i < 2400; i++) {
        const a = 0.06 + r() * 0.18;
        g.fillStyle = r() > 0.45 ? "rgba(90,60,30," + a + ")" : "rgba(255,247,228," + a + ")";
        g.fillRect(Math.floor(r() * 150), Math.floor(r() * 150), 1, 1);
      }
      // paper fibres: short directional strands
      for (let i = 0; i < 80; i++) {
        const fx = r() * 150, fy = r() * 150;
        const len = 2 + r() * 5;
        const dy = (r() - 0.5) * 3;
        g.strokeStyle = r() > 0.5 ? "rgba(116,78,42,0.11)" : "rgba(255,248,230,0.12)";
        g.lineWidth = 0.55;
        g.beginPath();
        g.moveTo(fx, fy);
        g.quadraticCurveTo(fx + len * 0.5, fy + dy * 0.4, fx + len, fy + dy);
        g.stroke();
      }
      grainCache = c;
    }
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = ctx.createPattern(grainCache, "repeat");
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  let hatchCache = null;
  function hatchPattern(ctx) {
    if (!hatchCache) {
      const c = document.createElement("canvas");
      c.width = 90; c.height = 90;
      const g = c.getContext("2d");
      g.strokeStyle = "rgba(74,48,26,0.55)";
      g.lineWidth = 1;
      for (let i = -90; i < 180; i += 6) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + 90, 90);
        g.stroke();
      }
      hatchCache = c;
    }
    return ctx.createPattern(hatchCache, "repeat");
  }

  let screenCache = null;
  function screenPattern(ctx) {
    if (!screenCache) {
      const c = document.createElement("canvas");
      c.width = 90; c.height = 90;
      const g = c.getContext("2d");
      g.strokeStyle = "rgba(74,48,26,0.5)";
      g.lineWidth = 1;
      for (let y = 0; y < 90; y += 4) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(90, y);
        g.stroke();
      }
      screenCache = c;
    }
    return ctx.createPattern(screenCache, "repeat");
  }

  /* Print grade: warm bottom weight, top light, warm vignette, engraving tooth. */
  function finishPlate(ctx, W, H) {
    // Source-over only: large blend modes can leave stale compositor tiles
    // on some GPU paths; alpha overlays give the same print weight safely.
    const b = ctx.createLinearGradient(0, H * 0.48, 0, H);
    b.addColorStop(0, "rgba(96,62,32,0)");
    b.addColorStop(0.72, "rgba(96,62,32,0.10)");
    b.addColorStop(1, "rgba(88,54,26,0.30)");
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, W, H);

    const t = ctx.createLinearGradient(0, 0, 0, H * 0.48);
    t.addColorStop(0, "rgba(255,246,222,0.10)");
    t.addColorStop(1, "rgba(255,246,222,0)");
    ctx.fillStyle = t;
    ctx.fillRect(0, 0, W, H * 0.48);

    const v = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.30, W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
    v.addColorStop(0, "rgba(100,66,34,0)");
    v.addColorStop(0.72, "rgba(100,66,34,0.03)");
    v.addColorStop(1, "rgba(84,54,26,0.20)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    const pat = hatchPattern(ctx);
    if (pat) {
      ctx.save();
      ctx.globalAlpha = 0.045;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // fine horizontal plate screen, heavier toward the sky
    const scr = screenPattern(ctx);
    if (scr) {
      ctx.save();
      ctx.globalAlpha = 0.035;
      ctx.fillStyle = scr;
      ctx.fillRect(0, 0, W, H * 0.72);
      ctx.restore();
    }
  }

  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, a));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  /* Stage: virtual 100-unit width, ground at y=0, x∈[-50,50]. */
  function stage(ctx, W, H, t, fn) {
    paper(ctx, W, H);
    const u = W / 100;
    const top = -H / u;
    ctx.save();
    ctx.translate(W / 2, H);
    ctx.scale(u, u);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    fn(ctx, top, t);
    ctx.restore();
    finishPlate(ctx, W, H);
    grain(ctx, W, H);
  }

  /* Map vignette: rendered into a soft-edged medallion so the scene
     never shows a rectangular card edge on the map. */
  let mapBuf = null, mapBufCtx = null;
  function mapWrap(ctx, x, y, s, t, fn) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = 176 * s, H = 156 * s;
    const bw = Math.max(2, Math.round(W * dpr));
    const bh = Math.max(2, Math.round(H * dpr));
    if (!mapBuf) { mapBuf = document.createElement("canvas"); mapBufCtx = mapBuf.getContext("2d"); }
    if (mapBuf.width !== bw || mapBuf.height !== bh) { mapBuf.width = bw; mapBuf.height = bh; }
    const c = mapBufCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, bw, bh);
    c.save();
    c.scale(dpr, dpr);
    // parchment medallion behind the scene
    const bg = c.createRadialGradient(W / 2, H * 0.46, 10, W / 2, H * 0.50, W * 0.52);
    bg.addColorStop(0, "rgba(249,240,220,0.94)");
    bg.addColorStop(0.60, "rgba(247,236,213,0.86)");
    bg.addColorStop(0.84, "rgba(244,230,202,0.42)");
    bg.addColorStop(1, "rgba(244,230,202,0)");
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    c.translate(W / 2, H * 0.80);
    c.scale(s, s);
    c.lineJoin = "round";
    c.lineCap = "round";
    fn(c, t);
    c.restore();
    // feathered oval mask
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "destination-in";
    c.save();
    c.translate(bw / 2, bh * 0.50);
    c.scale(bw / 2, bh / 2);
    const mg = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    mg.addColorStop(0, "rgba(0,0,0,1)");
    mg.addColorStop(0.62, "rgba(0,0,0,0.98)");
    mg.addColorStop(0.84, "rgba(0,0,0,0.62)");
    mg.addColorStop(0.95, "rgba(0,0,0,0.18)");
    mg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = mg;
    c.fillRect(-1, -1, 2, 2);
    c.restore();
    c.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.drawImage(mapBuf, x - W / 2, y - H * 0.80, W, H);
    ctx.restore();
  }

  /* ── reusable marks ──────────────────────────────────────── */
  function ridge(ctx, x0, x1, baseY, amp, color, seed, step, bottom) {
    const r = rng(seed);
    const bot = bottom == null ? baseY + 60 : bottom;
    const pts = [];
    for (let x = x0; x <= x1 + 0.01; x += step) {
      pts.push([x, baseY - Math.sin(x * 0.055 + seed) * amp * 0.45 - r() * amp]);
    }
    ctx.beginPath();
    ctx.moveTo(x0, bot);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(x1, bot);
    ctx.closePath();
    // fade the base so mountain bands never show a hard rectangular foot
    const g = ctx.createLinearGradient(0, baseY - amp, 0, bot);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, withA(color, 0));
    ctx.fillStyle = g;
    ctx.fill();
    // strata lines inside the silhouette (kept in the solid upper band)
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(54,48,38,0.14)";
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const yy = baseY - amp * (0.85 - i * 0.2);
      for (let x = x0; x < x1; x += 7) {
        ctx.moveTo(x, yy + Math.sin(x * 0.04 + seed + i) * 0.4);
        ctx.lineTo(Math.min(x1, x + 3.6), yy + Math.sin((x + 3.6) * 0.04 + seed + i) * 0.4);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function hatch(ctx, x, y, w, h, col, step, angle) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.16;
    const a = angle || -0.7;
    const len = Math.abs(w) + Math.abs(h);
    for (let i = -len; i < len; i += step) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Broken horizontal dashes: engraved sky/water texture without ruled wires.
     One path + one stroke keeps it cheap on mobile. */
  function skyHatch(ctx, x, y, w, h, col, row, seg) {
    const r = rng(19);
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    for (let yy = y + row; yy < y + h; yy += row) {
      let xx = x + r() * 6;
      while (xx < x + w) {
        const len = seg * (0.5 + r());
        const y0 = yy + (r() - 0.5) * 0.5;
        ctx.moveTo(xx, y0);
        ctx.lineTo(Math.min(x + w, xx + len), y0 + (r() - 0.5) * 0.2);
        xx += len + 3 + r() * 8;
      }
    }
    ctx.stroke();
  }

  function bird(ctx, x, y, s, col) {
    ctx.strokeStyle = col || INK2;
    ctx.lineWidth = 0.14 * s;
    ctx.beginPath();
    ctx.moveTo(x - 1.5 * s, y);
    ctx.quadraticCurveTo(x - 0.6 * s, y - 0.8 * s, x, y);
    ctx.quadraticCurveTo(x + 0.6 * s, y - 0.8 * s, x + 1.5 * s, y);
    ctx.stroke();
  }

  function cloud(ctx, x, y, w, col, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.5 : alpha;
    ctx.fillStyle = col || "#fff7e6";
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.16, 0, 0, TAU);
    ctx.ellipse(x - w * 0.44, y + w * 0.04, w * 0.48, w * 0.11, 0, 0, TAU);
    ctx.ellipse(x + w * 0.40, y + w * 0.02, w * 0.42, w * 0.10, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* Standing figure. Base height ≈ 19 units; draw at s≈0.2 for 4 units. */
  function person(ctx, x, y, s, col, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (!o.noShadow) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 0.95, 0, 0, TAU);
      ctx.fillStyle = "rgba(92,62,32,0.17)";
      ctx.fill();
    }
    const ph = o.phase || 0;
    const sw = Math.sin(ph * 2.4 + (o.seed || 0)) * 0.55;
    const body = o.fill || col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.25;
    // legs
    ctx.beginPath();
    ctx.moveTo(-1.2, -6.2); ctx.lineTo(-1.6 + sw, 0);
    ctx.moveTo(1.2, -6.2); ctx.lineTo(1.6 - sw, 0);
    ctx.stroke();
    // robe
    ctx.beginPath();
    ctx.moveTo(0, -15.4);
    ctx.quadraticCurveTo(-2.2, -12.4, -3.0, -6.2);
    ctx.lineTo(-3.5, -4.2);
    ctx.lineTo(3.5, -4.2);
    ctx.lineTo(3.0, -6.2);
    ctx.quadraticCurveTo(2.2, -12.4, 0, -15.4);
    ctx.closePath();
    ctx.fillStyle = withA(body, o.alpha == null ? 0.94 : o.alpha);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.42;
    ctx.stroke();
    // shadow side + folds (print shading)
    const rg = ctx.createLinearGradient(-3.5, 0, 3.5, 0);
    rg.addColorStop(0, "rgba(40,28,18,0)");
    rg.addColorStop(0.55, "rgba(40,28,18,0)");
    rg.addColorStop(1, "rgba(40,28,18,0.22)");
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.22);
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(-1.1, -12.6); ctx.quadraticCurveTo(-0.5, -10.4, -1.3, -7.0);
    ctx.moveTo(0.9, -11.2); ctx.quadraticCurveTo(1.5, -9.4, 0.7, -6.4);
    ctx.stroke();
    // sash
    ctx.strokeStyle = o.sash || hexA(GOLD, 0.85);
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-2.4, -10.2); ctx.lineTo(2.4, -10.2); ctx.stroke();
    // sleeves
    if (o.arm) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(1.4, -13.2); ctx.lineTo(3.8, -11.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -16.9, 1.65, 0, TAU);
    }
    // head
    ctx.beginPath();
    ctx.arc(0, -17.2, 1.65, 0, TAU);
    ctx.fillStyle = o.skin || "#c08e5e";
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.38;
    ctx.stroke();
    if (o.hat === "cone") {
      ctx.beginPath();
      ctx.moveTo(-2.7, -17.9); ctx.lineTo(0, -22.4); ctx.lineTo(2.7, -17.9); ctx.closePath();
      ctx.fillStyle = o.hatCol || "#c9a76b"; ctx.fill(); ctx.stroke();
    } else if (o.hat === "cap") {
      ctx.beginPath();
      ctx.ellipse(0, -18.7, 1.8, 0.65, 0, 0, TAU);
      ctx.fillStyle = o.hatCol || col; ctx.fill();
    } else if (o.hat === "helmet") {
      ctx.beginPath();
      ctx.arc(0, -17.2, 1.95, Math.PI, TAU);
      ctx.fillStyle = o.hatCol || "#6b5638"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -19.1); ctx.lineTo(0, -20.8); ctx.stroke();
    } else if (o.hat === "straw") {
      ctx.beginPath();
      ctx.ellipse(0, -17.6, 3.2, 0.7, 0, 0, TAU);
      ctx.fillStyle = "#c9a76b"; ctx.fill(); ctx.stroke();
    }
    if (o.spear) {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(2.4, -12.5); ctx.lineTo(2.8, -25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2.8, -25); ctx.lineTo(2.3, -22.6); ctx.lineTo(3.3, -22.6); ctx.closePath();
      ctx.fillStyle = INK; ctx.fill();
    }
    if (o.staff) {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.32;
      ctx.beginPath(); ctx.moveTo(2.2, -11.6); ctx.lineTo(3.0, 0); ctx.stroke();
    }
    if (o.bundle) {
      ctx.beginPath(); ctx.arc(-3.2, -12, 2.1, 0, TAU);
      ctx.fillStyle = "rgba(160,126,80,0.95)"; ctx.fill();
    }
    ctx.restore();
  }

  /* Horse with optional rider. Base length ≈ 20 units. */
  function horse(ctx, x, y, s, col, phase, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.6, 1.5, 0, 0, TAU);
    ctx.fillStyle = "rgba(92,62,32,0.15)";
    ctx.fill();
    const g = Math.sin((phase || 0) * 6);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 0.9;
    // tail
    ctx.beginPath();
    ctx.moveTo(-7, -11.4);
    ctx.quadraticCurveTo(-10.6, -10, -10.4, -4.6);
    ctx.stroke();
    // hind legs
    ctx.beginPath();
    ctx.moveTo(-6.2, -8.6); ctx.lineTo(-7.2 + g * 1.2, -4.2); ctx.lineTo(-7.6 + g * 1.6, 0);
    ctx.moveTo(-3.4, -8.8); ctx.lineTo(-2.9 - g * 1.2, -4.2); ctx.lineTo(-2.4 - g * 1.6, 0);
    ctx.stroke();
    // front legs
    ctx.beginPath();
    ctx.moveTo(4.4, -9.2); ctx.lineTo(4.9 - g * 1.2, -4.4); ctx.lineTo(5.3 - g * 1.4, 0);
    ctx.moveTo(6.8, -9.6); ctx.lineTo(7.4 + g * 1.2, -4.6); ctx.lineTo(8.0 + g * 1.4, 0);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.moveTo(-7.2, -11.6);
    ctx.quadraticCurveTo(-4, -14.2, 1, -13.6);
    ctx.quadraticCurveTo(6.2, -13.2, 7.4, -10.2);
    ctx.lineTo(6.6, -7.4);
    ctx.quadraticCurveTo(0, -5.4, -7.2, -8.2);
    ctx.closePath();
    ctx.fill();
    // volume shading + flank strokes
    const hg = ctx.createLinearGradient(0, -14.5, 0, -6);
    hg.addColorStop(0, "rgba(255,240,210,0.10)");
    hg.addColorStop(0.6, "rgba(255,240,210,0)");
    hg.addColorStop(1, "rgba(28,18,10,0.26)");
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = "rgba(36,24,14,0.28)"; ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.moveTo(-4.4, -11.4); ctx.quadraticCurveTo(-2.6, -10.2, -3.8, -8.0);
    ctx.moveTo(1.4, -12.0); ctx.quadraticCurveTo(3.2, -10.6, 2.2, -8.2);
    ctx.stroke();
    // neck + head
    ctx.beginPath();
    ctx.moveTo(4.6, -12.6);
    ctx.quadraticCurveTo(8.4, -17.4, 10.6, -17.8);
    ctx.lineTo(12.2, -15.4);
    ctx.quadraticCurveTo(10.4, -14.6, 9.2, -12.6);
    ctx.lineTo(7.4, -10.4);
    ctx.closePath();
    ctx.fill();
    // muzzle + ear
    ctx.beginPath(); ctx.moveTo(12.2, -15.4); ctx.lineTo(13.4, -14.6); ctx.lineTo(12.3, -13.9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11.2, -17.9); ctx.lineTo(11.9, -19.6); ctx.lineTo(12.5, -17.6); ctx.closePath(); ctx.fill();
    // mane
    ctx.beginPath();
    ctx.moveTo(5.0, -13.2); ctx.quadraticCurveTo(7.4, -17.2, 9.8, -17.6);
    ctx.strokeStyle = hexA("#2f2115", 0.75); ctx.lineWidth = 0.7; ctx.stroke();
    if (o.rider) {
      // rider torso + head
      ctx.fillStyle = o.riderCol || RED;
      ctx.beginPath();
      ctx.moveTo(0.6, -13.6);
      ctx.quadraticCurveTo(-0.6, -17.4, 0.4, -19.2);
      ctx.lineTo(3.2, -19.2);
      ctx.quadraticCurveTo(3.8, -16.6, 2.8, -13.4);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(1.9, -21.1, 1.35, 0, TAU);
      ctx.fillStyle = "#c08e5e"; ctx.fill();
      ctx.strokeStyle = hexA(INK, 0.7); ctx.lineWidth = 0.3; ctx.stroke();
      // arm with rein
      ctx.strokeStyle = o.riderCol || RED; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(2.6, -18); ctx.lineTo(6.4, -16.6); ctx.stroke();
      if (o.banner) {
        ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(3.2, -16); ctx.lineTo(3.2, -31); ctx.stroke();
        const wave = Math.sin((phase || 0) * 2.4) * 1.6;
        ctx.beginPath();
        ctx.moveTo(3.4, -30.4);
        ctx.quadraticCurveTo(8.8 + wave, -29.6, 11 + wave, -25.6);
        ctx.lineTo(3.4, -23.6);
        ctx.closePath();
        ctx.fillStyle = o.banner; ctx.fill();
      }
    }
    ctx.restore();
  }

  /* Camel. Base length ≈ 18 units. */
  function camel(ctx, x, y, s, col, phase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.8, 1.4, 0, 0, TAU);
    ctx.fillStyle = "rgba(92,62,32,0.15)";
    ctx.fill();
    const g = Math.sin((phase || 0) * 4);
    ctx.strokeStyle = col || "rgba(118,90,56,0.95)";
    ctx.fillStyle = col || "rgba(118,90,56,0.95)";
    ctx.lineWidth = 0.95;
    // legs
    ctx.beginPath();
    ctx.moveTo(-5.4, -7); ctx.lineTo(-6.2 + g * 1.1, -3.6); ctx.lineTo(-6.6 + g * 1.4, 0);
    ctx.moveTo(-2.6, -7); ctx.lineTo(-2.0 - g * 1.1, -3.6); ctx.lineTo(-1.4 - g * 1.4, 0);
    ctx.moveTo(3.2, -7); ctx.lineTo(3.8 - g * 1.1, -3.6); ctx.lineTo(4.2 - g * 1.4, 0);
    ctx.moveTo(5.6, -7); ctx.lineTo(6.2 + g * 1.1, -3.6); ctx.lineTo(6.8 + g * 1.4, 0);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.ellipse(0, -8.6, 6.4, 2.9, 0, 0, TAU);
    ctx.fill();
    // humps
    ctx.beginPath();
    ctx.arc(-2.4, -10.8, 2.9, Math.PI, TAU);
    ctx.arc(2.6, -10.6, 2.7, Math.PI, TAU);
    ctx.fill();
    // neck + head
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(5.4, -9.4);
    ctx.quadraticCurveTo(8.2, -13.4, 9.0, -16.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(10.0, -16.6, 1.9, 1.05, 0.28, 0, TAU);
    ctx.fill();
    // tail
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-6.2, -9.6); ctx.quadraticCurveTo(-8.8, -8.4, -8.6, -5.0); ctx.stroke();
    ctx.restore();
  }

  /* Ox. Base length ≈ 15 units. */
  function ox(ctx, x, y, s, col, phase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.2, 1.3, 0, 0, TAU);
    ctx.fillStyle = "rgba(92,62,32,0.15)";
    ctx.fill();
    const g = Math.sin((phase || 0) * 3.4);
    ctx.strokeStyle = col || "rgba(96,70,44,0.9)";
    ctx.fillStyle = "rgba(232,219,192,0.99)";
    ctx.lineWidth = 0.75;
    // body
    ctx.beginPath();
    ctx.moveTo(-6, -4.4);
    ctx.quadraticCurveTo(-3, -8.4, 1.6, -8.0);
    ctx.quadraticCurveTo(5, -7.6, 6.2, -4.6);
    ctx.quadraticCurveTo(2, -2.4, -6, -4.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col || "rgba(96,70,44,0.9)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // legs (over the body edge)
    ctx.strokeStyle = "rgba(70,50,30,0.95)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-4.6, -4.2); ctx.lineTo(-5.1 + g * 0.7, 0.4);
    ctx.moveTo(-2.0, -3.8); ctx.lineTo(-1.5 - g * 0.7, 0.4);
    ctx.moveTo(3.0, -3.8); ctx.lineTo(3.5 - g * 0.7, 0.4);
    ctx.moveTo(5.0, -3.8); ctx.lineTo(5.5 + g * 0.7, 0.4);
    ctx.stroke();
    // hooves
    ctx.fillStyle = "rgba(70,50,30,0.95)";
    for (const hx of [-5.1 + g * 0.7, -1.5 - g * 0.7, 3.5 - g * 0.7, 5.5 + g * 0.7]) {
      ctx.fillRect(hx - 0.35, 0.2, 0.8, 0.7);
    }
    // head
    ctx.beginPath();
    ctx.ellipse(7.6, -5.2, 2.2, 1.6, 0.2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // horns
    ctx.beginPath();
    ctx.moveTo(7.2, -6.4); ctx.quadraticCurveTo(6.4, -9.2, 8.2, -9.6);
    ctx.moveTo(8.4, -6.4); ctx.quadraticCurveTo(9.6, -9.0, 8.6, -9.4);
    ctx.stroke();
    // tail
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-8.4, -4.6, -8.2, -1.6); ctx.stroke();
    ctx.restore();
  }

  /* Wolf silhouette. Base length ≈ 14 units. */
  function wolf(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = col || "rgba(67,48,29,0.82)";
    ctx.beginPath();
    ctx.moveTo(-6.4, -6.6);
    ctx.quadraticCurveTo(-3, -8.4, 0.6, -7.8);
    ctx.quadraticCurveTo(3.4, -7.4, 4.6, -9.2);
    ctx.lineTo(6.8, -12.6);
    ctx.lineTo(7.6, -10);
    ctx.lineTo(8.6, -10.8);
    ctx.lineTo(8.2, -8.4);
    ctx.quadraticCurveTo(6.6, -6.8, 5.8, -5.4);
    ctx.quadraticCurveTo(2.4, -3.6, -3.8, -4.6);
    ctx.closePath();
    ctx.fill();
    // legs
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = col || "rgba(67,48,29,0.82)";
    ctx.beginPath();
    ctx.moveTo(-4.6, -4.8); ctx.lineTo(-5.0, 0);
    ctx.moveTo(-2.6, -4.6); ctx.lineTo(-2.2, 0);
    ctx.moveTo(2.6, -4.6); ctx.lineTo(3.0, 0);
    ctx.moveTo(4.2, -5.0); ctx.lineTo(4.8, 0);
    ctx.stroke();
    // tail
    ctx.beginPath();
    ctx.moveTo(-6.2, -6.8);
    ctx.quadraticCurveTo(-9.6, -8.2, -10, -3.4);
    ctx.stroke();
    ctx.restore();
  }

  /* Chinese gate tower with upturned hip roof. Base at y, body h tall. */
  function cnGate(ctx, x, y, w, h, bodyCol, roofCol, opts) {
    const o = opts || {};
    const body = bodyCol || "rgba(216,193,154,0.96)";
    const roof = roofCol || "rgba(176,106,64,0.94)";
    // body
    ctx.fillStyle = body;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.32;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.strokeRect(x - w / 2, y - h, w, h);
    // plaster shading + courses
    const bg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    bg.addColorStop(0, "rgba(90,60,30,0)");
    bg.addColorStop(0.58, "rgba(90,60,30,0)");
    bg.addColorStop(1, "rgba(90,60,30,0.18)");
    ctx.fillStyle = bg;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = "rgba(90,62,36,0.15)"; ctx.lineWidth = 0.13;
    for (let yy = y - h + 2.2; yy < y - 1; yy += 2.4) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + 0.6, yy);
      ctx.lineTo(x + w / 2 - 0.6, yy);
      ctx.stroke();
    }
    // columns + lattice windows
    for (let i = -1; i <= 1; i++) {
      const cx = x + i * w * 0.27;
      ctx.strokeStyle = hexA("#7c3f28", 0.65);
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx, y - h + 0.6); ctx.lineTo(cx, y - 0.6); ctx.stroke();
    }
    ctx.strokeStyle = hexA(INK, 0.35);
    ctx.lineWidth = 0.22;
    for (let r = 0; r < 2; r++) {
      const wy = y - h * 0.72 + r * h * 0.22;
      ctx.strokeRect(x - w * 0.16, wy, w * 0.32, h * 0.15);
      for (let k = 1; k < 4; k++) {
        ctx.beginPath(); ctx.moveTo(x - w * 0.16 + (w * 0.32 * k) / 4, wy); ctx.lineTo(x - w * 0.16 + (w * 0.32 * k) / 4, wy + h * 0.15); ctx.stroke();
      }
    }
    if (o.arch) {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.15, y);
      ctx.lineTo(x - w * 0.15, y - h * 0.34);
      ctx.quadraticCurveTo(x, y - h * 0.62, x + w * 0.15, y - h * 0.34);
      ctx.lineTo(x + w * 0.15, y);
      ctx.closePath();
      ctx.fillStyle = "rgba(67,48,29,0.78)";
      ctx.fill();
      // door studs
      ctx.fillStyle = "rgba(196,150,78,0.55)";
      for (let r = 0; r < 3; r++) {
        for (let c = -1; c <= 1; c++) {
          ctx.beginPath();
          ctx.arc(x + c * w * 0.055, y - h * 0.08 - r * h * 0.07, 0.22, 0, TAU);
          ctx.fill();
        }
      }
    }
    // hip roof with flicked eaves
    const ry = y - h;
    const rw = w * 0.62;
    const rh = h * 0.52;
    ctx.beginPath();
    ctx.moveTo(x - rw, ry);
    ctx.quadraticCurveTo(x - rw * 0.94, ry - rh * 0.30, x - rw * 0.52, ry - rh * 0.62);
    ctx.quadraticCurveTo(x - rw * 0.24, ry - rh * 0.86, x, ry - rh);
    ctx.quadraticCurveTo(x + rw * 0.24, ry - rh * 0.86, x + rw * 0.52, ry - rh * 0.62);
    ctx.quadraticCurveTo(x + rw * 0.94, ry - rh * 0.30, x + rw, ry);
    ctx.quadraticCurveTo(x, ry + h * 0.08, x - rw, ry);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.34;
    ctx.stroke();
    // tile courses
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = hexA("#5c2f1e", 0.28);
    ctx.lineWidth = 0.14;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x - rw, ry - rh * 0.10 * i);
      ctx.quadraticCurveTo(x, ry - rh * (0.22 + 0.17 * i), x + rw, ry - rh * 0.10 * i);
      ctx.stroke();
    }
    ctx.restore();
    // eave tips flick upward
    ctx.beginPath();
    ctx.moveTo(x - rw, ry);
    ctx.quadraticCurveTo(x - rw - w * 0.05, ry - h * 0.06, x - rw - w * 0.02, ry - h * 0.12);
    ctx.moveTo(x + rw, ry);
    ctx.quadraticCurveTo(x + rw + w * 0.05, ry - h * 0.06, x + rw + w * 0.02, ry - h * 0.12);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.38; ctx.stroke();
    // ridge line
    ctx.beginPath();
    ctx.moveTo(x - rw * 0.5, ry - rh * 0.64);
    ctx.quadraticCurveTo(x, ry - rh * 1.02, x + rw * 0.5, ry - rh * 0.64);
    ctx.strokeStyle = hexA(GOLD2, 0.8);
    ctx.lineWidth = 0.28;
    ctx.stroke();
    // finials
    ctx.strokeStyle = INK; ctx.lineWidth = 0.26;
    ctx.beginPath();
    ctx.moveTo(x - rw * 0.86, ry - rh * 0.16); ctx.lineTo(x - rw * 0.86, ry - rh * 0.26);
    ctx.moveTo(x + rw * 0.86, ry - rh * 0.16); ctx.lineTo(x + rw * 0.86, ry - rh * 0.26);
    ctx.stroke();
    // double eave
    if (o.double !== false) {
      ctx.beginPath();
      ctx.moveTo(x - rw * 1.12, ry + h * 0.20);
      ctx.quadraticCurveTo(x - rw * 0.6, ry - h * 0.02, x, ry - h * 0.06);
      ctx.quadraticCurveTo(x + rw * 0.6, ry - h * 0.02, x + rw * 1.12, ry + h * 0.20);
      ctx.quadraticCurveTo(x, ry + h * 0.30, x - rw * 1.12, ry + h * 0.20);
      ctx.closePath();
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = roof;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.stroke();
    }
  }

  function pagoda(ctx, x, baseY, tiers, w, col) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.26;
    let y = baseY;
    for (let i = 0; i < tiers; i++) {
      const tw = w * (1 - i * 0.09);
      const th = w * 0.30;
      ctx.fillStyle = col || "rgba(170,132,88,0.9)";
      ctx.fillRect(x - tw * 0.26, y - th, tw * 0.52, th);
      ctx.strokeRect(x - tw * 0.26, y - th, tw * 0.52, th);
      // windows
      ctx.fillStyle = hexA(INK, 0.35);
      ctx.fillRect(x - tw * 0.08, y - th * 0.62, tw * 0.16, th * 0.36);
      // eaves
      ctx.beginPath();
      ctx.moveTo(x - tw * 0.62, y - th);
      ctx.quadraticCurveTo(x - tw * 0.32, y - th - w * 0.14, x, y - th - w * 0.15);
      ctx.quadraticCurveTo(x + tw * 0.32, y - th - w * 0.14, x + tw * 0.62, y - th);
      ctx.quadraticCurveTo(x, y - th + w * 0.03, x - tw * 0.62, y - th);
      ctx.closePath();
      ctx.fillStyle = "rgba(136,78,50,0.92)";
      ctx.fill();
      ctx.stroke();
      y -= th + w * 0.13;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - w * 0.22);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.32;
    ctx.stroke();
  }

  function junk(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const bob = Math.sin(t * 1.1 + (o.phase || 0)) * 0.5;
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.moveTo(-30, -2);
    ctx.quadraticCurveTo(-18, 6, 8, 6);
    ctx.quadraticCurveTo(24, 6, 32, -4);
    ctx.lineTo(29, -8);
    ctx.quadraticCurveTo(0, -10, -27, -7);
    ctx.closePath();
    ctx.fillStyle = o.hull || "rgba(139,94,55,0.96)";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.42;
    ctx.stroke();
    // hull planking
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-26, -6 + i * 3.4);
      ctx.quadraticCurveTo(0, -8 + i * 3.4, 28, -6 + i * 3.4);
      ctx.strokeStyle = hexA(INK, 0.28);
      ctx.lineWidth = 0.2;
      ctx.stroke();
    }
    // stern castle
    ctx.fillStyle = "rgba(160,110,66,0.96)";
    ctx.fillRect(-30, -14, 12, 12);
    ctx.strokeRect(-30, -14, 12, 12);
    ctx.beginPath();
    ctx.moveTo(-32, -14); ctx.quadraticCurveTo(-28, -17, -24, -14);
    ctx.lineTo(-18, -14); ctx.quadraticCurveTo(-14, -17, -10, -14);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.28; ctx.stroke();
    // stern windows + red trim
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(228,182,106,0.75)";
      ctx.fillRect(-28.4 + i * 3.4, -11.2, 1.6, 1.8);
      ctx.strokeStyle = "rgba(92,44,30,0.5)"; ctx.lineWidth = 0.1;
      ctx.strokeRect(-28.4 + i * 3.4, -11.2, 1.6, 1.8);
    }
    ctx.beginPath(); ctx.moveTo(-30, -9); ctx.lineTo(-19, -9);
    ctx.strokeStyle = "rgba(168,64,44,0.75)"; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-31, -3); ctx.lineTo(-33, 8); ctx.stroke();
    const masts = o.masts || [24, 10, -4, -18];
    for (let i = 0; i < masts.length; i++) {
      const mx = masts[i];
      const mh = i === 0 ? 32 : 27 - i * 1.2;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.48;
      ctx.beginPath(); ctx.moveTo(mx, -6); ctx.lineTo(mx, -6 - mh); ctx.stroke();
      const sw = 6.4 - i * 0.5;
      const sh = mh * 0.56;
      const sy = -11 - i * 1.3;
      const wave = Math.sin(t * 1.4 + i) * 0.7;
      ctx.beginPath();
      ctx.moveTo(mx - sw, sy);
      ctx.quadraticCurveTo(mx - sw - 1, sy - sh * 0.55, mx - sw + wave, sy - sh);
      ctx.lineTo(mx + sw * 0.72 + wave, sy - sh);
      ctx.quadraticCurveTo(mx + sw * 0.8, sy - sh * 0.5, mx + sw * 0.86, sy);
      ctx.closePath();
      ctx.fillStyle = i === 2 ? "rgba(196,150,78,0.9)" : (o.sail || "rgba(176,64,44,0.9)");
      ctx.fill();
      ctx.strokeStyle = "rgba(92,44,30,0.9)";
      ctx.lineWidth = 0.28;
      ctx.stroke();
      for (let b = 1; b < 5; b++) {
        const by = sy - sh * (b / 5);
        ctx.beginPath(); ctx.moveTo(mx - sw + 0.6, by); ctx.lineTo(mx + sw * 0.8, by);
        ctx.strokeStyle = "rgba(92,44,30,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
      }
      // vertical seam
      ctx.beginPath(); ctx.moveTo(mx + 0.2, sy - 0.5); ctx.lineTo(mx + 0.2, sy - sh + 0.6);
      ctx.strokeStyle = "rgba(92,44,30,0.28)"; ctx.lineWidth = 0.18; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(24, -6.6, 1.1, 0, TAU);
    ctx.fillStyle = "rgba(244,233,210,0.96)"; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.36;
    ctx.beginPath(); ctx.moveTo(24, -40); ctx.lineTo(24, -52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24.4, -51); ctx.lineTo(32, -49); ctx.lineTo(24.4, -46); ctx.closePath();
    ctx.fillStyle = GOLD; ctx.fill();
    ctx.restore();
  }

  function caravel(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const bob = Math.sin(t * 1.2 + 1) * 0.4;
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.moveTo(-20, -2);
    ctx.quadraticCurveTo(-12, 6, 6, 6);
    ctx.quadraticCurveTo(17, 6, 22, -2);
    ctx.lineTo(19, -6);
    ctx.quadraticCurveTo(0, -8, -17, -6);
    ctx.closePath();
    ctx.fillStyle = o.hull || "rgba(128,86,52,0.96)";
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.38; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-16, -5.4 + i * 3.2); ctx.quadraticCurveTo(0, -7 + i * 3.2, 19, -5.4 + i * 3.2);
      ctx.strokeStyle = hexA(INK, 0.25); ctx.lineWidth = 0.18; ctx.stroke();
    }
    ctx.fillStyle = "rgba(150,102,60,0.96)";
    ctx.fillRect(-19, -11, 9, 9);
    ctx.strokeRect(-19, -11, 9, 9);
    // stern windows
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(228,182,106,0.85)";
      ctx.fillRect(-17.6 + i * 2.6, -9.4, 1.2, 1.4);
    }
    for (let i = 0; i < 3; i++) {
      const mx = -4 + i * 9;
      const mh = 26 + (i === 1 ? 6 : 0);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.42;
      ctx.beginPath(); ctx.moveTo(mx, -5); ctx.lineTo(mx, -5 - mh); ctx.stroke();
      const sw = 6.2 - i * 0.8;
      const sh = mh * 0.5;
      const wave = Math.sin(t * 1.3 + i) * 0.5;
      ctx.beginPath();
      ctx.moveTo(mx - sw, -8);
      ctx.quadraticCurveTo(mx - sw - 1, -8 - sh * 0.5, mx - sw + wave, -8 - sh);
      ctx.lineTo(mx + sw + wave, -8 - sh);
      ctx.quadraticCurveTo(mx + sw + 1, -8 - sh * 0.5, mx + sw, -8);
      ctx.closePath();
      ctx.fillStyle = "rgba(240,229,205,0.96)";
      ctx.fill();
      ctx.strokeStyle = "rgba(96,70,44,0.95)"; ctx.lineWidth = 0.34; ctx.stroke();
      // seams and billow
      ctx.strokeStyle = "rgba(150,120,80,0.55)"; ctx.lineWidth = 0.16;
      for (let k = 1; k <= 2; k++) {
        const sx2 = mx - sw + (2 * sw * k) / 3;
        ctx.beginPath();
        ctx.moveTo(sx2, -8 - sh);
        ctx.quadraticCurveTo(sx2 + (k === 1 ? 0.8 : -0.8), -8 - sh * 0.5, sx2, -8);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(mx - sw, -8 - sh * 0.55);
      ctx.quadraticCurveTo(mx, -8 - sh * 0.55 + 1.0, mx + sw, -8 - sh * 0.55);
      ctx.strokeStyle = "rgba(150,120,80,0.6)"; ctx.lineWidth = 0.18; ctx.stroke();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 0.38;
    ctx.beginPath(); ctx.moveTo(18, -6); ctx.lineTo(26, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -48); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.3, -47); ctx.lineTo(7, -45); ctx.lineTo(0.3, -42.6); ctx.closePath();
    ctx.fillStyle = RED; ctx.fill();
    ctx.strokeStyle = "rgba(67,48,29,0.45)"; ctx.lineWidth = 0.14;
    ctx.beginPath(); ctx.moveTo(-4, -34); ctx.lineTo(22, -2); ctx.moveTo(5, -40); ctx.lineTo(-18, -2); ctx.stroke();
    ctx.restore();
  }

  function trireme(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const bob = Math.sin(t * 1.6 + (o.phase || 0)) * 0.4;
    ctx.translate(0, bob);
    // hull
    ctx.beginPath();
    ctx.moveTo(-31, -2);
    ctx.quadraticCurveTo(-22, 4.4, 6, 5.2);
    ctx.quadraticCurveTo(24, 5, 33, -1);
    ctx.lineTo(29, -7);
    ctx.quadraticCurveTo(0, -9.4, -26, -7);
    ctx.closePath();
    ctx.fillStyle = o.hull || "rgba(120,84,50,0.98)";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.55;
    ctx.stroke();
    // wale stripe
    ctx.beginPath();
    ctx.moveTo(-28, -4.4);
    ctx.quadraticCurveTo(0, -6.4, 30, -4.2);
    ctx.strokeStyle = o.stripe || "rgba(78,106,122,0.85)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // bronze ram
    ctx.beginPath();
    ctx.moveTo(31, -2.6);
    ctx.lineTo(39, 0);
    ctx.lineTo(31, 1.8);
    ctx.closePath();
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.3;
    ctx.stroke();
    // stern post
    ctx.beginPath();
    ctx.moveTo(-29, -6);
    ctx.quadraticCurveTo(-35, -13, -30, -19);
    ctx.strokeStyle = "rgba(74,50,30,0.95)";
    ctx.lineWidth = 1.0;
    ctx.stroke();
    // oar ports + two oar banks
    for (let i = 0; i < 12; i++) {
      const px = -22 + i * 3.7;
      ctx.fillStyle = "rgba(52,34,20,0.75)";
      ctx.fillRect(px - 0.5, -5.4, 1.1, 1.1);
      const swing = Math.sin(t * 3.4 + i * 0.5) * 0.9;
      ctx.strokeStyle = "rgba(74,50,30,0.7)";
      ctx.lineWidth = 0.34;
      ctx.beginPath();
      ctx.moveTo(px, -4.8);
      ctx.lineTo(px - 4.2, 6.4 + swing);
      ctx.stroke();
      ctx.strokeStyle = "rgba(74,50,30,0.45)";
      ctx.lineWidth = 0.26;
      ctx.beginPath();
      ctx.moveTo(px - 0.8, -3.6);
      ctx.lineTo(px - 4.8, 7.2 + swing * 0.85);
      ctx.stroke();
    }
    // deck rail
    ctx.beginPath();
    ctx.moveTo(-27, -7.2);
    ctx.lineTo(29, -7.2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.4;
    ctx.stroke();
    // shields
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-17 + i * 7.4, -8.6, 1.7, 0, TAU);
      ctx.fillStyle = o.shield || "rgba(88,112,130,0.95)";
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.24;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-17 + i * 7.4, -8.6, 0.55, 0, TAU);
      ctx.strokeStyle = "rgba(240,232,212,0.7)";
      ctx.lineWidth = 0.18;
      ctx.stroke();
    }
    // mast + furled sail
    ctx.strokeStyle = "rgba(74,50,30,0.95)";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(1, -7); ctx.lineTo(1, -34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13, -30); ctx.lineTo(15, -30); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, -30);
    ctx.quadraticCurveTo(0, -26.8, 13, -30);
    ctx.quadraticCurveTo(0, -29.2, -12, -30);
    ctx.closePath();
    ctx.fillStyle = "rgba(236,224,198,0.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(96,70,44,0.65)";
    ctx.lineWidth = 0.24;
    ctx.stroke();
    // rigging
    ctx.strokeStyle = "rgba(74,50,30,0.4)";
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.moveTo(1, -33); ctx.lineTo(29, -7);
    ctx.moveTo(1, -33); ctx.lineTo(-26, -7);
    ctx.stroke();
    // hoplites on deck
    for (let i = 0; i < 3; i++) {
      person(ctx, -8 + i * 8, -7.4, 0.18, "rgba(52,38,24,0.96)", {
        phase: t + i, fill: i === 1 ? "rgba(150,60,42,0.95)" : "rgba(78,98,112,0.95)", hat: "helmet", spear: true, noShadow: true,
      });
    }
    // helmsman
    person(ctx, -23, -7.4, 0.17, "rgba(52,38,24,0.96)", { phase: t + 2, fill: "rgba(96,84,64,0.95)", noShadow: true });
    // bow foam
    ctx.strokeStyle = "rgba(246,238,219,0.85)";
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(33, 0.4);
    ctx.quadraticCurveTo(40, 1.2, 44, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30, 2.2);
    ctx.quadraticCurveTo(36, 4, 38, 6.4);
    ctx.stroke();
    ctx.restore();
  }

  /* ── 1. Song dynasty · 汴京虹桥 ─────────────────────────── */
  const songStage = function (ctx, top, t) {
    // ── sky ──
    const sky = ctx.createLinearGradient(0, top, 0, -38);
    sky.addColorStop(0, "#f3e5c2");
    sky.addColorStop(0.52, "#eed4a0");
    sky.addColorStop(1, "#e7c489");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -38 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, -26, -78, 24, "#dda75c", 0.42);
    ctx.beginPath(); ctx.arc(-26, -78, 6, 0, TAU);
    ctx.fillStyle = "rgba(216,158,80,0.92)"; ctx.fill();
    cloud(ctx, 10, -94, 17, "#fff8e7", 0.55);
    cloud(ctx, -38, -90, 11, "#fff8e7", 0.45);
    cloud(ctx, 32, -74, 9, "#fff8e7", 0.38);
    bird(ctx, -34, -88, 1.1, "rgba(67,48,29,0.5)");
    bird(ctx, -29, -91, 0.8, "rgba(67,48,29,0.45)");
    bird(ctx, 2, -84, 0.9, "rgba(67,48,29,0.4)");

    // ── far hills ──
    ridge(ctx, -50, 50, -42, 3.2, "rgba(140,112,72,0.26)", 3, 5, -38);

    // ── far bank strip ──
    ctx.fillStyle = "rgba(204,176,128,0.96)";
    ctx.fillRect(-50, -42, 100, 4);

    // ── city wall ──
    ctx.fillStyle = "rgba(212,184,136,0.98)";
    ctx.fillRect(-50, -46, 56, 8);
    ctx.strokeStyle = hexA(INK, 0.55);
    ctx.lineWidth = 0.28;
    ctx.strokeRect(-50, -46, 56, 8);
    for (let x = -50; x < 6; x += 2.1) {
      ctx.fillStyle = "rgba(220,194,150,0.98)";
      ctx.fillRect(x, -48.1, 1.15, 2.1);
      ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.14;
      ctx.strokeRect(x, -48.1, 1.15, 2.1);
    }
    // wall masonry
    for (let x = -48; x < 6; x += 3.4) {
      ctx.strokeStyle = hexA(INK, 0.16); ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(x, -45.8); ctx.lineTo(x, -38.2); ctx.stroke();
    }
    for (let yy = -44.6; yy < -38.2; yy += 2.2) {
      ctx.strokeStyle = hexA(INK, 0.12); ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.moveTo(-50, yy); ctx.lineTo(6, yy); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(74,50,28,0.28)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-50, -46); ctx.lineTo(6, -46); ctx.stroke();
    // gate passage
    ctx.beginPath();
    ctx.moveTo(-33.6, -38);
    ctx.lineTo(-33.6, -43.2);
    ctx.quadraticCurveTo(-30, -45.4, -26.4, -43.2);
    ctx.lineTo(-26.4, -38);
    ctx.closePath();
    ctx.fillStyle = "rgba(68,46,28,0.84)";
    ctx.fill();
    // gate tower
    cnGate(ctx, -34, -46, 14.5, 9.2, "rgba(224,197,152,0.98)", "rgba(178,106,64,0.96)", { arch: false });
    // banner on gate
    ctx.strokeStyle = INK; ctx.lineWidth = 0.28;
    ctx.beginPath(); ctx.moveTo(-41.4, -55.2); ctx.lineTo(-41.4, -67); ctx.stroke();
    const gw = Math.sin(t * 1.4) * 1.1;
    ctx.beginPath();
    ctx.moveTo(-41.2, -66.4);
    ctx.quadraticCurveTo(-37.4 + gw, -65.8, -35.4 + gw, -62.8);
    ctx.lineTo(-41.2, -61.4);
    ctx.closePath();
    ctx.fillStyle = RED; ctx.fill();

    // corner tower at the wall end
    ctx.fillStyle = "rgba(214,186,140,0.98)";
    ctx.fillRect(2, -52, 5.2, 14);
    ctx.strokeStyle = hexA(INK, 0.5); ctx.lineWidth = 0.24;
    ctx.strokeRect(2, -52, 5.2, 14);
    ctx.beginPath();
    ctx.moveTo(0.6, -52); ctx.quadraticCurveTo(2.4, -55.4, 4.6, -55.8);
    ctx.quadraticCurveTo(6.8, -55.4, 8.6, -52); ctx.closePath();
    ctx.fillStyle = "rgba(158,92,58,0.92)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.16; ctx.stroke();
    // ── city roofs behind the wall ──
    for (let i = 0; i < 7; i++) {
      const bx = -46 + i * 7.6;
      const bh = 3.4 + (i % 3) * 1.4;
      ctx.fillStyle = "rgba(210,180,136,0.95)";
      ctx.fillRect(bx, -46 - bh, 6.2, bh);
      ctx.strokeStyle = hexA(INK, 0.3); ctx.lineWidth = 0.14;
      ctx.strokeRect(bx, -46 - bh, 6.2, bh);
      ctx.beginPath();
      ctx.moveTo(bx - 0.8, -46 - bh);
      ctx.quadraticCurveTo(bx - 0.1, -47.4 - bh, bx + 1.2, -47.8 - bh);
      ctx.lineTo(bx + 5.0, -47.8 - bh);
      ctx.quadraticCurveTo(bx + 6.3, -47.4 - bh, bx + 7.0, -46 - bh);
      ctx.closePath();
      ctx.fillStyle = "rgba(154,90,56,0.92)"; ctx.fill();
      ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.12; ctx.stroke();
      ctx.strokeStyle = "rgba(92,47,30,0.35)"; ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.moveTo(bx - 0.2, -46.8 - bh); ctx.lineTo(bx + 6.4, -46.8 - bh); ctx.stroke();
    }
    // dense small roofs between
    for (let i = 0; i < 12; i++) {
      const bx = -48 + i * 4.6;
      const by = -46 - (i % 3) * 0.9;
      ctx.fillStyle = "rgba(196,164,118,0.9)";
      ctx.fillRect(bx, by - 2.2, 3.2, 2.2);
      ctx.beginPath();
      ctx.moveTo(bx - 0.5, by - 2.2); ctx.quadraticCurveTo(bx + 1.6, by - 3.6, bx + 3.7, by - 2.2); ctx.closePath();
      ctx.fillStyle = "rgba(146,86,54,0.8)"; ctx.fill();
    }
    // ── pagoda + far houses ──
    pagoda(ctx, 31, -38, 8, 6.6, "rgba(180,140,94,0.94)");
    for (let i = 0; i < 4; i++) {
      const bx = 8 + i * 10;
      const bw = 8.4;
      ctx.fillStyle = "rgba(206,174,128,0.92)";
      ctx.fillRect(bx, -43.4, bw, 5.4);
      ctx.strokeStyle = hexA(INK, 0.3); ctx.lineWidth = 0.18;
      ctx.strokeRect(bx, -43.4, bw, 5.4);
      // tiled hip roof
      ctx.beginPath();
      ctx.moveTo(bx - 1.5, -43.4);
      ctx.quadraticCurveTo(bx - 0.4, -45.6, bx + 1.4, -46.1);
      ctx.lineTo(bx + bw - 1.4, -46.1);
      ctx.quadraticCurveTo(bx + bw + 0.4, -45.6, bx + bw + 1.5, -43.4);
      ctx.closePath();
      ctx.fillStyle = "rgba(150,88,56,0.9)"; ctx.fill();
      ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.16; ctx.stroke();
      // window
      ctx.fillStyle = hexA(INK, 0.3);
      ctx.fillRect(bx + bw * 0.42, -41.4, bw * 0.16, 2.2);
    }
    // trees on far bank
    for (const tx of [-13, -6, 51]) {
      ctx.strokeStyle = "rgba(84,72,44,0.9)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(tx, -38); ctx.lineTo(tx, -46); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(tx, -48, 3.2, 2.2, 0, 0, TAU);
      ctx.fillStyle = "rgba(104,116,70,0.85)"; ctx.fill();
    }

    // ── river (diagonal band) ──
    const riv = ctx.createLinearGradient(0, -38, 0, -4);
    riv.addColorStop(0, "#94ada4");
    riv.addColorStop(0.5, "#7d9b93");
    riv.addColorStop(1, "#668680");
    ctx.beginPath();
    ctx.moveTo(-50, -38);
    ctx.lineTo(50, -38);
    ctx.lineTo(50, -4);
    ctx.lineTo(-50, -14);
    ctx.closePath();
    ctx.fillStyle = riv;
    ctx.fill();
    // water cross-hatching, clipped to the river band
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-50, -38); ctx.lineTo(50, -38); ctx.lineTo(50, -4); ctx.lineTo(-50, -14);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = "rgba(56,86,86,0.16)"; ctx.lineWidth = 0.16;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const yy = -37 + i * 2.6;
      ctx.moveTo(-50, yy);
      ctx.lineTo(50, yy - 2);
    }
    ctx.stroke();
    ctx.restore();
    // far bank line
    ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(-50, -38); ctx.lineTo(50, -38); ctx.stroke();
    // ripples
    for (let i = 0; i < 11; i++) {
      const yy = -36 + i * 3.0;
      const x1 = -50, x2 = 50;
      ctx.strokeStyle = "rgba(238,230,208," + (0.14 + i * 0.012) + ")";
      ctx.lineWidth = 0.15;
      ctx.beginPath();
      for (let x = x1; x <= x2; x += 7) {
        const ly = yy + Math.sin(x * 0.17 + t * 0.5 + i * 0.6) * 0.28;
        if (x === x1) ctx.moveTo(x, ly); else ctx.lineTo(x, ly);
      }
      ctx.stroke();
    }
    // river reflections from the wall
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(160,120,74,0.18)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-46 + i * 13, -37.4); ctx.lineTo(-44 + i * 13, -30); ctx.stroke();
    }

    // ── near bank / street ──
    ctx.fillStyle = "rgba(196,168,120,0.98)";
    ctx.beginPath();
    ctx.moveTo(-50, -14);
    ctx.lineTo(50, -4);
    ctx.lineTo(50, 0);
    ctx.lineTo(-50, 0);
    ctx.closePath();
    ctx.fill();
    // quay edge
    ctx.strokeStyle = hexA(INK, 0.42); ctx.lineWidth = 0.28;
    ctx.beginPath(); ctx.moveTo(-50, -14); ctx.lineTo(50, -4); ctx.stroke();
    ctx.strokeStyle = "rgba(238,228,204,0.35)"; ctx.lineWidth = 0.18;
    ctx.beginPath(); ctx.moveTo(-50, -14.7); ctx.lineTo(50, -4.7); ctx.stroke();
    // paving hatch
    hatch(ctx, -50, -14, 100, 8, "rgba(67,48,29,0.10)", 2.4, -0.12);
    // bank grass + stones
    for (let i = 0; i < 30; i++) {
      const gx = -48 + i * 3.3;
      const gy = -14 + ((gx + 50) / 100) * 10;
      ctx.strokeStyle = "rgba(104,96,58,0.7)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(gx, gy + 0.4); ctx.lineTo(gx + Math.sin(t + i) * 0.3, gy - 1.8 - (i % 3) * 0.5); ctx.stroke();
    }
    for (const [rx, ry, rr] of [[-30, -12.4, 1.1], [14, -8, 1.3], [40, -4.6, 1.0]]) {
      ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.6, 0, 0, TAU);
      ctx.fillStyle = "rgba(156,132,94,0.9)"; ctx.fill();
      ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.14; ctx.stroke();
    }
    // small wooden jetty
    ctx.strokeStyle = "rgba(74,50,30,0.75)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-4, -10.2); ctx.lineTo(6, -9.2); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-2 + i * 2.2, -10); ctx.lineTo(-2 + i * 2.2, -7.6); ctx.stroke();
    }
    // reflection of gate tower
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = "rgba(150,108,66,0.16)"; ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-42 + i * 3.4, -38);
      ctx.quadraticCurveTo(-41 + i * 3.4 + Math.sin(t + i) * 0.8, -33, -42 + i * 3.4, -29);
      ctx.stroke();
    }

    // ── rainbow bridge (diagonal, solid deck) ──
    const p0 = [-22, -11.2], pc = [2, -47], p1 = [26, -38];
    const qp = (u) => [
      (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * pc[0] + u * u * p1[0],
      (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * pc[1] + u * u * p1[1],
    ];
    const N = 22;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const q = qp(i / N);
      if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    }
    for (let i = N; i >= 0; i--) {
      const q = qp(i / N);
      ctx.lineTo(q[0], q[1] + 2.4);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(126,84,48,0.98)";
    ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.7); ctx.lineWidth = 0.26;
    ctx.stroke();
    // deck shadow line
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const q = qp(i / N);
      if (i === 0) ctx.moveTo(q[0], q[1] + 1.7); else ctx.lineTo(q[0], q[1] + 2.4);
    }
    ctx.strokeStyle = "rgba(50,34,20,0.55)"; ctx.lineWidth = 0.3; ctx.stroke();
    // timber arch ribs under the deck
    for (let k = 1; k <= 2; k++) {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const q = qp(i / N);
        const yy = q[1] + 2.4 + k * 0.7 + Math.sin((i / N) * Math.PI) * 0.6;
        if (i === 0) ctx.moveTo(q[0], yy); else ctx.lineTo(q[0], yy);
      }
      ctx.strokeStyle = "rgba(74,50,30,0.28)"; ctx.lineWidth = 0.22; ctx.stroke();
    }
    // railings + posts
    for (let i = 2; i < N; i += 3) {
      const q = qp(i / N);
      ctx.beginPath(); ctx.moveTo(q[0], q[1] - 0.1); ctx.lineTo(q[0], q[1] - 2.1);
      ctx.strokeStyle = hexA(INK, 0.6); ctx.lineWidth = 0.18; ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const q = qp(i / N);
      if (i === 0) ctx.moveTo(q[0], q[1] - 2.1); else ctx.lineTo(q[0], q[1] - 2.1);
    }
    ctx.strokeStyle = hexA(INK, 0.42); ctx.lineWidth = 0.16; ctx.stroke();
    // walkers (4 units)
    [0.10, 0.20, 0.30, 0.42, 0.54, 0.66, 0.78, 0.88].forEach((u, i) => {
      const q = qp(u);
      person(ctx, q[0], q[1] - 0.1, 0.19, "rgba(60,43,26,0.96)", {
        phase: t * 1.2 + i, seed: i,
        fill: i % 4 === 0 ? "rgba(168,64,44,0.95)" : i % 3 === 0 ? "rgba(84,104,112,0.95)" : "rgba(112,88,58,0.95)",
        hat: i % 2 ? "cone" : "straw",
        arm: i % 3 === 0,
      });
    });
    // bridge banner
    const bq = qp(0.92);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.26;
    ctx.beginPath(); ctx.moveTo(bq[0], bq[1]); ctx.lineTo(bq[0], bq[1] - 6.4); ctx.stroke();
    const bw2 = Math.sin(t * 1.6 + 1) * 0.8;
    ctx.beginPath();
    ctx.moveTo(bq[0] + 0.2, bq[1] - 6.2);
    ctx.quadraticCurveTo(bq[0] + 4.6 + bw2, bq[1] - 5.6, bq[0] + 6.4 + bw2, bq[1] - 2.6);
    ctx.lineTo(bq[0] + 0.2, bq[1] - 1.2);
    ctx.closePath();
    ctx.fillStyle = RED; ctx.fill();

    // bridge landing at the far bank
    ctx.fillStyle = "rgba(206,176,130,0.98)";
    ctx.beginPath();
    ctx.moveTo(23.2, -38);
    ctx.lineTo(30.4, -38);
    ctx.lineTo(29.4, -34.6);
    ctx.lineTo(24.2, -34.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.5); ctx.lineWidth = 0.2; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(24 + i * 1.8, -34.6 + i * 0.8); ctx.lineTo(29.6 - i * 0.6, -34.6 + i * 0.8);
      ctx.strokeStyle = hexA(INK, 0.3); ctx.lineWidth = 0.14; ctx.stroke();
    }
    person(ctx, 26.2, -35.2, 0.18, "rgba(60,43,26,0.96)", { phase: t + 4, fill: "rgba(112,88,58,0.95)", hat: "straw" });
    person(ctx, 28.2, -35.2, 0.18, "rgba(60,43,26,0.96)", { phase: t + 5, fill: "rgba(168,64,44,0.95)", hat: "cone" });

    // ── boats ──
    const boat = (sx, sy, sc, canopy) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(sc, sc);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(-3, 2.6, 4, 2.2);
      ctx.quadraticCurveTo(8, 2, 9, -0.6);
      ctx.quadraticCurveTo(0, 1.4, -8, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(112,76,44,0.98)"; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.22; ctx.stroke();
      if (canopy) {
        ctx.beginPath();
        ctx.moveTo(-4.8, -0.4);
        ctx.quadraticCurveTo(-1.6, -4.6, 2.4, -0.4);
        ctx.lineTo(2.4, 0.4); ctx.lineTo(-4.8, 0.4); ctx.closePath();
        ctx.fillStyle = "rgba(214,186,140,0.95)"; ctx.fill();
        ctx.strokeStyle = hexA(INK, 0.55); ctx.lineWidth = 0.18; ctx.stroke();
      }
      ctx.strokeStyle = "rgba(67,48,29,0.85)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(4.8, -3.6); ctx.lineTo(7.6, 0.8); ctx.stroke();
      person(ctx, 4.6, -0.2, 0.17, "rgba(60,43,26,0.96)", { phase: t + sx, hat: "straw" });
      ctx.restore();
    };
    boat(-14, -24, 1.0, true);
    boat(30, -20, 1.15, false);
    boat(6, -9.4, 1.4, true);
    // distant sails
    for (const [sx, sy] of [[-38, -30], [44, -28]]) {
      ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 0.2, sy - 5.8); ctx.lineTo(sx + 3.2, sy - 3.2); ctx.lineTo(sx + 0.2, sy - 1.2); ctx.closePath();
      ctx.fillStyle = "rgba(232,220,192,0.75)"; ctx.fill();
    }

    // ── right-bank tea house ──
    ctx.fillStyle = "rgba(206,176,130,0.98)";
    ctx.fillRect(28, -6, 9, 5.2);
    ctx.strokeStyle = hexA(INK, 0.55); ctx.lineWidth = 0.22;
    ctx.strokeRect(28, -6, 9, 5.2);
    ctx.beginPath();
    ctx.moveTo(26.6, -6);
    ctx.quadraticCurveTo(28.4, -11, 32.5, -11.6);
    ctx.quadraticCurveTo(36.6, -11, 38.4, -6);
    ctx.closePath();
    ctx.fillStyle = "rgba(150,88,56,0.92)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.18; ctx.stroke();
    // door + window
    ctx.fillStyle = hexA(INK, 0.4);
    ctx.fillRect(31.2, -3.6, 2.2, 2.8);
    ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.16;
    ctx.strokeRect(34, -4.6, 1.8, 1.3);
    // awning
    ctx.beginPath();
    ctx.moveTo(24, -3.2); ctx.lineTo(27.2, -7); ctx.lineTo(29.8, -3); ctx.closePath();
    ctx.fillStyle = "rgba(184,138,62,0.82)"; ctx.fill();
    person(ctx, 25.2, -2.6, 0.19, "rgba(60,43,26,0.96)", { phase: t + 2, hat: "straw", fill: "rgba(168,64,44,0.94)" });
    person(ctx, 27.0, -2.4, 0.19, "rgba(60,43,26,0.96)", { phase: t + 3, hat: "cone", fill: "rgba(110,96,72,0.94)" });

    // ── foreground market row ──
    const stall = (sx, sy, sc, awning) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(sc, sc);
      // counter
      ctx.fillStyle = "rgba(186,150,100,0.98)";
      ctx.fillRect(-5, -2.4, 10, 2.4);
      ctx.strokeStyle = hexA(INK, 0.55); ctx.lineWidth = 0.22;
      ctx.strokeRect(-5, -2.4, 10, 2.4);
      // posts + awning
      ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.24;
      ctx.beginPath(); ctx.moveTo(-4.6, -2.4); ctx.lineTo(-4.6, -7.2); ctx.moveTo(4.6, -2.4); ctx.lineTo(4.6, -7.2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6.6, -7);
      ctx.quadraticCurveTo(-3.4, -9.4, 0, -9.5);
      ctx.quadraticCurveTo(3.4, -9.4, 6.6, -7);
      ctx.closePath();
      ctx.fillStyle = awning; ctx.fill();
      ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.16; ctx.stroke();
      // goods
      ctx.fillStyle = "rgba(160,126,80,0.95)";
      ctx.beginPath(); ctx.arc(-3, -3.2, 1.0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-1.2, -3.4, 0.8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -3.2, 0.9, 0, TAU); ctx.fill();
      ctx.restore();
    };
    stall(-43, -11.4, 0.9, "rgba(184,138,62,0.88)");
    stall(-33, -9.8, 1.0, "rgba(168,64,44,0.78)");
    person(ctx, -41.2, -10.6, 0.2, "rgba(60,43,26,0.96)", { phase: t + 6, fill: "rgba(112,88,58,0.95)", hat: "straw" });
    person(ctx, -38.8, -10.2, 0.2, "rgba(60,43,26,0.96)", { phase: t + 7, fill: "rgba(84,104,112,0.95)", hat: "cone" });
    person(ctx, -32.2, -9.2, 0.2, "rgba(60,43,26,0.96)", { phase: t + 8, fill: "rgba(168,64,44,0.95)", hat: "straw" });
    person(ctx, -30.2, -8.8, 0.2, "rgba(60,43,26,0.96)", { phase: t + 9, fill: "rgba(112,88,58,0.95)", hat: "cone" });
    // baskets + barrel
    for (const [bx, by, br] of [[-37.2, -8.4, 1.1], [-35.8, -8.1, 0.8], [-45.8, -10.2, 0.9]]) {
      ctx.beginPath(); ctx.ellipse(bx, by, br, br * 0.6, 0, 0, TAU);
      ctx.fillStyle = "rgba(170,136,88,0.95)"; ctx.fill();
      ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.14; ctx.stroke();
    }
    // donkey
    horse(ctx, -24, -7.4, 0.24, "rgba(120,104,82,0.95)", t + 1, {});
    // dog
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(-16.4, -6.6); ctx.lineTo(-15.2, -6.6); ctx.lineTo(-14.6, -7.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(-14.3, -7.8, 0.4, 0, TAU); ctx.fillStyle = "rgba(74,50,30,0.9)"; ctx.fill();

    // tea-house lantern
    glow(ctx, 30.4, -6.6, 2.4, "#e0a85e", 0.45);
    ctx.beginPath(); ctx.arc(30.4, -6.6, 0.7, 0, TAU);
    ctx.fillStyle = "rgba(240,196,110,0.95)"; ctx.fill();
    // bridge reflection
    for (let i = 0; i < 5; i++) {
      const u = 0.16 + i * 0.16;
      const q = qp(u);
      ctx.strokeStyle = "rgba(214,190,154,0.22)";
      ctx.lineWidth = 0.24;
      ctx.beginPath();
      ctx.moveTo(q[0], q[1] + 2.6);
      ctx.lineTo(q[0] + 1.4, q[1] + 5.6 + i * 0.6);
      ctx.stroke();
    }
    // ── left willow framing ──
    ctx.strokeStyle = "rgba(90,76,46,0.96)";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-47, -13.6);
    ctx.quadraticCurveTo(-42, -28, -45, -44);
    ctx.stroke();
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-45, -42); ctx.quadraticCurveTo(-39, -36, -37, -30);
    ctx.moveTo(-45, -41); ctx.quadraticCurveTo(-49, -34, -50, -26);
    ctx.stroke();
    for (let i = 0; i < 13; i++) {
      const a = -1.15 + i * 0.125;
      const x0 = -45 + Math.cos(a) * 4;
      const y0 = -42 + Math.sin(a) * 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + Math.cos(a) * 5, y0 + 6, x0 + Math.cos(a) * 6.5, y0 + 11 + Math.sin(t + i) * 0.4);
      ctx.strokeStyle = "rgba(96,108,62,0.82)"; ctx.lineWidth = 0.17; ctx.stroke();
    }

    // ── street life: porters, cart, dog ──
    const street = [
      { x: -25, y: -10, f: "rgba(112,88,58,0.95)", hat: "conveyor" },
      { x: -20, y: -9, f: "rgba(84,104,112,0.95)", hat: "straw" },
      { x: -4, y: -7, f: "rgba(168,64,44,0.95)", hat: "cone" },
      { x: 2, y: -6.4, f: "rgba(112,88,58,0.95)", hat: "straw" },
      { x: 10, y: -5.6, f: "rgba(84,104,112,0.95)", hat: "cone" },
      { x: 38, y: -3.2, f: "rgba(112,88,58,0.95)", hat: "straw" },
      { x: 43, y: -2.4, f: "rgba(168,64,44,0.95)", hat: "cone" },
    ];
    street.forEach((s, i) => {
      const gy = -14 + ((s.x + 50) / 100) * 10; // follows the bank slope
      person(ctx, s.x, gy + 1, 0.2, "rgba(60,43,26,0.96)", { phase: t + i, fill: s.f, hat: s.hat === "conveyor" ? "straw" : s.hat, bundle: i === 0 });
      if (s.hat === "conveyor") {
        ctx.strokeStyle = "rgba(67,48,29,0.85)"; ctx.lineWidth = 0.18;
        ctx.beginPath(); ctx.moveTo(s.x - 0.4, gy - 2.4); ctx.lineTo(s.x + 3.4, gy - 2.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(s.x + 1.2, gy - 2.4, 0.9, 0, TAU); ctx.fillStyle = "rgba(160,126,80,0.9)"; ctx.fill();
        ctx.beginPath(); ctx.arc(s.x + 2.6, gy - 2.6, 0.9, 0, TAU); ctx.fill();
      }
    });
    // ox cart
    ctx.save();
    ctx.translate(-14, -7.4);
    ctx.scale(0.42, 0.42);
    ox(ctx, 0, 0, 0.9, "rgba(96,70,44,0.9)", t);
    ctx.strokeStyle = "rgba(67,48,29,0.85)"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-10, -3); ctx.lineTo(-16, -3); ctx.stroke();
    ctx.strokeRect(-22, -6.4, 7, 5);
    ctx.beginPath(); ctx.arc(-20, 0, 1.8, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(-16, 0, 1.8, 0, TAU); ctx.stroke();
    ctx.restore();

    // reeds by the near bank
    for (let i = 0; i < 12; i++) {
      const rx = -48 + i * 8.6;
      const ry = -13.8 + ((rx + 50) / 100) * 10;
      ctx.strokeStyle = "rgba(108,104,60,0.8)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(t + i) * 0.5, ry - 3.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx + Math.sin(t + i) * 0.5, ry - 3.7, 0.28, 0, TAU);
      ctx.fillStyle = "rgba(120,96,52,0.9)"; ctx.fill();
    }

    // dust motes
    for (let i = 0; i < 10; i++) {
      const px = -50 + ((i * 37 + t * 3) % 100);
      const py = -70 + ((i * 53) % 50) + Math.sin(t + i) * 1.2;
      ctx.beginPath(); ctx.arc(px, py, 0.14, 0, TAU);
      ctx.fillStyle = "rgba(150,110,60,0.28)"; ctx.fill();
    }
  };

  const songMap = function (ctx, t) {
    glow(ctx, -30, -64, 34, "#dda75c", 0.34);
    ctx.beginPath(); ctx.arc(-30, -64, 8.5, 0, TAU);
    ctx.fillStyle = "rgba(216,158,80,0.9)"; ctx.fill();
    // distant hill, tapered at both ends
    ctx.beginPath();
    ctx.moveTo(-64, -30);
    ctx.quadraticCurveTo(-44, -44, -22, -40);
    ctx.quadraticCurveTo(0, -36, 24, -42);
    ctx.quadraticCurveTo(46, -46, 64, -32);
    ctx.lineTo(62, -24); ctx.lineTo(-62, -24);
    ctx.closePath();
    ctx.fillStyle = "rgba(150,122,80,0.34)";
    ctx.fill();
    // city wall
    ctx.fillStyle = "rgba(210,182,134,0.98)";
    ctx.fillRect(-58, -42, 54, 11);
    ctx.strokeStyle = hexA(INK, 0.55); ctx.lineWidth = 0.8;
    ctx.strokeRect(-58, -42, 54, 11);
    for (let x = -58; x < -4; x += 3.2) {
      ctx.fillStyle = "rgba(220,194,150,0.98)";
      ctx.fillRect(x, -44.6, 1.8, 2.8);
      ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.3;
      ctx.strokeRect(x, -44.6, 1.8, 2.8);
    }
    for (let x = -56; x < -4; x += 5) {
      ctx.strokeStyle = hexA(INK, 0.14); ctx.lineWidth = 0.24;
      ctx.beginPath(); ctx.moveTo(x, -41.8); ctx.lineTo(x, -31.2); ctx.stroke();
    }
    // gate passage
    ctx.beginPath();
    ctx.moveTo(-42, -31);
    ctx.lineTo(-42, -37.4);
    ctx.quadraticCurveTo(-38, -40, -34, -37.4);
    ctx.lineTo(-34, -31);
    ctx.closePath();
    ctx.fillStyle = "rgba(68,46,28,0.82)"; ctx.fill();
    cnGate(ctx, -38, -42, 18, 11, "rgba(224,197,152,0.98)", "rgba(178,106,64,0.96)", { arch: false });
    // corner tower
    ctx.fillStyle = "rgba(214,186,140,0.98)";
    ctx.fillRect(-8, -50, 6, 19);
    ctx.strokeStyle = hexA(INK, 0.5); ctx.lineWidth = 0.5;
    ctx.strokeRect(-8, -50, 6, 19);
    ctx.beginPath();
    ctx.moveTo(-10.2, -50); ctx.quadraticCurveTo(-8, -55.6, -5, -56);
    ctx.quadraticCurveTo(-2, -55.6, 0.2, -50); ctx.closePath();
    ctx.fillStyle = "rgba(158,92,58,0.92)"; ctx.fill();
    // roofs behind the wall
    for (let i = 0; i < 8; i++) {
      const bx = -56 + i * 6.4;
      const bh = 4 + (i % 3) * 1.8;
      ctx.fillStyle = "rgba(206,174,128,0.95)";
      ctx.fillRect(bx, -42 - bh, 5.2, bh);
      ctx.strokeStyle = hexA(INK, 0.28); ctx.lineWidth = 0.3;
      ctx.strokeRect(bx, -42 - bh, 5.2, bh);
      ctx.beginPath();
      ctx.moveTo(bx - 0.8, -42 - bh);
      ctx.quadraticCurveTo(bx + 2.6, -44.8 - bh, bx + 6.0, -42 - bh);
      ctx.closePath();
      ctx.fillStyle = "rgba(150,88,56,0.88)"; ctx.fill();
    }
    // pagoda
    pagoda(ctx, 34, -34, 7, 9.5, "rgba(178,138,92,0.94)");
    // river — tapered organic band
    const riv = ctx.createLinearGradient(0, -26, 0, -2);
    riv.addColorStop(0, "#94ada4");
    riv.addColorStop(1, "#668680");
    ctx.beginPath();
    ctx.moveTo(-66, -25);
    ctx.quadraticCurveTo(-34, -28, -2, -27);
    ctx.quadraticCurveTo(34, -26, 66, -22);
    ctx.lineTo(62, -2);
    ctx.quadraticCurveTo(30, -6, 0, -8);
    ctx.quadraticCurveTo(-34, -10, -62, -6);
    ctx.quadraticCurveTo(-66, -14, -66, -25);
    ctx.closePath();
    ctx.fillStyle = riv;
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "rgba(238,230,208,0.34)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-58, -20 + i * 2.6);
      ctx.quadraticCurveTo(0, -23 + i * 2.6 + Math.sin(t + i) * 0.8, 56, -18 + i * 2.6);
      ctx.stroke();
    }
    // near bank / foreground: fills to the bottom of the medallion
    ctx.beginPath();
    ctx.moveTo(-70, -7);
    ctx.quadraticCurveTo(-30, -12, 0, -10);
    ctx.quadraticCurveTo(32, -8, 70, -4);
    ctx.lineTo(70, 32);
    ctx.lineTo(-70, 32);
    ctx.closePath();
    ctx.fillStyle = "rgba(196,168,120,0.95)";
    ctx.fill();
    // quay edge
    ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-70, -7); ctx.quadraticCurveTo(-30, -12, 0, -10); ctx.quadraticCurveTo(32, -8, 70, -4); ctx.stroke();
    // reeds + grass along the quay
    for (let i = 0; i < 16; i++) {
      const gx = -62 + i * 8;
      const gy = -6.4 + Math.sin(i * 0.7) * 1.2;
      ctx.strokeStyle = "rgba(104,100,60,0.75)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(gx, gy + 1); ctx.lineTo(gx + Math.sin(t + i) * 0.8, gy - 4); ctx.stroke();
    }
    for (const [rx, ry, rr] of [[-34, -3, 2.2], [30, -1, 1.6], [-8, -2, 1.2]]) {
      ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.55, 0, 0, TAU);
      ctx.fillStyle = "rgba(156,132,94,0.85)"; ctx.fill();
    }
    // foreground figure and a moored skiff
    person(ctx, -8, -1.6, 0.5, "rgba(60,43,26,0.95)", { phase: t, hat: "straw", fill: "rgba(112,88,58,0.95)" });
    person(ctx, 34, 0.6, 0.46, "rgba(60,43,26,0.95)", { phase: t + 1, hat: "cone", fill: "rgba(168,64,44,0.95)" });
    ctx.save(); ctx.translate(-46, -1.8); ctx.scale(1.6, 1.6);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, 3, 9, 0.4); ctx.quadraticCurveTo(1, 1.8, -8, 0); ctx.closePath();
    ctx.fillStyle = "rgba(112,76,44,0.98)"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.restore();
    // bridge (solid deck)
    const bx0 = -26, bx1 = 22, by0 = -24, by1 = -28, cy = -42;
    const qp = (u) => [
      (1 - u) * (1 - u) * bx0 + 2 * (1 - u) * u * ((bx0 + bx1) / 2) + u * u * bx1,
      (1 - u) * (1 - u) * by0 + 2 * (1 - u) * u * cy + u * u * by1,
    ];
    const N = 18;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const q = qp(i / N); if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
    for (let i = N; i >= 0; i--) { const q = qp(i / N); ctx.lineTo(q[0], q[1] + 3.2); }
    ctx.closePath();
    ctx.fillStyle = "rgba(126,84,48,0.98)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.7); ctx.lineWidth = 0.5; ctx.stroke();
    for (let i = 2; i < N; i += 3) {
      const q = qp(i / N);
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0], q[1] - 4.2);
      ctx.strokeStyle = hexA(INK, 0.55); ctx.lineWidth = 0.4; ctx.stroke();
    }
    [0.16, 0.28, 0.40, 0.54, 0.68, 0.82].forEach((u, i) => {
      const q = qp(u);
      person(ctx, q[0], q[1] - 0.4, 0.27, "rgba(60,43,26,0.96)", {
        phase: t + i, fill: i % 2 ? "rgba(168,64,44,0.95)" : "rgba(112,88,58,0.95)", hat: i % 2 ? "cone" : "straw",
      });
    });
    // bridge banner
    const bq = qp(0.9);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(bq[0], bq[1]); ctx.lineTo(bq[0], bq[1] - 10); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bq[0] + 0.2, bq[1] - 9.6);
    ctx.quadraticCurveTo(bq[0] + 6.4, bq[1] - 8.6, bq[0] + 8.8, bq[1] - 4.2);
    ctx.lineTo(bq[0] + 0.2, bq[1] - 2.2);
    ctx.closePath();
    ctx.fillStyle = RED; ctx.fill();
    // boats
    for (const [sx, sy, sc] of [[42, -16, 1.25], [8, -9, 1.4], [-14, -18, 0.95]]) {
      ctx.save(); ctx.translate(sx, sy); ctx.scale(sc, sc);
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-3, 2.6, 4, 2.2); ctx.quadraticCurveTo(8, 2, 9, -0.6);
      ctx.quadraticCurveTo(0, 1.4, -8, 0); ctx.closePath();
      ctx.fillStyle = "rgba(112,76,44,0.98)"; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4.6, -0.4); ctx.quadraticCurveTo(-1.4, -4.4, 2.6, -0.4);
      ctx.lineTo(2.6, 0.4); ctx.lineTo(-4.6, 0.4); ctx.closePath();
      ctx.fillStyle = "rgba(214,186,140,0.94)"; ctx.fill();
      person(ctx, 5, -0.2, 0.22, "rgba(60,43,26,0.96)", { phase: t, hat: "straw" });
      ctx.restore();
    }
    // willow
    ctx.strokeStyle = "rgba(90,76,46,0.95)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(56, -2); ctx.quadraticCurveTo(61, -24, 55, -44); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(55, -42);
      ctx.quadraticCurveTo(46 + i * 2, -30, 48 + i * 2.4, -14);
      ctx.strokeStyle = "rgba(96,108,62,0.75)"; ctx.lineWidth = 0.45; ctx.stroke();
    }
    bird(ctx, -54, -64, 2.0, "rgba(67,48,29,0.45)");
    bird(ctx, -48, -68, 1.4, "rgba(67,48,29,0.4)");
  };

  /* ── 2. Qing enters Beijing · 山海关 ─────────────────────── */
  const qingStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -30);
    sky.addColorStop(0, "#cfcab8");
    sky.addColorStop(0.5, "#ded2b8");
    sky.addColorStop(1, "#e6cfa4");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -30 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 4, -46, 26, "#cf9854", 0.42);
    ctx.beginPath(); ctx.arc(4, -46, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(206,148,78,0.88)"; ctx.fill();
    cloud(ctx, -26, -86, 22, "rgba(248,240,222,0.5)", 0.55);
    cloud(ctx, 26, -78, 16, "rgba(248,240,222,0.45)", 0.5);

    // haze bands near the pass
    ctx.save();
    ctx.globalAlpha = 0.28;
    cloud(ctx, -10, -36, 34, "#f4e6c8", 0.5);
    cloud(ctx, 16, -32, 22, "#f4e6c8", 0.45);
    ctx.restore();
    bird(ctx, -38, -78, 1.3, "rgba(67,48,29,0.4)");
    bird(ctx, -32, -82, 0.9, "rgba(67,48,29,0.35)");
    bird(ctx, 30, -86, 1.1, "rgba(67,48,29,0.32)");
    // far mountains
    ridge(ctx, -50, -6, -44, 13, "rgba(126,108,80,0.34)", 9, 4, -30);
    ridge(ctx, 4, 50, -46, 12, "rgba(126,108,80,0.34)", 21, 4, -30);
    // near mountains
    ridge(ctx, -50, 2, -34, 18, "rgba(108,88,62,0.56)", 4, 4, -30);
    ridge(ctx, -2, 50, -36, 16, "rgba(108,88,62,0.56)", 12, 4, -30);
    hatch(ctx, -50, -46, 40, 20, "rgba(67,48,29,0.16)", 2.2, -0.7);
    hatch(ctx, 10, -46, 40, 18, "rgba(67,48,29,0.16)", 2.2, -0.7);

    // distant wall winding over the left ridge
    ctx.beginPath();
    ctx.moveTo(-50, -64);
    ctx.lineTo(-40, -58);
    ctx.lineTo(-30, -50);
    ctx.lineTo(-20, -45);
    ctx.lineTo(-20, -41);
    ctx.lineTo(-32, -46);
    ctx.lineTo(-42, -54);
    ctx.lineTo(-50, -60);
    ctx.closePath();
    ctx.fillStyle = "rgba(202,178,136,0.55)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,66,40,0.35)"; ctx.lineWidth = 0.22; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const dx = -48 + i * 5;
      const dy = -61 + i * 3.2;
      ctx.fillStyle = "rgba(206,182,140,0.6)";
      ctx.fillRect(dx, dy - 1.2, 1.2, 1.2);
    }

    // Great Wall band
    const wall = [[-50, -52], [-42, -51], [-36, -48], [-32, -43], [-28, -37], [-24, -33.5], [-20, -32], [-10, -31.5], [10, -31.5], [20, -32], [24, -33.5], [28, -37], [32, -43], [36, -48], [42, -51], [50, -52]];
    ctx.beginPath();
    ctx.moveTo(wall[0][0], wall[0][1]);
    for (let i = 1; i < wall.length; i++) ctx.lineTo(wall[i][0], wall[i][1]);
    ctx.lineTo(50, -45);
    for (let i = wall.length - 1; i >= 0; i--) ctx.lineTo(wall[i][0], wall[i][1] + 7.2);
    ctx.closePath();
    ctx.fillStyle = "rgba(190,162,120,0.96)";
    ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.6);
    ctx.lineWidth = 0.3;
    ctx.stroke();
    // parapet shadow line
    ctx.beginPath();
    ctx.moveTo(wall[0][0], wall[0][1] + 1.2);
    for (let i = 1; i < wall.length; i++) ctx.lineTo(wall[i][0], wall[i][1] + 1.2);
    ctx.strokeStyle = "rgba(74,48,28,0.45)"; ctx.lineWidth = 0.7; ctx.stroke();
    // crenellations
    for (let i = 0; i < wall.length - 1; i++) {
      const [x0, y0] = wall[i], [x1, y1] = wall[i + 1];
      for (let k = 0; k < 3; k++) {
        const x = lerp(x0, x1, (k + 0.5) / 3);
        const y = lerp(y0, y1, (k + 0.5) / 3);
        ctx.fillStyle = "rgba(200,172,130,0.98)";
        ctx.fillRect(x - 0.85, y - 1.7, 1.7, 1.7);
        ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.15;
        ctx.strokeRect(x - 0.85, y - 1.7, 1.7, 1.7);
      }
    }
    // wall masonry following the face
    ctx.strokeStyle = "rgba(90,62,36,0.18)"; ctx.lineWidth = 0.14;
    for (let i = 0; i < wall.length - 1; i++) {
      const [x0, y0] = wall[i], [x1, y1] = wall[i + 1];
      for (let k = 1; k < 5; k++) {
        const x = lerp(x0, x1, k / 5), y = lerp(y0, y1, k / 5);
        ctx.beginPath(); ctx.moveTo(x, y + 1.6); ctx.lineTo(x, y + 6.6); ctx.stroke();
      }
    }
    // horizontal courses
    ctx.strokeStyle = "rgba(90,62,36,0.12)"; ctx.lineWidth = 0.12;
    for (let j = 1; j < 3; j++) {
      ctx.beginPath();
      for (let i = 0; i < wall.length; i++) {
        const p = wall[i];
        const yy = p[1] + j * 2.0;
        if (i === 0) ctx.moveTo(p[0], yy); else ctx.lineTo(p[0], yy);
      }
      ctx.stroke();
    }
    // small flags along the wall
    for (const fx of [-40, -20, 20, 40]) {
      const fy = -52 + Math.abs(fx) * 0.03;
      ctx.strokeStyle = INK; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx + 0.2, fy - 4.8); ctx.lineTo(fx + 3.4, fy - 4.2); ctx.lineTo(fx + 0.2, fy - 2.8); ctx.closePath();
      ctx.fillStyle = fx < 0 ? "rgba(168,64,44,0.85)" : "rgba(78,106,122,0.85)"; ctx.fill();
    }
    // wall watchtowers
    for (const [tx, ty] of [[-36, -48], [36, -48]]) {
      ctx.fillStyle = "rgba(198,168,126,0.98)";
      ctx.fillRect(tx - 3, ty - 7, 6, 7);
      ctx.strokeStyle = hexA(INK, 0.6); ctx.lineWidth = 0.24;
      ctx.strokeRect(tx - 3, ty - 7, 6, 7);
      for (let k = -2.6; k <= 2.2; k += 1.3) ctx.fillRect(tx + k, ty - 8.6, 0.9, 1.6);
    }

    // ground / pass
    const gr = ctx.createLinearGradient(0, -30, 0, 0);
    gr.addColorStop(0, "rgba(194,164,116,0.72)");
    gr.addColorStop(1, "rgba(176,142,96,0.96)");
    ctx.fillStyle = gr;
    ctx.fillRect(-50, -30, 100, 30);
    // road
    ctx.beginPath();
    ctx.moveTo(-7, -30);
    ctx.quadraticCurveTo(-2, -16, 12, 0);
    ctx.lineTo(30, 0);
    ctx.quadraticCurveTo(12, -16, 7, -30);
    ctx.closePath();
    ctx.fillStyle = "rgba(206,174,124,0.55)";
    ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.18); ctx.lineWidth = 0.2; ctx.stroke();

    // gate tower (pass fortress)
    cnGate(ctx, 0, -30, 24, 18, "rgba(216,187,142,0.98)", "rgba(174,104,62,0.95)", { arch: true, double: true });
    // plaque
    ctx.fillStyle = "rgba(92,58,38,0.92)";
    ctx.fillRect(-3.6, -45.6, 7.2, 1.9);
    ctx.strokeStyle = hexA(GOLD, 0.7); ctx.lineWidth = 0.12; ctx.strokeRect(-3.6, -45.6, 7.2, 1.9);
    // dust and smoke drifting over the pass
    for (let i = 0; i < 5; i++) {
      const q = (t * 0.12 + i * 0.18) % 1;
      ctx.beginPath();
      ctx.arc(2 + q * 9, -50 - q * 20, 2.2 + q * 5.6, 0, TAU);
      ctx.fillStyle = "rgba(122,106,88," + (0.09 * (1 - q)) + ")";
      ctx.fill();
    }

    // cavalry
    const riders = [
      { x: -8, y: -27, s: 0.34, col: "rgba(84,62,40,0.78)" },
      { x: 6, y: -25, s: 0.40, col: "rgba(80,58,38,0.84)" },
      { x: 18, y: -21, s: 0.48, col: "rgba(74,53,33,0.9)" },
      { x: 0, y: -16, s: 0.56, col: "rgba(67,48,29,0.95)" },
      { x: 20, y: -10, s: 0.66, col: "rgba(67,48,29,0.95)" },
      { x: -4, y: -5, s: 0.78, col: "rgba(58,42,26,0.98)" },
    ];
    riders.forEach((r, i) => {
      horse(ctx, r.x, r.y, r.s, r.col, t + i * 0.7, {
        rider: true,
        riderCol: i % 3 === 0 ? "rgba(150,60,42,0.95)" : i % 3 === 1 ? "rgba(120,88,52,0.95)" : "rgba(78,106,122,0.95)",
        banner: i === 3 ? "rgba(78,106,122,0.9)" : i === 4 ? "rgba(195,154,74,0.92)" : null,
      });
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.35 + k * 0.3 + i * 0.13) % 1;
        ctx.beginPath();
        ctx.arc(r.x - 3 + k * 2.4, r.y + 0.6 - q * 2, 1.8 + q * 4.4, 0, TAU);
        ctx.fillStyle = "rgba(198,170,126," + (0.14 * (1 - q)) + ")";
        ctx.fill();
      }
    });

    // foreground rocks & grass
    for (const [rx, ry, rs] of [[-45, 0, 6.4], [43, 0, 7.2], [-36, -2, 4.2], [36, -2, 4.8]]) {
      ctx.beginPath();
      ctx.ellipse(rx, ry - 1.4, rs, rs * 0.5, 0, 0, TAU);
      ctx.fillStyle = "rgba(142,114,76,0.9)"; ctx.fill();
      ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.2; ctx.stroke();
      hatch(ctx, rx - rs, ry - rs * 0.8, rs * 2, rs * 0.7, "rgba(67,48,29,0.2)", 1.4, -0.8);
    }
    for (let i = 0; i < 22; i++) {
      const gx = -50 + i * 4.6;
      const gy = -0.4 + (i % 4) * 0.3;
      ctx.strokeStyle = "rgba(104,96,58,0.7)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.sin(t + i) * 0.5, gy - 3.4 - (i % 3)); ctx.stroke();
    }
    // fallen banner
    ctx.strokeStyle = "rgba(67,48,29,0.55)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(32, -1); ctx.lineTo(41, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(39.2, -6.8); ctx.lineTo(44, -9.6); ctx.lineTo(40.6, -5.2); ctx.closePath();
    ctx.fillStyle = "rgba(140,58,42,0.6)"; ctx.fill();

    // foreground scrub
    for (let i = 0; i < 26; i++) {
      const gx = -48 + i * 3.8;
      const gy = -0.2 - (i % 5) * 0.3;
      ctx.strokeStyle = "rgba(104,96,58,0.65)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.sin(t + i) * 0.6, gy - 2.8 - (i % 3) * 0.7); ctx.stroke();
    }
    // dust over the column
    for (let i = 0; i < 5; i++) {
      const q = (t * 0.22 + i * 0.19) % 1;
      ctx.beginPath(); ctx.arc(-8 + i * 8, -4 - q * 8, 3 + q * 7, 0, TAU);
      ctx.fillStyle = "rgba(202,172,124," + (0.10 * (1 - q)) + ")"; ctx.fill();
    }
    // birds
    bird(ctx, -40, -80, 1.4, "rgba(67,48,29,0.4)");
    bird(ctx, -34, -84, 1.0, "rgba(67,48,29,0.35)");
    // dark foreground boulder and spear
    ctx.beginPath();
    ctx.moveTo(31, 0); ctx.lineTo(33.5, -5.2); ctx.lineTo(41, -6.8); ctx.lineTo(49, -3.2); ctx.lineTo(50, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(78,60,42,0.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(40,30,20,0.7)"; ctx.lineWidth = 0.25; ctx.stroke();
    hatch(ctx, 32, -6.6, 18, 6.4, "rgba(40,30,20,0.25)", 1.6, -0.6);
    ctx.strokeStyle = "rgba(60,42,26,0.95)"; ctx.lineWidth = 0.32;
    ctx.beginPath(); ctx.moveTo(38, 0); ctx.lineTo(46, -14); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(46, -14); ctx.lineTo(45.4, -11.8); ctx.lineTo(46.6, -11.8);
    ctx.closePath(); ctx.fillStyle = "rgba(150,146,132,0.9)"; ctx.fill();
  };

  const qingMap = function (ctx, t) {
    glow(ctx, 2, -66, 38, "#cf9854", 0.30);
    ridge(ctx, -75, -12, -40, 16, "rgba(126,106,74,0.36)", 9, 6, -30);
    ridge(ctx, 10, 75, -42, 15, "rgba(126,106,74,0.36)", 21, 6, -30);
    const wall = [[-75, -60], [-46, -54], [-24, -34], [24, -34], [50, -54], [75, -60]];
    ctx.beginPath(); ctx.moveTo(wall[0][0], wall[0][1]);
    for (let i = 1; i < wall.length; i++) ctx.lineTo(wall[i][0], wall[i][1]);
    ctx.lineTo(75, -52);
    for (let i = wall.length - 1; i >= 0; i--) ctx.lineTo(wall[i][0], wall[i][1] + 7);
    ctx.closePath();
    ctx.fillStyle = "rgba(190,162,120,0.96)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.6); ctx.lineWidth = 0.7; ctx.stroke();
    for (let i = 0; i < wall.length - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const x = lerp(wall[i][0], wall[i + 1][0], k / 4);
        const y = lerp(wall[i][1], wall[i + 1][1], k / 4);
        ctx.fillStyle = "rgba(200,172,130,0.98)"; ctx.fillRect(x, y - 2.4, 2.2, 2.4);
      }
    }
    cnGate(ctx, 0, -30, 30, 22, "rgba(216,187,142,0.98)", "rgba(174,104,62,0.95)", { arch: true, double: true });
    mapFloor(ctx, -28, 62, "#b99a68", 0.40);
    // rocks and scrub at the pass floor
    for (const [rx, ry, rr] of [[-34, -27, 5.5], [30, -25, 4.5], [-14, -23, 3.2], [16, -22, 2.6]]) {
      ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.45, 0, 0, TAU);
      ctx.fillStyle = "rgba(150,122,84,0.75)"; ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const gx = -50 + i * 5.6;
      const gy = -26 + Math.sin(i) * 1.6;
      ctx.strokeStyle = "rgba(104,100,60,0.55)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.sin(t + i) * 0.7, gy - 2.8); ctx.stroke();
    }
    const riders = [
      { x: -24, y: -26, s: 0.55, col: "rgba(84,62,40,0.8)" },
      { x: 0, y: -19, s: 0.78, col: "rgba(74,53,33,0.92)" },
      { x: 30, y: -10, s: 1.0, col: "rgba(67,48,29,0.98)" },
    ];
    riders.forEach((r, i) => {
      horse(ctx, r.x, r.y, r.s, r.col, t + i, {
        rider: true,
        riderCol: i === 1 ? "rgba(150,60,42,0.95)" : "rgba(110,82,50,0.95)",
        banner: i === 2 ? "rgba(78,106,122,0.9)" : null,
      });
      for (let k = 0; k < 2; k++) {
        ctx.beginPath(); ctx.arc(r.x - 4 + k * 4, r.y, 4 + k * 2, 0, TAU);
        ctx.fillStyle = "rgba(198,170,126,0.13)"; ctx.fill();
      }
    });
    bird(ctx, -40, -78, 2.4, "rgba(67,48,29,0.4)");
  };

  /* ── 3. Founding of Rome · 台伯河畔的犁沟 ───────────────── */
  const romeStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#f7e9c6");
    sky.addColorStop(0.52, "#f2d9a8");
    sky.addColorStop(1, "#e6c489");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 10, -78, 26, "#e5ae60", 0.4);
    ctx.beginPath(); ctx.arc(10, -78, 6, 0, TAU);
    ctx.fillStyle = "rgba(224,169,90,0.9)"; ctx.fill();
    cloud(ctx, -28, -92, 17, "#fff8e7", 0.5);
    cloud(ctx, 30, -86, 12, "#fff8e7", 0.45);

    // far hills
    ridge(ctx, -50, 50, -38, 4.4, "rgba(132,124,80,0.26)", 7, 5, -30);

    // main hill with terraces
    ctx.beginPath();
    ctx.moveTo(-52, -18);
    ctx.quadraticCurveTo(-30, -32, -4, -42);
    ctx.quadraticCurveTo(16, -49, 32, -52);
    ctx.quadraticCurveTo(44, -50, 52, -36);
    ctx.lineTo(52, -18);
    ctx.closePath();
    ctx.fillStyle = "rgba(148,136,84,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.4)"; ctx.lineWidth = 0.28; ctx.stroke();
    // contour terraces
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-52, -24 - i * 5);
      ctx.quadraticCurveTo(-26, -36 - i * 4, 4, -44 - i * 3);
      ctx.quadraticCurveTo(28, -50 - i * 2, 52, -40 - i * 4);
      ctx.strokeStyle = "rgba(92,72,44,0.18)"; ctx.lineWidth = 0.28; ctx.stroke();
    }
    hatch(ctx, -46, -38, 40, 20, "rgba(67,48,29,0.10)", 2.0, -0.7);
    hatch(ctx, 10, -48, 38, 20, "rgba(67,48,29,0.12)", 2.0, -0.7);
    // shadow side
    ctx.beginPath();
    ctx.moveTo(8, -20); ctx.quadraticCurveTo(30, -30, 52, -36);
    ctx.lineTo(52, -18); ctx.closePath();
    ctx.fillStyle = "rgba(74,54,30,0.10)"; ctx.fill();

    // village on the plateau
    const huts = [[-2, -44], [6, -45], [14, -47], [22, -49], [30, -50], [38, -48], [-10, -41]];
    huts.forEach(([hx, hy], i) => {
      const hh = 4.4 + (i % 3) * 0.8;
      ctx.fillStyle = "rgba(214,190,148,0.97)";
      ctx.fillRect(hx - 2.0, hy - hh, 4.0, hh);
      ctx.strokeStyle = "rgba(74,54,30,0.55)"; ctx.lineWidth = 0.2;
      ctx.strokeRect(hx - 2.0, hy - hh, 4.0, hh);
      // thatch roof
      ctx.beginPath();
      ctx.moveTo(hx - 3.4, hy - hh);
      ctx.lineTo(hx, hy - hh - 4.0);
      ctx.lineTo(hx + 3.4, hy - hh);
      ctx.closePath();
      ctx.fillStyle = "rgba(172,126,74,0.97)"; ctx.fill();
      ctx.stroke();
      // thatch lines
      ctx.strokeStyle = "rgba(92,60,34,0.35)"; ctx.lineWidth = 0.1;
      for (let k = 1; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(hx - 2.6 + k, hy - hh - k * 0.8); ctx.lineTo(hx + 2.6 - k, hy - hh - k * 0.8); ctx.stroke();
      }
      // door + shadow
      ctx.fillStyle = "rgba(74,54,30,0.45)";
      ctx.fillRect(hx - 0.6, hy - 2.0, 1.2, 2.0);
      ctx.fillStyle = "rgba(74,54,30,0.10)";
      ctx.fillRect(hx + 2.0, hy - hh + 0.4, 1.2, hh - 0.4);
      // smoke
      const q = (t * 0.22 + i * 0.18) % 1;
      ctx.beginPath(); ctx.arc(hx, hy - hh - 4.4 - q * 7, 0.8 + q * 1.8, 0, TAU);
      ctx.fillStyle = "rgba(160,140,110," + (0.14 * (1 - q)) + ")"; ctx.fill();
    });
    // palisade + path
    for (let x = -12; x < 40; x += 1.9) {
      const py = -43 + Math.sin(x * 0.14) * 1.8;
      ctx.strokeStyle = "rgba(67,48,29,0.5)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py - 2.4); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-6, -18);
    ctx.quadraticCurveTo(0, -30, 12, -42);
    ctx.strokeStyle = "rgba(206,180,132,0.85)"; ctx.lineWidth = 1.2; ctx.stroke();

    // wolf on a rock outcrop
    ctx.beginPath();
    ctx.moveTo(34, -46); ctx.lineTo(37, -50.4); ctx.lineTo(42, -51); ctx.lineTo(46, -47.4); ctx.lineTo(44, -45);
    ctx.closePath();
    ctx.fillStyle = "rgba(144,126,92,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(67,48,29,0.45)"; ctx.lineWidth = 0.2; ctx.stroke();
    wolf(ctx, 40, -52, 0.52, "rgba(58,42,26,0.85)");

    // Tiber: winding band
    const riv = ctx.createLinearGradient(0, -20, 0, -10);
    riv.addColorStop(0, "#86a29b");
    riv.addColorStop(1, "#6a8983");
    ctx.beginPath();
    ctx.moveTo(-52, -19);
    ctx.quadraticCurveTo(-24, -24, 2, -20);
    ctx.quadraticCurveTo(28, -16, 52, -22);
    ctx.lineTo(52, -12);
    ctx.quadraticCurveTo(26, -8, 0, -12);
    ctx.quadraticCurveTo(-26, -15, -52, -9);
    ctx.closePath();
    ctx.fillStyle = riv; ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.3)"; ctx.lineWidth = 0.24; ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(238,230,208,0.3)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-46, -17 + i * 1.8);
      ctx.quadraticCurveTo(0, -21 + i * 1.8 + Math.sin(t + i) * 0.4, 46, -18 + i * 1.8); ctx.stroke();
    }
    // reeds
    for (let i = 0; i < 12; i++) {
      const rx = -46 + i * 8;
      const ry = -15 - Math.sin(i * 1.4) * 2;
      ctx.strokeStyle = "rgba(108,104,60,0.7)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(t + i) * 0.4, ry - 3.2); ctx.stroke();
    }
    // small boat
    ctx.beginPath();
    ctx.moveTo(20, -16.6); ctx.lineTo(28, -17.4); ctx.lineTo(30, -16.2); ctx.lineTo(22, -15.4); ctx.closePath();
    ctx.fillStyle = "rgba(118,84,50,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();

    // near bank / field
    const field = ctx.createLinearGradient(0, -10, 0, 0);
    field.addColorStop(0, "rgba(188,156,108,0.98)");
    field.addColorStop(1, "rgba(164,130,84,0.98)");
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.moveTo(-52, -9);
    ctx.quadraticCurveTo(-26, -15, 0, -12);
    ctx.quadraticCurveTo(26, -8, 52, -12);
    ctx.lineTo(52, 0); ctx.lineTo(-52, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.3)"; ctx.lineWidth = 0.24;
    ctx.beginPath(); ctx.moveTo(-52, -9); ctx.quadraticCurveTo(-26, -15, 0, -12); ctx.quadraticCurveTo(26, -8, 52, -12); ctx.stroke();
    // grass + stones
    for (let i = 0; i < 20; i++) {
      const gx = -48 + i * 5;
      const gy = -4 + (i % 4) * 0.8;
      ctx.strokeStyle = "rgba(104,96,58,0.55)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.sin(t + i) * 0.4, gy - 1.8); ctx.stroke();
    }

    // furrow
    ctx.beginPath();
    ctx.moveTo(-46, -2.2);
    ctx.quadraticCurveTo(-18, -7.2, 8, -5.4);
    ctx.strokeStyle = "rgba(67,48,29,0.62)"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-46, -2.7);
    ctx.quadraticCurveTo(-18, -7.7, 8, -5.9);
    ctx.strokeStyle = "rgba(232,206,158,0.9)"; ctx.lineWidth = 0.3; ctx.stroke();

    // ox + plough + figures
    ox(ctx, -22, -6.2, 0.55, "rgba(96,70,44,0.9)", t);
    ctx.strokeStyle = "rgba(67,48,29,0.9)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-29, -3.8); ctx.lineTo(-33.4, -1.6); ctx.stroke();
    person(ctx, -35, -4.4, 0.3, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(168,64,44,0.95)", hat: "cap", arm: true });
    person(ctx, 6, -4.6, 0.3, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(196,170,120,0.95)", staff: true, hat: "straw" });
    person(ctx, -42, -3.4, 0.26, "rgba(58,42,26,0.95)", { phase: t + 2, fill: "rgba(110,96,72,0.95)" });
    // boundary stone
    ctx.fillStyle = "rgba(156,138,106,0.95)";
    ctx.fillRect(14, -3.8, 1.6, 3.8);
    ctx.strokeStyle = "rgba(67,48,29,0.5)"; ctx.lineWidth = 0.18; ctx.strokeRect(14, -3.8, 1.6, 3.8);

    // dark tree frame right
    ctx.strokeStyle = "rgba(64,48,28,0.95)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(46, -2); ctx.quadraticCurveTo(44, -14, 47, -26); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(47 + (i % 2 ? 1.6 : -1.4), -26 - i * 2.4, 4.2 - i * 0.5, 2.0, 0, 0, TAU);
      ctx.fillStyle = "rgba(76,90,52," + (0.6 + i * 0.08) + ")"; ctx.fill();
    }
    // left cypress
    ctx.beginPath();
    ctx.moveTo(-48, -2); ctx.quadraticCurveTo(-46, -20, -48, -38); ctx.quadraticCurveTo(-50, -20, -48, -2); ctx.closePath();
    ctx.fillStyle = "rgba(70,84,50,0.9)"; ctx.fill();

    // birds
    bird(ctx, -30, -84, 1.2, "rgba(67,48,29,0.45)");
    bird(ctx, -24, -88, 0.9, "rgba(67,48,29,0.4)");
    bird(ctx, 28, -84, 1.0, "rgba(67,48,29,0.4)");
  };

  const romeMap = function (ctx, t) {
    glow(ctx, 16, -64, 34, "#e5ae60", 0.30);
    ridge(ctx, -75, 75, -42, 6, "rgba(132,124,80,0.28)", 7, 8, -14);
    ctx.beginPath();
    ctx.moveTo(-75, -16);
    ctx.quadraticCurveTo(-24, -36, 6, -48);
    ctx.quadraticCurveTo(30, -56, 75, -26);
    ctx.lineTo(75, -14); ctx.lineTo(-75, -14); ctx.closePath();
    ctx.fillStyle = "rgba(152,140,88,0.82)"; ctx.fill();
    hatch(ctx, -40, -40, 90, 26, "rgba(67,48,29,0.14)", 2.6, -0.9);
    const huts = [[4, -50], [13, -49], [22, -52], [31, -50]];
    huts.forEach(([hx, hy], i) => {
      ctx.fillStyle = "rgba(214,190,148,0.97)"; ctx.fillRect(hx - 3.2, hy - 1.4, 6.4, 6.6);
      ctx.strokeStyle = hexA(INK, 0.55); ctx.lineWidth = 0.4; ctx.strokeRect(hx - 3.2, hy - 1.4, 6.4, 6.6);
      ctx.beginPath(); ctx.moveTo(hx - 5, hy - 1); ctx.lineTo(hx, hy - 7.4); ctx.lineTo(hx + 5, hy - 1); ctx.closePath();
      ctx.fillStyle = "rgba(176,132,78,0.97)"; ctx.fill(); ctx.stroke();
    });
    wolf(ctx, 52, -54, 0.9, "rgba(60,44,28,0.82)");
    // river: a lens-shaped bend with tapered ends
    ctx.beginPath();
    ctx.moveTo(-54, -18);
    ctx.quadraticCurveTo(-24, -25, 6, -21);
    ctx.quadraticCurveTo(34, -18, 56, -23);
    ctx.quadraticCurveTo(58, -15, 52, -12);
    ctx.quadraticCurveTo(22, -9, -8, -13);
    ctx.quadraticCurveTo(-34, -16, -54, -12);
    ctx.closePath();
    ctx.fillStyle = "rgba(110,142,138,0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(67,48,29,0.22)"; ctx.lineWidth = 0.5; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(238,230,208,0.38)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-46, -18 + i * 2.2); ctx.quadraticCurveTo(-4, -22 + i * 2.2, 46, -19 + i * 2.2); ctx.stroke();
    }
    // near bank + field
    mapFloor(ctx, -8, 46, "#c1a06c", 0.42);
    // bank scrub + reeds
    for (let i = 0; i < 16; i++) {
      const gx = -46 + i * 6;
      const gy = -12 + Math.sin(i * 1.3) * 1.4;
      ctx.strokeStyle = "rgba(104,100,60,0.55)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.sin(t + i) * 0.6, gy - 2.6); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-66, -2); ctx.quadraticCurveTo(-24, -8, 12, -5.6);
    ctx.strokeStyle = "rgba(67,48,29,0.85)"; ctx.lineWidth = 2; ctx.stroke();
    ox(ctx, -30, -5.4, 0.85, "rgba(96,70,44,0.9)", t);
    person(ctx, -48, -3.6, 0.42, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(168,64,44,0.95)", hat: "cap" });
    // cypress
    for (const cx of [-66, 66]) {
      ctx.beginPath();
      ctx.moveTo(cx, -6); ctx.quadraticCurveTo(cx - 4.2, -26, cx, -42); ctx.quadraticCurveTo(cx + 4.2, -26, cx, -6); ctx.closePath();
      ctx.fillStyle = "rgba(92,104,62,0.82)"; ctx.fill();
    }
    bird(ctx, -56, -76, 2.2, "rgba(67,48,29,0.4)");
  };


  /* Soft ground wash for map vignettes: no hard card edges. */
  function mapFloor(ctx, y, w, color, a) {
    const g = ctx.createRadialGradient(0, y, 0, 0, y, w);
    g.addColorStop(0, hexA(color, a));
    g.addColorStop(0.55, hexA(color, a * 0.72));
    g.addColorStop(1, hexA(color, 0));
    ctx.save();
    ctx.translate(0, y);
    ctx.scale(1, 0.30);
    ctx.beginPath();
    ctx.arc(0, 0, w, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  /* ── additional motifs ──────────────────────────────────── */
  function minaret(ctx, x, baseY, h, w, col) {
    ctx.fillStyle = col || "rgba(242,234,216,0.97)";
    ctx.strokeStyle = hexA(INK, 0.55);
    ctx.lineWidth = 0.22;
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    ctx.strokeRect(x - w / 2, baseY - h, w, h);
    // balconies
    for (const yy of [0.32, 0.62, 0.84]) {
      const by = baseY - h * yy;
      ctx.fillRect(x - w * 0.9, by, w * 1.8, 1.0);
      ctx.strokeRect(x - w * 0.9, by, w * 1.8, 1.0);
    }
    // chhatri cap
    ctx.beginPath();
    ctx.arc(x, baseY - h, w * 1.1, Math.PI, TAU);
    ctx.fillStyle = col || "rgba(246,238,220,0.98)";
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = hexA(GOLD, 0.8); ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(x, baseY - h - w * 1.1); ctx.lineTo(x, baseY - h - w * 2.4); ctx.stroke();
  }

  function domeTomb(ctx, x, baseY, w, h, col) {
    const stone = col || "rgba(246,238,220,0.98)";
    ctx.strokeStyle = hexA(INK, 0.55);
    ctx.lineWidth = 0.24;
    // plinth
    ctx.fillStyle = "rgba(232,220,198,0.98)";
    ctx.fillRect(x - w * 0.62, baseY - 3, w * 1.24, 3);
    ctx.strokeRect(x - w * 0.62, baseY - 3, w * 1.24, 3);
    // main block
    ctx.fillStyle = stone;
    ctx.fillRect(x - w * 0.38, baseY - h * 0.52, w * 0.76, h * 0.52 - 3);
    ctx.strokeRect(x - w * 0.38, baseY - h * 0.52, w * 0.76, h * 0.52 - 3);
    // iwan arch
    ctx.beginPath();
    ctx.moveTo(x - w * 0.13, baseY - 3);
    ctx.lineTo(x - w * 0.13, baseY - h * 0.32);
    ctx.quadraticCurveTo(x, baseY - h * 0.46, x + w * 0.13, baseY - h * 0.32);
    ctx.lineTo(x + w * 0.13, baseY - 3);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,88,58,0.35)"; ctx.fill();
    ctx.strokeStyle = hexA(GOLD, 0.6); ctx.lineWidth = 0.18; ctx.stroke();
    // drum
    ctx.fillStyle = stone;
    ctx.fillRect(x - w * 0.30, baseY - h * 0.66, w * 0.60, h * 0.15);
    ctx.strokeRect(x - w * 0.30, baseY - h * 0.66, w * 0.60, h * 0.15);
    // onion dome
    ctx.beginPath();
    ctx.moveTo(x - w * 0.30, baseY - h * 0.66);
    ctx.quadraticCurveTo(x - w * 0.30, baseY - h * 0.92, x - w * 0.06, baseY - h * 0.98);
    ctx.quadraticCurveTo(x, baseY - h * 1.02, x + w * 0.06, baseY - h * 0.98);
    ctx.quadraticCurveTo(x + w * 0.30, baseY - h * 0.92, x + w * 0.30, baseY - h * 0.66);
    ctx.closePath();
    ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
    // dome ribs
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * w * 0.10, baseY - h * 0.68);
      ctx.quadraticCurveTo(x + i * w * 0.16, baseY - h * 0.90, x, baseY - h * 0.99);
      ctx.strokeStyle = hexA(INK, 0.22); ctx.lineWidth = 0.12; ctx.stroke();
    }
    // finial
    ctx.strokeStyle = hexA(GOLD, 0.9); ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(x, baseY - h * 0.99); ctx.lineTo(x, baseY - h * 1.16); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, baseY - h * 1.10, 0.6, 0, TAU); ctx.fillStyle = hexA(GOLD, 0.9); ctx.fill();
    // chhatris
    for (const dx of [-0.30, 0.30]) {
      const cx = x + w * dx;
      const cy = baseY - h * 0.58;
      ctx.fillStyle = stone;
      ctx.fillRect(cx - w * 0.07, cy - h * 0.10, w * 0.14, h * 0.10);
      ctx.strokeRect(cx - w * 0.07, cy - h * 0.10, w * 0.14, h * 0.10);
      ctx.beginPath(); ctx.arc(cx, cy - h * 0.10, w * 0.085, Math.PI, TAU); ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = hexA(GOLD, 0.8); ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.185); ctx.lineTo(cx, cy - h * 0.23); ctx.stroke();
    }
  }

  function palm(ctx, x, baseY, h, lean, col) {
    const lx = lean || 0;
    ctx.strokeStyle = col || "rgba(96,78,46,0.92)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + lx * 0.4, baseY - h * 0.55, x + lx, baseY - h);
    ctx.stroke();
    // trunk rings
    ctx.lineWidth = 0.28;
    for (let i = 1; i < 6; i++) {
      const u = i / 6;
      const tx = x + lx * 0.4 * u * (2 - u);
      const ty = baseY - h * u;
      ctx.beginPath(); ctx.moveTo(tx - 0.5, ty); ctx.lineTo(tx + 0.5, ty - 0.2); ctx.stroke();
    }
    // fronds
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.92 + i * 0.42;
      ctx.beginPath();
      ctx.moveTo(x + lx, baseY - h);
      ctx.quadraticCurveTo(
        x + lx + Math.cos(a) * h * 0.20, baseY - h + Math.sin(a) * h * 0.10,
        x + lx + Math.cos(a) * h * 0.34, baseY - h + Math.sin(a) * h * 0.20
      );
      ctx.strokeStyle = "rgba(92,104,58,0.88)";
      ctx.lineWidth = 0.42;
      ctx.stroke();
      // leaflets
      for (let k = 1; k < 4; k++) {
        const u = k / 4;
        const bx = x + lx + Math.cos(a) * h * 0.34 * u;
        const by = baseY - h + Math.sin(a) * h * 0.20 * u;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 0.7) * 1.8, by + Math.sin(a + 0.7) * 1.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a - 0.7) * 1.8, by + Math.sin(a - 0.7) * 1.2); ctx.stroke();
      }
    }
  }

  /* banana / plantain: broad arching blades, short trunk (Java, SE Asia) */
  function banana(ctx, x, baseY, h, lean, col) {
    const lx = lean || 0;
    ctx.save();
    ctx.translate(x, baseY);
    ctx.strokeStyle = col || "rgba(104,92,54,0.92)";
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lx * 0.4, -h * 0.28, lx, -h * 0.55); ctx.stroke();
    ctx.lineWidth = 0.22;
    for (let i = 1; i < 4; i++) {
      const u = i / 4;
      const tx = lx * 0.4 * u * (2 - u), ty = -h * 0.55 * u;
      ctx.beginPath(); ctx.moveTo(tx - 0.55, ty); ctx.lineTo(tx + 0.55, ty - 0.15); ctx.stroke();
    }
    const cx = lx, cy = -h * 0.55;
    const angs = [-2.95, -2.55, -2.15, -1.75, -1.35, -0.95, -0.55, -0.15, 0.25];
    for (let i = 0; i < angs.length; i++) {
      const a = angs[i];
      const L = h * (0.40 + (i % 3) * 0.035);
      const tipx = cx + Math.cos(a) * L;
      const tipy = cy + Math.sin(a) * L * 0.55 + L * 0.24;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + Math.cos(a) * L * 0.45, cy + Math.sin(a) * L * 0.4 - L * 0.12, tipx, tipy);
      ctx.quadraticCurveTo(cx + Math.cos(a) * L * 0.55, cy + Math.sin(a) * L * 0.45 + L * 0.12, cx, cy);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "rgba(88,104,58,0.92)" : "rgba(76,92,50,0.94)";
      ctx.fill();
      ctx.strokeStyle = "rgba(58,66,36,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + Math.cos(a) * L * 0.5, cy + Math.sin(a) * L * 0.4, tipx, tipy);
      ctx.strokeStyle = "rgba(222,210,170,0.32)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    // hanging fruit cluster
    ctx.beginPath(); ctx.ellipse(cx + 1.4, cy + h * 0.14, 0.75, 1.5, 0.3, 0, TAU);
    ctx.fillStyle = "rgba(196,168,92,0.9)"; ctx.fill();
    ctx.restore();
  }

  function acropolis(ctx, x, baseY, w, col) {
    // rocky hill
    ctx.beginPath();
    ctx.moveTo(x - w * 0.7, baseY);
    ctx.quadraticCurveTo(x - w * 0.35, baseY - w * 0.26, x - w * 0.16, baseY - w * 0.30);
    ctx.lineTo(x + w * 0.20, baseY - w * 0.30);
    ctx.quadraticCurveTo(x + w * 0.48, baseY - w * 0.22, x + w * 0.7, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(150,138,96,0.85)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.22; ctx.stroke();
    hatch(ctx, x - w * 0.5, baseY - w * 0.28, w, w * 0.28, "rgba(67,48,29,0.16)", 1.5, -0.7);
    // Parthenon
    const py = baseY - w * 0.30;
    const pw = w * 0.46;
    // three-step base
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(228,216,192,0.97)";
      ctx.fillRect(x - pw / 2 - 2.4 + i * 0.7, py - 1.6 + i * 0.5, pw + 5.0 - i * 1.4, 0.7);
      ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.16;
      ctx.strokeRect(x - pw / 2 - 2.4 + i * 0.7, py - 1.6 + i * 0.5, pw + 5.0 - i * 1.4, 0.7);
    }
    // cella wall
    ctx.fillStyle = "rgba(230,218,194,0.97)";
    ctx.fillRect(x - pw / 2 + 1.6, py - 8.2, pw - 3.2, 6.6);
    ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.18;
    ctx.strokeRect(x - pw / 2 + 1.6, py - 8.2, pw - 3.2, 6.6);
    // shadow side of the cella
    ctx.fillStyle = "rgba(74,54,30,0.12)";
    ctx.fillRect(x + pw * 0.18, py - 8.0, pw * 0.30, 6.3);
    // colonnade
    for (let i = 0; i < 8; i++) {
      const cx = x - pw / 2 + 1.4 + i * (pw - 2.8) / 7;
      ctx.fillStyle = "rgba(246,238,220,0.97)";
      ctx.fillRect(cx - 0.5, py - 8.0, 1.0, 6.4);
      ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.14;
      ctx.strokeRect(cx - 0.5, py - 8.0, 1.0, 6.4);
      // capitals
      ctx.fillStyle = "rgba(238,228,206,0.98)";
      ctx.fillRect(cx - 0.75, py - 8.4, 1.5, 0.5);
    }
    // entablature + pediment
    ctx.fillStyle = "rgba(232,220,198,0.98)";
    ctx.fillRect(x - pw / 2 - 1.2, py - 9.6, pw + 2.4, 1.2);
    ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.18;
    ctx.strokeRect(x - pw / 2 - 1.2, py - 9.6, pw + 2.4, 1.2);
    ctx.beginPath();
    ctx.moveTo(x - pw / 2 - 1.4, py - 9.6);
    ctx.lineTo(x, py - 12.8);
    ctx.lineTo(x + pw / 2 + 1.4, py - 9.6);
    ctx.closePath();
    ctx.fillStyle = "rgba(236,226,204,0.97)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.2; ctx.stroke();
    // pediment shadow
    ctx.beginPath();
    ctx.moveTo(x + pw * 0.08, py - 10.0);
    ctx.lineTo(x + pw / 2 + 1.4, py - 9.6);
    ctx.lineTo(x + pw * 0.10, py - 12.2);
    ctx.closePath();
    ctx.fillStyle = "rgba(74,54,30,0.10)"; ctx.fill();
  }

  function paperVat(ctx, x, baseY, w, h) {
    // wooden vat
    ctx.fillStyle = "rgba(128,90,52,0.96)";
    ctx.beginPath();
    ctx.moveTo(x - w / 2, baseY - h);
    ctx.lineTo(x + w / 2, baseY - h);
    ctx.lineTo(x + w * 0.42, baseY);
    ctx.lineTo(x - w * 0.42, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.6); ctx.lineWidth = 0.22; ctx.stroke();
    // pulp
    ctx.beginPath();
    ctx.ellipse(x, baseY - h + 0.6, w * 0.44, h * 0.13, 0, 0, TAU);
    ctx.fillStyle = "rgba(240,232,212,0.95)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.16; ctx.stroke();
    // hoops
    for (const yy of [0.25, 0.65]) {
      ctx.strokeStyle = hexA("#4a3020", 0.55); ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(x - w * 0.48, baseY - h + h * yy); ctx.lineTo(x + w * 0.48, baseY - h + h * yy); ctx.stroke();
    }
  }

  function paperRack(ctx, x, baseY, w, h, t, paperCol) {
    // frame
    ctx.strokeStyle = "rgba(92,62,36,0.92)"; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, baseY); ctx.lineTo(x - w / 2, baseY - h);
    ctx.moveTo(x + w / 2, baseY); ctx.lineTo(x + w / 2, baseY - h);
    ctx.moveTo(x - w / 2 - 1, baseY - h); ctx.lineTo(x + w / 2 + 1, baseY - h);
    ctx.stroke();
    // hanging sheets
    for (let i = 0; i < 5; i++) {
      const sx = x - w / 2 + 1.4 + i * (w - 2.8) / 4;
      const sw = (w - 4) / 5;
      const sway = Math.sin(t * 0.8 + i) * 0.25;
      ctx.beginPath();
      ctx.moveTo(sx, baseY - h + 0.4);
      ctx.lineTo(sx + sw, baseY - h + 0.4);
      ctx.lineTo(sx + sw + sway, baseY - h * 0.28);
      ctx.lineTo(sx + sway, baseY - h * 0.28);
      ctx.closePath();
      ctx.fillStyle = paperCol || "rgba(250,243,226,0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(150,120,80,0.45)"; ctx.lineWidth = 0.14; ctx.stroke();
    }
  }

  function radio(ctx, x, baseY, s, t) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    // wooden case
    ctx.fillStyle = "rgba(126,84,48,0.98)";
    ctx.fillRect(-7, -11, 14, 11);
    ctx.strokeStyle = hexA(INK, 0.6); ctx.lineWidth = 0.3; ctx.strokeRect(-7, -11, 14, 11);
    // speaker grille
    ctx.fillStyle = "rgba(74,50,30,0.7)";
    ctx.fillRect(-5.6, -9.6, 7, 8);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(210,180,136,0.5)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-5.2, -8.6 + i * 1.5); ctx.lineTo(1.0, -8.6 + i * 1.5); ctx.stroke();
    }
    // dial
    ctx.beginPath(); ctx.arc(4.2, -7.4, 1.5, 0, TAU);
    ctx.fillStyle = "rgba(238,224,198,0.95)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.5); ctx.lineWidth = 0.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4.2, -7.4); ctx.lineTo(4.9, -8.4); ctx.strokeStyle = INK; ctx.lineWidth = 0.25; ctx.stroke();
    // knob
    ctx.beginPath(); ctx.arc(4.2, -3.2, 0.9, 0, TAU); ctx.fillStyle = hexA(GOLD, 0.9); ctx.fill();
    ctx.restore();
  }

  function astronaut(ctx, x, y, s, t, saluting) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const sway = Math.sin(t * 1.2) * 0.3;
    // legs
    ctx.strokeStyle = "rgba(236,230,216,0.98)"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-1.4, -8); ctx.lineTo(-2.0 + sway * 0.5, -2.4); ctx.lineTo(-2.2, 0);
    ctx.moveTo(1.4, -8); ctx.lineTo(2.0 - sway * 0.5, -2.4); ctx.lineTo(2.2, 0);
    ctx.stroke();
    // suit body
    ctx.fillStyle = "rgba(244,238,224,0.99)";
    ctx.beginPath();
    ctx.moveTo(-3.4, -16);
    ctx.quadraticCurveTo(-4.2, -12, -3.4, -7.4);
    ctx.lineTo(3.4, -7.4);
    ctx.quadraticCurveTo(4.2, -12, 3.4, -16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,104,82,0.8)"; ctx.lineWidth = 0.35; ctx.stroke();
    // backpack
    ctx.fillStyle = "rgba(214,204,184,0.98)";
    ctx.fillRect(-5.2, -15.4, 2.4, 6.4);
    ctx.strokeRect(-5.2, -15.4, 2.4, 6.4);
    // arms
    ctx.strokeStyle = "rgba(236,230,216,0.99)"; ctx.lineWidth = 1.8;
    if (saluting) {
      ctx.beginPath(); ctx.moveTo(2.4, -14.4); ctx.lineTo(5.4, -17.8); ctx.lineTo(4.2, -20.4); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(2.6, -14.2); ctx.lineTo(5.2, -10.8); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-2.6, -14.2); ctx.lineTo(-5.0, -10.8); ctx.stroke();
    // helmet
    ctx.beginPath(); ctx.arc(0, -18.6, 3.0, 0, TAU);
    ctx.fillStyle = "rgba(246,241,228,0.99)"; ctx.fill();
    ctx.strokeStyle = "rgba(120,104,82,0.8)"; ctx.lineWidth = 0.4; ctx.stroke();
    // gold visor
    ctx.beginPath(); ctx.arc(0.7, -18.8, 2.0, -0.6, 1.6);
    ctx.fillStyle = "rgba(196,152,66,0.92)"; ctx.fill();
    // hoses
    ctx.strokeStyle = "rgba(180,168,146,0.9)"; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-3.6, -15.8); ctx.quadraticCurveTo(-5.6, -13.4, -4.8, -11); ctx.stroke();
    ctx.restore();
  }

  function lunarModule(ctx, x, baseY, s, t) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    // legs
    ctx.strokeStyle = "rgba(206,192,150,0.98)"; ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-7, -8); ctx.lineTo(-12, 0);
    ctx.moveTo(7, -8); ctx.lineTo(12, 0);
    ctx.moveTo(-4, -8); ctx.lineTo(-6, 0);
    ctx.moveTo(4, -8); ctx.lineTo(6, 0);
    ctx.stroke();
    // footpads
    ctx.fillStyle = "rgba(180,166,128,0.98)";
    for (const fx of [-12, -6, 6, 12]) {
      ctx.beginPath(); ctx.ellipse(fx, 0, 2.0, 0.7, 0, 0, TAU); ctx.fill();
    }
    // descent stage
    ctx.fillStyle = "rgba(212,196,150,0.98)";
    ctx.beginPath();
    ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(6.4, -16); ctx.lineTo(-6.4, -16); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(92,80,54,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
    // gold foil panels
    ctx.fillStyle = "rgba(196,150,64,0.95)";
    ctx.fillRect(-6.8, -15.2, 4.2, 4.4);
    ctx.fillRect(2.6, -15.2, 4.2, 4.4);
    // ascent stage
    ctx.fillStyle = "rgba(226,214,186,0.98)";
    ctx.beginPath();
    ctx.moveTo(-5.2, -16); ctx.lineTo(5.2, -16); ctx.lineTo(4.2, -22); ctx.lineTo(-4.2, -22); ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // windows
    ctx.fillStyle = "rgba(72,84,92,0.9)";
    ctx.fillRect(-3.2, -20.4, 2.2, 1.6);
    ctx.fillRect(0.8, -20.4, 2.2, 1.6);
    // antenna
    ctx.strokeStyle = "rgba(180,166,128,0.9)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-2.4, -26); ctx.moveTo(0, -22); ctx.lineTo(2.6, -25.6); ctx.stroke();
    // ladder
    ctx.strokeStyle = "rgba(206,192,150,0.9)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-3.2, -8); ctx.lineTo(-2.6, -1); ctx.moveTo(-1.6, -8); ctx.lineTo(-1.0, -1); ctx.stroke();
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-3.1, -8 + i * 1.8); ctx.lineTo(-1.1, -8 + i * 1.8); ctx.stroke();
    }
    ctx.restore();
  }

  function skeletonDome(ctx, x, baseY, w, h) {
    // rubble
    ctx.beginPath();
    ctx.ellipse(x, baseY, w * 0.62, h * 0.035, 0, 0, TAU);
    ctx.fillStyle = "rgba(120,90,60,0.35)";
    ctx.fill();
    // main brick block: right wall straight, left wall broken
    ctx.beginPath();
    ctx.moveTo(x - w * 0.34, baseY);
    ctx.lineTo(x - w * 0.34, baseY - h * 0.24);
    ctx.lineTo(x - w * 0.28, baseY - h * 0.30);
    ctx.lineTo(x - w * 0.32, baseY - h * 0.40);
    ctx.lineTo(x - w * 0.26, baseY - h * 0.46);
    ctx.lineTo(x - w * 0.26, baseY - h * 0.58);
    ctx.lineTo(x + w * 0.34, baseY - h * 0.58);
    ctx.lineTo(x + w * 0.34, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(156,98,68,0.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(64,44,28,0.7)";
    ctx.lineWidth = 0.35;
    ctx.stroke();
    // brick courses
    ctx.strokeStyle = "rgba(84,54,34,0.18)";
    ctx.lineWidth = 0.12;
    for (let yy = baseY - h * 0.06; yy > baseY - h * 0.56; yy -= h * 0.05) {
      ctx.beginPath(); ctx.moveTo(x - w * 0.30, yy); ctx.lineTo(x + w * 0.30, yy); ctx.stroke();
    }
    // tall arched windows
    for (const wx of [-0.21, -0.07, 0.07, 0.21]) {
      ctx.beginPath();
      ctx.moveTo(x + w * wx - w * 0.045, baseY);
      ctx.lineTo(x + w * wx - w * 0.045, baseY - h * 0.36);
      ctx.quadraticCurveTo(x + w * wx, baseY - h * 0.44, x + w * wx + w * 0.045, baseY - h * 0.36);
      ctx.lineTo(x + w * wx + w * 0.045, baseY);
      ctx.closePath();
      ctx.fillStyle = "rgba(232,212,180,0.55)";
      ctx.fill();
      ctx.strokeStyle = "rgba(64,44,28,0.35)";
      ctx.lineWidth = 0.16;
      ctx.stroke();
    }
    // drum
    ctx.fillStyle = "rgba(166,108,76,0.96)";
    ctx.fillRect(x - w * 0.24, baseY - h * 0.72, w * 0.48, h * 0.15);
    ctx.strokeStyle = "rgba(64,44,28,0.6)";
    ctx.lineWidth = 0.24;
    ctx.strokeRect(x - w * 0.24, baseY - h * 0.72, w * 0.48, h * 0.15);
    // dome cage ribs
    const domeY = baseY - h * 0.72;
    ctx.strokeStyle = "rgba(58,42,28,0.88)";
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.24, domeY);
    ctx.quadraticCurveTo(x - w * 0.22, domeY - h * 0.22, x, domeY - h * 0.24);
    ctx.quadraticCurveTo(x + w * 0.22, domeY - h * 0.22, x + w * 0.24, domeY);
    ctx.stroke();
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * w * 0.065, domeY);
      ctx.quadraticCurveTo(x + i * w * 0.085, domeY - h * 0.17, x, domeY - h * 0.245);
      ctx.strokeStyle = "rgba(58,42,28,0.7)";
      ctx.lineWidth = 0.22;
      ctx.stroke();
    }
    // horizontal rings
    for (let i = 1; i <= 3; i++) {
      const ry = domeY - h * 0.06 * i;
      const rw = w * (0.24 - i * 0.05);
      ctx.beginPath();
      ctx.ellipse(x, ry, rw, h * 0.012, 0, 0, TAU);
      ctx.strokeStyle = "rgba(58,42,28,0.55)";
      ctx.lineWidth = 0.18;
      ctx.stroke();
    }
    // cupola
    ctx.beginPath();
    ctx.arc(x, domeY - h * 0.245, w * 0.035, 0, TAU);
    ctx.fillStyle = "rgba(64,44,28,0.75)";
    ctx.fill();
    // charred shadow side
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + w * 0.14, baseY - h * 0.58, w * 0.20, h * 0.58);
    ctx.clip();
    ctx.fillStyle = "rgba(74,48,30,0.18)";
    ctx.fillRect(x + w * 0.10, baseY - h * 0.6, w * 0.26, h * 0.6);
    ctx.restore();
  }

  function cathedral(ctx, x, baseY, w, h) {
    // brick body
    ctx.fillStyle = "rgba(174,112,82,0.94)";
    ctx.fillRect(x - w * 0.36, baseY - h * 0.72, w * 0.72, h * 0.72);
    ctx.strokeStyle = hexA(INK, 0.55); ctx.lineWidth = 0.24;
    ctx.strokeRect(x - w * 0.36, baseY - h * 0.72, w * 0.72, h * 0.72);
    // brick courses + shadow side
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w * 0.36, baseY - h * 0.72, w * 0.72, h * 0.72);
    ctx.clip();
    ctx.strokeStyle = "rgba(92,58,40,0.18)"; ctx.lineWidth = 0.13;
    for (let yy = baseY - h * 0.70; yy < baseY; yy += 1.7) {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.36, yy);
      ctx.lineTo(x + w * 0.36, yy);
      ctx.stroke();
    }
    const cg = ctx.createLinearGradient(x, 0, x + w * 0.36, 0);
    cg.addColorStop(0, "rgba(60,36,24,0)");
    cg.addColorStop(1, "rgba(60,36,24,0.18)");
    ctx.fillStyle = cg;
    ctx.fillRect(x, baseY - h * 0.72, w * 0.36, h * 0.72);
    ctx.restore();
    // gable
    ctx.beginPath();
    ctx.moveTo(x - w * 0.36, baseY - h * 0.72);
    ctx.lineTo(x, baseY - h * 0.92);
    ctx.lineTo(x + w * 0.36, baseY - h * 0.72);
    ctx.closePath(); ctx.fillStyle = "rgba(164,104,76,0.94)"; ctx.fill(); ctx.stroke();
    // twin towers
    for (const dx of [-0.36, 0.36]) {
      const tx = x + w * dx;
      ctx.fillStyle = "rgba(184,120,88,0.96)";
      ctx.fillRect(tx - w * 0.09, baseY - h * 1.18, w * 0.18, h * 1.18);
      ctx.strokeRect(tx - w * 0.09, baseY - h * 1.18, w * 0.18, h * 1.18);
      // tower roof
      ctx.beginPath();
      ctx.moveTo(tx - w * 0.11, baseY - h * 1.18);
      ctx.lineTo(tx, baseY - h * 1.34);
      ctx.lineTo(tx + w * 0.11, baseY - h * 1.18);
      ctx.closePath(); ctx.fillStyle = "rgba(120,78,58,0.95)"; ctx.fill(); ctx.stroke();
      // louvers
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(72,54,40,0.55)";
        ctx.fillRect(tx - w * 0.04, baseY - h * (0.98 - i * 0.12), w * 0.08, h * 0.07);
      }
    }
    // rose window
    ctx.beginPath(); ctx.arc(x, baseY - h * 0.48, w * 0.10, 0, TAU);
    ctx.fillStyle = "rgba(212,174,120,0.75)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.2; ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      ctx.beginPath(); ctx.moveTo(x, baseY - h * 0.48); ctx.lineTo(x + Math.cos(a) * w * 0.10, baseY - h * 0.48 + Math.sin(a) * w * 0.10); ctx.strokeStyle = hexA(INK, 0.3); ctx.lineWidth = 0.12; ctx.stroke();
    }
    // arched door
    ctx.beginPath();
    ctx.moveTo(x - w * 0.06, baseY);
    ctx.lineTo(x - w * 0.06, baseY - h * 0.16);
    ctx.quadraticCurveTo(x, baseY - h * 0.24, x + w * 0.06, baseY - h * 0.16);
    ctx.lineTo(x + w * 0.06, baseY);
    ctx.closePath(); ctx.fillStyle = "rgba(66,48,34,0.75)"; ctx.fill();
  }

  function palaceFacade(ctx, x, baseY, w, h, t) {
    // long neoclassical facade
    ctx.fillStyle = "rgba(190,196,178,0.96)";
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    ctx.strokeStyle = "rgba(74,64,50,0.55)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(x - w / 2, baseY - h, w, h);
    // facade shading + floor cornices
    const pg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    pg.addColorStop(0, "rgba(60,56,44,0)");
    pg.addColorStop(0.6, "rgba(60,56,44,0)");
    pg.addColorStop(1, "rgba(60,56,44,0.16)");
    ctx.fillStyle = pg;
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    ctx.strokeStyle = "rgba(74,64,50,0.28)"; ctx.lineWidth = 0.18;
    for (let r = 0; r < 2; r++) {
      const cy = baseY - h + h * (0.16 + r * 0.36);
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + 1.2, cy);
      ctx.lineTo(x + w / 2 - 1.2, cy);
      ctx.stroke();
    }
    // two window rows
    for (let row = 0; row < 2; row++) {
      const wy = baseY - h + h * (0.22 + row * 0.34);
      for (let i = 0; i < 17; i++) {
        const wx = x - w / 2 + 2.4 + i * (w - 4.8) / 16;
        const lit = (i + row * 3) % 4 !== 0;
        ctx.fillStyle = lit ? "rgba(228,182,106,0.9)" : "rgba(92,86,74,0.55)";
        ctx.fillRect(wx - 0.8, wy, 1.6, h * 0.15);
        ctx.strokeStyle = "rgba(74,64,50,0.35)"; ctx.lineWidth = 0.1;
        ctx.strokeRect(wx - 0.8, wy, 1.6, h * 0.15);
        if (lit) {
          ctx.beginPath(); ctx.arc(wx, wy + h * 0.075, 2.6, 0, TAU);
          ctx.fillStyle = "rgba(232,178,94,0.08)"; ctx.fill();
        }
      }
    }
    // pilasters
    for (let i = 0; i < 9; i++) {
      const cx = x - w / 2 + 4 + i * (w - 8) / 8;
      ctx.fillStyle = "rgba(240,236,222,0.92)";
      ctx.fillRect(cx - 0.55, baseY - h + 1.2, 1.1, h - 2.4);
      ctx.strokeStyle = "rgba(84,76,60,0.3)"; ctx.lineWidth = 0.1;
      ctx.strokeRect(cx - 0.55, baseY - h + 1.2, 1.1, h - 2.4);
    }
    // central arch
    ctx.beginPath();
    ctx.moveTo(x - 5, baseY);
    ctx.lineTo(x - 5, baseY - h * 0.48);
    ctx.quadraticCurveTo(x, baseY - h * 0.62, x + 5, baseY - h * 0.48);
    ctx.lineTo(x + 5, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(84,74,58,0.55)"; ctx.fill();
    // roofline
    ctx.fillStyle = "rgba(150,156,140,0.95)";
    ctx.fillRect(x - w / 2 - 1, baseY - h - 2.2, w + 2, 2.2);
    ctx.strokeRect(x - w / 2 - 1, baseY - h - 2.2, w + 2, 2.2);
    // central pediment
    ctx.beginPath();
    ctx.moveTo(x - 8, baseY - h - 2.2);
    ctx.lineTo(x, baseY - h - 7.4);
    ctx.lineTo(x + 8, baseY - h - 2.2);
    ctx.closePath();
    ctx.fillStyle = "rgba(170,176,158,0.96)"; ctx.fill();
    ctx.stroke();
    // warm lit windows glow
    glow(ctx, x - w * 0.2, baseY - h * 0.5, w * 0.22, "#e0a858", 0.10);
  }

  function stars(ctx, top, t, n, seed) {
    const rr = rng(seed || 3);
    for (let i = 0; i < n; i++) {
      const sx = -50 + rr() * 100;
      const sy = top + rr() * (-top * 0.7);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i));
      ctx.beginPath(); ctx.arc(sx, sy, 0.12 + rr() * 0.18, 0, TAU);
      ctx.fillStyle = "rgba(244,236,214," + (0.25 + tw * 0.5) + ")"; ctx.fill();
    }
  }

  /* ── 4. Russian Revolution · 冬宫前的红旗 ──────────────── */
  const russianStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#333d4a");
    sky.addColorStop(0.42, "#5f6162");
    sky.addColorStop(0.74, "#a89177");
    sky.addColorStop(1, "#d7bd97");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    stars(ctx, top, t, 26, 7);
    // searchlights
    for (const [bx, ang] of [[26, -1.95], [-24, -1.15]]) {
      const ex = bx + Math.cos(ang) * 92;
      const ey = -36 + Math.sin(ang) * 92;
      const grd = ctx.createLinearGradient(bx, -36, ex, ey);
      grd.addColorStop(0, "rgba(240,228,200,0.22)");
      grd.addColorStop(1, "rgba(240,228,200,0)");
      ctx.beginPath();
      ctx.moveTo(bx - 0.7, -36);
      ctx.lineTo(ex - 4, ey);
      ctx.lineTo(ex + 4, ey);
      ctx.lineTo(bx + 0.7, -36);
      ctx.closePath();
      ctx.fillStyle = grd; ctx.fill();
    }
    glow(ctx, -8, -28, 28, "#d8a25e", 0.12);

    // embankment
    ctx.fillStyle = "rgba(168,154,132,0.9)";
    ctx.fillRect(-50, -32, 100, 3);
    // Winter Palace, cropped to the left and ending in a corner pavilion
    palaceFacade(ctx, -19, -32, 62, 18, t);
    // corner pavilion
    ctx.fillStyle = "rgba(190,196,178,0.98)";
    ctx.fillRect(6, -54, 13, 22);
    ctx.strokeStyle = "rgba(74,64,50,0.55)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(6, -54, 13, 22);
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 3; i++) {
        const wx = 7.4 + i * 3.8, wy = -51 + r * 6.2;
        ctx.fillStyle = "rgba(228,182,106,0.88)";
        ctx.fillRect(wx, wy, 1.8, 2.4);
        ctx.strokeStyle = "rgba(74,64,50,0.35)"; ctx.lineWidth = 0.1;
        ctx.strokeRect(wx, wy, 1.8, 2.4);
      }
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "rgba(240,236,222,0.9)";
      ctx.fillRect(7.2 + i * 3.4, -54, 0.9, 22);
    }
    // pavilion roof
    ctx.beginPath();
    ctx.moveTo(4.6, -54);
    ctx.quadraticCurveTo(8, -57.2, 12.5, -58);
    ctx.quadraticCurveTo(17, -57.2, 20.4, -54);
    ctx.closePath();
    ctx.fillStyle = "rgba(150,156,140,0.96)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,64,50,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    // chimneys on the roofline
    for (const cx of [-44, -28, -12]) {
      ctx.fillStyle = "rgba(140,132,116,0.9)";
      ctx.fillRect(cx, -58, 2.2, 4.2);
    }

    // Alexander Column
    ctx.fillStyle = "rgba(226,218,198,0.92)";
    ctx.fillRect(-40.6, -60, 3.2, 28);
    ctx.strokeStyle = "rgba(74,64,50,0.45)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(-40.6, -60, 3.2, 28);
    ctx.beginPath(); ctx.moveTo(-41.4, -60); ctx.lineTo(-39, -64.6); ctx.lineTo(-36.6, -60); ctx.closePath();
    ctx.fillStyle = "rgba(214,204,184,0.96)"; ctx.fill(); ctx.stroke();

    // Neva
    const riv = ctx.createLinearGradient(0, -26, 0, -13);
    riv.addColorStop(0, "rgba(68,82,92,0.92)");
    riv.addColorStop(0.55, "rgba(54,68,78,0.96)");
    riv.addColorStop(1, "rgba(42,54,64,0.98)");
    ctx.fillStyle = riv;
    ctx.fillRect(-50, -26, 100, 13);
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = "rgba(226,214,188,0.18)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-48, -24 + i * 2.0);
      ctx.quadraticCurveTo(0, -25 + i * 2.0 + Math.sin(t + i) * 0.5, 48, -24 + i * 2.0); ctx.stroke();
    }
    // bridge railing left
    ctx.strokeStyle = "rgba(54,48,38,0.85)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-50, -26); ctx.lineTo(-14, -26); ctx.stroke();
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-48 + i * 4, -26); ctx.lineTo(-48 + i * 4, -28.4); ctx.stroke(); }
    // Aurora
    ctx.save();
    ctx.translate(34, -24);
    ctx.scale(0.58, 0.58);
    ctx.fillStyle = "rgba(56,62,68,0.95)";
    ctx.beginPath();
    ctx.moveTo(-18, 0); ctx.lineTo(17, 0); ctx.lineTo(14, -3.2); ctx.lineTo(-15, -3.2); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(64,70,76,0.97)";
    ctx.fillRect(-11, -7.4, 20, 4.4);
    for (const fx of [-8, 0, 8]) { ctx.fillRect(fx - 1.3, -11, 2.6, 3.6); }
    ctx.strokeStyle = "rgba(56,62,68,0.96)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-14, -7.4); ctx.lineTo(-14, -19); ctx.moveTo(10, -7.4); ctx.lineTo(10, -17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -19); ctx.lineTo(-8, -16.4); ctx.lineTo(-14, -14.4); ctx.closePath();
    ctx.fillStyle = RED; ctx.fill();
    ctx.restore();

    // barricade
    ctx.strokeStyle = "rgba(70,46,28,0.95)"; ctx.lineWidth = 0.7;
    for (let i = 0; i < 7; i++) {
      const bx = -36 + i * 11;
      ctx.beginPath(); ctx.moveTo(bx - 3, -11); ctx.lineTo(bx + 3, -16); ctx.moveTo(bx - 3, -16); ctx.lineTo(bx + 3, -11); ctx.stroke();
    }
    ctx.fillStyle = "rgba(108,74,44,0.96)";
    ctx.fillRect(-38, -16.4, 74, 2.4);
    ctx.strokeStyle = hexA(INK, 0.5); ctx.lineWidth = 0.2;
    ctx.strokeRect(-38, -16.4, 74, 2.4);
    // overturned cart
    ctx.strokeStyle = "rgba(70,46,28,0.9)"; ctx.lineWidth = 0.5;
    ctx.strokeRect(-30, -20.6, 11, 5);
    ctx.beginPath(); ctx.arc(-27, -15.6, 2.6, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(-21.6, -15.6, 2.6, 0, TAU); ctx.stroke();

    // red flag
    ctx.strokeStyle = INK; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(-2, -16.4); ctx.lineTo(-2, -43); ctx.stroke();
    const wave = Math.sin(t * 2.2) * 1.8;
    ctx.beginPath();
    ctx.moveTo(-1.8, -42.2);
    ctx.quadraticCurveTo(4.6 + wave, -41.4, 9.2 + wave, -36.6);
    ctx.lineTo(-1.8, -31.6);
    ctx.closePath();
    ctx.fillStyle = "rgba(176,52,38,0.97)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.35); ctx.lineWidth = 0.18; ctx.stroke();
    // second flag
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(24, -16); ctx.lineTo(24, -30); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24.2, -29.4);
    ctx.quadraticCurveTo(28 + wave * 0.6, -28.8, 31 + wave * 0.6, -25.8);
    ctx.lineTo(24.2, -22.8);
    ctx.closePath();
    ctx.fillStyle = "rgba(168,52,38,0.92)"; ctx.fill();

    // crowd: three clusters with depth
    const crowd = [
      { x: -34, y: -13.6, s: 0.28, c: "rgba(52,52,56,0.96)", h: "cap" },
      { x: -29, y: -13.0, s: 0.30, c: "rgba(64,58,52,0.96)", h: "helmet" },
      { x: -24, y: -12.4, s: 0.31, c: "rgba(52,52,56,0.96)", h: "cap" },
      { x: -17, y: -11.8, s: 0.33, c: "rgba(72,62,52,0.96)", h: "cap" },
      { x: -11, y: -11.0, s: 0.35, c: "rgba(52,52,56,0.96)", h: "helmet" },
      { x: -6, y: -10.2, s: 0.36, c: "rgba(64,58,52,0.96)", h: "cap" },
      { x: 1, y: -9.4, s: 0.38, c: "rgba(52,52,56,0.96)", h: "cap" },
      { x: 8, y: -8.6, s: 0.40, c: "rgba(72,62,52,0.96)", h: "helmet" },
      { x: 15, y: -7.8, s: 0.41, c: "rgba(52,52,56,0.96)", h: "cap" },
      { x: 22, y: -7.0, s: 0.40, c: "rgba(64,58,52,0.96)", h: "cap" },
      { x: 29, y: -6.2, s: 0.38, c: "rgba(52,52,56,0.96)", h: "helmet" },
      { x: 36, y: -5.4, s: 0.36, c: "rgba(72,62,52,0.96)", h: "cap" },
    ];
    crowd.forEach((c, i) => {
      person(ctx, c.x, c.y, c.s, c.c, {
        phase: t * 0.9 + i, seed: i, hat: c.h, fill: c.c,
        arm: i === 5 || i === 8, spear: i % 4 === 1,
      });
    });
    // foreground cobbles
    ctx.fillStyle = "rgba(108,86,60,0.28)";
    ctx.fillRect(-50, -5.4, 100, 5.4);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = "rgba(74,52,30,0.25)"; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(-48 + i * 5.6, -5.2); ctx.lineTo(-46 + i * 5.6, -0.2); ctx.stroke();
    }
    // fallen rifles / drum
    ctx.strokeStyle = "rgba(60,42,26,0.8)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(-18, -1.4); ctx.lineTo(-12, -3.6); ctx.moveTo(-16, -2.8); ctx.lineTo(-10, -0.6); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(14, -1.6, 3.4, 1.6, 0.2, 0, TAU);
    ctx.fillStyle = "rgba(132,96,58,0.9)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.5); ctx.lineWidth = 0.2; ctx.stroke();

    // snow
    for (let i = 0; i < 80; i++) {
      const sx = -50 + ((i * 31 + t * 6) % 100);
      const sy = -66 + ((i * 47 + t * 9) % 66);
      ctx.beginPath(); ctx.arc(sx, sy, 0.16 + (i % 3) * 0.08, 0, TAU);
      ctx.fillStyle = "rgba(246,240,226,0.68)"; ctx.fill();
    }
    // snow bank foreground
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.quadraticCurveTo(-24, -2.6, 4, -1.4);
    ctx.quadraticCurveTo(30, -0.4, 50, -2.2);
    ctx.lineTo(50, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(236,230,214,0.55)"; ctx.fill();
  };

  const russianMap = function (ctx, t) {
    // soft winter floor
    mapFloor(ctx, -8, 58, "#b9a888", 0.4);
    palaceFacade(ctx, 0, -26, 128, 26, t);
    // red flag
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(-8, -62); ctx.stroke();
    const wave = Math.sin(t * 2.2) * 2.4;
    ctx.beginPath();
    ctx.moveTo(-7.6, -61);
    ctx.quadraticCurveTo(8 + wave, -59, 18 + wave, -50);
    ctx.lineTo(-7.6, -41);
    ctx.closePath();
    ctx.fillStyle = "rgba(176,52,38,0.96)"; ctx.fill();
    // crowd
    for (let i = 0; i < 9; i++) {
      const x = -46 + i * 11.5;
      const y = -16 + (i % 3) * 1.6;
      person(ctx, x, y, 0.62, "rgba(52,52,56,0.96)", { phase: t + i, hat: i % 3 ? "cap" : "helmet", fill: i % 2 ? "rgba(60,56,52,0.96)" : "rgba(48,48,52,0.96)", arm: i === 4 || i === 7, spear: i % 4 === 1 });
    }
    // searchlight + snow
    for (const [bx, ang] of [[16, -1.9], [-18, -1.1]]) {
      const ex = bx + Math.cos(ang) * 80, ey = -24 + Math.sin(ang) * 80;
      const grd = ctx.createLinearGradient(bx, -24, ex, ey);
      grd.addColorStop(0, "rgba(240,228,200,0.18)"); grd.addColorStop(1, "rgba(240,228,200,0)");
      ctx.beginPath(); ctx.moveTo(bx - 1, -24); ctx.lineTo(ex - 5, ey); ctx.lineTo(ex + 5, ey); ctx.lineTo(bx + 1, -24); ctx.closePath();
      ctx.fillStyle = grd; ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const sx = -60 + ((i * 31 + t * 6) % 120);
      const sy = -80 + ((i * 47 + t * 9) % 90);
      ctx.beginPath(); ctx.arc(sx, sy, 0.35 + (i % 3) * 0.12, 0, TAU);
      ctx.fillStyle = "rgba(246,240,226,0.55)"; ctx.fill();
    }
  };

  /* ── 5. Taj Mahal · 泰姬陵的倒影 ──────────────────────── */
  const tajStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -34);
    sky.addColorStop(0, "#f7e2c4");
    sky.addColorStop(0.5, "#f3d3ad");
    sky.addColorStop(1, "#eac197");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -34 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 22, -76, 24, "#e8b46c", 0.38);
    ctx.beginPath(); ctx.arc(22, -76, 6.4, 0, TAU);
    ctx.fillStyle = "rgba(230,176,104,0.9)"; ctx.fill();
    cloud(ctx, -22, -92, 18, "#fff5e3", 0.5);
    cloud(ctx, 34, -88, 12, "#fff5e3", 0.42);
    // distant tree line
    for (let i = 0; i < 18; i++) {
      const tx = -50 + i * 5.8;
      ctx.beginPath(); ctx.ellipse(tx, -35, 2.4, 2.0, 0, 0, TAU);
      ctx.fillStyle = "rgba(104,116,70,0.55)"; ctx.fill();
    }
    // plinth
    ctx.fillStyle = "rgba(232,220,198,0.98)";
    ctx.fillRect(-46, -34, 92, 4);
    ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.24;
    ctx.strokeRect(-42, -34, 84, 4);
    // minarets
    minaret(ctx, -41, -30, 34, 2.8, "rgba(246,238,220,0.98)");
    minaret(ctx, 41, -30, 34, 2.8, "rgba(246,238,220,0.98)");
    minaret(ctx, -30, -30, 26, 2.0, "rgba(240,232,214,0.96)");
    minaret(ctx, 30, -30, 26, 2.0, "rgba(240,232,214,0.96)");
    // mausoleum
    domeTomb(ctx, 0, -30, 38, 40, "rgba(248,241,226,0.99)");
    // soft form shadow on the right side of the mausoleum, clipped to its silhouette
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -66);
    ctx.quadraticCurveTo(12, -62, 13.4, -52);
    ctx.lineTo(14.4, -31);
    ctx.lineTo(0, -31);
    ctx.closePath();
    ctx.clip();
    const shg = ctx.createLinearGradient(0, 0, 15, 0);
    shg.addColorStop(0, "rgba(116,92,60,0)");
    shg.addColorStop(0.65, "rgba(116,92,60,0.06)");
    shg.addColorStop(1, "rgba(116,92,60,0.18)");
    ctx.fillStyle = shg;
    ctx.fillRect(0, -70, 16, 42);
    ctx.restore();
    // plinth cast shadow
    ctx.fillStyle = "rgba(116,92,60,0.08)";
    ctx.fillRect(6, -30, 34, 1.2);
    // dome rim light
    ctx.beginPath();
    ctx.moveTo(-11.4, -53);
    ctx.quadraticCurveTo(-10.6, -62.6, -2.4, -66.4);
    ctx.strokeStyle = "rgba(255,252,240,0.8)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -67.2, 0.8, 0, TAU);
    ctx.fillStyle = "rgba(216,178,102,0.95)"; ctx.fill();
    // pool glint
    ctx.beginPath();
    ctx.ellipse(0, -24.4, 4.6, 1.0, 0, 0, TAU);
    ctx.fillStyle = "rgba(246,238,220,0.5)"; ctx.fill();
    // marble inlay
    ctx.strokeStyle = "rgba(176,138,62,0.45)"; ctx.lineWidth = 0.16;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-11.6, -46 + i * 5);
      ctx.lineTo(-4.8, -46 + i * 5);
      ctx.moveTo(4.8, -46 + i * 5);
      ctx.lineTo(11.6, -46 + i * 5);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(176,138,62,0.35)"; ctx.lineWidth = 0.14;
    ctx.strokeRect(-12.6, -47.6, 25.2, 15.6);
    // entry gateway framing (red sandstone)
    ctx.fillStyle = "rgba(176,104,72,0.9)";
    ctx.fillRect(-50, -34, 5, 30);
    ctx.fillRect(45, -34, 5, 30);
    ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.2;
    ctx.strokeRect(-50, -34, 5, 30); ctx.strokeRect(45, -34, 5, 30);

    // pool
    const pool = ctx.createLinearGradient(0, -26, 0, 0);
    pool.addColorStop(0, "#9db3a6");
    pool.addColorStop(1, "#7f9d95");
    ctx.fillStyle = pool;
    ctx.fillRect(-7, -26, 14, 26);
    ctx.strokeStyle = "rgba(232,220,198,0.9)"; ctx.lineWidth = 1.0;
    ctx.strokeRect(-7, -26, 14, 26);
    // reflection: inverted marble silhouette inside the water
    ctx.save();
    ctx.beginPath(); ctx.rect(-7, -26, 14, 26); ctx.clip();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "rgba(232,236,220,0.95)";
    // dome
    ctx.beginPath();
    ctx.moveTo(-6.4, -25.4);
    ctx.lineTo(-6.4, -19.2);
    ctx.quadraticCurveTo(-4.4, -7.2, 0, -5.8);
    ctx.quadraticCurveTo(4.4, -7.2, 6.4, -19.2);
    ctx.lineTo(6.4, -25.4);
    ctx.closePath();
    ctx.fill();
    // body + finial
    ctx.fillRect(-5.4, -25.4, 10.8, 2.6);
    ctx.fillStyle = "rgba(244,236,218,0.9)";
    ctx.fillRect(-0.35, -24.2, 0.7, -2.2);
    // minaret reflections
    ctx.fillStyle = "rgba(236,230,212,0.8)";
    ctx.fillRect(-6.5, -24.6, 0.7, 9);
    ctx.fillRect(5.8, -24.6, 0.7, 9);
    ctx.restore();
    // shimmer over the reflection
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = "rgba(238,230,208," + (0.14 + (i % 3) * 0.05) + ")";
      ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-6.4, -23.4 + i * 2.3); ctx.lineTo(6.4, -23.8 + i * 2.3); ctx.stroke();
    }
    // water lines
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = "rgba(238,230,208,0.3)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-7, -22 + i * 2.6); ctx.quadraticCurveTo(0, -23 + i * 2.6 + Math.sin(t + i) * 0.3, 7, -22 + i * 2.6); ctx.stroke();
    }
    // cypress avenues
    for (let i = 0; i < 4; i++) {
      const cy = -22 + i * 5.4;
      for (const cx of [-14, 14]) {
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx - 1.8, cy + 6, cx, cy + 12); ctx.quadraticCurveTo(cx + 1.8, cy + 6, cx, cy);
        ctx.closePath();
        ctx.fillStyle = "rgba(86,100,58,0.8)"; ctx.fill();
        ctx.strokeStyle = hexA(INK, 0.25); ctx.lineWidth = 0.12; ctx.stroke();
      }
    }
    // parterres with hedges and paths
    for (const side of [-1, 1]) {
      const gx = side * 22 - 10;
      ctx.fillStyle = "rgba(150,140,84,0.22)";
      ctx.fillRect(gx, -20, 20, 20);
      ctx.strokeStyle = "rgba(232,220,198,0.55)"; ctx.lineWidth = 0.3;
      ctx.strokeRect(gx, -20, 20, 20);
      // hedge rows
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 7; k++) {
          ctx.beginPath();
          ctx.ellipse(gx + 2.4 + k * 2.6, -17 + r * 6.2, 1.3, 1.0, 0, 0, TAU);
          ctx.fillStyle = "rgba(86,100,58,0.68)"; ctx.fill();
        }
      }
      // flower dots
      for (let i = 0; i < 12; i++) {
        ctx.beginPath(); ctx.arc(gx + 3 + (i * 7) % 16, -15 + (i * 5) % 14, 0.28, 0, TAU);
        ctx.fillStyle = side < 0 ? "rgba(196,88,64,0.6)" : "rgba(214,170,90,0.6)"; ctx.fill();
      }
    }
    // low foreground hedges framing the pool
    for (const side of [-1, 1]) {
      const hx = side * 30;
      ctx.beginPath();
      ctx.moveTo(hx - 18, 0);
      ctx.quadraticCurveTo(hx - 6, -4.4, hx + 14, -3.4);
      ctx.quadraticCurveTo(hx + 18, -2.4, hx + 18, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(84,98,58,0.78)";
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(hx - 12 + i * 5.4, -2.6 - (i % 2) * 1.2, 2.2, 1.5, 0, 0, TAU);
        ctx.fillStyle = "rgba(74,88,50,0.82)"; ctx.fill();
      }
    }
    // figures on the plinth
    person(ctx, -10, -33.4, 0.13, "rgba(67,48,29,0.95)", { phase: t, fill: "rgba(168,64,44,0.9)", hat: "cap" });
    person(ctx, 12, -33.4, 0.13, "rgba(67,48,29,0.95)", { phase: t + 1, fill: "rgba(84,104,112,0.9)", hat: "straw" });
    // birds
    bird(ctx, -30, -76, 1.1, "rgba(67,48,29,0.4)");
    bird(ctx, -24, -79, 0.8, "rgba(67,48,29,0.35)");
    // petals
    for (let i = 0; i < 16; i++) {
      const px = -46 + ((i * 23 + t * 4) % 92);
      const py = -50 + ((i * 37 + t * 6) % 48);
      ctx.beginPath(); ctx.ellipse(px, py, 0.35, 0.18, i, 0, TAU);
      ctx.fillStyle = "rgba(214,150,120,0.5)"; ctx.fill();
    }
  };

  const tajMap = function (ctx, t) {
    mapFloor(ctx, -10, 54, "#c3a878", 0.36);
    minaret(ctx, -40, -22, 30, 3.2, "rgba(246,238,220,0.98)");
    minaret(ctx, 40, -22, 30, 3.2, "rgba(246,238,220,0.98)");
    minaret(ctx, -28, -22, 23, 2.4, "rgba(240,232,214,0.96)");
    minaret(ctx, 28, -22, 23, 2.4, "rgba(240,232,214,0.96)");
    domeTomb(ctx, 0, -22, 40, 40, "rgba(248,241,226,0.99)");
    // pool
    ctx.fillStyle = "rgba(130,160,150,0.9)";
    ctx.fillRect(-9, -22, 18, 24);
    ctx.strokeStyle = "rgba(232,220,198,0.85)"; ctx.lineWidth = 0.8;
    ctx.strokeRect(-9, -22, 18, 24);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(238,230,208,0.35)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-8, -18 + i * 4); ctx.quadraticCurveTo(0, -19 + i * 4 + Math.sin(t + i) * 0.5, 8, -18 + i * 4); ctx.stroke();
    }
    // cypress
    for (const cx of [-18, 18, -24, 24]) {
      ctx.beginPath();
      ctx.moveTo(cx, -8); ctx.quadraticCurveTo(cx - 3, -24, cx, -38); ctx.quadraticCurveTo(cx + 3, -24, cx, -8); ctx.closePath();
      ctx.fillStyle = "rgba(86,100,58,0.8)"; ctx.fill();
    }
    bird(ctx, -38, -70, 2.0, "rgba(67,48,29,0.4)");
  };

  /* ── 6. Cai Lun · 造纸坊 ──────────────────────────────── */
  const cailunStage = function (ctx, top, t) {
    // back wall
    const wall = ctx.createLinearGradient(0, top, 0, -8);
    wall.addColorStop(0, "#c9ac82");
    wall.addColorStop(0.55, "#e2c9a0");
    wall.addColorStop(1, "#d3b689");
    ctx.fillStyle = wall;
    ctx.fillRect(-50, top, 100, -8 - top);
    // wainscot
    ctx.fillStyle = "rgba(168,132,90,0.35)";
    ctx.fillRect(-50, -26, 100, 18);
    ctx.strokeStyle = "rgba(92,62,36,0.25)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(-50, -26); ctx.lineTo(50, -26); ctx.stroke();

    // roof beams
    ctx.fillStyle = "rgba(92,60,34,0.96)";
    ctx.fillRect(-50, top, 100, 6.5);
    ctx.strokeStyle = "rgba(120,82,48,0.9)"; ctx.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      const x = -50 + i * 15;
      ctx.beginPath(); ctx.moveTo(x, top + 6); ctx.lineTo(x + 12, top + 6.4); ctx.stroke();
    }
    // woodgrain on the beam
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = "rgba(62,40,22,0.35)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-48, top + 1.2 + i * 0.8); ctx.quadraticCurveTo(0, top + 0.4 + i * 0.8, 48, top + 1.2 + i * 0.8); ctx.stroke();
    }
    // side posts
    for (const px of [-48, 46]) {
      ctx.fillStyle = "rgba(112,76,44,0.92)";
      ctx.fillRect(px, top + 6, 2.8, -top - 14);
      ctx.strokeStyle = "rgba(62,40,22,0.35)"; ctx.lineWidth = 0.18;
      ctx.strokeRect(px, top + 6, 2.8, -top - 14);
    }

    // lattice window right
    ctx.fillStyle = "rgba(244,232,204,0.92)";
    ctx.fillRect(24, -74, 22, 22);
    ctx.strokeStyle = "rgba(92,62,36,0.7)"; ctx.lineWidth = 0.5;
    ctx.strokeRect(24, -74, 22, 22);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(24 + i * 5.5, -74); ctx.lineTo(24 + i * 5.5, -52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, -74 + i * 5.5); ctx.lineTo(46, -74 + i * 5.5); ctx.stroke();
    }
    // light shaft
    const lg = ctx.createLinearGradient(36, -70, 8, -6);
    lg.addColorStop(0, "rgba(255,246,218,0.55)");
    lg.addColorStop(1, "rgba(255,246,218,0.03)");
    ctx.beginPath();
    ctx.moveTo(24, -72); ctx.lineTo(46, -72); ctx.lineTo(18, -2); ctx.lineTo(-10, -2); ctx.closePath();
    ctx.fillStyle = lg; ctx.fill();

    // floor
    const fl = ctx.createLinearGradient(0, -8, 0, 0);
    fl.addColorStop(0, "rgba(160,116,72,0.95)");
    fl.addColorStop(1, "rgba(132,92,56,0.98)");
    ctx.fillStyle = fl;
    ctx.fillRect(-50, -8, 100, 8);
    // perspective floorboards
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = "rgba(74,48,28,0.3)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(-50 + i * 12.5, 0); ctx.lineTo(-30 + i * 7.5, -8); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(74,48,28,0.25)"; ctx.lineWidth = 0.18;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-50, -2 - i * 2); ctx.lineTo(50, -2 - i * 2); ctx.stroke(); }

    // back shelves + rolled paper
    for (let i = 0; i < 3; i++) {
      const sy = -66 + i * 13;
      ctx.fillStyle = "rgba(132,94,56,0.85)";
      ctx.fillRect(-46, sy, 24, 2.0);
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = "rgba(228,198,150,0.92)";
        ctx.fillRect(-44 + k * 3.8, sy - 3.2, 3.0, 3.2);
        ctx.strokeStyle = "rgba(92,62,36,0.25)"; ctx.lineWidth = 0.1;
        ctx.strokeRect(-44 + k * 3.8, sy - 3.2, 3.0, 3.2);
      }
    }
    // hanging rolls from the rafter
    for (const bx of [-30, -22, 36]) {
      ctx.strokeStyle = "rgba(74,50,30,0.75)"; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(bx, top + 7); ctx.lineTo(bx, top + 14); ctx.stroke();
      ctx.fillStyle = "rgba(224,196,152,0.95)";
      ctx.fillRect(bx - 1.2, top + 14, 2.4, 6);
      ctx.strokeStyle = "rgba(92,62,36,0.35)"; ctx.lineWidth = 0.12; ctx.strokeRect(bx - 1.2, top + 14, 2.4, 6);
    }

    // left foreground: bundles, mortar, carrier
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(-44, -10 - i * 1.0);
      ctx.rotate(-0.28 + i * 0.1);
      ctx.fillStyle = "rgba(152,110,64,0.96)";
      ctx.fillRect(-4, 0, 14, 1.9);
      ctx.strokeStyle = "rgba(74,48,28,0.4)"; ctx.lineWidth = 0.12;
      ctx.strokeRect(-4, 0, 14, 1.9);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(160,148,124,0.96)";
    ctx.beginPath();
    ctx.moveTo(-40, -8); ctx.lineTo(-37, -13); ctx.lineTo(-31, -13); ctx.lineTo(-28, -8); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = "rgba(74,50,30,0.45)"; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-34, -13, 4.6, 1.1, 0, 0, TAU); ctx.fillStyle = "rgba(120,110,90,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(96,70,44,0.9)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-35, -12); ctx.lineTo(-31, -22); ctx.stroke();
    // carrier with a stack of paper
    person(ctx, -30, -8, 0.40, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(150,112,74,0.96)", hat: "straw", arm: true });
    ctx.fillStyle = "rgba(248,240,222,0.98)";
    ctx.fillRect(-35, -21, 8, 1.2);
    ctx.strokeStyle = "rgba(92,62,36,0.3)"; ctx.lineWidth = 0.12; ctx.strokeRect(-35, -21, 8, 1.2);

    // vat and craftsman
    paperVat(ctx, -8, -8, 24, 12);
    person(ctx, -17, -8, 0.42, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(92,104,122,0.96)", hat: "cap", arm: true });
    // screen frame
    ctx.save();
    ctx.translate(-6, -27);
    ctx.rotate(-0.07 + Math.sin(t * 0.7) * 0.02);
    ctx.strokeStyle = "rgba(92,60,34,0.96)"; ctx.lineWidth = 1.0;
    ctx.strokeRect(-9, -4.6, 18, 9.2);
    ctx.fillStyle = "rgba(242,232,208,0.9)";
    ctx.fillRect(-8.2, -3.8, 16.4, 7.6);
    ctx.strokeStyle = "rgba(120,96,64,0.5)"; ctx.lineWidth = 0.18;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-8.2, -2.6 + i * 1.5); ctx.lineTo(8.2, -2.6 + i * 1.5); ctx.stroke(); }
    ctx.restore();
    // arms
    ctx.strokeStyle = "rgba(58,42,26,0.95)"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-15.4, -16.4); ctx.lineTo(-12.0, -24.2); ctx.moveTo(-14.6, -16.0); ctx.lineTo(-17.6, -24.4); ctx.stroke();
    // drips
    for (let i = 0; i < 6; i++) {
      const q = (t * 0.9 + i * 0.17) % 1;
      ctx.beginPath(); ctx.arc(-13 + i * 2.4, -21 + q * 9, 0.24, 0, TAU);
      ctx.fillStyle = "rgba(226,216,192," + (0.6 * (1 - q)) + ")"; ctx.fill();
    }

    // drying rack right
    paperRack(ctx, 30, -8, 30, 30, t, "rgba(250,243,226,0.97)");
    // second worker hanging a sheet
    person(ctx, 18, -8, 0.38, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(168,120,80,0.96)", hat: "cap", arm: true });
    // paper stacks + red seal
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(246,238,220,0.99)";
      ctx.fillRect(40, -7 - i * 1.0, 8, 0.9);
      ctx.strokeStyle = "rgba(92,62,36,0.25)"; ctx.lineWidth = 0.1;
      ctx.strokeRect(40, -7 - i * 1.0, 8, 0.9);
    }
    ctx.fillStyle = "rgba(176,60,42,0.9)";
    ctx.fillRect(44.4, -10.2, 2.0, 2.0);

    // scholar at a low desk
    ctx.fillStyle = "rgba(130,90,52,0.96)";
    ctx.fillRect(4, -11, 12, 1.5);
    ctx.strokeStyle = "rgba(74,50,30,0.4)"; ctx.lineWidth = 0.14;
    ctx.strokeRect(4, -11, 12, 1.5);
    ctx.fillStyle = "rgba(246,238,220,0.98)";
    ctx.fillRect(5.4, -11.8, 9, 0.8);
    person(ctx, 9, -9.6, 0.36, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(112,88,58,0.96)", hat: "cap", arm: true });
    ctx.strokeStyle = INK; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(10.6, -14.6); ctx.lineTo(13.4, -11.4); ctx.stroke();

    // steam and dust
    for (let i = 0; i < 22; i++) {
      const q = (t * 0.16 + i * 0.12) % 1;
      const px = 2 + Math.sin(i * 2.1) * 20 + q * 8;
      const py = -26 - q * 46;
      ctx.beginPath(); ctx.arc(px, py, 0.7 + q * 2.2, 0, TAU);
      ctx.fillStyle = "rgba(248,240,220," + (0.16 * (1 - q)) + ")"; ctx.fill();
    }
    // foreground floor shadow
    ctx.beginPath();
    ctx.ellipse(-8, -1.4, 17, 1.8, 0, 0, TAU);
    ctx.fillStyle = "rgba(74,48,28,0.12)"; ctx.fill();
  };

  const cailunMap = function (ctx, t) {
    mapFloor(ctx, -6, 48, "#c2a06c", 0.45);
    // back shelves
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = "rgba(140,100,60,0.75)";
      ctx.fillRect(-58, -46 + i * 14, 26, 2.4);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = "rgba(228,198,150,0.9)";
        ctx.fillRect(-56 + k * 5, -50 + i * 14, 4, 4);
      }
    }
    paperVat(ctx, -14, -4, 24, 12);
    paperRack(ctx, 28, -4, 38, 38, t, "rgba(250,243,226,0.97)");
    person(ctx, -28, -4, 0.6, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(92,104,122,0.96)", hat: "cap", arm: true });
    // screen frame
    ctx.save();
    ctx.translate(-14, -26);
    ctx.rotate(-0.08);
    ctx.strokeStyle = "rgba(96,64,38,0.96)"; ctx.lineWidth = 1.3;
    ctx.strokeRect(-11, -4.6, 22, 9.2);
    ctx.fillStyle = "rgba(242,232,208,0.9)";
    ctx.fillRect(-10, -3.8, 20, 7.6);
    ctx.restore();
    // paper stack + seal
    ctx.fillStyle = "rgba(246,238,220,0.99)";
    ctx.fillRect(6, -6, 13, 1.5);
    ctx.fillStyle = "rgba(176,60,42,0.88)";
    ctx.fillRect(15, -8.6, 2.2, 2.2);
    // steam
    for (let i = 0; i < 12; i++) {
      const q = (t * 0.16 + i * 0.13) % 1;
      ctx.beginPath(); ctx.arc(-12 + Math.sin(i * 2) * 8, -16 - q * 20, 0.7 + q * 2, 0, TAU);
      ctx.fillStyle = "rgba(248,240,220," + (0.14 * (1 - q)) + ")"; ctx.fill();
    }
  };

  /* ── 7. Peloponnesian War · 爱琴海的三列桨战船 ──────────── */
  const pelopStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -34);
    sky.addColorStop(0, "#e9dcc0");
    sky.addColorStop(0.55, "#efdcb4");
    sky.addColorStop(1, "#e8c894");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -34 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 18, -78, 22, "#e0aa5e", 0.35);
    ctx.beginPath(); ctx.arc(18, -78, 5.2, 0, TAU);
    ctx.fillStyle = "rgba(224,170,94,0.9)"; ctx.fill();
    cloud(ctx, -28, -90, 15, "#fff6e4", 0.45);
    cloud(ctx, 36, -86, 10, "#fff6e4", 0.4);

    // Attic headland with the Acropolis
    acropolis(ctx, 38, -26, 40, "rgba(236,226,204,0.96)");
    // distant coast left
    ridge(ctx, -50, -18, -25, 4, "rgba(140,132,92,0.4)", 5, 5, -22);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(-46 + i * 5.4, -24, 2.4, 1.6, 0, 0, TAU);
      ctx.fillStyle = "rgba(104,116,70,0.5)"; ctx.fill();
    }

    // sea
    const sea = ctx.createLinearGradient(0, -26, 0, 0);
    sea.addColorStop(0, "#7d9fa0");
    sea.addColorStop(0.55, "#5f8489");
    sea.addColorStop(1, "#4f717a");
    ctx.fillStyle = sea;
    ctx.fillRect(-50, -26, 100, 26);
    // swell lines
    for (let i = 0; i < 12; i++) {
      const wy = -22 + i * 2.0;
      ctx.strokeStyle = "rgba(232,238,224," + (0.14 + (i % 3) * 0.05) + ")";
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      for (let x = -50; x <= 50; x += 6) {
        const yy = wy + Math.sin(x * 0.2 + t * 1.1 + i * 0.7) * 0.5;
        if (x === -50) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // sea texture: cross-hatch and crests
    hatch(ctx, -50, -24, 100, 24, "rgba(38,58,64,0.10)", 2.4, -0.18);
    for (let i = 0; i < 9; i++) {
      const wx = -44 + i * 10.6;
      const wy = -20 + (i % 3) * 3.4;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 2.4, wy - 1.0, wx + 5.0, wy);
      ctx.strokeStyle = "rgba(238,244,230,0.42)";
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
    // foreground wave
    ctx.beginPath();
    ctx.moveTo(-52, -2);
    ctx.quadraticCurveTo(-34, -6, -14, -3);
    ctx.quadraticCurveTo(2, -1, 10, 0);
    ctx.strokeStyle = "rgba(238,244,230,0.28)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // distant sail
    ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(-36, -24); ctx.lineTo(-36, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-35.8, -29.8); ctx.lineTo(-32, -27.2); ctx.lineTo(-35.8, -25.4); ctx.closePath();
    ctx.fillStyle = "rgba(238,228,204,0.8)"; ctx.fill();

    // ships: Athenian (blue), Spartan (red), sinking
    trireme(ctx, -40, -17, 0.42, t, { phase: 0, shield: "rgba(88,112,130,0.95)", hull: "rgba(128,90,54,0.97)" });
    trireme(ctx, -14, -12, 0.50, t, { phase: 1.6, shield: "rgba(88,112,130,0.95)", hull: "rgba(120,84,50,0.98)" });
    trireme(ctx, 14, -16, 0.44, t, { phase: 0.8, shield: "rgba(166,66,44,0.95)", hull: "rgba(112,78,48,0.97)" });
    // sinking ship
    ctx.save();
    ctx.translate(39, -8);
    ctx.rotate(0.20);
    ctx.globalAlpha = 0.92;
    trireme(ctx, 0, 0, 0.55, t, { phase: 2.4, shield: "rgba(166,66,44,0.95)", hull: "rgba(96,66,42,0.97)" });
    ctx.restore();
    // waterline shadows + foam under each hull
    for (const [sx, sy, sw] of [[-36, -16.2, 13], [-12, -12.2, 16], [13, -16.2, 14], [38, -9.2, 17]]) {
      ctx.beginPath(); ctx.ellipse(sx, sy, sw, 2.2, 0, 0, TAU);
      ctx.fillStyle = "rgba(44,64,70,0.28)"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx, sy - 0.6, sw * 0.9, 1.2, 0, 0, TAU);
      ctx.fillStyle = "rgba(236,242,226,0.22)"; ctx.fill();
    }
    // spray around the ramming pair
    for (let i = 0; i < 12; i++) {
      const q = (t * 1.4 + i * 0.07) % 1;
      const sx = -2 + Math.sin(i) * 10;
      const sy = -12 - q * 6;
      ctx.beginPath(); ctx.arc(sx, sy, 0.4 + q * 1.4, 0, TAU);
      ctx.fillStyle = "rgba(238,242,226," + (0.3 * (1 - q)) + ")"; ctx.fill();
    }
    // floating shield + oar
    ctx.beginPath(); ctx.ellipse(-2, -5, 1.8, 1.2, 0.3, 0, TAU);
    ctx.fillStyle = "rgba(88,112,130,0.9)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.4); ctx.lineWidth = 0.15; ctx.stroke();
    ctx.strokeStyle = "rgba(74,50,30,0.7)"; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(18, -6); ctx.stroke();
    // dolphin
    ctx.strokeStyle = "rgba(58,74,82,0.8)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-42, -8); ctx.quadraticCurveTo(-38, -11, -34, -8); ctx.quadraticCurveTo(-38, -6, -42, -8); ctx.stroke();

    // distant ships near the horizon
    ctx.save();
    ctx.globalAlpha = 0.55;
    trireme(ctx, -32, -24, 0.16, t, { phase: 1.2, shield: "rgba(88,112,130,0.9)", hull: "rgba(90,68,46,0.9)" });
    trireme(ctx, 6, -25, 0.13, t, { phase: 2.1, shield: "rgba(166,66,44,0.9)", hull: "rgba(90,68,46,0.9)" });
    ctx.restore();
    // foreground wave framing the battle
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.quadraticCurveTo(-30, -5.2, -4, -2.2);
    ctx.quadraticCurveTo(20, 0, 52, -3.4);
    ctx.lineTo(52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(64,92,102,0.9)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-52, -0.4);
    ctx.quadraticCurveTo(-30, -5.6, -4, -2.6);
    ctx.quadraticCurveTo(20, -0.4, 52, -3.8);
    ctx.strokeStyle = "rgba(238,244,230,0.55)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // cliff hatching under the Acropolis
    hatch(ctx, 20, -22, 30, 12, "rgba(67,48,29,0.16)", 1.8, -0.8);
    // cloud bank and birds
    cloud(ctx, -12, -70, 30, "rgba(250,240,220,0.42)", 0.5);
    cloud(ctx, 24, -80, 20, "rgba(250,240,220,0.35)", 0.45);
    cloud(ctx, -40, -86, 14, "rgba(250,240,220,0.3)", 0.4);
    for (let i = 0; i < 5; i++) {
      bird(ctx, -32 + i * 7, -76 - (i % 2) * 3, 0.9 + (i % 2) * 0.2, "rgba(67,48,29,0.38)");
    }
  };

  const pelopMap = function (ctx, t) {
    acropolis(ctx, 42, -18, 34, "rgba(236,226,204,0.96)");
    // sea: soft wash, no hard rim
    mapFloor(ctx, -10, 74, "#3f6a72", 0.52);
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = "rgba(232,238,224,0.35)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-52, -16 + i * 4); ctx.quadraticCurveTo(0, -19 + i * 4 + Math.sin(t + i) * 0.8, 52, -16 + i * 4); ctx.stroke();
    }
    trireme(ctx, -14, -12, 0.95, t, { phase: 0.4, shield: "rgba(88,112,130,0.95)", hull: "rgba(120,84,50,0.98)" });
    trireme(ctx, 20, -6, 1.15, t, { phase: 1.8, shield: "rgba(166,66,44,0.95)", hull: "rgba(112,78,48,0.97)" });
    // spray
    for (let i = 0; i < 8; i++) {
      const q = (t * 1.3 + i * 0.12) % 1;
      ctx.beginPath(); ctx.arc(-4 + Math.sin(i) * 10, -8 - q * 5, 0.7 + q * 2, 0, TAU);
      ctx.fillStyle = "rgba(238,242,226," + (0.28 * (1 - q)) + ")"; ctx.fill();
    }
    bird(ctx, -46, -62, 2.0, "rgba(67,48,29,0.4)");
  };

  /* ── 8. Zheng He · 宝船下西洋 ─────────────────────────── */
  const zhengStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -32);
    sky.addColorStop(0, "#5c6f74");
    sky.addColorStop(0.45, "#93a09a");
    sky.addColorStop(0.78, "#d8c49a");
    sky.addColorStop(1, "#ecd3a3");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -32 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    // stars + compass arc
    stars(ctx, top, t, 30, 9);
    ctx.save();
    ctx.translate(-28, -76);
    ctx.strokeStyle = "rgba(216,178,102,0.35)";
    ctx.lineWidth = 0.26;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16;
      const r = i % 4 === 0 ? 10 : 6.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
    }
    ctx.restore();
    cloud(ctx, 22, -82, 18, "rgba(240,230,206,0.35)", 0.5);

    // distant coast with palms (left)
    ctx.beginPath();
    ctx.moveTo(-50, -30);
    ctx.quadraticCurveTo(-38, -36, -26, -31);
    ctx.quadraticCurveTo(-18, -28, -12, -26);
    ctx.lineTo(-50, -26);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,126,76,0.85)"; ctx.fill();
    palm(ctx, -40, -30, 18, 2, "rgba(84,72,44,0.9)");
    palm(ctx, -32, -29, 15, -1, "rgba(84,72,44,0.9)");
    palm(ctx, -24, -28, 12, 2, "rgba(84,72,44,0.9)");

    // sea
    const sea = ctx.createLinearGradient(0, -30, 0, 0);
    sea.addColorStop(0, "#5b7f82");
    sea.addColorStop(0.5, "#426d74");
    sea.addColorStop(1, "#345c66");
    ctx.fillStyle = sea;
    ctx.fillRect(-50, -30, 100, 30);
    hatch(ctx, -50, -30, 100, 30, "rgba(40,72,76,0.13)", 2.0, -0.06);
    hatch(ctx, -50, -30, 100, 30, "rgba(40,72,76,0.08)", 2.6, 0.5);
    for (let i = 0; i < 12; i++) {
      const wy = -28 + i * 2.4;
      ctx.strokeStyle = "rgba(226,236,224," + (0.1 + (i % 3) * 0.04) + ")";
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      for (let x = -50; x <= 50; x += 8) {
        const yy = wy + Math.sin(x * 0.12 + t * 0.9 + i) * 0.4;
        if (x === -50) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    // fleet
    junk(ctx, 2, -18, 0.80, t, { phase: 0.2, masts: [28, 14, 0, -14, -26], sail: "rgba(174,62,42,0.92)" });
    junk(ctx, -34, -12, 0.38, t, { phase: 1.4, sail: "rgba(170,74,46,0.9)" });
    junk(ctx, 40, -8, 0.46, t, { phase: 2.2, sail: "rgba(168,84,48,0.9)" });
    // sail seam highlights
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(246,210,160,0.28)";
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      ctx.moveTo(2 + i * 6, -22 - (i % 2) * 3);
      ctx.lineTo(4 + i * 6, -38 - (i % 2) * 2);
      ctx.stroke();
    }
    // foreground bow wave
    for (let i = 0; i < 10; i++) {
      const q = (t * 0.9 + i * 0.1) % 1;
      ctx.beginPath(); ctx.arc(32 + q * 8, -10 + i * 0.5, 0.6 + q * 2.2, 0, TAU);
      ctx.fillStyle = "rgba(236,242,228," + (0.22 * (1 - q)) + ")"; ctx.fill();
    }
    // flying fish
    for (let i = 0; i < 4; i++) {
      const fx = -20 + i * 12;
      const fy = -9 - Math.sin(t * 2 + i) * 2;
      ctx.beginPath(); ctx.ellipse(fx, fy, 1.2, 0.35, -0.4, 0, TAU);
      ctx.fillStyle = "rgba(210,224,220,0.85)"; ctx.fill();
    }
    bird(ctx, 28, -68, 1.2, "rgba(232,226,206,0.55)");
  };

  const zhengMap = function (ctx, t) {
    // sea: soft wash, no hard rim
    mapFloor(ctx, -10, 78, "#37646c", 0.55);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "rgba(226,236,224,0.3)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-56, -16 + i * 4); ctx.quadraticCurveTo(0, -19 + i * 4 + Math.sin(t + i) * 0.8, 56, -16 + i * 4); ctx.stroke();
    }
    junk(ctx, -6, -12, 0.78, t, { phase: 0.2, masts: [28, 14, 0, -14, -26], sail: "rgba(174,62,42,0.94)" });
    junk(ctx, -42, -6, 0.34, t, { phase: 1.4, sail: "rgba(170,74,46,0.92)" });
    // compass arc
    ctx.save();
    ctx.translate(-30, -54);
    ctx.strokeStyle = "rgba(216,178,102,0.42)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (i % 2 ? 5 : 9), Math.sin(a) * (i % 2 ? 5 : 9)); ctx.stroke();
    }
    ctx.restore();
    bird(ctx, 40, -50, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 9. Columbus · 巴哈马的第一片浅滩 ─────────────────── */
  const columbusStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -34);
    sky.addColorStop(0, "#dfe3d4");
    sky.addColorStop(0.5, "#efe3c6");
    sky.addColorStop(1, "#f3d9a8");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -34 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, -20, -72, 20, "#e8bc72", 0.32);
    ctx.beginPath(); ctx.arc(-20, -72, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(232,184,110,0.9)"; ctx.fill();
    cloud(ctx, 8, -84, 22, "#fff8e8", 0.6);
    cloud(ctx, -34, -78, 12, "#fff8e8", 0.45);
    cloud(ctx, 36, -74, 10, "#fff8e8", 0.45);

    // sea
    const sea = ctx.createLinearGradient(0, -32, 0, 0);
    sea.addColorStop(0, "#6f9f9c");
    sea.addColorStop(0.55, "#79aaa4");
    sea.addColorStop(1, "#8fbcb0");
    ctx.fillStyle = sea;
    ctx.fillRect(-50, -32, 100, 32);
    hatch(ctx, -50, -32, 100, 32, "rgba(38,74,72,0.12)", 2.2, -0.05);
    hatch(ctx, -50, -32, 100, 32, "rgba(38,74,72,0.07)", 2.8, 0.45);
    // shallow sandbars
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-20 + i * 26, -16 + (i % 2) * 5, 12, 2.4, 0, 0, TAU);
      ctx.fillStyle = "rgba(196,204,168,0.35)"; ctx.fill();
    }
    // waves
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = "rgba(240,244,228,0.26)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-50, -26 + i * 3); ctx.quadraticCurveTo(0, -27 + i * 3 + Math.sin(t + i) * 0.4, 50, -26 + i * 3); ctx.stroke();
    }

    // caravel
    ctx.beginPath(); ctx.ellipse(14, -12.4, 19, 2.2, 0, 0, TAU);
    ctx.fillStyle = "rgba(64,92,94,0.28)"; ctx.fill();
    caravel(ctx, 14, -16, 0.86, t, { hull: "rgba(120,82,50,0.98)" });
    // gunports
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(74,50,30,0.75)";
      ctx.fillRect(2 + i * 5.2, -14.4, 1.4, 1.2);
    }
    // wake
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(238,244,230," + (0.26 - i * 0.04) + ")"; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(-2 - i * 3, -10 + i * 1.2); ctx.quadraticCurveTo(4 - i * 3, -8.6 + i * 1.2, 10 - i * 3, -9.4 + i * 1.2); ctx.stroke();
    }
    // small boat lowered
    ctx.save(); ctx.translate(4, -11); ctx.scale(1.25, 1.25);
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(0, 2.6, 5, 0); ctx.quadraticCurveTo(0, 1, -5, 0); ctx.closePath();
    ctx.fillStyle = "rgba(120,84,52,0.95)"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.stroke();
    person(ctx, -1.6, -0.6, 0.17, "rgba(67,48,29,0.95)", { phase: t });
    person(ctx, 2.0, -0.5, 0.17, "rgba(67,48,29,0.95)", { phase: t + 1, fill: "rgba(92,104,122,0.95)" });
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(-2.2, -1.2); ctx.lineTo(-4.6, 1.4); ctx.stroke();
    ctx.restore();

    // island: low green strip with palms
    ctx.beginPath();
    ctx.moveTo(-50, -16);
    ctx.quadraticCurveTo(-38, -20, -26, -17);
    ctx.quadraticCurveTo(-16, -14, -4, -15);
    ctx.lineTo(-4, -12);
    ctx.quadraticCurveTo(-24, -10, -50, -12);
    ctx.closePath();
    ctx.fillStyle = "rgba(150,156,96,0.9)"; ctx.fill();
    // beach
    ctx.beginPath();
    ctx.moveTo(-50, -12);
    ctx.quadraticCurveTo(-30, -10, -4, -12);
    ctx.quadraticCurveTo(-2, -8, -6, -4);
    ctx.quadraticCurveTo(-28, -2, -50, -5);
    ctx.closePath();
    ctx.fillStyle = "rgba(232,220,188,0.96)"; ctx.fill();
    // undergrowth
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.ellipse(-46 + i * 5.2, -15.4 + (i % 2) * 0.6, 2.4, 1.2, 0, 0, TAU);
      ctx.fillStyle = "rgba(104,116,66,0.6)"; ctx.fill();
    }
    palm(ctx, -40, -17, 20, 3, "rgba(84,72,44,0.92)");
    palm(ctx, -30, -16, 17, -2, "rgba(84,72,44,0.92)");
    palm(ctx, -20, -15, 14, 2, "rgba(84,72,44,0.92)");
    // Taíno figures on the beach (dignified, simple)
    person(ctx, -17.6, -6.8, 0.30, "rgba(78,58,40,0.95)", { phase: t, fill: "rgba(150,112,74,0.95)" });
    person(ctx, -14.6, -6.5, 0.33, "rgba(78,58,40,0.95)", { phase: t + 1, fill: "rgba(138,102,70,0.95)", arm: true });
    person(ctx, -11.6, -6.2, 0.31, "rgba(78,58,40,0.95)", { phase: t + 2, fill: "rgba(160,122,82,0.95)" });
    person(ctx, -9.2, -6.0, 0.29, "rgba(78,58,40,0.95)", { phase: t + 3, fill: "rgba(150,112,74,0.95)" });
    person(ctx, -15.8, -5.9, 0.20, "rgba(78,58,40,0.95)", { phase: t + 4, fill: "rgba(170,130,88,0.95)", noShadow: true });
    // rowboat on the beach
    ctx.beginPath(); ctx.moveTo(-24, -5.4); ctx.lineTo(-17, -5.8); ctx.lineTo(-15.4, -4.4); ctx.lineTo(-23, -4.0); ctx.closePath();
    ctx.fillStyle = "rgba(128,90,54,0.95)"; ctx.fill();
    ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.2; ctx.stroke();
    // parrots
    for (const [px, py] of [[-6, -12], [-36, -10]]) {
      ctx.beginPath(); ctx.ellipse(px, py, 0.9, 0.45, -0.3, 0, TAU);
      ctx.fillStyle = "rgba(168,64,44,0.9)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 1.2, py - 0.8); ctx.lineTo(px - 0.4, py - 0.2); ctx.closePath();
      ctx.fillStyle = "rgba(216,178,102,0.9)"; ctx.fill();
    }
    // dark foreground palm frame
    ctx.strokeStyle = "rgba(76,60,36,0.95)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-52, 0); ctx.quadraticCurveTo(-46, -18, -50, -36); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = -1.9 + i * 0.35;
      ctx.beginPath();
      ctx.moveTo(-50, -34);
      ctx.quadraticCurveTo(-50 + Math.cos(a) * 8, -34 + Math.sin(a) * 4, -50 + Math.cos(a) * 14, -34 + Math.sin(a) * 8);
      ctx.strokeStyle = "rgba(84,82,48,0.85)"; ctx.lineWidth = 0.5; ctx.stroke();
    }
    // foreground shells / driftwood
    for (const [sx, sy, ss] of [[-40, -1.4, 0.6], [-26, -0.6, 0.45], [6, -1.2, 0.55]]) {
      ctx.beginPath(); ctx.arc(sx, sy, ss, Math.PI, TAU);
      ctx.fillStyle = "rgba(240,226,196,0.9)"; ctx.fill();
      ctx.strokeStyle = "rgba(150,120,80,0.45)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    ctx.strokeStyle = "rgba(120,88,52,0.8)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(30, -3.4); ctx.stroke();
    // birds
    bird(ctx, -14, -78, 1.1, "rgba(67,48,29,0.4)");
    bird(ctx, -8, -82, 0.8, "rgba(67,48,29,0.35)");
    bird(ctx, 24, -70, 1.0, "rgba(67,48,29,0.35)");
  };

  const columbusMap = function (ctx, t) {
    // sea: soft wash, no hard rim
    mapFloor(ctx, -10, 76, "#5f8f88", 0.55);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "rgba(240,244,228,0.36)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-58, -16 + i * 4); ctx.quadraticCurveTo(0, -19 + i * 4 + Math.sin(t + i) * 0.8, 58, -16 + i * 4); ctx.stroke();
    }
    caravel(ctx, 10, -16, 0.9, t, { hull: "rgba(120,82,50,0.98)" });
    // island strip
    ctx.beginPath();
    ctx.moveTo(-62, -12);
    ctx.quadraticCurveTo(-40, -16, -18, -13);
    ctx.quadraticCurveTo(-6, -11, 2, -12);
    ctx.lineTo(0, -6);
    ctx.quadraticCurveTo(-30, -2, -62, -6);
    ctx.closePath();
    ctx.fillStyle = "rgba(150,156,96,0.92)"; ctx.fill();
    palm(ctx, -48, -12, 24, 4, "rgba(84,72,44,0.92)");
    palm(ctx, -34, -12, 20, -2, "rgba(84,72,44,0.92)");
    palm(ctx, -22, -11, 16, 3, "rgba(84,72,44,0.92)");
    // rowboat
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-6, -6.6); ctx.lineTo(-4, -5.2); ctx.lineTo(-13, -4.8); ctx.closePath();
    ctx.fillStyle = "rgba(128,90,54,0.96)"; ctx.fill(); ctx.strokeStyle = hexA(INK, 0.45); ctx.lineWidth = 0.4; ctx.stroke();
    person(ctx, -9, -5.2, 0.45, "rgba(67,48,29,0.95)", { phase: t });
    bird(ctx, 34, -50, 2.0, "rgba(67,48,29,0.4)");
  };

  /* ── 10. Xuanzang · 大漠孤僧 ──────────────────────────── */
  const xuanzangStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -40);
    sky.addColorStop(0, "#f2e4c6");
    sky.addColorStop(0.52, "#efd3a0");
    sky.addColorStop(1, "#e4bc82");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -40 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 26, -74, 24, "#dfa85e", 0.38);
    ctx.beginPath(); ctx.arc(26, -74, 5.8, 0, TAU);
    ctx.fillStyle = "rgba(220,164,86,0.9)"; ctx.fill();
    cloud(ctx, -20, -88, 16, "#fff7e6", 0.36);
    cloud(ctx, 4, -94, 11, "#fff7e6", 0.3);

    // layered mountain ranges
    const peakRange = (baseY, minH, maxH, color, seed, snow, alpha) => {
      const rr = rng(seed);
      const pts = [];
      let x = -56;
      while (x < 56) {
        const w = 13 + rr() * 16;
        const h = minH + rr() * (maxH - minH);
        pts.push([x, baseY, x + w * 0.52, baseY - h, x + w, baseY]);
        x += w * 0.92;
      }
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.beginPath();
      ctx.moveTo(-56, baseY + 40);
      for (const p of pts) {
        for (let i = 0; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      }
      ctx.lineTo(56, baseY + 40);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(74,54,34,0.32)";
      ctx.lineWidth = 0.24;
      ctx.stroke();
      if (snow) {
        for (const p of pts) {
          const apexX = p[2], apexY = p[3];
          if (apexY < baseY - minH * 0.9) {
            const half = (p[4] - p[0]) * 0.20;
            ctx.beginPath();
            ctx.moveTo(apexX - half, apexY + (p[1] - apexY) * 0.30);
            ctx.lineTo(apexX, apexY);
            ctx.lineTo(apexX + half, apexY + (p[1] - apexY) * 0.28);
            ctx.closePath();
            ctx.fillStyle = "rgba(240,234,218,0.9)";
            ctx.fill();
          }
        }
      }
      ctx.restore();
    };
    peakRange(-42, 9, 18, "rgba(184,170,140,0.92)", 13, true, 1);
    peakRange(-34, 7, 14, "rgba(150,132,98,0.96)", 7, true, 1);
    hatch(ctx, -50, -40, 100, 9, "rgba(74,54,34,0.10)", 2.0, -0.6);

    // dune bands with shadow sides
    const duneBand = (y, h, col, shadow, seed, crest) => {
      const rr = rng(seed);
      const pts = [];
      for (let x = -54; x <= 54; x += 9) pts.push([x, y - Math.sin(x * 0.05 + seed) * 3 - rr() * 1.6]);
      ctx.beginPath();
      ctx.moveTo(-54, y + h);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(54, y + h);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      // shadow side
      ctx.save();
      ctx.clip();
      const sg = ctx.createLinearGradient(0, y - 4, 0, y + h);
      sg.addColorStop(0, "rgba(74,48,28,0)");
      sg.addColorStop(1, shadow);
      ctx.fillStyle = sg;
      ctx.fillRect(-54, y - 6, 108, h + 6);
      ctx.restore();
      // crest
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.strokeStyle = crest; ctx.lineWidth = 0.4; ctx.stroke();
    };
    duneBand(-30, 18, "rgba(214,178,124,0.6)", "rgba(150,106,62,0.28)", 4, "rgba(242,210,160,0.55)");
    duneBand(-22, 24, "rgba(204,166,110,0.7)", "rgba(140,98,56,0.34)", 9, "rgba(238,202,150,0.55)");
    duneBand(-14, 26, "rgba(192,152,98,0.8)", "rgba(126,86,48,0.38)", 13, "rgba(232,192,138,0.5)");
    duneBand(-6, 22, "rgba(178,138,86,0.9)", "rgba(110,74,40,0.42)", 17, "rgba(226,184,128,0.45)");
    // wind ripples
    for (let i = 0; i < 12; i++) {
      const yy = -24 + i * 2.0;
      ctx.strokeStyle = "rgba(238,200,148," + (0.20 + (i % 3) * 0.06) + ")";
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      for (let x = -50; x <= 50; x += 9) {
        const ly = yy + Math.sin(x * 0.09 + i * 0.7 + t * 0.2) * 0.45;
        if (x === -50) ctx.moveTo(x, ly); else ctx.lineTo(x, ly);
      }
      ctx.stroke();
    }

    // distant stupa ruin
    ctx.fillStyle = "rgba(190,158,112,0.8)";
    ctx.fillRect(-42, -33, 2.4, 4.2);
    ctx.beginPath(); ctx.arc(-40.8, -33.4, 1.8, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(120,86,50,0.5)"; ctx.lineWidth = 0.16;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-43.4, -31.6 + i * 1.2); ctx.lineTo(-38.2, -31.6 + i * 1.2); ctx.stroke(); }

    // caravan: monk, horse with scriptures, camel, porters
    person(ctx, -26, -9, 0.52, "rgba(64,44,26,0.98)", { phase: t * 0.9, fill: "rgba(196,142,62,0.97)", staff: true, hat: "straw" });
    // scripture frame (on the monk's back)
    ctx.strokeStyle = "rgba(92,60,34,0.92)"; ctx.lineWidth = 0.5;
    ctx.strokeRect(-31.6, -19.2, 4.6, 9.0);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(232,210,170,0.96)";
      ctx.fillRect(-31.2, -18.6 + i * 2.6, 3.8, 1.9);
      ctx.strokeStyle = "rgba(96,64,36,0.45)"; ctx.lineWidth = 0.12;
      ctx.strokeRect(-31.2, -18.6 + i * 2.6, 3.8, 1.9);
    }
    ctx.strokeStyle = "rgba(92,60,34,0.8)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-27.2, -17.4); ctx.lineTo(-25.2, -15.2); ctx.moveTo(-27.2, -17.4); ctx.lineTo(-25.4, -13.4); ctx.stroke();
    horse(ctx, -10, -8, 0.50, "rgba(92,68,44,0.96)", t + 0.6, {});
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = "rgba(232,210,170,0.96)";
      ctx.beginPath(); ctx.ellipse(-11 + i * 3.2, -12.4, 1.6, 1.1, 0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(96,64,36,0.6)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    person(ctx, 1, -7.6, 0.44, "rgba(64,44,26,0.98)", { phase: t + 1, fill: "rgba(128,96,62,0.96)", staff: true, hat: "cone" });
    camel(ctx, 15, -6, 0.50, "rgba(118,90,56,0.96)", t + 0.3);
    person(ctx, 26, -5, 0.40, "rgba(64,44,26,0.98)", { phase: t + 2, fill: "rgba(150,112,74,0.96)", hat: "straw" });
    // distant caravan
    for (let i = 0; i < 3; i++) {
      person(ctx, -14 + i * 2.2, -24, 0.12, "rgba(110,84,54,0.55)", { phase: t + i, fill: "rgba(140,104,64,0.55)" });
    }
    // sand streamers
    for (let i = 0; i < 24; i++) {
      const q = (t * 0.4 + i * 0.08) % 1;
      const sx = -42 + i * 3.8 + q * 12;
      const sy = -8 - Math.sin(i * 1.7) * 7;
      ctx.beginPath(); ctx.ellipse(sx, sy, 2.4 + q * 4, 0.38, -0.08, 0, TAU);
      ctx.fillStyle = "rgba(226,190,136," + (0.13 * (1 - q)) + ")"; ctx.fill();
    }
    // vultures
    bird(ctx, -6, -74, 1.4, "rgba(67,48,29,0.4)");
    bird(ctx, 2, -78, 1.0, "rgba(67,48,29,0.35)");
    // foreground sand shadow
    ctx.beginPath(); ctx.ellipse(-26, -2.2, 20, 2.4, 0, 0, TAU);
    ctx.fillStyle = "rgba(74,48,28,0.10)"; ctx.fill();
  };

  const xuanzangMap = function (ctx, t) {
    glow(ctx, 26, -58, 30, "#dfa85e", 0.3);
    // snow peak
    ctx.beginPath();
    ctx.moveTo(-8, -30); ctx.lineTo(16, -62); ctx.lineTo(36, -30); ctx.closePath();
    ctx.fillStyle = "rgba(176,160,128,0.85)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -50); ctx.lineTo(16, -62); ctx.lineTo(22, -50); ctx.closePath();
    ctx.fillStyle = "rgba(238,232,214,0.92)"; ctx.fill();
    // dunes
    for (const [yy, cc, sd] of [[-18, "rgba(206,170,116,0.6)", 4], [-6, "rgba(190,150,96,0.8)", 9]]) {
      const rr = rng(sd);
      ctx.beginPath();
      ctx.moveTo(-66, yy + 10);
      for (let x = -64; x <= 64; x += 8) ctx.lineTo(x, yy - Math.sin(x * 0.05 + sd) * 3 - rr() * 2);
      ctx.lineTo(66, yy + 26); ctx.lineTo(-66, yy + 26); ctx.closePath();
      ctx.fillStyle = cc; ctx.fill();
    }
    // caravan
    person(ctx, -34, -6, 0.7, "rgba(70,48,28,0.98)", { phase: t, fill: "rgba(196,142,62,0.96)", staff: true, hat: "straw" });
    ctx.strokeRect(-43, -22, 7, 11);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = "rgba(228,204,162,0.95)"; ctx.fillRect(-42.6, -21 + i * 3.4, 6.2, 2.4); }
    horse(ctx, -4, -4, 0.7, "rgba(92,68,44,0.95)", t + 0.6, {});
    camel(ctx, 24, -3, 0.62, "rgba(118,90,56,0.95)", t + 0.3);
    // sand
    for (let i = 0; i < 14; i++) {
      const q = (t * 0.4 + i * 0.1) % 1;
      ctx.beginPath(); ctx.ellipse(-40 + i * 6 + q * 8, -8 - Math.sin(i) * 4, 3 + q * 5, 0.6, 0, 0, TAU);
      ctx.fillStyle = "rgba(226,190,136," + (0.12 * (1 - q)) + ")"; ctx.fill();
    }
    bird(ctx, 44, -52, 2.0, "rgba(67,48,29,0.4)");
  };

  /* ── 11. Apollo 11 · 静海 ─────────────────────────────── */
  const apolloStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -30);
    sky.addColorStop(0, "#2e3444");
    sky.addColorStop(0.6, "#454a54");
    sky.addColorStop(1, "#6f685a");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -30 - top);
    stars(ctx, top, t, 46, 17);
    // Earth
    ctx.beginPath(); ctx.arc(-26, -72, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(130,168,184,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(226,236,232,0.6)"; ctx.lineWidth = 0.22; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-27.8, -73.4, 2.2, 1.4, 0.4, 0, TAU);
    ctx.fillStyle = "rgba(236,240,226,0.75)"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-24.6, -70.4, 1.4, 0.9, -0.2, 0, TAU);
    ctx.fillStyle = "rgba(236,240,226,0.65)"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-27.2, -70.2, 0.9, 0.5, 0.5, 0, TAU);
    ctx.fillStyle = "rgba(240,244,232,0.55)"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-24.0, -74.2, 0.8, 0.45, -0.3, 0, TAU);
    ctx.fillStyle = "rgba(240,244,232,0.5)"; ctx.fill();
    glow(ctx, -26, -72, 8, "#8fb8c8", 0.2);

    // lunar surface
    const surf = ctx.createLinearGradient(0, -30, 0, 0);
    surf.addColorStop(0, "#c2b8a0");
    surf.addColorStop(0.5, "#b3a88e");
    surf.addColorStop(1, "#9d927a");
    ctx.beginPath();
    ctx.moveTo(-50, -28);
    ctx.quadraticCurveTo(-20, -32, 4, -29);
    ctx.quadraticCurveTo(28, -26, 50, -30);
    ctx.lineTo(50, 0); ctx.lineTo(-50, 0);
    ctx.closePath();
    ctx.fillStyle = surf; ctx.fill();
    // craters
    for (const [cx, cy, cr] of [[-36, -10, 6], [-16, -4, 4], [4, -13, 3], [34, -6, 5], [44, -18, 3], [-42, -22, 2.5]]) {
      ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.32, 0, 0, TAU);
      ctx.fillStyle = "rgba(126,116,96,0.55)"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - cr * 0.15, cy - cr * 0.10, cr * 0.85, cr * 0.22, 0, 0, TAU);
      ctx.fillStyle = "rgba(218,208,188,0.55)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + cr * 0.55, cy - cr * 0.2, cr * 0.95, Math.PI * 1.05, Math.PI * 1.75);
      ctx.strokeStyle = "rgba(84,74,58,0.35)"; ctx.lineWidth = 0.3; ctx.stroke();
    }
    // rocks
    for (let i = 0; i < 10; i++) {
      const rx = -46 + i * 10;
      const ry = -6 - (i % 3) * 4;
      ctx.beginPath(); ctx.ellipse(rx, ry, 1.4 + (i % 3) * 0.4, 0.7, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(146,134,112,0.8)"; ctx.fill();
    }
    // LM + astronaut + flag
    lunarModule(ctx, 24, -12, 1.0, t);
    // LM rim light
    ctx.beginPath();
    ctx.moveTo(18.4, -20.6);
    ctx.lineTo(18.4, -14.4);
    ctx.strokeStyle = "rgba(255,250,232,0.5)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    astronaut(ctx, -8, -6, 0.95, t, true);
    // flag
    ctx.strokeStyle = "rgba(220,212,192,0.95)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(-22, -24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-21.8, -23.6); ctx.lineTo(-13.4, -23.4); ctx.lineTo(-13.4, -18.4); ctx.lineTo(-21.8, -18.6); ctx.closePath();
    ctx.fillStyle = "rgba(214,222,232,0.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,104,120,0.6)"; ctx.lineWidth = 0.16; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-21.6, -23.3 + i * 1.7); ctx.lineTo(-13.5, -23.1 + i * 1.7);
      ctx.strokeStyle = "rgba(164,64,52,0.55)"; ctx.lineWidth = 0.28; ctx.stroke();
    }
    // footprints
    for (let i = 0; i < 8; i++) {
      const q = i / 7;
      const fx = -14 + q * 32;
      const fy = -4.6 + Math.sin(q * 3) * 1.2;
      ctx.beginPath(); ctx.ellipse(fx, fy, 0.55, 0.24, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(110,100,82,0.55)"; ctx.fill();
    }
    // long shadows
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-2, -5); ctx.lineTo(-4, -5.4); ctx.closePath();
    ctx.fillStyle = "rgba(84,74,58,0.25)"; ctx.fill();
    // dust sparkles
    for (let i = 0; i < 16; i++) {
      const px = -40 + ((i * 29 + t * 2) % 80);
      const py = -26 + ((i * 17) % 22);
      ctx.beginPath(); ctx.arc(px, py, 0.12, 0, TAU);
      ctx.fillStyle = "rgba(246,240,224,0.4)"; ctx.fill();
    }
  };

  const apolloMap = function (ctx, t) {
    // lunar ground
    mapFloor(ctx, -8, 54, "#b3a88e", 0.55);
    ctx.beginPath(); ctx.ellipse(-30, -6, 16, 4, 0, 0, TAU);
    ctx.fillStyle = "rgba(140,130,108,0.5)"; ctx.fill();
    lunarModule(ctx, 18, -6, 0.9, t);
    astronaut(ctx, -8, -2, 0.85, t, true);
    // Earth
    ctx.beginPath(); ctx.arc(-36, -56, 8, 0, TAU);
    ctx.fillStyle = "rgba(130,168,184,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(226,236,232,0.6)"; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-38.4, -58, 3.2, 2.0, 0.4, 0, TAU);
    ctx.fillStyle = "rgba(236,240,226,0.75)"; ctx.fill();
    // stars
    for (let i = 0; i < 22; i++) {
      const sx = -60 + ((i * 37) % 120);
      const sy = -86 + ((i * 23) % 40);
      ctx.beginPath(); ctx.arc(sx, sy, 0.3, 0, TAU);
      ctx.fillStyle = "rgba(246,240,224,0.55)"; ctx.fill();
    }
    // footprints
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(-14 + i * 5, -3.4 + Math.sin(i) * 1.2, 0.6, 0.26, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(110,100,82,0.55)"; ctx.fill();
    }
  };

  /* ── 12a. Hiroshima · 八月六日的广岛 ──────────────────── */
  function mushroomCloud(ctx, x, baseY, w, h, t, col) {
    const c = col || "rgba(196,146,96,0.92)";
    // base surge
    ctx.beginPath();
    ctx.ellipse(x, baseY - 1.2, w * 0.34, 3.2, 0, 0, TAU);
    ctx.fillStyle = "rgba(206,166,120,0.6)";
    ctx.fill();
    // stem: wider at the base, turbulent
    ctx.beginPath();
    ctx.moveTo(x - w * 0.14, baseY - 1);
    ctx.bezierCurveTo(x - w * 0.06, baseY - h * 0.24, x - w * 0.10, baseY - h * 0.48, x - w * 0.07, baseY - h * 0.62);
    ctx.lineTo(x + w * 0.07, baseY - h * 0.62);
    ctx.bezierCurveTo(x + w * 0.10, baseY - h * 0.44, x + w * 0.05, baseY - h * 0.22, x + w * 0.16, baseY - 1);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    // stem shading
    ctx.save();
    ctx.clip();
    const sg = ctx.createLinearGradient(x - w * 0.2, 0, x + w * 0.2, 0);
    sg.addColorStop(0, "rgba(120,78,46,0.28)");
    sg.addColorStop(0.55, "rgba(120,78,46,0)");
    sg.addColorStop(1, "rgba(236,196,148,0.25)");
    ctx.fillStyle = sg;
    ctx.fillRect(x - w * 0.3, baseY - h, w * 0.6, h);
    ctx.restore();
    // cap: billowing lobes
    const capY = baseY - h * 0.67;
    const lobes = [
      [0, 0.00, 0.36, 0.12],
      [-0.26, 0.055, 0.23, 0.10],
      [0.26, 0.055, 0.23, 0.10],
      [-0.11, 0.135, 0.28, 0.095],
      [0.10, -0.105, 0.22, 0.085],
    ];
    for (let i = 0; i < lobes.length; i++) {
      const [lx, ly, rx, ry] = lobes[i];
      ctx.beginPath();
      ctx.ellipse(x + lx * w, capY + ly * h, rx * w, ry * h, 0, 0, TAU);
      ctx.fillStyle = i % 2 ? "rgba(210,166,116,0.9)" : c;
      ctx.fill();
      ctx.strokeStyle = "rgba(120,82,52,0.28)";
      ctx.lineWidth = 0.25;
      ctx.stroke();
    }
    // cap under-shadow
    ctx.beginPath();
    ctx.ellipse(x, capY + h * 0.10, w * 0.33, h * 0.035, 0, 0, TAU);
    ctx.fillStyle = "rgba(112,72,42,0.25)";
    ctx.fill();
    // warm rim light
    ctx.beginPath();
    ctx.ellipse(x - w * 0.04, capY - h * 0.16, w * 0.22, h * 0.045, -0.12, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = "rgba(246,214,164,0.75)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // turbulence arcs
    for (let i = 0; i < 4; i++) {
      const ty = capY + (i - 1.5) * h * 0.035;
      ctx.beginPath();
      ctx.ellipse(x, ty, w * (0.34 - i * 0.03), h * 0.045, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.strokeStyle = "rgba(130,86,52,0.22)";
      ctx.lineWidth = 0.22;
      ctx.stroke();
    }
    glow(ctx, x, capY, w * 0.6, "#e8b072", 0.18);
  }

  const hiroshimaStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -30);
    sky.addColorStop(0, "#efe0c2");
    sky.addColorStop(0.48, "#edd3a6");
    sky.addColorStop(1, "#debb8a");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -30 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, -4, -54, 38, "#e8b878", 0.26);
    // far hills
    ridge(ctx, -50, 50, -32, 2.6, "rgba(150,126,92,0.28)", 11, 5, -30);

    // mushroom cloud
    mushroomCloud(ctx, -12, -31, 28, 56, t, "rgba(196,146,96,0.94)");

    // far city band
    for (let i = 0; i < 26; i++) {
      const bx = -52 + i * 4.1;
      const bh = 1.8 + (i % 3) * 0.9;
      ctx.fillStyle = "rgba(196,166,124,0.55)";
      ctx.fillRect(bx, -30 - bh, 3.4, bh);
      ctx.beginPath();
      ctx.moveTo(bx - 0.4, -30 - bh); ctx.lineTo(bx + 1.7, -31.4 - bh); ctx.lineTo(bx + 3.8, -30 - bh); ctx.closePath();
      ctx.fillStyle = "rgba(160,112,72,0.55)"; ctx.fill();
      ctx.strokeStyle = "rgba(92,62,36,0.22)"; ctx.lineWidth = 0.1; ctx.stroke();
    }
    // mid city band (larger, some gaps)
    for (let i = 0; i < 15; i++) {
      const bx = -52 + i * 7.2;
      if (i === 5 || i === 6 || i === 11) continue;
      const bh = 3.4 + (i % 3) * 1.6;
      ctx.fillStyle = "rgba(178,140,98,0.82)";
      ctx.fillRect(bx, -24 - bh, 5.6, bh);
      ctx.strokeStyle = "rgba(92,62,36,0.25)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(bx, -24 - bh, 5.6, bh);
      // roof
      ctx.beginPath();
      ctx.moveTo(bx - 0.8, -24 - bh);
      ctx.quadraticCurveTo(bx + 2.8, -26.4 - bh, bx + 6.4, -24 - bh);
      ctx.closePath();
      ctx.fillStyle = "rgba(140,88,56,0.85)"; ctx.fill();
      ctx.strokeStyle = "rgba(78,50,30,0.35)"; ctx.lineWidth = 0.14; ctx.stroke();
      for (let k = 1; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(bx - 0.4 + k, -24 - bh - k * 0.5);
        ctx.quadraticCurveTo(bx + 2.8, -26.4 - bh + k * 0.3, bx + 6.0 - k, -24 - bh - k * 0.5);
        ctx.strokeStyle = "rgba(78,50,30,0.22)"; ctx.lineWidth = 0.1; ctx.stroke();
      }
      // window
      ctx.fillStyle = "rgba(84,56,34,0.35)";
      ctx.fillRect(bx + 2.2, -22.6 - bh, 1.2, 1.6);
    }

    // Genbaku Dome (focal)
    skeletonDome(ctx, 18, -14, 19, 26);

    // river delta
    const water = "rgba(104,136,140,0.92)";
    // main channel
    ctx.beginPath();
    ctx.moveTo(-52, -13);
    ctx.quadraticCurveTo(-20, -16, 4, -12);
    ctx.quadraticCurveTo(28, -9, 52, -13);
    ctx.lineTo(52, -6);
    ctx.quadraticCurveTo(26, -3, 4, -6);
    ctx.quadraticCurveTo(-20, -9, -52, -6);
    ctx.closePath();
    ctx.fillStyle = water; ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.35)"; ctx.lineWidth = 0.28; ctx.stroke();
    // branch toward the foreground
    ctx.beginPath();
    ctx.moveTo(-10, -9);
    ctx.quadraticCurveTo(-4, -5, -2, 0);
    ctx.lineTo(8, 0);
    ctx.quadraticCurveTo(6, -5, 12, -9);
    ctx.closePath();
    ctx.fillStyle = water; ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.3)"; ctx.lineWidth = 0.24; ctx.stroke();
    // reflections
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = "rgba(226,204,168,0.22)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-44, -11 + i * 1.1); ctx.quadraticCurveTo(0, -14 + i * 1.1, 44, -10 + i * 1.1); ctx.stroke();
    }
    // Aioi bridge (T-shaped)
    ctx.strokeStyle = "rgba(84,62,40,0.85)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-26, -12.4); ctx.quadraticCurveTo(-14, -16, -2, -12.2); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(-24 + i * 4, -12.6 - Math.abs(i - 3) * 0.5); ctx.lineTo(-24 + i * 4, -9.6); ctx.stroke();
    }
    // dark foreground bank
    ctx.beginPath();
    ctx.moveTo(-52, -2);
    ctx.quadraticCurveTo(-30, -5, -12, -3);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(116,88,58,0.9)"; ctx.fill();
    // bare tree
    ctx.strokeStyle = "rgba(64,46,30,0.95)"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-38, 0); ctx.quadraticCurveTo(-36, -10, -38, -20); ctx.stroke();
    ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-38, -14); ctx.lineTo(-43, -19); ctx.moveTo(-38, -16); ctx.lineTo(-33, -21); ctx.moveTo(-38, -11); ctx.lineTo(-42, -13); ctx.stroke();
    // rubble
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.ellipse(-46 + i * 3.2, -1.8 + (i % 2) * 0.6, 1.2, 0.5, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(92,70,46,0.75)"; ctx.fill();
    }
    // ash
    for (let i = 0; i < 46; i++) {
      const ax = -50 + ((i * 23 + t * 2) % 100);
      const ay = -54 + ((i * 37 + t * 3) % 54);
      ctx.beginPath(); ctx.arc(ax, ay, 0.14 + (i % 3) * 0.07, 0, TAU);
      ctx.fillStyle = "rgba(96,80,60,0.45)"; ctx.fill();
    }
  };

  const hiroshimaMap = function (ctx, t) {
    mapFloor(ctx, -8, 50, "#b89a70", 0.45);
    mushroomCloud(ctx, 4, -34, 22, 40, t, "rgba(196,146,96,0.92)");
    skeletonDome(ctx, 14, -10, 15, 20);
    // river hint
    ctx.beginPath();
    ctx.moveTo(-52, -12); ctx.quadraticCurveTo(-20, -15, 8, -11); ctx.quadraticCurveTo(30, -8, 52, -12);
    ctx.quadraticCurveTo(30, -6, 6, -8); ctx.quadraticCurveTo(-22, -10, -52, -6); ctx.closePath();
    ctx.fillStyle = "rgba(116,146,148,0.85)"; ctx.fill();
    // city roofs
    for (let i = 0; i < 12; i++) {
      const bx = -48 + i * 7.2;
      ctx.fillStyle = "rgba(170,136,96,0.8)";
      ctx.fillRect(bx, -14, 5.4, 4);
      ctx.beginPath(); ctx.moveTo(bx - 0.6, -14); ctx.lineTo(bx + 2.7, -17); ctx.lineTo(bx + 6.0, -14); ctx.closePath();
      ctx.fillStyle = "rgba(126,82,54,0.8)"; ctx.fill();
    }
    // ash
    for (let i = 0; i < 20; i++) {
      ctx.beginPath(); ctx.arc(-50 + ((i * 29 + t * 2) % 100), -40 + ((i * 17 + t * 3) % 36), 0.35, 0, TAU);
      ctx.fillStyle = "rgba(110,92,70,0.45)"; ctx.fill();
    }
  };

  /* ── 12b. Nagasaki · 浦上谷地 ─────────────────────────── */
  const nagasakiStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -38);
    sky.addColorStop(0, "#d8cfb9");
    sky.addColorStop(0.5, "#e3d0ad");
    sky.addColorStop(1, "#d6b78d");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -38 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    // cloud beyond the far ridge
    mushroomCloud(ctx, 12, -38, 18, 40, t, "rgba(190,142,96,0.9)");

    // far ridge
    ridge(ctx, -50, 10, -38, 7, "rgba(150,138,106,0.45)", 7, 4, -30);
    ridge(ctx, -4, 50, -40, 6, "rgba(150,138,106,0.45)", 15, 4, -30);
    // mid ridge
    ridge(ctx, -50, 0, -30, 5, "rgba(126,112,80,0.5)", 21, 5, -24);
    ridge(ctx, 6, 50, -31, 5, "rgba(126,112,80,0.5)", 5, 5, -24);

    // valley terraces
    for (let i = 0; i < 6; i++) {
      const yy = -26 + i * 4.2;
      ctx.beginPath();
      ctx.moveTo(-52, yy);
      ctx.quadraticCurveTo(-10, yy - 3.2, 52, yy + 0.8);
      ctx.lineTo(52, yy + 5.4);
      ctx.quadraticCurveTo(-10, yy + 1.4, -52, yy + 5.4);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "rgba(168,150,100,0.62)" : "rgba(152,136,88,0.55)";
      ctx.fill();
      // terrace edge
      ctx.beginPath();
      ctx.moveTo(-52, yy);
      ctx.quadraticCurveTo(-10, yy - 3.2, 52, yy + 0.8);
      ctx.strokeStyle = "rgba(92,74,48,0.28)"; ctx.lineWidth = 0.22; ctx.stroke();
      // hedge line
      ctx.beginPath();
      ctx.moveTo(-50, yy + 2.4);
      ctx.quadraticCurveTo(-10, yy - 0.6, 50, yy + 3.0);
      ctx.strokeStyle = "rgba(92,104,58,0.35)"; ctx.lineWidth = 0.5; ctx.stroke();
      // crop rows
      for (let k = 0; k < 12; k++) {
        const cx = -48 + k * 8.6;
        const cy = yy + 1.2 + Math.sin(k * 0.8) * 0.6;
        ctx.strokeStyle = i % 2 ? "rgba(120,126,66,0.38)" : "rgba(160,140,80,0.35)";
        ctx.lineWidth = 0.14;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 0.6, cy + 2.4); ctx.stroke();
      }
      // stone wall at the terrace lip
      ctx.strokeStyle = "rgba(92,74,48,0.28)"; ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(-50, yy + 0.2);
      ctx.quadraticCurveTo(-10, yy - 3.0, 50, yy + 1.0); ctx.stroke();
      for (let k = 0; k < 18; k++) {
        const wx = -48 + k * 5.4;
        ctx.beginPath(); ctx.moveTo(wx, yy - 1.4 + Math.sin(k) * 0.4); ctx.lineTo(wx, yy + 0.4); ctx.stroke();
      }
    }

    // Urakami Cathedral
    cathedral(ctx, -10, -16, 23, 20);
    // cathedral shadow side
    ctx.save();
    ctx.beginPath(); ctx.rect(-9, -40, 12, 24); ctx.clip();
    const cs = ctx.createLinearGradient(-9, 0, 4, 0);
    cs.addColorStop(0, "rgba(74,48,28,0)");
    cs.addColorStop(1, "rgba(74,48,28,0.16)");
    ctx.fillStyle = cs;
    ctx.fillRect(-9, -40, 12, 24);
    ctx.restore();

    // near houses (larger)
    for (let i = 0; i < 7; i++) {
      const bx = -46 + i * 13;
      if (Math.abs(bx + 10) < 15) continue;
      const bh = 4.2 + (i % 3) * 1.6;
      ctx.fillStyle = "rgba(170,138,96,0.94)";
      ctx.fillRect(bx, -8 - bh, 8.4, bh);
      ctx.strokeStyle = "rgba(92,62,36,0.4)"; ctx.lineWidth = 0.18;
      ctx.strokeRect(bx, -8 - bh, 8.4, bh);
      ctx.beginPath();
      ctx.moveTo(bx - 1.0, -8 - bh);
      ctx.quadraticCurveTo(bx + 4.2, -10.6 - bh, bx + 9.4, -8 - bh);
      ctx.closePath();
      ctx.fillStyle = "rgba(124,80,52,0.9)"; ctx.fill();
      ctx.strokeStyle = "rgba(84,54,34,0.3)"; ctx.lineWidth = 0.14; ctx.stroke();
      // roof tile lines
      for (let k = 1; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(bx - 0.6 + k * 0.8, -8 - bh - k * 0.7);
        ctx.quadraticCurveTo(bx + 4.2, -10.6 - bh + k * 0.4, bx + 8.8 - k * 0.8, -8 - bh - k * 0.7);
        ctx.strokeStyle = "rgba(84,54,34,0.25)"; ctx.lineWidth = 0.12; ctx.stroke();
      }
      // window
      ctx.fillStyle = "rgba(84,56,34,0.35)";
      ctx.fillRect(bx + 3.2, -6.6 - bh, 1.6, 2.2);
      // shadow
      ctx.fillStyle = "rgba(74,48,28,0.12)";
      ctx.fillRect(bx + 8.4, -8 - bh + 0.6, 1.8, bh);
    }
    // far houses (smaller)
    for (let i = 0; i < 12; i++) {
      const bx = -48 + i * 8.4;
      if (Math.abs(bx + 10) < 12) continue;
      ctx.fillStyle = "rgba(160,132,94,0.6)";
      ctx.fillRect(bx, -22, 5.2, 3.6);
      ctx.beginPath();
      ctx.moveTo(bx - 0.6, -22); ctx.lineTo(bx + 2.6, -24), ctx.lineTo(bx + 5.8, -22); ctx.closePath();
      ctx.fillStyle = "rgba(118,78,50,0.6)"; ctx.fill();
    }

    // river winding through the valley
    ctx.beginPath();
    ctx.moveTo(-52, -6);
    ctx.quadraticCurveTo(-26, -11, -2, -7);
    ctx.quadraticCurveTo(24, -3, 52, -7);
    ctx.lineTo(52, -1);
    ctx.quadraticCurveTo(24, 3, -2, -1);
    ctx.quadraticCurveTo(-26, -5, -52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(100,132,136,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.3)"; ctx.lineWidth = 0.22; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(232,238,226,0.28)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-46, -8 + i * 2); ctx.quadraticCurveTo(0, -11 + i * 2, 46, -7 + i * 2); ctx.stroke();
    }

    // dark foreground ridge framing the valley
    ctx.beginPath();
    ctx.moveTo(-52, -2);
    ctx.quadraticCurveTo(-36, -6, -22, -3.2);
    ctx.quadraticCurveTo(-8, -1, 0, 0);
    ctx.lineTo(-52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(104,104,70,0.9)"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(52, -3);
    ctx.quadraticCurveTo(38, -6.4, 24, -3.4);
    ctx.quadraticCurveTo(14, -1.2, 8, 0);
    ctx.lineTo(52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(104,104,70,0.9)"; ctx.fill();
    // pines on the foreground ridge
    for (const px of [-44, 40]) {
      ctx.strokeStyle = "rgba(64,52,30,0.95)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(px, -2.4); ctx.lineTo(px, -16); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(px, -13 - i * 3.2, 4.6 - i * 0.8, 2.0, 0, 0, TAU);
        ctx.fillStyle = "rgba(70,88,54,0.9)"; ctx.fill();
      }
    }
    // ash
    for (let i = 0; i < 40; i++) {
      const ax = -50 + ((i * 23 + t * 2) % 100);
      const ay = -54 + ((i * 37 + t * 3) % 54);
      ctx.beginPath(); ctx.arc(ax, ay, 0.14 + (i % 3) * 0.07, 0, TAU);
      ctx.fillStyle = "rgba(96,80,60,0.42)"; ctx.fill();
    }
  };

  const nagasakiMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#b89a70", 0.42);
    ridge(ctx, -60, 60, -34, 8, "rgba(120,110,80,0.42)", 7, 6, -28);
    mushroomCloud(ctx, 10, -36, 16, 36, t, "rgba(190,142,96,0.85)");
    cathedral(ctx, -10, -10, 30, 26);
    // terraces
    for (let i = 0; i < 5; i++) {
      const yy = -10 + i * 4;
      ctx.beginPath(); ctx.moveTo(-54, yy); ctx.quadraticCurveTo(0, yy - 3, 54, yy + 1);
      ctx.strokeStyle = "rgba(92,74,48,0.25)"; ctx.lineWidth = 0.5; ctx.stroke();
    }
    // river
    ctx.beginPath();
    ctx.moveTo(-54, -4); ctx.quadraticCurveTo(-20, -8, 6, -5); ctx.quadraticCurveTo(30, -2, 54, -6);
    ctx.quadraticCurveTo(30, 0, 6, -1); ctx.quadraticCurveTo(-20, -3, -54, 1); ctx.closePath();
    ctx.fillStyle = "rgba(110,142,144,0.8)"; ctx.fill();
    // ash
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); ctx.arc(-50 + ((i * 29 + t * 2) % 100), -44 + ((i * 17 + t * 3) % 40), 0.34, 0, TAU);
      ctx.fillStyle = "rgba(110,92,70,0.45)"; ctx.fill();
    }
  };

  /* ── 12c. Japan announces surrender · 玉音放送 ─────────── */
  const japanSurrenderStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -34);
    sky.addColorStop(0, "#d5cfbc");
    sky.addColorStop(0.52, "#e4d3b0");
    sky.addColorStop(1, "#e6c48f");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -34 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, -22, -66, 22, "#e0b46e", 0.32);
    ctx.beginPath(); ctx.arc(-22, -66, 5.0, 0, TAU);
    ctx.fillStyle = "rgba(224,176,100,0.92)"; ctx.fill();
    cloud(ctx, 16, -84, 15, "#fff8e8", 0.42);

    // radio tower + broadcast arcs
    ctx.strokeStyle = "rgba(78,66,48,0.9)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(30, -30); ctx.lineTo(32, -70); ctx.moveTo(36, -30); ctx.lineTo(32, -70); ctx.stroke();
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(30 + i * 0.45, -30 - i * 8); ctx.lineTo(36 - i * 0.45, -30 - i * 8); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const q = ((t * 0.5 + i * 0.3) % 1);
      ctx.beginPath(); ctx.arc(32, -70, 5 + q * 20, Math.PI * 0.88, Math.PI * 1.82);
      ctx.strokeStyle = "rgba(176,138,62," + (0.44 * (1 - q)) + ")"; ctx.lineWidth = 0.45; ctx.stroke();
    }

    // palace moat: water + stone embankment
    ctx.fillStyle = "rgba(116,138,138,0.55)";
    ctx.fillRect(-50, -31, 100, 4.6);
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = "rgba(232,236,220,0.28)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-46, -30 + i * 0.5); ctx.quadraticCurveTo(0, -31 + i * 0.5, 46, -30 + i * 0.5); ctx.stroke();
    }
    ctx.fillStyle = "rgba(156,146,122,0.96)";
    ctx.fillRect(-50, -26.4, 100, 4.4);
    ctx.strokeStyle = "rgba(74,56,38,0.35)"; ctx.lineWidth = 0.24;
    ctx.strokeRect(-50, -26.4, 100, 4.4);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = "rgba(74,56,38,0.22)"; ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(-50 + i * 3.9, -26.2); ctx.lineTo(-50 + i * 3.9, -22.2); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = "rgba(90,72,48,0.25)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(-50, -24.8 + i * 0.5); ctx.lineTo(50, -24.8 + i * 0.5); ctx.stroke();
    }
    // pines behind the wall
    for (const px of [-44, -36, 42]) {
      ctx.strokeStyle = "rgba(70,58,36,0.95)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(px, -22); ctx.lineTo(px, -38); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(px, -34 - i * 3.4, 5.2 - i * 1.0, 2.2, 0, 0, TAU);
        ctx.fillStyle = "rgba(76,94,58,0.92)"; ctx.fill();
      }
    }

    // ruined street: broken walls and roof beams
    for (let i = 0; i < 5; i++) {
      const bx = -46 + i * 19;
      const bh = 5 + (i % 3) * 3.4;
      ctx.fillStyle = "rgba(146,124,92,0.82)";
      ctx.beginPath();
      ctx.moveTo(bx, -14);
      ctx.lineTo(bx + 2.2, -14 - bh);
      ctx.lineTo(bx + 7.6, -14 - bh + 1.0);
      ctx.lineTo(bx + 8.4, -14);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(74,54,34,0.28)"; ctx.lineWidth = 0.18; ctx.stroke();
      // window hole
      ctx.fillStyle = "rgba(92,66,42,0.35)";
      ctx.fillRect(bx + 3.4, -12.6 - bh * 0.6, 1.6, 2.2);
      // rubble
      for (let k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.ellipse(bx + 2 + k * 2.4, -13.4 + (k % 2) * 0.6, 1.1, 0.5, 0.2, 0, TAU);
        ctx.fillStyle = "rgba(110,88,60,0.6)"; ctx.fill();
      }
    }
    // fallen beam
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-26, -15); ctx.lineTo(-8, -19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-24, -16.4); ctx.lineTo(-10, -12.6); ctx.stroke();

    // warm light pool
    glow(ctx, 0, -9, 22, "#e0b46e", 0.18);

    // radio group
    ctx.fillStyle = "rgba(124,88,52,0.95)";
    ctx.fillRect(-8.4, -9.4, 16.8, 3.6);
    ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(-8.4, -9.4, 16.8, 3.6);
    radio(ctx, 0, -9.4, 1.22, t);
    // listeners in a half-circle
    const listeners = [
      { x: -17, y: -8, s: 0.42, c: "rgba(72,76,84,0.96)", hat: "cap" },
      { x: -11, y: -7.4, s: 0.44, c: "rgba(96,88,74,0.96)", hat: "straw" },
      { x: -5.4, y: -6.8, s: 0.46, c: "rgba(128,96,62,0.96)", hat: "cap" },
      { x: 6.2, y: -6.8, s: 0.44, c: "rgba(150,112,74,0.96)", hat: "straw" },
      { x: 12.2, y: -7.2, s: 0.42, c: "rgba(112,88,58,0.96)", hat: "cap" },
      { x: 17.4, y: -6.4, s: 0.38, c: "rgba(168,64,44,0.92)", hat: "straw" },
    ];
    listeners.forEach((p, i) => {
      person(ctx, p.x, p.y, p.s, "rgba(58,42,26,0.98)", { phase: t + i, fill: p.c, hat: p.hat, arm: i === 2 || i === 4 });
    });
    // mother and child
    person(ctx, 20.6, -5.6, 0.34, "rgba(58,42,26,0.98)", { phase: t + 6, fill: "rgba(168,64,44,0.92)", hat: "straw" });
    person(ctx, 22.2, -5.4, 0.20, "rgba(58,42,26,0.98)", { phase: t + 7, fill: "rgba(196,170,120,0.9)" });
    // kneeling man
    ctx.save();
    ctx.translate(-20, -6.6);
    ctx.rotate(0.38);
    person(ctx, 0, 0, 0.36, "rgba(58,42,26,0.98)", { phase: t + 8, fill: "rgba(78,82,90,0.96)" });
    ctx.restore();

    // dark foreground frame: broken wall left, rubble right
    ctx.beginPath();
    ctx.moveTo(-52, -3.4);
    ctx.lineTo(-38, -6.2);
    ctx.lineTo(-34, -2.2);
    ctx.lineTo(-30, -4.4);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(96,76,52,0.92)";
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(-44 + i * 3.4, -1.4 + (i % 2) * 0.5, 1.4, 0.6, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(78,60,40,0.8)"; ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(52, -3);
    ctx.lineTo(40, -5.6);
    ctx.lineTo(36, -1.6);
    ctx.lineTo(30, -3.4);
    ctx.lineTo(26, 0);
    ctx.lineTo(52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(96,76,52,0.92)";
    ctx.fill();
    // dust motes
    for (let i = 0; i < 22; i++) {
      const px = -40 + ((i * 23 + t * 2) % 80);
      const py = -30 + ((i * 17) % 26);
      ctx.beginPath(); ctx.arc(px, py, 0.13, 0, TAU);
      ctx.fillStyle = "rgba(140,112,74,0.3)"; ctx.fill();
    }
    bird(ctx, -40, -78, 1.0, "rgba(67,48,29,0.4)");
  };

  const japanSurrenderMap = function (ctx, t) {
    mapFloor(ctx, -8, 44, "#b89a70", 0.42);
    // tower + arcs
    ctx.strokeStyle = "rgba(86,72,52,0.8)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(30, -8); ctx.lineTo(32, -52); ctx.moveTo(36, -8); ctx.lineTo(32, -52); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const q = ((t * 0.5 + i * 0.3) % 1);
      ctx.beginPath(); ctx.arc(32, -52, 5 + q * 22, Math.PI * 0.9, Math.PI * 1.8);
      ctx.strokeStyle = "rgba(176,138,62," + (0.4 * (1 - q)) + ")"; ctx.lineWidth = 0.6; ctx.stroke();
    }
    // pine
    ctx.strokeStyle = "rgba(84,72,42,0.9)"; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.moveTo(-36, -8); ctx.quadraticCurveTo(-33, -24, -36, -38); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(-36, -30 - i * 5, 7 - i * 1.4, 3, 0, 0, TAU);
      ctx.fillStyle = "rgba(88,104,62,0.82)"; ctx.fill();
    }
    // radio + listeners
    radio(ctx, 0, -8, 0.9, t);
    person(ctx, -18, -6, 0.8, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(96,88,74,0.96)", hat: "cap" });
    person(ctx, 12, -7, 0.75, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(128,96,62,0.95)" });
    person(ctx, 20, -5.4, 0.6, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(168,64,44,0.9)" });
    glow(ctx, 0, -12, 20, "#e0b46e", 0.16);
  };

  function seatedPerson(ctx, x, y, s, col, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = col;
    ctx.fillStyle = o.fill || col;
    ctx.lineWidth = 1.3;
    // bent legs
    ctx.beginPath();
    ctx.moveTo(-1.4, -5.6); ctx.lineTo(-4.4, -2.6); ctx.lineTo(-4.0, 0);
    ctx.moveTo(1.4, -5.6); ctx.lineTo(3.6, -2.3); ctx.lineTo(3.2, 0);
    ctx.stroke();
    // robe
    ctx.beginPath();
    ctx.moveTo(0, -14.2);
    ctx.quadraticCurveTo(-3.0, -11, -4.0, -4.0);
    ctx.lineTo(4.0, -4.0);
    ctx.quadraticCurveTo(3.0, -11, 0, -14.2);
    ctx.closePath();
    ctx.fillStyle = withA(o.fill || col, 0.92);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.45;
    ctx.stroke();
    // folded arms
    ctx.beginPath(); ctx.moveTo(-2.6, -10.4); ctx.lineTo(1.4, -7.8); ctx.stroke();
    // head
    ctx.beginPath(); ctx.arc(0, -16.0, 1.65, 0, TAU);
    ctx.fillStyle = o.skin || "#c08e5e"; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 0.38; ctx.stroke();
    if (o.hat === "straw") {
      ctx.beginPath(); ctx.ellipse(0, -16.4, 3.0, 0.7, 0, 0, TAU);
      ctx.fillStyle = "#c9a76b"; ctx.fill();
    } else if (o.hat === "cap") {
      ctx.beginPath(); ctx.ellipse(0, -17.4, 1.8, 0.6, 0, 0, TAU);
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.restore();
  }

  /* ── 2A motifs: pyramids, stele, tablet, elephant, olive ── */
  function pyramid(ctx, x, baseY, w, h, col) {
    const light = col || "rgba(228,207,168,0.98)";
    const dark = "rgba(190,160,112,0.98)";
    const apexY = baseY - h;
    // cast shadow
    ctx.beginPath();
    ctx.moveTo(x - w * 0.1, baseY);
    ctx.lineTo(x + w * 0.75, baseY);
    ctx.lineTo(x + w * 0.95, baseY + h * 0.06);
    ctx.lineTo(x + w * 0.55, baseY + h * 0.06);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,90,52,0.12)";
    ctx.fill();
    // left face
    ctx.beginPath();
    ctx.moveTo(x, apexY);
    ctx.lineTo(x - w / 2, baseY);
    ctx.lineTo(x, baseY);
    ctx.closePath();
    ctx.fillStyle = light;
    ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.55)";
    ctx.lineWidth = 0.4;
    ctx.stroke();
    // right face
    ctx.beginPath();
    ctx.moveTo(x, apexY);
    ctx.lineTo(x, baseY);
    ctx.lineTo(x + w / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.45)";
    ctx.lineWidth = 0.35;
    ctx.stroke();
    // stone courses
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, apexY);
    ctx.lineTo(x - w / 2, baseY);
    ctx.lineTo(x + w / 2, baseY);
    ctx.closePath();
    ctx.clip();
    const step = Math.max(1.2, h / 14);
    for (let yy = apexY + step; yy < baseY; yy += step) {
      const u = (yy - apexY) / h;
      const half = (w / 2) * u;
      ctx.beginPath();
      ctx.moveTo(x - half, yy);
      ctx.lineTo(x + half, yy);
      ctx.strokeStyle = "rgba(92,68,40,0.18)";
      ctx.lineWidth = 0.14;
      ctx.stroke();
      // block joints, offset by row
      const joint = half / 5;
      for (let k = -4; k <= 4; k++) {
        const jx = x + k * joint + (Math.round(u * 10) % 2 ? joint * 0.5 : 0);
        if (Math.abs(jx - x) <= half) {
          ctx.beginPath();
          ctx.moveTo(jx, yy);
          ctx.lineTo(jx, yy + step);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    // capstone
    ctx.beginPath();
    ctx.moveTo(x, apexY);
    ctx.lineTo(x - w * 0.045, apexY + h * 0.045);
    ctx.lineTo(x + w * 0.045, apexY + h * 0.045);
    ctx.closePath();
    ctx.fillStyle = "rgba(216,178,102,0.95)";
    ctx.fill();
    // base rubble
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(x - w * 0.3 + i * w * 0.16, baseY + 0.8, 1.8, 0.7, 0, 0, TAU);
      ctx.fillStyle = "rgba(160,132,92,0.6)";
      ctx.fill();
    }
  }

  function sphinx(ctx, x, baseY, s, col) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    ctx.strokeStyle = col || "rgba(96,74,48,0.95)";
    ctx.fillStyle = "rgba(176,144,98,0.99)";
    ctx.lineWidth = 0.45;
    // cast shadow
    ctx.beginPath(); ctx.ellipse(-2, 0.4, 17, 2.4, 0, 0, TAU);
    ctx.fillStyle = "rgba(96,70,40,0.16)"; ctx.fill();
    // body / haunch
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.quadraticCurveTo(-10, -8, -2, -8.4);
    ctx.quadraticCurveTo(6, -8.6, 9, -5.2);
    ctx.lineTo(10, -1);
    ctx.quadraticCurveTo(2, 0.6, -12, -2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // front paws
    ctx.beginPath();
    ctx.moveTo(7, -4);
    ctx.lineTo(18, -2.6);
    ctx.quadraticCurveTo(20, -1.4, 18, -0.4);
    ctx.lineTo(7, -1);
    ctx.closePath();
    ctx.fillStyle = "rgba(168,136,92,0.99)"; ctx.fill(); ctx.stroke();
    // chest
    ctx.beginPath();
    ctx.moveTo(6, -7.6);
    ctx.quadraticCurveTo(11, -11, 12, -14);
    ctx.lineTo(6, -14);
    ctx.quadraticCurveTo(4, -10, 2, -8);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // head + nemes
    ctx.beginPath();
    ctx.moveTo(7, -14);
    ctx.quadraticCurveTo(8, -18, 12, -18);
    ctx.quadraticCurveTo(16, -18, 16, -14.6);
    ctx.lineTo(14, -12.6);
    ctx.lineTo(9, -12.6);
    ctx.closePath();
    ctx.fillStyle = "rgba(188,154,108,0.99)"; ctx.fill(); ctx.stroke();
    // nemes stripes
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(8.4 + i * 0.8, -17.4);
      ctx.lineTo(7.6 + i * 0.8, -13.4);
      ctx.strokeStyle = "rgba(92,68,40,0.35)"; ctx.lineWidth = 0.22; ctx.stroke();
    }
    // face
    ctx.beginPath();
    ctx.moveTo(14.6, -16.4);
    ctx.lineTo(16.6, -14.8);
    ctx.lineTo(14.4, -13.6);
    ctx.strokeStyle = "rgba(74,54,30,0.8)"; ctx.lineWidth = 0.3; ctx.stroke();
    // tail
    ctx.beginPath();
    ctx.moveTo(-11, -3.6);
    ctx.quadraticCurveTo(-15, -4.4, -14, -7);
    ctx.stroke();
    // stone courses + weathering
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-9, -4.4 - i * 1.6);
      ctx.quadraticCurveTo(-2, -3.6 - i * 1.6, 7, -4.8 - i * 1.6);
      ctx.strokeStyle = "rgba(72,52,30,0.22)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(-2, -1.2, 10, 1.6, 0, 0, TAU);
    ctx.fillStyle = "rgba(72,52,30,0.12)"; ctx.fill();
    ctx.restore();
  }

  function ziggurat(ctx, x, baseY, w, h, tiers, col) {
    const n = tiers || 4;
    for (let i = 0; i < n; i++) {
      const tw = w * (1 - i * 0.18);
      const th = h / n;
      ctx.fillStyle = i % 2 ? "rgba(198,166,120,0.97)" : (col || "rgba(216,186,140,0.98)");
      ctx.fillRect(x - tw / 2, baseY - (i + 1) * th, tw, th);
      ctx.strokeStyle = "rgba(74,54,30,0.45)";
      ctx.lineWidth = 0.3;
      ctx.strokeRect(x - tw / 2, baseY - (i + 1) * th, tw, th);
      // brick courses
      for (let yy = baseY - (i + 1) * th + 1.4; yy < baseY - i * th; yy += 1.4) {
        ctx.beginPath();
        ctx.moveTo(x - tw / 2, yy);
        ctx.lineTo(x + tw / 2, yy);
        ctx.strokeStyle = "rgba(74,54,30,0.16)";
        ctx.lineWidth = 0.12;
        ctx.stroke();
      }
    }
    // central stair
    const topY = baseY - h;
    ctx.beginPath();
    ctx.moveTo(x - 2.4, baseY);
    ctx.lineTo(x - 1.4, topY + 1);
    ctx.lineTo(x + 1.4, topY + 1);
    ctx.lineTo(x + 2.4, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(188,154,110,0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.35)"; ctx.lineWidth = 0.2; ctx.stroke();
    // shrine
    ctx.fillStyle = "rgba(226,198,150,0.98)";
    ctx.fillRect(x - 4.4, topY - 4.4, 8.8, 4.4);
    ctx.strokeRect(x - 4.4, topY - 4.4, 8.8, 4.4);
    ctx.beginPath();
    ctx.moveTo(x - 5.2, topY - 4.4); ctx.lineTo(x, topY - 7); ctx.lineTo(x + 5.2, topY - 4.4); ctx.closePath();
    ctx.fillStyle = "rgba(150,96,62,0.9)"; ctx.fill(); ctx.stroke();
  }

  function stele(ctx, x, baseY, w, h) {
    const topR = w / 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, baseY);
    ctx.lineTo(x - w / 2, baseY - h + topR);
    ctx.arc(x, baseY - h + topR, topR, Math.PI, TAU);
    ctx.lineTo(x + w / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(78,66,58,0.98)";
    ctx.fill();
    ctx.strokeStyle = "rgba(48,38,30,0.9)";
    ctx.lineWidth = 0.45;
    ctx.stroke();
    // basalt sheen
    ctx.save();
    ctx.clip();
    const sg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    sg.addColorStop(0, "rgba(116,102,90,0.35)");
    sg.addColorStop(0.5, "rgba(78,66,58,0)");
    sg.addColorStop(1, "rgba(40,32,26,0.35)");
    ctx.fillStyle = sg;
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    // relief panel at top
    ctx.fillStyle = "rgba(108,92,78,0.7)";
    ctx.fillRect(x - w * 0.34, baseY - h + w * 0.55, w * 0.68, w * 0.7);
    // king before the sun god relief
    ctx.strokeStyle = "rgba(196,176,146,0.55)";
    ctx.fillStyle = "rgba(196,176,146,0.35)";
    ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.arc(x - w * 0.10, baseY - h + w * 0.78, w * 0.10, 0, TAU); ctx.stroke();
    // seated sun god
    ctx.beginPath();
    ctx.moveTo(x - w * 0.16, baseY - h + w * 1.16);
    ctx.lineTo(x - w * 0.16, baseY - h + w * 0.92);
    ctx.lineTo(x - w * 0.02, baseY - h + w * 0.96);
    ctx.lineTo(x - w * 0.02, baseY - h + w * 1.16);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x - w * 0.09, baseY - h + w * 0.86, w * 0.035, 0, TAU); ctx.fill();
    // standing king
    ctx.beginPath();
    ctx.moveTo(x + w * 0.06, baseY - h + w * 1.16);
    ctx.lineTo(x + w * 0.06, baseY - h + w * 0.84);
    ctx.lineTo(x + w * 0.18, baseY - h + w * 0.84);
    ctx.lineTo(x + w * 0.18, baseY - h + w * 1.16);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.12, baseY - h + w * 0.78, w * 0.035, 0, TAU); ctx.fill();
    // cuneiform rows
    ctx.strokeStyle = "rgba(196,176,146,0.35)";
    ctx.lineWidth = 0.14;
    for (let r = 0; r < 11; r++) {
      const ry = baseY - h + w * 1.55 + r * w * 0.20;
      for (let c = 0; c < 7; c++) {
        const cx = x - w * 0.34 + c * w * 0.10 + (r % 2) * w * 0.02;
        ctx.beginPath();
        ctx.moveTo(cx, ry);
        ctx.lineTo(cx + w * 0.055, ry + 0.5);
        ctx.moveTo(cx + w * 0.01, ry + 0.5);
        ctx.lineTo(cx + w * 0.03, ry + 1.0);
        ctx.stroke();
      }
    }
    ctx.restore();
    // base
    ctx.fillStyle = "rgba(120,98,74,0.95)";
    ctx.fillRect(x - w * 0.58, baseY - 1.2, w * 1.16, 1.2);
    ctx.strokeStyle = "rgba(48,38,30,0.6)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(x - w * 0.58, baseY - 1.2, w * 1.16, 1.2);
  }

  function tablet(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-4.6, -3, -3.4, -5.4);
    ctx.quadraticCurveTo(0, -6.2, 3.4, -5.4);
    ctx.quadraticCurveTo(4.6, -3, 4, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(196,164,116,0.98)";
    ctx.fill();
    ctx.strokeStyle = "rgba(92,64,36,0.65)";
    ctx.lineWidth = 0.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(92,64,36,0.45)";
    ctx.lineWidth = 0.12;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        const cx = -2.8 + c * 2.1 + (r % 2) * 0.5;
        const cy = -4.4 + r * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(cx + 1.0, cy + 0.2);
        ctx.moveTo(cx + 0.2, cy); ctx.lineTo(cx + 0.5, cy + 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function elephant(ctx, x, y, s, col, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const g = Math.sin((o.phase || 0) * 3.2);
    ctx.fillStyle = col || "rgba(128,118,104,0.98)";
    ctx.strokeStyle = "rgba(58,48,38,0.85)";
    ctx.lineWidth = 0.35;
    // legs
    ctx.beginPath();
    ctx.moveTo(-8, -7); ctx.lineTo(-9 + g * 0.5, 0);
    ctx.moveTo(-4.4, -7); ctx.lineTo(-4, 0);
    ctx.moveTo(4.4, -7); ctx.lineTo(4.8, 0);
    ctx.moveTo(8.4, -7); ctx.lineTo(9 - g * 0.5, 0);
    ctx.lineWidth = 2.2; ctx.strokeStyle = col || "rgba(128,118,104,0.98)"; ctx.stroke();
    // body
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.quadraticCurveTo(-10, -16, -2, -16.4);
    ctx.quadraticCurveTo(6, -16.6, 9, -12);
    ctx.lineTo(10, -7);
    ctx.quadraticCurveTo(0, -4.6, -11, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(58,48,38,0.75)"; ctx.lineWidth = 0.4; ctx.stroke();
    // head
    ctx.beginPath();
    ctx.ellipse(11.6, -12, 4.2, 4.8, 0.1, 0, TAU);
    ctx.fill(); ctx.stroke();
    // ear
    ctx.beginPath();
    ctx.ellipse(9.2, -13, 2.6, 3.6, -0.2, 0, TAU);
    ctx.fillStyle = "rgba(112,102,90,0.95)"; ctx.fill(); ctx.stroke();
    // trunk
    ctx.beginPath();
    ctx.moveTo(14.6, -10.4);
    ctx.quadraticCurveTo(18.6, -7, 17.4, -1.6);
    ctx.strokeStyle = col || "rgba(128,118,104,0.98)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // tusk
    ctx.beginPath();
    ctx.moveTo(13.6, -10.2);
    ctx.quadraticCurveTo(16.4, -8.4, 16.8, -6.4);
    ctx.strokeStyle = "rgba(240,232,212,0.95)"; ctx.lineWidth = 0.7; ctx.stroke();
    // tail
    ctx.beginPath();
    ctx.moveTo(-11, -10);
    ctx.quadraticCurveTo(-14.4, -8, -14.2, -4.6);
    ctx.strokeStyle = "rgba(58,48,38,0.8)"; ctx.lineWidth = 0.4; ctx.stroke();
    // howdah / blanket
    if (o.howdah) {
      ctx.fillStyle = "rgba(168,64,44,0.85)";
      ctx.beginPath();
      ctx.moveTo(-7, -16.4);
      ctx.quadraticCurveTo(0, -19.4, 7, -16.6);
      ctx.lineTo(6, -14.8);
      ctx.quadraticCurveTo(0, -17, -6, -14.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(196,150,78,0.9)";
      ctx.fillRect(-1.2, -21.4, 2.4, 3.0);
    }
    ctx.restore();
  }

  function olive(ctx, x, baseY, h, col) {
    ctx.strokeStyle = col || "rgba(88,76,50,0.9)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x - 2, baseY - h * 0.4, x + 1, baseY - h * 0.7);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const cx = x + (i - 1.5) * 4.2;
      const cy = baseY - h * 0.72 - (i % 2) * 2.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 4.4, 2.6, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(118,126,82,0.72)";
      ctx.fill();
      ctx.strokeStyle = "rgba(74,78,48,0.45)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
  }

  /* ── 2A-1. Pyramids of Giza · 吉萨高原 ─────────────────── */
  const gizaStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#f4e3c1");
    sky.addColorStop(0.5, "#f0d2a0");
    sky.addColorStop(1, "#e4bd83");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 30, -62, 26, "#e3a95c", 0.4);
    ctx.beginPath(); ctx.arc(30, -62, 6.4, 0, TAU);
    ctx.fillStyle = "rgba(222,166,88,0.9)"; ctx.fill();
    cloud(ctx, -24, -86, 14, "#fff7e6", 0.35);
    cloud(ctx, 8, -92, 9, "#fff7e6", 0.3);
    // far plateau
    ridge(ctx, -50, 50, -38, 3.4, "rgba(170,140,98,0.28)", 5, 5, -30);
    // Nile green band on the far right, organic
    ctx.beginPath();
    ctx.moveTo(30, -34);
    ctx.quadraticCurveTo(40, -37, 50, -33);
    ctx.lineTo(50, -28);
    ctx.quadraticCurveTo(40, -31, 30, -28);
    ctx.closePath();
    ctx.fillStyle = "rgba(118,142,102,0.55)"; ctx.fill();
    for (let i = 0; i < 3; i++) {
      const px = 38 + i * 4.4;
      ctx.strokeStyle = "rgba(84,76,44,0.7)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(px, -31); ctx.lineTo(px, -27); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(px, -27, 2.2, 1.1, 0, 0, TAU);
      ctx.fillStyle = "rgba(96,108,62,0.7)"; ctx.fill();
    }
    // three pyramids, farther-left, nearer-right
    pyramid(ctx, -30, -28, 18, 14, "rgba(226,204,164,0.98)");
    pyramid(ctx, -4, -25, 26, 20, "rgba(230,209,170,0.99)");
    pyramid(ctx, 26, -22, 36, 28, "rgba(234,214,176,0.99)");
    // queens' pyramids cluster
    pyramid(ctx, -46, -25, 8, 6, "rgba(222,200,160,0.98)");
    pyramid(ctx, -40, -24, 6, 5, "rgba(220,198,158,0.98)");
    pyramid(ctx, -35, -23.4, 5, 4, "rgba(218,196,156,0.98)");
    // smooth casing cap on the upper third of the great pyramid
    ctx.beginPath();
    ctx.moveTo(26, -50);
    ctx.lineTo(26 - 6.2, -40.4);
    ctx.lineTo(26 + 6.2, -40.4);
    ctx.closePath();
    ctx.fillStyle = "rgba(246,230,198,0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(120,92,56,0.35)";
    ctx.lineWidth = 0.22;
    ctx.stroke();
    // cap highlight + joints
    ctx.beginPath(); ctx.moveTo(26, -49.6); ctx.lineTo(20.6, -41.2);
    ctx.strokeStyle = "rgba(255,250,236,0.75)"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, -45.2); ctx.lineTo(20.2, -40.8);
    ctx.strokeStyle = "rgba(120,92,56,0.22)"; ctx.lineWidth = 0.16; ctx.stroke();
    // porters on the pyramid face
    for (let i = 0; i < 5; i++) {
      person(ctx, 12 + i * 2.2, -26 - i * 2.0, 0.12, "rgba(58,42,26,0.9)", {
        phase: t + i, fill: i % 2 ? "rgba(150,112,74,0.9)" : "rgba(112,88,58,0.9)", hat: "straw", noShadow: true,
      });
    }
    // construction ramp
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.lineTo(-36, -8);
    ctx.lineTo(-10, -18);
    ctx.lineTo(-4, -18);
    ctx.lineTo(-30, -6);
    ctx.lineTo(-44, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(202,172,124,0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(92,68,40,0.3)"; ctx.lineWidth = 0.25; ctx.stroke();
    // stone blocks on the ramp
    for (let i = 0; i < 5; i++) {
      const bx = -42 + i * 6.4;
      const by = -4.4 - i * 2.2;
      ctx.fillStyle = "rgba(214,190,148,0.98)";
      ctx.fillRect(bx, by - 2.0, 3.4, 2.0);
      ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.16;
      ctx.strokeRect(bx, by - 2.0, 3.4, 2.0);
    }
    // large foreground block being dragged
    ctx.fillStyle = "rgba(218,194,152,0.99)";
    ctx.fillRect(-36, -7.0, 8.6, 4.8);
    ctx.strokeStyle = "rgba(74,54,30,0.6)"; ctx.lineWidth = 0.24;
    ctx.strokeRect(-36, -7.0, 8.6, 4.8);
    ctx.beginPath(); ctx.moveTo(-36, -4.6); ctx.lineTo(-27.4, -4.6);
    ctx.strokeStyle = "rgba(74,54,30,0.25)"; ctx.lineWidth = 0.16; ctx.stroke();
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(-36, -6.6); ctx.lineTo(-43, -8.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-36, -5.2); ctx.lineTo(-43, -6.6); ctx.stroke();
    // workers pulling a sledge
    const sledgeX = -26, sledgeY = -6.4;
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(sledgeX, sledgeY); ctx.lineTo(sledgeX + 7.4, sledgeY - 1.2); ctx.stroke();
    ctx.fillStyle = "rgba(210,186,144,0.98)";
    ctx.fillRect(sledgeX - 2.4, sledgeY - 1.6, 3.6, 2.0);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.strokeRect(sledgeX - 2.4, sledgeY - 1.6, 3.6, 2.0);
    for (let i = 0; i < 4; i++) {
      person(ctx, -33 + i * 2.6, -5.6 + i * 0.2, 0.32, "rgba(70,50,30,0.96)", {
        phase: t * 1.2 + i, fill: i % 2 ? "rgba(150,112,74,0.95)" : "rgba(112,88,58,0.95)", hat: "straw",
      });
    }
    // overseer + surveyor
    person(ctx, -38, -3.8, 0.36, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(168,64,44,0.95)", hat: "cap", staff: true });
    person(ctx, -46, -2.8, 0.33, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(84,104,112,0.95)", hat: "straw" });
    // surveyor cord
    ctx.strokeStyle = "rgba(240,228,200,0.55)"; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(-46, -4.2); ctx.lineTo(-30, -6.2); ctx.stroke();
    // stone cutter with mallet
    person(ctx, -44, -2.2, 0.28, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(140,102,66,0.95)", hat: "straw", arm: true });
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.28;
    ctx.beginPath(); ctx.moveTo(-42.6, -4.6); ctx.lineTo(-41.2, -3.6); ctx.stroke();
    // stacked blocks
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(212,188,146,0.98)";
      ctx.fillRect(-50 + i * 0.4, -1.6 - i * 1.4, 3.0, 1.3);
      ctx.strokeStyle = "rgba(74,54,30,0.45)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(-50 + i * 0.4, -1.6 - i * 1.4, 3.0, 1.3);
    }
    // foreground sand ripples + chips
    for (let i = 0; i < 10; i++) {
      const yy = -1.2 + i * 0.6;
      ctx.strokeStyle = "rgba(230,196,146,0.28)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-50, yy); ctx.quadraticCurveTo(0, yy - 1.2, 50, yy); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      ctx.beginPath(); ctx.ellipse(-46 + i * 7.4, -0.8 - (i % 3) * 0.5, 0.9, 0.4, 0.3, 0, TAU);
      ctx.fillStyle = "rgba(150,124,86,0.6)"; ctx.fill();
    }
    // boat on the Nile
    ctx.beginPath();
    ctx.moveTo(38, -30.4); ctx.quadraticCurveTo(42, -28.8, 46, -30.2);
    ctx.quadraticCurveTo(42, -29.4, 38, -30.4); ctx.closePath();
    ctx.fillStyle = "rgba(118,84,50,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,40,24,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.strokeStyle = "rgba(58,40,24,0.7)"; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(42, -30); ctx.lineTo(42, -34); ctx.stroke();
    // distant caravan on the horizon
    ctx.save(); ctx.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) {
      camel(ctx, 8 + i * 3.4, -30, 0.12, "rgba(110,84,54,0.8)", i);
    }
    ctx.restore();
    // high cloud bank
    cloud(ctx, -6, -80, 24, "rgba(255,248,232,0.32)", 0.4);
    cloud(ctx, 26, -86, 14, "rgba(255,248,232,0.28)", 0.35);
    // rope coil foreground
    ctx.beginPath(); ctx.ellipse(42, -1.2, 2.6, 1.1, 0.3, 0, TAU);
    ctx.strokeStyle = "rgba(120,88,52,0.8)"; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(42, -1.2, 1.6, 0.6, 0.3, 0, TAU); ctx.stroke();
    // vulture + haze
    bird(ctx, -8, -70, 1.6, "rgba(67,48,29,0.4)");
    bird(ctx, 2, -76, 1.1, "rgba(67,48,29,0.35)");
    // dust
    for (let i = 0; i < 14; i++) {
      const q = (t * 0.25 + i * 0.11) % 1;
      ctx.beginPath(); ctx.arc(-30 + i * 2.6, -3 - q * 6, 1.4 + q * 3.4, 0, TAU);
      ctx.fillStyle = "rgba(214,180,132," + (0.12 * (1 - q)) + ")"; ctx.fill();
    }
    // dark foreground stone block
    ctx.beginPath();
    ctx.moveTo(26, 0); ctx.lineTo(28.5, -6.0); ctx.lineTo(38, -7.6); ctx.lineTo(48, -3.2); ctx.lineTo(50, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,92,60,0.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(62,44,28,0.7)"; ctx.lineWidth = 0.26; ctx.stroke();
    hatch(ctx, 28, -7.4, 20, 7.2, "rgba(40,28,16,0.24)", 1.5, -0.5);
    ctx.strokeStyle = "rgba(84,62,40,0.55)"; ctx.lineWidth = 0.18;
    ctx.beginPath(); ctx.moveTo(31, -5.4); ctx.lineTo(41, -1.2); ctx.stroke();
  };

  const gizaMap = function (ctx, t) {
    mapFloor(ctx, -10, 54, "#c3a06a", 0.42);
    pyramid(ctx, -36, -18, 22, 16, "rgba(228,206,166,0.98)");
    pyramid(ctx, -8, -14, 30, 22, "rgba(232,210,172,0.99)");
    pyramid(ctx, 26, -10, 34, 26, "rgba(236,216,178,0.99)");
    person(ctx, -46, -2, 0.6, "rgba(70,50,30,0.96)", { phase: t, fill: "rgba(150,112,74,0.95)", hat: "straw" });
    person(ctx, -38, -1, 0.55, "rgba(70,50,30,0.96)", { phase: t + 1, fill: "rgba(112,88,58,0.95)", hat: "cap" });
    bird(ctx, 34, -46, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 2A-2. Code of Hammurabi · 巴比伦 ────────────────── */
  const hammurabiStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#e8e0c6");
    sky.addColorStop(0.5, "#edd6ac");
    sky.addColorStop(1, "#e2bf8c");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 24, -70, 22, "#e2ab62", 0.35);
    ctx.beginPath(); ctx.arc(24, -70, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(224,174,96,0.9)"; ctx.fill();
    cloud(ctx, -26, -86, 13, "#fff7e6", 0.3);

    // ziggurat behind
    ziggurat(ctx, 24, -30, 32, 20, 4, "rgba(214,182,136,0.98)");
    // city wall
    ctx.fillStyle = "rgba(196,162,118,0.92)";
    ctx.fillRect(-50, -30, 34, 12);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.25;
    ctx.strokeRect(-50, -30, 34, 12);
    for (let x = -50; x < -16; x += 2.6) {
      ctx.fillStyle = "rgba(204,170,126,0.95)";
      ctx.fillRect(x, -32, 1.4, 2.2);
    }
    for (let yy = -28; yy < -18; yy += 2.8) {
      ctx.beginPath(); ctx.moveTo(-50, yy); ctx.lineTo(-16, yy);
      ctx.strokeStyle = "rgba(74,54,30,0.18)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // Euphrates at left
    ctx.fillStyle = "rgba(106,138,134,0.75)";
    ctx.beginPath();
    ctx.moveTo(-50, -26); ctx.quadraticCurveTo(-36, -28, -20, -25);
    ctx.lineTo(-20, -17); ctx.quadraticCurveTo(-36, -20, -50, -17); ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(232,238,226,0.28)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-48, -24 + i * 1.8); ctx.quadraticCurveTo(-34, -26 + i * 1.8, -22, -23 + i * 1.8); ctx.stroke();
    }
    // city roofs behind the wall
    for (let i = 0; i < 5; i++) {
      const bx = -46 + i * 6.2;
      const bh = 3.4 + (i % 3) * 1.2;
      ctx.fillStyle = "rgba(204,172,128,0.9)";
      ctx.fillRect(bx, -30 - bh, 4.8, bh);
      ctx.beginPath();
      ctx.moveTo(bx - 0.6, -30 - bh); ctx.lineTo(bx + 2.4, -32.6 - bh); ctx.lineTo(bx + 5.4, -30 - bh); ctx.closePath();
      ctx.fillStyle = "rgba(150,98,64,0.85)"; ctx.fill();
    }
    // boat on the Euphrates
    ctx.beginPath();
    ctx.moveTo(-42, -22); ctx.quadraticCurveTo(-36, -19.6, -30, -21.4);
    ctx.quadraticCurveTo(-36, -20.4, -42, -22); ctx.closePath();
    ctx.fillStyle = "rgba(118,84,50,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.strokeStyle = "rgba(74,50,30,0.7)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(-36, -21); ctx.lineTo(-36, -28); ctx.stroke();
    // reeds + second boat
    for (let i = 0; i < 8; i++) {
      const rx = -48 + i * 3.4;
      const ry = -20 - Math.sin(i) * 1.2;
      ctx.strokeStyle = "rgba(108,104,60,0.7)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(t + i) * 0.4, ry - 3.0); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-30, -19.6); ctx.quadraticCurveTo(-25, -17.8, -20, -19.2);
    ctx.quadraticCurveTo(-25, -18.2, -30, -19.6); ctx.closePath();
    ctx.fillStyle = "rgba(118,84,50,0.95)"; ctx.fill();
    // palms
    palm(ctx, -40, -18, 22, 3, "rgba(84,72,44,0.9)");
    palm(ctx, 38, -26, 20, -2, "rgba(84,72,44,0.9)");
    // courtyard wall
    ctx.fillStyle = "rgba(208,176,132,0.92)";
    ctx.fillRect(-16, -22, 54, 10);
    ctx.strokeStyle = "rgba(74,54,30,0.4)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(-16, -22, 54, 10);
    for (let x = -14; x < 38; x += 3.2) {
      ctx.strokeStyle = "rgba(74,54,30,0.16)"; ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.moveTo(x, -22); ctx.lineTo(x, -12); ctx.stroke();
    }
    // columns
    for (const cx of [-12, 2]) {
      ctx.fillStyle = "rgba(214,182,136,0.98)";
      ctx.fillRect(cx - 1.2, -24, 2.4, 12);
      ctx.strokeStyle = "rgba(74,54,30,0.45)"; ctx.lineWidth = 0.18;
      ctx.strokeRect(cx - 1.2, -24, 2.4, 12);
      ctx.beginPath(); ctx.ellipse(cx, -24, 2.6, 0.8, 0, 0, TAU);
      ctx.fillStyle = "rgba(188,152,108,0.95)"; ctx.fill();
    }

    // stele
    stele(ctx, -4, -10, 10, 30);
    // king / judge
    person(ctx, -16, -10, 0.42, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(150,60,42,0.95)", hat: "cap", arm: true, staff: true });
    // scribe with tablet
    person(ctx, 8, -10, 0.36, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(112,88,58,0.96)", hat: "cap", arm: true });
    tablet(ctx, 9.4, -10.4, 0.44);
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(10.0, -9.8); ctx.lineTo(10.9, -8.4); ctx.stroke();
    // brazier
    glow(ctx, 16, -6.4, 5, "#e0a85e", 0.35);
    ctx.fillStyle = "rgba(150,120,84,0.95)";
    ctx.fillRect(14.6, -7.4, 2.8, 1.6);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.16;
    ctx.strokeRect(14.6, -7.4, 2.8, 1.6);
    // guard with spear
    person(ctx, 14, -10, 0.38, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(84,104,112,0.95)", hat: "helmet", spear: true });
    // second petitioner
    person(ctx, -20, -7, 0.30, "rgba(58,42,26,0.98)", { phase: t + 4, fill: "rgba(140,102,66,0.95)", hat: "straw" });
    // petitioner
    ctx.save();
    ctx.translate(4, -8.4);
    ctx.rotate(0.25);
    person(ctx, 0, 0, 0.32, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(168,120,80,0.95)", hat: "straw" });
    ctx.restore();
    // foreground tablets + stylus + basket
    tablet(ctx, -24, -2.4, 0.72);
    tablet(ctx, -18, -1.6, 0.52);
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.26;
    ctx.beginPath(); ctx.moveTo(-12, -1.4); ctx.lineTo(-9.4, -3.4); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(18, -2.2, 3.2, 1.4, 0, 0, TAU);
    ctx.fillStyle = "rgba(168,136,88,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.45)"; ctx.lineWidth = 0.2; ctx.stroke();
    // cuneiform practice tablet on the ground
    ctx.fillStyle = "rgba(210,184,140,0.95)";
    ctx.fillRect(-30, -2.6, 5, 2.4);
    ctx.strokeStyle = "rgba(74,54,30,0.4)"; ctx.strokeRect(-30, -2.6, 5, 2.4);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-29, -1.8 + i * 0.5); ctx.lineTo(-26.4, -1.7 + i * 0.5);
      ctx.strokeStyle = "rgba(74,54,30,0.35)"; ctx.lineWidth = 0.1; ctx.stroke();
    }
    cloud(ctx, -8, -80, 22, "rgba(255,248,232,0.3)", 0.4);
    cloud(ctx, 28, -86, 12, "rgba(255,248,232,0.28)", 0.35);
    bird(ctx, -30, -66, 1.4, "rgba(67,48,29,0.35)");
    // dust motes
    for (let i = 0; i < 14; i++) {
      ctx.beginPath(); ctx.arc(-36 + ((i * 13 + t * 2) % 72), -10 - (i % 5) * 2.4, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(150,110,60,0.35)"; ctx.fill();
    }
  };

  const hammurabiMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#b99a68", 0.42);
    ziggurat(ctx, 26, -20, 30, 20, 4, "rgba(214,182,136,0.98)");
    stele(ctx, -8, -4, 14, 34);
    person(ctx, -24, -4, 0.7, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(150,60,42,0.95)", hat: "cap", staff: true });
    person(ctx, 10, -4, 0.62, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(112,88,58,0.96)", hat: "cap" });
    tablet(ctx, 15, -5, 1.3);
    palm(ctx, -42, -5, 24, 4, "rgba(84,72,44,0.9)");
    bird(ctx, 42, -44, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 2A-3. Athenian Democracy · 普尼克斯 ─────────────── */
  const athensStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#e9e6d2");
    sky.addColorStop(0.5, "#f0ddb7");
    sky.addColorStop(1, "#e7c58d");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, -28, -70, 24, "#e2ad62", 0.36);
    ctx.beginPath(); ctx.arc(-28, -70, 5.6, 0, TAU);
    ctx.fillStyle = "rgba(224,174,96,0.9)"; ctx.fill();
    cloud(ctx, 12, -86, 15, "#fff8e8", 0.35);

    // Acropolis
    acropolis(ctx, 26, -22, 46, "rgba(238,228,206,0.98)");
    // rocky outcrops on the slope
    for (const [rx, ry, rw, rh] of [[14, -21, 9, 4], [30, -20, 12, 5], [44, -19, 8, 4]]) {
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + rw * 0.35, ry - rh);
      ctx.lineTo(rx + rw * 0.72, ry - rh * 0.7);
      ctx.lineTo(rx + rw, ry);
      ctx.closePath();
      ctx.fillStyle = "rgba(144,136,102,0.85)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,54,30,0.4)"; ctx.lineWidth = 0.2; ctx.stroke();
    }
    hatch(ctx, 8, -22, 42, 10, "rgba(67,48,29,0.16)", 1.8, -0.65);
    // retaining wall at the hill base
    ctx.fillStyle = "rgba(188,170,132,0.92)";
    ctx.fillRect(2, -17.4, 44, 2.4);
    ctx.strokeStyle = "rgba(74,54,30,0.35)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(2, -17.4, 44, 2.4);
    for (let x = 4; x < 46; x += 4.4) {
      ctx.beginPath(); ctx.moveTo(x, -17.2); ctx.lineTo(x, -15.2);
      ctx.strokeStyle = "rgba(74,54,30,0.22)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // Parthenon shadow side
    ctx.fillStyle = "rgba(74,54,30,0.10)";
    ctx.fillRect(30, -31.6, 7, 9.6);
    ctx.beginPath(); ctx.ellipse(26, -21.6, 12, 1.6, 0, 0, TAU);
    ctx.fillStyle = "rgba(74,54,30,0.10)"; ctx.fill();
    // olive trees
    olive(ctx, -38, -16, 30, "rgba(88,76,50,0.9)");
    olive(ctx, 10, -18, 14, "rgba(88,76,50,0.9)");
    olive(ctx, 40, -20, 10, "rgba(88,76,50,0.8)");
    // rocky cliff under the Acropolis
    ctx.beginPath();
    ctx.moveTo(6, -14);
    ctx.lineTo(12, -18);
    ctx.lineTo(20, -20);
    ctx.lineTo(30, -21);
    ctx.lineTo(40, -20);
    ctx.lineTo(50, -17);
    ctx.lineTo(50, -10);
    ctx.lineTo(30, -12);
    ctx.lineTo(14, -10.4);
    ctx.closePath();
    ctx.fillStyle = "rgba(140,132,94,0.55)";
    ctx.fill();
    hatch(ctx, 10, -20, 40, 10, "rgba(67,48,29,0.14)", 1.8, -0.7);
    // city roofs below the hill
    for (let i = 0; i < 8; i++) {
      const bx = -6 + i * 4.6;
      const bh = 2.2 + (i % 3) * 1.0;
      ctx.fillStyle = "rgba(206,176,134,0.8)";
      ctx.fillRect(bx, -20 - bh, 3.6, bh);
      ctx.beginPath();
      ctx.moveTo(bx - 0.4, -20 - bh); ctx.lineTo(bx + 1.8, -21.8 - bh); ctx.lineTo(bx + 4.0, -20 - bh); ctx.closePath();
      ctx.fillStyle = "rgba(150,98,64,0.75)"; ctx.fill();
    }
    // western town below the Pnyx
    for (let i = 0; i < 9; i++) {
      const bx = -46 + i * 4.4;
      const bh = 2.0 + (i % 4) * 0.9;
      ctx.fillStyle = "rgba(200,170,128,0.75)";
      ctx.fillRect(bx, -19.4 - bh, 3.4, bh);
      ctx.beginPath();
      ctx.moveTo(bx - 0.4, -19.4 - bh);
      ctx.lineTo(bx + 1.7, -21.0 - bh);
      ctx.lineTo(bx + 3.8, -19.4 - bh);
      ctx.closePath();
      ctx.fillStyle = "rgba(146,94,60,0.7)"; ctx.fill();
    }
    // town wall
    ctx.fillStyle = "rgba(188,166,126,0.7)";
    ctx.fillRect(-50, -15.4, 44, 1.6);
    ctx.strokeStyle = "rgba(74,54,30,0.3)"; ctx.lineWidth = 0.18;
    ctx.strokeRect(-50, -15.4, 44, 1.6);
    // Pnyx terraces
    for (let i = 0; i < 4; i++) {
      const yy = -14 + i * 3.2;
      ctx.beginPath();
      ctx.moveTo(-46, yy);
      ctx.quadraticCurveTo(-12, yy - 2.2, 22, yy + 0.6);
      ctx.lineTo(22, yy + 4.4);
      ctx.quadraticCurveTo(-12, yy + 1.6, -46, yy + 4.4);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "rgba(196,174,134,0.8)" : "rgba(208,186,146,0.8)";
      ctx.fill();
      ctx.strokeStyle = "rgba(92,72,46,0.28)"; ctx.lineWidth = 0.2; ctx.stroke();
      // step shadow and stone joints
      ctx.beginPath();
      ctx.moveTo(-46, yy + 4.2); ctx.quadraticCurveTo(-12, yy + 1.4, 22, yy + 4.4);
      ctx.strokeStyle = "rgba(74,54,30,0.25)"; ctx.lineWidth = 0.3; ctx.stroke();
      for (let x = -42; x < 20; x += 5.2) {
        ctx.beginPath(); ctx.moveTo(x, yy + 0.4); ctx.lineTo(x, yy + 3.8);
        ctx.strokeStyle = "rgba(74,54,30,0.14)"; ctx.lineWidth = 0.1; ctx.stroke();
      }
    }
    // speaker's beman
    ctx.fillStyle = "rgba(202,182,146,0.98)";
    ctx.fillRect(-11, -16, 6.4, 6);
    ctx.strokeStyle = "rgba(74,54,30,0.45)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(-11, -16, 6.4, 6);
    ctx.strokeStyle = "rgba(74,54,30,0.2)"; ctx.lineWidth = 0.14;
    for (let k = 1; k < 3; k++) {
      ctx.beginPath(); ctx.moveTo(-10.4, -16 + k * 2); ctx.lineTo(-5.2, -16 + k * 2); ctx.stroke();
    }
    // speaker
    person(ctx, -7.8, -16, 0.44, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(168,64,44,0.95)", hat: "straw", arm: true });
    // herald
    person(ctx, 14, -8, 0.34, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(84,104,112,0.95)", hat: "cap", staff: true });
    // citizens on the terraces
    const crowd = [
      [-40, -11, 0.24], [-34, -10.4, 0.26], [-28, -9.8, 0.27], [-22, -9.2, 0.28],
      [-16, -8.6, 0.29], [-2, -8.0, 0.30], [4, -7.4, 0.29], [10, -6.8, 0.28],
      [18, -6.2, 0.27], [-36, -6.2, 0.26], [-30, -5.6, 0.27], [-24, -5.0, 0.28],
      [-18, -4.4, 0.29], [-4, -3.8, 0.30], [2, -3.2, 0.29], [8, -2.6, 0.28],
    ];
    crowd.forEach(([cx, cy, cs], i) => {
      person(ctx, cx, cy, cs * 1.18, "rgba(58,42,26,0.98)", {
        phase: t * 0.7 + i, seed: i,
        fill: i % 4 === 0 ? "rgba(150,112,74,0.95)" : i % 4 === 1 ? "rgba(84,104,112,0.95)" : i % 4 === 2 ? "rgba(168,64,44,0.9)" : "rgba(112,88,58,0.95)",
        hat: i % 3 === 0 ? "straw" : null,
      });
    });
    // seated citizens and a second speaker
    seatedPerson(ctx, -34, -8.2, 0.34, "rgba(58,42,26,0.98)", { fill: "rgba(112,88,58,0.95)", hat: "straw" });
    seatedPerson(ctx, -24, -6.6, 0.34, "rgba(58,42,26,0.98)", { fill: "rgba(84,104,112,0.95)" });
    seatedPerson(ctx, -4, -4.4, 0.36, "rgba(58,42,26,0.98)", { fill: "rgba(150,112,74,0.95)", hat: "cap" });
    seatedPerson(ctx, 12, -3.6, 0.36, "rgba(58,42,26,0.98)", { fill: "rgba(168,64,44,0.9)" });
    person(ctx, 6, -11.4, 0.34, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(84,104,112,0.95)", hat: "straw", arm: true });
    person(ctx, -44, -3.2, 0.40, "rgba(58,42,26,0.98)", { phase: t + 4, fill: "rgba(150,112,74,0.95)", hat: "straw" });
    person(ctx, 26, -2.6, 0.38, "rgba(58,42,26,0.98)", { phase: t + 5, fill: "rgba(84,104,112,0.95)", hat: "cap", arm: true });
    // ostraka in the foreground
    for (let i = 0; i < 7; i++) {
      const ox = -42 + i * 11 + (i % 2) * 2;
      const oy = -1.4 + (i % 3) * 0.6;
      ctx.beginPath();
      ctx.moveTo(ox - 2.4, oy);
      ctx.lineTo(ox - 1.2, oy - 2.2);
      ctx.lineTo(ox + 2.0, oy - 2.0);
      ctx.lineTo(ox + 2.6, oy);
      ctx.closePath();
      ctx.fillStyle = "rgba(206,176,132,0.98)"; ctx.fill();
      ctx.strokeStyle = "rgba(92,64,36,0.5)"; ctx.lineWidth = 0.18; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox - 0.8, oy - 1.2); ctx.lineTo(ox + 0.8, oy - 1.4);
      ctx.strokeStyle = "rgba(74,50,30,0.45)"; ctx.lineWidth = 0.1; ctx.stroke();
    }
    // voting urn and a citizen casting an ostrakon
    ctx.fillStyle = "rgba(168,136,90,0.98)";
    ctx.beginPath();
    ctx.moveTo(10, -3.4); ctx.lineTo(14, -3.4); ctx.lineTo(12.8, 0); ctx.lineTo(11.2, 0); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(12, -3.4, 2, 0.6, 0, 0, TAU);
    ctx.fillStyle = "rgba(96,72,44,0.9)"; ctx.fill();
    ctx.save();
    ctx.translate(18, -2.2);
    ctx.rotate(-0.4);
    ctx.fillStyle = "rgba(206,176,132,0.98)";
    ctx.fillRect(-1.2, -1.4, 2.4, 1.8);
    ctx.strokeStyle = "rgba(92,64,36,0.5)"; ctx.lineWidth = 0.14;
    ctx.strokeRect(-1.2, -1.4, 2.4, 1.8);
    ctx.restore();
    // clouds and birds
    cloud(ctx, -4, -82, 22, "#fff8e8", 0.35);
    cloud(ctx, 24, -88, 12, "#fff8e8", 0.3);
    cloud(ctx, -34, -90, 10, "#fff8e8", 0.26);
    cloud(ctx, 8, -74, 8, "#fff8e8", 0.22);
    bird(ctx, 10, -74, 1.2, "rgba(67,48,29,0.35)");
    bird(ctx, 18, -78, 0.9, "rgba(67,48,29,0.3)");
    // olive branch foreground
    ctx.strokeStyle = "rgba(88,96,56,0.8)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(26, -0.4); ctx.quadraticCurveTo(34, -4, 42, -2.4); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(28 + i * 3.2, -2.2 - Math.sin(i) * 1.2, 1.5, 0.7, 0.4, 0, TAU);
      ctx.fillStyle = "rgba(108,120,74,0.8)"; ctx.fill();
    }
    // dark foreground rock, right corner
    ctx.beginPath();
    ctx.moveTo(40, 0); ctx.lineTo(41.4, -4.8); ctx.lineTo(46.6, -5.8); ctx.lineTo(50, -2.6); ctx.lineTo(50, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(96,84,58,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(56,44,28,0.65)"; ctx.lineWidth = 0.24; ctx.stroke();
    hatch(ctx, 41, -5.6, 9, 5.6, "rgba(40,30,18,0.28)", 1.4, -0.7);
  };

  const athensMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#c1a06e", 0.4);
    acropolis(ctx, 36, -10, 30, "rgba(238,228,206,0.98)");
    olive(ctx, -40, -6, 26, "rgba(88,76,50,0.9)");
    // beman + speaker
    ctx.fillStyle = "rgba(202,182,146,0.98)";
    ctx.fillRect(-12, -10, 8, 6);
    ctx.strokeStyle = "rgba(74,54,30,0.45)"; ctx.lineWidth = 0.5; ctx.strokeRect(-12, -10, 8, 6);
    person(ctx, -8, -10, 0.9, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(168,64,44,0.95)", hat: "straw", arm: true });
    for (let i = 0; i < 8; i++) {
      person(ctx, -36 + i * 9, -6 + (i % 3) * 1.4, 0.62, "rgba(58,42,26,0.98)", {
        phase: t + i, fill: i % 2 ? "rgba(150,112,74,0.95)" : "rgba(84,104,112,0.95)", hat: i % 3 === 0 ? "straw" : null,
      });
    }
    bird(ctx, -30, -44, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 2A-4. Qin Unifies China · 咸阳道 ─────────────────── */
  const qinGate = function (ctx, x, baseY, w, h) {
    // rammed-earth gate tower with a tiled hip roof
    ctx.fillStyle = "rgba(196,166,120,0.97)";
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    ctx.strokeStyle = "rgba(74,54,30,0.55)"; ctx.lineWidth = 0.35;
    ctx.strokeRect(x - w / 2, baseY - h, w, h);
    for (let yy = baseY - h + 1.6; yy < baseY; yy += 2.2) {
      ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy);
      ctx.strokeStyle = "rgba(74,54,30,0.16)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // gate opening
    ctx.beginPath();
    ctx.moveTo(x - w * 0.17, baseY);
    ctx.lineTo(x - w * 0.17, baseY - h * 0.42);
    ctx.quadraticCurveTo(x, baseY - h * 0.62, x + w * 0.17, baseY - h * 0.42);
    ctx.lineTo(x + w * 0.17, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(54,38,24,0.85)"; ctx.fill();
    // tiled hip roof
    ctx.beginPath();
    ctx.moveTo(x - w * 0.66, baseY - h);
    ctx.quadraticCurveTo(x - w * 0.34, baseY - h - 6.4, x, baseY - h - 9.2);
    ctx.quadraticCurveTo(x + w * 0.34, baseY - h - 6.4, x + w * 0.66, baseY - h);
    ctx.lineTo(x + w * 0.5, baseY - h + 2.2);
    ctx.lineTo(x - w * 0.5, baseY - h + 2.2);
    ctx.closePath();
    ctx.fillStyle = "rgba(132,78,50,0.96)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,40,24,0.75)"; ctx.lineWidth = 0.3; ctx.stroke();
    // ridge
    ctx.beginPath(); ctx.moveTo(x - w * 0.52, baseY - h - 8.2); ctx.quadraticCurveTo(x, baseY - h - 10.2, x + w * 0.52, baseY - h - 8.2);
    ctx.strokeStyle = "rgba(58,40,24,0.55)"; ctx.lineWidth = 0.3; ctx.stroke();
    // tile courses
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * w * 0.14, baseY - h - 1.2);
      ctx.lineTo(x + i * w * 0.10, baseY - h - 8.0 + Math.abs(i) * 0.4);
      ctx.strokeStyle = "rgba(58,40,24,0.22)"; ctx.lineWidth = 0.14; ctx.stroke();
    }
    // eave tips
    ctx.beginPath(); ctx.moveTo(x - w * 0.66, baseY - h); ctx.quadraticCurveTo(x - w * 0.7, baseY - h - 1.4, x - w * 0.62, baseY - h - 2.2);
    ctx.moveTo(x + w * 0.66, baseY - h); ctx.quadraticCurveTo(x + w * 0.7, baseY - h - 1.4, x + w * 0.62, baseY - h - 2.2);
    ctx.strokeStyle = "rgba(58,40,24,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
    // banners
    for (const bx of [x - w * 0.4, x + w * 0.4]) {
      ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(bx, baseY - h); ctx.lineTo(bx, baseY - h - 10); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + 0.2, baseY - h - 9.4);
      ctx.lineTo(bx + 4.4, baseY - h - 6.8);
      ctx.lineTo(bx + 0.2, baseY - h - 4.2);
      ctx.closePath();
      ctx.fillStyle = "rgba(168,64,44,0.95)"; ctx.fill();
    }
  };

  const qinStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#d9d2bf");
    sky.addColorStop(0.5, "#e4d2ae");
    sky.addColorStop(1, "#d9b988");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 20, -68, 22, "#d8a45e", 0.3);
    ctx.beginPath(); ctx.arc(20, -68, 5.2, 0, TAU);
    ctx.fillStyle = "rgba(216,166,90,0.88)"; ctx.fill();
    cloud(ctx, -22, -84, 18, "rgba(248,240,222,0.35)", 0.4);
    cloud(ctx, 18, -90, 12, "rgba(248,240,222,0.28)", 0.32);
    // loess plateau
    ridge(ctx, -50, 10, -40, 7, "rgba(168,142,98,0.45)", 7, 4, -30);
    ridge(ctx, 12, 50, -42, 6, "rgba(168,142,98,0.45)", 13, 4, -30);
    hatch(ctx, -50, -38, 40, 10, "rgba(74,54,30,0.12)", 2.0, -0.7);
    // rammed-earth wall
    ctx.fillStyle = "rgba(190,160,116,0.95)";
    ctx.fillRect(-50, -30, 40, 9);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.25;
    ctx.strokeRect(-50, -30, 40, 9);
    for (let x = -50; x < -12; x += 2.4) {
      ctx.fillStyle = "rgba(200,170,126,0.96)";
      ctx.fillRect(x, -32, 1.3, 2.2);
    }
    for (let yy = -28; yy < -21; yy += 2.4) {
      ctx.beginPath(); ctx.moveTo(-50, yy); ctx.lineTo(-12, yy);
      ctx.strokeStyle = "rgba(74,54,30,0.16)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // watchtower on the wall
    ctx.fillStyle = "rgba(196,166,122,0.97)";
    ctx.fillRect(-24, -39, 6, 9);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.22; ctx.strokeRect(-24, -39, 6, 9);
    ctx.beginPath(); ctx.moveTo(-25.2, -39); ctx.lineTo(-21, -43); ctx.lineTo(-16.8, -39); ctx.closePath();
    ctx.fillStyle = "rgba(132,78,50,0.95)"; ctx.fill();
    // gate
    qinGate(ctx, 2, -26, 20, 17);
    // road
    ctx.beginPath();
    ctx.moveTo(-2, -26); ctx.quadraticCurveTo(4, -14, 14, 0);
    ctx.lineTo(32, 0); ctx.quadraticCurveTo(16, -14, 10, -26);
    ctx.closePath();
    ctx.fillStyle = "rgba(204,170,122,0.6)"; ctx.fill();
    // Qin soldiers
    const soldiers = [
      [-34, -22, 0.28], [-28, -21, 0.30], [-22, -20, 0.31], [-16, -19, 0.32],
      [-36, -16, 0.32], [-30, -15, 0.34], [-24, -14, 0.35], [-18, -13, 0.36],
      [-10, -12, 0.36], [-4, -11, 0.37], [4, -10, 0.38], [10, -9, 0.38],
    ];
    soldiers.forEach(([sx, sy, ss], i) => {
      person(ctx, sx, sy, ss, "rgba(52,38,24,0.98)", {
        phase: t * 0.8 + i, seed: i,
        fill: i % 4 === 0 ? "rgba(150,60,42,0.95)" : i % 4 === 1 ? "rgba(74,62,52,0.96)" : "rgba(96,74,54,0.96)",
        hat: i % 3 === 0 ? "helmet" : "cap", spear: i % 2 === 0,
      });
    });
    // rear ranks
    for (let i = 0; i < 6; i++) {
      person(ctx, -34 + i * 6, -24.4 + (i % 2) * 0.6, 0.24, "rgba(52,38,24,0.95)", {
        phase: t + i, fill: i % 2 ? "rgba(74,62,52,0.95)" : "rgba(96,74,54,0.95)", hat: "helmet", spear: i % 2 === 0, noShadow: true,
      });
    }
    // drummer
    person(ctx, -40, -12, 0.34, "rgba(52,38,24,0.98)", { phase: t + 2, fill: "rgba(150,60,42,0.95)", hat: "cap", arm: true });
    ctx.beginPath(); ctx.ellipse(-36.4, -10.4, 2.2, 1.6, 0.1, 0, TAU);
    ctx.fillStyle = "rgba(132,92,56,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,40,24,0.6)"; ctx.lineWidth = 0.2; ctx.stroke();
    // chariot with two horses
    const cx = 20, cy = -10;
    horse(ctx, cx - 4, cy - 1.2, 0.42, "rgba(92,70,46,0.97)", t + 0.4, {});
    horse(ctx, cx + 3, cy - 1.4, 0.42, "rgba(84,64,42,0.97)", t + 1.1, {});
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(cx - 1, cy - 3); ctx.lineTo(cx + 9, cy - 5); ctx.stroke();
    ctx.fillStyle = "rgba(120,78,48,0.95)";
    ctx.fillRect(cx + 8, cy - 8, 8, 5.4);
    ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(cx + 8, cy - 8, 8, 5.4);
    for (const wx of [cx + 9.4, cx + 14.6]) {
      ctx.beginPath(); ctx.arc(wx, cy - 2.4, 2.1, 0, TAU); ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(wx, cy - 2.4); ctx.lineTo(wx + Math.cos(a) * 2.0, cy - 2.4 + Math.sin(a) * 2.0); ctx.stroke();
      }
    }
    // canopy
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.28;
    ctx.beginPath(); ctx.moveTo(cx + 16, cy - 8); ctx.lineTo(cx + 16, cy - 18); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + 16, cy - 18, 5.2, 1.7, 0, 0, TAU);
    ctx.fillStyle = "rgba(214,186,140,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    // driver + general
    person(ctx, cx + 11, cy - 8, 0.34, "rgba(52,38,24,0.98)", { phase: t + 2, fill: "rgba(150,60,42,0.95)", hat: "helmet", arm: true });
    person(ctx, cx + 14, cy - 8.4, 0.30, "rgba(52,38,24,0.98)", { phase: t + 3, fill: "rgba(96,74,54,0.96)", hat: "helmet" });
    // chariot banner
    ctx.strokeStyle = "rgba(58,40,24,0.9)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(cx + 17.4, cy - 8); ctx.lineTo(cx + 17.4, cy - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 17.6, cy - 21.4); ctx.lineTo(cx + 21.6, cy - 19.4); ctx.lineTo(cx + 17.6, cy - 17.4); ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.95)"; ctx.fill();
    // bronze fittings
    ctx.fillStyle = "rgba(196,150,74,0.9)";
    ctx.fillRect(cx + 8.4, cy - 6.6, 1.2, 1.2);
    ctx.fillRect(cx + 14, cy - 6.6, 1.2, 1.2);
    // banners in the ranks
    for (const [bx, by, bh] of [[-26, -22, 12], [-8, -15, 10], [8, -8, 9]]) {
      ctx.strokeStyle = "rgba(58,40,24,0.9)"; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - bh); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + 0.2, by - bh + 0.4);
      ctx.lineTo(bx + 5.0, by - bh + 3.0);
      ctx.lineTo(bx + 0.2, by - bh + 5.6);
      ctx.closePath();
      ctx.fillStyle = "rgba(168,64,44,0.95)"; ctx.fill();
    }
    // dust
    for (let i = 0; i < 18; i++) {
      const q = (t * 0.3 + i * 0.09) % 1;
      ctx.beginPath(); ctx.arc(-30 + i * 3.4, -6 - q * 10, 2 + q * 5, 0, TAU);
      ctx.fillStyle = "rgba(206,174,128," + (0.12 * (1 - q)) + ")"; ctx.fill();
    }
    // foreground drum + fallen banner
    ctx.beginPath(); ctx.ellipse(-40, -1.8, 3.6, 1.8, 0.1, 0, TAU);
    ctx.fillStyle = "rgba(132,92,56,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,40,24,0.6)"; ctx.lineWidth = 0.22; ctx.stroke();
    ctx.strokeStyle = "rgba(74,50,30,0.7)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(30, -1); ctx.lineTo(40, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38, -6.2); ctx.lineTo(42.6, -8.6); ctx.lineTo(39.4, -4.6); ctx.closePath();
    ctx.fillStyle = "rgba(120,84,52,0.6)"; ctx.fill();
  };

  const qinMap = function (ctx, t) {
    mapFloor(ctx, -8, 46, "#b99a68", 0.42);
    ctx.fillStyle = "rgba(190,160,116,0.95)";
    ctx.fillRect(-58, -18, 34, 8);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.6; ctx.strokeRect(-58, -18, 34, 8);
    qinGate(ctx, -12, -14, 24, 18);
    horse(ctx, 14, -6, 0.55, "rgba(92,70,46,0.97)", t, {});
    horse(ctx, 22, -6.4, 0.55, "rgba(84,64,42,0.97)", t + 0.6, {});
    ctx.fillStyle = "rgba(120,78,48,0.95)";
    ctx.fillRect(26, -12, 12, 7);
    ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.5; ctx.strokeRect(26, -12, 12, 7);
    person(ctx, 30, -12, 0.6, "rgba(52,38,24,0.98)", { phase: t, fill: "rgba(150,60,42,0.95)", hat: "helmet" });
    for (let i = 0; i < 4; i++) {
      person(ctx, -46 + i * 7, -7, 0.55, "rgba(52,38,24,0.98)", { phase: t + i, fill: i % 2 ? "rgba(96,74,54,0.96)" : "rgba(74,62,52,0.96)", hat: "helmet", spear: i % 2 === 0 });
    }
    // banners
    ctx.strokeStyle = "rgba(58,40,24,0.9)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(-30, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-29.6, -29); ctx.lineTo(-20, -24); ctx.lineTo(-29.6, -19); ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.95)"; ctx.fill();
    bird(ctx, 40, -40, 1.6, "rgba(67,48,29,0.38)");
  };

  /* ── 2A-5. Maurya Empire · 华氏城 ────────────────────── */
  const mauryaStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#cfd3c2");
    sky.addColorStop(0.5, "#dfd3b4");
    sky.addColorStop(1, "#d8b98a");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, -20, -64, 24, "#d8a65e", 0.28);
    ctx.beginPath(); ctx.arc(-20, -64, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(216,166,90,0.85)"; ctx.fill();
    // monsoon clouds
    cloud(ctx, 10, -80, 24, "rgba(246,240,224,0.42)", 0.5);
    cloud(ctx, -30, -88, 16, "rgba(246,240,224,0.35)", 0.4);
    // distant fields
    ridge(ctx, -50, 50, -34, 4.2, "rgba(122,132,86,0.35)", 9, 5, -28);
    // Ganges
    const riv = ctx.createLinearGradient(0, -26, 0, -14);
    riv.addColorStop(0, "#7f9c96");
    riv.addColorStop(1, "#5f807c");
    ctx.beginPath();
    ctx.moveTo(-52, -26); ctx.quadraticCurveTo(-24, -30, 2, -26);
    ctx.quadraticCurveTo(28, -22, 52, -27);
    ctx.lineTo(52, -15); ctx.quadraticCurveTo(26, -12, 0, -16);
    ctx.quadraticCurveTo(-26, -20, -52, -13);
    ctx.closePath();
    ctx.fillStyle = riv; ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(238,232,208,0.3)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-46, -24 + i * 2); ctx.quadraticCurveTo(0, -27 + i * 2, 46, -23 + i * 2); ctx.stroke();
    }
    // boats
    for (const [bx, by] of [[-36, -22], [34, -20]]) {
      ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.quadraticCurveTo(bx, by + 2.2, bx + 5, by + 0.4);
      ctx.quadraticCurveTo(bx, by + 1.2, bx - 5, by); ctx.closePath();
      ctx.fillStyle = "rgba(112,78,46,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(58,40,24,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    }
    // banners on the palisade
    for (const bx of [-46, -30]) {
      ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.28;
      ctx.beginPath(); ctx.moveTo(bx, -30); ctx.lineTo(bx, -38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 0.2, -37.4); ctx.lineTo(bx + 4.2, -35.4); ctx.lineTo(bx + 0.2, -33.4); ctx.closePath();
      ctx.fillStyle = "rgba(168,64,44,0.92)"; ctx.fill();
    }
    // timber palisade + palace
    ctx.fillStyle = "rgba(150,110,70,0.95)";
    ctx.fillRect(-50, -30, 36, 10);
    ctx.strokeStyle = "rgba(74,50,30,0.45)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(-50, -30, 36, 10);
    for (let x = -50; x < -14; x += 2.2) {
      ctx.strokeStyle = "rgba(74,50,30,0.35)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x, -20); ctx.stroke();
    }
    // palace roofs behind
    for (let i = 0; i < 4; i++) {
      const bx = -46 + i * 9;
      ctx.fillStyle = "rgba(196,160,114,0.9)";
      ctx.fillRect(bx, -36, 7.4, 6);
      ctx.beginPath();
      ctx.moveTo(bx - 1, -36); ctx.quadraticCurveTo(bx + 3.7, -40.4, bx + 8.4, -36); ctx.closePath();
      ctx.fillStyle = "rgba(146,92,56,0.9)"; ctx.fill();
    }
    // banyan tree on the right bank
    ctx.strokeStyle = "rgba(74,56,34,0.95)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(34, -10); ctx.quadraticCurveTo(31, -18, 34, -28); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(32 + i * 1.1, -20); ctx.lineTo(31 + i * 1.3, -10);
      ctx.strokeStyle = "rgba(74,56,34,0.35)"; ctx.lineWidth = 0.2; ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(29 + i * 2.6, -27 - (i % 2) * 2.0, 6.6 - i * 0.5, 3.0, 0, 0, TAU);
      ctx.fillStyle = "rgba(84,100,58,0.8)"; ctx.fill();
    }
    // royal parasol + king
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(26, -12); ctx.lineTo(26, -24); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(26, -24, 5.2, 1.6, 0, 0, TAU);
    ctx.fillStyle = "rgba(232,214,180,0.96)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.4)"; ctx.lineWidth = 0.18; ctx.stroke();
    person(ctx, 26, -12, 0.36, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(196,150,78,0.95)", hat: "cap" });
    person(ctx, 21.6, -11, 0.28, "rgba(58,42,26,0.98)", { phase: t + 4, fill: "rgba(84,104,112,0.95)", hat: "helmet", spear: true });
    // peacocks on the wall
    for (const px of [-44, -20]) {
      ctx.beginPath(); ctx.ellipse(px, -31, 2.0, 1.0, -0.2, 0, TAU);
      ctx.fillStyle = "rgba(56,94,86,0.9)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(px + 1.6, -31); ctx.lineTo(px + 3.4, -33.4); ctx.lineTo(px + 2.6, -30.6); ctx.closePath();
      ctx.fillStyle = "rgba(196,150,78,0.9)"; ctx.fill();
    }
    // near bank for the procession
    ctx.beginPath();
    ctx.moveTo(-52, -16);
    ctx.quadraticCurveTo(-10, -12, 24, -14.2);
    ctx.lineTo(50, -14.6);
    ctx.lineTo(50, 0);
    ctx.lineTo(-52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(204,174,128,0.97)";
    ctx.fill();
    ctx.strokeStyle = "rgba(92,68,40,0.35)"; ctx.lineWidth = 0.24;
    ctx.beginPath(); ctx.moveTo(-52, -16); ctx.quadraticCurveTo(-10, -12, 24, -14.2); ctx.lineTo(50, -14.6); ctx.stroke();
    for (let i = 0; i < 22; i++) {
      const gx = -48 + i * 4.4;
      const gy = -14.2 + Math.sin(i * 0.8) * 1.0;
      ctx.strokeStyle = "rgba(104,96,58,0.55)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.sin(t + i) * 0.4, gy - 1.8); ctx.stroke();
    }
    // riverbank steps and reeds
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(196,168,124,0.9)";
      ctx.fillRect(-2 + i * 2.0, -15.6 + i * 1.2, 12 - i * 3.2, 1.0);
      ctx.strokeStyle = "rgba(74,54,30,0.25)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(-2 + i * 2.0, -15.6 + i * 1.2, 12 - i * 3.2, 1.0);
    }
    for (let i = 0; i < 9; i++) {
      const rx = -14 + i * 3.2;
      const ry = -14.6 - Math.sin(i) * 0.8;
      ctx.strokeStyle = "rgba(104,104,60,0.6)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(t + i) * 0.4, ry - 2.8); ctx.stroke();
    }
    // distant elephant
    ctx.save(); ctx.globalAlpha = 0.55;
    elephant(ctx, -10, -13.4, 0.34, "rgba(118,110,98,0.9)", { phase: t * 0.6 });
    ctx.restore();
    // elephant procession
    elephant(ctx, 10, -14, 0.78, "rgba(118,110,98,0.98)", { phase: t * 0.8, howdah: true });
    // blanket stripes + mahout goad
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(5.6 + i * 2.2, -16.8 + i * 0.4);
      ctx.lineTo(6.2 + i * 2.2, -14.4 + i * 0.4);
      ctx.strokeStyle = "rgba(196,150,78,0.55)"; ctx.lineWidth = 0.3; ctx.stroke();
    }
    ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(18.8, -17.6); ctx.lineTo(21.2, -14.4); ctx.stroke();
    person(ctx, 18.4, -16.4, 0.26, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(168,64,44,0.95)", hat: "cap" });
    person(ctx, 4, -10, 0.34, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(196,150,78,0.95)", hat: "straw", staff: true });
    // horses + guards
    horse(ctx, 38, -9, 0.38, "rgba(96,72,48,0.97)", t + 0.5, { rider: true, riderCol: "rgba(150,60,42,0.95)" });
    for (let i = 0; i < 4; i++) {
      person(ctx, -8 + i * 7, -7 + (i % 2) * 0.8, 0.30, "rgba(58,42,26,0.98)", {
        phase: t + i, fill: i % 2 ? "rgba(84,104,112,0.95)" : "rgba(150,112,74,0.95)", hat: "cap", spear: i % 2 === 0,
      });
    }
    // lotus pond foreground
    ctx.fillStyle = "rgba(96,128,122,0.55)";
    ctx.beginPath();
    ctx.moveTo(-52, -2); ctx.quadraticCurveTo(-30, -6, -8, -3);
    ctx.quadraticCurveTo(10, -1, 20, 0); ctx.lineTo(-52, 0); ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const lx = -46 + i * 7;
      ctx.beginPath(); ctx.ellipse(lx, -3.2 + (i % 2) * 0.6, 1.8, 0.9, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(108,132,96,0.85)"; ctx.fill();
      ctx.beginPath(); ctx.arc(lx + 0.8, -4.2, 0.7, 0, TAU);
      ctx.fillStyle = i % 2 ? "rgba(214,150,158,0.9)" : "rgba(238,224,200,0.9)"; ctx.fill();
    }
    // birds
    bird(ctx, -10, -72, 1.2, "rgba(67,48,29,0.35)");
    bird(ctx, -2, -76, 0.9, "rgba(67,48,29,0.3)");
  };

  const mauryaMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#b39a6e", 0.4);
    // river
    ctx.beginPath();
    ctx.moveTo(-60, -14); ctx.quadraticCurveTo(-24, -18, 4, -14);
    ctx.quadraticCurveTo(30, -10, 60, -16); ctx.lineTo(60, -4);
    ctx.quadraticCurveTo(26, -2, 0, -6); ctx.quadraticCurveTo(-28, -9, -60, -4);
    ctx.closePath(); ctx.fillStyle = "rgba(96,128,124,0.75)"; ctx.fill();
    // palisade
    ctx.fillStyle = "rgba(150,110,70,0.95)"; ctx.fillRect(-60, -22, 34, 9);
    ctx.strokeStyle = "rgba(74,50,30,0.45)"; ctx.lineWidth = 0.5; ctx.strokeRect(-60, -22, 34, 9);
    for (let x = -58; x < -28; x += 4) {
      ctx.strokeStyle = "rgba(74,50,30,0.35)"; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(x, -22); ctx.lineTo(x, -13); ctx.stroke();
    }
    elephant(ctx, 6, -8, 0.95, "rgba(118,110,98,0.98)", { phase: t * 0.8, howdah: true });
    person(ctx, 24, -8, 0.6, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(168,64,44,0.95)", hat: "cap" });
    horse(ctx, 36, -6, 0.55, "rgba(96,72,48,0.97)", t + 0.5, { rider: true, riderCol: "rgba(150,60,42,0.95)" });
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(-40 + i * 8, -2 + (i % 2) * 0.6, 2.0, 1.0, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(108,132,96,0.85)"; ctx.fill();
      ctx.beginPath(); ctx.arc(-39 + i * 8, -3, 0.8, 0, TAU);
      ctx.fillStyle = "rgba(214,150,158,0.9)"; ctx.fill();
    }
    bird(ctx, 40, -42, 1.6, "rgba(67,48,29,0.35)");
  };

  /* ── 2A-6. The Silk Road · 玉门关 ────────────────────── */
  const silkStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -40);
    sky.addColorStop(0, "#e3e2d2");
    sky.addColorStop(0.45, "#ecd9b4");
    sky.addColorStop(1, "#e2bc84");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -40 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 24, -70, 22, "#dfa85e", 0.35);
    ctx.beginPath(); ctx.arc(24, -70, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(220,164,86,0.9)"; ctx.fill();
    cloud(ctx, -24, -84, 18, "rgba(250,244,228,0.35)", 0.4);
    cloud(ctx, 18, -90, 12, "rgba(250,244,228,0.28)", 0.32);
    // snow mountains: two layers
    const snowRange = (baseY, minH, maxH, color, seed, snow) => {
      const rr = rng(seed);
      let x = -54;
      const pts = [];
      while (x < 54) {
        const w = 26 + rr() * 16;
        const h = minH + rr() * (maxH - minH);
        pts.push([x, baseY, x + w * 0.52, baseY - h, x + w, baseY]);
        x += w * 0.76;
      }
      ctx.beginPath();
      ctx.moveTo(-54, baseY + 20);
      for (const p of pts) { ctx.lineTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); }
      ctx.lineTo(54, baseY + 20); ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "rgba(74,54,30,0.25)"; ctx.lineWidth = 0.22; ctx.stroke();
      if (snow) {
        for (const p of pts) {
          if (p[3] < baseY - minH * 0.9) {
            const half = (p[4] - p[0]) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p[2] - half, p[3] + (p[5] - p[3]) * 0.32);
            ctx.lineTo(p[2] - half * 0.45, p[3] + (p[5] - p[3]) * 0.12);
            ctx.lineTo(p[2] + half * 0.1, p[3]);
            ctx.lineTo(p[2] + half * 0.6, p[3] + (p[5] - p[3]) * 0.18);
            ctx.lineTo(p[2] + half, p[3] + (p[5] - p[3]) * 0.30);
            ctx.closePath();
            ctx.fillStyle = "rgba(244,238,222,0.92)"; ctx.fill();
          }
        }
      }
    };
    snowRange(-40, 12, 22, "rgba(196,184,156,0.6)", 13, true);
    snowRange(-33, 9, 16, "rgba(166,148,114,0.78)", 7, true);
    hatch(ctx, -50, -33, 100, 10, "rgba(74,54,30,0.12)", 2.2, -0.6);
    // dunes
    for (let i = 0; i < 3; i++) {
      const yy = -24 + i * 6;
      const rr = rng(9 + i);
      ctx.beginPath();
      ctx.moveTo(-54, yy + 12);
      for (let x = -52; x <= 52; x += 8) ctx.lineTo(x, yy - Math.sin(x * 0.05 + i) * 2.4 - rr() * 1.8);
      ctx.lineTo(54, yy + 12); ctx.closePath();
      ctx.fillStyle = i === 0 ? "rgba(212,176,122,0.62)" : i === 1 ? "rgba(198,158,102,0.78)" : "rgba(184,142,88,0.9)";
      ctx.fill();
      // shadow side + crest
      ctx.save();
      ctx.clip();
      const sg = ctx.createLinearGradient(0, yy - 4, 0, yy + 12);
      sg.addColorStop(0, "rgba(110,74,40,0)");
      sg.addColorStop(1, "rgba(110,74,40," + (0.10 + i * 0.05) + ")");
      ctx.fillStyle = sg;
      ctx.fillRect(-54, yy - 6, 108, 20);
      ctx.restore();
      ctx.beginPath();
      for (let x = -52; x <= 52; x += 8) {
        const ly = yy - Math.sin(x * 0.05 + i) * 2.4;
        if (x === -52) ctx.moveTo(x, ly); else ctx.lineTo(x, ly);
      }
      ctx.strokeStyle = "rgba(240,204,152,0.4)"; ctx.lineWidth = 0.3; ctx.stroke();
    }
    // Jade Gate / rammed-earth frontier gate
    ctx.fillStyle = "rgba(190,158,112,0.97)";
    ctx.fillRect(-16, -30, 24, 18);
    ctx.strokeStyle = "rgba(74,54,30,0.55)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(-16, -30, 24, 18);
    for (let yy = -28; yy < -13; yy += 2.0) {
      ctx.beginPath(); ctx.moveTo(-16, yy); ctx.lineTo(8, yy);
      ctx.strokeStyle = "rgba(74,54,30,0.16)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // crenellations
    for (let x = -15; x < 7; x += 2.2) {
      ctx.fillStyle = "rgba(200,168,124,0.98)";
      ctx.fillRect(x, -31.6, 1.3, 2.2);
      ctx.strokeStyle = "rgba(74,54,30,0.35)"; ctx.lineWidth = 0.12;
      ctx.strokeRect(x, -31.6, 1.3, 2.2);
    }
    // gate opening with wooden beams
    ctx.beginPath();
    ctx.moveTo(-8, -12); ctx.lineTo(-8, -20); ctx.quadraticCurveTo(-4, -24, 0, -20); ctx.lineTo(0, -12);
    ctx.closePath(); ctx.fillStyle = "rgba(58,40,24,0.8)"; ctx.fill();
    ctx.strokeStyle = "rgba(96,64,36,0.7)"; ctx.lineWidth = 0.2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-7.4, -13 - i * 2.4); ctx.lineTo(-0.6, -13 - i * 2.4); ctx.stroke(); }
    // iron studs
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(-6.4 + i * 1.9, -15, 0.28, 0, TAU);
      ctx.fillStyle = "rgba(58,40,24,0.8)"; ctx.fill();
    }
    // wall courses on the wings
    for (let yy = -22; yy < -18; yy += 1.4) {
      ctx.beginPath(); ctx.moveTo(-50, yy); ctx.lineTo(50, yy);
      ctx.strokeStyle = "rgba(74,54,30,0.12)"; ctx.lineWidth = 0.1; ctx.stroke();
    }
    // banner on the gate
    ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(6, -30); ctx.lineTo(6, -38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6.2, -37.4); ctx.lineTo(10.4, -35.4); ctx.lineTo(6.2, -33.4); ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.95)"; ctx.fill();
    // beacon smoke
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.22 + i * 0.3) % 1;
      ctx.beginPath(); ctx.arc(24.5 + q * 4, -43 - q * 10, 1.2 + q * 2.6, 0, TAU);
      ctx.fillStyle = "rgba(150,130,100," + (0.18 * (1 - q)) + ")"; ctx.fill();
    }
    // corner watchtower
    ctx.fillStyle = "rgba(196,162,116,0.98)";
    ctx.fillRect(-19, -38, 6, 20);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.22; ctx.strokeRect(-19, -38, 6, 20);
    ctx.beginPath(); ctx.moveTo(-20.4, -38); ctx.lineTo(-16, -42.4); ctx.lineTo(-11.6, -38); ctx.closePath();
    ctx.fillStyle = "rgba(132,78,50,0.95)"; ctx.fill();
    // wall wings
    ctx.fillStyle = "rgba(184,150,106,0.9)";
    ctx.fillRect(-50, -24, 34, 6);
    ctx.fillRect(8, -24, 42, 6);
    ctx.strokeStyle = "rgba(74,50,30,0.35)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(-50, -24, 34, 6); ctx.strokeRect(8, -24, 42, 6);
    // beacon tower
    ctx.fillStyle = "rgba(196,162,116,0.98)";
    ctx.fillRect(22, -38, 5, 14);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.2; ctx.strokeRect(22, -38, 5, 14);
    ctx.beginPath(); ctx.moveTo(20.8, -38); ctx.lineTo(24.5, -42); ctx.lineTo(28.2, -38); ctx.closePath();
    ctx.fillStyle = "rgba(132,78,50,0.95)"; ctx.fill();
    // caravan
    const caravan = [
      { x: -34, s: 0.68, load: true },
      { x: -16, s: 0.74, load: true },
      { x: 3, s: 0.76, load: true },
      { x: 21, s: 0.70, load: false },
      { x: 37, s: 0.64, load: true },
    ];
    caravan.forEach((c, i) => {
      ctx.beginPath(); ctx.ellipse(c.x, -8 + (i % 2) * 0.8, 8 * c.s, 1.4, 0, 0, TAU);
      ctx.fillStyle = "rgba(92,62,32,0.16)"; ctx.fill();
      camel(ctx, c.x, -8 + (i % 2) * 0.8, c.s, "rgba(118,90,56,0.96)", t + i * 0.4);
      if (c.load) {
        ctx.fillStyle = "rgba(176,64,44,0.9)";
        ctx.fillRect(c.x - 1.4, -12.2, 2.8, 2.0);
        ctx.fillStyle = "rgba(196,150,78,0.9)";
        ctx.fillRect(c.x + 1.2, -12.0, 2.2, 1.7);
        ctx.strokeStyle = "rgba(84,54,30,0.45)"; ctx.lineWidth = 0.12;
        ctx.strokeRect(c.x - 1.4, -12.2, 2.8, 2.0);
      }
    });
    // camel driver
    person(ctx, -42, -5.6, 0.36, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(150,112,74,0.95)", hat: "straw", staff: true });
    // Zhang Qian / envoy with Han banner
    person(ctx, -38, -6, 0.40, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(168,64,44,0.95)", hat: "cap", staff: true });
    ctx.strokeStyle = "rgba(58,40,24,0.9)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-36, -12); ctx.lineTo(-36, -30); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-35.8, -29.4); ctx.lineTo(-28.4, -26.4); ctx.lineTo(-35.8, -22.8); ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.95)"; ctx.fill();
    // pack horse
    horse(ctx, 32, -6.4, 0.42, "rgba(96,72,48,0.97)", t + 0.7, {});
    // guards
    for (let i = 0; i < 2; i++) {
      person(ctx, -46 + i * 4.4, -5, 0.32, "rgba(58,42,26,0.98)", { phase: t + i + 2, fill: "rgba(84,104,112,0.95)", hat: "helmet", spear: true });
    }
    // distant stupa
    ctx.fillStyle = "rgba(190,158,112,0.8)";
    ctx.fillRect(-46, -34, 2.2, 4.2);
    ctx.beginPath(); ctx.arc(-44.9, -34.4, 1.8, Math.PI, TAU); ctx.fill();
    // sand / silk foreground
    for (let i = 0; i < 12; i++) {
      const yy = -2 + i * 0.4;
      ctx.strokeStyle = "rgba(238,204,152,0.3)"; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.moveTo(-50, yy); ctx.quadraticCurveTo(0, yy - 1.0, 50, yy); ctx.stroke();
    }
    ctx.save();
    ctx.translate(36, -2.4);
    ctx.rotate(-0.3);
    ctx.fillStyle = "rgba(168,64,44,0.9)";
    ctx.fillRect(-4, -1.2, 8, 2.2);
    ctx.fillStyle = "rgba(196,150,78,0.85)";
    ctx.fillRect(-4, 0.6, 8, 1.0);
    ctx.strokeStyle = "rgba(84,54,30,0.4)"; ctx.lineWidth = 0.12;
    ctx.strokeRect(-4, -1.2, 8, 2.2);
    ctx.restore();
    // birds
    bird(ctx, -8, -74, 1.3, "rgba(67,48,29,0.35)");
    bird(ctx, 0, -78, 0.9, "rgba(67,48,29,0.3)");
  };

  const silkMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#c1a06c", 0.4);
    // dunes
    for (let i = 0; i < 2; i++) {
      const yy = -16 + i * 5;
      ctx.beginPath(); ctx.moveTo(-60, yy + 10);
      for (let x = -58; x <= 58; x += 9) ctx.lineTo(x, yy - Math.sin(x * 0.05 + i) * 2);
      ctx.lineTo(60, yy + 10); ctx.closePath();
      ctx.fillStyle = i ? "rgba(190,150,96,0.8)" : "rgba(210,174,120,0.6)"; ctx.fill();
    }
    // gate
    ctx.fillStyle = "rgba(190,158,112,0.97)"; ctx.fillRect(-24, -20, 26, 13);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.5; ctx.strokeRect(-24, -20, 26, 13);
    ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(-14, -13); ctx.lineTo(-8, -13); ctx.lineTo(-8, -20); ctx.closePath();
    ctx.fillStyle = "rgba(58,40,24,0.8)"; ctx.fill();
    // caravan
    for (let i = 0; i < 3; i++) {
      camel(ctx, -4 + i * 15, -5 + (i % 2) * 0.6, 0.62, "rgba(118,90,56,0.96)", t + i * 0.4);
      ctx.fillStyle = "rgba(176,64,44,0.9)";
      ctx.fillRect(-5.4 + i * 15, -10.6, 2.8, 2.0);
      ctx.fillStyle = "rgba(196,150,78,0.9)";
      ctx.fillRect(-2.8 + i * 15, -10.4, 2.2, 1.7);
    }
    person(ctx, -40, -4, 0.6, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(168,64,44,0.95)", hat: "cap", staff: true });
    // banner
    ctx.strokeStyle = "rgba(58,40,24,0.9)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-37, -8); ctx.lineTo(-37, -28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-36.6, -27); ctx.lineTo(-28, -23); ctx.lineTo(-36.6, -19); ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.95)"; ctx.fill();
    bird(ctx, 40, -40, 1.6, "rgba(67,48,29,0.35)");
  };

  /* ── 2B motifs: ger, mud mosque, baobab, Borobudur, Aztec pyramid, waka ── */
  function ger(ctx, x, baseY, s, col) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 0.2, 7.4, 1.4, 0, 0, TAU);
    ctx.fillStyle = "rgba(92,62,32,0.16)"; ctx.fill();
    // felt wall, barrel-shaped in plan
    ctx.beginPath();
    ctx.moveTo(-5.4, 0);
    ctx.quadraticCurveTo(-5.8, -2.6, -5.2, -4.8);
    ctx.lineTo(5.2, -4.8);
    ctx.quadraticCurveTo(5.8, -2.6, 5.4, 0);
    ctx.closePath();
    ctx.fillStyle = col || "rgba(234,226,208,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.6)"; ctx.lineWidth = 0.3; ctx.stroke();
    // roof: shallow cone with slightly concave sides
    ctx.beginPath();
    ctx.moveTo(-6.2, -4.8);
    ctx.quadraticCurveTo(-3.4, -6.6, 0, -8.6);
    ctx.quadraticCurveTo(3.4, -6.6, 6.2, -4.8);
    ctx.closePath();
    ctx.fillStyle = "rgba(214,204,184,0.98)"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6.2, -4.8); ctx.lineTo(6.2, -4.8);
    ctx.strokeStyle = "rgba(110,86,56,0.7)"; ctx.lineWidth = 0.4; ctx.stroke();
    // door
    ctx.fillStyle = "rgba(92,58,36,0.9)";
    ctx.beginPath();
    ctx.moveTo(-1.3, 0); ctx.lineTo(-1.3, -2.9);
    ctx.quadraticCurveTo(0, -3.7, 1.3, -2.9);
    ctx.lineTo(1.3, 0); ctx.closePath(); ctx.fill();
    // khana lattice
    ctx.strokeStyle = "rgba(120,96,64,0.45)"; ctx.lineWidth = 0.18;
    for (let i = -4; i <= 4; i += 2) {
      ctx.beginPath(); ctx.moveTo(i, -4.6); ctx.lineTo(i + 1.2, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, -4.6); ctx.lineTo(i - 1.2, 0); ctx.stroke();
    }
    // rope bands
    ctx.strokeStyle = "rgba(120,96,64,0.6)"; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(-5.4, -2.0); ctx.lineTo(5.4, -2.0); ctx.stroke();
    // crown ring
    ctx.beginPath(); ctx.ellipse(0, -8.6, 0.9, 0.35, 0, 0, TAU);
    ctx.fillStyle = "rgba(176,138,62,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.6)"; ctx.lineWidth = 0.2; ctx.stroke();
    // smoke
    const q = (((baseY * 0.1 + x * 0.01) % 1) + 1) % 1;
    ctx.beginPath(); ctx.arc(1.2, -10 - q * 6, 0.7 + q * 1.6, 0, TAU);
    ctx.fillStyle = "rgba(150,130,100," + (0.16 * (1 - q)) + ")"; ctx.fill();
    ctx.restore();
  }

  function mudMosque(ctx, x, baseY, w, h) {
    // contact shadow
    ctx.beginPath();
    ctx.ellipse(x + w * 0.03, baseY + 0.3, w * 0.62, 2.2, 0, 0, TAU);
    ctx.fillStyle = "rgba(94,60,32,0.18)"; ctx.fill();
    // body
    ctx.fillStyle = "rgba(178,116,72,0.98)";
    ctx.fillRect(x - w / 2, baseY - h * 0.72, w, h * 0.72);
    ctx.strokeStyle = "rgba(74,50,30,0.55)"; ctx.lineWidth = 0.32;
    ctx.strokeRect(x - w / 2, baseY - h * 0.72, w, h * 0.72);
    // torons (wooden beams)
    for (let r = 0; r < 4; r++) {
      const yy = baseY - h * 0.60 + r * h * 0.16;
      for (let c = 0; c < 8; c++) {
        const xx = x - w * 0.44 + c * w * 0.125;
        ctx.strokeStyle = "rgba(96,62,36,0.75)"; ctx.lineWidth = 0.35;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 1.6, yy - 0.2); ctx.stroke();
      }
    }
    // central tower
    ctx.fillStyle = "rgba(166,104,64,0.98)";
    ctx.beginPath();
    ctx.moveTo(x - w * 0.12, baseY);
    ctx.lineTo(x - w * 0.09, baseY - h * 1.05);
    ctx.lineTo(x + w * 0.09, baseY - h * 1.05);
    ctx.lineTo(x + w * 0.12, baseY);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let r = 0; r < 4; r++) {
      const yy = baseY - h * 0.18 - r * h * 0.20;
      for (let c = -1; c <= 1; c += 2) {
        ctx.strokeStyle = "rgba(96,62,36,0.8)"; ctx.lineWidth = 0.32;
        ctx.beginPath(); ctx.moveTo(x + c * w * 0.08, yy); ctx.lineTo(x + c * w * 0.13, yy - 0.3); ctx.stroke();
      }
    }
    // tower cap
    ctx.beginPath(); ctx.arc(x, baseY - h * 1.05, w * 0.055, Math.PI, TAU);
    ctx.fillStyle = "rgba(196,150,78,0.95)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, baseY - h * 1.05 - w * 0.055); ctx.lineTo(x, baseY - h * 1.05 - w * 0.11);
    ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.3; ctx.stroke();
    // side towers
    for (const sx of [-1, 1]) {
      const tx = x + sx * w * 0.40;
      ctx.fillStyle = "rgba(170,108,66,0.98)";
      ctx.beginPath();
      ctx.moveTo(tx - w * 0.045, baseY);
      ctx.lineTo(tx - w * 0.035, baseY - h * 0.88);
      ctx.lineTo(tx + w * 0.035, baseY - h * 0.88);
      ctx.lineTo(tx + w * 0.045, baseY);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, baseY - h * 0.88, w * 0.04, Math.PI, TAU);
      ctx.fillStyle = "rgba(196,150,78,0.95)"; ctx.fill();
    }
    // arches
    for (let i = -1; i <= 1; i++) {
      const ax = x + i * w * 0.24;
      ctx.beginPath();
      ctx.moveTo(ax - w * 0.045, baseY);
      ctx.lineTo(ax - w * 0.045, baseY - h * 0.26);
      ctx.quadraticCurveTo(ax, baseY - h * 0.36, ax + w * 0.045, baseY - h * 0.26);
      ctx.lineTo(ax + w * 0.045, baseY);
      ctx.closePath();
      ctx.fillStyle = "rgba(74,50,30,0.7)"; ctx.fill();
    }
    // parapet
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = "rgba(190,128,82,0.95)";
      ctx.fillRect(x - w * 0.5 + i * w * 0.115, baseY - h * 0.78, w * 0.055, h * 0.06);
    }
  }

  function baobab(ctx, x, baseY, h, col) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.strokeStyle = col || "rgba(86,68,42,0.95)";
    ctx.fillStyle = "rgba(108,84,50,0.95)";
    // bottle trunk
    ctx.beginPath();
    ctx.moveTo(-4.6, 0);
    ctx.quadraticCurveTo(-5.8, -h * 0.35, -2.2, -h * 0.55);
    ctx.lineTo(2.2, -h * 0.55);
    ctx.quadraticCurveTo(5.8, -h * 0.35, 4.6, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.3; ctx.stroke();
    // branches
    ctx.strokeStyle = col || "rgba(86,68,42,0.95)"; ctx.lineWidth = 0.9;
    for (const a of [-0.9, -0.4, 0.2, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.55);
      ctx.quadraticCurveTo(Math.sin(a) * h * 0.2, -h * 0.72, Math.sin(a) * h * 0.34, -h * 0.82);
      ctx.stroke();
    }
    // sparse canopy
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse((i - 2) * h * 0.09, -h * 0.84 - (i % 2) * h * 0.04, h * 0.10, h * 0.055, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(112,124,76,0.75)"; ctx.fill();
    }
    ctx.restore();
  }

  function bellStupa(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // square plinth
    ctx.fillStyle = "rgba(150,146,128,0.95)";
    ctx.fillRect(-3.6, -1.0, 7.2, 1.0);
    ctx.strokeStyle = "rgba(74,66,52,0.5)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(-3.6, -1.0, 7.2, 1.0);
    // bell body
    ctx.beginPath();
    ctx.moveTo(-3.1, -1.0);
    ctx.quadraticCurveTo(-3.1, -4.2, 0, -5.1);
    ctx.quadraticCurveTo(3.1, -4.2, 3.1, -1.0);
    ctx.closePath();
    ctx.fillStyle = col || "rgba(176,170,150,0.98)"; ctx.fill();
    // right side turns away from the light
    const bs = ctx.createLinearGradient(-3.1, 0, 3.2, 0);
    bs.addColorStop(0, "rgba(74,66,52,0)");
    bs.addColorStop(1, "rgba(74,66,52,0.24)");
    ctx.fillStyle = bs; ctx.fill();
    ctx.strokeStyle = "rgba(74,66,52,0.55)"; ctx.lineWidth = 0.22; ctx.stroke();
    // perforated diamond lattice
    ctx.fillStyle = "rgba(84,76,60,0.30)";
    for (let r = 0; r < 3; r++) {
      for (let c = -1; c <= 1; c++) {
        const dx = c * 1.45 + (r % 2 ? 0.72 : 0);
        const dy = -1.7 - r * 1.05;
        if (Math.abs(dx) > 2.3) continue;
        ctx.beginPath(); ctx.arc(dx, dy, 0.16, 0, TAU); ctx.fill();
      }
    }
    // crowning ring + spire
    ctx.beginPath(); ctx.ellipse(0, -5.0, 0.9, 0.35, 0, 0, TAU);
    ctx.fillStyle = "rgba(150,146,128,0.95)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -5.2); ctx.lineTo(0, -7.2);
    ctx.strokeStyle = "rgba(74,66,52,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -7.4, 0.55, 0.18, 0, 0, TAU);
    ctx.fillStyle = "rgba(150,146,128,0.95)"; ctx.fill();
    ctx.restore();
  }

  function borobudur(ctx, x, baseY, w, h) {
    // soft cast shadow under the whole platform
    ctx.beginPath();
    ctx.ellipse(x + w * 0.04, baseY + 0.2, w * 0.66, 2.4, 0, 0, TAU);
    ctx.fillStyle = "rgba(74,58,38,0.16)"; ctx.fill();
    // base platform
    ctx.fillStyle = "rgba(150,146,128,0.98)";
    ctx.fillRect(x - w * 0.58, baseY - 4.4, w * 1.16, 4.4);
    ctx.strokeStyle = "rgba(70,64,50,0.5)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(x - w * 0.58, baseY - 4.4, w * 1.16, 4.4);
    ctx.fillStyle = "rgba(150,146,128,0.98)";
    ctx.fillRect(x - w / 2, baseY - 3.2, w, 3.2);
    ctx.strokeStyle = "rgba(70,64,50,0.5)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(x - w / 2, baseY - 3.2, w, 3.2);
    // square terraces
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const tw = w * (0.86 - i * 0.10);
      const th = h / tiers * 0.82;
      const ty = baseY - 3.2 - (i + 1) * th;
      ctx.fillStyle = i % 2 ? "rgba(160,156,138,0.98)" : "rgba(172,168,150,0.98)";
      ctx.fillRect(x - tw / 2, ty, tw, th);
      ctx.strokeRect(x - tw / 2, ty, tw, th);
      hatch(ctx, x - tw / 2, ty, tw, th, "rgba(74,66,52,0.10)", 1.4, -0.4);
      // right-hand terraces fall away from the light (upper-left)
      const sg = ctx.createLinearGradient(x + tw * 0.16, 0, x + tw / 2, 0);
      sg.addColorStop(0, "rgba(74,66,52,0)");
      sg.addColorStop(1, "rgba(74,66,52,0.17)");
      ctx.fillStyle = sg;
      ctx.fillRect(x + tw * 0.16, ty, tw * 0.34, th);
      // relief bands
      ctx.strokeStyle = "rgba(74,66,52,0.28)"; ctx.lineWidth = 0.14;
      for (let yy = ty + 1.2; yy < ty + th; yy += 1.2) {
        ctx.beginPath(); ctx.moveTo(x - tw / 2 + 0.8, yy); ctx.lineTo(x + tw / 2 - 0.8, yy); ctx.stroke();
      }
      // arched Buddha niches along the front
      const bay = tw * 0.16;
      for (let k = -2; k <= 2; k++) {
        const nx = x + k * bay;
        const ny = ty + th * 0.60;
        ctx.beginPath();
        ctx.moveTo(nx - 0.62, ny + 0.9);
        ctx.lineTo(nx - 0.62, ny - 0.15);
        ctx.quadraticCurveTo(nx, ny - 1.15, nx + 0.62, ny - 0.15);
        ctx.lineTo(nx + 0.62, ny + 0.9);
        ctx.closePath();
        ctx.fillStyle = "rgba(82,74,58,0.5)"; ctx.fill();
        ctx.strokeStyle = "rgba(232,226,206,0.42)"; ctx.lineWidth = 0.15; ctx.stroke();
      }
      // bas-relief panels between the niches
      if (i < 4) {
        ctx.fillStyle = "rgba(88,80,64,0.20)";
        for (let k = 0; k < 4; k++) {
          const px = x - bay * 1.5 + k * bay * 1.0;
          ctx.fillRect(px - bay * 0.28, ty + th * 0.16, bay * 0.56, th * 0.20);
        }
      }
    }
    const topY = baseY - 3.2 - tiers * (h / tiers * 0.82);
    // central stair (the circular terraces sit over its head)
    ctx.fillStyle = "rgba(186,182,162,0.98)";
    ctx.beginPath();
    ctx.moveTo(x - 1.8, baseY);
    ctx.lineTo(x - 1.1, topY);
    ctx.lineTo(x + 1.1, topY);
    ctx.lineTo(x + 1.8, baseY);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(70,64,50,0.4)"; ctx.lineWidth = 0.2; ctx.stroke();
    for (let yy = baseY - 1.6; yy > topY; yy -= 1.6) {
      ctx.beginPath(); ctx.moveTo(x - 1.5, yy); ctx.lineTo(x + 1.5, yy);
      ctx.strokeStyle = "rgba(70,64,50,0.25)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // circular terraces: drums first, then the dome, then stupas back-to-front
    const rings = [];
    for (let ring = 0; ring < 3; ring++) {
      const rw = w * (0.175 - ring * 0.02);
      const ry = topY - ring * 2.6;
      // drum side
      ctx.fillStyle = "rgba(136,132,114,0.98)";
      ctx.beginPath(); ctx.ellipse(x, ry + 2.2, rw, 1.5, 0, 0, TAU); ctx.fill();
      ctx.fillRect(x - rw, ry - 0.2, rw * 2, 2.4);
      ctx.strokeStyle = "rgba(70,64,50,0.32)"; ctx.lineWidth = 0.14;
      for (let k = 1; k < 5; k++) {
        const yy = ry + 2.2 * (k / 5);
        ctx.beginPath(); ctx.moveTo(x - rw + 0.4, yy); ctx.lineTo(x + rw - 0.4, yy); ctx.stroke();
      }
      // top face
      ctx.beginPath(); ctx.ellipse(x, ry, rw, 1.8, 0, 0, TAU);
      ctx.fillStyle = "rgba(166,162,144,0.98)"; ctx.fill();
      ctx.strokeStyle = "rgba(70,64,50,0.45)"; ctx.lineWidth = 0.25; ctx.stroke();
      rings.push({ rw, ry });
    }
    // central dome on a drum, seated on the top ring
    const domeBase = topY - 5.2;
    ctx.fillStyle = "rgba(170,166,146,0.98)";
    ctx.fillRect(x - w * 0.07, domeBase - 2.0, w * 0.14, 2.0);
    ctx.strokeStyle = "rgba(70,64,50,0.45)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(x - w * 0.07, domeBase - 2.0, w * 0.14, 2.0);
    ctx.beginPath(); ctx.arc(x, domeBase - 2.0, w * 0.06, Math.PI, TAU);
    ctx.fillStyle = "rgba(160,156,136,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(70,64,50,0.5)"; ctx.lineWidth = 0.22; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, domeBase - 2.0 - w * 0.06); ctx.lineTo(x, domeBase - 4.0 - w * 0.07);
    ctx.strokeStyle = "rgba(70,64,50,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
    for (let ri = rings.length - 1; ri >= 0; ri--) {
      const R = rings[ri];
      const n = 5 + ri;
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + 0.4;
        const d = Math.sin(a);
        if (d < 0.16) continue; // only the front arc is visible
        pts.push({ sx: x + Math.cos(a) * R.rw * 0.70, sy: R.ry + d * 1.0 - 0.1, d });
      }
      pts.sort((p, q) => p.d - q.d);
      for (const p of pts) bellStupa(ctx, p.sx, p.sy, 0.6, "rgba(168,164,144,0.98)");
    }
  }

  function aztecPyramid(ctx, x, baseY, w, h) {
    // stepped pyramid, 4 tiers, twin stairs + twin temples
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
      const tw = w * (1 - i * 0.18);
      const th = h / tiers;
      ctx.fillStyle = i % 2 ? "rgba(196,158,116,0.98)" : "rgba(210,174,130,0.98)";
      ctx.fillRect(x - tw / 2, baseY - (i + 1) * th, tw, th);
      ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.28;
      ctx.strokeRect(x - tw / 2, baseY - (i + 1) * th, tw, th);
      // stone joints
      for (let xx = x - tw / 2 + 2; xx < x + tw / 2; xx += 4) {
        ctx.beginPath(); ctx.moveTo(xx, baseY - (i + 1) * th); ctx.lineTo(xx, baseY - i * th);
        ctx.strokeStyle = "rgba(74,50,30,0.16)"; ctx.lineWidth = 0.12; ctx.stroke();
      }
    }
    const topY = baseY - h;
    // twin stairs
    for (const sx of [-1, 1]) {
      const sxx = x + sx * w * 0.12;
      ctx.fillStyle = "rgba(214,178,134,0.98)";
      ctx.beginPath();
      ctx.moveTo(sxx - 2.0, baseY);
      ctx.lineTo(sxx - 1.2, topY);
      ctx.lineTo(sxx + 1.2, topY);
      ctx.lineTo(sxx + 2.0, baseY);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(74,50,30,0.4)"; ctx.lineWidth = 0.2; ctx.stroke();
      for (let yy = baseY - 1.4; yy > topY; yy -= 1.4) {
        ctx.beginPath(); ctx.moveTo(sxx - 1.8, yy); ctx.lineTo(sxx + 1.8, yy);
        ctx.strokeStyle = "rgba(74,50,30,0.25)"; ctx.lineWidth = 0.1; ctx.stroke();
      }
    }
    // twin temples
    for (const sx of [-1, 1]) {
      const tx = x + sx * w * 0.16;
      ctx.fillStyle = "rgba(176,64,44,0.92)";
      ctx.fillRect(tx - 4.4, topY - 8.4, 8.8, 8.4);
      ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.22;
      ctx.strokeRect(tx - 4.4, topY - 8.4, 8.8, 8.4);
      // roof comb
      ctx.beginPath();
      ctx.moveTo(tx - 5.2, topY - 8.4);
      ctx.lineTo(tx, topY - 12.4);
      ctx.lineTo(tx + 5.2, topY - 8.4);
      ctx.closePath();
      ctx.fillStyle = "rgba(150,84,52,0.95)"; ctx.fill(); ctx.stroke();
      // door
      ctx.beginPath(); ctx.arc(tx, topY - 5.0, 1.6, Math.PI, TAU);
      ctx.lineTo(tx + 1.6, topY - 3.0); ctx.lineTo(tx - 1.6, topY - 3.0); ctx.closePath();
      ctx.fillStyle = "rgba(58,38,24,0.8)"; ctx.fill();
    }
    // banners
    for (const bx of [-w * 0.45, w * 0.45]) {
      ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.moveTo(x + bx, baseY); ctx.lineTo(x + bx, topY - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + bx + 0.2, topY - 1.4); ctx.lineTo(x + bx + 3.4, topY - 3.2); ctx.lineTo(x + bx + 0.2, topY - 5.0); ctx.closePath();
      ctx.fillStyle = "rgba(176,64,44,0.9)"; ctx.fill();
    }
  }

  function waka(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const bob = Math.sin(t * 0.9) * 0.6;
    ctx.translate(0, bob);
    // second hull behind
    ctx.beginPath();
    ctx.moveTo(-26, -7);
    ctx.quadraticCurveTo(-10, -4.4, 20, -6.4);
    ctx.quadraticCurveTo(26, -7.2, 30, -9.4);
    ctx.quadraticCurveTo(4, -8.4, -24, -9.4);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,84,50,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.4; ctx.stroke();
    // deck platform
    ctx.fillStyle = "rgba(168,128,80,0.95)";
    ctx.fillRect(-20, -8.2, 40, 2.2);
    ctx.strokeStyle = "rgba(58,40,24,0.6)"; ctx.lineWidth = 0.25;
    ctx.strokeRect(-20, -8.2, 40, 2.2);
    // main hull
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.quadraticCurveTo(-10, 5.2, 18, 3.6);
    ctx.quadraticCurveTo(28, 2.8, 34, -2.2);
    ctx.lineTo(30, -6.4);
    ctx.quadraticCurveTo(0, -4.6, -28, -5.4);
    ctx.closePath();
    ctx.fillStyle = o.hull || "rgba(128,88,52,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,40,24,0.9)"; ctx.lineWidth = 0.5; ctx.stroke();
    // carved prow spiral
    ctx.beginPath();
    ctx.arc(34, -4.4, 2.2, -1.2, 2.6);
    ctx.strokeStyle = "rgba(196,150,78,0.85)"; ctx.lineWidth = 0.5; ctx.stroke();
    // hull planking
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-26, -3.4 + i * 1.8);
      ctx.quadraticCurveTo(0, -1.8 + i * 1.8, 30, -3.2 + i * 1.8);
      ctx.strokeStyle = "rgba(74,50,30,0.3)"; ctx.lineWidth = 0.18; ctx.stroke();
    }
    // mast + crab-claw sail (luff on the mast, clew swung aft)
    ctx.strokeStyle = "rgba(74,50,30,0.95)"; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -36); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.6, -36);
    ctx.quadraticCurveTo(15, -35, 24, -24);
    ctx.quadraticCurveTo(16.5, -21, 8, -13);
    ctx.quadraticCurveTo(4, -11.5, 1.4, -9.4);
    ctx.closePath();
    ctx.fillStyle = o.sail || "rgba(214,186,140,0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(92,64,36,0.6)"; ctx.lineWidth = 0.25; ctx.stroke();
    // battens parallel to the foot
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(1.2 + i * 1.4, -9.6);
      ctx.quadraticCurveTo(12 + i * 1.6, -18 - i * 1.2, 23 - i * 0.6, -22.5 - i * 1.2);
      ctx.strokeStyle = "rgba(92,64,36,0.28)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    // paddlers, staggered along the deck
    const crew = [
      [-18.0, -8.3, 0.21, "rgba(112,88,58,0.95)"],
      [-12.6, -8.5, 0.19, "rgba(168,64,44,0.9)"],
      [-7.6, -8.0, 0.18, "rgba(112,88,58,0.95)"],
      [-2.6, -8.5, 0.22, "rgba(72,86,118,0.95)"],
      [2.8, -8.2, 0.19, "rgba(112,88,58,0.95)"],
      [8.2, -8.6, 0.17, "rgba(168,64,44,0.9)"],
      [13.6, -8.3, 0.19, "rgba(112,88,58,0.95)"],
    ];
    crew.forEach(([px, py, ps, pc], i) => {
      person(ctx, px, py, ps, "rgba(58,42,26,0.98)", {
        phase: t * 1.4 + i, fill: pc, hat: i % 2 ? "straw" : null, noShadow: true,
      });
      ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(px + 0.6, py - 1.6); ctx.lineTo(px + 1.9 + (i % 3) * 0.5, py + 4.2); ctx.stroke();
    });
    // steersman
    person(ctx, -26, -8.4, 0.24, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(84,104,112,0.95)", noShadow: true });
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-27, -6); ctx.lineTo(-34, 4); ctx.stroke();
    // wake
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(238,244,230," + (0.24 - i * 0.04) + ")"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-32 - i * 2, -1 + i * 1.2); ctx.quadraticCurveTo(-20, 2 + i * 1.2, -8, -0.4 + i * 1.2); ctx.stroke();
    }
    ctx.restore();
  }

  function canoe(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, 3, 10, 0.4);
    ctx.quadraticCurveTo(1, 1.8, -9, 0); ctx.closePath();
    ctx.fillStyle = "rgba(112,76,44,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,40,24,0.7)"; ctx.lineWidth = 0.28; ctx.stroke();
    person(ctx, -2, -0.4, 0.18, "rgba(58,42,26,0.96)", { phase: t, fill: "rgba(150,112,74,0.95)", noShadow: true });
    person(ctx, 3.4, -0.4, 0.18, "rgba(58,42,26,0.96)", { phase: t + 1, fill: "rgba(112,88,58,0.95)", noShadow: true });
    ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(-1.2, -2.4); ctx.lineTo(-4, 2.4); ctx.moveTo(4.2, -2.4); ctx.lineTo(7, 2.4); ctx.stroke();
    ctx.restore();
  }

  /* ── 2C brushes: press, type case, gopuram, fortress,
        steam locomotive, 1991 workstation, network globe ── */
  function printingPress(ctx, x, baseY, s, t) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    const oak = "rgba(104,70,42,0.98)";
    const oak2 = "rgba(132,92,56,0.98)";
    // base rails
    ctx.fillStyle = "rgba(84,56,34,0.98)";
    ctx.fillRect(-8.6, -1.8, 17.2, 1.8);
    ctx.strokeStyle = "rgba(52,34,20,0.7)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(-8.6, -1.8, 17.2, 1.8);
    // coffin / bed with forme
    ctx.fillStyle = oak2;
    ctx.fillRect(-6.4, -4.4, 12.8, 2.2);
    ctx.strokeRect(-6.4, -4.4, 12.8, 2.2);
    ctx.fillStyle = "rgba(238,228,206,0.95)";
    ctx.fillRect(-5.2, -5.6, 8.6, 1.2);
    ctx.strokeStyle = "rgba(92,64,36,0.4)"; ctx.lineWidth = 0.14;
    ctx.strokeRect(-5.2, -5.6, 8.6, 1.2);
    // posts
    ctx.fillStyle = oak;
    ctx.fillRect(-7.2, -19.2, 1.9, 19.2);
    ctx.fillRect(5.3, -19.2, 1.9, 19.2);
    ctx.strokeStyle = "rgba(52,34,20,0.6)"; ctx.lineWidth = 0.24;
    ctx.strokeRect(-7.2, -19.2, 1.9, 19.2);
    ctx.strokeRect(5.3, -19.2, 1.9, 19.2);
    // head beam + cap
    ctx.fillStyle = oak;
    ctx.fillRect(-8.6, -21.2, 17.2, 2.2);
    ctx.strokeRect(-8.6, -21.2, 17.2, 2.2);
    ctx.fillStyle = "rgba(84,56,34,0.98)";
    ctx.fillRect(-9.2, -22.6, 18.4, 1.4);
    // mid beam
    ctx.fillStyle = oak;
    ctx.fillRect(-7.8, -13.0, 15.6, 1.5);
    ctx.strokeRect(-7.8, -13.0, 15.6, 1.5);
    // screw
    ctx.fillStyle = "rgba(76,56,38,0.98)";
    ctx.fillRect(-1.0, -20.8, 2.0, 12.6);
    ctx.strokeStyle = "rgba(40,28,18,0.7)"; ctx.lineWidth = 0.18;
    ctx.strokeRect(-1.0, -20.8, 2.0, 12.6);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); ctx.moveTo(-1.0, -20.0 + i * 1.3); ctx.lineTo(1.0, -20.6 + i * 1.3);
      ctx.strokeStyle = "rgba(222,196,152,0.35)"; ctx.lineWidth = 0.14; ctx.stroke();
    }
    // bar / handle
    ctx.strokeStyle = "rgba(62,42,24,0.98)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-7.6, -18.7); ctx.lineTo(7.6, -18.7); ctx.stroke();
    ctx.fillStyle = "rgba(120,82,48,0.98)";
    ctx.beginPath(); ctx.arc(-7.8, -18.7, 0.75, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(7.8, -18.7, 0.75, 0, TAU); ctx.fill();
    // platen
    ctx.fillStyle = "rgba(92,62,38,0.98)";
    ctx.fillRect(-4.6, -9.2, 9.2, 1.8);
    ctx.strokeStyle = "rgba(50,32,20,0.7)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(-4.6, -9.2, 9.2, 1.8);
    // guide rods
    ctx.strokeStyle = "rgba(70,48,30,0.9)"; ctx.lineWidth = 0.32;
    ctx.beginPath(); ctx.moveTo(-4.2, -9.2); ctx.lineTo(-4.2, -13.0); ctx.moveTo(4.2, -9.2); ctx.lineTo(4.2, -13.0); ctx.stroke();
    // tympan frame leaning at the bed
    ctx.save();
    ctx.translate(-3.4, -5.4);
    ctx.rotate(-0.18);
    ctx.strokeStyle = "rgba(84,58,34,0.95)"; ctx.lineWidth = 0.45;
    ctx.strokeRect(-4.6, -5.4, 9.2, 5.4);
    ctx.fillStyle = "rgba(236,226,204,0.55)";
    ctx.fillRect(-4.2, -5.0, 8.4, 4.6);
    ctx.restore();
    // ink balls hanging on the left post
    ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(-6.4, -16.6); ctx.lineTo(-8.6, -14.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(-9.0, -13.2, 1.5, 0, TAU);
    ctx.fillStyle = "rgba(48,36,26,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(120,88,56,0.7)"; ctx.lineWidth = 0.18; ctx.stroke();
    // sheets on the rail at right
    ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.18;
    ctx.beginPath(); ctx.moveTo(7.2, -16.4); ctx.lineTo(10.4, -14.2); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(246,238,220,0.96)";
      ctx.save();
      ctx.translate(8.0 + i * 0.5, -15.0 + i * 0.6);
      ctx.rotate(0.18 + i * 0.04);
      ctx.fillRect(-1.4, 0, 2.8, 3.6);
      ctx.strokeStyle = "rgba(92,64,36,0.3)"; ctx.lineWidth = 0.1;
      ctx.strokeRect(-1.4, 0, 2.8, 3.6);
      ctx.restore();
    }
    // paper stack on the bed end
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "rgba(246,238,220,0.97)";
      ctx.fillRect(4.4, -6.0 - i * 0.45, 3.4, 0.45);
    }
    ctx.restore();
  }

  function typeCase(ctx, x, baseY, w, h, t) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(1, 1);
    ctx.rotate(-0.12);
    // case body
    ctx.fillStyle = "rgba(126,88,54,0.98)";
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = "rgba(56,38,22,0.75)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(-w / 2, -h, w, h);
    // compartments
    const cols = 6, rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cw = (w - 1.2) / cols, chh = (h - 1.0) / rows;
        const cx = -w / 2 + 0.6 + c * cw, cy = -h + 0.5 + r * chh;
        ctx.fillStyle = "rgba(92,62,38,0.9)";
        ctx.fillRect(cx, cy, cw - 0.24, chh - 0.24);
        // sorts
        const n = 3 + ((r * cols + c) % 3);
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = k % 2 ? "rgba(214,206,186,0.9)" : "rgba(190,182,162,0.9)";
          ctx.fillRect(cx + 0.25 + (k % 3) * (cw / 3.2), cy + 0.3 + Math.floor(k / 3) * 0.7, 0.5, 0.55);
        }
      }
    }
    // rim
    ctx.strokeStyle = "rgba(150,108,70,0.9)"; ctx.lineWidth = 0.5;
    ctx.strokeRect(-w / 2 + 0.25, -h + 0.25, w - 0.5, h - 0.5);
    ctx.restore();
  }

  function gopuram(ctx, x, baseY, w, h) {
    const tiers = 5;
    const th = h / tiers;
    for (let i = 0; i < tiers; i++) {
      const tw = w * (1 - i * 0.14);
      const ty = baseY - (i + 1) * th;
      ctx.fillStyle = i % 2 ? "rgba(190,126,82,0.97)" : "rgba(204,142,94,0.97)";
      ctx.fillRect(x - tw / 2, ty, tw, th);
      ctx.strokeStyle = "rgba(96,54,32,0.55)"; ctx.lineWidth = 0.26;
      ctx.strokeRect(x - tw / 2, ty, tw, th);
      // cornice
      ctx.fillStyle = "rgba(150,88,52,0.9)";
      ctx.fillRect(x - tw / 2 - 0.5, ty, tw + 1.0, 0.7);
      // sculpture niches
      const n = 5 - (i > 2 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const nx = x - tw / 2 + (tw / n) * (k + 0.5);
        ctx.beginPath();
        ctx.arc(nx, ty + th * 0.55, 0.55, Math.PI, TAU);
        ctx.fillStyle = "rgba(104,60,36,0.55)"; ctx.fill();
        ctx.fillRect(nx - 0.55, ty + th * 0.55, 1.1, th * 0.3);
      }
      // horizontal mouldings
      ctx.strokeStyle = "rgba(112,64,38,0.35)"; ctx.lineWidth = 0.16;
      for (let yy = ty + 1.4; yy < ty + th; yy += 1.6) {
        ctx.beginPath(); ctx.moveTo(x - tw / 2 + 0.6, yy); ctx.lineTo(x + tw / 2 - 0.6, yy); ctx.stroke();
      }
    }
    // crowning barrel vault of the gopuram
    const tw = w * (1 - tiers * 0.14);
    const ty = baseY - h;
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.56, ty);
    ctx.lineTo(x - tw * 0.56, ty - 1.6);
    ctx.quadraticCurveTo(x, ty - 5.2, x + tw * 0.56, ty - 1.6);
    ctx.lineTo(x + tw * 0.56, ty);
    ctx.closePath();
    ctx.fillStyle = "rgba(172,106,64,0.97)"; ctx.fill();
    ctx.strokeStyle = "rgba(96,54,32,0.6)"; ctx.lineWidth = 0.24; ctx.stroke();
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * tw * 0.2, ty - 0.2);
      ctx.lineTo(x + k * tw * 0.2, ty - 3.4 + Math.abs(k) * 0.5);
      ctx.strokeStyle = "rgba(96,54,32,0.4)"; ctx.lineWidth = 0.18; ctx.stroke();
    }
    // kalasha finial
    ctx.beginPath(); ctx.arc(x, ty - 5.6, 0.8, 0, TAU);
    ctx.fillStyle = "rgba(196,150,78,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(96,54,32,0.6)"; ctx.lineWidth = 0.18; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, ty - 6.4); ctx.lineTo(x, ty - 8.0);
    ctx.strokeStyle = "rgba(96,54,32,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
    // gateway
    ctx.beginPath();
    ctx.moveTo(x - 2.4, baseY);
    ctx.lineTo(x - 2.4, baseY - 4.4);
    ctx.quadraticCurveTo(x, baseY - 6.6, x + 2.4, baseY - 4.4);
    ctx.lineTo(x + 2.4, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(46,30,20,0.85)"; ctx.fill();
  }

  function bastille(ctx, x, baseY, w, h, t) {
    // moat
    const moat = ctx.createLinearGradient(0, baseY - 2, 0, baseY + 4);
    moat.addColorStop(0, "rgba(94,116,112,0.85)");
    moat.addColorStop(1, "rgba(62,84,84,0.95)");
    ctx.fillStyle = moat;
    ctx.fillRect(x - w * 0.66, baseY - 2.2, w * 1.32, 4.2);
    ctx.strokeStyle = "rgba(232,236,220,0.25)"; ctx.lineWidth = 0.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.6, baseY - 1.4 + i * 1.2);
      ctx.quadraticCurveTo(x, baseY - 1.9 + i * 1.2, x + w * 0.6, baseY - 1.4 + i * 1.2);
      ctx.stroke();
    }
    // rear towers (suggesting the Bastille's eight)
    for (const dx of [-0.18, 0.18]) {
      const tx = x + dx * w;
      const tw = w * 0.08;
      const th = h * 0.90;
      ctx.fillStyle = "rgba(128,114,96,0.98)";
      ctx.fillRect(tx - tw / 2, baseY - th, tw, th);
      ctx.strokeStyle = "rgba(70,58,42,0.55)"; ctx.lineWidth = 0.28;
      ctx.strokeRect(tx - tw / 2, baseY - th, tw, th);
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2 - 0.9, baseY - th);
      ctx.lineTo(tx, baseY - th - 3.0);
      ctx.lineTo(tx + tw / 2 + 0.9, baseY - th);
      ctx.closePath();
      ctx.fillStyle = "rgba(86,68,50,0.98)"; ctx.fill();
      ctx.strokeStyle = "rgba(56,42,28,0.55)"; ctx.lineWidth = 0.22; ctx.stroke();
    }
    // curtain wall
    ctx.fillStyle = "rgba(158,142,116,0.98)";
    ctx.fillRect(x - w * 0.34, baseY - h * 0.56, w * 0.68, h * 0.56);
    ctx.strokeStyle = "rgba(74,62,46,0.6)"; ctx.lineWidth = 0.32;
    ctx.strokeRect(x - w * 0.34, baseY - h * 0.56, w * 0.68, h * 0.56);
    // stone courses
    ctx.strokeStyle = "rgba(74,62,46,0.22)"; ctx.lineWidth = 0.16;
    for (let yy = baseY - h * 0.52; yy < baseY; yy += 1.6) {
      ctx.beginPath(); ctx.moveTo(x - w * 0.32, yy); ctx.lineTo(x + w * 0.32, yy); ctx.stroke();
    }
    // crenellations
    ctx.fillStyle = "rgba(150,134,108,0.98)";
    for (let i = 0; i < 7; i++) {
      const cw = w * 0.68 / 7;
      ctx.fillRect(x - w * 0.34 + i * cw + cw * 0.2, baseY - h * 0.56 - 1.6, cw * 0.6, 1.6);
    }
    // towers
    for (const dx of [-0.36, 0.36]) {
      const tx = x + dx * w;
      const tw = w * 0.12;
      ctx.fillStyle = "rgba(150,134,108,0.99)";
      ctx.fillRect(tx - tw / 2, baseY - h, tw, h);
      ctx.strokeStyle = "rgba(70,58,42,0.65)"; ctx.lineWidth = 0.32;
      ctx.strokeRect(tx - tw / 2, baseY - h, tw, h);
      // machicolation ring
      ctx.fillStyle = "rgba(134,118,94,0.98)";
      ctx.fillRect(tx - tw / 2 - 0.8, baseY - h * 0.82, tw + 1.6, 1.6);
      // conical roof
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2 - 1.2, baseY - h);
      ctx.lineTo(tx, baseY - h - 3.6);
      ctx.lineTo(tx + tw / 2 + 1.2, baseY - h);
      ctx.closePath();
      ctx.fillStyle = "rgba(96,74,54,0.98)"; ctx.fill();
      ctx.strokeStyle = "rgba(56,42,28,0.6)"; ctx.lineWidth = 0.26; ctx.stroke();
      // arrow slits
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(48,38,28,0.7)";
        ctx.fillRect(tx - 0.3, baseY - h * 0.72 + i * h * 0.16, 0.6, 2.0);
      }
    }
    // drawbridge, lowered
    ctx.save();
    ctx.translate(x, baseY - h * 0.06);
    ctx.rotate(0.02);
    ctx.fillStyle = "rgba(102,72,44,0.98)";
    ctx.fillRect(-w * 0.07, -h * 0.30, w * 0.14, h * 0.30);
    ctx.strokeStyle = "rgba(56,38,24,0.7)"; ctx.lineWidth = 0.24;
    ctx.strokeRect(-w * 0.07, -h * 0.30, w * 0.14, h * 0.30);
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.07, -h * 0.30 + i * h * 0.06);
      ctx.lineTo(w * 0.07, -h * 0.30 + i * h * 0.06);
      ctx.strokeStyle = "rgba(56,38,24,0.35)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    ctx.restore();
    // chains
    ctx.strokeStyle = "rgba(58,48,36,0.75)"; ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.17, baseY - h * 0.42);
    ctx.lineTo(x - w * 0.07, baseY - h * 0.34);
    ctx.moveTo(x + w * 0.17, baseY - h * 0.42);
    ctx.lineTo(x + w * 0.07, baseY - h * 0.34);
    ctx.stroke();
  }

  function steamLoco(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // shadow
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 1.6, 0, 0, TAU);
    ctx.fillStyle = "rgba(58,40,24,0.18)"; ctx.fill();
    // wheels
    const wheel = (wx, r) => {
      ctx.beginPath(); ctx.arc(wx, -r, r, 0, TAU);
      ctx.fillStyle = "rgba(58,48,38,0.98)"; ctx.fill();
      ctx.strokeStyle = "rgba(28,22,16,0.9)"; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.beginPath(); ctx.arc(wx, -r, r * 0.45, 0, TAU);
      ctx.fillStyle = "rgba(142,110,70,0.9)"; ctx.fill();
      ctx.strokeStyle = "rgba(40,30,20,0.5)"; ctx.lineWidth = 0.15; ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(wx, -r); ctx.lineTo(wx + Math.cos(a) * r * 0.8, -r + Math.sin(a) * r * 0.8);
        ctx.strokeStyle = "rgba(40,30,20,0.55)"; ctx.lineWidth = 0.16; ctx.stroke();
      }
    };
    wheel(-8, 2.2); wheel(-2.4, 2.2); wheel(3.2, 2.2); wheel(9.6, 1.2);
    // frame
    ctx.fillStyle = "rgba(48,40,32,0.98)";
    ctx.fillRect(-10.4, -4.6, 20.8, 1.0);
    // boiler
    ctx.beginPath();
    ctx.moveTo(-3.2, -4.4);
    ctx.lineTo(8.2, -4.4);
    ctx.quadraticCurveTo(10.4, -4.4, 10.4, -6.4);
    ctx.quadraticCurveTo(10.4, -8.4, 8.2, -8.4);
    ctx.lineTo(-3.2, -8.4);
    ctx.closePath();
    ctx.fillStyle = "rgba(86,66,48,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(36,28,20,0.8)"; ctx.lineWidth = 0.26; ctx.stroke();
    // boiler bands
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-1.2 + i * 2.6, -8.4); ctx.lineTo(-1.2 + i * 2.6, -4.4);
      ctx.strokeStyle = "rgba(184,132,70,0.55)"; ctx.lineWidth = 0.26; ctx.stroke();
    }
    // smokebox + chimney
    ctx.fillStyle = "rgba(52,44,36,0.99)";
    ctx.fillRect(8.2, -9.0, 2.6, 4.8);
    ctx.fillRect(9.0, -13.2, 1.9, 4.2);
    ctx.strokeStyle = "rgba(28,22,16,0.7)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(9.0, -13.2, 1.9, 4.2);
    // cab
    ctx.fillStyle = "rgba(92,66,44,0.98)";
    ctx.fillRect(-10.2, -11.6, 7.2, 7.2);
    ctx.strokeStyle = "rgba(38,28,20,0.7)"; ctx.lineWidth = 0.26;
    ctx.strokeRect(-10.2, -11.6, 7.2, 7.2);
    ctx.fillStyle = "rgba(226,196,140,0.9)";
    ctx.fillRect(-8.8, -10.6, 2.6, 2.2);
    // roof
    ctx.fillStyle = "rgba(62,48,36,0.98)";
    ctx.fillRect(-10.8, -12.2, 8.4, 0.9);
    // tender
    ctx.fillStyle = "rgba(72,56,40,0.98)";
    ctx.fillRect(-17.6, -7.6, 7.0, 3.4);
    ctx.strokeStyle = "rgba(36,28,20,0.7)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(-17.6, -7.6, 7.0, 3.4);
    ctx.fillStyle = "rgba(44,36,28,0.98)";
    ctx.beginPath();
    ctx.moveTo(-17.2, -7.6); ctx.lineTo(-16.4, -9.0); ctx.lineTo(-12.4, -9.0); ctx.lineTo(-11.6, -7.6);
    ctx.closePath(); ctx.fill();
    // coupling rod
    ctx.strokeStyle = "rgba(150,120,80,0.9)"; ctx.lineWidth = 0.32;
    ctx.beginPath(); ctx.moveTo(-8, -1.4); ctx.lineTo(3.2, -1.4); ctx.stroke();
    // steam puffs
    for (let i = 0; i < 5; i++) {
      const q = (t * 0.22 + i * 0.2 + (o.phase || 0)) % 1;
      ctx.beginPath();
      ctx.arc(9.9 + q * 7, -13.6 - q * 8, 0.8 + q * 2.6, 0, TAU);
      ctx.fillStyle = "rgba(238,232,216," + (0.26 * (1 - q)) + ")"; ctx.fill();
    }
    ctx.restore();
  }

  function workstation(ctx, x, baseY, s, t) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    // desk
    ctx.fillStyle = "rgba(150,112,74,0.98)";
    ctx.fillRect(-14, -6.0, 28, 1.0);
    ctx.strokeStyle = "rgba(74,50,30,0.6)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(-14, -6.0, 28, 1.0);
    ctx.fillStyle = "rgba(132,96,62,0.98)";
    ctx.fillRect(-13.2, -5.0, 1.2, 5.0);
    ctx.fillRect(12.0, -5.0, 1.2, 5.0);
    // NeXT cube
    ctx.fillStyle = "rgba(38,36,36,0.99)";
    ctx.fillRect(-4.6, -15.2, 9.2, 9.0);
    ctx.strokeStyle = "rgba(20,20,20,0.9)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(-4.6, -15.2, 9.2, 9.0);
    // screen
    ctx.fillStyle = "rgba(30,42,48,0.99)";
    ctx.fillRect(-3.8, -14.4, 7.6, 6.4);
    const scr = ctx.createLinearGradient(0, -14.4, 0, -8.0);
    scr.addColorStop(0, "rgba(126,168,170,0.55)");
    scr.addColorStop(1, "rgba(70,112,120,0.35)");
    ctx.fillStyle = scr;
    ctx.fillRect(-3.8, -14.4, 7.6, 6.4);
    // page furniture (no readable text)
    ctx.fillStyle = "rgba(238,236,220,0.9)";
    ctx.fillRect(-3.2, -13.8, 6.4, 0.9);
    ctx.fillStyle = "rgba(226,226,210,0.75)";
    for (let i = 0; i < 3; i++) ctx.fillRect(-3.2, -12.2 + i * 0.9, 5.6 - i * 0.8, 0.35);
    ctx.strokeStyle = "rgba(146,190,196,0.9)"; ctx.lineWidth = 0.18;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath(); ctx.moveTo(-3.1, -9.5 + i * 1.0); ctx.lineTo(-0.6 - i * 0.8, -9.5 + i * 1.0); ctx.stroke();
    }
    // CRT scanlines
    ctx.strokeStyle = "rgba(150,196,196,0.10)"; ctx.lineWidth = 0.07;
    for (let yy = -14.0; yy < -8.2; yy += 0.45) {
      ctx.beginPath(); ctx.moveTo(-3.7, yy); ctx.lineTo(3.7, yy); ctx.stroke();
    }
    // screen glow
    glow(ctx, 0, -11, 9, "#7fb2b0", 0.22);
    // keyboard + mouse
    ctx.fillStyle = "rgba(196,188,172,0.98)";
    ctx.beginPath();
    ctx.moveTo(-7.6, -6.0); ctx.lineTo(2.2, -6.0); ctx.lineTo(1.6, -7.0); ctx.lineTo(-7.0, -7.0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(92,82,68,0.5)"; ctx.lineWidth = 0.14; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(4.4, -6.4, 1.0, 0.5, 0, 0, TAU);
    ctx.fillStyle = "rgba(196,188,172,0.98)"; ctx.fill();
    // mug
    ctx.fillStyle = "rgba(226,220,204,0.98)";
    ctx.fillRect(7.6, -8.6, 2.6, 2.6);
    ctx.strokeStyle = "rgba(92,82,68,0.5)"; ctx.lineWidth = 0.18;
    ctx.beginPath(); ctx.arc(10.5, -7.3, 0.7, -1.2, 1.2); ctx.stroke();
    // cables
    ctx.strokeStyle = "rgba(50,48,44,0.85)"; ctx.lineWidth = 0.24;
    ctx.beginPath();
    ctx.moveTo(-4.4, -6.0); ctx.quadraticCurveTo(-6.4, -3.2, -8.6, -1.0);
    ctx.moveTo(4.4, -6.0); ctx.quadraticCurveTo(6.2, -3.4, 7.8, -1.0);
    ctx.stroke();
    // sticky notes / disk
    ctx.fillStyle = "rgba(216,178,102,0.9)";
    ctx.fillRect(-11.6, -9.0, 2.2, 2.2);
    ctx.fillStyle = "rgba(168,64,44,0.85)";
    ctx.fillRect(-10.4, -10.2, 1.4, 1.4);
    ctx.restore();
  }

  function netGlobe(ctx, x, y, r, t, o) {
    o = o || {};
    const col = o.col || "rgba(140,180,178,0.8)";
    ctx.save();
    ctx.translate(x, y);
    // halo
    glow(ctx, 0, 0, r * 1.35, "#6fa3a0", 0.18);
    // sphere
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = "rgba(38,54,58,0.55)"; ctx.fill();
    ctx.strokeStyle = withA(col, 0.9); ctx.lineWidth = 0.28; ctx.stroke();
    // latitudes
    for (let i = 1; i <= 3; i++) {
      const yy = -r + (2 * r * i) / 4;
      const rx = Math.sqrt(Math.max(0, r * r - yy * yy));
      ctx.beginPath(); ctx.ellipse(0, yy, rx, rx * 0.24, 0, 0, TAU);
      ctx.strokeStyle = withA(col, 0.35); ctx.lineWidth = 0.16; ctx.stroke();
    }
    // longitudes
    for (let i = 0; i < 4; i++) {
      const rx = r * Math.abs(Math.cos((i / 4) * Math.PI));
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.6, rx), r, 0, 0, TAU);
      ctx.strokeStyle = withA(col, 0.3); ctx.lineWidth = 0.16; ctx.stroke();
    }
    // nodes + links
    const nodes = [
      [-0.55, -0.35], [-0.15, -0.62], [0.3, -0.45], [0.62, -0.1],
      [0.38, 0.28], [0.05, 0.5], [-0.4, 0.3], [-0.66, 0.02],
      [-0.05, -0.05], [0.2, 0.05],
    ];
    ctx.strokeStyle = "rgba(224,186,112,0.55)"; ctx.lineWidth = 0.14;
    const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [8, 2], [8, 5], [9, 3], [9, 6], [1, 8], [4, 9]];
    for (const [a, b] of links) {
      ctx.beginPath();
      ctx.moveTo(nodes[a][0] * r, nodes[a][1] * r);
      ctx.lineTo(nodes[b][0] * r, nodes[b][1] * r);
      ctx.stroke();
    }
    for (let i = 0; i < nodes.length; i++) {
      const pulse = 0.7 + Math.sin(t * 1.4 + i) * 0.15;
      ctx.beginPath(); ctx.arc(nodes[i][0] * r, nodes[i][1] * r, 0.75 * pulse, 0, TAU);
      ctx.fillStyle = i % 3 === 0 ? "rgba(224,186,112,0.95)" : "rgba(190,220,214,0.9)";
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── 2B-1. The Hijra · 沙漠夜行 ─────────────────────── */
  const hijraStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#2f3a4a");
    sky.addColorStop(0.42, "#4b4f55");
    sky.addColorStop(0.72, "#9b7f62");
    sky.addColorStop(1, "#d0a06a");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    stars(ctx, top, t, 46, 9);
    // guiding star
    glow(ctx, 12, -62, 5.4, "#f0d9a0", 0.5);
    ctx.beginPath(); ctx.arc(12, -62, 1.1, 0, TAU);
    ctx.fillStyle = "rgba(250,236,200,0.95)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -66); ctx.lineTo(12.8, -62); ctx.lineTo(12, -58); ctx.lineTo(11.2, -62); ctx.closePath();
    ctx.fillStyle = "rgba(250,236,200,0.55)"; ctx.fill();
    // far mountains
    ridge(ctx, -50, 50, -38, 5, "rgba(80,68,58,0.75)", 7, 4, -30);
    // near range: crags on the left fall away to an open plain on the right
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.lineTo(-50, -27);
    ctx.lineTo(-47, -34);
    ctx.lineTo(-44, -31);
    ctx.lineTo(-41, -38);
    ctx.lineTo(-37, -35);
    ctx.lineTo(-33, -41);
    ctx.lineTo(-29, -37);
    ctx.lineTo(-25, -33);
    ctx.lineTo(-20, -31);
    ctx.lineTo(-13, -29);
    ctx.lineTo(-5, -27);
    ctx.lineTo(6, -25.6);
    ctx.lineTo(20, -24.6);
    ctx.lineTo(36, -24);
    ctx.lineTo(52, -23.4);
    ctx.lineTo(52, -22.6);
    ctx.lineTo(-52, -22.6);
    ctx.closePath();
    ctx.fillStyle = "rgba(66,56,46,0.94)"; ctx.fill();
    ctx.strokeStyle = "rgba(40,32,24,0.5)"; ctx.lineWidth = 0.3; ctx.stroke();
    // lit facets on the west-facing crags
    ctx.beginPath();
    ctx.moveTo(-47, -34); ctx.lineTo(-44, -31); ctx.lineTo(-41, -38); ctx.lineTo(-39, -33);
    ctx.closePath();
    ctx.fillStyle = "rgba(104,86,66,0.45)"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-33, -41); ctx.lineTo(-29, -37); ctx.lineTo(-31, -33); ctx.lineTo(-34, -36);
    ctx.closePath();
    ctx.fillStyle = "rgba(96,80,62,0.4)"; ctx.fill();
    // haze dissolves the foot of the range into the plain
    const hz = ctx.createLinearGradient(0, -28, 0, -18.5);
    hz.addColorStop(0, "rgba(198,162,120,0)");
    hz.addColorStop(1, "rgba(198,162,120,0.55)");
    ctx.fillStyle = hz;
    ctx.fillRect(-50, -28, 100, 9.5);
    // dunes
    for (let i = 0; i < 3; i++) {
      const yy = -22 + i * 6;
      ctx.beginPath();
      ctx.moveTo(-54, yy + 14);
      for (let x = -52; x <= 52; x += 8) ctx.lineTo(x, yy - Math.sin(x * 0.05 + i) * 2.4);
      ctx.lineTo(54, yy + 14); ctx.closePath();
      ctx.fillStyle = i === 0 ? "rgba(116,94,68,0.55)" : i === 1 ? "rgba(104,82,58,0.7)" : "rgba(92,72,50,0.85)";
      ctx.fill();
    }
    // rocky pass + cave (in front of the dunes)
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.lineTo(-51, -5);
    ctx.lineTo(-48, -10);
    ctx.lineTo(-45, -8);
    ctx.lineTo(-42, -13);
    ctx.lineTo(-38, -15);
    ctx.lineTo(-35, -13);
    ctx.lineTo(-32, -16);
    ctx.lineTo(-28, -12);
    ctx.lineTo(-24, -10);
    ctx.lineTo(-21, -6);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(78,63,48,0.99)"; ctx.fill();
    ctx.strokeStyle = "rgba(34,26,20,0.85)"; ctx.lineWidth = 0.35; ctx.stroke();
    // west-facing lit faces
    ctx.beginPath();
    ctx.moveTo(-51, -5); ctx.lineTo(-48, -10); ctx.lineTo(-45, -8); ctx.lineTo(-46, -3);
    ctx.closePath();
    ctx.fillStyle = "rgba(112,92,70,0.5)"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-38, -15); ctx.lineTo(-35, -13); ctx.lineTo(-37, -8.6); ctx.lineTo(-40, -11);
    ctx.closePath();
    ctx.fillStyle = "rgba(102,84,64,0.45)"; ctx.fill();
    hatch(ctx, -50, -14, 30, 14, "rgba(24,18,14,0.22)", 1.6, -0.8);
    // cave mouth
    ctx.beginPath();
    ctx.moveTo(-36.6, -2);
    ctx.lineTo(-36, -7.6);
    ctx.quadraticCurveTo(-33.8, -11.4, -31.2, -8.6);
    ctx.quadraticCurveTo(-30.2, -7.4, -29.4, -2);
    ctx.closePath();
    ctx.fillStyle = "rgba(14,10,8,0.92)"; ctx.fill();
    // overhang shadow + rubble
    ctx.beginPath();
    ctx.moveTo(-37.6, -7.6); ctx.quadraticCurveTo(-33.6, -12.4, -28.6, -7.2);
    ctx.strokeStyle = "rgba(20,15,12,0.55)"; ctx.lineWidth = 0.9; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.ellipse(-38.5 + i * 2.6, -1.4, 1.2, 0.6, 0.1, 0, TAU);
      ctx.fillStyle = "rgba(96,78,58,0.9)"; ctx.fill();
    }
    // small oasis palms on the far plain
    palm(ctx, 39, -24, 9, 1.3, "rgba(44,40,28,0.85)");
    palm(ctx, 46, -23.4, 6.5, 1.8, "rgba(44,40,28,0.85)");
    // caravan silhouettes
    const caravan = [
      { x: -16, s: 0.50, rider: true },
      { x: -4, s: 0.56, rider: false },
      { x: 8, s: 0.52, rider: true },
      { x: 20, s: 0.46, rider: false },
    ];
    caravan.forEach((c, i) => {
      ctx.beginPath(); ctx.ellipse(c.x, -6 + (i % 2) * 0.6, 8 * c.s, 1.4, 0, 0, TAU);
      ctx.fillStyle = "rgba(24,18,14,0.18)"; ctx.fill();
      camel(ctx, c.x, -6 + (i % 2) * 0.6, c.s, "rgba(56,48,40,0.98)", t + i * 0.4);
      if (c.rider) {
        person(ctx, c.x - 1.2, -10 + (i % 2) * 0.6, 0.24, "rgba(40,34,28,0.98)", { phase: t + i, fill: "rgba(48,40,32,0.98)", noShadow: true });
      }
      // saddle blanket accent
      ctx.fillStyle = "rgba(150,60,42,0.75)";
      ctx.fillRect(c.x - 2.0, -11.2 + (i % 2) * 0.6, 4.0, 1.6);
    });
    // walking guide + companion
    person(ctx, -26, -4.4, 0.30, "rgba(40,32,26,0.98)", { phase: t + 1, fill: "rgba(52,44,36,0.98)", staff: true, noShadow: true });
    person(ctx, 28, -3.2, 0.26, "rgba(40,32,26,0.98)", { phase: t + 2, fill: "rgba(60,50,40,0.98)", noShadow: true });
    // foreground rocks
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.ellipse(-44 + i * 13, -1.2 + (i % 2) * 0.6, 2.6, 1.0, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(70,56,42,0.75)"; ctx.fill();
    }
    // dust
    for (let i = 0; i < 16; i++) {
      const q = (t * 0.2 + i * 0.1) % 1;
      ctx.beginPath(); ctx.arc(-18 + i * 3.2, -4 - q * 5, 1.2 + q * 2.4, 0, TAU);
      ctx.fillStyle = "rgba(170,136,96," + (0.10 * (1 - q)) + ")"; ctx.fill();
    }
  };

  const hijraMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#8f7454", 0.45);
    // cave/rocks
    ctx.beginPath();
    ctx.moveTo(-52, 0); ctx.lineTo(-44, -10); ctx.lineTo(-30, -14); ctx.lineTo(-18, -6); ctx.lineTo(-12, 0); ctx.closePath();
    ctx.fillStyle = "rgba(92,76,58,0.98)"; ctx.fill();
    ctx.beginPath(); ctx.arc(-30, -7, 3.4, Math.PI, TAU); ctx.fillStyle = "rgba(18,14,12,0.8)"; ctx.fill();
    camel(ctx, -4, -5, 0.7, "rgba(56,48,40,0.98)", t);
    camel(ctx, 12, -4, 0.6, "rgba(56,48,40,0.98)", t + 0.5);
    person(ctx, 24, -3, 0.55, "rgba(40,32,26,0.98)", { phase: t, fill: "rgba(52,44,36,0.98)", staff: true });
    glow(ctx, 28, -50, 5, "#f0d9a0", 0.45);
    ctx.beginPath(); ctx.arc(28, -50, 1.2, 0, TAU); ctx.fillStyle = "rgba(250,236,200,0.95)"; ctx.fill();
    stars(ctx, -80, t, 18, 7);
  };

  /* ── 2B-2. Genghis Khan · 斡难河源 ─────────────────── */
  const genghisStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#cfd0c0");
    sky.addColorStop(0.5, "#e2d2ae");
    sky.addColorStop(1, "#e2bd84");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -38 - top, "rgba(96,82,58,0.055)", 2.8, 5);
    glow(ctx, 20, -66, 24, "#dda75c", 0.36);
    ctx.beginPath(); ctx.arc(20, -66, 5.8, 0, TAU);
    ctx.fillStyle = "rgba(218,166,88,0.9)"; ctx.fill();
    cloud(ctx, -22, -84, 18, "rgba(248,242,226,0.38)", 0.42);
    cloud(ctx, 26, -90, 12, "rgba(248,242,226,0.3)", 0.35);
    // mountains
    ridge(ctx, -50, 50, -40, 8, "rgba(120,124,112,0.42)", 9, 4, -30);
    ridge(ctx, -50, 50, -34, 5.5, "rgba(104,110,84,0.45)", 3, 5, -24);
    // steppe
    const steppe = ctx.createLinearGradient(0, -25, 0, 0);
    steppe.addColorStop(0, "rgba(160,156,96,0)");
    steppe.addColorStop(0.06, "rgba(160,156,96,0.55)");
    steppe.addColorStop(0.5, "rgba(146,140,84,0.85)");
    steppe.addColorStop(1, "rgba(128,120,70,0.92)");
    ctx.fillStyle = steppe;
    ctx.fillRect(-50, -24, 100, 24);
    hatch(ctx, -50, -24, 100, 24, "rgba(74,64,36,0.10)", 1.9, -0.22);
    // grass bands
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "rgba(196,184,120,0.28)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-50, -20 + i * 3.2); ctx.quadraticCurveTo(0, -22 + i * 3.2, 50, -19 + i * 3.2); ctx.stroke();
    }
    // ger camp
    ger(ctx, -40, -18, 0.9, "rgba(236,228,210,0.98)");
    ger(ctx, -30, -16, 0.8, "rgba(228,220,202,0.98)");
    ger(ctx, -48, -14, 0.7, "rgba(230,222,204,0.98)");
    // horse herd
    for (let i = 0; i < 4; i++) {
      horse(ctx, -12 + i * 4.4, -14 + (i % 2) * 1.2, 0.28, "rgba(82,64,42,0.95)", t + i * 0.5, {});
    }
    // distant horse herd
    for (let i = 0; i < 5; i++) {
      horse(ctx, -4 + i * 4.6, -21 + (i % 2) * 1.0, 0.16, "rgba(96,78,52,0.7)", t + i * 0.4, {});
    }
    // foreground ger
    ger(ctx, -44, -5, 1.15, "rgba(236,228,210,0.98)");
    // rock outcrop
    ctx.beginPath();
    ctx.moveTo(-52, 0); ctx.lineTo(-48, -7); ctx.lineTo(-42, -10); ctx.lineTo(-36, -6); ctx.lineTo(-32, 0); ctx.closePath();
    ctx.fillStyle = "rgba(132,118,88,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.4)"; ctx.lineWidth = 0.25; ctx.stroke();
    // great banner (tug)
    ctx.strokeStyle = "rgba(56,40,24,0.95)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -46); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -46.4, 1.6, 0, TAU);
    ctx.fillStyle = "rgba(196,150,78,0.95)"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -44.2, 2.4, 0, TAU);
    ctx.strokeStyle = "rgba(58,40,24,0.6)"; ctx.lineWidth = 0.5; ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const sway = Math.sin(t * 1.6 + i) * 1.2;
      ctx.beginPath();
      ctx.moveTo(0.4, -44.4);
      ctx.quadraticCurveTo(3.4 + sway, -38, 2.2 + sway, -30);
      ctx.strokeStyle = i % 2 ? "rgba(236,228,208,0.9)" : "rgba(58,44,30,0.9)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    // mounted archers
    const riders = [
      { x: -8, y: -14, s: 0.38, col: "rgba(76,58,38,0.97)", rider: "rgba(150,60,42,0.95)" },
      { x: 4, y: -12, s: 0.44, col: "rgba(70,54,36,0.97)", rider: "rgba(84,104,112,0.95)" },
      { x: 17, y: -10, s: 0.50, col: "rgba(64,50,34,0.98)", rider: "rgba(196,150,78,0.95)" },
      { x: 30, y: -8, s: 0.56, col: "rgba(58,44,30,0.98)", rider: "rgba(150,60,42,0.95)" },
    ];
    riders.forEach((r, i) => {
      horse(ctx, r.x, r.y, r.s, r.col, t + i * 0.6, { rider: true, riderCol: r.rider, banner: i === 2 ? "#a8402c" : null });
      // bow case
      ctx.strokeStyle = "rgba(58,40,24,0.8)"; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(r.x + 3 * r.s, r.y - 10 * r.s); ctx.lineTo(r.x - 4 * r.s, r.y - 12 * r.s); ctx.stroke();
    });
    // front rider
    horse(ctx, 34, -4.6, 0.66, "rgba(58,44,30,0.98)", t + 2, { rider: true, riderCol: "rgba(150,60,42,0.95)", banner: "#a8402c" });
    // foreground outrider, framing the left
    horse(ctx, -23, -1.0, 0.92, "rgba(52,38,24,0.99)", t + 2.4, {
      rider: true, riderCol: "rgba(84,104,112,0.96)", banner: "rgba(84,104,112,0.95)",
    });
    // foreground grass + stones
    for (let i = 0; i < 28; i++) {
      const gx = -48 + i * 3.5;
      const gy = -0.6 + (i % 4) * 0.3;
      ctx.strokeStyle = "rgba(112,104,58,0.6)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.sin(t + i) * 0.5, gy - 2.2); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(-46 + i * 17, -0.8, 2.2, 0.8, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(120,106,74,0.55)"; ctx.fill();
    }
    // dust
    for (let i = 0; i < 12; i++) {
      const q = (t * 0.3 + i * 0.1) % 1;
      ctx.beginPath(); ctx.arc(10 + i * 2.6, -5 - q * 7, 1.6 + q * 3.0, 0, TAU);
      ctx.fillStyle = "rgba(204,174,128," + (0.10 * (1 - q)) + ")"; ctx.fill();
    }
  };

  const genghisMap = function (ctx, t) {
    mapFloor(ctx, -8, 50, "#9a9466", 0.45);
    ger(ctx, -34, -6, 1.1, "rgba(236,228,210,0.98)");
    ger(ctx, -22, -5, 0.9, "rgba(228,220,202,0.98)");
    // banner
    ctx.strokeStyle = "rgba(56,40,24,0.95)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, -42); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const sway = Math.sin(t * 1.6 + i) * 2;
      ctx.beginPath(); ctx.moveTo(-1.6, -40); ctx.quadraticCurveTo(3 + sway, -32, 1 + sway, -22);
      ctx.strokeStyle = i % 2 ? "rgba(236,228,208,0.9)" : "rgba(58,44,30,0.9)"; ctx.lineWidth = 1.0; ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      horse(ctx, 8 + i * 10, -4 + (i % 2) * 2, 0.55, "rgba(70,54,36,0.97)", t + i, { rider: true, riderCol: i % 2 ? "rgba(150,60,42,0.95)" : "rgba(84,104,112,0.95)", banner: i === 2 ? "#a8402c" : null });
    }
    bird(ctx, 40, -44, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 2B-3. Mali Empire · 尼日尔河畔 ─────────────────── */
  const maliStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#dfe0cc");
    sky.addColorStop(0.5, "#ecd7ae");
    sky.addColorStop(1, "#dfb77f");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -38 - top, "rgba(112,86,56,0.05)", 3.1, 5);
    glow(ctx, 22, -68, 24, "#dda75c", 0.34);
    ctx.beginPath(); ctx.arc(22, -68, 5.6, 0, TAU);
    ctx.fillStyle = "rgba(218,166,88,0.88)"; ctx.fill();
    cloud(ctx, -24, -84, 18, "rgba(250,244,228,0.35)", 0.4);
    // sahel ground
    const gnd = ctx.createLinearGradient(0, -36, 0, 0);
    gnd.addColorStop(0, "rgba(224,186,132,0.92)");
    gnd.addColorStop(0.55, "rgba(208,168,112,0.95)");
    gnd.addColorStop(1, "rgba(188,144,94,0.97)");
    ctx.fillStyle = gnd;
    ctx.fillRect(-50, -36, 100, 36);
    hatch(ctx, -50, -34, 100, 34, "rgba(136,98,62,0.09)", 2.4, -0.32);
    // sahel ridge
    ridge(ctx, -50, 50, -38, 4, "rgba(160,142,96,0.32)", 7, 5, -28);
    // mud-brick mosque
    mudMosque(ctx, 14, -26, 34, 22);
    // baobab
    baobab(ctx, -34, -14, 26, "rgba(86,68,42,0.95)");
    baobab(ctx, 42, -18, 18, "rgba(86,68,42,0.9)");
    // Niger river at left
    const riv = ctx.createLinearGradient(0, -18, 0, -8);
    riv.addColorStop(0, "#8ea59a");
    riv.addColorStop(1, "#6f8c86");
    ctx.beginPath();
    ctx.moveTo(-52, -16);
    ctx.quadraticCurveTo(-34, -20, -18, -16);
    ctx.quadraticCurveTo(-8, -13, -2, -9);
    ctx.quadraticCurveTo(0.4, -7.6, -3, -5.4);
    ctx.quadraticCurveTo(-14, -7.6, -34, -11);
    ctx.quadraticCurveTo(-48, -13, -52, -7);
    ctx.closePath();
    ctx.fillStyle = riv; ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.25)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(-52, -16); ctx.quadraticCurveTo(-34, -20, -18, -16); ctx.quadraticCurveTo(-8, -13, -2, -9); ctx.stroke();
    // reeds along the top bank
    for (let i = 0; i < 8; i++) {
      const rx = -48 + i * 6.2;
      const ry = -18 - Math.sin(i * 1.3) * 2.2;
      ctx.strokeStyle = "rgba(104,104,60,0.65)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(t + i) * 0.4, ry - 2.8); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(238,232,208,0.3)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-48, -16 + i * 1.8); ctx.quadraticCurveTo(-30, -19 + i * 1.8, -10, -12 + i * 1.8); ctx.stroke();
    }
    // canoe
    canoe(ctx, -30, -12, 0.9, t);
    // round huts
    for (let i = 0; i < 4; i++) {
      const hx = -14 + i * 6.4;
      const hy = -20 + (i % 2) * 2;
      ctx.fillStyle = "rgba(198,164,118,0.95)";
      ctx.fillRect(hx - 2.8, hy - 4, 5.6, 4);
      ctx.beginPath(); ctx.arc(hx, hy - 4, 3.2, Math.PI, TAU); ctx.fillStyle = "rgba(150,96,58,0.93)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,50,30,0.4)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    // market stall with a striped canopy
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.26;
    ctx.beginPath();
    ctx.moveTo(-2.0, -6.4); ctx.lineTo(-2.0, -12.6);
    ctx.moveTo(7.4, -6.4); ctx.lineTo(7.4, -12.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4.2, -12.4); ctx.lineTo(9.6, -12.4); ctx.lineTo(7.6, -15.6); ctx.lineTo(-2.2, -15.6);
    ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,40,28,0.55)"; ctx.lineWidth = 0.2; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(226,206,170,0.55)"; ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-3.4 + i * 2.8, -12.6);
      ctx.lineTo(-2.2 + i * 2.4, -15.4);
      ctx.stroke();
    }
    // goods on a mat
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(-1.4 + i * 2.0, -7.0, 0.9, 0.55, 0.1, 0, TAU);
      ctx.fillStyle = i % 2 ? "rgba(216,178,102,0.95)" : "rgba(196,164,116,0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(92,64,36,0.4)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // market: salt slabs, gold piles, indigo cloth
    const marketX = -6;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "rgba(236,226,204,0.98)";
      ctx.fillRect(marketX + i * 4.4, -6.4 - (i % 2) * 1.2, 3.4, 1.6);
      ctx.strokeStyle = "rgba(92,64,36,0.4)"; ctx.lineWidth = 0.12;
      ctx.strokeRect(marketX + i * 4.4, -6.4 - (i % 2) * 1.2, 3.4, 1.6);
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(-26 + i * 3.4, -5.2, 1.2, 0, TAU);
      ctx.fillStyle = "rgba(216,178,102,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(120,86,40,0.6)"; ctx.lineWidth = 0.12; ctx.stroke();
    }
    // indigo cloth bales, folded and stacked
    for (let i = 0; i < 3; i++) {
      const bx = 14 + (i % 2) * 1.1;
      const by = -8.6 - i * 1.5;
      ctx.fillStyle = i % 2 ? "rgba(78,94,126,0.95)" : "rgba(68,82,114,0.95)";
      ctx.fillRect(bx, by, 6.2, 2.0);
      ctx.strokeStyle = "rgba(44,54,78,0.6)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(bx, by, 6.2, 2.0);
      ctx.strokeStyle = "rgba(132,150,178,0.5)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(bx + 0.8, by + 0.6); ctx.lineTo(bx + 5.4, by + 0.6); ctx.stroke();
    }
    // horseman
    horse(ctx, 30, -10, 0.50, "rgba(84,64,42,0.97)", t + 0.4, { rider: true, riderCol: "rgba(72,86,118,0.95)", banner: "#a8402c" });
    // people around the market
    for (let i = 0; i < 6; i++) {
      person(ctx, -18 + i * 6.4, -4.2 + (i % 2) * 0.8, 0.30, "rgba(58,42,26,0.98)", {
        phase: t + i, fill: i % 3 === 0 ? "rgba(72,86,118,0.95)" : i % 3 === 1 ? "rgba(168,64,44,0.9)" : "rgba(150,112,74,0.95)",
        hat: i % 2 ? "straw" : "cap",
      });
    }
    // foreground earth + goods
    ctx.fillStyle = "rgba(176,142,96,0.35)";
    ctx.fillRect(-50, -2, 100, 2);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.ellipse(-46 + i * 12.4, -1.0, 2.0, 0.7, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(120,86,52,0.5)"; ctx.fill();
    }
    // dark foreground bank, right corner
    ctx.beginPath();
    ctx.moveTo(38, 0); ctx.lineTo(40, -4.4); ctx.lineTo(46.4, -5.4); ctx.lineTo(50, -2.0); ctx.lineTo(50, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(104,76,48,0.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(60,42,26,0.6)"; ctx.lineWidth = 0.22; ctx.stroke();
    hatch(ctx, 39, -5.2, 11, 5.2, "rgba(50,34,20,0.26)", 1.4, -0.6);
  };

  const maliMap = function (ctx, t) {
    mapFloor(ctx, -8, 50, "#b08a5c", 0.42);
    mudMosque(ctx, 12, -14, 34, 26);
    baobab(ctx, -44, -6, 30, "rgba(86,68,42,0.95)");
    // river
    ctx.beginPath();
    ctx.moveTo(-60, -12); ctx.quadraticCurveTo(-34, -16, -10, -12); ctx.lineTo(-12, -2); ctx.quadraticCurveTo(-36, -6, -60, -2); ctx.closePath();
    ctx.fillStyle = "rgba(110,140,134,0.8)"; ctx.fill();
    canoe(ctx, -34, -8, 1.0, t);
    horse(ctx, 34, -6, 0.6, "rgba(84,64,42,0.97)", t, { rider: true, riderCol: "rgba(72,86,118,0.95)", banner: "#a8402c" });
    for (let i = 0; i < 4; i++) {
      person(ctx, -14 + i * 9, -4, 0.55, "rgba(58,42,26,0.98)", { phase: t + i, fill: i % 2 ? "rgba(72,86,118,0.95)" : "rgba(168,64,44,0.9)", hat: i % 2 ? "straw" : "cap" });
    }
    bird(ctx, 44, -44, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 2B-4. Borobudur · 爪哇曼荼罗 ─────────────────── */
  const borobudurStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -36);
    sky.addColorStop(0, "#d6d8c8");
    sky.addColorStop(0.5, "#e6d6b2");
    sky.addColorStop(1, "#e3c28c");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -36 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, -22, -64, 22, "#e0ad64", 0.3);
    ctx.beginPath(); ctx.arc(-22, -64, 5.2, 0, TAU);
    ctx.fillStyle = "rgba(222,172,96,0.85)"; ctx.fill();
    cloud(ctx, 10, -80, 20, "rgba(248,242,228,0.42)", 0.45);
    cloud(ctx, -34, -88, 12, "rgba(248,242,228,0.35)", 0.35);
    // volcano
    ctx.beginPath();
    ctx.moveTo(26, -28);
    ctx.lineTo(38, -46);
    ctx.lineTo(44, -42);
    ctx.lineTo(52, -30);
    ctx.closePath();
    ctx.fillStyle = "rgba(126,132,118,0.65)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,70,56,0.3)"; ctx.lineWidth = 0.25; ctx.stroke();
    // crater + plume
    ctx.beginPath(); ctx.ellipse(38, -45, 2.2, 0.7, 0, 0, TAU);
    ctx.fillStyle = "rgba(96,82,66,0.8)"; ctx.fill();
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.15 + i * 0.3) % 1;
      ctx.beginPath(); ctx.arc(38 + q * 4, -47 - q * 10, 1.0 + q * 2.2, 0, TAU);
      ctx.fillStyle = "rgba(170,160,144," + (0.16 * (1 - q)) + ")"; ctx.fill();
    }
    // jungle ridge
    ridge(ctx, -50, 8, -30, 5, "rgba(92,104,66,0.55)", 7, 4, -22);
    ridge(ctx, 10, 50, -28, 4, "rgba(92,104,66,0.5)", 13, 4, -22);
    // palms / banana grove
    banana(ctx, -44, -12, 20, 2, "rgba(104,92,54,0.92)");
    banana(ctx, 44, -12, 18, -2, "rgba(104,92,54,0.92)");
    banana(ctx, -37, -11, 13, 1, "rgba(96,86,50,0.9)");
    // warm haze behind the monument
    const hz = ctx.createLinearGradient(0, -34, 0, -16);
    hz.addColorStop(0, "rgba(232,196,148,0)");
    hz.addColorStop(1, "rgba(232,196,148,0.28)");
    ctx.fillStyle = hz;
    ctx.fillRect(-50, -34, 100, 18);
    // Borobudur
    borobudur(ctx, 0, -12, 46, 32);
    // pilgrims on the stair
    const pilgrims = [
      [-1.4, -14, 0.18, "rgba(196,150,78,0.95)"],
      [0.6, -16.4, 0.17, "rgba(240,232,214,0.95)"],
      [-0.6, -19, 0.17, "rgba(196,150,78,0.95)"],
      [1.2, -21.6, 0.16, "rgba(240,232,214,0.95)"],
      [-0.2, -24.2, 0.15, "rgba(196,150,78,0.95)"],
    ];
    pilgrims.forEach(([px, py, ps, pc], i) => {
      person(ctx, px, py, ps, "rgba(58,42,26,0.95)", { phase: t * 0.6 + i, fill: pc, noShadow: true });
    });
    // pilgrims at the base
    person(ctx, -6, -8, 0.28, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(196,150,78,0.95)", staff: true, hat: "straw" });
    person(ctx, -12, -6.4, 0.24, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(240,232,214,0.95)", hat: "straw" });
    person(ctx, 14, -6.8, 0.24, "rgba(58,42,26,0.98)", { phase: t + 4, fill: "rgba(196,150,78,0.95)" });
    person(ctx, 20, -6.2, 0.22, "rgba(58,42,26,0.98)", { phase: t + 5, fill: "rgba(240,232,214,0.95)", staff: true });
    // offering terrace, lower left
    ctx.fillStyle = "rgba(150,146,128,0.98)";
    ctx.fillRect(-44, -3.8, 26, 3.0);
    ctx.strokeStyle = "rgba(74,66,52,0.45)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(-44, -3.8, 26, 3.0);
    ctx.fillStyle = "rgba(168,164,144,0.98)";
    ctx.fillRect(-42, -6.0, 22, 2.2);
    ctx.strokeRect(-42, -6.0, 22, 2.2);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(-38 + i * 4.4, -6.1, 1.0, Math.PI, TAU);
      ctx.fillStyle = i % 2 ? "rgba(206,150,150,0.92)" : "rgba(240,230,204,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,66,52,0.4)"; ctx.lineWidth = 0.14; ctx.stroke();
    }
    // incense burner
    ctx.fillStyle = "rgba(96,86,66,0.95)";
    ctx.fillRect(-24.5, -8.2, 2.2, 2.2);
    ctx.beginPath(); ctx.ellipse(-23.4, -8.2, 1.6, 0.5, 0, 0, TAU);
    ctx.fillStyle = "rgba(120,108,82,0.95)"; ctx.fill();
    for (let i = 0; i < 2; i++) {
      const q = (t * 0.14 + i * 0.5) % 1;
      ctx.beginPath(); ctx.arc(-23.4 + q * 3, -8.6 - q * 7, 0.5 + q * 1.1, 0, TAU);
      ctx.fillStyle = "rgba(214,206,188," + (0.22 * (1 - q)) + ")"; ctx.fill();
    }
    // mist bands
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(244,238,224," + (0.10 + i * 0.03) + ")";
      ctx.beginPath();
      ctx.ellipse(-20 + i * 18, -10 - i * 2.4, 30 - i * 4, 2.2, 0, 0, TAU);
      ctx.fill();
    }
    // birds
    bird(ctx, -10, -74, 1.3, "rgba(67,48,29,0.35)");
    bird(ctx, -2, -78, 0.9, "rgba(67,48,29,0.3)");
  };

  const borobudurMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#a8a088", 0.4);
    // volcano
    ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(34, -46); ctx.lineTo(50, -16); ctx.closePath();
    ctx.fillStyle = "rgba(126,132,118,0.6)"; ctx.fill();
    borobudur(ctx, -4, -6, 52, 38);
    palm(ctx, -46, -6, 22, 3, "rgba(74,66,42,0.9)");
    person(ctx, 18, -5, 0.55, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(196,150,78,0.95)", hat: "straw" });
    person(ctx, 24, -4, 0.5, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(240,232,214,0.95)" });
    bird(ctx, 40, -44, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 2B-5. Tenochtitlan · 特斯科科湖 ───────────────── */
  const tenochStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -34);
    sky.addColorStop(0, "#dfe2d2");
    sky.addColorStop(0.5, "#ecd8b2");
    sky.addColorStop(1, "#e2bd86");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -34 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    glow(ctx, 20, -66, 22, "#dfa85e", 0.32);
    ctx.beginPath(); ctx.arc(20, -66, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(220,166,88,0.88)"; ctx.fill();
    cloud(ctx, -22, -82, 18, "rgba(250,244,228,0.38)", 0.4);
    // volcanoes
    for (const [vx, vw, vh, snow] of [[-10, 24, 22, true], [24, 30, 26, true], [46, 18, 16, false]]) {
      ctx.beginPath();
      ctx.moveTo(vx - vw / 2, -30);
      ctx.lineTo(vx, -30 - vh);
      ctx.lineTo(vx + vw / 2, -30);
      ctx.closePath();
      ctx.fillStyle = "rgba(128,132,118,0.62)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,70,56,0.3)"; ctx.lineWidth = 0.22; ctx.stroke();
      if (snow) {
        ctx.beginPath();
        ctx.moveTo(vx - vw * 0.16, -30 - vh * 0.72);
        ctx.lineTo(vx, -30 - vh);
        ctx.lineTo(vx + vw * 0.14, -30 - vh * 0.74);
        ctx.closePath();
        ctx.fillStyle = "rgba(240,236,222,0.9)"; ctx.fill();
      }
    }
    // lake
    const lake = ctx.createLinearGradient(0, -22, 0, 0);
    lake.addColorStop(0, "#86a5a0");
    lake.addColorStop(0.5, "#6f9490");
    lake.addColorStop(1, "#587c7c");
    ctx.fillStyle = lake;
    ctx.fillRect(-50, -22, 100, 22);
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = "rgba(236,236,216,0.25)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-48, -20 + i * 2.6); ctx.quadraticCurveTo(0, -22 + i * 2.6, 48, -19 + i * 2.6); ctx.stroke();
    }
    // causeways
    for (const cx of [-22, 16]) {
      ctx.beginPath();
      ctx.moveTo(cx - 4, 0); ctx.lineTo(cx - 2, -18); ctx.lineTo(cx + 2, -18); ctx.lineTo(cx + 4, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(196,170,128,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,54,30,0.4)"; ctx.lineWidth = 0.2; ctx.stroke();
      // parapet
      ctx.strokeStyle = "rgba(74,54,30,0.35)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(cx - 4, 0); ctx.lineTo(cx - 2, -18); ctx.moveTo(cx + 4, 0); ctx.lineTo(cx + 2, -18); ctx.stroke();
    }
    // chinampas
    for (const [gx, gy] of [[-44, -18], [-34, -14], [38, -16], [44, -11]]) {
      ctx.fillStyle = "rgba(132,140,82,0.85)";
      ctx.fillRect(gx, gy - 2.6, 7.4, 2.6);
      ctx.strokeStyle = "rgba(74,54,30,0.3)"; ctx.lineWidth = 0.16;
      ctx.strokeRect(gx, gy - 2.6, 7.4, 2.6);
      for (let k = 0; k < 5; k++) {
        ctx.beginPath(); ctx.moveTo(gx + 0.8 + k * 1.4, gy - 2.4); ctx.lineTo(gx + 0.8 + k * 1.4, gy - 0.4);
        ctx.strokeStyle = "rgba(84,108,58,0.7)"; ctx.lineWidth = 0.14; ctx.stroke();
      }
    }
    // island platform under the city
    ctx.fillStyle = "rgba(172,140,100,0.98)";
    ctx.fillRect(-21, -18.4, 46, 4.0);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.28;
    ctx.strokeRect(-21, -18.4, 46, 4.0);
    // stone edge + beach
    ctx.fillStyle = "rgba(226,212,184,0.95)";
    ctx.fillRect(-21, -14.6, 46, 0.8);
    // steps at the causeway landings
    for (const sx of [-22, 16]) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(204,176,132,0.95)";
        ctx.fillRect(sx - 4 + i * 0.8, -18 + i * 0.8, 8 - i * 1.6, 0.8);
      }
    }
    // city: pyramid + houses
    aztecPyramid(ctx, 2, -16, 32, 24);
    for (let i = 0; i < 8; i++) {
      const hx = -38 + i * 9.6;
      if (Math.abs(hx - 2) < 20) continue;
      const hy = -17 + (i % 2) * 1.2;
      // chinampa/island pad
      ctx.fillStyle = "rgba(132,140,82,0.85)";
      ctx.fillRect(hx - 3.0, hy - 0.6, 6.0, 1.8);
      ctx.fillStyle = "rgba(226,210,186,0.95)";
      ctx.fillRect(hx - 2.0, hy - 3.0, 4.0, 3.0);
      ctx.beginPath();
      ctx.moveTo(hx - 3.0, hy - 3.0); ctx.lineTo(hx, hy - 6.0); ctx.lineTo(hx + 3.0, hy - 3.0);
      ctx.closePath();
      ctx.fillStyle = "rgba(150,96,58,0.9)"; ctx.fill();
    }
    // dense island houses
    for (let i = 0; i < 6; i++) {
      const hx = -15 + i * 5.6;
      const hy = -19.4 + (i % 2) * 0.6;
      ctx.fillStyle = "rgba(226,210,186,0.95)";
      ctx.fillRect(hx - 1.8, hy - 2.6, 3.6, 2.6);
      ctx.beginPath();
      ctx.moveTo(hx - 2.6, hy - 2.6); ctx.lineTo(hx, hy - 4.8); ctx.lineTo(hx + 2.6, hy - 2.6);
      ctx.closePath(); ctx.fillStyle = "rgba(150,96,58,0.9)"; ctx.fill();
    }
    // quay shadow
    ctx.fillStyle = "rgba(74,54,30,0.22)";
    ctx.fillRect(-21, -14.8, 46, 0.9);
    // market stalls on the causeway
    for (const [sx, sy] of [[-26, -6], [22, -5]]) {
      ctx.fillStyle = "rgba(186,150,100,0.95)";
      ctx.fillRect(sx - 3, sy - 2.4, 6, 2.4);
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy - 2.4); ctx.lineTo(sx, sy - 5); ctx.lineTo(sx + 4, sy - 2.4); ctx.closePath();
      ctx.fillStyle = "rgba(176,64,44,0.8)"; ctx.fill();
      person(ctx, sx - 0.6, sy - 2.2, 0.22, "rgba(58,42,26,0.96)", { phase: t + 1, fill: "rgba(150,112,74,0.95)", hat: "straw" });
      person(ctx, sx + 1.6, sy - 1.8, 0.20, "rgba(58,42,26,0.96)", { phase: t + 2, fill: "rgba(168,64,44,0.9)" });
    }
    // canoes
    for (const [cx, cy, cs] of [[-30, -8, 0.9], [28, -6, 0.8], [8, -4, 0.7]]) {
      canoe(ctx, cx, cy, cs, t + cx * 0.01);
    }
    // eagle on a cactus
    ctx.strokeStyle = "rgba(74,88,50,0.95)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-40, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-40, -7); ctx.lineTo(-44, -10); ctx.moveTo(-40, -9); ctx.lineTo(-36, -12); ctx.stroke();
    ctx.fillStyle = "rgba(58,46,32,0.95)";
    ctx.beginPath(); ctx.ellipse(-40, -14, 2.4, 1.4, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-38, -14); ctx.lineTo(-34, -16); ctx.lineTo(-37, -12.6); ctx.closePath(); ctx.fill();
    // reeds
    for (let i = 0; i < 10; i++) {
      const rx = -50 + i * 10.4;
      const ry = -1.4 + (i % 2) * 0.4;
      ctx.strokeStyle = "rgba(104,104,60,0.6)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(t + i) * 0.4, ry - 3.0); ctx.stroke();
    }
    // birds
    bird(ctx, 36, -52, 1.3, "rgba(67,48,29,0.35)");
  };

  const tenochMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#8fa39a", 0.45);
    // lake
    ctx.beginPath(); ctx.ellipse(0, -6, 62, 22, 0, 0, TAU);
    ctx.fillStyle = "rgba(96,132,128,0.75)"; ctx.fill();
    // causeway
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-2, -18); ctx.lineTo(2, -18); ctx.lineTo(4, 0); ctx.closePath();
    ctx.fillStyle = "rgba(196,170,128,0.95)"; ctx.fill();
    aztecPyramid(ctx, 0, -10, 36, 26);
    for (const [cx, cy, cs] of [[-30, -4, 1.0], [28, -3, 0.8]]) canoe(ctx, cx, cy, cs, t + cx * 0.01);
    // chinampas
    for (const [gx, gy] of [[-50, -10], [42, -9]]) {
      ctx.fillStyle = "rgba(132,140,82,0.85)"; ctx.fillRect(gx, gy - 3, 9, 3);
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(gx + 1 + k * 1.7, gy - 2.8); ctx.lineTo(gx + 1 + k * 1.7, gy - 0.4); ctx.strokeStyle = "rgba(84,108,58,0.7)"; ctx.lineWidth = 0.2; ctx.stroke(); }
    }
    bird(ctx, 40, -42, 1.8, "rgba(67,48,29,0.4)");
  };

  /* ── 2B-6. Māori reach Aotearoa · 双体独木舟 ────────── */
  const maoriStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -34);
    sky.addColorStop(0, "#5f6d74");
    sky.addColorStop(0.38, "#8d9692");
    sky.addColorStop(0.7, "#d8c39a");
    sky.addColorStop(1, "#e8c88f");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -34 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,88,62,0.05)", 3.0, 5);
    stars(ctx, top, t, 20, 11);
    glow(ctx, 30, -64, 22, "#e0b06a", 0.32);
    ctx.beginPath(); ctx.arc(30, -64, 5.4, 0, TAU);
    ctx.fillStyle = "rgba(224,176,100,0.9)"; ctx.fill();
    cloud(ctx, -18, -80, 18, "rgba(248,240,224,0.35)", 0.4);
    // sea
    const sea = ctx.createLinearGradient(0, -26, 0, 0);
    sea.addColorStop(0, "#5f8288");
    sea.addColorStop(0.5, "#466e76");
    sea.addColorStop(1, "#355a64");
    ctx.fillStyle = sea;
    ctx.fillRect(-50, -26, 100, 26);
    for (let i = 0; i < 12; i++) {
      const wy = -24 + i * 2.1;
      ctx.strokeStyle = "rgba(226,236,224," + (0.12 + (i % 3) * 0.04) + ")";
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      for (let x = -50; x <= 50; x += 7) {
        const yy = wy + Math.sin(x * 0.14 + t * 0.9 + i) * 0.5;
        if (x === -50) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // coast headland
    ctx.beginPath();
    ctx.moveTo(28, -26);
    ctx.quadraticCurveTo(34, -34, 42, -38);
    ctx.quadraticCurveTo(50, -40, 52, -34);
    ctx.lineTo(52, -4);
    ctx.quadraticCurveTo(42, -6, 36, -12);
    ctx.closePath();
    ctx.fillStyle = "rgba(96,108,68,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,50,32,0.4)"; ctx.lineWidth = 0.25; ctx.stroke();
    // forest silhouettes
    for (let i = 0; i < 8; i++) {
      const tx = 32 + i * 2.6;
      const ty = -30 + (i % 3) * 1.4;
      ctx.strokeStyle = "rgba(58,50,32,0.7)"; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(tx, ty - 1.4, 2.2, 2.8, 0, 0, TAU);
      ctx.fillStyle = "rgba(68,84,52,0.9)"; ctx.fill();
    }
    // surf along the foot of the headland
    ctx.beginPath();
    ctx.moveTo(32, -11.2);
    ctx.quadraticCurveTo(42, -8.4, 52, -4.4);
    ctx.strokeStyle = "rgba(236,230,206,0.8)"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(36, -12.6);
    ctx.quadraticCurveTo(44, -9.6, 52, -5.8);
    ctx.strokeStyle = "rgba(236,230,206,0.35)"; ctx.lineWidth = 0.6; ctx.stroke();
    // waka
    waka(ctx, -8, -11, 0.95, t, { sail: "rgba(214,186,140,0.95)" });
    // second waka closing on the coast
    ctx.save(); ctx.globalAlpha = 0.78;
    waka(ctx, 27, -18, 0.24, t + 1.2, { sail: "rgba(196,170,128,0.9)" });
    ctx.restore();
    // foreground wave
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.quadraticCurveTo(-28, -4.6, -2, -1.8);
    ctx.quadraticCurveTo(24, 0.4, 52, -2.8);
    ctx.lineTo(52, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(48,84,94,0.85)"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-52, -0.4); ctx.quadraticCurveTo(-28, -5.0, -2, -2.2); ctx.quadraticCurveTo(24, 0.0, 52, -3.2);
    ctx.strokeStyle = "rgba(238,244,230,0.5)"; ctx.lineWidth = 0.5; ctx.stroke();
    // birds + dolphin
    bird(ctx, -16, -66, 1.4, "rgba(240,236,220,0.6)");
    bird(ctx, -8, -70, 1.0, "rgba(240,236,220,0.5)");
    // dolphin breaking the surface
    ctx.beginPath();
    ctx.moveTo(-33, -4.8);
    ctx.quadraticCurveTo(-37, -7.6, -41, -5.2);
    ctx.quadraticCurveTo(-44.2, -3.8, -45.6, -6.0);
    ctx.lineTo(-45.0, -3.2);
    ctx.quadraticCurveTo(-39, -2.2, -33, -4.8);
    ctx.closePath();
    ctx.fillStyle = "rgba(58,74,82,0.8)"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-38.2, -6.0); ctx.lineTo(-37.2, -8.2); ctx.lineTo(-36.4, -5.8);
    ctx.closePath(); ctx.fill();
  };

  const maoriMap = function (ctx, t) {
    mapFloor(ctx, -8, 50, "#3f6a72", 0.55);
    // coast
    ctx.beginPath();
    ctx.moveTo(20, -10); ctx.quadraticCurveTo(32, -24, 48, -26); ctx.lineTo(52, -6); ctx.quadraticCurveTo(36, -4, 24, -2); ctx.closePath();
    ctx.fillStyle = "rgba(96,108,68,0.9)"; ctx.fill();
    for (let i = 0; i < 6; i++) {
      const tx = 28 + i * 3.4;
      ctx.beginPath(); ctx.ellipse(tx, -14 - (i % 3) * 1.6, 2.4, 3.0, 0, 0, TAU);
      ctx.fillStyle = "rgba(68,84,52,0.9)"; ctx.fill();
    }
    waka(ctx, -10, -8, 0.85, t, { sail: "rgba(214,186,140,0.95)" });
    ctx.save(); ctx.globalAlpha = 0.6;
    waka(ctx, 32, -14, 0.3, t + 1, { sail: "rgba(196,170,128,0.9)" });
    ctx.restore();
    bird(ctx, -34, -46, 1.8, "rgba(240,236,220,0.6)");
    bird(ctx, -26, -50, 1.2, "rgba(240,236,220,0.5)");
  };

  /* ── registry ───────────────────────────────────────────── */
  /* ── 2C-1. Gutenberg · 美因茨印刷坊 ─────────────────── */
  const gutenbergStage = function (ctx, top, t) {
    // plaster wall
    const wall = ctx.createLinearGradient(0, top, 0, -8);
    wall.addColorStop(0, "#c9ac82");
    wall.addColorStop(0.5, "#e4cca4");
    wall.addColorStop(1, "#d2b689");
    ctx.fillStyle = wall;
    ctx.fillRect(-50, top, 100, -8 - top);
    hatch(ctx, -50, top, 100, -8 - top, "rgba(120,92,62,0.045)", 3.0, -0.5);
    // plaster mottling
    for (let i = 0; i < 26; i++) {
      const px = -48 + ((i * 37) % 96);
      const py = top + 10 + ((i * 53) % 70);
      ctx.beginPath();
      ctx.ellipse(px, py, 3 + (i % 4) * 2.2, 1.4 + (i % 3), 0.2, 0, TAU);
      ctx.fillStyle = "rgba(150,112,76," + (0.03 + (i % 5) * 0.012) + ")";
      ctx.fill();
    }
    // timber frame
    const beam = "rgba(92,60,34,0.96)";
    ctx.fillStyle = beam;
    ctx.fillRect(-50, top, 100, 6.0);
    for (const px of [-47, -20, 8, 36]) {
      ctx.fillRect(px, top + 4, 3.0, -top - 12);
      ctx.strokeStyle = "rgba(62,40,22,0.4)"; ctx.lineWidth = 0.2;
      ctx.strokeRect(px, top + 4, 3.0, -top - 12);
    }
    // braces between posts
    ctx.strokeStyle = "rgba(92,60,34,0.85)"; ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-44, top + 10); ctx.lineTo(-23, top + 25);
    ctx.moveTo(11, top + 10); ctx.lineTo(33, top + 25);
    ctx.stroke();
    // wainscot
    ctx.fillStyle = "rgba(150,112,72,0.30)";
    ctx.fillRect(-50, -24, 100, 16);
    ctx.strokeStyle = "rgba(92,62,36,0.3)"; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(-50, -24); ctx.lineTo(50, -24); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      ctx.beginPath(); ctx.moveTo(-50 + i * 8.4, -8); ctx.lineTo(-50 + i * 8.4, -24);
      ctx.strokeStyle = "rgba(92,62,36,0.16)"; ctx.lineWidth = 0.16; ctx.stroke();
    }

    // arched window, left: Mainz roofs and cathedral spire
    const wx = -30, wy = -80, ww = 27, wh = 43;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wx - ww / 2, wy + wh);
    ctx.lineTo(wx - ww / 2, wy + 9);
    ctx.quadraticCurveTo(wx, wy - 8, wx + ww / 2, wy + 9);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.closePath();
    ctx.fillStyle = "rgba(196,216,216,0.92)";
    ctx.fill();
    ctx.save();
    ctx.clip();
    // sky
    const sky = ctx.createLinearGradient(0, wy - 4, 0, wy + wh);
    sky.addColorStop(0, "#aebfc6");
    sky.addColorStop(1, "#eddfbe");
    ctx.fillStyle = sky;
    ctx.fillRect(wx - ww / 2, wy - 10, ww, wh + 10);
    // distant roofs
    for (let i = 0; i < 6; i++) {
      const rx = wx - ww / 2 + i * 5.0;
      const rh = 6 + (i % 3) * 3.0;
      ctx.fillStyle = "rgba(146,116,86,0.8)";
      ctx.fillRect(rx, wy + wh - 18 - rh, 4.4, rh);
      ctx.beginPath();
      ctx.moveTo(rx - 0.5, wy + wh - 18 - rh);
      ctx.lineTo(rx + 2.2, wy + wh - 22 - rh);
      ctx.lineTo(rx + 4.9, wy + wh - 18 - rh);
      ctx.closePath();
      ctx.fillStyle = "rgba(112,74,52,0.85)";
      ctx.fill();
    }
    // cathedral spire
    ctx.fillStyle = "rgba(128,118,104,0.9)";
    ctx.fillRect(wx - 1.8, wy + wh - 42, 5.4, 24);
    ctx.beginPath();
    ctx.moveTo(wx - 2.8, wy + wh - 42);
    ctx.lineTo(wx + 0.9, wy + wh - 56);
    ctx.lineTo(wx + 4.6, wy + wh - 42);
    ctx.closePath();
    ctx.fillStyle = "rgba(100,90,78,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,62,48,0.5)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(wx + 0.9, wy + wh - 56); ctx.lineTo(wx + 0.9, wy + wh - 61); ctx.stroke();
    // tower windows
    ctx.fillStyle = "rgba(64,54,44,0.5)";
    for (let i = 0; i < 3; i++) ctx.fillRect(wx - 0.6, wy + wh - 38 + i * 6, 1.4, 2.6);
    // river glint
    ctx.strokeStyle = "rgba(238,240,226,0.55)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh - 12); ctx.lineTo(wx + ww / 2, wy + wh - 13); ctx.stroke();
    ctx.restore();
    // leaded panes
    ctx.strokeStyle = "rgba(74,58,40,0.55)"; ctx.lineWidth = 0.3;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(wx - ww / 2 + i * ww / 4, wy + 3); ctx.lineTo(wx - ww / 2 + i * ww / 4, wy + wh);
      ctx.stroke();
    }
    for (let i = 1; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + 8 + i * wh / 8); ctx.lineTo(wx + ww / 2, wy + 8 + i * wh / 8);
      ctx.stroke();
    }
    // frame
    ctx.strokeStyle = "rgba(84,56,32,0.95)"; ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(wx - ww / 2 - 0.6, wy + wh + 0.4);
    ctx.lineTo(wx - ww / 2 - 0.6, wy + 9);
    ctx.quadraticCurveTo(wx, wy - 9, wx + ww / 2 + 0.6, wy + 9);
    ctx.lineTo(wx + ww / 2 + 0.6, wy + wh + 0.4);
    ctx.stroke();
    ctx.restore();
    // light shaft
    const lg = ctx.createLinearGradient(wx, wy + 10, wx + 40, -2);
    lg.addColorStop(0, "rgba(255,246,218,0.50)");
    lg.addColorStop(1, "rgba(255,246,218,0.02)");
    ctx.beginPath();
    ctx.moveTo(wx - 9, wy + 16); ctx.lineTo(wx + 9, wy + 16);
    ctx.lineTo(wx + 42, -2); ctx.lineTo(wx + 4, -2);
    ctx.closePath();
    ctx.fillStyle = lg; ctx.fill();

    // floor
    const fl = ctx.createLinearGradient(0, -8, 0, 0);
    fl.addColorStop(0, "rgba(150,108,68,0.95)");
    fl.addColorStop(1, "rgba(122,84,52,0.98)");
    ctx.fillStyle = fl;
    ctx.fillRect(-50, -8, 100, 8);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = "rgba(74,48,28,0.28)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(-50 + i * 11, 0); ctx.lineTo(-32 + i * 7.6, -8); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(74,48,28,0.24)"; ctx.lineWidth = 0.18;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-50, -2 - i * 2); ctx.lineTo(50, -2 - i * 2); ctx.stroke(); }

    // drying line with printed sheets
    ctx.strokeStyle = "rgba(74,50,30,0.7)"; ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(-46, -63);
    ctx.quadraticCurveTo(0, -68, 44, -61);
    ctx.stroke();
    const sheets = [
      [-38, -65, 0.10], [-20, -67, -0.06], [-2, -67, 0.08], [16, -65, -0.08], [32, -63, 0.06],
    ];
    sheets.forEach(([sx, sy, rot], i) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot + Math.sin(t * 0.7 + i) * 0.02);
      ctx.fillStyle = "rgba(246,238,220,0.97)";
      ctx.fillRect(-4.8, 0, 9.6, 12.4);
      ctx.strokeStyle = "rgba(92,64,36,0.3)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(-4.8, 0, 9.6, 12.4);
      ctx.strokeStyle = "rgba(92,64,36,0.4)"; ctx.lineWidth = 0.12;
      for (let k = 0; k < 10; k++) {
        ctx.beginPath(); ctx.moveTo(-3.8, 1.8 + k * 1.0); ctx.lineTo(-0.5, 1.8 + k * 1.0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.6, 1.8 + k * 1.0); ctx.lineTo(3.9, 1.8 + k * 1.0); ctx.stroke();
      }
      ctx.fillStyle = "rgba(168,64,44,0.85)";
      ctx.fillRect(-3.8, 1.5, 1.2, 1.4);
      ctx.restore();
    });

    // book cupboard on the right wall
    ctx.fillStyle = "rgba(112,76,44,0.98)";
    ctx.fillRect(30, -52, 14, 30);
    ctx.strokeStyle = "rgba(56,38,22,0.7)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(30, -52, 14, 30);
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = "rgba(88,60,36,0.98)";
      ctx.fillRect(31, -45 + r * 9, 12, 0.9);
    }
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k % 2 ? "rgba(150,112,74,0.95)" : "rgba(120,60,44,0.95)";
        ctx.fillRect(31.6 + k * 2.1, -52 + r * 9, 1.5, 6.8);
        ctx.strokeStyle = "rgba(58,38,22,0.4)"; ctx.lineWidth = 0.1;
        ctx.strokeRect(31.6 + k * 2.1, -52 + r * 9, 1.5, 6.8);
      }
    }

    // hanging oil lamp
    ctx.strokeStyle = "rgba(64,44,26,0.85)"; ctx.lineWidth = 0.24;
    ctx.beginPath(); ctx.moveTo(-7, top + 6); ctx.lineTo(-7, -40); ctx.stroke();
    ctx.fillStyle = "rgba(96,74,48,0.98)";
    ctx.beginPath();
    ctx.moveTo(-9.8, -40); ctx.lineTo(-4.2, -40); ctx.lineTo(-5.0, -37.2); ctx.lineTo(-9.0, -37.2);
    ctx.closePath(); ctx.fill();
    glow(ctx, -7, -37.6, 6, "#e6b45e", 0.24);

    // pinned proof sheet above the press
    ctx.save();
    ctx.translate(17, -41);
    ctx.rotate(-0.02);
    ctx.fillStyle = "rgba(246,238,220,0.98)";
    ctx.fillRect(-6.4, -8.6, 12.8, 17.2);
    ctx.strokeStyle = "rgba(92,64,36,0.35)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(-6.4, -8.6, 12.8, 17.2);
    // woodcut: a ship under sail
    ctx.strokeStyle = "rgba(74,50,30,0.6)"; ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(-4.6, 1.2); ctx.quadraticCurveTo(0, 3.4, 4.6, 1.0);
    ctx.lineTo(3.8, -0.6); ctx.quadraticCurveTo(0, 0.4, -4.0, -0.6); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -0.8); ctx.lineTo(0, -8.2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.2, -8.0); ctx.quadraticCurveTo(4.2, -6.8, 4.6, -3.6);
    ctx.quadraticCurveTo(2.2, -4.6, 0.2, -4.2); ctx.closePath();
    ctx.fillStyle = "rgba(196,150,78,0.35)"; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(74,50,30,0.45)"; ctx.lineWidth = 0.16;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(-6.2, 3.4 + i * 1.2); ctx.lineTo(6.2, 3.4 + i * 1.2); ctx.stroke();
    }
    ctx.fillStyle = "rgba(168,64,44,0.85)";
    ctx.fillRect(-6.4, 3.0, 1.8, 2.2);
    // pins
    ctx.fillStyle = "rgba(54,38,24,0.9)";
    ctx.beginPath(); ctx.arc(-5.6, -7.8, 0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(5.6, -7.8, 0.5, 0, TAU); ctx.fill();
    ctx.restore();

    // press (focal point, right)
    printingPress(ctx, 16, -2, 0.92, t);
    // ink worker at the press, pulling the bar
    person(ctx, 6.8, -2, 0.36, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(112,86,58,0.96)", hat: "cap", arm: true });
    ctx.strokeStyle = "rgba(58,42,26,0.95)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(7.8, -7.4); ctx.lineTo(12.6, -12.0); ctx.stroke();

    // compositor's bench + type case (left)
    ctx.fillStyle = "rgba(126,88,54,0.98)";
    ctx.fillRect(-24, -15, 13, 1.4);
    ctx.strokeStyle = "rgba(56,38,22,0.7)"; ctx.lineWidth = 0.24;
    ctx.strokeRect(-24, -15, 13, 1.4);
    ctx.fillStyle = "rgba(112,78,46,0.98)";
    ctx.fillRect(-23.2, -15, 1.4, 7);
    ctx.fillRect(-13.4, -15, 1.4, 7);
    typeCase(ctx, -17.4, -15, 11.6, 4.8, t);
    person(ctx, -27.4, -8, 0.30, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(84,104,112,0.96)", hat: "cap", arm: true });
    ctx.strokeStyle = "rgba(58,42,26,0.95)"; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-26.0, -11.6); ctx.lineTo(-22.4, -13.8); ctx.stroke();

    // foreground: stacked folios, loose sorts
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = "rgba(246,238,220,0.99)";
      ctx.fillRect(33.6, -7.2 - i * 0.9, 10.2, 0.9);
      ctx.strokeStyle = "rgba(92,64,36,0.22)"; ctx.lineWidth = 0.1;
      ctx.strokeRect(33.6, -7.2 - i * 0.9, 10.2, 0.9);
    }
    ctx.fillStyle = "rgba(168,64,44,0.85)";
    ctx.fillRect(41.6, -12.4, 1.9, 1.9);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? "rgba(206,198,178,0.9)" : "rgba(178,168,148,0.9)";
      ctx.fillRect(-44 + i * 1.5, -2.4 + (i % 3) * 0.5, 0.7, 0.7);
    }

    // dust in the light
    for (let i = 0; i < 16; i++) {
      const q = (t * 0.12 + i * 0.11) % 1;
      ctx.beginPath();
      ctx.arc(wx - 4 + q * 32, wy + 24 + ((i * 7) % 34) - q * 4, 0.22 + (i % 3) * 0.1, 0, TAU);
      ctx.fillStyle = "rgba(255,248,228," + (0.3 * (1 - q)) + ")"; ctx.fill();
    }
  };

  const gutenbergMap = function (ctx, t) {
    mapFloor(ctx, -10, 48, "#b08a5c", 0.42);
    // wall beam + high window
    ctx.fillStyle = "rgba(92,60,34,0.85)";
    ctx.fillRect(-46, -54, 92, 2.4);
    ctx.fillStyle = "rgba(196,216,216,0.8)";
    ctx.beginPath();
    ctx.moveTo(-34, -22); ctx.lineTo(-34, -42); ctx.quadraticCurveTo(-26, -50, -18, -42); ctx.lineTo(-18, -22);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(74,58,40,0.55)"; ctx.lineWidth = 0.4;
    ctx.stroke();
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-34 + i * 5.3, -20); ctx.lineTo(-34 + i * 5.3, -44); ctx.stroke();
    }
    // drying line with proofs
    ctx.strokeStyle = "rgba(74,50,30,0.7)"; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(-46, -49); ctx.quadraticCurveTo(0, -52, 46, -47); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const sx = -6 + i * 15;
      ctx.fillStyle = "rgba(246,238,220,0.97)";
      ctx.fillRect(sx, -46 + (i % 2) * 1.4, 8.4, 10.4);
      ctx.strokeStyle = "rgba(92,64,36,0.3)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(sx, -46 + (i % 2) * 1.4, 8.4, 10.4);
      ctx.strokeStyle = "rgba(92,64,36,0.35)"; ctx.lineWidth = 0.12;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.moveTo(sx + 0.9, -44.6 + (i % 2) * 1.4 + k * 1.6); ctx.lineTo(sx + 7.5, -44.6 + (i % 2) * 1.4 + k * 1.6); ctx.stroke();
      }
    }
    // press and compositor
    printingPress(ctx, 9, -2, 0.92, t);
    typeCase(ctx, -18, -3, 13, 5.2, t);
    person(ctx, -27, -3, 0.42, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(84,104,112,0.96)", hat: "cap", arm: true });
    person(ctx, 1.6, -2, 0.42, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(112,86,58,0.96)", hat: "cap", arm: true });
    // fore stack
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(246,238,220,0.98)";
      ctx.fillRect(26, -4.0 - i * 0.8, 10, 0.8);
      ctx.strokeStyle = "rgba(92,64,36,0.25)"; ctx.lineWidth = 0.1;
      ctx.strokeRect(26, -4.0 - i * 0.8, 10, 0.8);
    }
  };

  /* ── 2C-2. Vasco da Gama · 卡利卡特外海 ─────────────── */
  const gamaStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -30);
    sky.addColorStop(0, "#cfd6c6");
    sky.addColorStop(0.45, "#ecd9b2");
    sky.addColorStop(1, "#e9c489");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -30 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(108,96,70,0.05)", 3.1, 5);
    glow(ctx, 24, -66, 24, "#dfa85e", 0.34);
    ctx.beginPath(); ctx.arc(24, -66, 5.6, 0, TAU);
    ctx.fillStyle = "rgba(224,172,96,0.9)"; ctx.fill();
    cloud(ctx, -30, -78, 20, "rgba(250,244,228,0.4)", 0.4);
    cloud(ctx, 4, -86, 13, "rgba(250,244,228,0.32)", 0.34);

    // sea
    const sea = ctx.createLinearGradient(0, -30, 0, 0);
    sea.addColorStop(0, "#6e9292");
    sea.addColorStop(0.5, "#567f82");
    sea.addColorStop(1, "#416a70");
    ctx.fillStyle = sea;
    ctx.fillRect(-50, -30, 100, 30);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = "rgba(232,240,226," + (0.18 + (i % 3) * 0.05) + ")";
      ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(-50, -27 + i * 2.7);
      ctx.quadraticCurveTo(0, -28 + i * 2.7 + Math.sin(t * 0.9 + i) * 0.5, 50, -27 + i * 2.7);
      ctx.stroke();
    }
    // sun glitter
    for (let i = 0; i < 8; i++) {
      const q = (t * 0.25 + i * 0.13) % 1;
      ctx.strokeStyle = "rgba(244,224,178," + (0.18 * (1 - q)) + ")";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(20 + i * 0.9, -26 + q * 18);
      ctx.lineTo(26 + i * 0.9, -26 + q * 18);
      ctx.stroke();
    }

    // distant caravel
    ctx.save(); ctx.globalAlpha = 0.6;
    caravel(ctx, -38, -19, 0.42, t + 0.8, { hull: "rgba(120,84,52,0.9)" });
    ctx.restore();

    // main caravel
    ctx.beginPath(); ctx.ellipse(-8, -9.6, 23, 2.4, 0, 0, TAU);
    ctx.fillStyle = "rgba(40,66,70,0.28)"; ctx.fill();
    caravel(ctx, -8, -13, 0.90, t, { hull: "rgba(116,78,48,0.98)" });
    // gunports
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "rgba(64,44,28,0.8)";
      ctx.fillRect(-20 + i * 6.4, -10.4, 1.6, 1.3);
    }
    // Portuguese cross on the mainsail
    ctx.strokeStyle = "rgba(150,56,40,0.85)"; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-3.5, -34.2); ctx.lineTo(-3.5, -23.2);
    ctx.moveTo(-6.9, -31.2); ctx.lineTo(-0.1, -31.2);
    ctx.stroke();
    // wake
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(226,238,226," + (0.22 - i * 0.035) + ")";
      ctx.lineWidth = 0.26;
      ctx.beginPath();
      ctx.moveTo(-28 - i * 3.2, -8.2 + i * 1.1);
      ctx.quadraticCurveTo(-20 - i * 3.2, -6.6 + i * 1.1, -12 - i * 3.2, -7.6 + i * 1.1);
      ctx.stroke();
    }

    // shore: laterite bank on the right
    ctx.beginPath();
    ctx.moveTo(24, -13);
    ctx.quadraticCurveTo(34, -16, 50, -14);
    ctx.lineTo(50, 0);
    ctx.quadraticCurveTo(38, -1.4, 30, -3.4);
    ctx.quadraticCurveTo(25, -6, 24, -13);
    ctx.closePath();
    ctx.fillStyle = "rgba(176,128,78,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,58,34,0.5)"; ctx.lineWidth = 0.26; ctx.stroke();
    // laterite courses
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(112,72,44,0.35)"; ctx.lineWidth = 0.16;
      ctx.beginPath();
      ctx.moveTo(25, -10 + i * 2.1);
      ctx.quadraticCurveTo(38, -8 + i * 2.1, 50, -11 + i * 2.1);
      ctx.stroke();
    }
    // quay edge
    ctx.fillStyle = "rgba(210,192,158,0.95)";
    ctx.fillRect(28, -14.6, 22, 1.4);
    ctx.strokeStyle = "rgba(92,64,36,0.35)"; ctx.lineWidth = 0.16;
    ctx.strokeRect(28, -14.6, 22, 1.4);
    // warehouses
    for (let i = 0; i < 3; i++) {
      const bx = 27 + i * 5.6;
      ctx.fillStyle = "rgba(226,212,184,0.97)";
      ctx.fillRect(bx, -22.4, 4.8, 7.8);
      ctx.strokeStyle = "rgba(92,64,36,0.4)"; ctx.lineWidth = 0.18;
      ctx.strokeRect(bx, -22.4, 4.8, 7.8);
      // tiled roof
      ctx.beginPath();
      ctx.moveTo(bx - 0.8, -22.4); ctx.lineTo(bx + 2.4, -25.2); ctx.lineTo(bx + 5.6, -22.4);
      ctx.closePath();
      ctx.fillStyle = "rgba(150,88,56,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(92,54,34,0.5)"; ctx.lineWidth = 0.16; ctx.stroke();
      // door
      ctx.fillStyle = "rgba(84,54,32,0.7)";
      ctx.fillRect(bx + 1.7, -18.4, 1.5, 3.8);
    }
    // gopuram (Zamorin's temple)
    gopuram(ctx, 40, -14.6, 20, 33);
    // palms
    palm(ctx, 24.5, -14.2, 19, 2.0, "rgba(80,72,44,0.94)");
    palm(ctx, 32.5, -14.6, 14, 1.0, "rgba(80,72,44,0.94)");
    palm(ctx, 49, -14, 17, -2.0, "rgba(80,72,44,0.9)");

    // longboat pulling for shore
    ctx.beginPath();
    ctx.moveTo(7, -1.0);
    ctx.quadraticCurveTo(11, 2.8, 18, 3.0);
    ctx.quadraticCurveTo(26, 3.0, 30, -1.4);
    ctx.lineTo(27.2, -3.4);
    ctx.quadraticCurveTo(18, -1.4, 9.2, -2.6);
    ctx.closePath();
    ctx.fillStyle = "rgba(118,80,48,0.99)"; ctx.fill();
    ctx.strokeStyle = "rgba(52,34,20,0.8)"; ctx.lineWidth = 0.34; ctx.stroke();
    // interior + plank lines
    ctx.beginPath();
    ctx.moveTo(9.6, -1.6);
    ctx.quadraticCurveTo(18, 0.4, 27.6, -1.8);
    ctx.strokeStyle = "rgba(62,42,26,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(11 + i * 5.6, -0.4);
      ctx.quadraticCurveTo(18, 1.8, 25 - i * 1.2, -0.6);
      ctx.strokeStyle = "rgba(74,50,30,0.3)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    person(ctx, 12.2, -2.6, 0.26, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(92,104,122,0.96)", hat: "helmet", noShadow: true });
    person(ctx, 16.6, -2.8, 0.26, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(168,64,44,0.92)", noShadow: true, hat: "cap" });
    person(ctx, 21.2, -2.8, 0.25, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(120,96,64,0.95)", hat: "helmet", noShadow: true, arm: true });
    person(ctx, 25.2, -2.6, 0.24, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(150,112,74,0.95)", noShadow: true });
    // oars
    ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.22;
    for (let i = 0; i < 4; i++) {
      const ox = 12.4 + i * 4.2;
      ctx.beginPath(); ctx.moveTo(ox + 0.4, -3.4); ctx.lineTo(ox - 2.2, 1.8); ctx.stroke();
    }
    // boat banner
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.24;
    ctx.beginPath(); ctx.moveTo(26.8, -3.2); ctx.lineTo(26.8, -10.8); ctx.stroke();
    ctx.fillStyle = "rgba(168,64,44,0.9)";
    const wave = Math.sin(t * 2.0) * 0.6;
    ctx.beginPath();
    ctx.moveTo(27.0, -10.6); ctx.quadraticCurveTo(29.8 + wave, -9.8, 31.0 + wave, -8.4);
    ctx.lineTo(27.0, -7.8); ctx.closePath(); ctx.fill();

    // spice trade on the quay: pepper sacks, ginger, a chest
    for (let i = 0; i < 6; i++) {
      const sx = 30 + (i % 3) * 4.4;
      const sy = -13.0 + Math.floor(i / 3) * 1.7;
      ctx.beginPath();
      ctx.moveTo(sx - 2.0, sy + 0.8);
      ctx.quadraticCurveTo(sx - 2.4, sy - 1.0, sx - 1.2, sy - 1.8);
      ctx.lineTo(sx - 0.4, sy - 2.6);
      ctx.lineTo(sx + 0.4, sy - 2.6);
      ctx.lineTo(sx + 1.2, sy - 1.8);
      ctx.quadraticCurveTo(sx + 2.4, sy - 1.0, sx + 2.0, sy + 0.8);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "rgba(198,164,116,0.99)" : "rgba(184,150,104,0.99)";
      ctx.fill();
      ctx.strokeStyle = "rgba(92,64,36,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
      // tied neck + fold
      ctx.strokeStyle = "rgba(120,84,48,0.8)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(sx - 0.9, sy - 2.2); ctx.lineTo(sx + 0.9, sy - 2.2); ctx.stroke();
      ctx.strokeStyle = "rgba(92,64,36,0.3)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(sx - 1.5, sy - 0.6); ctx.quadraticCurveTo(sx, sy + 0.1, sx + 1.5, sy - 0.6); ctx.stroke();
    }
    ctx.fillStyle = "rgba(132,86,52,0.95)";
    ctx.fillRect(44.6, -16.6, 4.4, 3.6);
    ctx.strokeStyle = "rgba(64,42,26,0.6)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(44.6, -16.6, 4.4, 3.6);
    ctx.strokeStyle = "rgba(196,150,78,0.8)"; ctx.lineWidth = 0.24;
    ctx.beginPath(); ctx.moveTo(44.8, -15.0); ctx.lineTo(48.8, -15.0); ctx.stroke();
    // local catamaran left foreground
    ctx.strokeStyle = "rgba(88,64,40,0.95)"; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.moveTo(-40, -1.4); ctx.lineTo(-26, -1.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-38, -1.4); ctx.lineTo(-36, -4.2); ctx.moveTo(-28, -1.8); ctx.lineTo(-30, -4.6); ctx.stroke();
    ctx.strokeStyle = "rgba(88,64,40,0.8)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-34, -4.2); ctx.lineTo(-32, -4.4); ctx.stroke();
    person(ctx, -34.4, -4.6, 0.16, "rgba(58,42,26,0.96)", { phase: t + 3, fill: "rgba(150,112,74,0.95)", noShadow: true });

    // birds
    bird(ctx, -18, -62, 1.5, "rgba(67,48,29,0.4)");
    bird(ctx, -10, -67, 1.1, "rgba(67,48,29,0.35)");
    bird(ctx, 36, -52, 1.2, "rgba(67,48,29,0.35)");
  };

  const gamaMap = function (ctx, t) {
    mapFloor(ctx, -10, 46, "#4f7b7c", 0.5);
    caravel(ctx, -14, -8, 0.62, t, { hull: "rgba(116,78,48,0.98)" });
    // shore + gopuram
    ctx.beginPath();
    ctx.moveTo(20, -10); ctx.quadraticCurveTo(34, -14, 50, -12); ctx.lineTo(50, 0); ctx.quadraticCurveTo(32, -1, 22, -3); ctx.closePath();
    ctx.fillStyle = "rgba(176,128,78,0.96)"; ctx.fill();
    gopuram(ctx, 38, -12, 14, 26);
    palm(ctx, 25, -12, 17, 2, "rgba(80,72,44,0.94)");
    palm(ctx, 48, -12, 15, -2, "rgba(80,72,44,0.9)");
    person(ctx, 22, -4, 0.45, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(150,112,74,0.95)" });
    bird(ctx, -30, -42, 1.7, "rgba(67,48,29,0.4)");
  };

  function llama(ctx, x, y, s, col, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 1.1, 0, 0, TAU);
    ctx.fillStyle = "rgba(92,62,32,0.16)"; ctx.fill();
    const c = col || "rgba(206,186,150,0.97)";
    const g = Math.sin(t * 1.6) * 0.4;
    ctx.strokeStyle = "rgba(92,70,46,0.9)"; ctx.lineWidth = 0.7;
    // legs
    ctx.beginPath();
    ctx.moveTo(-3.4, -5.4); ctx.lineTo(-3.8 + g, 0);
    ctx.moveTo(-1.4, -5.4); ctx.lineTo(-1.1 - g, 0);
    ctx.moveTo(2.2, -5.4); ctx.lineTo(2.5 - g, 0);
    ctx.moveTo(4.0, -5.4); ctx.lineTo(4.4 + g, 0);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.moveTo(-4.6, -6.0);
    ctx.quadraticCurveTo(-4.4, -9.4, -1.6, -9.6);
    ctx.quadraticCurveTo(2.4, -9.8, 4.8, -8.4);
    ctx.quadraticCurveTo(5.6, -7.4, 4.8, -6.2);
    ctx.quadraticCurveTo(0, -4.8, -4.6, -6.0);
    ctx.closePath();
    ctx.fillStyle = c; ctx.fill();
    ctx.strokeStyle = "rgba(92,70,46,0.6)"; ctx.lineWidth = 0.24; ctx.stroke();
    // wool texture
    ctx.strokeStyle = "rgba(150,126,92,0.35)"; ctx.lineWidth = 0.18;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(-2.6 + i * 2.4, -7.6, 1.4, 0.4, 2.2); ctx.stroke();
    }
    // neck + head
    ctx.beginPath();
    ctx.moveTo(3.4, -8.6);
    ctx.quadraticCurveTo(3.8, -12.6, 4.6, -13.4);
    ctx.lineTo(6.0, -13.2);
    ctx.quadraticCurveTo(5.8, -11.8, 5.2, -9.4);
    ctx.lineTo(4.8, -7.6);
    ctx.closePath();
    ctx.fillStyle = c; ctx.fill();
    ctx.strokeStyle = "rgba(92,70,46,0.6)"; ctx.lineWidth = 0.22; ctx.stroke();
    // head
    ctx.beginPath();
    ctx.ellipse(6.3, -13.6, 1.5, 1.0, 0.2, 0, TAU);
    ctx.fillStyle = c; ctx.fill(); ctx.stroke();
    // ears
    ctx.beginPath();
    ctx.moveTo(5.8, -14.2); ctx.lineTo(5.6, -15.8); ctx.lineTo(6.4, -14.4);
    ctx.moveTo(6.8, -14.2); ctx.lineTo(7.0, -15.7); ctx.lineTo(7.4, -14.0);
    ctx.fillStyle = c; ctx.fill(); ctx.stroke();
    // muzzle + eye
    ctx.fillStyle = "rgba(80,58,40,0.8)";
    ctx.beginPath(); ctx.arc(7.3, -13.5, 0.25, 0, TAU); ctx.fill();
    // tail
    ctx.strokeStyle = "rgba(92,70,46,0.7)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-4.6, -8.0); ctx.quadraticCurveTo(-6.2, -8.8, -6.0, -6.6); ctx.stroke();
    ctx.restore();
  }

  /* ── 2C-3. Fall of the Inca · 卡哈马卡 ─────────────── */
  const incaStage = function (ctx, top, t) {
    // high Andes sky
    const sky = ctx.createLinearGradient(0, top, 0, -40);
    sky.addColorStop(0, "#a9bcc8");
    sky.addColorStop(0.5, "#d6d8c8");
    sky.addColorStop(1, "#ecd8ae");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -40 - top);
    skyHatch(ctx, -50, top, 100, -42 - top, "rgba(92,104,112,0.05)", 3.0, 5);
    glow(ctx, -30, -74, 24, "#e2b46c", 0.3);
    ctx.beginPath(); ctx.arc(-30, -74, 5.2, 0, TAU);
    ctx.fillStyle = "rgba(232,190,114,0.9)"; ctx.fill();
    cloud(ctx, 12, -84, 22, "rgba(250,246,232,0.42)", 0.42);
    cloud(ctx, -44, -90, 14, "rgba(250,246,232,0.3)", 0.3);

    // snow massifs: irregular and overlapping
    const massif = (pts, snow) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = "rgba(130,136,130,0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(82,84,78,0.4)"; ctx.lineWidth = 0.25; ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(-52, -100); ctx.lineTo(52, -100); ctx.lineTo(52, snow);
      for (let i = 10; i >= 0; i--) {
        const x = -50 + i * 10;
        ctx.lineTo(x, snow - 6 + ((i * 7) % 5) * 2.2);
      }
      ctx.closePath();
      const snowG = ctx.createLinearGradient(0, snow - 26, 0, snow + 2);
      snowG.addColorStop(0, "rgba(250,248,238,0.97)");
      snowG.addColorStop(1, "rgba(214,214,204,0.92)");
      ctx.fillStyle = snowG; ctx.fill();
      // rock striations under the snowline
      ctx.strokeStyle = "rgba(96,100,94,0.22)"; ctx.lineWidth = 0.26;
      for (let i = 0; i < 7; i++) {
        const sx = -46 + i * 14 + ((i * 5) % 4);
        ctx.beginPath();
        ctx.moveTo(sx, snow + 2);
        ctx.lineTo(sx + 3.4, snow + 9 + (i % 3) * 2.4);
        ctx.stroke();
      }
      // denser rock hatching below the snowline
      ctx.strokeStyle = "rgba(88,92,86,0.16)"; ctx.lineWidth = 0.2;
      for (let i = 0; i < 14; i++) {
        const sx = -48 + i * 7 + ((i * 3) % 3);
        const sy = snow + 5 + (i % 5) * 5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 4.2, sy + 6.5);
        ctx.stroke();
      }
      ctx.restore();
    };
    massif([[-52, -38], [-47, -52], [-43, -48], [-38, -66], [-33, -58], [-27, -71], [-21, -57], [-15, -49], [-9, -40], [-52, -38]], -62);
    massif([[2, -38], [8, -47], [13, -60], [18, -53], [24, -67], [31, -55], [38, -48], [46, -41], [52, -38], [2, -38]], -56);
    // mid ridge
    ridge(ctx, -50, 50, -37, 4.5, "rgba(94,100,76,0.55)", 11, 5, -28);

    // terraced spur: flat top + stone riser
    for (let i = 0; i < 5; i++) {
      const y = -34 + i * 3.1;
      ctx.beginPath();
      ctx.moveTo(-50, y + 0.6);
      ctx.quadraticCurveTo(-24, y - 2.2, 6, y + 1.6 + i * 0.5);
      ctx.lineTo(16, y + 2.6 + i * 0.5);
      ctx.lineTo(16, y + 4.6 + i * 0.5);
      ctx.quadraticCurveTo(-20, y + 4.0, -50, y + 3.0);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "rgba(126,138,86,0.94)" : "rgba(150,152,92,0.94)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-50, y + 3.0);
      ctx.quadraticCurveTo(-20, y + 4.0, 16, y + 4.6 + i * 0.5);
      ctx.lineTo(16, y + 5.9 + i * 0.5);
      ctx.quadraticCurveTo(-20, y + 5.3, -50, y + 4.3);
      ctx.closePath();
      ctx.fillStyle = "rgba(154,138,108,0.96)"; ctx.fill();
      ctx.strokeStyle = "rgba(92,74,52,0.35)"; ctx.lineWidth = 0.18; ctx.stroke();
      // vertical stone joints on the riser
      ctx.strokeStyle = "rgba(92,74,52,0.22)"; ctx.lineWidth = 0.16;
      for (let k = 0; k < 15; k++) {
        const tx = -48 + k * 6.4;
        ctx.beginPath();
        ctx.moveTo(tx, y + 3.5);
        ctx.lineTo(tx + 0.7, y + 5.7);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(84,96,56,0.35)"; ctx.lineWidth = 0.14;
      for (let k = 0; k < 8; k++) {
        const cx = -46 + k * 7.6;
        ctx.beginPath(); ctx.moveTo(cx, y + 0.2); ctx.lineTo(cx + 5, y + 2.6); ctx.stroke();
      }
    }
    // plaza
    const plaza = ctx.createLinearGradient(0, -19, 0, 0);
    plaza.addColorStop(0, "rgba(180,152,110,0.98)");
    plaza.addColorStop(1, "rgba(150,120,84,0.99)");
    ctx.fillStyle = plaza;
    ctx.fillRect(-50, -19, 100, 19);
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = "rgba(92,68,44,0.14)"; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(-50 + i * 7.4, -19); ctx.lineTo(-34 + i * 5.4, 0); ctx.stroke();
    }
    hatch(ctx, -50, -19, 100, 19, "rgba(92,68,44,0.07)", 2.7, -0.55);
    ctx.strokeStyle = "rgba(120,96,64,0.5)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-50, -19); ctx.lineTo(50, -19); ctx.stroke();

    // Inca hall, right
    const hx = 30, hy = -19, hw = 30, hh = 23;
    ctx.fillStyle = "rgba(166,150,120,0.99)";
    ctx.fillRect(hx - hw / 2, hy - hh, hw, hh);
    ctx.strokeStyle = "rgba(74,64,48,0.6)"; ctx.lineWidth = 0.32;
    ctx.strokeRect(hx - hw / 2, hy - hh, hw, hh);
    const rr = rng(17);
    for (let r = 0; r < 6; r++) {
      let bx = hx - hw / 2 + 0.4 + (r % 2) * 1.2;
      while (bx < hx + hw / 2 - 1.2) {
        const bw = 3.4 + rr() * 2.6;
        const bh = 3.0 + rr() * 1.2;
        const by = hy - hh + 0.6 + r * 3.7;
        ctx.beginPath();
        ctx.moveTo(bx, by + 0.4);
        ctx.lineTo(bx + bw * 0.3, by);
        ctx.lineTo(bx + bw, by + 0.5);
        ctx.lineTo(bx + bw - 0.4, by + bh);
        ctx.lineTo(bx + 0.5, by + bh - 0.2);
        ctx.closePath();
        ctx.strokeStyle = "rgba(88,76,58,0.32)"; ctx.lineWidth = 0.18; ctx.stroke();
        bx += bw + 0.35;
      }
    }
    // thatch roof
    ctx.beginPath();
    ctx.moveTo(hx - hw / 2 - 2, hy - hh);
    ctx.lineTo(hx, hy - hh - 8);
    ctx.lineTo(hx + hw / 2 + 2, hy - hh);
    ctx.closePath();
    ctx.fillStyle = "rgba(164,128,80,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,64,36,0.55)"; ctx.lineWidth = 0.28; ctx.stroke();
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = "rgba(118,88,52,0.4)"; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.moveTo(hx - hw / 2 + i * 3.2, hy - hh - 0.6); ctx.lineTo(hx, hy - hh - 7.4); ctx.stroke();
    }
    // trapezoid door
    ctx.beginPath();
    ctx.moveTo(hx - 3.0, hy); ctx.lineTo(hx - 2.0, hy - 9.2); ctx.lineTo(hx + 2.0, hy - 9.2); ctx.lineTo(hx + 3.0, hy);
    ctx.closePath();
    ctx.fillStyle = "rgba(48,34,24,0.8)"; ctx.fill();

    // litter with Atahualpa
    const lx = -18, ly = -10.4;
    for (const bx of [-5.0, -2.4, 2.4, 5.0]) {
      person(ctx, lx + bx, -2.2, 0.40, "rgba(58,42,26,0.98)", {
        phase: t + bx, fill: "rgba(150,112,74,0.95)", hat: "cap", noShadow: true, arm: true,
      });
      ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(lx + bx, -10.2); ctx.lineTo(lx + bx, ly + 0.3); ctx.stroke();
    }
    ctx.fillStyle = "rgba(196,150,78,0.99)";
    ctx.fillRect(lx - 8.8, ly, 17.6, 2.4);
    ctx.strokeStyle = "rgba(92,58,30,0.65)"; ctx.lineWidth = 0.28;
    ctx.strokeRect(lx - 8.8, ly, 17.6, 2.4);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(lx - 6.4 + i * 3.2, ly + 1.2, 0.62, 0, TAU);
      ctx.fillStyle = "rgba(228,188,100,0.92)"; ctx.fill();
    }
    // canopy
    ctx.strokeStyle = "rgba(74,50,30,0.95)"; ctx.lineWidth = 0.34;
    ctx.beginPath();
    ctx.moveTo(lx - 7.4, ly); ctx.lineTo(lx - 7.4, ly - 11.0);
    ctx.moveTo(lx + 7.4, ly); ctx.lineTo(lx + 7.4, ly - 11.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx - 7.8, ly - 11.0);
    ctx.quadraticCurveTo(lx, ly - 14.2, lx + 7.8, ly - 11.0);
    ctx.lineTo(lx + 7.0, ly - 8.8);
    ctx.quadraticCurveTo(lx, ly - 11.2, lx - 7.0, ly - 8.8);
    ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.94)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,40,28,0.55)"; ctx.lineWidth = 0.22; ctx.stroke();
    ctx.strokeStyle = "rgba(228,188,100,0.9)"; ctx.lineWidth = 0.32;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(lx - 6.4 + i * 2.1, ly - 8.8); ctx.lineTo(lx - 6.4 + i * 2.1, ly - 7.4); ctx.stroke();
    }
    // gold sun disc behind the ruler
    ctx.beginPath(); ctx.arc(lx - 0.6, ly - 8.8, 2.6, 0, TAU);
    ctx.fillStyle = "rgba(228,188,100,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(150,104,48,0.7)"; ctx.lineWidth = 0.24; ctx.stroke();
    ctx.strokeStyle = "rgba(228,188,100,0.9)"; ctx.lineWidth = 0.24;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      ctx.beginPath();
      ctx.moveTo(lx - 0.6 + Math.cos(a) * 3.0, ly - 8.8 + Math.sin(a) * 3.0);
      ctx.lineTo(lx - 0.6 + Math.cos(a) * 4.2, ly - 8.8 + Math.sin(a) * 4.2);
      ctx.stroke();
    }
    // Atahualpa
    seatedPerson(ctx, lx - 0.6, ly + 0.4, 0.40, "rgba(58,42,26,0.98)", { fill: "rgba(196,150,78,0.99)", noShadow: true });
    // feather crown
    for (let i = 0; i < 5; i++) {
      const a = -2.5 + i * 0.5;
      ctx.beginPath();
      ctx.ellipse(lx - 0.6 + Math.cos(a) * 2.0, ly - 8.2 + Math.sin(a) * 1.5, 0.6, 1.9, a + Math.PI / 2, 0, TAU);
      ctx.fillStyle = i % 2 ? "rgba(168,64,44,0.95)" : "rgba(228,188,100,0.95)";
      ctx.fill();
    }
    // fans
    for (const dx of [-4.6, 4.6]) {
      ctx.strokeStyle = "rgba(74,50,30,0.85)"; ctx.lineWidth = 0.24;
      ctx.beginPath(); ctx.moveTo(lx + dx, ly - 2.0); ctx.lineTo(lx + dx + (dx < 0 ? -1.6 : 1.6), ly - 7.6); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(lx + dx + (dx < 0 ? -2.1 : 2.1), ly - 8.6, 1.5, 2.6, dx < 0 ? -0.3 : 0.3, 0, TAU);
      ctx.fillStyle = "rgba(196,150,78,0.92)"; ctx.fill();
      ctx.strokeStyle = "rgba(92,58,30,0.4)"; ctx.lineWidth = 0.16; ctx.stroke();
    }

    // Spanish horsemen, right foreground
    const riders = [
      { x: 6, y: -11.4, s: 0.50, col: "rgba(70,54,36,0.98)", rider: "rgba(150,120,86,0.95)" },
      { x: 20, y: -7.4, s: 0.58, col: "rgba(62,48,34,0.98)", rider: "rgba(92,104,122,0.95)" },
      { x: 36, y: -3.0, s: 0.66, col: "rgba(58,44,30,0.99)", rider: "rgba(150,120,86,0.95)" },
    ];
    riders.forEach((r, i) => {
      horse(ctx, r.x, r.y, r.s, r.col, t + i * 0.4, { rider: true, riderCol: r.rider });
      ctx.beginPath();
      ctx.arc(r.x + 0.2, r.y - 20.9 * r.s, 1.9 * r.s, Math.PI, TAU);
      ctx.strokeStyle = "rgba(214,214,200,0.95)"; ctx.lineWidth = 0.3; ctx.stroke();
    });
    // friar with cross
    person(ctx, 1.4, -9.0, 0.38, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(120,96,66,0.95)", noShadow: true });
    ctx.strokeStyle = "rgba(74,50,30,0.95)"; ctx.lineWidth = 0.32;
    ctx.beginPath(); ctx.moveTo(2.6, -16.6); ctx.lineTo(2.6, -25.0); ctx.moveTo(1.4, -23.2); ctx.lineTo(3.8, -23.2); ctx.stroke();

    // llamas, foreground
    llama(ctx, -40, -2.6, 0.60, "rgba(214,196,160,0.97)", t);
    llama(ctx, -31, -1.2, 0.50, "rgba(198,178,142,0.97)", t + 1.2);
    // dark foreground llama for depth
    llama(ctx, -35.4, -0.4, 0.68, "rgba(96,76,54,0.98)", t + 0.6);

    // stone block, foreground right
    ctx.beginPath();
    ctx.moveTo(22, 0); ctx.lineTo(23.2, -4.6); ctx.lineTo(29.4, -5.4); ctx.lineTo(33.0, -2.8); ctx.lineTo(32.0, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(160,146,118,0.99)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,64,48,0.55)"; ctx.lineWidth = 0.26; ctx.stroke();

    // dust
    for (let i = 0; i < 10; i++) {
      const q = (t * 0.2 + i * 0.12) % 1;
      ctx.beginPath(); ctx.arc(-10 + i * 5.0, -7 - q * 7, 1.4 + q * 2.6, 0, TAU);
      ctx.fillStyle = "rgba(204,176,132," + (0.10 * (1 - q)) + ")"; ctx.fill();
    }
    // foreground polygonal wall corner
    ctx.beginPath();
    ctx.moveTo(-50, 0); ctx.lineTo(-50, -5.2); ctx.lineTo(-46, -6.4); ctx.lineTo(-39, -5.6); ctx.lineTo(-35, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(108,90,64,0.96)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,44,28,0.65)"; ctx.lineWidth = 0.24; ctx.stroke();
    ctx.strokeStyle = "rgba(70,54,36,0.4)"; ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(-46, -6.2); ctx.lineTo(-44.4, -2.4);
    ctx.moveTo(-41, -5.8); ctx.lineTo(-40.2, -1.6);
    ctx.stroke();
  };

  const incaMap = function (ctx, t) {
    mapFloor(ctx, -10, 50, "#8f7f58", 0.4);
    const peak = (px, py, pw, ph, snow) => {
      ctx.beginPath();
      ctx.moveTo(px - pw / 2, py); ctx.lineTo(px, py - ph); ctx.lineTo(px + pw / 2, py);
      ctx.closePath();
      ctx.fillStyle = "rgba(134,138,130,0.85)"; ctx.fill();
      ctx.strokeStyle = "rgba(82,84,78,0.4)"; ctx.lineWidth = 0.22; ctx.stroke();
      const sy = py - ph * (1 - snow);
      ctx.beginPath();
      ctx.moveTo(px - pw * 0.14, sy); ctx.lineTo(px, py - ph); ctx.lineTo(px + pw * 0.14, sy);
      ctx.lineTo(px + pw * 0.04, sy + 2.4); ctx.lineTo(px - pw * 0.03, sy - 1.0);
      ctx.closePath();
      ctx.fillStyle = "rgba(246,242,228,0.92)"; ctx.fill();
    };
    peak(-30, -12, 28, 40, 0.34);
    peak(0, -12, 20, 28, 0.28);
    // terraces
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? "rgba(124,136,84,0.92)" : "rgba(150,152,92,0.92)";
      ctx.fillRect(-50, -20 + i * 4, 100, 4);
      ctx.strokeStyle = "rgba(148,132,106,0.9)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-50, -20 + i * 4); ctx.lineTo(50, -20 + i * 4); ctx.stroke();
    }
    // stone hall
    ctx.fillStyle = "rgba(160,146,118,0.98)";
    ctx.fillRect(22, -26, 22, 16);
    ctx.strokeStyle = "rgba(74,64,48,0.6)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(22, -26, 22, 16);
    ctx.beginPath();
    ctx.moveTo(20.4, -26); ctx.lineTo(33, -33.4); ctx.lineTo(45.6, -26);
    ctx.closePath();
    ctx.fillStyle = "rgba(164,128,80,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,64,36,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.fillStyle = "rgba(48,34,24,0.78)";
    ctx.beginPath();
    ctx.moveTo(30, -10); ctx.lineTo(30.4, -18); ctx.lineTo(35.6, -18); ctx.lineTo(36, -10);
    ctx.closePath(); ctx.fill();
    // litter with the ruler
    const lx = -14, ly = -10;
    for (const bx of [-4.4, -1.6, 1.6, 4.4]) {
      person(ctx, lx + bx, -3.0, 0.22, "rgba(58,42,26,0.98)", { phase: t + bx, fill: "rgba(150,112,74,0.95)", noShadow: true });
    }
    ctx.fillStyle = "rgba(196,150,78,0.99)";
    ctx.fillRect(lx - 6.4, ly, 12.8, 1.8);
    ctx.strokeStyle = "rgba(92,58,30,0.6)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(lx - 6.4, ly, 12.8, 1.8);
    ctx.strokeStyle = "rgba(74,50,30,0.95)"; ctx.lineWidth = 0.25;
    ctx.beginPath();
    ctx.moveTo(lx - 5.6, ly); ctx.lineTo(lx - 5.6, ly - 7.0);
    ctx.moveTo(lx + 5.6, ly); ctx.lineTo(lx + 5.6, ly - 7.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx - 5.9, ly - 7.0); ctx.quadraticCurveTo(lx, ly - 9.4, lx + 5.9, ly - 7.0);
    ctx.lineTo(lx + 5.3, ly - 5.6); ctx.quadraticCurveTo(lx, ly - 7.6, lx - 5.3, ly - 5.6);
    ctx.closePath();
    ctx.fillStyle = "rgba(168,64,44,0.94)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,40,28,0.5)"; ctx.lineWidth = 0.18; ctx.stroke();
    seatedPerson(ctx, lx - 0.4, ly + 0.3, 0.26, "rgba(58,42,26,0.98)", { fill: "rgba(196,150,78,0.99)", noShadow: true });
    // llama + horseman
    llama(ctx, -40, -3, 0.55, "rgba(214,196,160,0.97)", t);
    horse(ctx, 4, -4, 0.55, "rgba(62,48,34,0.98)", t, { rider: true, riderCol: "rgba(92,104,122,0.95)" });
  };

  /* ── 2C-4. French Revolution · 巴士底 ───────────────── */
  const frenchStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -30);
    sky.addColorStop(0, "#c4b39c");
    sky.addColorStop(0.5, "#e6d0a8");
    sky.addColorStop(1, "#e8bb7e");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -30 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(110,86,58,0.05)", 3.0, 5);
    glow(ctx, -30, -68, 22, "#e2b46e", 0.28);
    ctx.beginPath(); ctx.arc(-30, -68, 5.0, 0, TAU);
    ctx.fillStyle = "rgba(232,188,114,0.88)"; ctx.fill();

    // smoke behind the fortress
    for (let i = 0; i < 4; i++) {
      const bx = 2 + i * 12;
      for (let k = 0; k < 9; k++) {
        const q = (t * 0.07 + k * 0.11 + i * 0.3) % 1;
        ctx.beginPath();
        ctx.arc(bx + q * 16, -34 - q * 46, 2.6 + q * 9.0, 0, TAU);
        ctx.fillStyle = "rgba(108,96,86," + (0.09 * (1 - q)) + ")"; ctx.fill();
      }
    }
    bird(ctx, -4, -74, 1.5, "rgba(67,48,29,0.35)");
    bird(ctx, 3, -78, 1.1, "rgba(67,48,29,0.3)");
    bird(ctx, 34, -68, 1.2, "rgba(67,48,29,0.3)");
    // distant Paris roofs, varied
    const rr = rng(23);
    ctx.save();
    ctx.globalAlpha = 0.62;
    for (let i = 0; i < 8; i++) {
      const rw = 6 + rr() * 6;
      const rh = 5 + rr() * 6;
      const rx = -48 + i * 11 + rr() * 2;
      const ry = -27 - rr() * 3;
      ctx.fillStyle = "rgba(118,98,80,0.9)";
      ctx.fillRect(rx, ry - rh, rw, rh);
      ctx.strokeStyle = "rgba(84,66,50,0.16)"; ctx.lineWidth = 0.14;
      for (let yy = ry - rh + 1.2; yy < ry; yy += 2.0) {
        ctx.beginPath(); ctx.moveTo(rx + 0.4, yy); ctx.lineTo(rx + rw - 0.4, yy); ctx.stroke();
      }
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(rx - 0.5, ry - rh); ctx.lineTo(rx + rw * 0.5, ry - rh - 4); ctx.lineTo(rx + rw + 0.5, ry - rh);
        ctx.closePath(); ctx.fillStyle = "rgba(96,74,58,0.9)"; ctx.fill();
      } else {
        ctx.fillStyle = "rgba(96,74,58,0.9)";
        ctx.fillRect(rx + rw * 0.6, ry - rh - 2.4, 1.6, 2.6);
      }
    }
    ctx.restore();
    // left-bank abbey silhouette
    ctx.fillStyle = "rgba(150,132,108,0.5)";
    ctx.fillRect(-37, -38, 17, 14);
    ctx.fillRect(-38, -44, 4.2, 6);
    ctx.fillRect(-30, -46, 4.6, 8);
    ctx.beginPath();
    ctx.moveTo(-31.4, -46); ctx.lineTo(-27.7, -54); ctx.lineTo(-24.0, -46);
    ctx.closePath();
    ctx.fillStyle = "rgba(134,116,94,0.55)"; ctx.fill();
    ctx.fillStyle = "rgba(84,68,52,0.45)";
    ctx.beginPath(); ctx.arc(-33.6, -39.6, 1.4, 0, TAU); ctx.fill();
    // distant cathedral on the right horizon
    ctx.fillStyle = "rgba(146,128,104,0.55)";
    ctx.fillRect(35, -40, 12, 16);
    ctx.fillRect(33.6, -46, 3.6, 6);
    ctx.fillRect(44.8, -46, 3.6, 6);
    ctx.beginPath();
    ctx.moveTo(35.4, -46); ctx.lineTo(37.4, -55); ctx.lineTo(39.4, -46);
    ctx.closePath();
    ctx.fillStyle = "rgba(128,110,90,0.6)"; ctx.fill();
    // spire window slits
    ctx.fillStyle = "rgba(80,64,50,0.5)";
    ctx.fillRect(37.0, -44, 0.9, 2.2);
    ctx.fillRect(46.0, -44, 0.9, 2.2);
    // horizon haze
    const hz = ctx.createLinearGradient(0, -30, 0, -18);
    hz.addColorStop(0, "rgba(198,172,134,0)");
    hz.addColorStop(1, "rgba(198,172,134,0.55)");
    ctx.fillStyle = hz; ctx.fillRect(-50, -30, 100, 12);

    // street
    const gr = ctx.createLinearGradient(0, -12, 0, 0);
    gr.addColorStop(0, "rgba(170,142,104,0.98)");
    gr.addColorStop(1, "rgba(134,106,76,0.99)");
    ctx.fillStyle = gr;
    ctx.fillRect(-50, -12, 100, 12);
    for (let i = 0; i < 26; i++) {
      const cx = -48 + (i % 13) * 7.6;
      const cy = -9.4 + Math.floor(i / 13) * 3.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 2.4, 0.8, 0, 0, TAU);
      ctx.strokeStyle = "rgba(84,62,44,0.22)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    hatch(ctx, -50, -12, 100, 12, "rgba(74,54,36,0.10)", 2.0, -0.35);
    hatch(ctx, -50, -12, 100, 12, "rgba(74,54,36,0.06)", 2.4, 0.42);

    // Bastille (fully in frame)
    bastille(ctx, 18, -12, 36, 26);
    // tricolor above the gate
    ctx.strokeStyle = "rgba(58,40,26,0.9)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(18, -38); ctx.lineTo(18, -52); ctx.stroke();
    const wave = Math.sin(t * 2.0) * 0.9;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(18.3, -51.6);
    ctx.quadraticCurveTo(21.8 + wave, -50.8, 25.4 + wave, -48.8);
    ctx.lineTo(25.4 + wave, -44.8);
    ctx.quadraticCurveTo(21.8 + wave, -47.0, 18.3, -46.2);
    ctx.closePath();
    ctx.clip();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ["rgba(74,104,138,0.96)", "rgba(242,234,214,0.97)", "rgba(168,64,44,0.96)"][i];
      ctx.fillRect(18 + i * 2.5, -53, 2.6, 9);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(18.3, -51.6);
    ctx.quadraticCurveTo(21.8 + wave, -50.8, 25.4 + wave, -48.8);
    ctx.lineTo(25.4 + wave, -44.8);
    ctx.quadraticCurveTo(21.8 + wave, -47.0, 18.3, -46.2);
    ctx.closePath();
    ctx.strokeStyle = "rgba(92,64,36,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();

    // barricade of carts and barrels, left foreground
    const cartX = -38, cartY = -3.0;
    ctx.fillStyle = "rgba(120,84,50,0.98)";
    ctx.beginPath();
    ctx.moveTo(cartX - 8, cartY); ctx.lineTo(cartX - 7, cartY - 4.4); ctx.lineTo(cartX + 6, cartY - 4.4); ctx.lineTo(cartX + 7, cartY);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(64,42,26,0.7)"; ctx.lineWidth = 0.24; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(cartX - 7 + i * 2.4, cartY - 4.4); ctx.lineTo(cartX - 7 + i * 2.4, cartY);
      ctx.strokeStyle = "rgba(84,58,36,0.35)"; ctx.lineWidth = 0.14; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cartX - 5.4, cartY, 2.2, 0, TAU);
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cartX + 4.4, cartY, 2.2, 0, TAU); ctx.stroke();
    // barrels
    for (let i = 0; i < 3; i++) {
      const bx = -24 + i * 4.2;
      ctx.fillStyle = "rgba(128,88,52,0.98)";
      ctx.fillRect(bx - 1.9, -7.2, 3.8, 4.4);
      ctx.strokeStyle = "rgba(64,42,26,0.6)"; ctx.lineWidth = 0.18;
      ctx.strokeRect(bx - 1.9, -7.2, 3.8, 4.4);
      ctx.strokeStyle = "rgba(84,58,36,0.8)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(bx - 1.9, -6.0); ctx.lineTo(bx + 1.9, -6.0); ctx.moveTo(bx - 1.9, -4.2); ctx.lineTo(bx + 1.9, -4.2); ctx.stroke();
    }
    // broken chain on the ground
    ctx.strokeStyle = "rgba(74,62,50,0.9)"; ctx.lineWidth = 0.35;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(-20 + i * 2.4, -1.6 + (i % 2) * 0.4, 1.0, 0.55, 0.3, 0, TAU);
      ctx.stroke();
    }

    // crowd streaming toward the gate
    const crowd = [
      [-30, -8.6, 0.50, "rgba(150,112,74,0.95)", { spear: true }],
      [-25, -5.0, 0.60, "rgba(84,104,122,0.96)", { hat: "cap" }],
      [-20, -9.2, 0.54, "rgba(168,64,44,0.92)", { arm: true }],
      [-14, -5.4, 0.66, "rgba(120,96,64,0.95)", { staff: true }],
      [-9, -8.6, 0.58, "rgba(92,80,62,0.95)", { hat: "cap" }],
      [-3, -4.6, 0.72, "rgba(150,112,74,0.95)", { spear: true }],
      [4, -7.6, 0.62, "rgba(120,96,64,0.95)", {}],
      [10, -3.4, 0.70, "rgba(84,104,122,0.96)", { hat: "cap", arm: true }],
      [16, -7.0, 0.58, "rgba(168,64,44,0.92)", {}],
    ];
    crowd.forEach(([px, py, ps, pc, o], i) => {
      person(ctx, px, py, ps, "rgba(58,42,26,0.98)", Object.assign({ phase: t * 0.7 + i, fill: pc, noShadow: true }, o));
    });
    // children at the front
    person(ctx, -33, -2.4, 0.38, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(168,64,44,0.92)", noShadow: true });
    person(ctx, -12, -2.0, 0.34, "rgba(58,42,26,0.98)", { phase: t + 3, fill: "rgba(84,104,122,0.96)", noShadow: true });
    // drummer
    person(ctx, -34, -4.6, 0.62, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(150,112,74,0.98)", noShadow: true, arm: true });
    ctx.beginPath(); ctx.ellipse(-31.6, -8.2, 2.4, 1.7, 0.1, 0, TAU);
    ctx.fillStyle = "rgba(196,150,78,0.96)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,50,30,0.6)"; ctx.lineWidth = 0.22; ctx.stroke();
    ctx.strokeStyle = "rgba(120,84,48,0.7)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.ellipse(-31.6, -8.2, 1.7, 1.1, 0.1, 0, TAU); ctx.stroke();

    // large tricolor on a pike, carried by the crowd
    ctx.strokeStyle = "rgba(74,50,30,0.95)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-8, -7.4); ctx.lineTo(-6.2, -30); ctx.stroke();
    const w2 = Math.sin(t * 2.2) * 0.8;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-6.2, -29.6);
    ctx.quadraticCurveTo(-2.2, -29.2, 1.8 + w2, -28.0);
    ctx.lineTo(1.8 + w2, -20.0);
    ctx.quadraticCurveTo(-2.2, -21.4, -6.2, -21.8);
    ctx.closePath();
    ctx.clip();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ["rgba(74,104,138,0.95)", "rgba(242,234,214,0.96)", "rgba(168,64,44,0.95)"][i];
      ctx.fillRect(-6.2 + i * 2.67, -31, 2.7, 11);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-6.2, -29.6);
    ctx.quadraticCurveTo(-2.2, -29.2, 1.8 + w2, -28.0);
    ctx.lineTo(1.8 + w2, -20.0);
    ctx.quadraticCurveTo(-2.2, -21.4, -6.2, -21.8);
    ctx.closePath();
    ctx.strokeStyle = "rgba(92,64,36,0.45)"; ctx.lineWidth = 0.2; ctx.stroke();
    // pike tips in the crowd
    for (let i = 0; i < 3; i++) {
      const px = -22 + i * 14;
      ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.28;
      ctx.beginPath(); ctx.moveTo(px, -8); ctx.lineTo(px + 0.8, -24); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + 0.8, -24); ctx.lineTo(px + 0.2, -21.8); ctx.lineTo(px + 1.4, -21.8);
      ctx.closePath(); ctx.fillStyle = "rgba(150,146,132,0.9)"; ctx.fill();
    }

    // forecourt shadow + dust
    ctx.fillStyle = "rgba(92,70,50,0.32)";
    ctx.beginPath();
    ctx.moveTo(-50, 0); ctx.lineTo(-50, -2.8); ctx.quadraticCurveTo(-28, -4.2, -8, -3.0); ctx.lineTo(-8, 0);
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 12; i++) {
      const q = (t * 0.25 + i * 0.1) % 1;
      ctx.beginPath(); ctx.arc(-24 + i * 4.6, -8 - q * 7, 1.4 + q * 2.6, 0, TAU);
      ctx.fillStyle = "rgba(204,176,132," + (0.10 * (1 - q)) + ")"; ctx.fill();
    }
    // dark foreground barricade, right corner
    ctx.beginPath();
    ctx.moveTo(26, 0); ctx.lineTo(28.4, -4.0); ctx.lineTo(39, -4.8); ctx.lineTo(50, -2.2); ctx.lineTo(50, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(96,72,48,0.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(52,36,22,0.7)"; ctx.lineWidth = 0.24; ctx.stroke();
    ctx.strokeStyle = "rgba(70,50,32,0.4)"; ctx.lineWidth = 0.16;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(29 + i * 5.4, -4.4);
      ctx.lineTo(30.4 + i * 5.4, -0.6);
      ctx.stroke();
    }
  };

  const frenchMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#9a7f5c", 0.4);
    bastille(ctx, 10, -8, 40, 30);
    // tricolor
    ctx.strokeStyle = "rgba(58,40,26,0.9)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(2, -30); ctx.lineTo(2, -44); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ["rgba(74,104,138,0.95)", "rgba(242,234,214,0.96)", "rgba(168,64,44,0.95)"][i];
      ctx.fillRect(2.4 + i * 1.7, -43.4, 1.7, 4.6);
    }
    for (let i = 0; i < 4; i++) {
      person(ctx, -34 + i * 9, -4 + (i % 2), 0.5, "rgba(58,42,26,0.98)", { phase: t + i, fill: i % 2 ? "rgba(150,112,74,0.95)" : "rgba(84,104,122,0.96)" });
    }
  };

  /* ── 2C-5. Partition of India · 1947 铁路 ───────────── */
  const partitionStage = function (ctx, top, t) {
    const sky = ctx.createLinearGradient(0, top, 0, -30);
    sky.addColorStop(0, "#b9bfb4");
    sky.addColorStop(0.5, "#d9d0b6");
    sky.addColorStop(1, "#e3c99a");
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -30 - top);
    skyHatch(ctx, -50, top, 100, -32 - top, "rgba(104,102,88,0.055)", 2.9, 5);
    cloud(ctx, -18, -74, 24, "rgba(240,236,220,0.4)", 0.45);
    cloud(ctx, 26, -66, 18, "rgba(240,236,220,0.34)", 0.4);

    // town at the horizon
    const rr = rng(31);
    let bx2 = -47;
    while (bx2 < 47) {
      const bw = 5 + rr() * 5.5;
      const bh = 4 + rr() * 7;
      ctx.fillStyle = "rgba(146,126,96,0.55)";
      ctx.fillRect(bx2, -30 - bh, bw, bh);
      ctx.fillStyle = "rgba(84,70,52,0.4)";
      for (let w = 0; w < 3; w++) {
        ctx.fillRect(bx2 + 1 + w * 1.8, -30 - bh + 1.5 + (w % 2), 0.7, 0.7);
      }
      if (rr() > 0.55) {
        ctx.beginPath();
        ctx.moveTo(bx2 - 0.4, -30 - bh);
        ctx.lineTo(bx2 + bw / 2, -30 - bh - 3.2);
        ctx.lineTo(bx2 + bw + 0.4, -30 - bh);
        ctx.closePath();
        ctx.fillStyle = "rgba(126,106,82,0.6)"; ctx.fill();
      }
      bx2 += bw + 1.2 + rr() * 2.4;
    }
    // clock tower
    ctx.fillStyle = "rgba(126,106,82,0.7)";
    ctx.fillRect(-3, -44, 5.0, 14);
    ctx.beginPath();
    ctx.moveTo(-3.6, -44); ctx.lineTo(-0.5, -49); ctx.lineTo(2.6, -44);
    ctx.closePath(); ctx.fillStyle = "rgba(106,86,66,0.75)"; ctx.fill();
    ctx.beginPath(); ctx.arc(-0.5, -39, 1.5, 0, TAU);
    ctx.fillStyle = "rgba(232,212,168,0.55)"; ctx.fill();
    // water tower
    ctx.strokeStyle = "rgba(104,90,70,0.75)"; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(30, -30); ctx.lineTo(29, -42);
    ctx.moveTo(34, -30); ctx.lineTo(35, -42);
    ctx.moveTo(29, -36); ctx.lineTo(35, -36);
    ctx.stroke();
    ctx.fillStyle = "rgba(126,108,86,0.85)";
    ctx.fillRect(28, -45, 8, 3.4);
    ctx.beginPath(); ctx.ellipse(32, -45, 4, 1.1, 0, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(27.8, -45); ctx.lineTo(32, -48); ctx.lineTo(36.2, -45);
    ctx.closePath(); ctx.fillStyle = "rgba(106,90,70,0.9)"; ctx.fill();

    // ground
    const gnd = ctx.createLinearGradient(0, -30, 0, 0);
    gnd.addColorStop(0, "rgba(170,150,112,0.95)");
    gnd.addColorStop(1, "rgba(140,116,84,0.99)");
    ctx.fillStyle = gnd;
    ctx.fillRect(-50, -30, 100, 30);

    // railway: two tracks converging at (0,-30)
    const track = (offset) => {
      ctx.strokeStyle = "rgba(76,62,48,0.95)";
      for (const side of [-1, 1]) {
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(offset + side * 13, 0);
        ctx.lineTo(side * 1.6, -30);
        ctx.stroke();
      }
      // sleepers
      for (let i = 0; i < 9; i++) {
        const q = i / 9;
        const y = -q * 30;
        const half = (1 - q) * 13 + 1.4;
        ctx.strokeStyle = "rgba(84,66,48,0.55)"; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(offset - half, y); ctx.lineTo(offset + half, y); ctx.stroke();
      }
    };
    track(-24);
    track(24);

    // platform between the tracks
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(2.6, -30); ctx.lineTo(-2.6, -30);
    ctx.closePath();
    ctx.fillStyle = "rgba(188,174,146,0.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(92,74,52,0.4)"; ctx.lineWidth = 0.22; ctx.stroke();
    // paving slabs in perspective
    ctx.strokeStyle = "rgba(92,74,52,0.20)"; ctx.lineWidth = 0.16;
    for (let i = 1; i < 9; i++) {
      const q = i / 9;
      const y = -q * 30;
      const half = (1 - q) * 12 + 2.4;
      ctx.beginPath(); ctx.moveTo(-half, y); ctx.lineTo(half, y); ctx.stroke();
    }
    for (const dx of [-4, 0, 4]) {
      ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx * 0.2, -30); ctx.stroke();
    }
    // platform canopy
    ctx.strokeStyle = "rgba(92,70,46,0.9)"; ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(-4.6, -23);
    ctx.moveTo(12, 0); ctx.lineTo(4.6, -23);
    ctx.moveTo(-7, 0); ctx.lineTo(-2.6, -23);
    ctx.moveTo(7, 0); ctx.lineTo(2.6, -23);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, -22); ctx.lineTo(18, -22); ctx.lineTo(11, -29); ctx.lineTo(-11, -29);
    ctx.closePath();
    ctx.fillStyle = "rgba(112,86,60,0.96)"; ctx.fill();
    ctx.strokeStyle = "rgba(70,50,34,0.6)"; ctx.lineWidth = 0.24; ctx.stroke();
    // ridge and trusses
    ctx.strokeStyle = "rgba(70,50,34,0.8)"; ctx.lineWidth = 0.32;
    ctx.beginPath(); ctx.moveTo(-11, -29); ctx.lineTo(11, -29); ctx.stroke();
    ctx.lineWidth = 0.2;
    for (let x = -14; x <= 14; x += 5.6) {
      ctx.beginPath(); ctx.moveTo(x, -22); ctx.lineTo(x * 0.62, -28.8); ctx.stroke();
    }
    // glazing glints
    ctx.strokeStyle = "rgba(226,220,196,0.35)"; ctx.lineWidth = 0.16;
    for (let x = -12; x <= 12; x += 5.6) {
      ctx.beginPath(); ctx.moveTo(x, -23); ctx.lineTo(x * 0.8, -28); ctx.stroke();
    }
    // hanging lamps
    for (const lx of [-6, 6]) {
      ctx.strokeStyle = "rgba(64,46,30,0.8)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(lx, -29); ctx.lineTo(lx, -26); ctx.stroke();
      ctx.beginPath(); ctx.arc(lx, -25.4, 0.6, 0, TAU);
      ctx.fillStyle = "rgba(226,190,110,0.9)"; ctx.fill();
    }

    // two trains, opposite directions
    steamLoco(ctx, -34, -6, 0.95, t, { phase: 0 });
    ctx.save(); ctx.translate(34, -8); ctx.scale(-1, 1);
    steamLoco(ctx, 0, 0, 1.0, t + 1.5, { phase: 0.3 });
    ctx.restore();

    // two streams of people on the platform
    const people = [
      [-9.0, -2.6, 0.62, "rgba(150,112,74,0.95)", -1],
      [-6.6, -4.6, 0.54, "rgba(84,104,122,0.96)", -1],
      [-4.4, -6.8, 0.48, "rgba(120,96,64,0.95)", -1],
      [-6.8, -8.8, 0.44, "rgba(168,64,44,0.92)", -1],
      [4.4, -6.8, 0.48, "rgba(150,112,74,0.95)", 1],
      [6.8, -4.6, 0.56, "rgba(84,104,122,0.96)", 1],
      [9.0, -2.8, 0.60, "rgba(120,96,64,0.95)", 1],
    ];
    people.forEach(([px, py, ps, pc, dir], i) => {
      person(ctx, px, py, ps, "rgba(58,42,26,0.98)", {
        phase: t * 0.8 + i, fill: pc, noShadow: true, bundle: i % 3 === 0, staff: i === 2 || i === 4,
      });
      // walking direction lean
      ctx.strokeStyle = "rgba(58,42,26,0.5)"; ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(px + dir * 0.2, py + 0.2);
      ctx.lineTo(px + dir * 1.2, py + 0.2);
      ctx.stroke();
    });
    // figures at the far edges of the platform
    person(ctx, -10.8, -5.0, 0.52, "rgba(58,42,26,0.98)", { phase: t + 5, fill: "rgba(150,112,74,0.95)", noShadow: true, bundle: true });
    person(ctx, 10.6, -4.6, 0.54, "rgba(58,42,26,0.98)", { phase: t + 6, fill: "rgba(84,104,122,0.96)", noShadow: true });
    // luggage piles at the platform edges
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = "rgba(132,86,52,0.98)";
      ctx.fillRect(-9.4 + i * 0.4, -3.6 - i * 1.2, 2.4, 1.2);
      ctx.strokeStyle = "rgba(64,42,26,0.6)"; ctx.lineWidth = 0.16;
      ctx.strokeRect(-9.4 + i * 0.4, -3.6 - i * 1.2, 2.4, 1.2);
      ctx.fillStyle = "rgba(170,140,96,0.98)";
      ctx.fillRect(8.6 - i * 0.3, -3.4 - i * 1.0, 2.2, 1.0);
      ctx.strokeRect(8.6 - i * 0.3, -3.4 - i * 1.0, 2.2, 1.0);
    }
    // boundary line + marker, foreground
    ctx.strokeStyle = "rgba(246,238,220,0.95)"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-12, -0.8);
    ctx.quadraticCurveTo(0, -2.0, 12, -0.8);
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,96,64,0.5)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(-12, -1.5); ctx.quadraticCurveTo(0, -2.7, 12, -1.5); ctx.stroke();
    // marker stone
    ctx.fillStyle = "rgba(236,226,204,0.99)";
    ctx.fillRect(0.4, -5.8, 2.0, 5.2);
    ctx.strokeStyle = "rgba(92,74,52,0.65)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(0.4, -5.8, 2.0, 5.2);
    ctx.beginPath(); ctx.moveTo(1.0, -5.6); ctx.lineTo(1.6, -3.4); ctx.lineTo(1.0, -1.2);
    ctx.strokeStyle = "rgba(92,74,52,0.7)"; ctx.lineWidth = 0.2; ctx.stroke();
    // suitcase at the line
    ctx.fillStyle = "rgba(132,86,52,0.98)";
    ctx.fillRect(4.2, -3.2, 3.0, 2.0);
    ctx.strokeStyle = "rgba(64,42,26,0.7)"; ctx.lineWidth = 0.18;
    ctx.strokeRect(4.2, -3.2, 3.0, 2.0);
    ctx.strokeStyle = "rgba(196,150,78,0.9)"; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(4.6, -3.2); ctx.lineTo(4.6, -4.0); ctx.lineTo(6.8, -4.0); ctx.lineTo(6.8, -3.2); ctx.stroke();
    // handcart with bundles, foreground left
    ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-16, -1.6); ctx.lineTo(-8, -1.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(-15.2, -0.8, 0.9, 0, TAU); ctx.arc(-9.4, -0.8, 0.9, 0, TAU);
    ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.25; ctx.stroke();
    ctx.fillStyle = "rgba(170,140,96,0.98)";
    ctx.fillRect(-15.4, -4.2, 6.8, 2.6);
    ctx.strokeStyle = "rgba(92,64,36,0.4)"; ctx.lineWidth = 0.16;
    ctx.strokeRect(-15.4, -4.2, 6.8, 2.6);

    // monsoon haze
    const hz = ctx.createLinearGradient(0, -30, 0, -12);
    hz.addColorStop(0, "rgba(226,212,180,0)");
    hz.addColorStop(1, "rgba(226,212,180,0.35)");
    ctx.fillStyle = hz; ctx.fillRect(-50, -30, 100, 18);
    // light rain
    for (let i = 0; i < 26; i++) {
      const q = (t * 0.5 + i * 0.07) % 1;
      ctx.strokeStyle = "rgba(240,236,220," + (0.16 * (1 - q)) + ")";
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.moveTo(-46 + i * 3.6, -34 + q * 30);
      ctx.lineTo(-45.4 + i * 3.6, -31 + q * 30);
      ctx.stroke();
    }
    // foreground traveler with a bedroll
    person(ctx, -13.4, -0.4, 0.62, "rgba(44,32,22,0.99)", { phase: t + 7, fill: "rgba(88,70,52,0.98)", noShadow: true, bundle: true });
    ctx.fillStyle = "rgba(96,70,46,0.98)";
    ctx.fillRect(-17.2, -1.6, 2.8, 1.6);
    ctx.strokeStyle = "rgba(54,38,24,0.7)"; ctx.lineWidth = 0.18;
    ctx.strokeRect(-17.2, -1.6, 2.8, 1.6);
    // dark foreground luggage cart, right corner
    ctx.fillStyle = "rgba(86,64,44,0.95)";
    ctx.fillRect(31, -3.6, 13, 2.4);
    ctx.strokeStyle = "rgba(46,32,20,0.7)"; ctx.lineWidth = 0.22;
    ctx.strokeRect(31, -3.6, 13, 2.4);
    ctx.beginPath(); ctx.arc(33.4, -0.6, 1.1, 0, TAU);
    ctx.arc(41.6, -0.6, 1.1, 0, TAU);
    ctx.strokeStyle = "rgba(46,32,20,0.8)"; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.fillStyle = "rgba(150,118,82,0.98)";
    ctx.fillRect(32.2, -5.8, 5.2, 2.2);
    ctx.fillRect(38.4, -6.4, 4.6, 2.8);
    ctx.strokeStyle = "rgba(60,42,26,0.5)"; ctx.lineWidth = 0.16;
    ctx.strokeRect(32.2, -5.8, 5.2, 2.2);
    ctx.strokeRect(38.4, -6.4, 4.6, 2.8);
  };

  const partitionMap = function (ctx, t) {
    mapFloor(ctx, -8, 48, "#8f7a58", 0.4);
    // tracks converging
    ctx.strokeStyle = "rgba(76,62,48,0.9)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(0, -30); ctx.moveTo(-18, 0); ctx.lineTo(0, -30);
    ctx.moveTo(18, 0); ctx.lineTo(0, -30); ctx.moveTo(30, 0); ctx.lineTo(0, -30); ctx.stroke();
    // platform
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(2, -30); ctx.lineTo(-2, -30); ctx.closePath();
    ctx.fillStyle = "rgba(188,174,146,0.96)"; ctx.fill();
    steamLoco(ctx, -20, -5, 0.75, t);
    ctx.save(); ctx.translate(20, -6); ctx.scale(-1, 1); steamLoco(ctx, 0, 0, 0.75, t + 1); ctx.restore();
    for (let i = 0; i < 3; i++) {
      person(ctx, -4 + i * 4, -3, 0.5, "rgba(58,42,26,0.98)", { phase: t + i, fill: i % 2 ? "rgba(150,112,74,0.95)" : "rgba(84,104,122,0.96)" });
    }
  };

  /* ── 2C-6. The World Wide Web · CERN 1991 ───────────── */
  const webStage = function (ctx, top, t) {
    // night wall
    const wall = ctx.createLinearGradient(0, top, 0, 0);
    wall.addColorStop(0, "#26333a");
    wall.addColorStop(0.55, "#33434a");
    wall.addColorStop(1, "#3d4d52");
    ctx.fillStyle = wall;
    ctx.fillRect(-50, top, 100, -top);
    hatch(ctx, -50, top, 100, -top, "rgba(126,148,152,0.035)", 3.4, -0.55);
    // window, right: night over the plain
    ctx.fillStyle = "rgba(18,28,34,0.95)";
    ctx.fillRect(10, -72, 30, 26);
    const win = ctx.createLinearGradient(0, -72, 0, -46);
    win.addColorStop(0, "#1c2f3c");
    win.addColorStop(1, "#33505c");
    ctx.fillStyle = win; ctx.fillRect(11, -71, 28, 24);
    // distant lights
    for (let i = 0; i < 12; i++) {
      const lx = 12 + (i * 13 % 26);
      const ly = -50 - (i * 7 % 9);
      ctx.fillStyle = "rgba(224,190,120," + (0.4 + (i % 3) * 0.2) + ")";
      ctx.fillRect(lx, ly, 0.9, 0.9);
    }
    ctx.strokeStyle = "rgba(120,140,146,0.7)"; ctx.lineWidth = 0.4;
    ctx.strokeRect(10, -72, 30, 26);
    ctx.beginPath(); ctx.moveTo(25, -72); ctx.lineTo(25, -46); ctx.moveTo(10, -59); ctx.lineTo(40, -59); ctx.stroke();

    // whiteboard with link diagram, left
    ctx.fillStyle = "rgba(228,226,214,0.92)";
    ctx.fillRect(-46, -64, 26, 18);
    ctx.strokeStyle = "rgba(120,124,120,0.8)"; ctx.lineWidth = 0.4;
    ctx.strokeRect(-46, -64, 26, 18);
    const nodes = [[-40, -59], [-32, -61], [-36, -52], [-27, -55], [-22, -60], [-43, -49]];
    ctx.strokeStyle = "rgba(78,96,104,0.8)"; ctx.lineWidth = 0.35;
    for (let i = 0; i < nodes.length - 1; i++) {
      ctx.beginPath(); ctx.moveTo(nodes[i][0], nodes[i][1]); ctx.lineTo(nodes[i + 1][0], nodes[i + 1][1]); ctx.stroke();
    }
    nodes.forEach(([nx, ny], i) => {
      ctx.beginPath(); ctx.arc(nx, ny, 1.1, 0, TAU);
      ctx.fillStyle = i % 2 ? "rgba(168,64,44,0.85)" : "rgba(74,104,122,0.9)"; ctx.fill();
    });

    // server rack, left foreground
    ctx.fillStyle = "rgba(42,48,50,0.99)";
    ctx.fillRect(-48, -34, 9.0, 34);
    ctx.strokeStyle = "rgba(24,28,30,0.8)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(-48, -34, 9.0, 34);
    for (let r = 0; r < 8; r++) {
      ctx.fillStyle = "rgba(56,62,64,0.98)";
      ctx.fillRect(-47, -32 + r * 4.0, 7.0, 2.6);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = (Math.sin(t * 2 + r + k) > 0.2) ? "rgba(120,200,190,0.9)" : "rgba(196,120,80,0.8)";
        ctx.fillRect(-46.2 + k * 1.6, -31.2 + r * 4.0, 0.7, 0.7);
      }
    }

    // desk with workstation
    workstation(ctx, -6, -5, 0.95, t);
    // researcher beside the desk
    person(ctx, 8.2, -2.0, 0.55, "rgba(58,42,26,0.98)", { phase: t + 1, fill: "rgba(214,206,188,0.96)", noShadow: true, arm: true });
    ctx.strokeStyle = "rgba(58,42,26,0.9)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(7.4, -8.2); ctx.lineTo(4.2, -10.4); ctx.stroke();
    // screen pool
    glow(ctx, -6, -13, 14, "#6fa3a0", 0.16);
    // high shelf with binders
    ctx.fillStyle = "rgba(104,78,52,0.95)";
    ctx.fillRect(-48, -96, 34, 1.4);
    ctx.strokeStyle = "rgba(54,42,30,0.6)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(-48, -96, 34, 1.4);
    for (let i = 0; i < 8; i++) {
      const bw = 3.0 + (i % 3) * 0.5;
      const bh = 4.6 + (i % 4) * 0.8;
      ctx.fillStyle = ["rgba(74,104,122,0.92)", "rgba(120,96,64,0.92)", "rgba(168,64,44,0.85)"][i % 3];
      ctx.fillRect(-47 + i * 4.2, -96 - bh, bw, bh);
      ctx.strokeStyle = "rgba(40,36,30,0.5)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(-47 + i * 4.2, -96 - bh, bw, bh);
    }
    // wall clock
    ctx.beginPath(); ctx.arc(-32, -86, 4.6, 0, TAU);
    ctx.fillStyle = "rgba(226,220,204,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,68,58,0.8)"; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-32, -86); ctx.lineTo(-32, -89.2);
    ctx.moveTo(-32, -86); ctx.lineTo(-29.4, -85.2);
    ctx.strokeStyle = "rgba(58,52,44,0.9)"; ctx.lineWidth = 0.3; ctx.stroke();

    // network globe on the wall
    netGlobe(ctx, 26, -44, 17, t);

    // desk lamp
    ctx.strokeStyle = "rgba(58,50,40,0.9)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-20, -5.6); ctx.lineTo(-20, -16); ctx.lineTo(-16.4, -18.4); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-15.2, -19.0, 3.2, 1.6, -0.3, 0, TAU);
    ctx.fillStyle = "rgba(196,150,78,0.95)"; ctx.fill();
    glow(ctx, -15.2, -18.8, 11, "#e6b45e", 0.28);

    // floor
    ctx.fillStyle = "rgba(38,44,46,0.99)";
    ctx.fillRect(-50, -3.0, 100, 3.0);
    ctx.strokeStyle = "rgba(90,110,112,0.18)"; ctx.lineWidth = 0.2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(-50 + i * 13, -3.0); ctx.lineTo(-38 + i * 9, 0); ctx.stroke();
    }
    // cables
    ctx.strokeStyle = "rgba(20,24,26,0.9)"; ctx.lineWidth = 0.32;
    ctx.beginPath();
    ctx.moveTo(-39, -3); ctx.quadraticCurveTo(-30, -1.4, -18, -3.2);
    ctx.moveTo(-4, -5.0); ctx.quadraticCurveTo(0, -2.2, 6, -3.0);
    ctx.stroke();
    // screen glow reflection on the floor
    glow(ctx, -4, -6, 18, "#6fa3a0", 0.12);
    glow(ctx, -16, -3.4, 10, "#e6b45e", 0.10);
    glow(ctx, 26, -3, 13, "#7fb2b0", 0.07);
    // desk clutter: books and a phone
    ctx.fillStyle = "rgba(96,78,58,0.96)";
    ctx.fillRect(-19.0, -7.2, 3.8, 1.1);
    ctx.fillRect(-18.4, -8.2, 2.9, 1.0);
    ctx.strokeStyle = "rgba(50,40,30,0.5)"; ctx.lineWidth = 0.12;
    ctx.strokeRect(-19.0, -7.2, 3.8, 1.1);
    ctx.strokeRect(-18.4, -8.2, 2.9, 1.0);
    ctx.fillStyle = "rgba(186,178,160,0.95)";
    ctx.fillRect(9.4, -6.8, 3.2, 1.5);
    ctx.strokeStyle = "rgba(80,74,64,0.5)"; ctx.lineWidth = 0.14;
    ctx.strokeRect(9.4, -6.8, 3.2, 1.5);
    ctx.beginPath(); ctx.arc(10.4, -6.8, 0.35, 0, TAU);
    ctx.fillStyle = "rgba(60,56,50,0.8)"; ctx.fill();
    // foreground chair, right corner
    ctx.fillStyle = "rgba(30,34,36,0.97)";
    ctx.fillRect(36, -3.0, 11, 1.4);
    ctx.fillRect(36, -12.4, 10, 1.8);
    ctx.fillRect(36, -12.4, 1.5, 9.4);
    ctx.fillRect(44.5, -12.4, 1.5, 9.4);
    ctx.strokeStyle = "rgba(80,96,98,0.35)"; ctx.lineWidth = 0.2;
    ctx.strokeRect(36, -12.4, 10, 9.4);
  };

  const webMap = function (ctx, t) {
    mapFloor(ctx, -8, 46, "#33454c", 0.55);
    netGlobe(ctx, 8, -30, 17, t);
    workstation(ctx, -22, -4, 0.9, t);
    person(ctx, -6, -3, 0.5, "rgba(58,42,26,0.98)", { phase: t, fill: "rgba(74,104,122,0.96)" });
    ctx.strokeStyle = "rgba(120,200,190,0.5)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(-2, -4); ctx.stroke();
  };

  const SCENES = {
    "song-dynasty": { stage: songStage, map: songMap, title: "Song Dynasty" },
    "qing-takes-beijing": { stage: qingStage, map: qingMap, title: "Qing Takes Beijing" },
    "founding-of-rome": { stage: romeStage, map: romeMap, title: "Founding of Rome" },
    "russian-revolution": { stage: russianStage, map: russianMap, title: "Russian Revolution" },
    "taj-mahal": { stage: tajStage, map: tajMap, title: "Taj Mahal" },
    "cai-lun-improves-papermaking": { stage: cailunStage, map: cailunMap, title: "Cai Lun Improves Papermaking" },
    "peloponnesian-war": { stage: pelopStage, map: pelopMap, title: "Peloponnesian War" },
    "zheng-hes-voyages": { stage: zhengStage, map: zhengMap, title: "Zheng He's Voyages" },
    "columbus-reaches-the-americas": { stage: columbusStage, map: columbusMap, title: "Columbus Reaches the Americas" },
    "xuanzangs-journey-to-the-west": { stage: xuanzangStage, map: xuanzangMap, title: "Xuanzang's Journey to the West" },
    "apollo-11": { stage: apolloStage, map: apolloMap, title: "Apollo 11" },
    "hiroshima": { stage: hiroshimaStage, map: hiroshimaMap, title: "Hiroshima" },
    "nagasaki": { stage: nagasakiStage, map: nagasakiMap, title: "Nagasaki" },
    "japan-announces-surrender": { stage: japanSurrenderStage, map: japanSurrenderMap, title: "Japan Announces Surrender" },
    "pyramids-of-giza": { stage: gizaStage, map: gizaMap, title: "Pyramids of Giza" },
    "code-of-hammurabi": { stage: hammurabiStage, map: hammurabiMap, title: "Code of Hammurabi" },
    "athenian-democracy": { stage: athensStage, map: athensMap, title: "Athenian Democracy" },
    "qin-unifies-china": { stage: qinStage, map: qinMap, title: "Qin Unifies China" },
    "maurya-empire": { stage: mauryaStage, map: mauryaMap, title: "Maurya Empire" },
    "the-silk-road": { stage: silkStage, map: silkMap, title: "The Silk Road" },
    "the-hijra": { stage: hijraStage, map: hijraMap, title: "The Hijra" },
    "genghis-khan": { stage: genghisStage, map: genghisMap, title: "Genghis Khan" },
    "mali-empire": { stage: maliStage, map: maliMap, title: "Mali Empire" },
    "borobudur": { stage: borobudurStage, map: borobudurMap, title: "Borobudur" },
    "tenochtitlan-founded": { stage: tenochStage, map: tenochMap, title: "Tenochtitlan Founded" },
    "maori-reach-aotearoa": { stage: maoriStage, map: maoriMap, title: "Māori Reach Aotearoa" },
    "gutenbergs-press": { stage: gutenbergStage, map: gutenbergMap, title: "Gutenberg's Press" },
    "vasco-da-gama-reaches-india": { stage: gamaStage, map: gamaMap, title: "Vasco da Gama Reaches India" },
    "fall-of-the-inca": { stage: incaStage, map: incaMap, title: "Fall of the Inca" },
    "french-revolution": { stage: frenchStage, map: frenchMap, title: "French Revolution" },
    "partition-of-india": { stage: partitionStage, map: partitionMap, title: "Partition of India" },
    "the-world-wide-web": { stage: webStage, map: webMap, title: "The World Wide Web" },
  };

  function has(id) { return !!(id && SCENES[id]); }
  function title(id) { return SCENES[id] ? SCENES[id].title : ""; }

  function drawStage(ctx, id, W, H, t) {
    const sc = SCENES[id];
    if (!sc || !sc.stage) return false;
    stage(ctx, W, H, t, (c, top, tt) => sc.stage(c, top, tt));
    return true;
  }

  function drawMap(ctx, id, x, y, s, t) {
    const sc = SCENES[id];
    if (!sc || !sc.map) return false;
    mapWrap(ctx, x, y, s, t, (c, tt) => sc.map(c, tt));
    return true;
  }

  window.HeroScenes = { has, title, drawStage, drawMap, list: () => Object.keys(SCENES), stage, mapWrap };
})();
