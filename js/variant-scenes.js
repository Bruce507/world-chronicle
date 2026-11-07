/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Tier B variant scenes
   Parameter-driven families (siege / caravel / modern-founding)
   under one print grammar. 15 pilot events, each a variant of a
   family rather than an independent hero composition.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const INK = "#43301d";
  const RED = "#a8402c";

  const PAL = {
    dawn: { top: "#d9d2bd", mid: "#ecd6ae", low: "#e7c086", sun: "#e2b06a" },
    noon: { top: "#cfd8cd", mid: "#e8ddbc", low: "#e0c08a", sun: "#dfae5e" },
    dusk: { top: "#b98f7a", mid: "#d9a06e", low: "#b86f4e", sun: "#e0a060" },
    storm: { top: "#8f9a98", mid: "#a9a89a", low: "#b5a184", sun: "#c9b07a" },
    snow: { top: "#cfd4d2", mid: "#dfe0d4", low: "#d8cbb0", sun: "#d9c79a" },
    night: { top: "#2f3a4a", mid: "#4a4c52", low: "#8a6f5a", sun: "#e0c080" },
  };

  function rng(seed) {
    let s = Math.floor(seed * 9301 + 49297) % 233280 || 12345;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function glow(ctx, x, y, r, color, a) {
    let c0, c1;
    if (color.charAt(0) === "#") {
      const n = parseInt(color.slice(1), 16);
      const rgb = ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
      c0 = "rgba(" + rgb + "," + a + ")";
      c1 = "rgba(" + rgb + ",0)";
    } else {
      c0 = color.replace("rgb(", "rgba(").replace(")", "," + a + ")");
      c1 = color.replace("rgb(", "rgba(").replace(")", ",0)");
    }
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function cloud(ctx, x, y, w, col, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, w * 0.16, 0, 0, TAU);
    ctx.ellipse(x - w * 0.22, y + w * 0.05, w * 0.28, w * 0.12, 0, 0, TAU);
    ctx.ellipse(x + w * 0.26, y + w * 0.04, w * 0.24, w * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function sky(ctx, top, pal, sunX) {
    const sky = ctx.createLinearGradient(0, top, 0, -32);
    sky.addColorStop(0, pal.top);
    sky.addColorStop(0.55, pal.mid);
    sky.addColorStop(1, pal.low);
    ctx.fillStyle = sky;
    ctx.fillRect(-50, top, 100, -32 - top);
    glow(ctx, sunX, -66, 22, pal.sun, 0.32);
    ctx.beginPath(); ctx.arc(sunX, -66, 5.2, 0, TAU);
    ctx.fillStyle = pal.sun; ctx.globalAlpha = 0.75; ctx.fill(); ctx.globalAlpha = 1;
  }

  /* ── brushes ───────────────────────────────────────────── */
  function p(ctx, x, y, s, col, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (!o.noShadow) {
      ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 0.95, 0, 0, TAU);
      ctx.fillStyle = "rgba(92,62,32,0.17)"; ctx.fill();
    }
    const ph = o.phase || 0;
    const sw = Math.sin(ph * 2.4 + (o.seed || 0)) * 0.55;
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-1.2, -6.2); ctx.lineTo(-1.6 + sw, 0);
    ctx.moveTo(1.2, -6.2); ctx.lineTo(1.6 - sw, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -15.2);
    ctx.quadraticCurveTo(-2.2, -12.2, -3.0, -6.2);
    ctx.lineTo(-3.5, -4.2); ctx.lineTo(3.5, -4.2); ctx.lineTo(3.0, -6.2);
    ctx.quadraticCurveTo(2.2, -12.2, 0, -15.2);
    ctx.closePath();
    ctx.fillStyle = o.fill || col; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -17.0, 1.6, 0, TAU);
    ctx.fillStyle = o.skin || "#c08e5e"; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 0.36; ctx.stroke();
    if (o.hat === "cap") {
      ctx.beginPath(); ctx.ellipse(0, -18.4, 1.8, 0.6, 0, 0, TAU);
      ctx.fillStyle = o.hatCol || col; ctx.fill();
    } else if (o.hat === "straw") {
      ctx.beginPath(); ctx.ellipse(0, -17.4, 3.1, 0.7, 0, 0, TAU);
      ctx.fillStyle = "#c9a76b"; ctx.fill();
    } else if (o.hat === "helmet") {
      ctx.beginPath(); ctx.arc(0, -17.0, 1.95, Math.PI, TAU);
      ctx.fillStyle = o.hatCol || "#6b5638"; ctx.fill(); ctx.stroke();
    }
    if (o.arm) {
      ctx.strokeStyle = col; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(1.4, -13.0); ctx.lineTo(3.8, -11.4); ctx.stroke();
    }
    if (o.spear) {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.34;
      ctx.beginPath(); ctx.moveTo(2.4, -12.5); ctx.lineTo(2.8, -24.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2.8, -24.5); ctx.lineTo(2.3, -22.2); ctx.lineTo(3.3, -22.2);
      ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
    }
    if (o.staff) {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(2.2, -11.6); ctx.lineTo(3.0, 0); ctx.stroke();
    }
    ctx.restore();
  }

  function horse(ctx, x, y, s, col, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 0, 8.4, 1.5, 0, 0, TAU);
    ctx.fillStyle = "rgba(92,62,32,0.15)"; ctx.fill();
    const g = Math.sin((t || 0) * 6) * 0.8;
    ctx.strokeStyle = col; ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-6.0, -8.4); ctx.lineTo(-7.0 + g, -4.2); ctx.lineTo(-7.4 + g, 0);
    ctx.moveTo(-3.2, -8.6); ctx.lineTo(-2.7 - g, -4.2); ctx.lineTo(-2.2 - g, 0);
    ctx.moveTo(4.2, -9.0); ctx.lineTo(4.7 - g, -4.4); ctx.lineTo(5.1 - g, 0);
    ctx.moveTo(6.6, -9.4); ctx.lineTo(7.2 + g, -4.6); ctx.lineTo(7.8 + g, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7.0, -11.4);
    ctx.quadraticCurveTo(-4, -13.8, 1, -13.2);
    ctx.quadraticCurveTo(6, -12.8, 7.2, -10.0);
    ctx.lineTo(6.4, -7.4);
    ctx.quadraticCurveTo(0, -5.4, -7.0, -8.2);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4.4, -12.2);
    ctx.quadraticCurveTo(8.2, -16.8, 10.4, -17.2);
    ctx.lineTo(12.0, -14.8);
    ctx.quadraticCurveTo(10.2, -14.0, 9.0, -12.2);
    ctx.lineTo(7.2, -10.2);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, -10.8); ctx.quadraticCurveTo(-9.8, -9.4, -9.6, -4.8);
    ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.stroke();
    if (o.rider) {
      ctx.fillStyle = o.riderCol || RED;
      ctx.beginPath();
      ctx.moveTo(0.8, -13.2);
      ctx.quadraticCurveTo(-0.4, -16.8, 0.5, -18.4);
      ctx.lineTo(3.0, -18.4);
      ctx.quadraticCurveTo(3.5, -16.0, 2.6, -13.0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(1.8, -20.2, 1.25, 0, TAU);
      ctx.fillStyle = "#c08e5e"; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.stroke();
      if (o.banner) {
        ctx.strokeStyle = INK; ctx.lineWidth = 0.35;
        ctx.beginPath(); ctx.moveTo(3.0, -15.4); ctx.lineTo(3.0, -29.0); ctx.stroke();
        const w = Math.sin((t || 0) * 2.2) * 1.4;
        ctx.beginPath();
        ctx.moveTo(3.2, -28.6);
        ctx.quadraticCurveTo(8.0 + w, -28.0, 10.0 + w, -24.4);
        ctx.lineTo(3.2, -22.6); ctx.closePath();
        ctx.fillStyle = o.banner; ctx.fill();
      }
    }
    ctx.restore();
  }

  function ship(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.translate(0, Math.sin(t * 1.2) * 0.4);
    ctx.beginPath();
    ctx.moveTo(-20, -2);
    ctx.quadraticCurveTo(-12, 6, 6, 6);
    ctx.quadraticCurveTo(17, 6, 22, -2);
    ctx.lineTo(19, -6);
    ctx.quadraticCurveTo(0, -8, -17, -6);
    ctx.closePath();
    ctx.fillStyle = o.hull || "rgba(120,82,50,0.97)"; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.38; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-16, -5.2 + i * 3.0);
      ctx.quadraticCurveTo(0, -6.8 + i * 3.0, 19, -5.2 + i * 3.0);
      ctx.strokeStyle = "rgba(67,48,29,0.22)"; ctx.lineWidth = 0.16; ctx.stroke();
    }
    ctx.fillStyle = "rgba(150,102,60,0.96)";
    ctx.fillRect(-19, -11, 9, 9);
    ctx.strokeRect(-19, -11, 9, 9);
    const masts = [-4, 5, 14];
    for (let i = 0; i < 3; i++) {
      const mx = masts[i];
      const mh = i === 1 ? 34 : 26;
      ctx.strokeStyle = INK; ctx.lineWidth = 0.42;
      ctx.beginPath(); ctx.moveTo(mx, -5); ctx.lineTo(mx, -5 - mh); ctx.stroke();
      const sw = i === 1 ? 6.4 : 5.4;
      const sh = mh * 0.5;
      const wave = Math.sin(t * 1.3 + i) * 0.5;
      ctx.beginPath();
      ctx.moveTo(mx - sw, -8);
      ctx.quadraticCurveTo(mx - sw - 1, -8 - sh * 0.5, mx - sw + wave, -8 - sh);
      ctx.lineTo(mx + sw + wave, -8 - sh);
      ctx.quadraticCurveTo(mx + sw + 1, -8 - sh * 0.5, mx + sw, -8);
      ctx.closePath();
      ctx.fillStyle = o.sail || "rgba(240,229,205,0.96)"; ctx.fill();
      ctx.strokeStyle = "rgba(96,70,44,0.9)"; ctx.lineWidth = 0.32; ctx.stroke();
      ctx.strokeStyle = "rgba(150,120,80,0.4)"; ctx.lineWidth = 0.14;
      for (let k = 1; k <= 2; k++) {
        const sx = mx - sw + (2 * sw * k) / 3;
        ctx.beginPath();
        ctx.moveTo(sx, -8 - sh);
        ctx.quadraticCurveTo(sx + (k === 1 ? 0.8 : -0.8), -8 - sh * 0.5, sx, -8);
        ctx.stroke();
      }
    }
    // flag at the main masthead
    ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(5, -39); ctx.lineTo(5, -46); ctx.stroke();
    ctx.fillStyle = o.flag || RED;
    ctx.beginPath();
    ctx.moveTo(5.3, -45.8);
    ctx.quadraticCurveTo(9.6, -45.2, 11.4, -42.0);
    ctx.lineTo(5.3, -41.0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function wall(ctx, x, baseY, w, h, o) {
    o = o || {};
    ctx.fillStyle = o.col || "rgba(164,146,118,0.98)";
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    ctx.strokeStyle = "rgba(74,62,46,0.65)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(x - w / 2, baseY - h, w, h);
    // courses
    ctx.strokeStyle = "rgba(80,66,48,0.22)"; ctx.lineWidth = 0.13;
    for (let yy = baseY - h + 2; yy < baseY; yy += 2.2) {
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 0.5, yy); ctx.lineTo(x + w / 2 - 0.5, yy); ctx.stroke();
    }
    // crenellations
    for (let i = 0; i < Math.floor(w / 2.4); i++) {
      const cx = x - w / 2 + 1.0 + i * 2.4;
      ctx.fillStyle = o.col || "rgba(164,146,118,0.98)";
      ctx.fillRect(cx, baseY - h - 1.7, 1.4, 1.7);
      ctx.strokeStyle = "rgba(74,62,46,0.5)"; ctx.lineWidth = 0.14;
      ctx.strokeRect(cx, baseY - h - 1.7, 1.4, 1.7);
    }
    if (o.towers !== false) {
      for (const dx of [-0.42, 0.42]) {
        const tx = x + dx * w;
        ctx.fillStyle = o.col || "rgba(164,146,118,0.98)";
        ctx.fillRect(tx - 3.0, baseY - h * 1.22, 6.0, h * 1.22);
        ctx.strokeStyle = "rgba(74,62,46,0.6)"; ctx.lineWidth = 0.26;
        ctx.strokeRect(tx - 3.0, baseY - h * 1.22, 6.0, h * 1.22);
        for (let k = -2.4; k <= 2.0; k += 1.4) ctx.fillRect(tx + k, baseY - h * 1.22 - 1.6, 0.9, 1.6);
      }
    }
    if (o.gate !== false) {
      ctx.beginPath();
      ctx.moveTo(x - 3.0, baseY);
      ctx.lineTo(x - 3.0, baseY - 6.2);
      ctx.quadraticCurveTo(x, baseY - 8.6, x + 3.0, baseY - 6.2);
      ctx.lineTo(x + 3.0, baseY);
      ctx.closePath();
      ctx.fillStyle = "rgba(52,38,26,0.8)"; ctx.fill();
    }
  }

  function keep(ctx, x, baseY, w, h, o) {
    o = o || {};
    ctx.fillStyle = o.col || "rgba(156,140,114,0.98)";
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    ctx.strokeStyle = "rgba(70,58,42,0.65)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(x - w / 2, baseY - h, w, h);
    for (let yy = baseY - h + 2; yy < baseY; yy += 2.0) {
      ctx.strokeStyle = "rgba(80,66,48,0.2)"; ctx.lineWidth = 0.13;
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 0.4, yy); ctx.lineTo(x + w / 2 - 0.4, yy); ctx.stroke();
    }
    for (let i = 0; i < Math.floor(w / 2.2); i++) {
      ctx.fillStyle = o.col || "rgba(156,140,114,0.98)";
      ctx.fillRect(x - w / 2 + 0.8 + i * 2.2, baseY - h - 1.8, 1.3, 1.8);
      ctx.strokeRect(x - w / 2 + 0.8 + i * 2.2, baseY - h - 1.8, 1.3, 1.8);
    }
    // corner turrets
    for (const dx of [-0.5, 0.5]) {
      const tx = x + dx * w;
      ctx.fillStyle = o.col || "rgba(156,140,114,0.98)";
      ctx.beginPath(); ctx.arc(tx, baseY - h * 0.98, w * 0.16, Math.PI, TAU); ctx.fill();
      ctx.stroke();
    }
    // arrow slits
    ctx.fillStyle = "rgba(48,38,28,0.65)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x - 0.6, baseY - h * 0.78 + i * h * 0.18, 1.2, 2.4);
    }
    // gate
    ctx.beginPath();
    ctx.moveTo(x - 2.6, baseY);
    ctx.lineTo(x - 2.6, baseY - 5.6);
    ctx.quadraticCurveTo(x, baseY - 7.6, x + 2.6, baseY - 5.6);
    ctx.lineTo(x + 2.6, baseY);
    ctx.closePath();
    ctx.fillStyle = "rgba(52,38,26,0.82)"; ctx.fill();
  }

  function tent(ctx, x, baseY, s, col) {
    ctx.save(); ctx.translate(x, baseY); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.lineTo(0, -8); ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fillStyle = col || "rgba(214,204,184,0.97)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,54,30,0.6)"; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -8);
    ctx.strokeStyle = "rgba(74,54,30,0.5)"; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1.4, 0); ctx.lineTo(0, -3.4); ctx.lineTo(1.4, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(80,58,36,0.7)"; ctx.fill();
    ctx.restore();
  }

  function palm(ctx, x, baseY, h, lean, col) {
    const lx = lean || 0;
    ctx.strokeStyle = col || "rgba(88,72,44,0.92)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + lx * 0.4, baseY - h * 0.55, x + lx, baseY - h);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * 0.95 + i * 0.42;
      ctx.beginPath();
      ctx.moveTo(x + lx, baseY - h);
      ctx.quadraticCurveTo(
        x + lx + Math.cos(a) * h * 0.22, baseY - h + Math.sin(a) * h * 0.12,
        x + lx + Math.cos(a) * h * 0.36, baseY - h + Math.sin(a) * h * 0.22
      );
      ctx.strokeStyle = "rgba(88,100,56,0.9)";
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }
  }

  function buildingRow(ctx, x0, x1, baseY, h, col) {
    const r = rng(Math.floor(x0 * 3 + x1));
    let x = x0;
    while (x < x1) {
      const w = 4 + r() * 5;
      const bh = h * (0.5 + r() * 0.6);
      ctx.fillStyle = col || "rgba(150,126,96,0.6)";
      ctx.fillRect(x, baseY - bh, w, bh);
      if (r() > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x - 0.4, baseY - bh);
        ctx.lineTo(x + w / 2, baseY - bh - 2.8);
        ctx.lineTo(x + w + 0.4, baseY - bh);
        ctx.closePath();
        ctx.fillStyle = "rgba(120,86,60,0.6)"; ctx.fill();
      }
      // windows
      ctx.fillStyle = "rgba(70,56,42,0.35)";
      for (let k = 0; k < 2; k++) {
        ctx.fillRect(x + 1 + k * 2.0, baseY - bh + 1.4, 0.8, 0.8);
      }
      x += w + 1.2;
    }
  }

  /* ── family: siege ─────────────────────────────────────── */
  function siegeStage(ctx, top, t, v) {
    const pal = PAL[v.palette] || PAL.dawn;
    sky(ctx, top, pal, -26);
    cloud(ctx, 12, -80, 18, "rgba(250,244,228,0.35)", 0.4);
    // skyline
    if (v.skyline === "mountains") {
      ctx.beginPath();
      ctx.moveTo(-50, -30); ctx.lineTo(-34, -46); ctx.lineTo(-20, -36);
      ctx.lineTo(-6, -52); ctx.lineTo(8, -38); ctx.lineTo(24, -48);
      ctx.lineTo(38, -34); ctx.lineTo(50, -42); ctx.lineTo(50, -30);
      ctx.closePath();
      ctx.fillStyle = "rgba(126,118,100,0.45)"; ctx.fill();
    } else {
      buildingRow(ctx, -50, 6, -30, 16, "rgba(140,118,92,0.35)");
    }
    // ground
    const gr = ctx.createLinearGradient(0, -30, 0, 0);
    gr.addColorStop(0, "rgba(184,156,112,0.8)");
    gr.addColorStop(1, "rgba(158,128,90,0.97)");
    ctx.fillStyle = gr;
    ctx.fillRect(-50, -30, 100, 30);
    // road
    ctx.beginPath();
    ctx.moveTo(-6, -30); ctx.quadraticCurveTo(-2, -14, 10, 0);
    ctx.lineTo(26, 0); ctx.quadraticCurveTo(10, -14, 6, -30);
    ctx.closePath();
    ctx.fillStyle = "rgba(206,176,128,0.5)"; ctx.fill();

    // city structure (larger, closer)
    const base = -10;
    if (v.structure === "keep") {
      wall(ctx, 20, base, 64, 16, { towers: true, gate: true, col: v.wallCol });
      keep(ctx, 18, base, 24, 38, { col: v.wallCol });
    } else if (v.structure === "gate") {
      wall(ctx, 20, base, 58, 24, { towers: true, gate: true, col: v.wallCol });
      ctx.fillStyle = v.wallCol || "rgba(164,146,118,0.98)";
      ctx.fillRect(12, base - 38, 16, 14);
      ctx.strokeStyle = "rgba(74,62,46,0.6)"; ctx.lineWidth = 0.3;
      ctx.strokeRect(12, base - 38, 16, 14);
      ctx.beginPath();
      ctx.moveTo(10.6, base - 38); ctx.lineTo(20, base - 44); ctx.lineTo(29.4, base - 38);
      ctx.closePath(); ctx.fillStyle = "rgba(168,96,58,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(92,54,34,0.6)"; ctx.lineWidth = 0.24; ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(48,38,28,0.6)";
        ctx.fillRect(14.4 + i * 4.2, base - 34, 1.4, 4.0);
      }
    } else {
      wall(ctx, 20, base, 70, 22, { towers: true, gate: true, col: v.wallCol });
    }
    // defender flag on the gate/keep
    const fx = v.structure === "keep" ? 18 : 20;
    const fy = v.structure === "keep" ? base - 38 : (v.structure === "gate" ? base - 44 : base - 22);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 10); ctx.stroke();
    ctx.fillStyle = v.flag || RED;
    const wave = Math.sin(t * 2) * 0.7;
    ctx.beginPath();
    ctx.moveTo(fx + 0.3, fy - 9.6);
    ctx.quadraticCurveTo(fx + 3.4 + wave, fy - 9.0, fx + 5.4 + wave, fy - 7.0);
    ctx.lineTo(fx + 0.3, fy - 5.6); ctx.closePath(); ctx.fill();

    // camp
    tent(ctx, -44, -8, 1.5, "rgba(216,206,186,0.97)");
    tent(ctx, -34, -6, 1.25, "rgba(206,196,176,0.97)");
    tent(ctx, -25, -5, 1.0, "rgba(198,188,168,0.97)");
    // campfire
    ctx.beginPath(); ctx.arc(-37.5, -2.6, 1.6, 0, TAU);
    ctx.fillStyle = "rgba(212,150,70,0.9)"; ctx.fill();
    glow(ctx, -37.5, -2.6, 8, "rgb(224,176,104)", 0.2);
    // soldiers
    const soldiers = [
      [-20, -4.8, 0.42, "rgba(74,58,40,0.97)"],
      [-16, -8.0, 0.40, "rgba(84,64,44,0.97)"],
      [-12, -10.2, 0.34, "rgba(70,54,38,0.98)"],
      [-8, -6.6, 0.44, "rgba(88,68,46,0.95)"],
      [-3, -10.8, 0.32, "rgba(74,58,40,0.97)"],
      [1, -6.0, 0.46, "rgba(84,64,44,0.97)"],
      [5, -9.0, 0.38, "rgba(70,54,38,0.98)"],
      [9, -5.2, 0.48, "rgba(88,68,46,0.95)"],
    ];
    soldiers.forEach(([sx, sy, ss, sc], i) => {
      p(ctx, sx, sy, ss, sc, { phase: t * 0.7 + i, spear: i % 2 === 0, hat: "helmet", noShadow: true });
    });
    // mounted scout
    horse(ctx, -14, -2.6, 0.58, "rgba(76,58,40,0.97)", t + 0.4, {
      rider: true, riderCol: "rgba(150,60,42,0.95)", banner: "rgba(168,64,44,0.9)",
    });
    // siege tower / cannon
    if (v.props && v.props.indexOf("cannon") >= 0) {
      ctx.fillStyle = "rgba(86,64,42,0.98)";
      ctx.fillRect(-3.4, -6.2, 9.4, 1.8);
      ctx.beginPath(); ctx.arc(-1.6, -4.4, 1.2, 0, TAU);
      ctx.arc(4.2, -4.4, 1.2, 0, TAU);
      ctx.fillStyle = "rgba(64,46,30,0.95)"; ctx.fill();
      ctx.fillStyle = "rgba(52,42,32,0.98)";
      ctx.fillRect(0.4, -8.0, 8.6, 1.9);
      ctx.beginPath(); ctx.arc(9.2, -7.0, 1.6, -0.4, 1.9); ctx.fill();
    }
    if (v.props && v.props.indexOf("tower") >= 0) {
      ctx.fillStyle = "rgba(120,88,54,0.98)";
      ctx.fillRect(-16, -26, 7.0, 20);
      ctx.strokeStyle = "rgba(60,42,26,0.6)"; ctx.lineWidth = 0.2; ctx.strokeRect(-16, -26, 7.0, 20);
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = "rgba(60,42,26,0.35)"; ctx.lineWidth = 0.16;
        ctx.beginPath(); ctx.moveTo(-16, -24 + i * 4); ctx.lineTo(-9, -24 + i * 4); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(-14.6, -2.2, 1.6, 0, TAU);
      ctx.arc(-10.4, -2.2, 1.6, 0, TAU);
      ctx.strokeStyle = "rgba(60,42,26,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
    }
    // smoke / weather
    if (v.weather === "smoke" || v.weather === "dust") {
      for (let i = 0; i < 5; i++) {
        const bx = 6 + i * 10;
        for (let k = 0; k < 5; k++) {
          const q = (t * 0.1 + k * 0.2 + i * 0.1) % 1;
          ctx.beginPath(); ctx.arc(bx + q * 12, -32 - q * 26, 2.6 + q * 7, 0, TAU);
          ctx.fillStyle = "rgba(110,98,86," + (0.12 * (1 - q)) + ")"; ctx.fill();
        }
      }
      if (v.weather === "dust") {
        for (let i = 0; i < 10; i++) {
          const q = (t * 0.25 + i * 0.1) % 1;
          ctx.beginPath(); ctx.arc(-20 + i * 5, -4 - q * 6, 1.6 + q * 2.6, 0, TAU);
          ctx.fillStyle = "rgba(204,176,132," + (0.10 * (1 - q)) + ")"; ctx.fill();
        }
      }
    }
    if (v.weather === "snow") {
      for (let i = 0; i < 30; i++) {
        const q = (t * 0.25 + i * 0.07) % 1;
        ctx.beginPath(); ctx.arc(-48 + i * 3.3, -34 + q * 32, 0.5, 0, TAU);
        ctx.fillStyle = "rgba(246,244,232,0.6)"; ctx.fill();
      }
    }
    if (v.weather === "rain") {
      for (let i = 0; i < 24; i++) {
        const q = (t * 0.5 + i * 0.08) % 1;
        ctx.strokeStyle = "rgba(226,232,226,0.14)"; ctx.lineWidth = 0.12;
        ctx.beginPath(); ctx.moveTo(-46 + i * 4, -34 + q * 30); ctx.lineTo(-45.4 + i * 4, -31 + q * 30); ctx.stroke();
      }
    }
    // foreground frame
    if (v.frame === "tent") {
      ctx.fillStyle = "rgba(96,72,48,0.96)";
      ctx.beginPath();
      ctx.moveTo(-50, 0); ctx.lineTo(-50, -28); ctx.lineTo(-40, -8); ctx.lineTo(-33, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(60,42,26,0.7)"; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.strokeStyle = "rgba(150,118,78,0.4)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(-50, -28); ctx.lineTo(-42, 0); ctx.stroke();
    } else if (v.frame === "banner") {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(40, -30); ctx.stroke();
      ctx.fillStyle = "rgba(168,64,44,0.92)";
      const bw = Math.sin(t * 2) * 1.2;
      ctx.beginPath();
      ctx.moveTo(40, -30);
      ctx.quadraticCurveTo(46 + bw, -28.4, 49 + bw, -23.6);
      ctx.lineTo(39.4, -22.4);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(-42, -1.2, 8, 3.4, 0.2, 0, TAU);
      ctx.fillStyle = "rgba(100,78,54,0.9)"; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(44, -0.8, 6, 2.6, -0.2, 0, TAU);
      ctx.fillStyle = "rgba(100,78,54,0.8)"; ctx.fill();
    }
  }

  function siegeMap(ctx, t, v) {
    const pal = PAL[v.palette] || PAL.dawn;
    const skyG = ctx.createRadialGradient(0, -28, 6, 0, -22, 56);
    skyG.addColorStop(0, hexA(pal.mid, 0.6));
    skyG.addColorStop(1, hexA(pal.mid, 0));
    ctx.fillStyle = skyG;
    ctx.fillRect(-50, -60, 100, 60);
    const grd = ctx.createLinearGradient(0, -18, 0, 0);
    grd.addColorStop(0, hexA("#b0946a", 0));
    grd.addColorStop(1, hexA("#b0946a", 0.95));
    ctx.fillStyle = grd;
    ctx.fillRect(-50, -18, 100, 18);
    wall(ctx, 8, -10, 52, 18, { towers: true, gate: true, col: v.wallCol });
    tent(ctx, -30, -8, 1.0);
    tent(ctx, -20, -7, 0.8);
    for (let i = 0; i < 3; i++) p(ctx, -14 + i * 7, -5, 0.3, "rgba(74,58,40,0.97)", { phase: t + i, spear: true });
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(8, -28); ctx.lineTo(8, -38); ctx.stroke();
    ctx.fillStyle = v.flag || RED;
    ctx.fillRect(8.3, -37.6, 5.4, 3.0);
  }

  /* ── family: caravel ───────────────────────────────────── */
  function caravelStage(ctx, top, t, v) {
    const pal = PAL[v.palette] || PAL.dawn;
    sky(ctx, top, pal, 22);
    cloud(ctx, -18, -80, 18, "rgba(250,244,228,0.35)", 0.4);
    // sea
    const sea = ctx.createLinearGradient(0, -32, 0, 0);
    sea.addColorStop(0, "#6e9292");
    sea.addColorStop(0.55, "#567f82");
    sea.addColorStop(1, "#416a70");
    ctx.fillStyle = sea;
    ctx.fillRect(-50, -32, 100, 32);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = "rgba(232,240,226," + (0.14 + (i % 3) * 0.04) + ")";
      ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(-50, -29 + i * 2.7);
      ctx.quadraticCurveTo(0, -30 + i * 2.7 + Math.sin(t + i) * 0.5, 50, -29 + i * 2.7);
      ctx.stroke();
    }
    // coast
    if (v.skyline === "cliffs") {
      ctx.beginPath();
      ctx.moveTo(-50, -30); ctx.lineTo(-38, -54); ctx.lineTo(-28, -46); ctx.lineTo(-20, -32);
      ctx.lineTo(-16, -8); ctx.lineTo(-50, -5);
      ctx.closePath();
      ctx.fillStyle = "rgba(126,116,92,0.85)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,62,44,0.35)"; ctx.lineWidth = 0.2; ctx.stroke();
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = "rgba(80,68,50,0.22)"; ctx.lineWidth = 0.16;
        ctx.beginPath();
        ctx.moveTo(-46 + i * 4.4, -22 - (i % 3) * 4);
        ctx.lineTo(-42 + i * 4.2, -14 - (i % 2) * 6);
        ctx.stroke();
      }
    } else if (v.skyline === "port") {
      ctx.fillStyle = "rgba(176,148,106,0.95)";
      ctx.fillRect(-50, -14, 30, 14);
      ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.2;
      ctx.strokeRect(-50, -14, 30, 14);
      buildingRow(ctx, -48, -24, -14, 14, "rgba(196,170,132,0.95)");
      // crane
      ctx.strokeStyle = "rgba(74,50,30,0.75)"; ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-22, -14); ctx.lineTo(-22, -30); ctx.lineTo(-12, -24);
      ctx.moveTo(-12, -24); ctx.lineTo(-12, -18);
      ctx.stroke();
      // barrels
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(128,88,52,0.95)";
        ctx.fillRect(-34 + i * 3.4, -17.4, 2.8, 3.4);
        ctx.strokeStyle = "rgba(64,42,26,0.5)"; ctx.lineWidth = 0.14;
        ctx.strokeRect(-34 + i * 3.4, -17.4, 2.8, 3.4);
      }
    } else if (v.skyline === "palms") {
      ctx.beginPath();
      ctx.moveTo(-50, -18); ctx.quadraticCurveTo(-34, -22, -18, -16); ctx.lineTo(-18, -8);
      ctx.quadraticCurveTo(-34, -12, -50, -9); ctx.closePath();
      ctx.fillStyle = "rgba(150,156,96,0.85)"; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-50, -9); ctx.quadraticCurveTo(-34, -6, -18, -8); ctx.lineTo(-18, -4);
      ctx.quadraticCurveTo(-34, -2, -50, -3); ctx.closePath();
      ctx.fillStyle = "rgba(232,220,188,0.96)"; ctx.fill();
      palm(ctx, -42, -16, 20, 3, "rgba(84,72,44,0.92)");
      palm(ctx, -32, -17, 16, -2, "rgba(84,72,44,0.92)");
      palm(ctx, -23, -16, 13, 2, "rgba(84,72,44,0.92)");
      // hut
      ctx.fillStyle = "rgba(196,168,126,0.9)";
      ctx.fillRect(-28, -12.4, 6.0, 4.4);
      ctx.beginPath();
      ctx.moveTo(-29, -12.4); ctx.lineTo(-25, -16.4); ctx.lineTo(-21, -12.4);
      ctx.closePath(); ctx.fillStyle = "rgba(150,96,60,0.9)"; ctx.fill();
    }
    // event landmark
    if (v.landmark === "cross") {
      ctx.strokeStyle = "rgba(74,50,30,0.95)"; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-30, -8); ctx.lineTo(-30, -22);
      ctx.moveTo(-33.4, -18.6); ctx.lineTo(-26.6, -18.6);
      ctx.stroke();
    } else if (v.landmark === "canoe") {
      ctx.beginPath();
      ctx.moveTo(-18, -4.4); ctx.quadraticCurveTo(-14, -2.6, -10, -4.4);
      ctx.quadraticCurveTo(-14, -3.8, -18, -4.4); ctx.closePath();
      ctx.fillStyle = "rgba(112,76,44,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(58,40,24,0.6)"; ctx.lineWidth = 0.2; ctx.stroke();
      ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(-18, -4.6); ctx.lineTo(-22, -3.6); ctx.stroke();
      p(ctx, -15, -5.2, 0.16, "rgba(58,42,26,0.96)", { phase: t, noShadow: true });
    } else if (v.landmark === "ice") {
      for (const [ix, iy, iw] of [[-44, -7, 6], [-35, -9, 4.4], [-26, -6.4, 3.6]]) {
        ctx.beginPath();
        ctx.moveTo(ix - iw, iy);
        ctx.lineTo(ix - iw * 0.3, iy - 2.6);
        ctx.lineTo(ix + iw * 0.4, iy - 1.6);
        ctx.lineTo(ix + iw, iy);
        ctx.closePath();
        ctx.fillStyle = "rgba(238,240,232,0.9)"; ctx.fill();
        ctx.strokeStyle = "rgba(140,160,160,0.5)"; ctx.lineWidth = 0.16; ctx.stroke();
      }
    } else if (v.landmark === "shallop") {
      ctx.beginPath();
      ctx.moveTo(-32, -6); ctx.quadraticCurveTo(-28, -4.6, -24, -6);
      ctx.quadraticCurveTo(-28, -5.4, -32, -6); ctx.closePath();
      ctx.fillStyle = "rgba(128,90,54,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(58,40,24,0.6)"; ctx.lineWidth = 0.2; ctx.stroke();
    }

    // ships
    ship(ctx, 14, -12, 0.86, t, {
      flag: v.flag || RED,
      sail: v.palette === "storm" ? "rgba(228,218,196,0.9)" : "rgba(242,232,208,0.96)",
    });
    ship(ctx, -32, -19, 0.38, t + 1, { flag: v.flag || RED });
    // boat + sailors
    if (v.crowd !== "none") {
      ctx.save(); ctx.translate(2, -6); ctx.scale(1.0, 1.0);
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.quadraticCurveTo(0, 2.4, 5, 0); ctx.quadraticCurveTo(0, 1, -5, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(120,84,52,0.95)"; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.25; ctx.stroke();
      p(ctx, -1.4, -0.8, 0.18, "rgba(60,44,30,0.96)", { phase: t, noShadow: true });
      p(ctx, 2.0, -0.8, 0.18, "rgba(60,44,30,0.96)", { phase: t + 1, fill: "rgba(92,104,122,0.95)", noShadow: true });
      ctx.restore();
    }
    // frame
    if (v.frame === "rigging") {
      ctx.strokeStyle = "rgba(74,50,30,0.5)"; ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(-50, -62); ctx.lineTo(14, -38);
      ctx.stroke();
      // foreground spar at the top-left corner
      ctx.strokeStyle = "rgba(74,50,30,0.75)"; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(-50, -58); ctx.lineTo(-30, -50); ctx.stroke();
    } else if (v.frame === "hull") {
      ctx.beginPath();
      ctx.moveTo(-50, 0); ctx.lineTo(-50, -10); ctx.quadraticCurveTo(-30, -4, -8, -6);
      ctx.lineTo(-8, 0); ctx.closePath();
      ctx.fillStyle = "rgba(92,66,42,0.95)"; ctx.fill();
    }
    // weather
    if (v.weather === "storm") {
      for (let i = 0; i < 20; i++) {
        const q = (t * 0.5 + i * 0.09) % 1;
        ctx.strokeStyle = "rgba(226,232,226,0.16)"; ctx.lineWidth = 0.12;
        ctx.beginPath(); ctx.moveTo(-46 + i * 4.8, -34 + q * 30); ctx.lineTo(-45.2 + i * 4.8, -31 + q * 30); ctx.stroke();
      }
    } else if (v.weather === "snow") {
      for (let i = 0; i < 24; i++) {
        const q = (t * 0.25 + i * 0.08) % 1;
        ctx.beginPath(); ctx.arc(-48 + i * 4.1, -34 + q * 30, 0.5, 0, TAU);
        ctx.fillStyle = "rgba(246,244,232,0.55)"; ctx.fill();
      }
    }
  }

  function caravelMap(ctx, t, v) {
    const pal = PAL[v.palette] || PAL.dawn;
    const skyG = ctx.createRadialGradient(0, -34, 6, 0, -28, 56);
    skyG.addColorStop(0, hexA(pal.mid, 0.6));
    skyG.addColorStop(1, hexA(pal.mid, 0));
    ctx.fillStyle = skyG;
    ctx.fillRect(-50, -64, 100, 64);
    const seaG = ctx.createLinearGradient(0, -20, 0, 0);
    seaG.addColorStop(0, hexA("#4f7b7c", 0));
    seaG.addColorStop(1, hexA("#4f7b7c", 0.9));
    ctx.fillStyle = seaG;
    ctx.fillRect(-50, -20, 100, 20);
    if (v.skyline === "palms") {
      ctx.fillStyle = "rgba(150,156,96,0.85)";
      ctx.fillRect(-50, -16, 20, 8);
      palm(ctx, -42, -14, 16, 2, "rgba(84,72,44,0.9)");
    }
    ship(ctx, 6, -8, 0.52, t, { flag: v.flag || RED });
  }

  /* ── family: modern-founding ───────────────────────────── */
  function modernStage(ctx, top, t, v) {
    const pal = PAL[v.palette] || PAL.dawn;
    sky(ctx, top, pal, -22);
    cloud(ctx, 16, -80, 18, "rgba(250,244,228,0.35)", 0.4);
    // background city
    buildingRow(ctx, -50, 50, -22, 18, "rgba(150,128,98,0.35)");
    // ground / square
    const gr = ctx.createLinearGradient(0, -22, 0, 0);
    gr.addColorStop(0, "rgba(196,174,140,0.9)");
    gr.addColorStop(1, "rgba(166,140,104,0.98)");
    ctx.fillStyle = gr;
    ctx.fillRect(-50, -22, 100, 22);
    // paving
    ctx.strokeStyle = "rgba(92,72,50,0.16)"; ctx.lineWidth = 0.14;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(-50 + i * 10.4, 0); ctx.lineTo(-28 + i * 7.4, -22); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-50, -2 - i * 5); ctx.lineTo(50, -2 - i * 5); ctx.stroke();
    }

    // structure
    const bx = 6, by = -12;
    if (v.structure === "capitol") {
      // steps
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(228,218,196,0.98)";
        ctx.fillRect(bx - 23 + i * 1.4, by - i * 1.2, 46 - i * 2.8, 1.2);
        ctx.strokeStyle = "rgba(84,70,52,0.3)"; ctx.lineWidth = 0.14;
        ctx.strokeRect(bx - 23 + i * 1.4, by - i * 1.2, 46 - i * 2.8, 1.2);
      }
      // columns
      for (let i = 0; i < 8; i++) {
        const cx = bx - 19 + i * 5.4;
        ctx.fillStyle = "rgba(240,232,214,0.98)";
        ctx.fillRect(cx - 0.8, by - 16, 1.6, 14.4);
        ctx.strokeStyle = "rgba(84,70,52,0.35)"; ctx.lineWidth = 0.14;
        ctx.strokeRect(cx - 0.8, by - 16, 1.6, 14.4);
        ctx.fillRect(cx - 1.1, by - 16.4, 2.2, 0.5);
      }
      // entablature + dome
      ctx.fillStyle = "rgba(234,224,204,0.98)";
      ctx.fillRect(bx - 21, by - 18, 42, 2.0);
      ctx.strokeStyle = "rgba(84,70,52,0.4)"; ctx.lineWidth = 0.2;
      ctx.strokeRect(bx - 21, by - 18, 42, 2.0);
      ctx.beginPath(); ctx.arc(bx, by - 18, 9.0, Math.PI, TAU);
      ctx.fillStyle = "rgba(238,228,206,0.98)"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by - 27.0, 1.2, 0, TAU);
      ctx.fillStyle = "rgba(196,150,78,0.9)"; ctx.fill();
      // side wings
      ctx.fillStyle = "rgba(214,202,180,0.95)";
      ctx.fillRect(bx - 30, by - 10, 8, 10);
      ctx.fillRect(bx + 22, by - 10, 8, 10);
      ctx.strokeStyle = "rgba(84,70,52,0.3)"; ctx.lineWidth = 0.16;
      ctx.strokeRect(bx - 30, by - 10, 8, 10);
      ctx.strokeRect(bx + 22, by - 10, 8, 10);
    } else if (v.structure === "port") {
      ctx.fillStyle = "rgba(176,148,106,0.95)";
      ctx.fillRect(bx - 24, by, 48, 2.4);
      ctx.strokeStyle = "rgba(74,54,36,0.6)"; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.moveTo(bx - 20, by); ctx.lineTo(bx - 20, by - 16);
      ctx.moveTo(bx + 20, by); ctx.lineTo(bx + 20, by - 16);
      ctx.moveTo(bx - 20, by - 16); ctx.lineTo(bx + 20, by - 16); ctx.stroke();
      // crane
      ctx.beginPath(); ctx.moveTo(bx + 8, by); ctx.lineTo(bx + 8, by - 22);
      ctx.lineTo(bx + 24, by - 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 24, by - 14); ctx.lineTo(bx + 24, by - 7); ctx.stroke();
      // bollards
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = "rgba(96,74,50,0.9)";
        ctx.fillRect(bx - 18 + i * 11, by - 3.0, 1.4, 3.0);
      }
    } else if (v.structure === "tiananmen") {
      // Tiananmen-style gate: red wall, five arches, double roof
      const tx = 6, ty = -12;
      ctx.fillStyle = "rgba(168,64,44,0.97)";
      ctx.fillRect(tx - 26, ty - 10, 52, 10);
      ctx.strokeStyle = "rgba(92,40,28,0.7)"; ctx.lineWidth = 0.3;
      ctx.strokeRect(tx - 26, ty - 10, 52, 10);
      for (let i = -2; i <= 2; i++) {
        const ax = tx + i * 8;
        ctx.beginPath();
        ctx.moveTo(ax - 1.6, ty);
        ctx.lineTo(ax - 1.6, ty - 4.6);
        ctx.quadraticCurveTo(ax, ty - 6.4, ax + 1.6, ty - 4.6);
        ctx.lineTo(ax + 1.6, ty);
        ctx.closePath();
        ctx.fillStyle = "rgba(52,34,24,0.85)"; ctx.fill();
      }
      // gate tower base (red, gold trim)
      ctx.fillStyle = "rgba(168,64,44,0.98)";
      ctx.fillRect(tx - 20, ty - 22, 40, 12);
      ctx.strokeStyle = "rgba(92,40,28,0.7)"; ctx.lineWidth = 0.28;
      ctx.strokeRect(tx - 20, ty - 22, 40, 12);
      ctx.strokeStyle = "rgba(226,188,100,0.75)"; ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(tx - 19, ty - 21.4); ctx.lineTo(tx + 19, ty - 21.4);
      ctx.moveTo(tx - 19, ty - 10.6); ctx.lineTo(tx + 19, ty - 10.6);
      ctx.stroke();
      // portrait: dark panel in a gold frame
      ctx.fillStyle = "rgba(60,40,30,0.9)";
      ctx.fillRect(tx - 2.6, ty - 20, 5.2, 6.4);
      ctx.strokeStyle = "rgba(226,188,100,0.85)"; ctx.lineWidth = 0.35;
      ctx.strokeRect(tx - 2.6, ty - 20, 5.2, 6.4);
      // double roof: solid lower and upper eaves
      ctx.beginPath();
      ctx.moveTo(tx - 28, ty - 22);
      ctx.quadraticCurveTo(tx - 14, ty - 27, tx, ty - 28);
      ctx.quadraticCurveTo(tx + 14, ty - 27, tx + 28, ty - 22);
      ctx.closePath();
      ctx.fillStyle = "rgba(150,66,44,0.98)"; ctx.fill();
      ctx.strokeStyle = "rgba(70,32,22,0.7)"; ctx.lineWidth = 0.28; ctx.stroke();
      // upturned eave tips
      ctx.beginPath();
      ctx.moveTo(tx - 28, ty - 22); ctx.quadraticCurveTo(tx - 30.4, ty - 23.4, tx - 29.8, ty - 25.2);
      ctx.moveTo(tx + 28, ty - 22); ctx.quadraticCurveTo(tx + 30.4, ty - 23.4, tx + 29.8, ty - 25.2);
      ctx.strokeStyle = "rgba(70,32,22,0.7)"; ctx.lineWidth = 0.35; ctx.stroke();
      // upper roof
      ctx.beginPath();
      ctx.moveTo(tx - 18, ty - 28);
      ctx.quadraticCurveTo(tx - 8, ty - 31, tx, ty - 32);
      ctx.quadraticCurveTo(tx + 8, ty - 31, tx + 18, ty - 28);
      ctx.closePath();
      ctx.fillStyle = "rgba(162,76,50,0.98)"; ctx.fill();
      ctx.strokeStyle = "rgba(70,32,22,0.7)"; ctx.stroke();
      // roof ridge + finials
      ctx.strokeStyle = "rgba(226,188,100,0.9)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(tx - 14, ty - 27.6); ctx.lineTo(tx + 14, ty - 27.6); ctx.stroke();
      for (const dx of [-22, 22]) {
        ctx.strokeStyle = "rgba(74,50,30,0.9)"; ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(tx + dx, ty - 23); ctx.lineTo(tx + dx, ty - 27); ctx.stroke();
      }
    } else {
      // square: stone arch
      ctx.fillStyle = "rgba(198,172,134,0.96)";
      ctx.fillRect(bx - 20, by - 20, 6.0, 20);
      ctx.fillRect(bx + 14, by - 20, 6.0, 20);
      ctx.beginPath();
      ctx.moveTo(bx - 20, by - 20);
      ctx.quadraticCurveTo(bx, by - 30, bx + 20, by - 20);
      ctx.lineTo(bx + 20, by - 16);
      ctx.quadraticCurveTo(bx, by - 26, bx - 20, by - 16);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(84,64,42,0.5)"; ctx.lineWidth = 0.25; ctx.stroke();
      // keystone
      ctx.fillStyle = "rgba(168,140,104,0.95)";
      ctx.fillRect(bx - 2.0, by - 30, 4.0, 6.0);
      // banner on the arch
      ctx.fillStyle = "rgba(168,64,44,0.85)";
      ctx.fillRect(bx - 4, by - 28, 8, 5);
    }

    // flagpole
    ctx.strokeStyle = "rgba(64,46,30,0.95)"; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-30, -40); ctx.stroke();
    const fw = Math.sin(t * 2) * 1.0;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = (v.flagCols && v.flagCols[i]) || ["rgba(74,104,138,0.96)", "rgba(242,234,214,0.97)", "rgba(168,64,44,0.96)"][i];
      ctx.beginPath();
      ctx.moveTo(-29.6, -39.4 + i * 0.15);
      ctx.quadraticCurveTo(-25.2 + fw, -39.0, -21.0 + fw, -37.6);
      ctx.lineTo(-21.0 + fw, -31.6);
      ctx.quadraticCurveTo(-25.2 + fw, -33.4, -29.6, -33.0);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(-30, -40.4, 0.9, 0, TAU);
    ctx.fillStyle = "rgba(196,150,78,0.95)"; ctx.fill();

    // event landmarks (behind the crowd)
    if (v.props && v.props.indexOf("church") >= 0) {
      ctx.fillStyle = "rgba(196,170,132,0.9)";
      ctx.fillRect(32, -22, 10, 12);
      ctx.strokeStyle = "rgba(84,64,42,0.4)"; ctx.lineWidth = 0.2;
      ctx.strokeRect(32, -22, 10, 12);
      ctx.beginPath();
      ctx.moveTo(31, -22); ctx.lineTo(37, -28); ctx.lineTo(43, -22);
      ctx.closePath(); ctx.fillStyle = "rgba(150,96,60,0.9)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(37, -28); ctx.lineTo(37, -33);
      ctx.moveTo(35.4, -31.4); ctx.lineTo(38.6, -31.4);
      ctx.strokeStyle = "rgba(74,50,30,0.8)"; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.beginPath(); ctx.arc(37, -18, 1.6, 0, TAU);
      ctx.fillStyle = "rgba(74,58,44,0.6)"; ctx.fill();
    }
    if (v.props && v.props.indexOf("statue") >= 0) {
      ctx.fillStyle = "rgba(120,104,80,0.95)";
      ctx.fillRect(24, -6, 10, 2.4);
      ctx.strokeStyle = "rgba(60,46,30,0.5)"; ctx.lineWidth = 0.18;
      ctx.strokeRect(24, -6, 10, 2.4);
      horse(ctx, 29, -6, 0.34, "rgba(104,90,68,0.95)", t + 1, { rider: true, riderCol: "rgba(120,104,80,0.95)" });
    }
    // crowd, three depth rows
    const crowd = [
      [-44, -1.8, 0.50], [-37, -1.4, 0.56], [-30, -1.8, 0.52],
      [-22, -1.4, 0.58], [-14, -1.8, 0.54], [-5, -1.4, 0.60],
      [3, -1.8, 0.56], [11, -1.4, 0.60], [19, -1.8, 0.54],
      [27, -1.4, 0.58], [35, -1.8, 0.52], [43, -1.4, 0.50],
      [-40, -4.4, 0.44], [-30, -4.0, 0.42], [-20, -4.6, 0.44],
      [-10, -4.0, 0.46], [0, -4.4, 0.44], [10, -4.0, 0.46],
      [20, -4.6, 0.42], [30, -4.0, 0.44], [40, -4.4, 0.42],
      [-34, -6.8, 0.36], [-22, -6.4, 0.34], [-8, -6.8, 0.36],
      [6, -6.4, 0.34], [20, -6.8, 0.36], [34, -6.4, 0.34],
    ];
    crowd.forEach(([cx, cy, cs], i) => {
      p(ctx, cx, cy, cs, "rgba(58,42,26,0.98)", {
        phase: t * 0.7 + i, seed: i,
        fill: v.structure === "tiananmen"
          ? (i % 6 === 0 ? "rgba(168,64,44,0.92)" : i % 2 ? "rgba(74,96,112,0.95)" : "rgba(96,80,62,0.95)")
          : (i % 4 === 0 ? "rgba(150,112,74,0.95)" : i % 4 === 1 ? "rgba(84,104,112,0.95)" : i % 4 === 2 ? "rgba(168,64,44,0.92)" : "rgba(112,88,58,0.95)"),
        hat: i % 3 === 0 ? "cap" : null,
        arm: i % 5 === 0,
        noShadow: true,
      });
    });
    // banners in the crowd
    for (let i = 0; i < 4; i++) {
      const bx2 = -38 + i * 22;
      ctx.strokeStyle = INK; ctx.lineWidth = 0.28;
      ctx.beginPath(); ctx.moveTo(bx2, -6); ctx.lineTo(bx2, -20); ctx.stroke();
      ctx.fillStyle = (v.flagCols && v.flagCols[0]) || "rgba(168,64,44,0.9)";
      ctx.beginPath();
      ctx.moveTo(bx2 + 0.2, -19.6);
      ctx.quadraticCurveTo(bx2 + 4.4 + Math.sin(t * 2 + i) * 0.8, -19.0, bx2 + 6.4, -15.6);
      ctx.lineTo(bx2 + 0.2, -14.8);
      ctx.closePath(); ctx.fill();
    }
    // foreground event props
    if (v.props && v.props.indexOf("document") >= 0) {
      ctx.fillStyle = "rgba(122,88,52,0.98)";
      ctx.fillRect(-16, -4.0, 5.0, 3.8);
      ctx.strokeStyle = "rgba(60,42,26,0.6)"; ctx.lineWidth = 0.2;
      ctx.strokeRect(-16, -4.0, 5.0, 3.8);
      ctx.fillStyle = "rgba(246,238,220,0.98)";
      ctx.fillRect(-15.2, -4.6, 3.4, 1.0);
      ctx.strokeStyle = "rgba(92,64,36,0.4)"; ctx.lineWidth = 0.12;
      ctx.strokeRect(-15.2, -4.6, 3.4, 1.0);
    }
    if (v.props && v.props.indexOf("drums") >= 0) {
      p(ctx, -18, -2.2, 0.42, "rgba(58,42,26,0.98)", { phase: t + 2, fill: "rgba(150,112,74,0.96)", arm: true });
      ctx.beginPath(); ctx.ellipse(-15.8, -4.4, 2.0, 1.5, 0.1, 0, TAU);
      ctx.fillStyle = "rgba(196,150,78,0.96)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,50,30,0.6)"; ctx.lineWidth = 0.2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-15.8, -4.4, 1.4, 1.0, 0.1, 0, TAU);
      ctx.strokeStyle = "rgba(120,84,48,0.7)"; ctx.lineWidth = 0.18; ctx.stroke();
    }
    if (v.props && v.props.indexOf("microphone") >= 0) {
      ctx.strokeStyle = "rgba(60,46,32,0.9)"; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-24, -2.0); ctx.lineTo(-24, -10.0); ctx.stroke();
      ctx.beginPath(); ctx.arc(-24, -10.6, 0.9, 0, TAU);
      ctx.fillStyle = "rgba(60,52,44,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(120,96,64,0.6)"; ctx.lineWidth = 0.2; ctx.stroke();
    }
    // frame
    if (v.frame === "arch") {
      // stone arch framing the left edge, grounded
      ctx.fillStyle = "rgba(112,94,70,0.97)";
      ctx.fillRect(-50, -44, 6.4, 44);
      ctx.fillRect(-38, -42, 5.0, 42);
      ctx.beginPath();
      ctx.moveTo(-50, -44);
      ctx.quadraticCurveTo(-41, -54, -33, -42);
      ctx.lineTo(-33, -38);
      ctx.quadraticCurveTo(-41, -49, -50, -38);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(64,50,34,0.55)"; ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(-46.8, -42); ctx.quadraticCurveTo(-41, -49, -35.5, -40);
      ctx.stroke();
    } else if (v.frame === "banner") {
      ctx.fillStyle = "rgba(168,64,44,0.92)";
      ctx.fillRect(-50, -38, 9, 38);
      ctx.fillStyle = "rgba(226,206,170,0.9)";
      ctx.fillRect(-49, -36, 2, 34);
      ctx.strokeStyle = "rgba(74,50,30,0.7)"; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(-50, -38); ctx.lineTo(-41, -38); ctx.stroke();
      ctx.beginPath(); ctx.arc(-45.5, -39.2, 0.9, 0, TAU);
      ctx.fillStyle = "rgba(196,150,78,0.9)"; ctx.fill();
    }
    // weather
    if (v.weather === "rain") {
      for (let i = 0; i < 20; i++) {
        const q = (t * 0.5 + i * 0.08) % 1;
        ctx.strokeStyle = "rgba(226,232,226,0.13)"; ctx.lineWidth = 0.12;
        ctx.beginPath(); ctx.moveTo(-46 + i * 4.8, -34 + q * 30); ctx.lineTo(-45.2 + i * 4.8, -31 + q * 30); ctx.stroke();
      }
    }
  }

  function modernMap(ctx, t, v) {
    const pal = PAL[v.palette] || PAL.dawn;
    const skyG = ctx.createRadialGradient(0, -30, 6, 0, -24, 56);
    skyG.addColorStop(0, hexA(pal.mid, 0.6));
    skyG.addColorStop(1, hexA(pal.mid, 0));
    ctx.fillStyle = skyG;
    ctx.fillRect(-50, -62, 100, 62);
    const grd = ctx.createLinearGradient(0, -16, 0, 0);
    grd.addColorStop(0, hexA("#b49c78", 0));
    grd.addColorStop(1, hexA("#b49c78", 0.92));
    ctx.fillStyle = grd;
    ctx.fillRect(-50, -16, 100, 16);
    ctx.fillStyle = "rgba(226,216,194,0.96)";
    ctx.fillRect(-14, -30, 28, 16);
    ctx.strokeStyle = "rgba(74,60,44,0.5)"; ctx.lineWidth = 0.3;
    ctx.strokeRect(-14, -30, 28, 16);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(240,232,214,0.97)";
      ctx.fillRect(-11 + i * 5.2, -26, 1.4, 10);
    }
    ctx.strokeStyle = "rgba(64,46,30,0.9)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-28, -6); ctx.lineTo(-28, -34); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = (v.flagCols && v.flagCols[i]) || ["rgba(74,104,138,0.96)", "rgba(242,234,214,0.97)", "rgba(168,64,44,0.96)"][i];
      ctx.fillRect(-27.6 + i * 2.0, -33.6, 2.0, 4.0);
    }
    for (let i = 0; i < 4; i++) p(ctx, -18 + i * 8, -5, 0.34, "rgba(58,42,26,0.98)", { phase: t + i });
  }

  /* ── registry ──────────────────────────────────────────── */
  const FAMILIES = {
    siege: { defaults: { family: "siege", palette: "dawn", structure: "walls", skyline: "walls", crowd: "soldiers", weather: "smoke", frame: "tent", props: ["cannon"] }, stage: siegeStage, map: siegeMap },
    caravel: { defaults: { family: "caravel", palette: "dawn", skyline: "palms", crowd: "sailors", weather: "clear", frame: "rigging", props: ["cross"], flag: RED }, stage: caravelStage, map: caravelMap },
    modern: { defaults: { family: "modern", palette: "dawn", structure: "capitol", crowd: "citizens", weather: "clear", frame: "arch", props: [], flagCols: ["rgba(74,104,138,0.96)", "rgba(242,234,214,0.97)", "rgba(168,64,44,0.96)"] }, stage: modernStage, map: modernMap },
  };

  const OVERRIDES = {
    "fall-of-constantinople": { family: "siege", palette: "dawn", structure: "walls", skyline: "walls", weather: "smoke", crowd: "soldiers", frame: "banner", props: ["cannon", "chain"], flag: "rgba(168,64,44,0.95)" },
    "mongols-sack-baghdad": { family: "siege", palette: "dusk", structure: "gate", skyline: "city", weather: "smoke", crowd: "soldiers", frame: "tent", props: ["tower"], flag: "rgba(84,104,122,0.95)" },
    "fall-of-granada": { family: "siege", palette: "noon", structure: "keep", skyline: "mountains", weather: "dust", crowd: "soldiers", frame: "rocks", props: [], flag: "rgba(196,150,78,0.95)" },
    "sack-of-rome": { family: "siege", palette: "storm", structure: "walls", skyline: "city", weather: "dust", crowd: "soldiers", frame: "rocks", props: ["tower"], flag: "rgba(168,64,44,0.9)" },
    "siege-of-leningrad": { family: "siege", palette: "snow", structure: "keep", skyline: "city", weather: "snow", crowd: "soldiers", frame: "tent", props: [], flag: "rgba(168,64,44,0.9)" },
    "cabral-reaches-brazil": { family: "caravel", palette: "dawn", skyline: "palms", weather: "clear", crowd: "sailors", frame: "rigging", flag: "rgba(168,64,44,0.95)", landmark: "cross" },
    "magellans-circumnavigation": { family: "caravel", palette: "storm", skyline: "cliffs", weather: "storm", crowd: "sailors", frame: "hull", flag: "rgba(168,64,44,0.95)" },
    "the-mayflower": { family: "caravel", palette: "dusk", skyline: "cliffs", weather: "clear", crowd: "sailors", frame: "rigging", flag: "rgba(84,104,122,0.95)", landmark: "shallop" },
    "cook-at-tahiti": { family: "caravel", palette: "noon", skyline: "palms", weather: "clear", crowd: "sailors", frame: "palms", flag: "rgba(74,104,138,0.95)", landmark: "canoe" },
    "bering-reaches-alaska": { family: "caravel", palette: "snow", skyline: "cliffs", weather: "snow", crowd: "sailors", frame: "hull", flag: "rgba(84,104,122,0.95)", landmark: "ice" },
    "declaration-of-independence": { family: "modern", palette: "dawn", structure: "capitol", crowd: "citizens", frame: "arch", weather: "clear", props: ["document"], flagCols: ["rgba(74,104,138,0.96)", "rgba(242,234,214,0.97)", "rgba(168,64,44,0.96)"] },
    "haiti-independent": { family: "modern", palette: "noon", structure: "square", crowd: "citizens", frame: "banner", weather: "clear", props: ["drums"], flagCols: ["rgba(74,104,138,0.96)", "rgba(168,64,44,0.96)", "rgba(168,64,44,0.96)"] },
    "greek-war-of-independence": { family: "modern", palette: "dusk", structure: "square", crowd: "soldiers", frame: "arch", weather: "clear", props: ["church"], flagCols: ["rgba(74,104,138,0.96)", "rgba(242,234,214,0.97)", "rgba(74,104,138,0.96)"] },
    "italian-unification": { family: "modern", palette: "noon", structure: "capitol", crowd: "citizens", frame: "banner", weather: "clear", props: ["statue"], flagCols: ["rgba(88,140,90,0.96)", "rgba(242,234,214,0.97)", "rgba(168,64,44,0.96)"] },
    "indonesia-proclaims-independence": { family: "modern", palette: "dawn", structure: "square", crowd: "citizens", frame: "banner", weather: "clear", props: ["microphone"], flagCols: ["rgba(168,64,44,0.96)", "rgba(242,234,214,0.97)", "rgba(242,234,214,0.97)"] },
    "peoples-republic-of-china": { family: "modern", palette: "noon", structure: "tiananmen", crowd: "citizens", frame: "none", weather: "clear", props: [], flagCols: ["rgba(168,64,44,0.97)", "rgba(168,64,44,0.97)", "rgba(168,64,44,0.97)"] },
    "marco-polo-bridge-incident": { family: "siege", palette: "dawn", structure: "gate", skyline: "city", weather: "smoke", crowd: "soldiers", frame: "banner", props: ["cannon"], flag: "rgba(168,64,44,0.95)" },
    "battle-of-shanghai": { family: "siege", palette: "storm", structure: "walls", skyline: "city", weather: "smoke", crowd: "soldiers", frame: "rocks", props: ["cannon"], flag: "rgba(168,64,44,0.95)" },
    "battle-of-taierzhuang": { family: "siege", palette: "noon", structure: "gate", skyline: "city", weather: "dust", crowd: "soldiers", frame: "banner", props: ["cannon"], flag: "rgba(168,64,44,0.95)" },
    "battle-of-wuhan": { family: "siege", palette: "dusk", structure: "walls", skyline: "city", weather: "smoke", crowd: "soldiers", frame: "tent", props: ["cannon"], flag: "rgba(168,64,44,0.95)" },
    "hundred-regiments-offensive": { family: "siege", palette: "dawn", structure: "keep", skyline: "mountains", weather: "dust", crowd: "soldiers", frame: "rocks", props: ["tower"], flag: "rgba(168,64,44,0.95)" },
    "battle-of-plassey": { family: "siege", palette: "noon", structure: "gate", skyline: "city", weather: "dust", crowd: "soldiers", frame: "tent", props: ["cannon"], flag: "rgba(74,104,138,0.95)" },
    "mukden-incident": { family: "siege", palette: "dusk", structure: "gate", skyline: "city", weather: "smoke", crowd: "soldiers", frame: "banner", props: ["cannon"], flag: "rgba(168,64,44,0.95)" },
    "ottoman-conquest-of-egypt": { family: "siege", palette: "noon", structure: "walls", skyline: "city", weather: "smoke", crowd: "soldiers", frame: "tent", props: ["cannon"], flag: "rgba(64,120,96,0.95)" },
    "battle-of-mohacs": { family: "siege", palette: "storm", structure: "walls", skyline: "city", weather: "dust", crowd: "soldiers", frame: "banner", props: ["cannon"], flag: "rgba(168,64,44,0.95)" },
    "siege-of-vienna-1529": { family: "siege", palette: "dawn", structure: "walls", skyline: "city", weather: "smoke", crowd: "soldiers", frame: "tent", props: ["cannon"], flag: "rgba(168,64,44,0.95)" },
    "second-italo-ethiopian-war": { family: "siege", palette: "noon", structure: "keep", skyline: "mountains", weather: "dust", crowd: "soldiers", frame: "rocks", props: ["cannon"], flag: "rgba(64,120,96,0.95)" },
    "second-battle-of-el-alamein": { family: "siege", palette: "noon", structure: "walls", skyline: "mountains", weather: "dust", crowd: "soldiers", frame: "tent", props: ["cannon"], flag: "rgba(74,104,138,0.95)" },
  };

  function eventById(id) {
    const A = window.WORLD_ATLAS;
    return A && A.events ? A.events.find((e) => e.id === id) : null;
  }

  function paramsFor(id) {
    const o = OVERRIDES[id];
    if (!o) return null;
    const fam = FAMILIES[o.family];
    if (!fam) return null;
    const ev = eventById(id);
    const p = Object.assign({}, fam.defaults, o, {
      year: ev ? ev.y : null,
      region: ev ? ev.rg : null,
      title: ev ? ev.t[1] : "",
    });
    // derived defaults keep every variant sensible
    if (!p.flag && fam.defaults.flag) p.flag = fam.defaults.flag;
    if (!p.flagCols && fam.defaults.flagCols) p.flagCols = fam.defaults.flagCols;
    return p;
  }

  function has(id) { return !!OVERRIDES[id]; }
  function title(id) {
    const p = paramsFor(id);
    return p ? p.title : "";
  }

  function drawStage(ctx, id, W, H, t) {
    const p = paramsFor(id);
    if (!p || !window.HeroScenes) return false;
    const fam = FAMILIES[p.family];
    window.HeroScenes.stage(ctx, W, H, t, (c, top, tt) => fam.stage(c, top, tt, p));
    return true;
  }

  function drawMap(ctx, id, x, y, s, t) {
    const p = paramsFor(id);
    if (!p || !window.HeroScenes) return false;
    const fam = FAMILIES[p.family];
    window.HeroScenes.mapWrap(ctx, x, y, s, t, (c, tt) => fam.map(c, tt, p));
    return true;
  }

  window.VariantScenes = {
    has, title, drawStage, drawMap,
    params: paramsFor,
    list: () => Object.keys(OVERRIDES),
  };
})();
