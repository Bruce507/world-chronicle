/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Application
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const A = window.WORLD_ATLAS;
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ── normalize data ─────────────────────────────── */
  function slugify(str) {
    return String(str)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "event";
  }
  A.events = A.events.slice().sort((a, b) => a.y - b.y || (a.t[0] || "").localeCompare(b.t[0] || ""));
  const usedIds = {};
  A.events.forEach((e) => {
    const base = slugify(e.t[1]);
    let id = base, n = 2;
    while (usedIds[id]) id = base + "-" + n++;
    usedIds[id] = 1;
    e.id = id;
    if (e.k === "naval") e.k = "war";
    if (!A.categories[e.k]) e.k = "culture";
    if (!A.scenes[e.s]) e.s = "temple";
  });
  const byId = {};
  A.events.forEach((e) => { byId[e.id] = e; });

  /* culture-specific monument silhouettes */
  const TEMPLE_VARIANTS = {
    "Göbekli Tepe": "pillars",
    "Stonehenge": "stones",
    "Pyramids of Giza": "pyramid",
    "Caral": "pyramid",
    "Teotihuacan": "pyramid",
    "Classic Maya": "pyramid",
    "Tutankhamun's Tomb": "pyramid",
    "Chavín de Huántar": "stones",
    "Persepolis": "columns",
    "First Olympic Games": "columns",
    "Athenian Democracy": "columns",
    "Amarna Revolution": "columns",
    "Hagia Sophia": "dome",
    "Dome of the Rock": "dome",
    "Taj Mahal": "dome",
    "Khmer Empire": "towers",
    "Borobudur": "stupa",
    "Bagan": "stupa",
    "Moai of Rapa Nui": "moai",
  };
  A.events.forEach((e) => { if (TEMPLE_VARIANTS[e.t[1]]) e.v = TEMPLE_VARIANTS[e.t[1]]; });

  const nYear = (y) => (y === 0 ? -1 : y);

  /* ── i18n ───────────────────────────────────────── */
  const I18N = {
    brand: { zh: "寰宇时序", en: "World Chronicle" },
    search: { zh: "搜索国家 / 文明 / 事件…", en: "Search countries, civilizations, events…" },
    layers: { zh: "图层", en: "Layers" },
    about: { zh: "凡例", en: "Guide" },
    layersTitle: { zh: "图层 Layers", en: "Layers" },
    tgHistorical: { zh: "历史疆域", en: "Historical borders" },
    tgEvents: { zh: "事件节点", en: "Event nodes" },
    tgPolities: { zh: "文明光晕", en: "Civilization halos" },
    tgLinks: { zh: "全球联动", en: "Global links" },
    tgStates: { zh: "国家兴亡", en: "State changes" },
    sound: { zh: "雅乐", en: "Ambience" },
    voice: { zh: "朗读", en: "Read aloud" },
    stopVoice: { zh: "停止朗读", en: "Stop" },
    tgLabels: { zh: "现代国名", en: "Modern names" },
    tgAll: { zh: "显示全部历史", en: "Show all history" },
    layersNote: { zh: "势力范围为示意性近似，非精确国界。", en: "Halos are schematic spheres of influence, not borders." },
    mapNote: { zh: "示意图 · 现代国界仅作地理参照", en: "Schematic · modern borders for reference only" },
    hint: { zh: "拖动底部时间轴 · 点击地图节点观看动态场景", en: "Drag the timeline · click any node to enter its scene" },
    today: { zh: "今天", en: "Today" },
    tlTip: { zh: "← → 逐年 · ⇧ 十倍 · 空格播放", en: "← → year · ⇧ ×10 · Space play" },
    sameTime: { zh: "同一时刻的世界", en: "Elsewhere at the same moment" },
    prev: { zh: "上一节点", en: "Previous" },
    next: { zh: "下一节点", en: "Next" },
    aboutTitle: { zh: "一部可以走进去的世界史", en: "A world history you can walk into" },
    aboutLead: {
      zh: "一万四千年，九大时代，四百余个节点。拖动时间，世界随之明灭；点击一地，看见那个时刻正在发生什么。",
      en: "Fourteen thousand years, nine ages, more than four hundred nodes. Drag time and watch the world light up; click a place to step into its moment.",
    },
    aboutEras: { zh: "时代", en: "Ages" },
    aboutHow: { zh: "如何阅读", en: "How to read" },
    how1: { zh: "拖动或点击底部时间轴，改变年份；按空格播放整部历史。", en: "Drag or click the timeline to change the year; press Space to play history." },
    how2: { zh: "点击地图上的节点，展开该时刻的动态场景与双语史志。", en: "Click a node to open its animated scene and bilingual chronicle." },
    how3: { zh: "点击任意国家，查看现代国界内的全部历史节点与当时的主导文明。", en: "Click any country to see every node inside its modern borders and the powers that ruled it." },
    how4: { zh: "搜索国家、文明或事件；← → 逐年，Shift 加速十倍。", en: "Search countries, civilizations or events; ← → steps a year, Shift ×10." },
    aboutScenes: { zh: "场景", en: "Scenes" },
    aboutNote: { zh: "关于边界与史观", en: "On borders and history" },
    aboutNoteText: {
      zh: "现代国界来自 Natural Earth，仅作为地理参照，不代表任何领土主张。历史势力范围以柔和光晕示意，是“影响圈”而非精确边疆；同一地区在不同时代可能属于不同政权。事件年代取通行学界纪年，公元前后以 BCE / CE 标注。本图意在呈现全球文明的并置与联动，而非单一叙事。事件全文提供中文、英文、西班牙文、法文与阿拉伯文（机器辅助翻译，欢迎继续校对）。并非每个国家都有专属节点；点击任意国家或地区，仍可查看其现代国界内的全部节点与当时的主导文明。",
      en: "Modern borders come from Natural Earth and are a geographic reference only; they imply no territorial claim. Historical spheres appear as soft halos — zones of influence, not surveyed frontiers; a region may belong to different powers in different ages. Dates follow mainstream scholarship, with BCE/CE notation. The atlas is meant to show civilizations side by side and in contact, not a single narrative. Event narratives are available in Chinese, English, Spanish, French and Arabic (machine-assisted and open to correction). Not every country has a dedicated node; click any country or region to see every node within its modern borders and the powers that held it.",
    },
    aboutCredit: {
      zh: "设计取意于「江山时序」中国历史地图（DeanChensj），并扩展为全球尺度。地图数据 © Natural Earth；历史节点为策展性汇编。",
      en: "Design inspired by the Chinese historical atlas Jiangshan (DeanChensj), extended to a global scale. Map data © Natural Earth; historical nodes are a curated compilation.",
    },
    panelOpen: { zh: "此刻世界", en: "The moment" },
  };
  const t = (key) => {
    const base = I18N[key];
    const extra = window.I18N_EXTRA && window.I18N_EXTRA[state.lang];
    return (base && (base[state.lang] || (extra && extra[key]))) ||
      (extra && extra[key]) || (base && (base.en || base.zh)) || key;
  };

  /* ── state ──────────────────────────────────────── */
  const state = {
    year: 1500,
    pos: 0,
    lang: "zh",
    playing: false,
    speed: 1,
    selected: null,
    country: null,
    toggles: { events: true, polities: false, links: true, labels: true, allEvents: false, historical: true, stateChanges: true },
    panelOpen: true,
  };

  /* ── language detection ─────────────────────────── */
  (function () {
    const q = new URLSearchParams(location.search);
    const stored = localStorage.getItem("world-atlas-lang");
    const supported = ["zh", "en", "es", "fr", "ar"];
    const nav = (navigator.language || "en").toLowerCase().slice(0, 2);
    if (supported.includes(q.get("lang"))) state.lang = q.get("lang");
    else if (supported.includes(stored)) state.lang = stored;
    else state.lang = supported.includes(nav) ? nav : "en";
    const qy = parseInt(q.get("year"), 10);
    if (isFinite(qy)) state.year = clamp(qy, -12000, 2026);
  })();

  /* ── time scale ─────────────────────────────────── */
  const timeline = (function () {
    const spans = [];
    let acc = 0;
    A.eras.forEach((e) => {
      spans.push({ e, s: acc, t: acc + e.weight });
      acc += e.weight;
    });
    const total = acc;
    return {
      spans,
      toPos(y) {
        y = clamp(nYear(Math.round(y)), -12000, 2026);
        for (let i = 0; i < spans.length; i++) {
          const sp = spans[i];
          if (y < sp.e.to || i === spans.length - 1) {
            const r = clamp((y - sp.e.from) / (sp.e.to - sp.e.from), 0, 1);
            return (sp.s + r * (sp.t - sp.s)) / total;
          }
        }
        return 1;
      },
      toYear(p) {
        p = clamp(p, 0, 1) * total;
        for (let i = 0; i < spans.length; i++) {
          const sp = spans[i];
          if (p < sp.t || i === spans.length - 1) {
            const r = clamp((p - sp.s) / (sp.t - sp.s), 0, 1);
            return sp.e.from + r * (sp.e.to - sp.e.from);
          }
        }
        return 2026;
      },
    };
  })();
  state.pos = timeline.toPos(state.year);

  /* ── formatting ─────────────────────────────────── */
  function fmtYear(y, lang, compact) {
    y = nYear(Math.round(y));
    lang = lang || state.lang;
    if (y < 0) {
      const n = -y;
      if (lang === "zh") return compact ? "前" + n : "公元前 " + n + " 年";
      if (lang === "es") return n + " a. C.";
      if (lang === "fr") return n + " av. J.-C.";
      if (lang === "ar") return n + " ق.م";
      return n + " BCE";
    }
    if (lang === "zh") return compact ? String(y) : "公元 " + y + " 年";
    if (lang === "es") return y + " d. C.";
    if (lang === "fr") return y + " apr. J.-C.";
    if (lang === "ar") return y + " م";
    return y + " CE";
  }
  function fmtRange(y1, y2, lang) {
    lang = lang || state.lang;
    if (lang === "es" || lang === "fr" || lang === "ar") {
      return fmtYear(y1, lang, true) + "–" + fmtYear(y2, lang, true);
    }
    if (y1 < 0 && y2 <= 0) {
      if (lang === "zh") return "前" + (-y1) + "–前" + (-y2);
      return -y1 + "–" + -y2 + " BCE";
    }
    if (y1 < 0 && y2 > 0) {
      if (lang === "zh") return "前" + (-y1) + "–" + y2;
      return -y1 + " BCE – " + y2 + " CE";
    }
    return y1 + "–" + y2;
  }
  function latlon(lat, lon) {
    return Math.abs(lat).toFixed(1) + "°" + (lat >= 0 ? "N" : "S") + " " + Math.abs(lon).toFixed(1) + "°" + (lon >= 0 ? "E" : "W");
  }
  const dataI18n = () => (window.DATA_I18N && window.DATA_I18N[state.lang]) || null;
  const nameOf = (obj) => (obj ? (state.lang === "zh" ? obj.zh : obj.en) || obj.zh || obj.en : "");
  const eraName = (era) => {
    if (state.lang === "zh") return era.zh;
    if (state.lang === "en") return era.en;
    const d = dataI18n();
    return (d && d.eras && d.eras[era.id]) || era.en;
  };
  const eraSub = (era) => {
    if (state.lang === "zh") return era.sub.zh;
    if (state.lang === "en") return era.sub.en;
    const d = dataI18n();
    return (d && d.subs && d.subs[era.id]) || era.sub.en;
  };
  const catName = (k) => {
    const c = A.categories[k];
    if (!c) return k;
    if (state.lang === "zh") return c.zh;
    if (state.lang === "en") return c.en;
    const d = dataI18n();
    return (d && d.cats && d.cats[k]) || c.en;
  };
  const rgName = (k) => {
    const r = A.regions[k];
    if (!r) return k;
    if (state.lang === "zh") return r.zh;
    if (state.lang === "en") return r.en;
    const d = dataI18n();
    return (d && d.regions && d.regions[k]) || r.en;
  };
  const evTitle = (ev) => {
    if (state.lang === "zh") return ev.t[0];
    if (ev.tx && ev.tx[state.lang]) return ev.tx[state.lang];
    return ev.t[1];
  };
  const L = (zh, en, es, fr, ar) => (
    state.lang === "zh" ? zh : state.lang === "en" ? en : state.lang === "es" ? es : state.lang === "fr" ? fr : ar
  );
  const evDesc = (ev) => {
    if (state.lang === "zh") return ev.d[0];
    if (ev.dx && ev.dx[state.lang]) return ev.dx[state.lang];
    return ev.d[1];
  };
  const catColor = (k) => (A.categories[k] ? A.categories[k].color : "#8a6a3f");
  const regionColor = (k) => (A.regions[k] ? A.regions[k].color : "#8a6a3f");
  function countryName(f) {
    if (!f) return state.lang === "zh" ? "海域" : "Open sea";
    const p = f.properties;
    if (state.lang === "zh") return p.zh || p.n;
    if (state.lang === "en") return p.n || p.zh;
    return p[state.lang] || p.n || p.zh;
  }
  function countryKey(f) {
    const p = f.properties;
    if (p.iso3 && p.iso3 !== "-99") return p.iso3;
    if (p.iso2 && p.iso2 !== "-99") return p.iso2;
    return p.n;
  }

  /* ── DOM references ─────────────────────────────── */
  const el = {};
  let map, sceneCtl, scenePaused = false, lastPanelKey = "", panelTimer = 0, urlTimer = 0;
  let lastChromeYear = null, lastChromePos = "", lastBandEra = null, lastPlayTs = 0;
  let draggingTrack = false;

  /* ── boot ───────────────────────────────────────── */
  function boot() {
    [
      "search", "search-results", "lang-select", "layers-btn", "layers-pop", "about-btn", "reset-btn",
      "hud-year", "hud-era", "hud-sub", "panel-kicker", "panel-title", "panel-sub", "panel-body", "map-note",
      "side-panel", "panel-toggle", "panel-reopen", "panel-close", "tooltip", "era-bands", "tick-canvas", "track",
      "playhead", "playhead-label", "play-btn", "speed-btn", "now-btn", "tl-year", "tl-era",
      "event-modal", "scene-canvas", "scene-label", "scene-era", "scene-caption", "scene-toggle",
      "theatre-card", "tc-kicker", "tc-title", "tc-sub", "tc-desc", "tc-tags", "tc-expand", "tc-pause", "tc-close", "tc-voice",
      "sound-btn", "ev-voice",
      "ev-year", "ev-cat", "ev-title", "ev-title-en", "ev-desc", "ev-desc-en", "ev-meta", "ev-links",
      "ev-contemp-list", "ev-prev", "ev-next", "about-modal", "about-eras", "about-scenes",
      "event-modal", "hint", "hint-close", "panel-reopen",
    ].forEach((id) => { el[id] = document.getElementById(id); });

    // the atlas opens full-bleed; the era scroll is summoned on demand
    state.panelOpen = false;
    el["side-panel"].classList.add("collapsed");
    el["panel-reopen"].hidden = false;

    applyI18n();
    buildTimeline();

    map = new AtlasMap($("#map-canvas"), $("#fx-canvas"), {
      onEventClick: openEvent,
      onCountryClick: (f) => {
        if (f) { openCountry(f); return; }
        closeCountry();
        closeTheatre();
      },
      onHover: showTooltip,
      onHoverMove: moveTooltip,
    });
    map.setYear(state.year);
    map.setLang(state.lang);
    map.setToggles(state.toggles);
    if (window.HistoricalBorders) {
      window.HistoricalBorders.init(map);
      window.HistoricalBorders.setLang(state.lang);
      window.HistoricalBorders.setEnabled(state.toggles.historical);
    }
    if (window.MapTheatre) {
      window.MapTheatre.init(map);
      window.MapTheatre.setLang(state.lang);
    }

    bindUI();
    window.atlasAPI = { map, state, openEvent, openEventModal, openCountry, theatre: window.MapTheatre, setYear: (y) => applyYear(y, null, { force: true }) };
    renderPanel(true);
    updateChrome();
    drawTicks();
    requestAnimationFrame(frame);

    loadWorld();
    loadAuxData();
    setTimeout(() => el.hint.classList.add("hide"), 11000);
  }

  function loadAuxData() {
    const v = "?v=20261105s";
    Promise.all([
      fetch("data/country_chronicles.json" + v).then((r) => { if (!r.ok) throw new Error("chronicles " + r.status); return r.json(); }),
      fetch("data/state_changes.json" + v).then((r) => { if (!r.ok) throw new Error("states " + r.status); return r.json(); }),
    ]).then(([chr, st]) => {
      A.chronicles = chr;
      A.stateChanges = st;
      if (window.StateChanges && map) { window.StateChanges.init(map); window.StateChanges.setLang(state.lang); }
      lastPanelKey = "";
      if (map && map.features) renderPanel(true);
      drawTicks();
    }).catch((err) => console.warn("Auxiliary data unavailable:", err.message));
  }

  function loadWorld() {
    const loading = document.createElement("div");
    loading.className = "map-loading";
    loading.innerHTML = "正在展开舆图…<small>UNFOLDING THE ATLAS</small>";
    $("#map-stage").appendChild(loading);

    fetch("data/world.geo.json?v=20261105s")
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((geo) => {
        map.setWorld(geo);
        map.setPolities(A.polities);
        if (window.StateChanges) { window.StateChanges.init(map); window.StateChanges.setLang(state.lang); }
        map.setYear(state.year);
        map.setLang(state.lang);
        map.setToggles(state.toggles);
        map.fit(true);
        buildCountryIndex();
        loading.remove();
        renderPanel(true);
        drawTicks();
        applyDeepLink();
      })
      .catch((err) => {
        loading.innerHTML = "无法载入地图数据<small>Could not load map data — serve this folder over HTTP (e.g. python3 -m http.server)</small>";
        console.error(err);
      });
  }

  function buildCountryIndex() {
    if (!map.features) return;
    const byIso = {};
    map.features.forEach((f) => {
      const p = f.properties;
      if (p.iso2 && p.iso2 !== "-99") byIso[p.iso2] = f;
      if (p.iso3 && p.iso3 !== "-99") byIso[p.iso3] = f;
    });
    A.events.forEach((ev) => {
      let f = ev.c ? (byIso[ev.c] || null) : null;
      if (!f) f = map.locateCountry(ev.lon, ev.lat);
      ev._country = f;
    });
  }

  function applyDeepLink() {
    const q = new URLSearchParams(location.search);
    const eid = q.get("event");
    if (eid && byId[eid]) {
      setTimeout(() => openEvent(byId[eid]), 350);
      return;
    }
    const cid = q.get("country");
    if (cid) {
      const f = map.features.find((x) => x.properties.iso3 === cid || x.properties.iso2 === cid);
      if (f) setTimeout(() => openCountry(f), 350);
    }
  }

  /* ── language ───────────────────────────────────── */
  function applyI18n() {
    const locale = { zh: "zh-CN", en: "en", es: "es", fr: "fr", ar: "ar" }[state.lang] || "en";
    document.documentElement.lang = locale;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (I18N[key]) node.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((node) => {
      const key = node.getAttribute("data-i18n-ph");
      if (I18N[key]) node.placeholder = t(key);
    });
    if (el["lang-select"]) el["lang-select"].value = state.lang;
    updateSoundBtn();
    if (window.AtlasAudio) window.AtlasAudio.setLang(state.lang);
    const titles = {
      zh: "寰宇时序 · 全球文明地图 | Chronicles of the World",
      en: "Chronicles of the World · A Global Atlas of Civilizations",
      es: "Crónica del Mundo · Atlas global de civilizaciones",
      fr: "Chronique du Monde · Atlas mondial des civilisations",
      ar: "سجل العالم · أطلس الحضارات العالمي",
    };
    document.title = titles[state.lang] || titles.en;
  }

  function setLang(lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    localStorage.setItem("world-atlas-lang", lang);
    applyI18n();
    buildTimeline();
    if (map) map.setLang(lang);
    if (window.HistoricalBorders) window.HistoricalBorders.setLang(lang);
    if (window.MapTheatre) window.MapTheatre.setLang(lang);
    if (window.StateChanges) window.StateChanges.setLang(lang);
    if (window.AtlasAudio) window.AtlasAudio.setLang(lang);
    if (state.selected) fillTheatreCard(state.selected);
    lastPanelKey = "";
    renderPanel(true);
    if (!el["event-modal"].hidden && state.selected) fillEvent(state.selected);
    updateChrome();
    drawTicks();
  }

  /* ── panel ──────────────────────────────────────── */
  function panelKey() {
    if (state.country) return "c:" + countryKey(state.country) + ":" + A.eraOf(state.year).id + ":" + Math.round(state.year / 10);
    return "e:" + A.eraOf(state.year).id + ":" + Math.floor(state.year / 2);
  }

  function renderPanel(force) {
    if (!el["panel-body"]) return;
    if (!map || !map.features) {
      el["panel-kicker"].textContent = t("brand");
      el["panel-title"].textContent = state.lang === "zh" ? "正在展开舆图" : "Unfolding the atlas";
      el["panel-sub"].textContent = "";
      el["panel-body"].innerHTML = `<div class="panel-empty">${state.lang === "zh" ? "地图数据载入后，此处会呈现此刻并立的文明与时代节点。" : "Civilizations and nodes of this moment will appear once the map has loaded."}</div>`;
      return;
    }
    if (state.country) { renderCountryPanel(force); return; }

    const era = A.eraOf(state.year);
    el["panel-kicker"].textContent = (state.lang === "zh" ? "此刻世界 · " : "THE WORLD AT ") + fmtYear(state.year, state.lang, true);
    el["panel-title"].textContent = eraName(era);
    el["panel-sub"].textContent = eraSub(era);

    const key = panelKey();
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;

    const scroll = el["panel-body"].scrollTop;
    const active = map.activePolities().sort((a, b) => {
      const ra = a.p.rg, rb = b.p.rg;
      return ra === rb ? b.p.r - a.p.r : ra.localeCompare(rb);
    });
    const eraEvents = A.events.filter((e) => e.y >= era.from && (e.y < era.to || era === A.eras[A.eras.length - 1]));
    const seen = new Set();
    const polities = active.filter((a) => {
      if (a.a < 0.18 || seen.has(a.p.id)) return false;
      seen.add(a.p.id);
      return true;
    }).slice(0, 18);

    let html = "";
    html += `<section class="p-section"><h3>${L("并立文明", "CONTEMPORARIES", "CONTEMPORÁNEOS", "CONTEMPORAINS", "معاصرون")}</h3><div class="polity-list">`;
    if (polities.length) {
      polities.forEach(({ p }) => {
        html += `<button class="polity-chip" data-polity="${p.id}"><i style="background:${regionColor(p.rg)}"></i>${nameOf(p.n)}<small>${fmtRange(p.y1, p.y2)}</small></button>`;
      });
    } else {
      html += `<span class="panel-empty">${L("此时期尚无成形的政权光晕。", "No settled polity halos in this period.", "Sin halos de poder definidos en este periodo.", "Aucun halo de pouvoir établi pour cette période.", "لا هالات سلطة مستقرة في هذه الفترة.")}</span>`;
    }
    html += `</div></section>`;

    const changes = stateChangesNear(state.year);
    if (changes.length) {
      html += `<section class="p-section"><h3>${L("国家兴亡", "STATES RISING AND FALLING", "AUGE Y CAÍDA DE ESTADOS", "NAISSANCES ET CHUTES D’ÉTATS", "قيام الدول وزوالها")} · ${changes.length}</h3><div class="change-list">`;
      changes.forEach(({ x, type, i }) => { html += changeRow(x, type, i); });
      html += `</div></section>`;
    }

    html += `<section class="p-section"><h3>${L("时代节点", "NODES OF THE AGE", "NODOS DE LA ERA", "NŒUDS DE L’ÂGE", "عُقد العصر")} · ${eraEvents.length}</h3><div class="event-list">`;
    if (!eraEvents.length) {
      html += `<div class="panel-empty">${L("此时代暂无策展节点。", "No curated nodes in this age yet.", "Aún no hay nodos en esta era.", "Pas encore de nœuds pour cet âge.", "لا عُقد بعد في هذا العصر.")}</div>`;
    } else {
      html += eventList(eraEvents);
    }
    html += `</div></section>`;
    html += `<div class="panel-note">${L("点击节点展开动态场景；拖动时间轴，世界随之明灭。", "Click a node for its scene; drag the timeline and watch the world change.", "Haz clic en un nodo para ver su escena; arrastra el tiempo y observa el mundo.", "Cliquez un nœud pour sa scène ; faites glisser le temps et regardez le monde changer.", "انقر عقدة لترى مشهدها؛ اسحب الزمن وشاهد العالم يتغير.")}</div>`;

    el["panel-body"].innerHTML = html;
    if (force && !state.playing) {
      const nd = el["panel-body"].querySelector(".now-divider");
      const body = el["panel-body"];
      const target = body.querySelector(".change-list") ? body.querySelector(".change-list").closest(".p-section") : nd;
      if (target) body.scrollTop = Math.max(0, target.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 50);
      else body.scrollTop = scroll;
    } else {
      el["panel-body"].scrollTop = scroll;
    }
  }

  function stateChangesNear(year) {
    const d = A.stateChanges;
    if (!d) return [];
    const out = [];
    (d.births || []).forEach((x, i) => { if (Math.abs(x.year - year) <= 1) out.push({ x, type: "birth", i }); });
    (d.dissolutions || []).forEach((x, i) => { if (Math.abs(x.year - year) <= 1) out.push({ x, type: "dissolution", i }); });
    return out.sort((a, b) => a.x.year - b.x.year);
  }

  function changeRow(x, type, i) {
    const birth = type === "birth";
    const name = state.lang === "zh" ? (x.name.zh || x.name.en) : x.name.en;
    const note = state.lang === "zh" ? (x.note && x.note.zh) : (x.note && x.note.en);
    return `<button class="change-row" data-chg="${type}:${i}">
      <span class="chg-year">${fmtYear(x.year, state.lang, true)}</span>
      <span class="chg-main"><span class="chg-name"><i class="${birth ? "birth" : "death"}"></i>${name}<em>${birth ? L("新生", "born", "nace", "naissance", "قيام") : L("消亡", "ended", "cae", "chute", "زوال")}</em></span>${note ? `<span class="chg-note">${note}</span>` : ""}</span>
    </button>`;
  }

  function chronicleHtml(f) {
    if (!A.chronicles) return null;
    const ch = A.chronicles[countryKey(f)];
    if (!ch) return null;
    const summary = state.lang === "zh" ? ch.summary.zh : ch.summary.en;
    let html = `<div class="chr-summary">${summary}</div><div class="chronicle">`;
    ch.segments.forEach((seg) => {
      const now = state.year >= seg.from && state.year < seg.to;
      const list = (seg.events || []).map((id) => byId[id]).filter(Boolean);
      const nm = state.lang === "zh" ? (seg.zh || seg.name) : seg.name;
      const era = seg.era ? (state.lang === "zh" ? seg.era.zh : seg.era.en) : "";
      const birth = seg.birth;
      html += `<section class="chr-seg${now ? " is-now" : ""}${seg.modern ? " is-modern" : ""}${list.length ? "" : " is-quiet"}">
        <span class="chr-dot"></span>
        <button class="chr-head" data-chr-year="${seg.from}">
          <span class="chr-range">${fmtRange(seg.from, seg.to)}</span>
          <span class="chr-era">${era}</span>
        </button>
        <div class="chr-name">${nm}${birth ? `<em class="chr-birth">${state.lang === "zh" ? "新生 " : "born "}${birth.year}</em>` : ""}</div>
        ${list.length ? `<div class="chr-events">${list.map(eventRow).join("")}</div>` : ""}
      </section>`;
    });
    html += "</div>";
    return html;
  }

  function nowDivider() {
    return '<div class="now-divider"><span>' + (state.lang === "zh" ? "此刻 · " : "NOW · ") + fmtYear(state.year, state.lang, true) + "</span></div>";
  }

  function eventList(evs) {
    let html = "";
    let placed = false;
    evs.forEach((ev) => {
      if (!placed && ev.y >= state.year - 0.5) { html += nowDivider(); placed = true; }
      html += eventRow(ev);
    });
    return html;
  }

  function eventRow(ev) {
    const future = ev.y > state.year + 0.5;
    const cat = A.categories[ev.k] || { color: "#8a6a3f" };
    const title = evTitle(ev);
    return `<button class="event-row${future ? " is-future" : ""}" data-ev="${ev.id}">
      <span class="er-year">${fmtYear(ev.y, state.lang, true)}</span>
      <span class="er-main"><span class="er-title">${title}</span>
      <span class="er-meta"><i style="background:${cat.color}"></i>${catName(ev.k)} · ${rgName(ev.rg)}${future ? (state.lang === "zh" ? " · 未至" : " · ahead") : ""}</span></span>
    </button>`;
  }

  function renderCountryPanel(force) {
    const f = state.country;
    if (!f) return;
    const p = f.properties;
    el["panel-kicker"].textContent = L("现代国界 · ", "MODERN BORDERS · ", "FRONTERAS MODERNAS · ", "FRONTIÈRES MODERNES · ", "الحدود الحديثة · ") + rgName(byRegion(p.sub));
    el["panel-title"].textContent = countryName(f);
    el["panel-sub"].textContent = L("此处历史上的政权与节点，皆以现代国界为参照。", "Historical powers and nodes, read through the lens of modern borders.", "Poderes y nodos históricos leídos a través de las fronteras modernas.", "Pouvoirs et nœuds historiques lus à travers les frontières modernes.", "القوى والعُقد التاريخية من خلال الحدود الحديثة.");

    const key = panelKey();
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;

    const evs = A.events.filter((e) => e._country === f);
    const here = politiesAt(p.ly, p.lx);
    const scroll = el["panel-body"].scrollTop;

    let html = `<button class="panel-back" data-back="1">‹ ${L("返回时代", "Back to the age", "Volver a la era", "Retour à l’âge", "العودة إلى العصر")}</button>`;
    html += `<div class="country-flags"><span class="country-tag">${countryKey(f)}</span><span class="country-tag">${p.cont || ""}</span><span class="country-tag">${evs.length} ${state.lang === "zh" ? "节点" : "nodes"}</span></div>`;

    html += `<section class="p-section"><h3>${L("此处此时", "HERE, NOW", "AQUÍ, AHORA", "ICI, MAINTENANT", "هنا الآن")} · ${fmtYear(state.year, state.lang, true)}</h3><div class="polity-list">`;
    if (here.length) {
      here.forEach(({ p: pol, d }) => {
        html += `<button class="polity-chip" data-polity="${pol.id}"><i style="background:${regionColor(pol.rg)}"></i>${nameOf(pol.n)}<small>${fmtRange(pol.y1, pol.y2)}</small></button>`;
      });
    } else {
      html += `<span class="panel-empty">${L("这一时期，此地不在已标注的主要势力光晕内。", "In this period the area lies outside the principal halos charted here.", "En este periodo el área queda fuera de los principales halos cartografiados.", "Durant cette période, la région est hors des principaux halos cartographiés.", "في هذه الفترة تقع المنطقة خارج الهالات الرئيسية المرسومة.")}</span>`;
    }
    html += `</div></section>`;

    const chr = chronicleHtml(f);
    html += `<section class="p-section"><h3>${L("国家沿革长卷", "A COUNTRY CHRONICLE", "CRÓNICA DEL PAÍS", "CHRONIQUE DU PAYS", "سجل الدولة")} · ${evs.length}</h3>`;
    if (chr) {
      html += chr;
    } else if (!evs.length) {
      html += `<div class="panel-empty">${L("现代国界内暂无策展节点。可拖动时间轴，查看此地所属的文明与政权。", "No curated nodes fall inside these modern borders. Drag the timeline to see the powers that held this ground.", "No hay nodos en estas fronteras modernas. Arrastra el tiempo para ver los poderes que ocuparon esta tierra.", "Aucun nœud dans ces frontières modernes. Faites glisser le temps pour voir les pouvoirs qui ont tenu cette terre.", "لا عُقد داخل هذه الحدود الحديثة. اسحب الزمن لترى القوى التي حكمت هذه الأرض.")}</div>`;
    } else {
      html += `<div class="event-list">${eventList(evs)}</div>`;
    }
    html += `</section>`;
    html += `<div class="panel-note">${L("同一片土地在不同时代可能属于不同政权；现代国界只用于定位。国家形成年份为策展性近似。", "The same ground belonged to different powers in different ages; modern borders locate, but do not define, historical territory. State formation years are curated approximations.", "La misma tierra perteneció a poderes distintos; las fronteras modernas ubican, no definen el territorio histórico. Las fechas de formación son aproximaciones.", "La même terre a appartenu à des pouvoirs différents ; les frontières modernes situent sans définir le territoire historique. Les dates de formation sont approximatives.", "الأرض نفسها حكمتها قوى مختلفة؛ الحدود الحديثة للاستدلال لا للتحديد. سنوات قيام الدول تقديرات تخطيطية.")}</div>`;

    el["panel-body"].innerHTML = html;
    if (force && !state.playing) {
      const nd = el["panel-body"].querySelector(".now-divider");
      const body = el["panel-body"];
      const target = body.querySelector(".change-list") ? body.querySelector(".change-list").closest(".p-section") : nd;
      if (target) body.scrollTop = Math.max(0, target.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 50);
      else body.scrollTop = scroll;
    } else {
      el["panel-body"].scrollTop = scroll;
    }
  }

  const SUB2RG = {
    "Eastern Asia": "ea", "Southern Asia": "sa", "South-Eastern Asia": "sea", "Western Asia": "me", "Central Asia": "ca",
    "Northern Africa": "af", "Western Africa": "af", "Middle Africa": "af", "Eastern Africa": "af", "Southern Africa": "af",
    "Northern Europe": "eu", "Western Europe": "eu", "Southern Europe": "eu", "Eastern Europe": "eu",
    "Northern America": "na", "Central America": "la", "South America": "la", "Caribbean": "la",
    "Australia and New Zealand": "oc", "Melanesia": "oc", "Micronesia": "oc", "Polynesia": "oc",
  };
  function byRegion(sub) { return SUB2RG[sub] || ""; }

  function politiesAt(lat, lon, year) {
    const y = year == null ? state.year : year;
    const list = [];
    A.polities.forEach((p) => {
      if (y < p.y1 || y > p.y2) return;
      const cos = Math.max(0.25, Math.cos(lat * Math.PI / 180));
      const dx = ((((lon - p.lon + 540) % 360) - 180) * cos) / (p.r * p.sx);
      const dy = (lat - p.lat) / p.r;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 1.12) list.push({ p, d });
    });
    return list.sort((a, b) => a.d - b.d).slice(0, 4);
  }

  /* ── chrome / timeline UI ───────────────────────── */
  function buildTimeline() {
    const bands = el["era-bands"];
    if (!bands) return;
    bands.innerHTML = "";
    A.eras.forEach((era) => {
      const d = document.createElement("div");
      d.className = "era-band";
      d.style.flexGrow = era.weight;
      d.style.flexBasis = "0";
      d.setAttribute("data-era", era.id);
      d.title = eraName(era) + " · " + fmtRange(era.from, era.to);
      d.innerHTML = "<b>" + eraName(era) + "</b><small>" + fmtRange(era.from, era.to, state.lang === "zh" ? "zh" : "en") + "</small>";
      bands.appendChild(d);
    });
    lastBandEra = null;
    drawTicks();
  }

  function drawTicks() {
    const cv = el["tick-canvas"], track = el["track"];
    if (!cv || !track) return;
    const r = track.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + "px";
    cv.style.height = r.height + "px";
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const base = r.height - 4;
    const narrow = r.width < 620;
    if (A.stateChanges) {
      const all = (A.stateChanges.births || []).map((x) => ({ x, c: "#3f7a5a" }))
        .concat((A.stateChanges.dissolutions || []).map((x) => ({ x, c: "#7a6a66" })));
      for (const it of all) {
        const px = timeline.toPos(it.x.year) * r.width;
        ctx.strokeStyle = hexA(it.c, 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, base - 13); ctx.lineTo(px, base - 9); ctx.stroke();
      }
    }
    for (const ev of A.events) {
      if (narrow && !ev.f) continue;
      const x = timeline.toPos(ev.y) * r.width;
      const h = ev.f ? 9 : 5;
      ctx.strokeStyle = hexA(catColor(ev.k), ev.f ? 0.55 : 0.28);
      ctx.lineWidth = ev.f ? 1.3 : 1;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x, base - h);
      ctx.stroke();
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function updateChrome() {
    const y = state.year;
    if (y !== lastChromeYear) {
      const era = A.eraOf(y);
      const abs = Math.abs(nYear(y));
      const yn = el["hud-year"];
      yn.querySelector(".num").textContent = String(abs);
      const unit = y < 0
        ? ({ zh: "BCE", en: "BCE", es: "a. C.", fr: "av. J.-C.", ar: "ق.م" }[state.lang] || "BCE")
        : ({ zh: "CE", en: "CE", es: "d. C.", fr: "apr. J.-C.", ar: "م" }[state.lang] || "CE");
      yn.querySelector(".unit").textContent = unit;
      el["hud-era"].textContent = eraName(era);
      el["hud-sub"].textContent = eraSub(era);
      el["tl-year"].textContent = fmtYear(y, state.lang);
      el["tl-era"].textContent = eraName(era);
      el["playhead-label"].textContent = fmtYear(y, state.lang, true);

      if (lastBandEra !== era.id) {
        lastBandEra = era.id;
        if (window.AtlasAudio) window.AtlasAudio.setEra(era.id);
        el["era-bands"].querySelectorAll(".era-band").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-era") === era.id);
        });
        if (map && map.features && !state.country) renderPanel(true);
      }
      if (el["panel-kicker"] && map && map.features && !state.country) {
        el["panel-kicker"].textContent = (state.lang === "zh" ? "此刻世界 · " : "THE WORLD AT ") + fmtYear(y, state.lang, true);
      }
      updateMapNote();
      lastChromeYear = y;
    }
    const left = (state.pos * 100).toFixed(3) + "%";
    if (left !== lastChromePos) {
      el["playhead"].style.left = left;
      lastChromePos = left;
    }
  }

  function applyYear(y, pos, opts) {
    opts = opts || {};
    y = clamp(Math.round(y), -12000, 2026);
    if (y === 0) y = -1;
    const changed = y !== state.year;
    state.year = y;
    state.pos = pos == null ? timeline.toPos(y) : clamp(pos, 0, 1);
    if (map) map.setYear(y);
    updateChrome();
    if (changed) {
      if (state.country) renderPanel(true);
      else if (!state.playing) schedulePanel();
      syncURL();
    }
  }

  function updateSoundBtn() {
    const btn = el["sound-btn"];
    if (!btn) return;
    const on = window.AtlasAudio && window.AtlasAudio.isOn();
    btn.textContent = t("sound") + (on ? (state.lang === "zh" ? " 开" : " ✓") : "");
    btn.classList.toggle("is-on", !!on);
  }

  function speakSelected() {
    const ev = state.selected;
    if (!ev || !window.AtlasAudio) return;
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.AtlasAudio.stopSpeak();
      return;
    }
    let lang = state.lang;
    if (lang !== "zh" && lang !== "en" && !(ev.tx && ev.tx[lang] && ev.dx && ev.dx[lang])) lang = "en";
    const text = lang === "zh" ? (ev.t[0] + "。" + ev.d[0])
      : lang === "en" ? (ev.t[1] + ". " + ev.d[1])
      : ((ev.tx && ev.tx[lang]) || ev.t[1]) + ". " + ((ev.dx && ev.dx[lang]) || ev.d[1]);
    window.AtlasAudio.speak(text, lang);
  }

  function updateMapNote() {
    if (!el["map-note"]) return;
    const hb = window.HistoricalBorders;
    const labels = {
      zh: ["历史疆域 · ", " · 示意性边界"],
      en: ["Historical borders · ", " · schematic"],
      es: ["Fronteras históricas · ", " · esquemático"],
      fr: ["Frontières historiques · ", " · schématique"],
      ar: ["الحدود التاريخية · ", " · تخطيطي"],
    }[state.lang] || ["Historical borders · ", " · schematic"];
    if (hb && hb.enabled && hb.current) {
      let year = hb.label();
      year = year.replace(" 年疆域", "").replace(" borders", "").replace(" BCE", " BCE").replace(" CE", " CE");
      el["map-note"].textContent = labels[0] + year + labels[1];
    } else {
      el["map-note"].textContent = t("mapNote");
    }
  }

  function schedulePanel() {
    clearTimeout(panelTimer);
    panelTimer = setTimeout(() => renderPanel(false), 200);
  }

  /* playback */
  function startPlay() {
    if (state.playing) return;
    if (state.pos >= 0.999) { state.pos = 0; applyYear(-12000, 0); }
    state.playing = true;
    lastPlayTs = performance.now();
    document.body.classList.add("is-playing");
    el["play-btn"].setAttribute("aria-label", "暂停");
  }
  function stopPlay() {
    if (!state.playing) return;
    state.playing = false;
    document.body.classList.remove("is-playing");
    el["play-btn"].setAttribute("aria-label", "播放");
    syncURL();
    schedulePanel();
  }
  function togglePlay() { state.playing ? stopPlay() : startPlay(); }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(70, now - (lastPlayTs || now));
    lastPlayTs = now;
    if (!state.playing) return;
    state.pos = clamp(state.pos + (dt / 72000) * state.speed, 0, 1);
    const y = Math.round(timeline.toYear(state.pos));
    applyYear(y, state.pos, { sync: false });
    if (state.pos >= 1) stopPlay();
  }

  /* ── track interaction ──────────────────────────── */
  function posFromEvent(e) {
    const r = el["track"].getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  }
  function bindTrack() {
    el["track"].addEventListener("pointerdown", (e) => {
      draggingTrack = true;
      stopPlay();
      el["track"].classList.add("dragging");
      el["track"].setPointerCapture && el["track"].setPointerCapture(e.pointerId);
      const p = posFromEvent(e);
      applyYear(Math.round(timeline.toYear(p)), p);
    });
    el["track"].addEventListener("pointermove", (e) => {
      if (!draggingTrack) return;
      const p = posFromEvent(e);
      applyYear(Math.round(timeline.toYear(p)), p);
    });
    const end = (e) => {
      if (!draggingTrack) return;
      draggingTrack = false;
      el["track"].classList.remove("dragging");
      const p = posFromEvent(e);
      applyYear(Math.round(timeline.toYear(p)), p);
      renderPanel(true);
      syncURL();
    };
    el["track"].addEventListener("pointerup", end);
    el["track"].addEventListener("pointercancel", end);
  }

  /* ── tooltip ────────────────────────────────────── */
  let tooltipEv = null;
  function showTooltip(ev, x, y) {
    tooltipEv = ev;
    if (!ev) { el.tooltip.hidden = true; return; }
    const cat = A.categories[ev.k] || { color: "#8a6a3f" };
    el.tooltip.innerHTML =
      '<div class="tt-year">' + fmtYear(ev.y, state.lang, true) + " · " + rgName(ev.rg) + "</div>" +
      '<div class="tt-title">' + evTitle(ev) + "</div>" +
      '<div class="tt-hint">' + (state.lang === "zh" ? "点击展开场景" : "Click to enter the scene") + "</div>";
    placeTooltip(x, y);
    el.tooltip.hidden = false;
  }
  function placeTooltip(x, y) {
    const W = map ? map.W : window.innerWidth;
    const nx = clamp(x, 145, W - 145);
    el.tooltip.style.left = nx + "px";
    el.tooltip.style.top = y + "px";
    el.tooltip.classList.toggle("below", y < 86);
  }
  function moveTooltip(x, y) {
    if (el.tooltip.hidden) return;
    placeTooltip(x, y);
  }

  /* ── event theatre ──────────────────────────────── */
  function openEvent(ev) {
    if (!ev) return;
    stopPlay();
    if (!el["event-modal"].hidden) closeEvent();
    if (state.country) { state.country = null; map.setHighlight(null); lastPanelKey = ""; renderPanel(true); }
    state.selected = ev;
    map.setSelected(ev);
    map.setPaused(false);
    if (ev.y !== state.year) applyYear(ev.y, null, { force: true });
    else { state.pos = timeline.toPos(ev.y); updateChrome(); }
    if (window.MapTheatre) {
      window.MapTheatre.setLang(state.lang);
      window.MapTheatre.playEvent(ev);
    } else {
      map.flyTo(ev.lat, ev.lon, 2.8, 800);
    }
    fillTheatreCard(ev);
    el["theatre-card"].hidden = false;
    document.getElementById("map-stage").classList.add("theatre-open");
    el.hint.classList.add("hide");
    el["tc-pause"].textContent = state.lang === "zh" ? "暂停" : "Pause";
    syncURL();
  }

  function closeTheatre() {
    if (window.AtlasAudio) window.AtlasAudio.stopSpeak();
    if (window.MapTheatre) window.MapTheatre.clear();
    el["theatre-card"].hidden = true;
    document.getElementById("map-stage").classList.remove("theatre-open");
    state.selected = null;
    if (map) {
      map.setSelected(null);
      map.setPaused(false);
    }
    syncURL();
  }

  function fillTheatreCard(ev) {
    if (!ev || !el["tc-title"]) return;
    const th = window.MapTheatre;
    const mode = th && th.mode;
    const modeName = {
      war: L("战局推演", "WAR THEATRE", "TEATRO DE GUERRA", "THÉÂTRE DE GUERRE", "مسرح الحرب"),
      trade: L("商路动态", "TRADE ROUTES", "RUTAS COMERCIALES", "ROUTES COMMERCIALES", "طرق التجارة"),
      atomic: L("核爆现场", "ATOMIC STRIKE", "ATAQUE ATÓMICO", "FRAPPE ATOMIQUE", "الضربة النووية"),
      disaster: L("灾变扩散", "CRISIS", "CRISIS", "CRISE", "الأزمة"),
      civic: L("现场动态", "CIVIC SCENE", "ESCENA CÍVICA", "SCÈNE CIVIQUE", "مشهد مدني"),
      march: L("行军路线", "MARCH", "MARCHA", "MARCHE", "مسيرة"),
      pilgrim: L("求法之路", "PILGRIMAGE", "PEREGRINACIÓN", "PÈLERINAGE", "رحلة الحج"),
    }[mode] || L("地图剧场", "MAP THEATRE", "TEATRO DEL MAPA", "THÉÂTRE DE LA CARTE", "مسرح الخريطة");
    el["tc-kicker"].textContent = fmtYear(ev.y, state.lang) + " · " + catName(ev.k) + " · " + modeName;
    el["tc-title"].textContent = evTitle(ev);
    el["tc-sub"].textContent = state.lang === "zh" ? ev.t[1] : (state.lang === "en" ? ev.t[0] : ev.t[1]);
    el["tc-desc"].textContent = evDesc(ev);
    let tags = "";
    if (th && th.sides && th.sides.length) {
      th.sides.forEach((sd) => {
        const sdName = Array.isArray(sd.name) ? (state.lang === "zh" ? sd.name[0] : sd.name[1]) : (state.lang === "zh" ? sd.name.zh : sd.name.en);
        tags += '<span class="tc-tag"><i style="background:' + sd.color + '"></i>' + sdName + "</span>";
      });
    }
    if (ev.link && ev.link.length) {
      tags += '<span class="tc-tag">' + L("联动 " + ev.link.length + " 地", ev.link.length + " linked places", ev.link.length + " lugares vinculados", ev.link.length + " lieux liés", ev.link.length + " أماكن مرتبطة") + "</span>";
    }
    tags += '<span class="tc-tag">' + L("动态绘制于地图", "drawn on the map", "dibujado en el mapa", "dessiné sur la carte", "مرسوم على الخريطة") + "</span>";
    el["tc-tags"].innerHTML = tags;
  }

  function openEventModal(ev) {
    if (!ev) return;
    stopPlay();
    if (state.country) { state.country = null; map.setHighlight(null); lastPanelKey = ""; renderPanel(true); }
    state.selected = ev;
    map.setSelected(ev);
    map.setPaused(true);
    if (ev.y !== state.year) applyYear(ev.y, null, { force: true });
    else { state.pos = timeline.toPos(ev.y); updateChrome(); }
    map.flyTo(ev.lat, ev.lon, 2.6, 750);
    fillEvent(ev);
    el["event-modal"].hidden = false;
    if (sceneCtl) sceneCtl.stop();
    const cat = A.categories[ev.k] || { color: "#b04a32" };
    sceneCtl = window.Scenes.mount(el["scene-canvas"], ev.s, { color: cat.color, region: ev.rg, year: ev.y, variant: ev.v });
    scenePaused = false;
    el["scene-toggle"].textContent = "❚❚";
    setTimeout(() => {
      const c = el["event-modal"].querySelector(".ev-close");
      if (c) c.focus();
    }, 60);
    syncURL();
  }

  function placeOf(ev) {
    const f = ev._country;
    const prefix = { zh: "今", en: "now", es: "hoy", fr: "aujourd’hui", ar: "اليوم" }[state.lang] || "now";
    if (!f) return state.lang === "zh" ? "海域" : (state.lang === "es" ? "Mar abierto" : state.lang === "fr" ? "Haute mer" : state.lang === "ar" ? "أعالي البحر" : "Open sea");
    return prefix + " " + countryName(f);
  }

  function fillEvent(ev) {
    if (!ev) return;
    const cat = A.categories[ev.k] || { zh: ev.k, en: ev.k };
    el["ev-year"].textContent = fmtYear(ev.y, state.lang);
    el["ev-cat"].textContent = catName(ev.k) + " · " + rgName(ev.rg);
    el["ev-title"].textContent = evTitle(ev);
    el["ev-title-en"].textContent = state.lang === "zh" ? ev.t[1] : (state.lang === "en" ? ev.t[0] : ev.t[1]);
    el["ev-desc"].textContent = evDesc(ev);
    el["ev-desc-en"].textContent = state.lang === "zh" ? ev.d[1] : (state.lang === "en" ? ev.d[0] : ev.d[1]);
    const en = ({
      zh: ["时代", "地域", "今地", "场景"],
      en: ["AGE", "REGION", "TODAY", "SCENE"],
      es: ["ÉPOCA", "REGIÓN", "HOY", "ESCENA"],
      fr: ["ÂGE", "RÉGION", "AUJOURD’HUI", "SCÈNE"],
      ar: ["العصر", "المنطقة", "اليوم", "المشهد"],
    })[state.lang] || ["AGE", "REGION", "TODAY", "SCENE"];
    const sc = A.scenes[ev.s];
    el["ev-meta"].innerHTML =
      "<div><span>" + en[0] + "</span><b>" + eraName(A.eraOf(ev.y)) + "</b></div>" +
      "<div><span>" + en[1] + "</span><b>" + rgName(ev.rg) + "</b></div>" +
      "<div><span>" + en[2] + "</span><b>" + (ev._country ? countryName(ev._country) : (state.lang === "zh" ? "海域" : "Open sea")) + "</b></div>" +
      "<div><span>" + en[3] + "</span><b>" + (sc ? (state.lang === "zh" ? sc.zh : sc.en) : ev.s) + "</b></div>";
    el["scene-label"].textContent = (A.scenes[ev.s] ? A.scenes[ev.s].en : ev.s).toUpperCase();
    el["scene-era"].textContent = eraName(A.eraOf(ev.y));
    el["scene-caption"].innerHTML = "<b>" + fmtYear(ev.y, state.lang) + "</b> · " + placeOf(ev) + " · " + latlon(ev.lat, ev.lon);

    // linked places
    let links = "";
    if (ev.link && ev.link.length) {
      const seen = new Set();
      const names = [];
      ev.link.forEach(([la, lo]) => {
        const f = map.locateCountry(lo, la);
        if (f) {
          const n = countryName(f);
          if (!seen.has(n)) { seen.add(n); names.push(n); }
        }
      });
      if (names.length) {
        links = '<span class="ev-link-chip"><i></i>' + L("联动 " + names.length + " 地", names.length + " linked places", names.length + " lugares vinculados", names.length + " lieux liés", names.length + " أماكن مرتبطة") + "</span>";
        names.slice(0, 6).forEach((n) => {
          links += '<span class="ev-link-chip">' + n + "</span>";
        });
      }
    }
    el["ev-links"].innerHTML = links;

    // contemporaneous events
    const era = A.eraOf(ev.y);
    const win = Math.max(1, (era.to - era.from) / 14);
    let cands = A.events.filter((e) => e !== ev && Math.abs(e.y - ev.y) <= win)
      .sort((a, b) => Math.abs(a.y - ev.y) - Math.abs(b.y - ev.y));
    const seenRg = new Set();
    const picks = [];
    for (const c of cands) {
      if (seenRg.has(c.rg)) continue;
      seenRg.add(c.rg);
      picks.push(c);
      if (picks.length >= 4) break;
    }
    if (picks.length < 4) {
      for (const c of cands) { if (!picks.includes(c)) { picks.push(c); if (picks.length >= 4) break; } }
    }
    let ch = "";
    picks.forEach((c) => {
      ch += '<button class="contemp-row" data-contemp="' + c.id + '"><time>' + fmtYear(c.y, state.lang, true) + "</time><span>" + evTitle(c) + "</span><em>" + rgName(c.rg) + "</em></button>";
    });
    el["ev-contemp-list"].innerHTML = ch || '<div class="panel-empty">' + (state.lang === "zh" ? "同一时刻暂无其他节点。" : "No other nodes at this moment.") + "</div>";
  }

  function closeEvent() {
    if (window.AtlasAudio) window.AtlasAudio.stopSpeak();
    if (sceneCtl) { sceneCtl.stop(); sceneCtl = null; }
    el["event-modal"].hidden = true;
    if (map) map.setPaused(false);
    syncURL();
  }

  function stepEvent(dir) {
    if (!state.selected) return;
    const i = A.events.indexOf(state.selected);
    if (i < 0) return;
    const next = (i + dir + A.events.length) % A.events.length;
    openEvent(A.events[next]);
    openEventModal(A.events[next]);
  }

  /* ── country lens ───────────────────────────────── */
  function openCountry(f) {
    if (!f) return;
    if (!el["event-modal"].hidden) closeEvent();
    if (window.MapTheatre) window.MapTheatre.clear();
    el["theatre-card"].hidden = true;
    document.getElementById("map-stage").classList.remove("theatre-open");
    el["panel-body"].scrollTop = 0;
    state.country = f;
    state.selected = null;
    map.setSelected(null);
    map.setHighlight(f);
    map.setPaused(false);
    lastPanelKey = "";
    setPanel(true);
    renderPanel(true);
    const b = f._bbox || [-10, -10, 10, 10];
    const pxW = Math.max(8, (b[2] - b[0]) * map.baseScale);
    const pxH = Math.max(8, (b[3] - b[1]) * map.baseScale);
    const z = clamp(Math.min((map.W * 0.5) / pxW, (map.H * 0.55) / pxH) * 0.95, 1.5, 5.5);
    map.flyTo(f.properties.ly, f.properties.lx, z, 750);
    if (window.MapTheatre) {
      window.MapTheatre.setLang(state.lang);
      window.MapTheatre.playCountry(f);
    }
    syncURL();
  }
  function closeCountry() {
    if (!state.country) return;
    state.country = null;
    map.setHighlight(null);
    if (window.MapTheatre) window.MapTheatre.clear();
    lastPanelKey = "";
    el["panel-body"].scrollTop = 0;
    renderPanel(true);
    syncURL();
  }

  /* ── panel open/close ───────────────────────────── */
  function setPanel(open) {
    state.panelOpen = open;
    el["side-panel"].classList.toggle("collapsed", !open);
    el["panel-reopen"].hidden = open;
    if (map) map.fit(false);
    if (open && map && map.features) renderPanel(true);
  }

  /* ── search ─────────────────────────────────────── */
  function searchIndex(q) {
    q = q.trim().toLowerCase();
    if (q.length < 1) return null;
    const score = (s, q) => {
      if (!s) return 0;
      s = s.toLowerCase();
      if (s === q) return 4;
      if (s.startsWith(q)) return 3;
      if (s.indexOf(q) >= 0) return 1;
      return 0;
    };
    const evs = [];
    for (const ev of A.events) {
      let sc = Math.max(score(ev.t[0], q), score(ev.t[1], q), score(ev.d[0], q), score(ev.d[1], q));
      if (ev.tx) for (const l in ev.tx) sc = Math.max(sc, score(ev.tx[l], q));
      if (ev.dx) for (const l in ev.dx) sc = Math.max(sc, score(ev.dx[l], q));
      if (sc) evs.push({ ev, sc });
    }
    evs.sort((a, b) => b.sc - a.sc || Math.abs(a.ev.y - state.year) - Math.abs(b.ev.y - state.year));
    const pols = A.polities.map((p) => ({ p, sc: Math.max(score(p.n.zh, q), score(p.n.en, q)) }))
      .filter((x) => x.sc).sort((a, b) => b.sc - a.sc).slice(0, 4);
    const ctry = (map.features || []).map((f) => ({ f, sc: Math.max(score(f.properties.zh, q), score(f.properties.n, q), score(f.properties.es, q), score(f.properties.fr, q), score(f.properties.ar, q), score(f.properties.iso3, q)) }))
      .filter((x) => x.sc).sort((a, b) => b.sc - a.sc).slice(0, 5);
    return { evs: evs.slice(0, 6), pols, ctry };
  }

  function runSearch() {
    const q = el.search.value;
    if (!q.trim()) { el["search-results"].hidden = true; return; }
    const res = searchIndex(q);
    if (!res || (!res.evs.length && !res.pols.length && !res.ctry.length)) {
      el["search-results"].innerHTML = '<div class="sr-empty">' + L("没有找到匹配项", "Nothing found", "Sin resultados", "Aucun résultat", "لا نتائج") + "</div>";
      el["search-results"].hidden = false;
      return;
    }
    let html = "";
    if (res.evs.length) {
      html += '<div class="sr-group">' + L("事件", "Events", "Eventos", "Événements", "الأحداث") + "</div>";
      res.evs.forEach(({ ev }) => {
        html += '<button class="sr-item" data-r-ev="' + ev.id + '"><b>' + evTitle(ev) + "</b><small>" + fmtYear(ev.y, state.lang, true) + "</small></button>";
      });
    }
    if (res.pols.length) {
      html += '<div class="sr-group">' + L("文明", "Civilizations", "Civilizaciones", "Civilisations", "الحضارات") + "</div>";
      res.pols.forEach(({ p }) => {
        html += '<button class="sr-item" data-r-pol="' + p.id + '"><b>' + nameOf(p.n) + "</b><small>" + fmtRange(p.y1, p.y2) + "</small></button>";
      });
    }
    if (res.ctry.length) {
      html += '<div class="sr-group">' + L("国家", "Countries", "Países", "Pays", "الدول") + "</div>";
      res.ctry.forEach(({ f }) => {
        html += '<button class="sr-item" data-r-ctry="' + countryKey(f) + '"><b>' + countryName(f) + "</b><small>" + (f.properties.cont || "") + "</small></button>";
      });
    }
    el["search-results"].innerHTML = html;
    el["search-results"].hidden = false;
  }

  function pickSearch(target) {
    if (target.dataset.rEv) {
      const ev = byId[target.dataset.rEv];
      if (ev) { closeSearch(); openEvent(ev); }
    } else if (target.dataset.rCtry) {
      const key = target.dataset.rCtry;
      const f = (map.features || []).find((x) => x.properties.iso3 === key || x.properties.iso2 === key || x.properties.n === key);
      if (f) { closeSearch(); openCountry(f); }
    } else if (target.dataset.rPol) {
      const p = A.polities.find((x) => x.id === target.dataset.rPol);
      if (p) {
        closeSearch();
        const mid = Math.round((Math.max(p.y1, -12000) + Math.min(p.y2, 2026)) / 2);
        applyYear(mid, null, { force: true });
        setPanel(true);
        schedulePanel();
        map.flyTo(p.lat, p.lon, 1.9, 750);
      }
    }
  }
  function closeSearch() {
    el["search-results"].hidden = true;
    el.search.value = "";
    el.search.blur();
  }

  /* ── UI bindings ────────────────────────────────── */
  function bindUI() {
    el["lang-select"].addEventListener("change", (e) => setLang(e.target.value));
    el["layers-btn"].addEventListener("click", (e) => {
      e.stopPropagation();
      el["layers-pop"].hidden = !el["layers-pop"].hidden;
      el["layers-btn"].classList.toggle("is-on", !el["layers-pop"].hidden);
    });
    el["layers-pop"].addEventListener("click", (e) => e.stopPropagation());
    document.querySelectorAll("[data-toggle]").forEach((cb) => {
      cb.addEventListener("change", () => {
        state.toggles[cb.getAttribute("data-toggle")] = cb.checked;
        map.setToggles(state.toggles);
      });
    });
    el["about-btn"].addEventListener("click", openAbout);
    el["reset-btn"].addEventListener("click", () => { map.fit(true); });
    el["about-modal"].addEventListener("click", (e) => {
      if (e.target.getAttribute("data-close")) closeAbout();
    });
    el["event-modal"].addEventListener("click", (e) => {
      if (e.target.getAttribute("data-close")) closeEvent();
    });
    el["panel-toggle"].addEventListener("click", () => setPanel(false));
    el["panel-close"].addEventListener("click", () => setPanel(false));
    el["panel-reopen"].addEventListener("click", () => setPanel(true));
    el["play-btn"].addEventListener("click", togglePlay);
    el["speed-btn"].addEventListener("click", () => {
      state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
      el["speed-btn"].textContent = state.speed + "×";
    });
    el["now-btn"].addEventListener("click", () => {
      stopPlay();
      applyYear(2026, null, { force: true });
      setPanel(state.panelOpen);
    });
    bindTrack();
    el["hint-close"].addEventListener("click", () => el.hint.classList.add("hide"));

    document.getElementById("zoom-in").addEventListener("click", () => map.zoomAt(1.45, map.W / 2, map.H / 2));
    document.getElementById("zoom-out").addEventListener("click", () => map.zoomAt(1 / 1.45, map.W / 2, map.H / 2));
    document.getElementById("zoom-fit").addEventListener("click", () => map.fit(true));

    el["search"].addEventListener("input", runSearch);
    el["search"].addEventListener("focus", () => { if (el.search.value) runSearch(); });
    el["search-results"].addEventListener("mousedown", (e) => {
      const item = e.target.closest("[data-r-ev],[data-r-pol],[data-r-ctry]");
      if (item) { e.preventDefault(); pickSearch(item); }
    });

    el["panel-body"].addEventListener("click", (e) => {
      const evBtn = e.target.closest("[data-ev]");
      if (evBtn) { openEvent(byId[evBtn.getAttribute("data-ev")]); return; }
      const polBtn = e.target.closest("[data-polity]");
      if (polBtn) {
        const p = A.polities.find((x) => x.id === polBtn.getAttribute("data-polity"));
        if (p) map.flyTo(p.lat, p.lon, 1.9, 750);
        return;
      }
      const back = e.target.closest("[data-back]");
      if (back) { closeCountry(); return; }
      const chg = e.target.closest("[data-chg]");
      if (chg) {
        const [type, idx] = chg.getAttribute("data-chg").split(":");
        const arr = type === "birth" ? (A.stateChanges && A.stateChanges.births) : (A.stateChanges && A.stateChanges.dissolutions);
        const x = arr && arr[Number(idx)];
        if (x) {
          applyYear(x.year, null, { force: true });
          map.flyTo(x.lat, x.lon, 2.7, 800);
        }
        return;
      }
      const chr = e.target.closest("[data-chr-year]");
      if (chr) {
        const y = Number(chr.getAttribute("data-chr-year"));
        applyYear(y, null, { force: true });
        if (state.country) {
          const f = state.country;
          map.flyTo(f.properties.ly, f.properties.lx, Math.max(1.6, map.view.zoom), 700);
        }
      }
    });

    el["ev-prev"].addEventListener("click", () => stepEvent(-1));
    el["ev-next"].addEventListener("click", () => stepEvent(1));
    el["ev-contemp-list"].addEventListener("click", (e) => {
      const b = e.target.closest("[data-contemp]");
      if (b) openEvent(byId[b.getAttribute("data-contemp")]);
    });
    el["sound-btn"].addEventListener("click", () => {
      if (!window.AtlasAudio) return;
      const on = window.AtlasAudio.toggle();
      el["sound-btn"].classList.toggle("is-on", on);
      updateSoundBtn();
    });
    el["tc-close"].addEventListener("click", closeTheatre);
    el["tc-voice"].addEventListener("click", speakSelected);
    el["ev-voice"].addEventListener("click", speakSelected);
    el["tc-expand"].addEventListener("click", () => { if (state.selected) openEventModal(state.selected); });
    el["tc-pause"].addEventListener("click", () => {
      if (!window.MapTheatre) return;
      const paused = window.MapTheatre.togglePause();
      el["tc-pause"].textContent = paused ? (state.lang === "zh" ? "继续" : "Resume") : (state.lang === "zh" ? "暂停" : "Pause");
    });
    el["scene-toggle"].addEventListener("click", () => {
      if (!sceneCtl) return;
      scenePaused = sceneCtl.toggle();
      el["scene-toggle"].textContent = scenePaused ? "▶" : "❚❚";
    });

    window.addEventListener("historicalchange", updateMapNote);
    document.addEventListener("click", (e) => {
      if (!el["layers-pop"].hidden && !el["layers-pop"].contains(e.target) && e.target !== el["layers-btn"]) {
        el["layers-pop"].hidden = true;
        el["layers-btn"].classList.remove("is-on");
      }
      if (!el["search-results"].hidden && !el["search-results"].contains(e.target) && e.target !== el.search) {
        el["search-results"].hidden = true;
      }
    });

    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", () => {
      if (map) map.resize();
      drawTicks();
    });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { drawTicks(); });
      ro.observe(el["track"]);
    }
  }

  function onKey(e) {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea";
    if (e.key === "Escape") {
      if (!el["layers-pop"].hidden) { el["layers-pop"].hidden = true; el["layers-btn"].classList.remove("is-on"); return; }
      if (!el["event-modal"].hidden) { closeEvent(); return; }
      if (!el["theatre-card"].hidden) { closeTheatre(); return; }
      if (!el["about-modal"].hidden) { closeAbout(); return; }
      if (!el["side-panel"].classList.contains("collapsed")) { setPanel(false); return; }
      if (!el["search-results"].hidden) { closeSearch(); return; }
      return;
    }
    if (typing) {
      if (e.key === "Enter" && !el["search-results"].hidden) {
        const first = el["search-results"].querySelector("[data-r-ev],[data-r-pol],[data-r-ctry]");
        if (first) pickSearch(first);
      }
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      stopPlay();
      const unit = yearStep(state.year) * (e.shiftKey ? 10 : 1);
      applyYear(state.year + (e.key === "ArrowRight" ? unit : -unit), null, { force: true });
      renderPanel(true);
    } else if (e.key === " ") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "/") {
      e.preventDefault();
      el.search.focus();
    } else if (e.key === "[" || e.key === "]") {
      e.preventDefault();
      stepEvent(e.key === "]" ? 1 : -1);
    }
  }

  function yearStep(y) {
    if (y < -3000) return 100;
    if (y < 0) return 25;
    if (y < 1500) return 10;
    if (y < 1900) return 5;
    return 1;
  }

  /* ── about ──────────────────────────────────────── */
  function openAbout() {
    populateAbout();
    el["about-modal"].hidden = false;
    setTimeout(() => {
      const c = el["about-modal"].querySelector(".ev-close");
      if (c) c.focus();
    }, 40);
  }
  function closeAbout() { el["about-modal"].hidden = true; }
  function populateAbout() {
    el["about-eras"].innerHTML = A.eras.map((era) =>
      "<li><time>" + fmtRange(era.from, era.to) + "</time><span><b>" + eraName(era) + "</b><em>" + eraSub(era) + "</em></span></li>"
    ).join("");
    const used = [];
    A.events.forEach((e) => { if (used.indexOf(e.s) < 0) used.push(e.s); });
    el["about-scenes"].textContent = used.map((s) => (A.scenes[s] ? (state.lang === "zh" ? A.scenes[s].zh : A.scenes[s].en) : s)).join(" · ");
  }

  /* ── URL ────────────────────────────────────────── */
  function syncURL() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const p = new URLSearchParams();
      p.set("year", state.year);
      if (state.selected) p.set("event", state.selected.id);
      if (state.country) p.set("country", countryKey(state.country));
      if (state.lang !== "zh") p.set("lang", state.lang);
      try { history.replaceState(null, "", "?" + p.toString()); } catch (err) { /* file:// */ }
    }, 420);
  }

  /* ── go ─────────────────────────────────────────── */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
