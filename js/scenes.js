/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Scene engine
   24 procedural woodblock-style animations, drawn live on canvas.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const A = window.WORLD_ATLAS;

  /* Choose a visual family from the event's culture, era and type.
     Explicit overrides live in data/scene_variants.json. */
  function styleFor(ev) {
    if (!ev) return "march";
    if (A && A.sceneVariants && A.sceneVariants[ev.id]) return A.sceneVariants[ev.id];
    const title = ((ev.t && ev.t[0]) || "") + " " + ((ev.t && ev.t[1]) || "");
    const founding = !/灭亡|崩溃|终结|陷落|战败|沦陷|fall of|collapse|end of|sack of/i.test(title)
      && /建立|建国|开国|成立|加冕|王朝|帝国|统一|独立|founded|founding|coronation|dynasty|empire|unification|independence|declares/i.test(title);
    if (founding) {
      if (ev.c === "CN" || ev.rg === "ea") return "cn-founding";
      if (ev.c === "IT" || ev.c === "GR" || /rome|roman|greek|byzant/i.test(title)) return "roman-founding";
      if ((ev.rg === "me" || ev.rg === "af" || ev.rg === "sa" || ev.rg === "sea") && ev.y > 550) return "islamic-founding";
      if (ev.y >= 1800) return "modern-founding";
      if (ev.y <= -3000) return "megalith";
      return "castle-founding";
    }
    if (ev.s === "cavalry") return ev.rg === "ea" ? "cn-cavalry" : "cavalry";
    if (ev.s === "naval") return ev.y < -200 ? "greek-naval" : "naval";
    if (ev.s === "temple") return (ev.v === "dome" || ev.rg === "sa" || ev.rg === "me") ? "mughal-tomb" : "temple";
    if (ev.s === "city" && ev.k === "science") return /纸|造纸|印刷|paper|print/i.test(title) ? "paper" : "city";
    if (ev.s === "city" && ev.k === "temple") return "monument";
    if (ev.s === "revolution" || ev.s === "protest") return "revolution";
    return ev.s;
  }

  function rng(seed) {
    let s = (seed * 9301 + 49297) % 233280 || 12345;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  // ── shared palette ─────────────────────────────
  function shipKind(opts) {
    const y = (opts && opts.year) || 0;
    const rg = opts && opts.region;
    if (y >= 1830) return "steam";
    if (rg === "ea" || rg === "sea") return "junk";
    if (rg === "oc") return "outrigger";
    if (y >= 1450) return "caravel";
    return "trireme";
  }

  function palette(opts) {
    const accent = (opts && opts.color) || "#c0553a";
    return {
      bg0: "#0f0c09",
      bg1: "#1d1610",
      bg2: "#2a2016",
      ink: "#ead9b7",
      ink2: "#c4ad86",
      dim: "#8f7a5b",
      faint: "#5e4d39",
      accent,
      accent2: accent,
      gold: "#d3a94f",
      line: "rgba(234,217,183,0.16)",
    };
  }

  // grain texture
  const grainCache = new WeakMap();
  function getGrain(ctx) {
    if (grainCache.has(ctx)) return grainCache.get(ctx);
    const c = document.createElement("canvas");
    c.width = 140; c.height = 140;
    const g = c.getContext("2d");
    const r = rng(7);
    for (let i = 0; i < 2600; i++) {
      const a = r() * 0.5;
      g.fillStyle = r() > 0.5 ? "rgba(255,245,225," + a + ")" : "rgba(0,0,0," + a + ")";
      g.fillRect(Math.floor(r() * 140), Math.floor(r() * 140), 1, 1);
    }
    const pat = ctx.createPattern(c, "repeat");
    grainCache.set(ctx, pat);
    return pat;
  }

  function finish(ctx, W, H, P) {
    // vignette
    const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.72, "rgba(0,0,0,0.18)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    // grain
    const gp = getGrain(ctx);
    if (gp) {
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = gp;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // thin bottom fade
    const fg = ctx.createLinearGradient(0, H * 0.82, 0, H);
    fg.addColorStop(0, "rgba(12,9,6,0)");
    fg.addColorStop(1, "rgba(12,9,6,0.62)");
    ctx.fillStyle = fg;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
  }

  function sky(ctx, W, H, top, bottom, horizon) {
    const g = ctx.createLinearGradient(0, 0, 0, H * horizon);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
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

  function stars(ctx, W, H, t, count, seed, alpha) {
    const r = rng(seed);
    for (let i = 0; i < count; i++) {
      const x = r() * W, y = r() * H * 0.6, s = r() * 1.2 + 0.3;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.4 + r()) + i));
      ctx.fillStyle = "rgba(235,222,190," + (alpha * tw) + ")";
      ctx.fillRect(x, y, s, s);
    }
  }

  function ridge(ctx, W, baseY, amp, color, seed, step) {
    const r = rng(seed);
    const n = 7;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(baseY - r() * amp);
    ctx.beginPath();
    ctx.moveTo(0, baseY + 40);
    for (let i = 0; i <= n; i++) {
      const x = (W / n) * i;
      const y = pts[i];
      if (i === 0) ctx.lineTo(x, y);
      else {
        const px = (W / n) * (i - 1), py = pts[i - 1];
        ctx.quadraticCurveTo((px + x) / 2, Math.min(py, y) - amp * 0.15, x, y);
      }
    }
    ctx.lineTo(W, baseY + 60);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function dune(ctx, W, y, h, color, seed) {
    const r = rng(seed);
    ctx.beginPath();
    ctx.moveTo(-40, y + 80);
    let x = -40;
    while (x < W + 40) {
      const w = 120 + r() * 220;
      ctx.quadraticCurveTo(x + w / 2, y - h * (0.4 + r() * 0.8), x + w, y + r() * 14);
      x += w;
    }
    ctx.lineTo(W + 40, y + 120);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* ══════════════ ACTORS ══════════════ */

  function mammoth(ctx, x, gy, s, phase, col) {
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    const bob = Math.sin(phase * 1.8) * 1.4;
    const sw = Math.sin(phase * 4.2);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    // hind legs
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-14, -22 + bob); ctx.lineTo(-16 + sw * 4, -2);
    ctx.moveTo(-5, -22 + bob); ctx.lineTo(-3 - sw * 4, -2);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.ellipse(0, -34 + bob, 27, 19, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-4, -48 + bob, 16, 13, -0.1, 0, TAU);
    ctx.fill();
    // head
    ctx.beginPath();
    ctx.ellipse(24, -40 + bob, 12, 13, 0.15, 0, TAU);
    ctx.fill();
    // front legs
    ctx.beginPath();
    ctx.moveTo(14, -24 + bob); ctx.lineTo(16 - sw * 4, -2);
    ctx.moveTo(22, -24 + bob); ctx.lineTo(24 + sw * 4, -2);
    ctx.stroke();
    // trunk
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(33, -36 + bob);
    ctx.quadraticCurveTo(43, -22 + bob + Math.sin(phase * 2.3) * 2, 37, -6 + bob);
    ctx.stroke();
    // tusks
    ctx.strokeStyle = "#efe2c4";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(31, -31 + bob);
    ctx.quadraticCurveTo(43, -29 + bob, 46, -20 + bob);
    ctx.stroke();
    // eye
    ctx.fillStyle = "#20170f";
    ctx.beginPath(); ctx.arc(27, -44 + bob, 1.2, 0, TAU); ctx.fill();
    // fur strokes
    ctx.strokeStyle = "rgba(0,0,0,0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-18 + i * 8, -48 + bob);
      ctx.lineTo(-16 + i * 8, -30 + bob);
      ctx.stroke();
    }
    ctx.restore();
  }

  function horse(ctx, x, gy, s, phase, col, rider, riderCol, riderKind) {
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    const g = Math.sin(phase * 7);
    const g2 = Math.sin(phase * 7 + Math.PI);
    const bob = Math.abs(Math.sin(phase * 7)) * 1.8;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineCap = "round";
    // tail
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-24, -30 - bob);
    ctx.quadraticCurveTo(-34, -26 - bob + g * 2, -31, -16 - bob);
    ctx.stroke();
    // legs
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-15, -22 - bob); ctx.lineTo(-17 + g * 5, -9 - bob); ctx.lineTo(-18 + g * 7, 0);
    ctx.moveTo(-7, -22 - bob); ctx.lineTo(-5 + g2 * 5, -9 - bob); ctx.lineTo(-4 + g2 * 7, 0);
    ctx.moveTo(14, -23 - bob); ctx.lineTo(16 + g2 * 5, -10 - bob); ctx.lineTo(17 + g2 * 7, 0);
    ctx.moveTo(20, -23 - bob); ctx.lineTo(22 + g * 5, -10 - bob); ctx.lineTo(24 + g * 7, 0);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.ellipse(0, -30 - bob, 22, 10, -0.03, 0, TAU);
    ctx.fill();
    // neck and head
    ctx.beginPath();
    ctx.moveTo(14, -36 - bob);
    ctx.quadraticCurveTo(24, -46 - bob, 30, -47 - bob);
    ctx.lineTo(36, -43 - bob);
    ctx.quadraticCurveTo(27, -39 - bob, 22, -30 - bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(35, -44 - bob, 6, 3.4, 0.35, 0, TAU);
    ctx.fill();
    // mane
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(17, -38 - bob);
    ctx.quadraticCurveTo(23, -46 - bob, 28, -47 - bob);
    ctx.stroke();
    // rider — horse archer, knight, cataphract or dragoon
    if (rider) {
      const rk = riderKind || "archer";
      ctx.fillStyle = riderCol || col;
      ctx.beginPath();
      ctx.ellipse(1, -48 - bob, 5, 7, -0.08, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2, -57 - bob, 3.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = riderCol || col;
      ctx.lineWidth = 2;
      if (rk === "knight" || rk === "cataphract") {
        // lance
        ctx.beginPath();
        ctx.moveTo(5, -52 - bob); ctx.lineTo(30, -47 - bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, -47 - bob); ctx.lineTo(25, -49 - bob); ctx.moveTo(30, -47 - bob); ctx.lineTo(26, -44 - bob); ctx.stroke();
        // shield
        ctx.beginPath(); ctx.arc(1, -49 - bob, 5, 0, TAU);
        ctx.fillStyle = "rgba(40,30,20,0.85)"; ctx.fill();
        ctx.strokeStyle = riderCol || col; ctx.lineWidth = 1.2; ctx.stroke();
        // helmet
        ctx.beginPath(); ctx.arc(2, -59 - bob, 3.6, Math.PI, TAU); ctx.fillStyle = riderCol || col; ctx.fill();
        ctx.fillRect(1.6, -61 - bob, 1.2, 4);
        if (rk === "cataphract") {
          ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.8;
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(-14 + i * 6, -30 - bob, 4, Math.PI * 1.05, Math.PI * 1.95);
            ctx.stroke();
          }
        }
      } else if (rk === "dragoon") {
        // musket and hat
        ctx.beginPath();
        ctx.moveTo(4, -50 - bob); ctx.lineTo(23, -55 - bob); ctx.stroke();
        ctx.fillStyle = "rgba(40,30,20,0.9)";
        ctx.fillRect(2, -61 - bob, 6, 2);
        ctx.beginPath(); ctx.arc(2, -58 - bob, 3.6, 0, TAU); ctx.fillStyle = riderCol || col; ctx.fill();
      } else {
        // bow arm
        ctx.beginPath();
        ctx.moveTo(4, -50 - bob); ctx.lineTo(13, -52 - bob); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(15, -52 - bob, 6, -1.1, 1.1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function camel(ctx, x, gy, s, phase, col) {
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    const g = Math.sin(phase * 5.5);
    const g2 = Math.sin(phase * 5.5 + Math.PI);
    const bob = Math.abs(Math.sin(phase * 5.5)) * 1.4;
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineCap = "round";
    ctx.lineWidth = 2.6;
    // legs
    ctx.beginPath();
    ctx.moveTo(-14, -20 - bob); ctx.lineTo(-16 + g * 3, -1);
    ctx.moveTo(-6, -20 - bob); ctx.lineTo(-5 + g2 * 3, -1);
    ctx.moveTo(10, -20 - bob); ctx.lineTo(11 + g2 * 3, -1);
    ctx.moveTo(17, -20 - bob); ctx.lineTo(19 + g * 3, -1);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.ellipse(0, -25 - bob, 19, 9, 0, 0, TAU);
    ctx.fill();
    // humps
    ctx.beginPath(); ctx.arc(-6, -33 - bob, 7, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -33 - bob, 6.5, Math.PI, TAU); ctx.fill();
    // neck
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(15, -28 - bob);
    ctx.quadraticCurveTo(24, -42 - bob, 27, -50 - bob);
    ctx.stroke();
    // head
    ctx.beginPath();
    ctx.ellipse(30, -50 - bob, 6, 3.2, 0.35, 0, TAU);
    ctx.fill();
    // ear
    ctx.beginPath(); ctx.arc(27, -54 - bob, 1.8, 0, TAU); ctx.fill();
    // tail
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-19, -26 - bob); ctx.lineTo(-22, -15 - bob); ctx.stroke();
    // cargo
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-10, -37 - bob, 8, 7);
    ctx.fillRect(2, -37 - bob, 8, 7);
    ctx.restore();
  }

  function person(ctx, x, gy, s, phase, col, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    const sw = Math.sin(phase * (opts.speed || 6));
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineCap = "round";
    // legs
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(sw * 4, -1);
    ctx.moveTo(0, -10); ctx.lineTo(-sw * 4, -1);
    ctx.stroke();
    // body
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(0, -21); ctx.lineTo(0, -10);
    ctx.stroke();
    // head
    ctx.beginPath(); ctx.arc(0, -24.5, 3.1, 0, TAU); ctx.fill();
    // arms
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -19); ctx.lineTo(4 + sw * 2, -13);
    ctx.moveTo(0, -19); ctx.lineTo(-4 - sw * 2, -13);
    ctx.stroke();
    if (opts.spear) {
      ctx.strokeStyle = opts.spearCol || col;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-6, -30); ctx.lineTo(7, -13);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(7, -13); ctx.lineTo(9, -16); ctx.moveTo(7, -13); ctx.lineTo(4, -14);
      ctx.stroke();
    }
    if (opts.shield) {
      ctx.beginPath(); ctx.arc(-5, -16, 5, 0, TAU);
      ctx.fillStyle = opts.shieldCol || col;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 0.8; ctx.stroke();
    }
    if (opts.helmet) {
      ctx.beginPath(); ctx.arc(0, -25.5, 3.8, Math.PI, TAU); ctx.fill();
      ctx.fillRect(-0.6, -27.5, 1.2, 3);
    }
    if (opts.hoe) {
      ctx.strokeStyle = opts.spearCol || col;
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-3, -20); ctx.lineTo(9, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(12, -8); ctx.stroke();
    }
    if (opts.bundle) {
      ctx.beginPath(); ctx.arc(-3, -26, 3.4, 0, TAU); ctx.fill();
    }
    if (opts.raised) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(6, -29); ctx.stroke();
    }
    ctx.restore();
  }

  function ship(ctx, x, wy, s, phase, hullCol, sailCol, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(x, wy + Math.sin(phase * 1.2) * 2);
    ctx.scale(s, s);
    ctx.rotate(Math.sin(phase * 1.2 + 0.6) * 0.018);
    const kind = opts.kind || "sail";
    ctx.fillStyle = hullCol;
    ctx.strokeStyle = hullCol;
    // hull
    ctx.beginPath();
    ctx.moveTo(-38, -6);
    ctx.quadraticCurveTo(-20, 8, 0, 8);
    ctx.quadraticCurveTo(24, 8, 38, -8);
    ctx.lineTo(30, -10);
    ctx.lineTo(-30, -10);
    ctx.closePath();
    ctx.fill();
    if (kind === "oar" || kind === "trireme") {
      ctx.strokeStyle = hexA("#d8c49c", 0.5);
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const ox = -24 + i * 7;
        ctx.beginPath();
        ctx.moveTo(ox, -4);
        ctx.lineTo(ox - 10 + Math.sin(phase * 4 + i) * 2, 9);
        ctx.stroke();
      }
    }
    const billow = Math.sin(phase * 1.5) * 3;
    if (kind === "junk") {
      // high stern and battened sails
      ctx.fillStyle = hullCol;
      ctx.beginPath();
      ctx.moveTo(-38, -6); ctx.lineTo(-40, -24); ctx.lineTo(-28, -24); ctx.lineTo(-26, -8); ctx.closePath(); ctx.fill();
      for (const [mx, mh, sw] of [[-18, 62, 12], [2, 74, 15], [20, 52, 10]]) {
        ctx.strokeStyle = hullCol; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mx, -10); ctx.lineTo(mx, -mh); ctx.stroke();
        ctx.fillStyle = sailCol;
        ctx.beginPath();
        ctx.moveTo(mx + 1, -mh + 4);
        ctx.quadraticCurveTo(mx + sw + billow, -mh * 0.65, mx + 1, -mh * 0.35);
        ctx.lineTo(mx - sw * 0.4, -mh * 0.4);
        ctx.quadraticCurveTo(mx - sw * 0.2 + billow, -mh * 0.7, mx - sw * 0.4, -mh + 4);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(40,30,20,0.5)"; ctx.lineWidth = 0.7;
        for (let k = 1; k < 6; k++) {
          ctx.beginPath();
          ctx.moveTo(mx - sw * 0.4, -mh + 4 + k * (mh * 0.55 / 6));
          ctx.lineTo(mx + 1 + sw * 0.7, -mh + 4 + k * (mh * 0.55 / 6));
          ctx.stroke();
        }
      }
    } else if (kind === "caravel") {
      for (const [mx, mh, sw] of [[-14, 54, 10], [10, 66, 13]]) {
        ctx.strokeStyle = hullCol; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mx, -10); ctx.lineTo(mx, -mh); ctx.stroke();
        ctx.fillStyle = sailCol;
        ctx.beginPath();
        ctx.moveTo(mx + 1, -mh + 4);
        ctx.quadraticCurveTo(mx + sw + billow, -mh * 0.55, mx + 1, -mh * 0.28);
        ctx.lineTo(mx - 1, -mh * 0.28);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(mx - 1, -mh + 4);
        ctx.lineTo(mx - sw * 0.8, -mh * 0.45);
        ctx.lineTo(mx - 1, -mh * 0.28);
        ctx.closePath(); ctx.fill();
      }
      // lateen bowsprit
      ctx.strokeStyle = hullCol; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(30, -10); ctx.lineTo(48, -30); ctx.stroke();
      ctx.fillStyle = sailCol;
      ctx.beginPath(); ctx.moveTo(34, -12); ctx.lineTo(47, -30); ctx.lineTo(42, -12); ctx.closePath(); ctx.fill();
    } else if (kind === "outrigger") {
      // double-hulled Polynesian voyaging canoe with a crab-claw sail
      ctx.strokeStyle = hullCol; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(34, 2); ctx.stroke();
      ctx.strokeStyle = "rgba(216,196,156,0.7)"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(-12 + i * 8, -2); ctx.lineTo(-2 + i * 8, 7); ctx.stroke();
      }
      ctx.strokeStyle = hullCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(4, -58); ctx.stroke();
      ctx.fillStyle = sailCol;
      ctx.beginPath();
      ctx.moveTo(5, -56);
      ctx.quadraticCurveTo(34 + billow, -42, 8, -20);
      ctx.quadraticCurveTo(20, -38, 5, -30);
      ctx.closePath(); ctx.fill();
    } else if (kind === "steam") {
      // funnel, paddle wheel and smoke
      ctx.fillStyle = "#4a3a28";
      ctx.fillRect(-14, -38, 9, 20);
      ctx.fillStyle = "rgba(40,30,20,0.85)";
      ctx.fillRect(-15, -42, 11, 5);
      for (let i = 0; i < 4; i++) {
        const ph = (phase * 0.5 + i * 0.25) % 1;
        ctx.beginPath();
        ctx.arc(-28 - ph * 22, -44 - ph * 26, 4 + ph * 9, 0, TAU);
        ctx.fillStyle = "rgba(210,200,180," + (0.06 * (1 - ph)) + ")";
        ctx.fill();
      }
      ctx.save();
      ctx.translate(26, -8); ctx.rotate(phase * 4);
      ctx.strokeStyle = hullCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = hullCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-20, -34); ctx.stroke();
    } else {
      // mast + lateen sails
      ctx.strokeStyle = hullCol;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -58); ctx.stroke();
      ctx.fillStyle = sailCol;
      ctx.beginPath();
      ctx.moveTo(2, -54);
      ctx.quadraticCurveTo(26 + billow, -40, 2, -22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-2, -48);
      ctx.quadraticCurveTo(-18 + billow, -36, -2, -26);
      ctx.closePath();
      ctx.fill();
    }
    // flag
    const flagTop = kind === "junk" || kind === "caravel" ? -70 : kind === "steam" ? -42 : -58;
    ctx.beginPath();
    ctx.moveTo(0, flagTop);
    ctx.quadraticCurveTo(10, flagTop - 2 + Math.sin(phase * 3) * 2, 12, flagTop + 4);
    ctx.lineTo(0, flagTop + 4);
    ctx.closePath();
    ctx.fillStyle = opts.flagCol || "#c0553a";
    ctx.fill();
    ctx.restore();
  }

  function cannon(ctx, x, gy, s, phase, col, fired) {
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    // wheel
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(-6, -8, 8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + phase * 0.2;
      ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6 + Math.cos(a) * 7, -8 + Math.sin(a) * 7); ctx.stroke();
    }
    // carriage
    ctx.beginPath();
    ctx.moveTo(-16, -8); ctx.lineTo(10, -12); ctx.lineTo(10, -6); ctx.lineTo(-14, -2);
    ctx.closePath(); ctx.fill();
    // barrel
    ctx.save();
    ctx.translate(6, -14);
    ctx.rotate(-0.18);
    ctx.fillRect(-4, -4, 28, 8);
    ctx.restore();
    if (fired) {
      glow(ctx, 34, -16, 26, "#ffd27a", 0.55);
      ctx.beginPath();
      ctx.moveTo(33, -18); ctx.lineTo(50, -24); ctx.lineTo(47, -16); ctx.lineTo(52, -12); ctx.lineTo(33, -12);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,214,130,0.9)";
      ctx.fill();
    }
    ctx.restore();
  }

  function plane(ctx, x, y, s, col, kind) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    if (kind === "bomber") {
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 4.2, 0, 0, TAU); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-2, -2); ctx.lineTo(-12, -16); ctx.lineTo(-6, -16); ctx.lineTo(4, -2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-2, 2); ctx.lineTo(-12, 16); ctx.lineTo(-6, 16); ctx.lineTo(4, 2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-22, -2); ctx.lineTo(-28, -10); ctx.lineTo(-24, -10); ctx.lineTo(-18, -1);
      ctx.closePath(); ctx.fill();
      // engines
      ctx.beginPath(); ctx.arc(2, -12, 2.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2, 12, 2.6, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-8, -10); ctx.lineTo(-3, -10); ctx.lineTo(4, -1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(-8, 10); ctx.lineTo(-3, 10); ctx.lineTo(4, 1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function rocket(ctx, x, y, s, col, flame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.quadraticCurveTo(7, -26, 6, 0);
    ctx.lineTo(-6, 0);
    ctx.quadraticCurveTo(-7, -26, 0, -40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-11, 10); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -2); ctx.lineTo(11, 10); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(20,16,12,0.55)";
    ctx.beginPath(); ctx.arc(0, -27, 2.2, 0, TAU); ctx.fill();
    if (flame) {
      const f = 18 + Math.sin(performance.now() * 0.02) * 5;
      const g = ctx.createLinearGradient(0, 2, 0, 2 + f);
      g.addColorStop(0, "rgba(255,240,200,0.95)");
      g.addColorStop(0.4, "rgba(255,160,70,0.85)");
      g.addColorStop(1, "rgba(200,60,30,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-5, 2); ctx.quadraticCurveTo(0, 2 + f, 5, 2); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function mushroom(ctx, x, gy, s, p, P) {
    // p 0..1 growth
    const grow = smooth(clamp(p, 0, 1));
    const stemH = 120 * grow;
    const capW = 68 * grow;
    const capH = 46 * grow;
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    // stem
    const g = ctx.createLinearGradient(0, -stemH, 0, -stemH * 0.1);
    g.addColorStop(0, "rgba(226,180,120,0.85)");
    g.addColorStop(0.5, "rgba(184,120,70,0.75)");
    g.addColorStop(1, "rgba(120,70,40,0.5)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-14 - grow * 10, 0);
    ctx.quadraticCurveTo(-8 - grow * 6, -stemH * 0.55, -capW * 0.35, -stemH);
    ctx.lineTo(capW * 0.35, -stemH);
    ctx.quadraticCurveTo(8 + grow * 6, -stemH * 0.55, 14 + grow * 10, 0);
    ctx.closePath();
    ctx.fill();
    // cap
    const cap = ctx.createRadialGradient(0, -stemH - capH * 0.2, 2, 0, -stemH - capH * 0.2, capW);
    cap.addColorStop(0, "rgba(255,224,160,0.95)");
    cap.addColorStop(0.45, "rgba(218,150,80,0.9)");
    cap.addColorStop(1, "rgba(90,50,30,0.1)");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(0, -stemH - capH * 0.25, capW, capH, 0, 0, TAU);
    ctx.fill();
    // billowing lobes
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const rx = Math.cos(a) * capW * 0.72;
      const ry = Math.sin(a) * capH * 0.72 - stemH - capH * 0.2;
      ctx.beginPath();
      ctx.arc(rx, ry, capH * 0.42, 0, TAU);
      ctx.fillStyle = "rgba(196,130,78,0.28)";
      ctx.fill();
    }
    // underglow
    glow(ctx, 0, -stemH * 0.9, capW * 1.7, "#ffb35c", 0.20);
    // base dust
    ctx.fillStyle = "rgba(190,150,100,0.16)";
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * (20 + grow * 80), -6 - Math.sin(a) * 8, 18 + grow * 16, 8 + grow * 5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function building(ctx, x, gy, w, h, col, winCol, lit) {
    ctx.fillStyle = col;
    ctx.fillRect(x - w / 2, gy - h, w, h);
    if (lit) {
      const cols = Math.max(1, Math.round(w / 7));
      const rows = Math.max(1, Math.round(h / 9));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if ((i * 7 + j * 3) % 5 < 2) {
            ctx.fillStyle = winCol;
            ctx.fillRect(x - w / 2 + 3 + i * 7, gy - h + 4 + j * 9, 2.2, 3.2);
          }
        }
      }
    }
  }

  function flag(ctx, x, y, h, t, col, phase) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    for (let i = 0; i <= 6; i++) {
      const px = x + i * 3.2;
      const py = y - h + Math.sin(t * 4 + i * 0.7 + (phase || 0)) * 2.2;
      ctx.lineTo(px, py);
    }
    for (let i = 6; i >= 0; i--) {
      const px = x + i * 3.2;
      const py = y - h + 8 + Math.sin(t * 4 + i * 0.7 + (phase || 0)) * 2.2;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = hexA(col, 0.8);
    ctx.fill();
  }

  function smokePuff(ctx, x, y, r, a) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = "rgba(208,196,172," + a + ")";
    ctx.fill();
  }

  /* ══════════════ SCENES ══════════════ */

  const SCENES = {};

  SCENES.hunt = function (ctx, W, H, t, P) {
    const horizon = H * 0.64;
    sky(ctx, W, H, "#1b1719", "#6a4a30", 0.66);
    glow(ctx, W * 0.46, horizon - 18, H * 0.7, "#d08a4a", 0.24);
    ctx.beginPath(); ctx.arc(W * 0.46, horizon - 26, 30, 0, TAU);
    ctx.fillStyle = "rgba(226,172,108,0.58)"; ctx.fill();
    ridge(ctx, W, horizon - 4, 22, "#241c16", 11);
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, "#3a342a");
    g.addColorStop(1, "#1e1a15");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, W, H - horizon);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 197 + 60) % W, horizon + 34 + (i % 3) * 38, 120, 12, 0, 0, TAU);
      ctx.fillStyle = "rgba(226,216,195,0.055)"; ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      mammoth(ctx, W * 0.1 + i * 74, horizon + 16, 0.55, t * 1.4 + i, "rgba(200,185,155,0.32)");
    }
    const herd = [{ x: W * 0.56, s: 2.15, ph: 0 }, { x: W * 0.74, s: 1.8, ph: 1.3 }, { x: W * 0.9, s: 1.15, ph: 2.2 }];
    herd.forEach((m, i) => {
      const sway = Math.sin(t * 0.28 + m.ph) * 5;
      mammoth(ctx, m.x + sway, horizon + 92 + i * 4, m.s, t * 1.15 + m.ph, i === 0 ? "#e6d2ac" : "#d3bf99");
    });
    const hx = W * 0.14, hy = horizon + 104;
    person(ctx, hx, hy, 1.9, t, "#f0dfba", { spear: true, spearCol: "#f0dfba" });
    person(ctx, hx + 64, hy + 8, 1.7, t + 2, "#dcc8a0", { spear: true });
    person(ctx, hx + 126, hy + 2, 1.55, t + 4, "#c8b48c", {});
    person(ctx, hx + 180, hy + 12, 1.4, t + 6, "#b6a27c", { spear: true });
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.32 + i * 0.26) % 1;
      if (ph < 0.62) {
        const q = ph / 0.62;
        const sx = hx + 30 + i * 58, sy = hy - 34;
        const tx = W * 0.56 + i * 40, ty = horizon + 50 - i * 6;
        const x = lerp(sx, tx, q), y = lerp(sy, ty, q) - Math.sin(q * Math.PI) * 80;
        const ang = Math.atan2(ty - sy + Math.cos(q * Math.PI) * 80, tx - sx);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.strokeStyle = "#f4e6c6"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(9, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(4, -2.5); ctx.moveTo(9, 0); ctx.lineTo(4, 2.5); ctx.stroke();
        ctx.restore();
        if (q > 0.9) glow(ctx, tx, ty, 30, "#ffd9a0", 0.18);
      }
    }
    const r = rng(5);
    for (let i = 0; i < 90; i++) {
      const x = ((r() * W + t * (7 + r() * 10)) % (W + 20)) - 10;
      const y = ((r() * H + t * (10 + r() * 18)) % (H + 20)) - 10;
      ctx.fillStyle = "rgba(238,228,208," + (0.14 + r() * 0.28) + ")";
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  };

  SCENES.agri = function (ctx, W, H, t, P) {
    const horizon = H * 0.48;
    sky(ctx, W, H, "#211912", "#8a5c32", 0.55);
    glow(ctx, W * 0.3, horizon - 10, H * 0.55, "#e0a04a", 0.28);
    ctx.beginPath(); ctx.arc(W * 0.3, horizon - 18, 28, 0, TAU);
    ctx.fillStyle = "rgba(238,190,110,0.75)"; ctx.fill();
    ridge(ctx, W, horizon, 20, "#2a2118", 4);
    // terraced fields
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const y = horizon + 18 + i * ((H - horizon) / rows);
      ctx.beginPath();
      ctx.moveTo(-20, y + 34);
      ctx.quadraticCurveTo(W * 0.4, y - 14 + i * 4, W + 20, y + 22);
      ctx.lineTo(W + 20, y + 46);
      ctx.quadraticCurveTo(W * 0.45, y + 12 + i * 4, -20, y + 58);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "rgba(120,90,50,0.20)" : "rgba(150,115,62,0.16)";
      ctx.fill();
      ctx.strokeStyle = "rgba(220,190,130,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // wheat rows
    for (let row = 0; row < 4; row++) {
      const baseY = horizon + 60 + row * 36;
      for (let i = 0; i < 34; i++) {
        const x = ((i * 41 + row * 17) % (W + 40)) - 20;
        const sway = Math.sin(t * 2.2 + i * 0.5 + row) * 2.5;
        ctx.strokeStyle = "rgba(206,176,110,0.42)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.quadraticCurveTo(x + sway, baseY - 9, x + sway * 1.6, baseY - 17);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(x + sway * 1.6, baseY - 18, 1.2, 0, TAU);
        ctx.fillStyle = "rgba(224,190,120,0.55)"; ctx.fill();
      }
    }
    // farmers
    const fx = [W * 0.24, W * 0.52, W * 0.76];
    fx.forEach((x, i) => {
      const bend = 0.5 + 0.5 * Math.sin(t * 2 + i * 2.1);
      ctx.save();
      ctx.translate(x, horizon + 120 + i * 30);
      ctx.rotate(bend * 0.12);
      person(ctx, 0, 0, 1.6, t + i, "#2b2116", { hoe: true, hoeCol: "#2b2116" });
      ctx.restore();
    });
    // birds
    for (let i = 0; i < 5; i++) {
      const x = ((t * 18 + i * 120) % (W + 100)) - 50;
      const y = H * 0.18 + Math.sin(t + i) * 8;
      ctx.strokeStyle = "rgba(60,45,30,0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x - 2, y - 3, x, y);
      ctx.quadraticCurveTo(x + 2, y - 3, x + 4, y);
      ctx.stroke();
    }
  };

  SCENES.march = function (ctx, W, H, t, P) {
    const horizon = H * 0.6;
    sky(ctx, W, H, "#17120f", "#6e4a2e", 0.66);
    glow(ctx, W * 0.62, horizon - 30, H * 0.6, "#c77a3e", 0.2);
    ctx.beginPath(); ctx.arc(W * 0.62, horizon - 40, 30, 0, TAU);
    ctx.fillStyle = "rgba(220,160,90,0.55)"; ctx.fill();
    dune(ctx, W, horizon + 10, 18, "#2a2017", 9);
    dune(ctx, W, horizon + 74, 26, "#221a13", 13);
    // walkers
    const speed = 26;
    for (let i = 0; i < 14; i++) {
      const r = rng(i + 3);
      const off = r() * W;
      const x = ((t * speed + off) % (W + 160)) - 80;
      const y = horizon + 54 + (i % 4) * 12;
      const sc = 1.1 + r() * 0.5;
      person(ctx, x, y, sc, t * 2 + i, "#d8c5a0", { bundle: i % 3 === 0 });
      // shadow
    }
    // dust
    const r = rng(41);
    for (let i = 0; i < 26; i++) {
      const x = ((r() * W + t * 30) % (W + 40)) - 20;
      const y = horizon + 50 + r() * 50;
      ctx.beginPath(); ctx.arc(x, y, 2 + r() * 5, 0, TAU);
      ctx.fillStyle = "rgba(190,150,105,0.05)"; ctx.fill();
    }
  };

  SCENES.city = function (ctx, W, H, t, P, opts) {
    const horizon = H * 0.78;
    const ancient = (opts && opts.year != null ? opts.year : 0) < 1800;
    if (ancient) {
      sky(ctx, W, H, "#1a1410", "#7a4a2c", 0.74);
      glow(ctx, W * 0.7, horizon - 50, H * 0.8, "#e09a4e", 0.28);
      ctx.beginPath(); ctx.arc(W * 0.7, horizon - 58, 34, 0, TAU);
      ctx.fillStyle = "rgba(238,186,110,0.55)"; ctx.fill();
      ridge(ctx, W, horizon - 14, 18, "#2c2117", 6);
      // city wall
      ctx.fillStyle = "#3d2d1e";
      ctx.fillRect(0, horizon - 34, W, 44);
      ctx.fillStyle = "#4a3725";
      for (let i = 0; i < 26; i++) ctx.fillRect(i * (W / 26), horizon - 44, 12, 12);
      // gate tower
      ctx.fillStyle = "#453322";
      ctx.fillRect(W * 0.5, horizon - 96, 74, 106);
      for (let i = 0; i < 4; i++) ctx.fillRect(W * 0.5 + i * 19, horizon - 104, 10, 10);
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + 22, horizon + 8);
      ctx.lineTo(W * 0.5 + 22, horizon - 34);
      ctx.quadraticCurveTo(W * 0.5 + 37, horizon - 54, W * 0.5 + 52, horizon - 34);
      ctx.lineTo(W * 0.5 + 52, horizon + 8);
      ctx.closePath();
      ctx.fillStyle = "#1a130d"; ctx.fill();
      // ziggurat
      const zx = W * 0.24, zy = horizon - 8;
      for (let i = 0; i < 4; i++) {
        const w = 150 - i * 30;
        ctx.fillStyle = i % 2 ? "#4a3624" : "#543d28";
        ctx.fillRect(zx - w / 2, zy - (i + 1) * 22, w, 22);
        ctx.strokeStyle = "rgba(230,196,140,0.18)"; ctx.strokeRect(zx - w / 2, zy - (i + 1) * 22, w, 22);
      }
      ctx.fillStyle = "#e0b268"; ctx.fillRect(zx - 12, zy - 4 * 22 - 14, 24, 14);
      // domes and flat roofs
      for (let i = 0; i < 4; i++) {
        const dx = W * 0.66 + i * 58;
        ctx.fillStyle = "#40301f";
        ctx.fillRect(dx, horizon - 44, 44, 44);
        ctx.beginPath(); ctx.arc(dx + 22, horizon - 44, 22, Math.PI, TAU); ctx.fill();
      }
      ctx.fillStyle = "#4a3725";
      ctx.fillRect(W * 0.86, horizon - 120, 14, 120);
      ctx.beginPath(); ctx.arc(W * 0.86 + 7, horizon - 122, 10, 0, TAU); ctx.fill();
      // palms
      for (let i = 0; i < 3; i++) {
        const px = W * 0.16 + i * W * 0.3;
        ctx.strokeStyle = "#2e2418"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(px, horizon + 20); ctx.quadraticCurveTo(px + 6, horizon - 30, px + 2, horizon - 62); ctx.stroke();
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI * 0.9 + k * 0.45;
          ctx.beginPath(); ctx.moveTo(px + 2, horizon - 62);
          ctx.quadraticCurveTo(px + 2 + Math.cos(a) * 22, horizon - 62 + Math.sin(a) * 14, px + 2 + Math.cos(a) * 38, horizon - 54 + Math.sin(a) * 22);
          ctx.strokeStyle = "rgba(90,74,50,0.9)"; ctx.lineWidth = 1.6; ctx.stroke();
        }
      }
      // torches
      for (let i = 0; i < 7; i++) {
        const x = W * 0.08 + i * W * 0.13;
        glow(ctx, x, horizon - 12, 18, "#ffb45a", 0.22 + Math.sin(t * 5 + i) * 0.05);
        ctx.beginPath(); ctx.arc(x, horizon - 12, 2.5, 0, TAU); ctx.fillStyle = "#ffd08a"; ctx.fill();
      }
      // people
      for (let i = 0; i < 7; i++) {
        const x = W * 0.1 + i * W * 0.12 + Math.sin(t * 1.5 + i) * 3;
        person(ctx, x, horizon + 40, 1.0, t * 2 + i, "rgba(235,220,190,0.7)", {});
      }
      for (let i = 0; i < 5; i++) {
        const x = W * 0.7 + i * 24;
        ctx.beginPath(); ctx.arc(x, horizon - 90 - i * 6, 3 + (i % 3), 0, TAU);
        ctx.fillStyle = "rgba(200,190,170,0.045)"; ctx.fill();
      }
      return;
    }
    sky(ctx, W, H, "#14110e", "#4a3524", 0.78);
    stars(ctx, W, H, t, 80, 3, 0.5);
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.2, 24, 0, TAU);
    ctx.fillStyle = "rgba(234,218,184,0.62)"; ctx.fill();
    glow(ctx, W * 0.78, H * 0.2, 100, "#e8d8b0", 0.14);
    const r = rng(19);
    for (let i = 0; i < 13; i++) {
      const bx = W * 0.05 + i * (W * 0.9 / 13) + r() * 8;
      const h = 34 + r() * 78;
      building(ctx, bx, horizon + 2, 20 + r() * 22, h, "#2c2218", "rgba(236,196,116,0.7)", true);
      ctx.beginPath();
      ctx.moveTo(bx - 13, horizon + 2 - h); ctx.lineTo(bx, horizon - 10 - h); ctx.lineTo(bx + 13, horizon + 2 - h);
      ctx.closePath(); ctx.fillStyle = "#34281c"; ctx.fill();
    }
    ctx.fillStyle = "#241b13";
    ctx.fillRect(0, horizon - 4, W, 12);
    for (let i = 0; i < 30; i++) ctx.fillRect(i * (W / 30), horizon - 14, 10, 11);
    const cycle = t % 18;
    for (let i = 0; i < 5; i++) {
      const bx = W * 0.12 + i * (W * 0.18) + r() * 20;
      const maxH = 110 + r() * 90;
      const grow = clamp((cycle - i * 0.9) / 3, 0, 1);
      const h = 30 + maxH * smooth(grow);
      building(ctx, bx, horizon - 6, 22 + r() * 16, h, "#3a2c1d", "rgba(255,214,130,0.85)", grow > 0.75);
      if (grow < 0.98) {
        ctx.strokeStyle = "rgba(214,184,130,0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bx, horizon - 6 - h); ctx.lineTo(bx, horizon - 26 - h);
        ctx.moveTo(bx - 16, horizon - 20 - h); ctx.lineTo(bx + 16, horizon - 20 - h);
        ctx.stroke();
      }
    }
    if (cycle > 5) {
      const cx = W * 0.7, cy = horizon - 190;
      ctx.strokeStyle = "rgba(223,196,144,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, horizon - 10); ctx.lineTo(cx, cy);
      ctx.moveTo(cx - 44, cy + 10); ctx.lineTo(cx + 58, cy + 10);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + 58, cy + 10);
      ctx.stroke();
      const hook = 24 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 50;
      ctx.beginPath(); ctx.moveTo(cx + 50, cy + 10); ctx.lineTo(cx + 50, cy + 10 + hook); ctx.stroke();
    }
    glow(ctx, W * 0.5, horizon + 6, W * 0.45, "#c08a45", 0.14);
  };

  SCENES.temple = function (ctx, W, H, t, P, opts) {
    const horizon = H * 0.78;
    const v = (opts && opts.variant) || "ziggurat";
    sky(ctx, W, H, "#15110d", "#6a482a", 0.74);
    glow(ctx, W * 0.5, horizon - 130, H * 0.85, "#e0a552", 0.30);
    ctx.beginPath(); ctx.arc(W * 0.5, horizon - 128, 82, 0, TAU);
    ctx.fillStyle = "rgba(236,192,116,0.40)"; ctx.fill();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + t * 0.02;
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + Math.cos(a) * 92, horizon - 128 + Math.sin(a) * 92);
      ctx.lineTo(W * 0.5 + Math.cos(a) * 150, horizon - 128 + Math.sin(a) * 150);
      ctx.strokeStyle = "rgba(230,190,120,0.075)"; ctx.lineWidth = 1; ctx.stroke();
    }
    const cx = W * 0.5, base = horizon + 8;
    const dust = () => {
      const r = rng(12);
      for (let i = 0; i < 26; i++) {
        const x = (r() * W + t * 4) % W;
        const y = (r() * H + Math.sin(t + i) * 10) % H;
        ctx.fillStyle = "rgba(230,200,150," + (0.07 + r() * 0.13) + ")";
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    };
    const pilgrims = (n, spread) => {
      for (let i = 0; i < n; i++) {
        const x = cx - spread / 2 + i * (spread / n) + Math.sin(t * 0.5 + i) * 4;
        person(ctx, x, horizon + 46 + (i % 2) * 10, 1.0, t * 1.5 + i, "rgba(240,226,196,0.72)", {});
      }
    };
    if (v === "pyramid") {
      // smooth pyramids, Giza-like
      ctx.fillStyle = "rgba(74,54,34,0.55)";
      ctx.beginPath(); ctx.moveTo(cx - 250, base); ctx.lineTo(cx - 170, base - 120); ctx.lineTo(cx - 90, base); ctx.closePath(); ctx.fill();
      const grad = ctx.createLinearGradient(cx - 190, base, cx + 190, base - 240);
      grad.addColorStop(0, "#5a432b"); grad.addColorStop(0.55, "#6d5031"); grad.addColorStop(1, "#4a3624");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(cx - 190, base); ctx.lineTo(cx, base - 250); ctx.lineTo(cx + 190, base); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(232,200,145,0.20)"; ctx.lineWidth = 1;
      for (let i = 1; i < 9; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 190 + i * 21, base - i * 0.4);
        ctx.lineTo(cx - 190 + i * 21 + i * 0.5, base - (250 * i / 9));
        ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx - 12, base - 250); ctx.lineTo(cx, base - 266); ctx.lineTo(cx + 12, base - 250); ctx.closePath();
      ctx.fillStyle = "#e8c071"; ctx.fill();
      glow(ctx, cx, base - 258, 34, "#ffd98a", 0.3);
      // sphinx silhouette
      ctx.fillStyle = "#3e2d1e";
      ctx.beginPath(); ctx.ellipse(cx + 250, base - 10, 46, 20, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 286, base - 24, 15, 0, TAU); ctx.fill();
      ctx.fillRect(cx + 270, base - 28, 22, 8);
    } else if (v === "stones") {
      const r = rng(31);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const x = cx + Math.cos(a) * 130, y = base + Math.sin(a) * 26;
        const h = 74 + r() * 30;
        ctx.fillStyle = i % 2 ? "#4b3d2b" : "#54452f";
        ctx.fillRect(x - 9, y - h, 18, h);
        ctx.fillStyle = "#5e4d35";
        ctx.fillRect(x - 12, y - h - 8, 24, 9);
      }
      ctx.fillStyle = "#2e2519";
      ctx.beginPath(); ctx.ellipse(cx, base + 4, 170, 30, 0, 0, TAU); ctx.fill();
      glow(ctx, cx, base - 90, 200, "#cfd8d2", 0.08);
    } else if (v === "columns") {
      ctx.fillStyle = "#40301f"; ctx.fillRect(cx - 200, base - 14, 400, 18);
      ctx.fillStyle = "#4a3824"; ctx.fillRect(cx - 180, base - 24, 360, 12);
      for (let i = 0; i < 7; i++) {
        const x = cx - 156 + i * 52;
        ctx.fillStyle = i % 2 ? "#5a4530" : "#4d3a27";
        ctx.fillRect(x - 9, base - 142, 18, 120);
        ctx.fillRect(x - 13, base - 150, 26, 8);
        ctx.fillRect(x - 13, base - 24, 26, 6);
      }
      ctx.fillStyle = "#54402a"; ctx.fillRect(cx - 180, base - 166, 360, 18);
      ctx.beginPath(); ctx.moveTo(cx - 180, base - 166); ctx.lineTo(cx, base - 216); ctx.lineTo(cx + 180, base - 166); ctx.closePath();
      ctx.fillStyle = "#4a3824"; ctx.fill();
      ctx.strokeStyle = "rgba(232,200,145,0.2)"; ctx.stroke();
    } else if (v === "dome") {
      ctx.fillStyle = "#3d2e1e"; ctx.fillRect(cx - 170, base - 110, 340, 114);
      ctx.fillStyle = "#52402a"; ctx.fillRect(cx - 150, base - 130, 300, 24);
      ctx.beginPath(); ctx.arc(cx, base - 130, 96, Math.PI, TAU); ctx.fillStyle = "#6b5133"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, base - 130, 96, Math.PI, TAU); ctx.strokeStyle = "rgba(240,210,150,0.3)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#d8b268"; ctx.beginPath(); ctx.arc(cx, base - 232, 5, 0, TAU); ctx.fill();
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#4d3a27"; ctx.fillRect(cx + side * 200 - 5, base - 190, 10, 194);
        ctx.beginPath(); ctx.arc(cx + side * 200, base - 194, 9, 0, TAU); ctx.fill();
      }
    } else if (v === "stupa") {
      ctx.fillStyle = "#3f2f1f"; ctx.fillRect(cx - 160, base - 30, 320, 34);
      ctx.fillRect(cx - 120, base - 52, 240, 24);
      ctx.beginPath(); ctx.arc(cx, base - 52, 92, Math.PI, TAU); ctx.fillStyle = "#5c472e"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, base - 52, 92, Math.PI, TAU); ctx.strokeStyle = "rgba(240,210,150,0.24)"; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 11; i++) {
        const w = 22 - i * 1.6;
        ctx.fillStyle = "#6b5335"; ctx.fillRect(cx - w / 2, base - 146 - i * 9, w, 4);
      }
      ctx.fillStyle = "#d8b268"; ctx.beginPath(); ctx.arc(cx, base - 246, 4, 0, TAU); ctx.fill();
      // prayer flags
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? "rgba(176,67,44,0.7)" : "rgba(207,169,79,0.7)";
        ctx.fillRect(cx - 120 + i * 40, base - 190 + Math.sin(i) * 8, 12, 8);
      }
    } else if (v === "towers") {
      for (let k = 0; k < 3; k++) {
        const tx = cx + (k - 1) * 110;
        const th = 150 + (k === 1 ? 50 : 0);
        ctx.fillStyle = "#4c3a26";
        ctx.fillRect(tx - 26, base - th, 52, th);
        for (let i = 0; i < 5; i++) {
          const w = 52 - i * 8;
          ctx.fillRect(tx - w / 2, base - th - i * 18, w, 12);
        }
        ctx.beginPath(); ctx.arc(tx, base - th - 92, 14, 0, TAU); ctx.fillStyle = "#6b5335"; ctx.fill();
      }
    } else if (v === "pillars") {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        const x = cx + Math.cos(a) * 90, y = base + Math.sin(a) * 16;
        ctx.fillStyle = "#54432d";
        ctx.fillRect(x - 11, y - 120, 22, 120);
        ctx.fillRect(x - 30, y - 142, 60, 24);
        ctx.strokeStyle = "rgba(226,194,140,0.24)"; ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 8, y - 110 + k * 14); ctx.lineTo(x + 8, y - 110 + k * 14); ctx.stroke(); }
      }
    } else if (v === "moai") {
      for (let i = 0; i < 5; i++) {
        const x = cx - 160 + i * 80;
        const h = 120 + (i % 3) * 18;
        ctx.fillStyle = i % 2 ? "#4a3b29" : "#54432d";
        ctx.beginPath();
        ctx.ellipse(x, base - h / 2, 26, h / 2, 0, 0, TAU);
        ctx.fill();
        ctx.fillRect(x - 30, base - 10, 60, 16);
        ctx.fillStyle = "#3a2d1e";
        ctx.fillRect(x - 12, base - h + 12, 24, 7);
        ctx.fillRect(x - 4, base - h + 20, 8, 20);
        ctx.beginPath(); ctx.ellipse(x, base - h + 52, 9, 5, 0, 0, TAU); ctx.fill();
      }
    } else {
      const levels = 5;
      for (let i = 0; i < levels; i++) {
        const w = 340 - i * 52;
        const h = 36;
        ctx.fillStyle = i % 2 ? "#3d2e1e" : "#453524";
        ctx.fillRect(cx - w / 2, base - (i + 1) * h, w, h);
        ctx.strokeStyle = "rgba(228,196,140,0.22)"; ctx.lineWidth = 1;
        ctx.strokeRect(cx - w / 2, base - (i + 1) * h, w, h);
      }
      ctx.fillStyle = "#523d27"; ctx.fillRect(cx - 34, base - levels * 36 - 30, 68, 30);
      ctx.fillStyle = "#e0b268"; ctx.fillRect(cx - 34, base - levels * 36 - 30, 68, 4);
      ctx.fillStyle = "rgba(232,202,150,0.35)"; ctx.fillRect(cx - 22, base - levels * 36, 44, levels * 36);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = "rgba(20,15,10,0.4)";
        ctx.fillRect(cx - 22, base - 4 - i * 11, 44, 3);
      }
    }
    pilgrims(v === "stones" ? 6 : 8, 380);
    dust();
  };

  SCENES.chariot = function (ctx, W, H, t, P) {
    const horizon = H * 0.64;
    sky(ctx, W, H, "#1a1410", "#7a4726", 0.7);
    glow(ctx, W * 0.5, horizon, W * 0.7, "#c0703a", 0.18);
    ctx.fillStyle = "#2a1f15"; ctx.fillRect(0, horizon, W, H - horizon);
    // dust
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 211 + t * 20) % W, horizon + 40 + i * 12, 130, 20, 0, 0, TAU);
      ctx.fillStyle = "rgba(190,140,90,0.05)"; ctx.fill();
    }
    const move = (t * 95 + W * 0.6) % (W + 400);
    const chs = [
      { x: W + 200 - move, sc: 1.15 },
      { x: W + 60 - move, sc: 0.9 },
      { x: W + 330 - move, sc: 1.0 },
    ];
    chs.forEach((c, i) => {
      drawChariot(ctx, c.x, horizon + 66, c.sc, t * 1.6 + i, "#e0cea9");
    });
    // arrows
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.4 + i * 0.2) % 1;
      if (ph < 0.6) {
        const x = lerp(W * 0.2, W * 0.85, ph / 0.6);
        const y = horizon + 20 - Math.sin(ph / 0.6 * Math.PI) * 50;
        ctx.strokeStyle = "rgba(235,220,190,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 4, y); ctx.stroke();
      }
    }
  };

  function drawChariot(ctx, x, gy, s, phase, col) {
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    const wheelA = phase * 8;
    // horses
    horse(ctx, 30, 0, 0.85, phase, col);
    horse(ctx, 44, 2, 0.8, phase + 1.2, col);
    // car
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-18, -26); ctx.lineTo(4, -26); ctx.lineTo(2, -8); ctx.lineTo(-14, -8);
    ctx.closePath(); ctx.fill();
    // hitch
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, -18); ctx.lineTo(26, -20); ctx.stroke();
    // wheels
    for (const wx of [-10, 6]) {
      ctx.save();
      ctx.translate(wx, -8);
      ctx.rotate(wheelA);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke();
      }
      ctx.restore();
    }
    // driver
    person(ctx, -6, -22, 0.9, phase, col, {});
    ctx.restore();
  }

  SCENES.phalanx = function (ctx, W, H, t, P) {
    const horizon = H * 0.6;
    sky(ctx, W, H, "#181310", "#6d4a2c", 0.68);
    ctx.fillStyle = "#251d14"; ctx.fillRect(0, horizon, W, H - horizon);
    glow(ctx, W * 0.5, horizon + 30, W * 0.5, "#b06a3a", 0.12);
    const advance = (Math.sin(t * 0.5) * 0.5 + 0.5) * W * 0.06;
    // left phalanx advancing right
    for (let row = 0; row < 5; row++) {
      const y = horizon + 50 + row * 26;
      for (let col = 0; col < 9; col++) {
        const x = W * 0.12 + col * 26 + row * 8 + advance;
        person(ctx, x, y, 1.15 + row * 0.06, t * 1.5 + col * 0.4 + row, "rgba(218,199,165,0.95)", {
          spear: true, spearCol: "rgba(235,220,190,0.8)", shield: true, shieldCol: "rgba(150,90,55,0.9)",
        });
      }
    }
    // right phalanx
    for (let row = 0; row < 4; row++) {
      const y = horizon + 54 + row * 28;
      for (let col = 0; col < 7; col++) {
        const x = W * 0.94 - col * 26 - row * 8;
        person(ctx, x, y, 1.1 + row * 0.06, -t * 1.2 + col, "rgba(160,140,112,0.85)", {
          spear: true, shield: true, shieldCol: "rgba(70,90,100,0.9)",
        });
      }
    }
    // clash dust
    glow(ctx, W * 0.55, horizon + 120, 130, "#d0a070", 0.12);
    // arrows from right
    for (let i = 0; i < 8; i++) {
      const ph = (t * 0.5 + i * 0.13) % 1;
      const x = lerp(W * 0.9, W * 0.25, ph);
      const y = horizon + 30 - Math.sin(ph * Math.PI) * 70;
      ctx.strokeStyle = "rgba(230,210,175," + (0.5 * (1 - ph)) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 2, y); ctx.stroke();
    }
  };

  SCENES.siege = function (ctx, W, H, t, P) {
    const horizon = H * 0.72;
    sky(ctx, W, H, "#171210", "#5e3c25", 0.7);
    glow(ctx, W * 0.7, horizon - 60, W * 0.5, "#c07038", 0.18);
    ctx.fillStyle = "#241b13"; ctx.fillRect(0, horizon + 30, W, H);
    // wall
    const wx = W * 0.62;
    ctx.fillStyle = "#2c2218";
    ctx.fillRect(wx, H * 0.34, W * 0.38, horizon - H * 0.34 + 30);
    // stones
    ctx.strokeStyle = "rgba(220,190,140,0.10)";
    ctx.lineWidth = 1;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 7; c++) {
        ctx.strokeRect(wx + c * (W * 0.38 / 7) + (r % 2) * 20, H * 0.34 + r * 26, W * 0.38 / 7, 26);
      }
    }
    // battlements
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = "#2c2218";
      ctx.fillRect(wx + i * (W * 0.38 / 8), H * 0.34 - 14, 22, 16);
    }
    // tower
    ctx.fillStyle = "#33271b";
    ctx.fillRect(wx + W * 0.12, H * 0.26, 46, H * 0.48);
    ctx.beginPath(); ctx.moveTo(wx + W * 0.12 - 6, H * 0.26); ctx.lineTo(wx + W * 0.12 + 23, H * 0.22); ctx.lineTo(wx + W * 0.12 + 52, H * 0.26); ctx.closePath(); ctx.fill();
    // catapults
    for (let i = 0; i < 3; i++) {
      const cx = W * 0.1 + i * W * 0.14;
      const cy = horizon + 40;
      const arm = Math.sin(t * 1.4 + i * 2) * 0.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(arm);
      ctx.strokeStyle = "#d8c49c";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, -30); ctx.stroke();
      ctx.beginPath(); ctx.arc(30, -30, 4, 0, TAU); ctx.fillStyle = "#d8c49c"; ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#3a2b1d";
      ctx.fillRect(cx - 18, cy - 6, 40, 10);
      ctx.beginPath(); ctx.arc(cx - 14, cy + 4, 7, 0, TAU); ctx.strokeStyle = "#d8c49c"; ctx.lineWidth = 2; ctx.stroke();
      // flying stone
      const ph = (t * 0.35 + i * 0.3) % 1;
      if (ph < 0.6) {
        const q = ph / 0.6;
        const sx = cx + 28, sy = cy - 34;
        const tx = wx + 30 + i * 40, ty = H * 0.4;
        const x = lerp(sx, tx, q), y = lerp(sy, ty, q) - Math.sin(q * Math.PI) * 80;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fillStyle = "#cfbb95"; ctx.fill();
        if (q > 0.93) {
          glow(ctx, tx, ty, 34, "#ff9a4a", 0.45);
          smokePuff(ctx, tx, ty, 14, 0.25);
        }
      }
    }
    // fire on wall
    glow(ctx, wx + W * 0.08, H * 0.46, 40, "#ff8a3a", 0.25 + Math.sin(t * 6) * 0.08);
    // soldiers
    for (let i = 0; i < 6; i++) person(ctx, W * 0.16 + i * 26, horizon + 76 + (i % 2) * 8, 1, t + i, "#cbb58f", { spear: true });
  };

  SCENES.pilgrim = function (ctx, W, H, t, P, opts) {
    const horizon = H * 0.7;
    sky(ctx, W, H, "#1a1511", "#7a4a2e", 0.72);
    glow(ctx, W * 0.68, horizon - 40, H * 0.7, "#d08a4a", 0.26);
    ctx.beginPath(); ctx.arc(W * 0.68, horizon - 48, 30, 0, TAU);
    ctx.fillStyle = "rgba(232,180,110,0.6)"; ctx.fill();
    ridge(ctx, W, horizon - 8, 34, "#2a2019", 17);
    // scrolling dunes and road
    const scroll = (t * 9) % W;
    for (let i = 0; i < 4; i++) {
      const dx = ((i * 260 - scroll) % (W + 400) + W + 400) % (W + 400) - 100;
      ctx.beginPath();
      ctx.ellipse(dx, horizon + 36 + i * 26, 190, 18, 0, 0, TAU);
      ctx.fillStyle = "rgba(210,170,120,0.05)"; ctx.fill();
    }
    ctx.fillStyle = "#2b2118";
    ctx.beginPath();
    ctx.moveTo(-20, H);
    ctx.quadraticCurveTo(W * 0.35, H * 0.82, W + 20, H);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(230,200,150,0.18)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, H * 0.88); ctx.quadraticCurveTo(W * 0.4, H * 0.8, W + 20, H * 0.9); ctx.stroke();
    // distant stupas and temples
    for (let i = 0; i < 5; i++) {
      const x = ((i * 310 - t * 12) % (W + 300) + W + 300) % (W + 300) - 80;
      const y = horizon + 26 - (i % 3) * 8;
      ctx.fillStyle = "rgba(70,52,35,0.55)";
      ctx.fillRect(x - 10, y - 18, 20, 18);
      ctx.beginPath(); ctx.arc(x, y - 18, 10, Math.PI, TAU); ctx.fill();
      ctx.fillRect(x - 1, y - 36, 2, 10);
    }
    // prayer flags
    for (let i = 0; i < 8; i++) {
      const x = W * 0.12 + i * 26;
      const y = horizon - 40 + Math.sin(i * 0.9) * 7;
      ctx.fillStyle = i % 2 ? "rgba(176,67,44,0.55)" : "rgba(201,161,90,0.55)";
      ctx.fillRect(x, y, 10, 7);
    }
    // the pilgrim and a pack horse
    const mx = W * 0.44;
    const my = Math.min(horizon + 118, H * 0.84);
    const step = Math.sin(t * 4);
    // footprints
    for (let i = 1; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(mx - i * 17, my + 4 + (i % 2) * 3, 3, 1.2, -0.15, 0, TAU);
      ctx.fillStyle = "rgba(220,190,140," + (0.18 - i * 0.02) + ")"; ctx.fill();
    }
    // staff
    ctx.strokeStyle = "#d8c49c"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(mx + 12, my - 64); ctx.lineTo(mx + 16, my + 2); ctx.stroke();
    // robe
    ctx.fillStyle = "#c9a15a";
    ctx.beginPath();
    ctx.moveTo(mx, my - 54);
    ctx.quadraticCurveTo(mx - 16, my - 20, mx - 12 + step * 1.5, my - 2);
    ctx.lineTo(mx + 10, my - 2);
    ctx.quadraticCurveTo(mx + 13, my - 24, mx + 4, my - 54);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(176,67,44,0.9)";
    ctx.fillRect(mx - 11, my - 34, 22, 4);
    // head / hat
    ctx.beginPath(); ctx.arc(mx, my - 61, 5.5, 0, TAU); ctx.fillStyle = "#2b2118"; ctx.fill();
    ctx.beginPath(); ctx.arc(mx, my - 64, 7, Math.PI, TAU); ctx.fillStyle = "#b98a34"; ctx.fill();
    // legs
    ctx.strokeStyle = "#2b2118"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(mx - 4, my - 10); ctx.lineTo(mx - 6 + step * 5, my + 2); ctx.moveTo(mx + 5, my - 10); ctx.lineTo(mx + 7 - step * 5, my + 2); ctx.stroke();
    // backpack / scrolls
    ctx.fillStyle = "#7a4a2e"; ctx.fillRect(mx - 15, my - 50, 8, 16);
    ctx.strokeStyle = "#e0c48a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx - 15, my - 46); ctx.lineTo(mx - 7, my - 46); ctx.stroke();
    // pack horse behind
    ctx.save(); ctx.translate(mx - 88, my); ctx.scale(0.9, 0.9);
    ctx.strokeStyle = "#3b2d1e"; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, -16); ctx.lineTo(-13, -2); ctx.moveTo(-2, -16); ctx.lineTo(1, -2);
    ctx.moveTo(12, -16); ctx.lineTo(14, -2); ctx.moveTo(18, -16); ctx.lineTo(21, -2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(4, -22, 18, 7, 0, 0, TAU); ctx.fillStyle = "#3b2d1e"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(19, -25); ctx.quadraticCurveTo(27, -34, 31, -34); ctx.lineTo(32, -28); ctx.quadraticCurveTo(24, -25, 22, -20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8a5a36"; ctx.fillRect(-2, -30, 12, 8);
    ctx.restore();
    // dust and birds
    const r = rng(29);
    for (let i = 0; i < 28; i++) {
      const x = (r() * W + t * (5 + r() * 8)) % W;
      const y = horizon + 30 + r() * (H - horizon - 30);
      ctx.fillStyle = "rgba(220,190,150," + (0.04 + r() * 0.09) + ")";
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    for (let i = 0; i < 4; i++) {
      const x = ((t * 14 + i * 150) % (W + 80)) - 40;
      const y = H * 0.2 + Math.sin(t + i) * 8;
      ctx.strokeStyle = "rgba(235,220,190,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x - 2, y - 3, x, y); ctx.quadraticCurveTo(x + 2, y - 3, x + 4, y); ctx.stroke();
    }
  };

  SCENES.cavalry = function (ctx, W, H, t, P, opts) {
    const horizon = H * 0.63;
    sky(ctx, W, H, "#15120f", "#6e4729", 0.68);
    glow(ctx, W * 0.25, horizon - 40, H * 0.55, "#cf8440", 0.2);
    ctx.beginPath(); ctx.arc(W * 0.25, horizon - 50, 30, 0, TAU); ctx.fillStyle = "rgba(226,170,100,0.5)"; ctx.fill();
    ctx.fillStyle = "#241c14"; ctx.fillRect(0, horizon, W, H - horizon);
    for (let i = 0; i < 5; i++) {
      const y = horizon + 40 + i * 14;
      const x = ((t * 70 + i * 150) % (W + 300)) - 100;
      const sc = 1.15 - i * 0.08;
      const riderKind = ((opts && opts.year) || 0) >= 1700 ? "dragoon" : (opts && (opts.region === "eu")) ? "knight" : (opts && (opts.region === "me" || opts.region === "ca")) ? "cataphract" : "archer";
      horse(ctx, x, y, sc, t * 1.8 + i, "rgba(220,202,168,0.95)", true, "rgba(160,100,60,0.95)", riderKind);
    }
    // dust
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc((i * 151 + t * 34) % W, horizon + 72 + (i % 3) * 16, 26 + (i % 4) * 8, 0, TAU);
      ctx.fillStyle = "rgba(190,150,105,0.04)"; ctx.fill();
    }
    // arrows
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.45 + i * 0.17) % 1;
      if (ph < 0.5) {
        const x = lerp(W * 0.55, W, ph / 0.5);
        const y = horizon - 10 - Math.sin(ph * Math.PI) * 40;
        ctx.strokeStyle = "rgba(235,220,190,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 3, y); ctx.stroke();
      }
    }
  };

  SCENES.naval = function (ctx, W, H, t, P, opts) {
    const sea = H * 0.58;
    sky(ctx, W, H, "#11100f", "#4f3a29", 0.6);
    glow(ctx, W * 0.75, sea - 70, H * 0.6, "#c08a50", 0.16);
    ctx.beginPath(); ctx.arc(W * 0.75, sea - 80, 26, 0, TAU); ctx.fillStyle = "rgba(226,200,160,0.6)"; ctx.fill();
    // sea
    const g = ctx.createLinearGradient(0, sea, 0, H);
    g.addColorStop(0, "#1d2426");
    g.addColorStop(1, "#0f1415");
    ctx.fillStyle = g;
    ctx.fillRect(0, sea, W, H - sea);
    // waves
    for (let row = 0; row < 9; row++) {
      const y = sea + 12 + row * ((H - sea) / 9);
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 8) {
        const yy = y + Math.sin(x * 0.02 + t * 1.3 + row) * (2 + row * 0.6);
        if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = "rgba(170,200,200," + (0.05 + row * 0.008) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ship(ctx, W * 0.32, sea + 22, 1.15, t, "#d9c7a3", "rgba(210,190,155,0.85)", { kind: shipKind(opts), flagCol: "#b0432c" });
    ship(ctx, W * 0.68, sea + 42, 0.9, t + 2, "#bda986", "rgba(180,155,120,0.8)", { kind: shipKind(opts), flagCol: "#c9a15a" });
    // burning ship
    const bx = W * 0.82, by = sea + 18;
    ship(ctx, bx, by, 0.8, t + 4, "#8d7a5e", "rgba(150,120,90,0.7)", { kind: shipKind(opts) });
    glow(ctx, bx + 10, by - 34, 50, "#ff7a30", 0.3 + Math.sin(t * 8) * 0.1);
    for (let i = 0; i < 5; i++) {
      smokePuff(ctx, bx + Math.sin(t + i) * 10, by - 50 - i * 12 - (t * 8 % 12), 8 + i * 2, 0.04);
    }
    // arrows
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.5 + i * 0.12) % 1;
      const x = lerp(W * 0.3, W * 0.8, ph);
      const y = sea - 30 - Math.sin(ph * Math.PI) * 60;
      ctx.strokeStyle = "rgba(235,220,190," + (0.4 * (1 - ph)) + ")";
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 2, y); ctx.stroke();
    }
  };

  SCENES.camel = function (ctx, W, H, t, P) {
    const horizon = H * 0.7;
    sky(ctx, W, H, "#0d0c0e", "#3a2a20", 0.72);
    stars(ctx, W, H, t, 120, 8, 0.75);
    // crescent
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, 20, 0, TAU); ctx.fillStyle = "rgba(240,220,175,0.85)"; ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.8 + 8, H * 0.2 - 5, 18, 0, TAU); ctx.fillStyle = "#121016"; ctx.fill();
    glow(ctx, W * 0.8, H * 0.2, 70, "#e8d0a0", 0.08);
    dune(ctx, W, horizon - 4, 22, "#241a12", 21);
    dune(ctx, W, horizon + 56, 30, "#1b1410", 27);
    // caravan
    const move = (t * 22 + W * 0.55) % (W + 360);
    for (let i = 0; i < 4; i++) {
      const x = W + 120 - move + i * 78;
      camel(ctx, x, horizon + 56 + (i % 2) * 6, 1.25, t * 1.1 + i * 0.8, "rgba(210,192,160,0.9)");
    }
    // campfire
    glow(ctx, W * 0.12, horizon + 30, 55, "#e08a3a", 0.2 + Math.sin(t * 5) * 0.05);
    ctx.beginPath(); ctx.arc(W * 0.12, horizon + 34, 4, 0, TAU); ctx.fillStyle = "rgba(255,170,80,0.8)"; ctx.fill();
    person(ctx, W * 0.16, horizon + 42, 0.9, t, "rgba(200,180,150,0.6)", {});
  };

  SCENES.ship = function (ctx, W, H, t, P, opts) {
    const sea = H * 0.62;
    sky(ctx, W, H, "#141317", "#8a5a34", 0.62);
    glow(ctx, W * 0.72, sea - 40, H * 0.7, "#e0a050", 0.25);
    ctx.beginPath(); ctx.arc(W * 0.72, sea - 50, 34, 0, TAU); ctx.fillStyle = "rgba(240,190,120,0.6)"; ctx.fill();
    const g = ctx.createLinearGradient(0, sea, 0, H);
    g.addColorStop(0, "#223033");
    g.addColorStop(1, "#10191a");
    ctx.fillStyle = g; ctx.fillRect(0, sea, W, H - sea);
    for (let row = 0; row < 10; row++) {
      const y = sea + 8 + row * ((H - sea) / 10);
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 8) {
        const yy = y + Math.sin(x * 0.018 + t * 1.1 + row * 0.7) * (2 + row * 0.5);
        if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = "rgba(160,190,190," + (0.06 + row * 0.007) + ")";
      ctx.stroke();
    }
    ship(ctx, W * 0.48 + Math.sin(t * 0.3) * 14, sea + 26, 1.65, t, "#e0cea9", "rgba(222,204,170,0.9)", { kind: shipKind(opts), flagCol: "#b0432c" });
    // gulls
    for (let i = 0; i < 4; i++) {
      const x = ((t * 24 + i * 130) % (W + 100)) - 50;
      const y = H * 0.2 + Math.sin(t + i * 2) * 10;
      ctx.strokeStyle = "rgba(240,230,205,0.4)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x - 2, y - 3, x, y); ctx.quadraticCurveTo(x + 2, y - 3, x + 5, y); ctx.stroke();
    }
    // route
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = "rgba(220,180,110,0.25)";
    ctx.beginPath();
    ctx.moveTo(W * 0.05, H * 0.38);
    ctx.quadraticCurveTo(W * 0.4, H * 0.3, W * 0.92, H * 0.36);
    ctx.stroke();
    ctx.setLineDash([]);
    // compass
    ctx.save();
    ctx.translate(W * 0.1, H * 0.18);
    ctx.strokeStyle = "rgba(220,190,130,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(4, 0); ctx.lineTo(0, 26); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fillStyle = "rgba(220,190,130,0.18)"; ctx.fill();
    ctx.restore();
  };

  SCENES.cannon = function (ctx, W, H, t, P) {
    const horizon = H * 0.7;
    sky(ctx, W, H, "#17120f", "#5c3a24", 0.7);
    glow(ctx, W * 0.8, horizon - 50, W * 0.5, "#b06030", 0.14);
    ctx.fillStyle = "#241b13"; ctx.fillRect(0, horizon, W, H - horizon);
    // wall
    ctx.fillStyle = "#2c2218";
    ctx.fillRect(W * 0.78, H * 0.38, W * 0.22, horizon - H * 0.38 + 20);
    for (let i = 0; i < 5; i++) ctx.fillRect(W * 0.78 + i * (W * 0.22 / 5), H * 0.38 - 12, 16, 14);
    // cannons
    const positions = [W * 0.18, W * 0.38, W * 0.58];
    positions.forEach((x, i) => {
      const ph = (t * 0.7 + i * 0.33) % 1;
      const fired = ph < 0.09;
      cannon(ctx, x, horizon + 54, 1.5, t + i, "#e0cea9", fired);
      if (fired) {
        glow(ctx, x + 52, horizon + 12, 70, "#ffb050", 0.4);
        for (let k = 0; k < 4; k++) smokePuff(ctx, x + 50 + k * 12 + (ph * 300), horizon + 12 - k * 6, 12 + k * 4, 0.08 * (1 - ph * 8));
      }
      // ball
      if (ph > 0.12 && ph < 0.6) {
        const q = (ph - 0.12) / 0.48;
        const sx = x + 40, sy = horizon + 22;
        const tx = W * 0.86, ty = H * 0.5;
        const bx = lerp(sx, tx, q);
        const by = lerp(sy, ty, q) - Math.sin(q * Math.PI) * 60;
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, TAU); ctx.fillStyle = "#e8dcc0"; ctx.fill();
        if (q > 0.92) glow(ctx, tx, ty, 40, "#ff9a4a", 0.4);
      }
    });
    // soldiers
    for (let i = 0; i < 5; i++) person(ctx, W * 0.12 + i * 30, horizon + 84 + (i % 2) * 8, 1.1, t + i, "rgba(210,190,160,0.8)", { helmet: true });
    // smoke drifting
    for (let i = 0; i < 8; i++) {
      smokePuff(ctx, (i * 173 + t * 18) % W, horizon - 30 - (i % 3) * 20, 22 + (i % 4) * 8, 0.025);
    }
  };

  SCENES.musket = function (ctx, W, H, t, P) {
    const horizon = H * 0.68;
    sky(ctx, W, H, "#181411", "#6a4a2e", 0.7);
    ctx.fillStyle = "#251c14"; ctx.fillRect(0, horizon, W, H - horizon);
    // lines of infantry
    for (let row = 0; row < 4; row++) {
      const y = horizon + 46 + row * 30;
      for (let col = 0; col < 11; col++) {
        const x = W * 0.18 + col * 34 + row * 12;
        person(ctx, x, y, 1.25 + row * 0.05, t * 0.4 + col * 0.3, "rgba(220,202,168,0.95)", {
          spear: true, spearCol: "rgba(235,220,190,0.9)", helmet: true,
        });
      }
    }
    // volley flashes
    const ph = (t * 0.55) % 1;
    if (ph < 0.12) {
      for (let i = 0; i < 9; i++) {
        glow(ctx, W * 0.22 + i * 34, horizon + 30, 16, "#ffcf70", 0.5);
      }
    }
    // smoke
    for (let i = 0; i < 12; i++) {
      const x = W * 0.2 + (i * 97 + t * 14) % (W * 0.7);
      const y = horizon + 10 - ((t * 8 + i * 13) % 70);
      smokePuff(ctx, x, y, 18 + (i % 4) * 8, 0.035);
    }
    flag(ctx, W * 0.1, horizon + 20, 70, t, "#b0432c", 0);
    // drummer
    person(ctx, W * 0.12, horizon + 86, 1.2, t * 2, "#e0cea9", {});
  };

  SCENES.revolution = function (ctx, W, H, t, P) {
    const horizon = H * 0.66;
    sky(ctx, W, H, "#121013", "#4a2c22", 0.7);
    stars(ctx, W, H, t, 50, 2, 0.4);
    // city silhouettes
    const r = rng(33);
    for (let i = 0; i < 10; i++) {
      const w = 50 + r() * 60;
      building(ctx, W * 0.05 + i * W * 0.095, horizon + 10, w, 60 + r() * 120, "#1c1612", "rgba(230,180,90,0.5)", true);
    }
    // barricade
    ctx.fillStyle = "#2a2017";
    for (let i = 0; i < 9; i++) {
      ctx.save();
      ctx.translate(W * 0.12 + i * 42, horizon + 52 + (i % 2) * 6);
      ctx.rotate((i % 3 - 1) * 0.12);
      ctx.fillRect(-26, -12, 54, 14);
      ctx.restore();
    }
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(W * 0.18 + i * 48, horizon + 46);
      ctx.rotate(-0.5 + i * 0.2);
      ctx.fillStyle = "#3a2b1d"; ctx.fillRect(-4, -30, 5, 34);
      ctx.restore();
    }
    // crowd
    for (let i = 0; i < 26; i++) {
      const x = W * 0.08 + i * (W * 0.035) + Math.sin(t * 2 + i) * 3;
      const y = horizon + 86 + (i % 4) * 9;
      person(ctx, x, y, 1.35, t * 2 + i, i % 3 ? "rgba(30,24,18,0.95)" : "rgba(200,180,150,0.9)", { raised: i % 5 === 0 });
    }
    // flags
    for (let i = 0; i < 5; i++) {
      flag(ctx, W * 0.2 + i * W * 0.14, horizon + 50, 64 + (i % 3) * 14, t, i % 2 ? "#b0432c" : "#c99a4a", i);
    }
    // lanterns
    for (let i = 0; i < 6; i++) {
      const x = W * 0.15 + i * W * 0.13;
      const y = horizon + 20 + Math.sin(t + i) * 4;
      glow(ctx, x, y, 18, "#ffb45a", 0.28);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fillStyle = "#ffcf88"; ctx.fill();
    }
    glow(ctx, W * 0.5, horizon - 10, W * 0.6, "#e0a060", 0.26);
    ctx.fillStyle = "rgba(224,160,96,0.09)";
    ctx.fillRect(0, horizon - 50, W, 70);
  };

  SCENES.industry = function (ctx, W, H, t, P) {
    const horizon = H * 0.72;
    sky(ctx, W, H, "#15120f", "#4c3523", 0.7);
    glow(ctx, W * 0.2, horizon - 40, W * 0.5, "#c07a3a", 0.14);
    // factory
    for (let i = 0; i < 4; i++) {
      const x = W * 0.06 + i * W * 0.11;
      ctx.fillStyle = "#332619";
      ctx.fillRect(x, horizon - 120 - i * 10, 72, 120 + i * 10);
      ctx.fillStyle = "rgba(226,190,120,0.55)";
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 8 + k * 16, horizon - 100, 6, 10);
      // chimney
      ctx.fillStyle = "#2a2117";
      ctx.fillRect(x + 20, horizon - 200 + i * 6, 12, 90);
      // smoke
      for (let k = 0; k < 5; k++) {
        const ph = (t * 0.2 + k * 0.2) % 1;
        ctx.beginPath();
        ctx.arc(x + 26 + Math.sin(ph * 6) * 10, horizon - 210 + i * 6 - ph * 70, 6 + ph * 16, 0, TAU);
        ctx.fillStyle = "rgba(200,185,160," + (0.05 * (1 - ph)) + ")";
        ctx.fill();
      }
    }
    // gears
    ctx.save();
    ctx.translate(W * 0.82, horizon - 90);
    ctx.strokeStyle = "rgba(210,180,130,0.14)";
    ctx.lineWidth = 2;
    for (let g = 0; g < 2; g++) {
      ctx.save();
      ctx.translate(g * 34, g * 18);
      ctx.rotate(t * (g ? -0.4 : 0.5));
      ctx.beginPath(); ctx.arc(0, 0, 22 - g * 6, 0, TAU); ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (22 - g * 6), Math.sin(a) * (22 - g * 6));
        ctx.lineTo(Math.cos(a) * (27 - g * 6), Math.sin(a) * (27 - g * 6));
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    // rails
    const ry = horizon + 34;
    ctx.strokeStyle = "rgba(220,195,150,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.moveTo(0, ry + 8); ctx.lineTo(W, ry + 8); ctx.stroke();
    for (let i = 0; i < 24; i++) {
      ctx.beginPath(); ctx.moveTo(i * 50 - (t * 60 % 50), ry); ctx.lineTo(i * 50 - (t * 60 % 50), ry + 8); ctx.stroke();
    }
    // locomotive
    const tx = ((t * 60 + W * 0.22) % (W + 300)) - 150;
    ctx.save();
    ctx.translate(tx, ry);
    ctx.fillStyle = "#d9c7a3";
    ctx.fillRect(-46, -34, 64, 24);
    ctx.fillRect(-46, -48, 22, 16);
    ctx.fillRect(-46, -58, 10, 12);
    ctx.beginPath(); ctx.arc(12, -8, 8, 0, TAU); ctx.strokeStyle = "#d9c7a3"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(-26, -8, 6, 0, TAU); ctx.stroke();
    // wheels spokes
    for (const wx of [-26, 12]) {
      ctx.save(); ctx.translate(wx, -8); ctx.rotate(t * 4);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.stroke(); }
      ctx.restore();
    }
    // steam
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.6 + i * 0.16) % 1;
      ctx.beginPath(); ctx.arc(-40 - ph * 40, -62 - ph * 40, 6 + ph * 18, 0, TAU);
      ctx.fillStyle = "rgba(220,210,190," + (0.07 * (1 - ph)) + ")"; ctx.fill();
    }
    ctx.restore();
    // sparks
    for (let i = 0; i < 10; i++) {
      const x = tx - 30 + Math.sin(t * 4 + i) * 20;
      const y = ry - 60 - ((t * 40 + i * 20) % 60);
      ctx.fillStyle = "rgba(255,180,90," + (0.4 - (y % 60) / 150) + ")";
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  };

  SCENES.trench = function (ctx, W, H, t, P) {
    const horizon = H * 0.5;
    sky(ctx, W, H, "#101012", "#3a3028", 0.55);
    // rain
    const r = rng(77);
    for (let i = 0; i < 50; i++) {
      const x = (r() * W + t * 40) % W;
      const y = (r() * H + t * 160) % H;
      ctx.strokeStyle = "rgba(180,190,190,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 8); ctx.stroke();
    }
    ctx.fillStyle = "#1b1712"; ctx.fillRect(0, horizon, W, H - horizon);
    // distant desolation
    ridge(ctx, W, horizon + 4, 18, "#17130f", 44);
    // explosions
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.25 + i * 0.27) % 1;
      const x = W * 0.25 + i * W * 0.18;
      if (ph < 0.35) {
        glow(ctx, x, horizon - 20, 60 + ph * 100, "#ff8a40", 0.35 * (1 - ph / 0.35));
        for (let k = 0; k < 4; k++) smokePuff(ctx, x + Math.sin(ph * 10 + k) * 30, horizon - 30 - k * 12, 14 + ph * 20, 0.06);
      }
    }
    // flares
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.15 + i * 0.5) % 1;
      if (ph < 0.4) {
        ctx.beginPath(); ctx.arc(W * (0.3 + i * 0.4), H * 0.2 + ph * 80, 2, 0, TAU);
        ctx.fillStyle = "rgba(255,180,90,0.9)"; ctx.fill();
        glow(ctx, W * (0.3 + i * 0.4), H * 0.2 + ph * 80, 50, "#ff9a40", 0.18);
      }
    }
    // trench foreground
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    ctx.quadraticCurveTo(W * 0.4, H * 0.64, W, H * 0.75);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = "#15110d"; ctx.fill();
    // sandbags
    for (let i = 0; i < 12; i++) {
      const x = i * (W / 11);
      const y = H * 0.7 + Math.sin(i * 0.8) * 8;
      ctx.beginPath(); ctx.ellipse(x, y, 24, 9, 0, 0, TAU);
      ctx.fillStyle = i % 2 ? "#2c241a" : "#332a1e"; ctx.fill();
      ctx.strokeStyle = "rgba(220,195,150,0.1)"; ctx.lineWidth = 1; ctx.stroke();
    }
    // barbed wire
    ctx.strokeStyle = "rgba(200,190,170,0.25)";
    ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const yy = H * 0.78 + k * 12;
      ctx.beginPath();
      for (let x = 0; x < W; x += 6) ctx.lineTo(x, yy + Math.sin(x * 0.05) * 3);
      ctx.stroke();
      for (let x = 0; x < W; x += 26) {
        ctx.beginPath(); ctx.moveTo(x, yy - 5); ctx.lineTo(x + 5, yy + 5); ctx.stroke();
      }
    }
    // soldiers
    for (let i = 0; i < 3; i++) {
      person(ctx, W * 0.2 + i * 40, H * 0.76, 1.3, t * 0.5 + i, "rgba(190,180,158,0.7)", { helmet: true });
    }
  };

  SCENES.air = function (ctx, W, H, t, P) {
    const horizon = H * 0.76;
    sky(ctx, W, H, "#0c0b0e", "#2a2020", 0.76);
    stars(ctx, W, H, t, 60, 4, 0.35);
    // moon
    ctx.beginPath(); ctx.arc(W * 0.2, H * 0.2, 18, 0, TAU); ctx.fillStyle = "rgba(230,220,190,0.5)"; ctx.fill();
    // city
    const r = rng(55);
    for (let i = 0; i < 14; i++) {
      const w = 30 + r() * 50;
      building(ctx, W * 0.04 + i * W * 0.068, horizon + 4, w, 40 + r() * 110, "#15110e", "rgba(220,170,90,0.55)", true);
    }
    // fires
    for (let i = 0; i < 3; i++) {
      const x = W * 0.2 + i * W * 0.28;
      glow(ctx, x, horizon - 10, 70, "#ff7a30", 0.14 + Math.sin(t * 4 + i) * 0.05);
    }
    // searchlights
    for (let i = 0; i < 2; i++) {
      const bx = W * (0.3 + i * 0.4);
      const ang = -Math.PI / 2 + Math.sin(t * 0.35 + i * 2) * 0.6;
      ctx.save();
      ctx.translate(bx, horizon);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, 0, 0, -H * 0.85);
      g.addColorStop(0, "rgba(240,230,200,0.24)");
      g.addColorStop(1, "rgba(240,230,200,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(-60, -H * 0.85); ctx.lineTo(60, -H * 0.85); ctx.lineTo(4, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // lead bomber
    plane(ctx, W * 0.34, H * 0.24, 1.05, "rgba(238,224,194,0.95)", "bomber");
    // bombers
    for (let i = 0; i < 3; i++) {
      const x = ((t * 34 + i * 260) % (W + 300)) - 120;
      const y = H * 0.24 + i * 38;
      plane(ctx, x, y, 0.95, "rgba(230,216,185,0.9)", "bomber");
    }
    // flak
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.3 + i * 0.21) % 1;
      if (ph < 0.3) {
        const x = W * 0.3 + i * W * 0.12;
        const y = H * 0.3 + Math.sin(i) * 60;
        glow(ctx, x, y, 26, "#ffcf80", 0.4 * (1 - ph / 0.3));
      }
    }
    // smoke over city
    for (let i = 0; i < 8; i++) {
      const x = W * 0.15 + i * W * 0.09;
      ctx.beginPath(); ctx.arc(x, horizon - 30 - i * 4, 14 + i * 3, 0, TAU);
      ctx.fillStyle = "rgba(120,110,100,0.05)"; ctx.fill();
    }
  };

  SCENES.atomic = function (ctx, W, H, t, P) {
    const cycle = t % 15;
    const horizon = H * 0.82;
    // sky
    sky(ctx, W, H, "#08080b", "#241a16", 0.85);
    stars(ctx, W, H, t, 90, 9, cycle > 4.2 && cycle < 8 ? 0.18 : 0.55);
    // ground
    ctx.fillStyle = "#100d0a";
    ctx.fillRect(0, horizon, W, H - horizon);
    // tiny city
    const r = rng(88);
    for (let i = 0; i < 16; i++) {
      const w = 12 + r() * 22;
      building(ctx, 40 + i * (W - 80) / 16, horizon + 4, w, 10 + r() * 26, "#171310", "rgba(220,180,110,0.35)", cycle < 4.1);
    }
    // bomber
    if (cycle < 4.4) {
      const bx = lerp(W * 0.1, W * 0.58, clamp(cycle / 3.4, 0, 1));
      const by = H * 0.26 + Math.sin(cycle) * 3;
      plane(ctx, bx, by, 1.65, "rgba(240,226,194,0.95)", "bomber");
      // bomb
      if (cycle > 3.0) {
        const bp = clamp((cycle - 3.0) / 1.0, 0, 1);
        const bxx = lerp(bx, W * 0.58, bp);
        const byy = lerp(by + 6, H * 0.52, bp * bp);
        ctx.save();
        ctx.translate(bxx, byy);
        ctx.fillStyle = "#e8dcc0";
        ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 7, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3.4, 5); ctx.lineTo(0, 9); ctx.lineTo(3.4, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    // flash
    if (cycle >= 4.2 && cycle < 6.2) {
      const f = clamp(1 - (cycle - 4.2) / 0.7, 0, 1);
      ctx.fillStyle = "rgba(255,248,230," + (f * 0.95) + ")";
      ctx.fillRect(0, 0, W, H);
      // shockwave
      const sw = (cycle - 4.2) / 2;
      ctx.strokeStyle = "rgba(255,220,170," + (0.55 * (1 - sw)) + ")";
      ctx.lineWidth = 3 * (1 - sw) + 0.5;
      ctx.beginPath(); ctx.ellipse(W * 0.58, H * 0.52, 80 + sw * W, 30 + sw * H * 0.4, 0, 0, TAU); ctx.stroke();
      const sw2 = (cycle - 4.2) / 3.2;
      ctx.strokeStyle = "rgba(255,200,140," + (0.3 * (1 - sw2)) + ")";
      ctx.beginPath(); ctx.ellipse(W * 0.58, H * 0.52, 120 + sw2 * W * 1.2, 40 + sw2 * H * 0.5, 0, 0, TAU); ctx.stroke();
    }
    // mushroom
    if (cycle >= 4.4) {
      const p = clamp((cycle - 4.4) / 6.0, 0, 1);
      // ground glow
      glow(ctx, W * 0.58, horizon, W * 0.4, "#ff9a45", 0.20 * (1 - p * 0.5));
      mushroom(ctx, W * 0.58, horizon + 8, 2.45, p, P);
      // embers
      const rr = rng(91);
      for (let i = 0; i < 30; i++) {
        const ex = W * 0.58 + (rr() - 0.5) * 240;
        const ey = horizon - ((rr() * 120 + t * 20) % 160);
        ctx.fillStyle = "rgba(255,170,90," + (0.2 + rr() * 0.4) * (1 - p) + ")";
        ctx.fillRect(ex, ey, 1.5, 1.5);
      }
    }
    // aftermath dust
    if (cycle >= 9) {
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(W * 0.58 + (i - 4) * 40, horizon - 10 - i * 3, 24 + i * 6, 0, TAU);
        ctx.fillStyle = "rgba(150,120,95,0.04)"; ctx.fill();
      }
    }
  };

  SCENES.rocket = function (ctx, W, H, t, P) {
    const cycle = t % 12;
    sky(ctx, W, H, "#08080c", "#1c1a24", 0.9);
    stars(ctx, W, H, t, 140, 13, 0.7);
    glow(ctx, W * 0.75, H * 0.18, 120, "#8a7ac0", 0.10);
    // earth curve at bottom
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 1.28, W * 0.95, H * 0.5, 0, Math.PI, TAU);
    ctx.fillStyle = "#14141a";
    ctx.fill();
    ctx.strokeStyle = "rgba(140,160,190,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // launch pad
    const padX = W * 0.42, padY = H * 0.7;
    ctx.strokeStyle = "rgba(200,190,170,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX - 34, padY); ctx.lineTo(padX + 34, padY);
    ctx.moveTo(padX - 28, padY); ctx.lineTo(padX - 28, padY - 58);
    ctx.moveTo(padX + 28, padY); ctx.lineTo(padX + 28, padY - 58);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(padX - 28, padY - 12 - i * 12); ctx.lineTo(padX + 28, padY - 12 - i * 12); ctx.stroke();
    }
    // rocket ascends
    const launch = 2.4;
    if (cycle < launch) {
      rocket(ctx, padX, padY - 6, 1.25, "rgba(235,225,205,0.95)", false);
      // countdown glow
      const blink = Math.sin(t * 8) > 0;
      if (blink) glow(ctx, padX + 20, padY - 4, 6, "#ff9a50", 0.5);
    } else {
      const p = clamp((cycle - launch) / 8, 0, 1);
      const ry = padY - 6 - ease(p) * (H * 0.86);
      const rx = padX + Math.sin(p * 2) * 14;
      // exhaust trail
      const g = ctx.createLinearGradient(rx, ry + 20, rx, ry + 200);
      g.addColorStop(0, "rgba(255,220,170,0.7)");
      g.addColorStop(0.5, "rgba(255,140,60,0.28)");
      g.addColorStop(1, "rgba(180,60,30,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(rx - 6, ry + 12);
      ctx.quadraticCurveTo(rx + Math.sin(t * 6) * 20, ry + 110, rx + 20, ry + 210);
      ctx.quadraticCurveTo(rx + 4, ry + 120, rx + 6, ry + 12);
      ctx.closePath(); ctx.fill();
      rocket(ctx, rx, ry, 1.25, "rgba(235,225,205,0.95)", true);
      // smoke at pad
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.5 + i * 0.13) % 1;
        ctx.beginPath();
        ctx.arc(padX + Math.sin(i * 2) * (20 + ph * 40), padY + 4 - ph * 18, 10 + ph * 26, 0, TAU);
        ctx.fillStyle = "rgba(200,195,185," + (0.07 * (1 - ph)) + ")"; ctx.fill();
      }
    }
    // trajectory arc
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = "rgba(210,180,110,0.18)";
    ctx.beginPath();
    ctx.moveTo(padX, padY);
    ctx.quadraticCurveTo(W * 0.55, H * 0.2, W * 0.88, H * 0.08);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  SCENES.digital = function (ctx, W, H, t, P) {
    sky(ctx, W, H, "#080a10", "#0f1520", 0.9);
    // grid
    ctx.strokeStyle = "rgba(120,160,200,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const cx = W * 0.5, cy = H * 0.52, R = Math.min(W, H) * 0.31;
    // globe glow
    glow(ctx, cx, cy, R * 1.7, "#5a9ac0", 0.12);
    // sphere
    ctx.strokeStyle = "rgba(140,200,220,0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    for (let i = 1; i < 6; i++) {
      const rx = R * Math.sin((i / 6) * Math.PI);
      const yy = cy - R * Math.cos((i / 6) * Math.PI);
      ctx.beginPath(); ctx.ellipse(cx, yy, rx, rx * 0.16, 0, 0, TAU); ctx.strokeStyle = "rgba(140,200,220,0.16)"; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, R, 0, 0, TAU); ctx.strokeStyle = "rgba(140,200,220,0.13)"; ctx.stroke();
    }
    // rotating meridians
    for (let i = 0; i < 3; i++) {
      const rot = t * 0.12 + i * 0.7;
      const rx = Math.abs(Math.cos(rot)) * R;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, R, 0, 0, TAU);
      ctx.strokeStyle = "rgba(140,200,220,0.12)"; ctx.stroke();
    }
    // nodes + arcs
    const nodes = [];
    const r = rng(17);
    for (let i = 0; i < 18; i++) {
      const a = r() * TAU, rr = Math.sqrt(r()) * R * 0.9;
      nodes.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.9, ph: r() * TAU });
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i], b = nodes[(i * 5 + 3) % nodes.length];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 40 || dist > R * 1.5) continue;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my - 30, b.x, b.y);
      ctx.strokeStyle = "rgba(100,210,190,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const p = (t * 0.25 + i * 0.1) % 1;
      const qx = (1 - p) * (1 - p) * a.x + 2 * (1 - p) * p * mx + p * p * b.x;
      const qy = (1 - p) * (1 - p) * a.y + 2 * (1 - p) * p * (my - 30) + p * p * b.y;
      ctx.beginPath(); ctx.arc(qx, qy, 1.6, 0, TAU); ctx.fillStyle = "rgba(120,230,200,0.8)"; ctx.fill();
    }
    for (const n of nodes) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + n.ph);
      ctx.beginPath(); ctx.arc(n.x, n.y, 2 + pulse * 1.5, 0, TAU);
      ctx.fillStyle = "rgba(120,230,200,0.8)"; ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, 6 + pulse * 4, 0, TAU);
      ctx.strokeStyle = "rgba(120,230,200," + (0.16 * (1 - pulse)) + ")"; ctx.stroke();
    }
    // data streams
    for (let i = 0; i < 20; i++) {
      const x = (r() * W + t * (10 + r() * 30)) % W;
      const y = (r() * H + t * 8) % H;
      ctx.fillStyle = "rgba(120,200,220,0.12)";
      ctx.fillRect(x, y, 1, 4 + r() * 6);
    }
  };

  SCENES.protest = function (ctx, W, H, t, P) {
    const horizon = H * 0.7;
    sky(ctx, W, H, "#131016", "#4a2e28", 0.72);
    // city
    const r = rng(61);
    for (let i = 0; i < 10; i++) {
      building(ctx, W * 0.06 + i * W * 0.095, horizon + 6, 50 + r() * 50, 60 + r() * 100, "#1a1412", "rgba(220,170,90,0.4)", true);
    }
    // backlight
    glow(ctx, W * 0.5, horizon - 24, W * 0.62, "#e0a060", 0.34);
    ctx.fillStyle = "rgba(224,160,96,0.10)";
    ctx.fillRect(0, horizon - 60, W, 80);
    // crowd
    for (let i = 0; i < 34; i++) {
      const x = W * 0.04 + i * (W * 0.028) + Math.sin(t * 2 + i) * 2;
      const y = horizon + 70 + (i % 5) * 8;
      person(ctx, x, y, 1.4, t * 2.5 + i, i % 4 ? "rgba(20,16,12,0.96)" : "rgba(190,175,150,0.9)", { raised: i % 6 === 0 });
    }
    // placards
    for (let i = 0; i < 8; i++) {
      const x = W * 0.1 + i * W * 0.105;
      const sway = Math.sin(t * 1.5 + i) * 0.06;
      ctx.save();
      ctx.translate(x, horizon + 40);
      ctx.rotate(-0.1 + sway);
      ctx.fillStyle = "rgba(225,210,180,0.8)";
      ctx.fillRect(-14, -26, 28, 20);
      ctx.strokeStyle = "rgba(30,24,18,0.5)";
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-9, -21 + k * 5); ctx.lineTo(9, -21 + k * 5); ctx.stroke(); }
      ctx.fillStyle = "#c9b48e"; ctx.fillRect(-1, -6, 2, 16);
      ctx.restore();
    }
    // camera flashes
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.8 + i * 0.31) % 1;
      if (ph < 0.08) glow(ctx, W * (0.2 + i * 0.2), horizon + 30, 18, "#fff4d0", 0.5);
    }
  };

  SCENES.plague = function (ctx, W, H, t, P) {
    const horizon = H * 0.72;
    sky(ctx, W, H, "#10100f", "#3a2f26", 0.72);
    // houses
    const r = rng(71);
    for (let i = 0; i < 8; i++) {
      const x = W * 0.08 + i * W * 0.12;
      ctx.fillStyle = "#1a1510";
      ctx.fillRect(x, horizon - 50 - r() * 30, 60, 90);
      ctx.beginPath();
      ctx.moveTo(x - 8, horizon - 50 - r() * 30);
      ctx.lineTo(x + 30, horizon - 90 - r() * 30);
      ctx.lineTo(x + 68, horizon - 50 - r() * 30);
      ctx.closePath(); ctx.fill();
    }
    // fog
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 200 + t * 6) % W, horizon + 20 + i * 8, 160, 18, 0, 0, TAU);
      ctx.fillStyle = "rgba(160,160,150,0.03)"; ctx.fill();
    }
    // contagion rings
    const cx = W * 0.5, cy = horizon - 20;
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.18 + i * 0.25) % 1;
      ctx.beginPath(); ctx.arc(cx, cy, 20 + ph * W * 0.45, 0, TAU);
      ctx.strokeStyle = "rgba(170,50,40," + (0.30 * (1 - ph)) + ")";
      ctx.lineWidth = 1.5; ctx.stroke();
    }
    // red dots
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU, rr = r() * W * 0.4;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.5;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillStyle = "rgba(180,55,40," + (0.25 * pulse) + ")";
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    // plague doctor
    ctx.save();
    ctx.translate(W * 0.18, horizon + 70);
    ctx.fillStyle = "#0e0c0a";
    ctx.beginPath(); ctx.ellipse(0, -20, 8, 20, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -46, 7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -48); ctx.lineTo(18, -42); ctx.lineTo(4, -40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#0e0c0a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(-2, 14); ctx.moveTo(0, -2); ctx.lineTo(4, 14); ctx.stroke();
    ctx.restore();
    // crows
    for (let i = 0; i < 4; i++) {
      const x = ((t * 20 + i * 160) % (W + 80)) - 40;
      const y = H * 0.24 + Math.sin(t + i * 2) * 12;
      ctx.strokeStyle = "rgba(20,16,12,0.7)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x - 2, y - 4, x, y); ctx.quadraticCurveTo(x + 2, y - 4, x + 5, y); ctx.stroke();
    }
  };

  SCENES.disaster = function (ctx, W, H, t, P) {
    const horizon = H * 0.58;
    sky(ctx, W, H, "#0d0d14", "#4a2c22", 0.66);
    // clouds
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 180 + t * 8) % W, H * 0.16 + (i % 3) * 22, 120, 26, 0, 0, TAU);
      ctx.fillStyle = "rgba(40,34,30,0.5)"; ctx.fill();
    }
    // lightning
    if (Math.sin(t * 1.7) > 0.94) {
      const x = W * (0.3 + (Math.sin(t * 3) + 1) * 0.2);
      ctx.strokeStyle = "rgba(230,220,200,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.1);
      ctx.lineTo(x + 14, H * 0.24);
      ctx.lineTo(x - 6, H * 0.3);
      ctx.lineTo(x + 10, H * 0.44);
      ctx.stroke();
      ctx.fillStyle = "rgba(220,230,255,0.12)";
      ctx.fillRect(0, 0, W, H);
    }
    // sea
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, "#1a2426");
    g.addColorStop(1, "#0b1112");
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);
    // huge wave
    ctx.beginPath();
    ctx.moveTo(W, H);
    ctx.lineTo(W, H * 0.4);
    ctx.bezierCurveTo(W * 0.9, H * 0.28, W * 0.72, H * 0.42, W * 0.62, H * 0.6);
    ctx.bezierCurveTo(W * 0.5, H * 0.82, W * 0.35, H * 0.9, W * 0.2, H);
    ctx.closePath();
    ctx.fillStyle = "rgba(34,54,56,0.96)";
    ctx.fill();
    // foam
    ctx.strokeStyle = "rgba(228,238,232,0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W, H * 0.4);
    ctx.bezierCurveTo(W * 0.9, H * 0.28, W * 0.72, H * 0.42, W * 0.62, H * 0.6);
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const x = W * (0.55 + i * 0.024);
      const y = H * 0.42 + Math.sin(i + t) * 14;
      ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, TAU);
      ctx.fillStyle = "rgba(232,240,234,0.3)"; ctx.fill();
    }
    // debris
    for (let i = 0; i < 6; i++) {
      const x = W * 0.3 + i * 60 + Math.sin(t + i) * 8;
      const y = H * 0.66 + Math.cos(t * 0.8 + i) * 6;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t + i) * 0.3);
      ctx.fillStyle = "rgba(120,100,80,0.35)"; ctx.fillRect(-8, -2, 16, 4);
      ctx.restore();
    }
    // rain
    for (let i = 0; i < 40; i++) {
      const x = ((i * 37 + t * 90) % W);
      const y = ((i * 53 + t * 200) % H);
      ctx.strokeStyle = "rgba(180,200,200,0.10)";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); ctx.stroke();
    }
    glow(ctx, W * 0.68, H * 0.34, 160, "#5a7a80", 0.10);
  };

  /* ══════════════ MINIATURES ══════════════ */

  function miniMammoth(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const b = Math.sin(t * 3) * 0.6;
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = "round";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-3, -4 + b); ctx.lineTo(-4, 0); ctx.moveTo(1, -4 + b); ctx.lineTo(2, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -7 + b, 6, 4, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, -10 + b, 3.4, 2.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -8.5 + b, 2.6, 2.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, -7 + b); ctx.quadraticCurveTo(9, -3, 7.5, 0); ctx.stroke();
    ctx.strokeStyle = "#f0e4c8"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(6.5, -6 + b); ctx.quadraticCurveTo(9, -5, 9.5, -3); ctx.stroke();
    ctx.restore();
  }
  function miniCamel(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = Math.sin(t * 5);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-5 + g, 0); ctx.moveTo(-1, -4); ctx.lineTo(0 - g, 0); ctx.moveTo(3, -4); ctx.lineTo(4 - g, 0); ctx.moveTo(5, -4); ctx.lineTo(6 + g, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -7, 6, 3.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-2, -10, 2.4, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -10, 2.2, Math.PI, TAU); ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(5, -7); ctx.quadraticCurveTo(8, -12, 9, -14); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(10, -14.2, 2, 1.2, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function miniShip(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.rotate(Math.sin(t * 2) * 0.04);
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(0, 3, 7, 0); ctx.lineTo(5, -2); ctx.lineTo(-5, -2); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -11); ctx.quadraticCurveTo(7, -8, 1, -4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(230,215,185,0.4)";
    ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(0, 6, 10, 4); ctx.stroke();
    ctx.restore();
  }
  function miniHorse(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = Math.sin(t * 8);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round";
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-5 + g, 0); ctx.moveTo(-1, -4); ctx.lineTo(-1 - g, 0); ctx.moveTo(3, -4); ctx.lineTo(4 - g, 0); ctx.moveTo(5, -4); ctx.lineTo(6 + g, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -7, 6, 2.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -8); ctx.quadraticCurveTo(9, -13, 11, -13); ctx.lineTo(12, -10); ctx.quadraticCurveTo(8, -9, 7, -6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(-9, -4); ctx.stroke();
    ctx.restore();
  }
  function miniTrain(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.fillRect(-8, -6, 24, 5); ctx.fillRect(-8, -11, 6, 5);
    ctx.beginPath(); ctx.arc(-4, 0, 2, 0, TAU); ctx.arc(11, 0, 2, 0, TAU); ctx.fill();
    const ph = (t * 2) % 1;
    ctx.beginPath(); ctx.arc(-10 - ph * 6, -12 - ph * 10, 2 + ph * 4, 0, TAU);
    ctx.fillStyle = "rgba(220,210,190," + (0.25 * (1 - ph)) + ")"; ctx.fill();
    ctx.restore();
  }
  function miniCannon(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(-2, 0, 3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(8, -5); ctx.lineTo(8, -2); ctx.lineTo(1, 0); ctx.closePath(); ctx.fill();
    const ph = (t * 3) % 1;
    if (ph < 0.15) {
      glow(ctx, 11, -4, 10, "#ffbd60", 0.6);
      ctx.beginPath(); ctx.moveTo(9, -5); ctx.lineTo(16, -7); ctx.lineTo(14, -3); ctx.closePath(); ctx.fillStyle = "#ffd27a"; ctx.fill();
    }
    ctx.restore();
  }
  function miniPlane(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const bob = Math.sin(t * 2) * 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, bob, 7, 1.4, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, bob); ctx.lineTo(-3, bob - 4); ctx.lineTo(-1, bob - 4); ctx.lineTo(3, bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, bob); ctx.lineTo(-3, bob + 4); ctx.lineTo(-1, bob + 4); ctx.lineTo(3, bob); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function miniMushroom(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const p = 0.9;
    ctx.fillStyle = "rgba(220,170,110,0.8)";
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-2, -7, -4, -9); ctx.lineTo(4, -9); ctx.quadraticCurveTo(2, -7, 3, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -10, 7, 4, 0, 0, TAU); ctx.fill();
    glow(ctx, 0, -10, 14, "#ffb35c", 0.25);
    ctx.restore();
  }
  function miniRocket(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y - (t * 6 % 14)); ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(2.4, -4, 2, 2); ctx.lineTo(-2, 2); ctx.quadraticCurveTo(-2.4, -4, 0, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,180,80,0.8)";
    ctx.beginPath(); ctx.moveTo(-1.8, 2); ctx.lineTo(0, 8); ctx.lineTo(1.8, 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function miniFlag(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -12);
    for (let i = 0; i <= 5; i++) ctx.lineTo(i * 2.2, -12 + Math.sin(t * 5 + i) * 1.4);
    for (let i = 5; i >= 0; i--) ctx.lineTo(i * 2.2, -6 + Math.sin(t * 5 + i) * 1.4);
    ctx.closePath(); ctx.fillStyle = hexA(col, 0.7); ctx.fill();
    ctx.restore();
  }
  function miniExplosion(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const ph = (t * 0.8) % 1;
    glow(ctx, 0, 0, 10 + ph * 14, "#ff9a40", 0.35 * (1 - ph));
    ctx.beginPath(); ctx.arc(0, 0, 2 + ph * 6, 0, TAU);
    ctx.strokeStyle = "rgba(255,170,90," + (0.6 * (1 - ph)) + ")"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  /* ── medallion icons: one focal symbol, no crowd blobs ───────── */
  const MINI_INK = "rgba(74,54,36,0.9)";
  const MINI_WARM = "rgba(176,105,62,0.95)";
  const MINI_GOLD = "rgba(176,138,62,0.95)";
  const MINI_PAPER = "rgba(244,233,208,0.95)";

  function miniCNFounding(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.16)"; ctx.fill();
    ctx.fillStyle = "rgba(204,174,128,0.55)"; ctx.fillRect(-12, -6, 24, 8);
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.9; ctx.strokeRect(-12, -6, 24, 8);
    for (let i = -12; i < 12; i += 4) { ctx.fillRect(i, -8.5, 2.6, 2.6); ctx.strokeRect(i, -8.5, 2.6, 2.6); }
    ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-3, -3); ctx.quadraticCurveTo(0, -7, 3, -3); ctx.lineTo(3, 2); ctx.closePath(); ctx.fillStyle = "rgba(92,66,43,0.7)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(-7, -11, -4, -14); ctx.quadraticCurveTo(0, -18, 4, -14); ctx.quadraticCurveTo(7, -11, 14, -6); ctx.closePath(); ctx.fillStyle = "rgba(156,96,60,0.85)"; ctx.fill(); ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.stroke();
    for (const bx of [-10, 10]) {
      const wave = Math.sin(t * 2.5 + bx) * 1.2;
      ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx, 2); ctx.lineTo(bx, -13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 0.5, -12); ctx.quadraticCurveTo(bx + 4 + wave, -11, bx + 6 + wave, -8.5); ctx.lineTo(bx + 0.6, -7); ctx.closePath(); ctx.fillStyle = bx < 0 ? MINI_WARM : MINI_GOLD; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, -18.5, 1.6, 0, TAU); ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
  }

  function miniRomanFounding(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.16)"; ctx.fill();
    // steps + columns
    ctx.fillStyle = "rgba(222,205,176,0.85)"; ctx.fillRect(-13, -1, 26, 4);
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.strokeRect(-13, -1, 26, 4);
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = "rgba(238,226,202,0.9)"; ctx.fillRect(i * 4.5 - 1, -10, 2, 9);
      ctx.strokeStyle = "rgba(100,80,56,0.7)"; ctx.strokeRect(i * 4.5 - 1, -10, 2, 9);
      ctx.fillStyle = "rgba(120,90,60,0.25)"; ctx.fillRect(i * 4.5 - 1.5, -10.8, 3, 1.2);
    }
    // pediment
    ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(0, -17); ctx.lineTo(13, -10); ctx.closePath(); ctx.fillStyle = "rgba(232,220,196,0.96)"; ctx.fill(); ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.9; ctx.stroke();
    // eagle standard
    ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(10, -21); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -21); ctx.lineTo(7, -24); ctx.lineTo(10, -23); ctx.lineTo(13, -24); ctx.closePath(); ctx.fillStyle = MINI_GOLD; ctx.fill();
    // laurel
    ctx.strokeStyle = "rgba(80,110,70,0.8)"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, -12, 15, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.restore();
  }

  function miniIslamicFounding(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.16)"; ctx.fill();
    ctx.fillStyle = "rgba(214,190,148,0.65)"; ctx.fillRect(-13, -4, 26, 6);
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.strokeRect(-13, -4, 26, 6);
    // dome
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-9, -17, 0, -20); ctx.quadraticCurveTo(9, -17, 9, -4); ctx.closePath(); ctx.fillStyle = "rgba(205,160,96,0.85)"; ctx.fill(); ctx.strokeStyle = MINI_INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -24); ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1; ctx.stroke();
    // minarets
    for (const mx of [-14, 14]) {
      ctx.fillStyle = "rgba(224,204,170,0.9)"; ctx.fillRect(mx - 1.4, -20, 2.8, 22);
      ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.6; ctx.strokeRect(mx - 1.4, -20, 2.8, 22);
      ctx.beginPath(); ctx.moveTo(mx - 2, -20); ctx.lineTo(mx, -24); ctx.lineTo(mx + 2, -20); ctx.closePath(); ctx.fillStyle = MINI_GOLD; ctx.fill();
    }
    // arch door
    ctx.beginPath(); ctx.moveTo(-2.6, 2); ctx.lineTo(-2.6, -5); ctx.quadraticCurveTo(0, -8, 2.6, -5); ctx.lineTo(2.6, 2); ctx.closePath(); ctx.fillStyle = "rgba(86,60,40,0.55)"; ctx.fill();
    ctx.restore();
  }

  function miniCastleFounding(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.16)"; ctx.fill();
    ctx.fillStyle = "rgba(196,170,132,0.65)"; ctx.fillRect(-10, -8, 20, 10);
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.strokeRect(-10, -8, 20, 10);
    for (const tx of [-13, 10]) {
      ctx.fillStyle = "rgba(210,186,148,0.8)"; ctx.fillRect(tx, -15, 7, 17); ctx.strokeRect(tx, -15, 7, 17);
      ctx.beginPath(); ctx.moveTo(tx - 1, -15); ctx.lineTo(tx + 3.5, -20); ctx.lineTo(tx + 8, -15); ctx.closePath(); ctx.fillStyle = MINI_WARM; ctx.fill();
    }
    for (let i = -10; i < 10; i += 4) { ctx.fillStyle = "rgba(210,186,148,0.9)"; ctx.fillRect(i, -10, 2.4, 2.4); }
    ctx.beginPath(); ctx.moveTo(-2.5, 2); ctx.lineTo(-2.5, -5); ctx.quadraticCurveTo(0, -8, 2.5, -5); ctx.lineTo(2.5, 2); ctx.closePath(); ctx.fillStyle = "rgba(80,58,40,0.65)"; ctx.fill();
    ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, -15); ctx.lineTo(12, -24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -24); ctx.lineTo(18, -22); ctx.lineTo(12, -19); ctx.closePath(); ctx.fillStyle = MINI_WARM; ctx.fill();
    ctx.restore();
  }

  function miniModernFounding(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.16)"; ctx.fill();
    ctx.fillStyle = "rgba(224,213,190,0.9)"; ctx.fillRect(-13, -2, 26, 4); ctx.strokeStyle = MINI_INK; ctx.strokeRect(-13, -2, 26, 4);
    ctx.fillStyle = "rgba(238,229,210,0.95)"; ctx.fillRect(-10, -12, 20, 10); ctx.strokeRect(-10, -12, 20, 10);
    for (let i = -3; i <= 3; i++) { ctx.fillStyle = "rgba(180,160,130,0.55)"; ctx.fillRect(i * 2.6, -10, 1, 8); }
    ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(0, -18); ctx.lineTo(8, -12); ctx.closePath(); ctx.fillStyle = "rgba(210,190,155,0.95)"; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, 2); ctx.lineTo(12, -22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -22); ctx.lineTo(18, -20); ctx.lineTo(12, -17); ctx.closePath(); ctx.fillStyle = MINI_WARM; ctx.fill();
    ctx.restore();
  }

  function miniMegalith(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.16)"; ctx.fill();
    ctx.fillStyle = "rgba(160,142,116,0.8)"; ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8;
    for (const bx of [-10, -2, 7]) {
      ctx.fillRect(bx, -12, 4, 14); ctx.strokeRect(bx, -12, 4, 14);
      ctx.fillRect(bx - 1, -14, 6, 3);
    }
    ctx.fillRect(-12, -16, 22, 3); ctx.strokeRect(-12, -16, 22, 3);
    const f = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.beginPath(); ctx.arc(0, 1, 3 * f, 0, TAU); ctx.fillStyle = "rgba(214,120,58,0.55)"; ctx.fill();
    ctx.restore();
  }

  function miniCNCavalry(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    miniHorse(ctx, -3, 0, 0.95, t, col);
    // rider
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -16); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -18, 1.8, 0, TAU); ctx.fillStyle = "rgba(126,94,64,0.95)"; ctx.fill();
    // banner
    ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(2, -23); ctx.stroke();
    const wave = Math.sin(t * 3) * 1.4;
    ctx.beginPath(); ctx.moveTo(2.5, -22); ctx.quadraticCurveTo(8 + wave, -21, 11 + wave, -18); ctx.lineTo(2.5, -16); ctx.closePath(); ctx.fillStyle = MINI_WARM; ctx.fill();
    ctx.restore();
  }

  function miniGreekNaval(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // hull, facing right
    ctx.beginPath(); ctx.moveTo(-15, -2); ctx.quadraticCurveTo(-6, 4, 10, 1); ctx.lineTo(15, -3); ctx.lineTo(10, -1); ctx.quadraticCurveTo(0, 1, -12, -4); ctx.closePath(); ctx.fillStyle = "rgba(124,86,52,0.9)"; ctx.fill(); ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.stroke();
    // ram
    ctx.beginPath(); ctx.moveTo(15, -3); ctx.lineTo(20, -1); ctx.lineTo(15, 0); ctx.closePath(); ctx.fillStyle = MINI_GOLD; ctx.fill();
    // oars
    ctx.strokeStyle = "rgba(74,54,36,0.7)"; ctx.lineWidth = 0.6;
    for (let i = -10; i <= 6; i += 3) { ctx.beginPath(); ctx.moveTo(i, 2); ctx.lineTo(i - 4, 6); ctx.stroke(); }
    // mast + square sail
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -15); ctx.stroke();
    const wave = Math.sin(t * 2.5) * 1;
    ctx.beginPath(); ctx.moveTo(-7, -14); ctx.quadraticCurveTo(0, -17 + wave, 7, -14); ctx.lineTo(6, -6); ctx.quadraticCurveTo(0, -4 + wave, -6, -6); ctx.closePath(); ctx.fillStyle = "rgba(236,220,190,0.9)"; ctx.fill(); ctx.stroke();
    // eye
    ctx.beginPath(); ctx.arc(10, -2, 1, 0, TAU); ctx.fillStyle = MINI_INK; ctx.fill();
    ctx.restore();
  }

  function miniRevolution(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // barricade
    ctx.strokeStyle = "rgba(96,68,44,0.8)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(12, -2); ctx.moveTo(-12, -2); ctx.lineTo(12, 2); ctx.stroke();
    // flag
    ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -21); ctx.stroke();
    const wave = Math.sin(t * 3) * 2;
    ctx.beginPath(); ctx.moveTo(0.5, -20); ctx.quadraticCurveTo(8 + wave, -19, 13 + wave, -15); ctx.lineTo(0.5, -12); ctx.closePath(); ctx.fillStyle = "rgba(176,67,44,0.92)"; ctx.fill();
    // spaced crowd, not a blob
    for (let i = -2; i <= 2; i++) {
      const cx = i * 5 + Math.sin(t * 2 + i) * 0.8;
      ctx.strokeStyle = i % 2 ? "rgba(108,78,52,0.8)" : "rgba(74,54,36,0.8)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx - 0.5, 3); ctx.moveTo(cx, 0); ctx.lineTo(cx + 0.5, 3); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, -1.2, 0.9, 0, TAU); ctx.fillStyle = "rgba(126,94,64,0.9)"; ctx.fill();
    }
    ctx.restore();
  }

  function miniPaper(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // sheet
    ctx.fillStyle = MINI_PAPER; ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(8, -10); ctx.lineTo(11, 6); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6, -5 + i * 3); ctx.lineTo(6, -6 + i * 3); ctx.strokeStyle = "rgba(90,70,50,0.45)"; ctx.stroke(); }
    // vat
    ctx.fillStyle = "rgba(130,96,58,0.65)"; ctx.fillRect(-14, 7, 12, 4); ctx.strokeRect(-14, 7, 12, 4);
    // brush
    ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(15, -16); ctx.stroke();
    ctx.beginPath(); ctx.arc(15, -16, 1.2, 0, TAU); ctx.fillStyle = MINI_INK; ctx.fill();
    ctx.restore();
  }

  function miniMughalTomb(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 3, 15, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.15)"; ctx.fill();
    ctx.fillStyle = "rgba(236,226,206,0.95)"; ctx.fillRect(-12, -3, 24, 6); ctx.strokeStyle = MINI_INK; ctx.strokeRect(-12, -3, 24, 6);
    // central dome
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-8, -18, 0, -22); ctx.quadraticCurveTo(8, -18, 8, -3); ctx.closePath(); ctx.fillStyle = "rgba(246,238,218,0.98)"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -26); ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 1; ctx.stroke();
    // minarets
    for (const mx of [-15, 15]) {
      ctx.fillStyle = "rgba(244,234,212,0.95)"; ctx.fillRect(mx - 1.3, -18, 2.6, 21); ctx.strokeRect(mx - 1.3, -18, 2.6, 21);
      ctx.beginPath(); ctx.moveTo(mx - 2, -18); ctx.lineTo(mx, -22); ctx.lineTo(mx + 2, -18); ctx.closePath(); ctx.fillStyle = MINI_GOLD; ctx.fill();
    }
    // reflecting pool
    ctx.strokeStyle = "rgba(80,130,140,0.55)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(8, 6); ctx.stroke();
    ctx.restore();
  }

  function miniPrinting(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 1.2;
    ctx.strokeRect(-12, -10, 24, 14);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(5, -20); ctx.stroke();
    // screw
    ctx.strokeStyle = MINI_GOLD; ctx.lineWidth = 0.8;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 1.4, -19); ctx.lineTo(i * 1.4, -13); ctx.stroke(); }
    // paper
    ctx.fillStyle = MINI_PAPER; ctx.fillRect(-9, 1, 18, 5); ctx.strokeStyle = MINI_INK; ctx.strokeRect(-9, 1, 18, 5);
    ctx.restore();
  }

  function miniMonument(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 3, 0, 0, TAU); ctx.fillStyle = "rgba(120,96,64,0.15)"; ctx.fill();
    ctx.fillStyle = "rgba(230,218,196,0.95)"; ctx.fillRect(-12, -2, 24, 4); ctx.strokeStyle = MINI_INK; ctx.strokeRect(-12, -2, 24, 4);
    for (let i = -2; i <= 2; i++) { ctx.fillStyle = "rgba(242,232,212,0.95)"; ctx.fillRect(i * 4 - 1, -11, 2, 9); ctx.strokeRect(i * 4 - 1, -11, 2, 9); }
    ctx.beginPath(); ctx.moveTo(-12, -11); ctx.lineTo(0, -17); ctx.lineTo(12, -11); ctx.closePath(); ctx.fillStyle = "rgba(236,224,202,0.95)"; ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function miniJunk(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-6, 5, 12, 1); ctx.lineTo(16, -2); ctx.lineTo(10, -1); ctx.quadraticCurveTo(0, 2, -12, -3); ctx.closePath(); ctx.fillStyle = "rgba(126,88,54,0.9)"; ctx.fill(); ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, -20); ctx.stroke();
    // battened sail
    const wave = Math.sin(t * 2.2) * 0.8;
    ctx.beginPath(); ctx.moveTo(-7, -19); ctx.quadraticCurveTo(0, -21 + wave, 7, -19); ctx.lineTo(7, -6); ctx.quadraticCurveTo(0, -4 + wave, -7, -6); ctx.closePath(); ctx.fillStyle = "rgba(220,160,96,0.85)"; ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6, -16 + i * 2.2); ctx.lineTo(6, -16 + i * 2.2); ctx.strokeStyle = "rgba(110,70,40,0.5)"; ctx.lineWidth = 0.5; ctx.stroke(); }
    ctx.restore();
  }

  function miniCaravel(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-5, 6, 12, 2); ctx.lineTo(17, -2); ctx.lineTo(9, -1); ctx.quadraticCurveTo(0, 3, -11, -3); ctx.closePath(); ctx.fillStyle = "rgba(118,82,50,0.9)"; ctx.fill(); ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.stroke();
    for (const mx of [-6, 2, 9]) {
      ctx.strokeStyle = MINI_INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(mx, -1); ctx.lineTo(mx, -18 + Math.abs(mx) * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 0.5, -16); ctx.quadraticCurveTo(mx + 5, -13, mx + 0.5, -7); ctx.closePath(); ctx.fillStyle = "rgba(242,232,210,0.9)"; ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(17, -2); ctx.lineTo(20, -1); ctx.lineTo(17, 0); ctx.closePath(); ctx.fillStyle = MINI_GOLD; ctx.fill();
    ctx.restore();
  }

  function mini(ctx, type, x, y, s, t, color, seed) {
    const col = color || "#c0553a";
    switch (type) {
      case "cn-founding": miniCNFounding(ctx, x, y, s, t, col); break;
      case "roman-founding": miniRomanFounding(ctx, x, y, s, t, col); break;
      case "islamic-founding": miniIslamicFounding(ctx, x, y, s, t, col); break;
      case "castle-founding": miniCastleFounding(ctx, x, y, s, t, col); break;
      case "modern-founding": miniModernFounding(ctx, x, y, s, t, col); break;
      case "megalith": miniMegalith(ctx, x, y, s, t, col); break;
      case "cn-cavalry": miniCNCavalry(ctx, x, y, s, t, col); break;
      case "greek-naval": miniGreekNaval(ctx, x, y, s, t, col); break;
      case "junk": miniJunk(ctx, x, y, s, t, col); break;
      case "caravel":
      case "galleon": miniCaravel(ctx, x, y, s, t, col); break;
      case "mughal-tomb": miniMughalTomb(ctx, x, y, s, t, col); break;
      case "paper": miniPaper(ctx, x, y, s, t, col); break;
      case "printing": miniPrinting(ctx, x, y, s, t, col); break;
      case "monument": miniMonument(ctx, x, y, s, t, col); break;
      case "hunt": miniMammoth(ctx, x, y, s * 1.15, t, col); break;
      case "agri":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        for (let i = -1; i <= 1; i++) {
          const sway = Math.sin(t * 3 + i) * 1.5;
          ctx.strokeStyle = hexA(col, 0.8); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(i * 4, 0); ctx.quadraticCurveTo(i * 4 + sway, -6, i * 4 + sway * 1.6, -10); ctx.stroke();
          ctx.beginPath(); ctx.arc(i * 4 + sway * 1.6, -10, 1.2, 0, TAU); ctx.fillStyle = hexA(col, 0.8); ctx.fill();
        }
        ctx.restore(); break;
      case "march":
        for (let i = 0; i < 3; i++) person(ctx, x + (i - 1) * 6, y + Math.sin(t * 3 + i) * 0.6, 0.38 * s, t * 2 + i, col, {});
        break;
      case "city":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        // ground shadow
        ctx.beginPath(); ctx.ellipse(0, 1, 13, 2.5, 0, 0, TAU);
        ctx.fillStyle = "rgba(120,96,64,0.18)"; ctx.fill();
        // city wall and crenellations
        ctx.fillStyle = "rgba(196,164,118,0.55)";
        ctx.fillRect(-11, -7, 22, 8);
        ctx.strokeStyle = "rgba(84,60,38,0.85)"; ctx.lineWidth = 0.9;
        ctx.strokeRect(-11, -7, 22, 8);
        for (let i = -11; i < 11; i += 4) {
          ctx.fillRect(i, -9.5, 2.4, 2.5);
          ctx.strokeRect(i, -9.5, 2.4, 2.5);
        }
        // gate
        ctx.beginPath();
        ctx.moveTo(-2.8, 1); ctx.lineTo(-2.8, -3.5);
        ctx.quadraticCurveTo(0, -7, 2.8, -3.5); ctx.lineTo(2.8, 1);
        ctx.closePath();
        ctx.fillStyle = "rgba(92,66,43,0.72)"; ctx.fill();
        // palace roof
        ctx.beginPath();
        ctx.moveTo(-12, -7);
        ctx.quadraticCurveTo(-7, -11, -4, -13);
        ctx.quadraticCurveTo(0, -17, 4, -13);
        ctx.quadraticCurveTo(7, -11, 12, -7);
        ctx.closePath();
        ctx.fillStyle = "rgba(156,96,60,0.82)"; ctx.fill();
        ctx.strokeStyle = "rgba(84,60,38,0.8)"; ctx.lineWidth = 0.7; ctx.stroke();
        // banners
        for (const bx of [-8, 8]) {
          const wave = Math.sin(t * 2 + bx) * 0.8;
          ctx.strokeStyle = "rgba(84,60,38,0.85)"; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(bx, 1); ctx.lineTo(bx, -12); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(bx + 0.4, -11);
          ctx.quadraticCurveTo(bx + 4 + wave, -10.5, bx + 5.5 + wave, -8.5);
          ctx.lineTo(bx + 0.6, -7);
          ctx.closePath();
          ctx.fillStyle = col; ctx.fill();
        }
        ctx.restore(); break;
      case "temple":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-6, -5); ctx.lineTo(6, -5); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
        ctx.fillRect(-4, -10, 8, 5);
        ctx.restore(); break;
      case "chariot":
        miniHorse(ctx, x + 4, y, s, t, col);
        ctx.save(); ctx.translate(x - 3, y - 4); ctx.scale(s, s);
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.stroke();
        ctx.restore(); break;
      case "phalanx":
        for (let i = -1; i <= 1; i++) person(ctx, x + i * 5, y + (i % 2) * 1, 0.4 * s, t + i, col, { shield: true, spear: true });
        break;
      case "siege":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        ctx.fillStyle = col; ctx.fillRect(-8, -8, 16, 8);
        for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 4, -10, 2, 2);
        const sph = (t * 1.5) % 1;
        ctx.beginPath(); ctx.arc(-10 + sph * 20, -16 - Math.sin(sph * Math.PI) * 8, 1.2, 0, TAU); ctx.fillStyle = "#f0e4c8"; ctx.fill();
        ctx.restore(); break;
      case "cavalry":
        miniHorse(ctx, x, y, s * 1.15, t, col); break;
      case "naval":
      case "ship":
        miniShip(ctx, x, y, s * 1.15, t, col); break;
      case "camel":
        miniCamel(ctx, x, y, s * 1.15, t, col); break;
      case "cannon":
        miniCannon(ctx, x, y, s, t, col); break;
      case "musket":
        for (let i = -1; i <= 1; i++) person(ctx, x + i * 5, y, 0.4 * s, t * 0.5 + i, col, { spear: true, helmet: true });
        if ((t * 2) % 1 < 0.15) glow(ctx, x + 6, y - 8, 8, "#ffcf70", 0.5);
        break;
      case "revolution":
      case "protest":
        miniRevolution(ctx, x, y, s, t, col); break;
      case "industry":
        miniTrain(ctx, x, y, s, t, col); break;
      case "trench":
        miniExplosion(ctx, x, y, s, t, col); break;
      case "air":
        miniPlane(ctx, x, y, s, t, col); break;
      case "atomic":
        miniMushroom(ctx, x, y, s, t, col); break;
      case "rocket":
        miniRocket(ctx, x, y, s, t, col); break;
      case "digital":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        const r = 7;
        ctx.strokeStyle = hexA(col, 0.7); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.4, r, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const a = t * 2 + i * 2.1;
          ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, 1.2, 0, TAU); ctx.fillStyle = col; ctx.fill();
        }
        ctx.restore(); break;
      case "pilgrim":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        const mstep = Math.sin(t * 4);
        ctx.fillStyle = "#c9a15a";
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-4, 0); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -12, 2, 0, TAU); ctx.fillStyle = "#2b2218"; ctx.fill();
        ctx.strokeStyle = "#e0c48a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(3, -16); ctx.lineTo(4, 1); ctx.stroke();
        ctx.strokeStyle = "#2b2218"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(-2 + mstep, 1); ctx.moveTo(1, -2); ctx.lineTo(2 - mstep, 1); ctx.stroke();
        ctx.restore(); break;
      case "plague":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        const pph = (t * 0.6) % 1;
        ctx.beginPath(); ctx.arc(0, 0, 2 + pph * 8, 0, TAU);
        ctx.strokeStyle = hexA(col, 0.6 * (1 - pph)); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, TAU); ctx.fillStyle = col; ctx.fill();
        ctx.restore(); break;
      case "disaster":
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        const p2 = (t * 0.9) % 1;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(0, -9 - p2 * 4, 5, 0); ctx.lineTo(4, 2); ctx.lineTo(-4, 2); ctx.closePath();
        ctx.fillStyle = hexA(col, 0.6); ctx.fill();
        ctx.restore(); break;
      default:
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU);
        ctx.fillStyle = col; ctx.fill();
        ctx.restore();
    }
  }

  /* ══════════════ MOUNT ══════════════ */
  function mount(canvas, type, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    let W = 1, H = 1, dpr = 1, raf = 0, last = performance.now(), elapsed = opts.startAt || 0, paused = false;
    const P = palette(opts);
    const fn = SCENES[type] || SCENES.temple;
    const defaultStart = { atomic: 3.0, city: 4.0, air: 1.2, industry: 1.5, revolution: 1.5, protest: 1.5 };
    if (!opts.startAt && defaultStart[type]) elapsed = defaultStart[type];

    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    resize();

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      if (!paused) elapsed += dt;
      ctx.save();
      fn(ctx, W, H, elapsed, P, opts);
      ctx.restore();
      finish(ctx, W, H, P);
    }
    raf = requestAnimationFrame(frame);

    return {
      stop() { cancelAnimationFrame(raf); ro.disconnect(); },
      resize,
      toggle() { paused = !paused; return paused; },
      isPaused() { return paused; },
      setType(t) { type = t; },
    };
  }

  window.Scenes = { mount, mini, styleFor, SCENES };
})();
