/* 寰宇时序 · State births and dissolutions
   Ambient map layer: new states bloom, old states fade, at their year. */
(function () {
  "use strict";
  const A = window.WORLD_ATLAS;
  const TAU = Math.PI * 2;
  let byKey = {};
  const S = (window.StateChanges = {
    map: null,
    lang: "zh",
    init(map) { this.map = map; this.rebuild(); },
    setLang(lang) { this.lang = lang; },
    rebuild() {
      byKey = {};
      if (!this.map || !this.map.features) return;
      for (const f of this.map.features) {
        const p = f.properties;
        if (p.iso3 && p.iso3 !== "-99") byKey[p.iso3] = f;
        if (p.iso2 && p.iso2 !== "-99") byKey[p.iso2] = f;
        byKey[p.n] = f;
      }
    },
    changes() {
      const d = A.stateChanges;
      if (!d) return [];
      return (d.births || []).map((x) => Object.assign({ type: "birth" }, x))
        .concat((d.dissolutions || []).map((x) => Object.assign({ type: "dissolution" }, x)));
    },
    near(year, windowYears) {
      const w = windowYears == null ? 1 : windowYears;
      return this.changes().filter((x) => Math.abs(x.year - year) <= w);
    },
    draw(ctx, map, now) {
      if (!A.stateChanges || !map.toggles.stateChanges || map.theatreActive) return;
      const list = this.near(map.year, 1);
      if (!list.length) return;
      const p = now / 1000;
      const placed = [];
      let shown = 0;
      const births = list.filter((x) => x.type === "birth");
      for (const x of list) {
        const pos = map.project(x.lon, x.lat);
        if (pos.x < -30 || pos.x > map.W + 30 || pos.y < -30 || pos.y > map.H + 30) continue;
        const birth = x.type === "birth";
        const col = birth ? "#3f7a5a" : "#7a6a66";
        const yearDiff = map.year - x.year;
        // country bloom
        if (birth) {
          const f = byKey[x.key] || (x.iso2 && byKey[x.iso2]) || (x.iso3 && byKey[x.iso3]);
          if (f) {
            map._trace(ctx, f);
            ctx.fillStyle = "rgba(63,122,90," + (0.11 + 0.03 * Math.sin(p * 2)) + ")";
            ctx.fill("evenodd");
            ctx.strokeStyle = "rgba(63,122,90,0.7)";
            ctx.lineWidth = 1.1;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = -p * 10;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        // pulse
        const phase = ((p * 0.5 + (x.year % 7) * 0.13) % 1);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, birth ? 7 + phase * 22 : 20 - phase * 14, 0, TAU);
        ctx.strokeStyle = hexA(col, birth ? 0.55 * (1 - phase) : 0.35 * (1 - phase));
        ctx.lineWidth = 1.3;
        ctx.stroke();
        // glyph
        if (birth) {
          ctx.strokeStyle = col; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(pos.x + 4, pos.y + 2); ctx.lineTo(pos.x + 4, pos.y - 11); ctx.stroke();
          ctx.fillStyle = col; ctx.fillRect(pos.x + 4, pos.y - 11, 7, 5);
          glow(ctx, pos.x, pos.y, 16, "#6aa07a", 0.2);
        } else {
          ctx.strokeStyle = col; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, 0.2, Math.PI * 0.9); ctx.stroke();
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pos.x - 4, pos.y - 4); ctx.lineTo(pos.x + 4, pos.y + 4); ctx.stroke();
        }
        // labels (limited, decluttered)
        if (shown < 6 || map.view.zoom >= 2.2) {
          const name = this.lang === "zh" ? (x.name.zh || x.name.en) : x.name.en;
          const text = name + (birth ? " · " + x.year + " " + (this.lang === "zh" ? "新生" : "born") : " · " + x.year + " " + (this.lang === "zh" ? "消亡" : "ended"));
          ctx.font = "500 9px " + (this.lang === "zh" ? "'PingFang SC',sans-serif" : "Georgia,serif");
          const w = ctx.measureText(text).width;
          const r = [pos.x - w / 2 - 4, pos.y - 30, pos.x + w / 2 + 4, pos.y - 17];
          let hit = false;
          for (const q of placed) if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { hit = true; break; }
          if (!hit) {
            placed.push(r);
            ctx.fillStyle = "rgba(250,246,238,0.86)";
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(r[0], r[1], r[2] - r[0], r[3] - r[1], 2); ctx.fill(); }
            ctx.strokeStyle = hexA(col, 0.4); ctx.lineWidth = 0.7; ctx.stroke();
            ctx.fillStyle = "rgba(48,38,28,0.9)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(text, pos.x, (r[1] + r[3]) / 2);
            shown++;
          }
        }
      }
      // cluster summary for a crowded year such as 1960
      if (list.length > 7) {
        const c = list.reduce((a, x) => { const q = map.project(x.lon, x.lat); a.x += q.x; a.y += q.y; return a; }, { x: 0, y: 0 });
        c.x /= list.length; c.y /= list.length;
        const text = map.year + " · " + list.length + (this.lang === "zh" ? " 个国家新生/消亡" : " state changes");
        ctx.font = "500 10px " + (this.lang === "zh" ? "'PingFang SC',sans-serif" : "Georgia,serif");
        const w = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(250,246,238,0.94)";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(c.x - w / 2 - 7, c.y - 44, w + 14, 19, 3); ctx.fill(); }
        ctx.strokeStyle = "rgba(63,122,90,0.5)"; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = "#3f6f58"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(text, c.x, c.y - 34);
      }
    },
  });

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
})();
