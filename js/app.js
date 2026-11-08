/* ═══════════════════════════════════════════════════════════
   寰宇时序 · Application
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const A = window.WORLD_ATLAS;
  const ASSET_V = "20261108x";
  const $ = (s) => document.querySelector(s);
  let heroScenesP = null, variantScenesP = null;
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve(true);
      el.onerror = () => reject(new Error("script " + src));
      document.body.appendChild(el);
    });
  }
  function ensureHeroScenes() {
    if (window.HeroScenes) return Promise.resolve(true);
    if (!heroScenesP) heroScenesP = loadScriptOnce("js/hero-scenes.js?v=" + ASSET_V).catch((err) => { console.warn("Hero scenes unavailable:", err.message); heroScenesP = null; return false; });
    return heroScenesP;
  }
  function ensureVariantScenes() {
    if (window.VariantScenes) return Promise.resolve(true);
    if (!variantScenesP) variantScenesP = ensureHeroScenes().then(() => loadScriptOnce("js/variant-scenes.js?v=" + ASSET_V)).catch((err) => { console.warn("Variant scenes unavailable:", err.message); variantScenesP = null; return false; });
    return variantScenesP;
  }
  function ensureSceneAssets() { return ensureVariantScenes(); }
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
    const base = e.id || slugify(e.t[1]);
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
    regionsLabel: { zh: "地区", en: "Regions" },
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
    tgHistLabels: { zh: "历史名称", en: "Historical names" },
    tgAutoEvent: { zh: "自动播放重大事件", en: "Auto-play major events" },
    tgAll: { zh: "显示全部历史", en: "Show all history" },
    layersNote: { zh: "势力范围为示意性近似，非精确国界。", en: "Halos are schematic spheres of influence, not borders." },
    mapNote: { zh: "示意图 · 现代国界仅作地理参照", en: "Schematic · modern borders for reference only" },
    hint: { zh: "拖动底部时间轴 · 点击地图节点观看动态场景", en: "Drag the timeline · click any node to enter its scene" },
    today: { zh: "今天", en: "Today" },
    tlTip: { zh: "← → 按年代步进 · ↑↓ ±1 · ⇧ ×10 · 空格播放", en: "← → era step · ↑↓ ±1 · ⇧ ×10 · Space play" },
    tlJump: { zh: "跳转年份", en: "Jump to year" },
    tlGo: { zh: "跳转", en: "Go" },
    tlZoomIn: { zh: "聚焦近现代", en: "Zoom to 1750–2026" },
    tlZoomOut: { zh: "全史", en: "Full span" },
    tlStep: { zh: "步进", en: "step" },
    tlScrub: { zh: "拖动选择区间可放大", en: "Drag a range to zoom" },
    sameTime: { zh: "同一时刻的世界", en: "Elsewhere at the same moment" },
    prev: { zh: "上一节点", en: "Previous" },
    next: { zh: "下一节点", en: "Next" },
    aboutTitle: { zh: "一部可以走进去的世界史", en: "A world history you can walk into" },
    aboutLead: {
      zh: "一万四千年，九大时代，五百余个节点。拖动时间，世界随之明灭；点击一地，看见那个时刻正在发生什么。",
      en: "Fourteen thousand years, nine ages, more than five hundred nodes. Drag time and watch the world light up; click a place to step into its moment.",
    },
    aboutEras: { zh: "时代", en: "Ages" },
    aboutHow: { zh: "如何阅读", en: "How to read" },
    how1: { zh: "拖动或点击底部时间轴，改变年份；按空格播放整部历史。", en: "Drag or click the timeline to change the year; press Space to play history." },
    how2: { zh: "点击地图上的节点，展开该时刻的动态场景与双语史志。", en: "Click a node to open its animated scene and bilingual chronicle." },
    how3: { zh: "点击任意国家，查看现代国界内的全部历史节点与当时的主导文明。", en: "Click any country to see every node inside its modern borders and the powers that ruled it." },
    how4: { zh: "搜索国家、文明或事件；← → 按年代步进，↑ ↓ 精确到一年，Shift ×10。", en: "Search countries, civilizations or events; ← → steps by era, ↑ ↓ one year, Shift ×10." },
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
    how5: { zh: "点击中国，可按年份查看王朝、并立政权与近现代国家。", en: "Click China to read its dynasties, rival regimes and modern states by year." },
    legendTitle: { zh: "颜色与图例", en: "Colours and legend" },
    legendNote: { zh: "事件节点按类别着色并使用不同形状（菱形/方形/圆形/三角/六边）；政权光晕按地区着色。颜色与形状不表示优劣或立场。", en: "Event nodes are coloured and shaped by category (diamond/square/circle/triangle/hex); polity halos by region. Neither implies ranking or stance." },
    legendEvents: { zh: "事件类别", en: "Event categories" },
    legendRegions: { zh: "地区 / 政权", en: "Regions / polities" },
    obKicker: { zh: "第一次来 · FIRST VISIT", en: "FIRST VISIT" },
    obTitle: { zh: "三步读这张地图", en: "Three ways to read this atlas" },
    ob1Title: { zh: "拖动或输入年份", en: "Drag or type the year" },
    ob1: { zh: "点年份可直接输入；↑↓ 精确到一年；Shift 拖出区间可放大；右下角 ⛶ 可铺满手机视野。", en: "Tap the year to type it; ↑↓ moves one year; Shift-drag a range to zoom; the ⛶ button fills the phone screen." },
    ob2Title: { zh: "点击地图节点", en: "Click a map node" },
    ob2: { zh: "节点打开右侧（手机为底部）详情，并在地图上演出当时场景。", en: "A node opens the side panel (bottom sheet on phones) and plays its scene on the map." },
    ob3Title: { zh: "搜索与地区", en: "Search and regions" },
    ob3: { zh: "搜索事件、文明或国家；↑↓ 选择，回车打开。上方地区条可快速定位。", en: "Search events, civilizations or countries; ↑↓ to choose, Enter to open. Region chips jump the camera." },
    obStart: { zh: "开始探索", en: "Start exploring" },
    obGuide: { zh: "看凡例", en: "Open the guide" },
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
    region: null,
    eventView: null,
    eventGroup: null,
    autoEvent: true,
    lastTrigger: 0,
    toggles: { events: true, polities: false, links: true, labels: false, historicalLabels: true, allEvents: false, historical: true, stateChanges: true },
    panelOpen: true,
    catFilter: null,
    catFilterExpanded: false,
    searchQuery: null,
    searchResults: [],
    route: null,
    autoOpened: false,
    sheet: "half",
    routeStripOpen: false,
    modernExpanded: false,
    modernOpen: false,
    brushMode: false,
    favoritesOpen: false,
    eventReturnYear: null,
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
  /* The era weights are a deliberate non-linear scale: 32 years of world
     war take more room than 163 years of industrial history. A zoom window
     keeps that same per-era weighting inside the selected range, so the
     distortion is preserved (and shown by the era bands) rather than silently
     switching to a linear year axis. */
  const timeline = (function () {
    const eras = A.eras;
    const fullFrom = eras[0].from;
    const fullTo = eras[eras.length - 1].to;
    let win = { from: fullFrom, to: fullTo };
    let spans = [];
    function rebuild() {
      const out = [];
      let acc = 0;
      for (const e of eras) {
        const a = Math.max(win.from, e.from);
        const b = Math.min(win.to, e.to);
        if (b <= a) continue;
        const frac = (b - a) / Math.max(1, e.to - e.from);
        const w = e.weight * Math.max(0.0001, frac);
        out.push({ e, from: a, to: b, w });
        acc += w;
      }
      let s = 0;
      for (const sp of out) {
        sp.s = acc ? s / acc : 0;
        s += sp.w;
        sp.t = acc ? s / acc : 1;
      }
      spans = out;
    }
    rebuild();
    const api = {
      get spans() { return spans; },
      get from() { return win.from; },
      get to() { return win.to; },
      get fullFrom() { return fullFrom; },
      get fullTo() { return fullTo; },
      get full() { return win.from <= fullFrom && win.to >= fullTo; },
      get span() { return win.to - win.from; },
      setWindow(from, to) {
        from = clamp(Math.round(from), fullFrom, fullTo - 5);
        to = clamp(Math.round(to), from + 5, fullTo);
        win = { from, to };
        rebuild();
        return api;
      },
      reset() {
        win = { from: fullFrom, to: fullTo };
        rebuild();
        return api;
      },
      toPos(y) {
        y = clamp(nYear(Math.round(y)), win.from, win.to);
        for (let i = 0; i < spans.length; i++) {
          const sp = spans[i];
          if (y < sp.to || i === spans.length - 1) {
            const r = clamp((y - sp.from) / (sp.to - sp.from), 0, 1);
            return sp.s + r * (sp.t - sp.s);
          }
        }
        return 1;
      },
      toYear(p) {
        p = clamp(p, 0, 1);
        for (let i = 0; i < spans.length; i++) {
          const sp = spans[i];
          if (p < sp.t || i === spans.length - 1) {
            const r = clamp((p - sp.s) / (sp.t - sp.s), 0, 1);
            return sp.from + r * (sp.to - sp.from);
          }
        }
        return win.to;
      },
    };
    return api;
  })();
  state.pos = timeline.toPos(state.year);

  /* ── themed routes ──────────────────────────────── */
  const ROUTES = [
    {
      id: "silk-sea",
      name: { zh: "丝路与海路", en: "Silk & Sea Routes", es: "Rutas de la seda y el mar", fr: "Routes de la soie et de la mer", ar: "طرق الحرير والبحر" },
      desc: {
        zh: "从陆上丝路到印度洋与太平洋航线：商品、宗教与帝国如何把大陆连成网络。",
        en: "From the overland Silk Road to Indian Ocean and Pacific routes: how goods, faiths and empires linked continents.",
        es: "De la Ruta de la Seda a las rutas del Índico y el Pacífico: cómo bienes, fes e imperios conectaron continentes.",
        fr: "De la route de la soie aux routes de l’océan Indien et du Pacifique : comment marchandises, foi et empires ont relié les continents.",
        ar: "من طريق الحرير البري إلى طرق المحيط الهندي والهادئ: كيف ربطت السلع والأديان والإمبراطوريات القارات.",
      },
      events: ["the-silk-road", "baghdad-founded", "zheng-hes-voyages", "columbus-reaches-the-americas", "aceh-sultanate", "vasco-da-gama-reaches-india", "portuguese-capture-malacca", "magellans-circumnavigation", "english-east-india-company"],
    },
    {
      id: "empire-collapse",
      name: { zh: "帝国崩溃", en: "Empires in Crisis", es: "Imperios en crisis", fr: "Empires en crise", ar: "إمبراطوريات في أزمة" },
      desc: {
        zh: "从汉、罗马到奥斯曼、苏联：帝国如何失去合法性、边疆与中心。",
        en: "From Han and Rome to the Ottomans and the USSR: how empires lose legitimacy, frontiers and their centre.",
        es: "Del Han y Roma a los otomanos y la URSS: cómo los imperios pierden legitimidad, fronteras y centro.",
        fr: "Du Han et de Rome aux Ottomans et à l’URSS : comment les empires perdent légitimité, frontières et centre.",
        ar: "من هان وروما إلى العثمانيين والاتحاد السوفيتي: كيف تفقد الإمبراطوريات شرعيتها وحدودها ومركزها.",
      },
      events: ["fall-of-the-han", "fall-of-western-rome", "fall-of-constantinople", "fall-of-granada", "fall-of-the-aztec-empire", "fall-of-the-inca", "opium-war", "partition-of-india", "fall-of-the-berlin-wall", "collapse-of-the-ussr"],
    },
    {
      id: "tech-contact",
      name: { zh: "技术与交流", en: "Technology & Contact", es: "Tecnología y contacto", fr: "Technologie et contact", ar: "التقنية والتواصل" },
      desc: {
        zh: "造纸、印刷、铁路、飞行、核能与互联网：技术如何改写交流的速度。",
        en: "Paper, printing, railways, flight, nuclear power and the internet: how technology rewrote the speed of contact.",
        es: "Papel, imprenta, ferrocarril, vuelo, energía nuclear e internet: cómo la tecnología reescribió la velocidad del contacto.",
        fr: "Papier, imprimerie, chemin de fer, vol, nucléaire et internet : comment la technologie a réécrit la vitesse des contacts.",
        ar: "الورق والطباعة والسكك والطيران والطاقة النووية والإنترنت: كيف أعادت التقنية كتابة سرعة التواصل.",
      },
      events: ["cai-lun-improves-papermaking", "gutenbergs-press", "stockton-darlington-railway", "wright-brothers-first-flight", "penicillin-discovered", "sputnik-1", "apollo-11", "the-world-wide-web", "the-generative-ai-boom"],
    },
    {
      id: "climate-earth",
      name: { zh: "环境与灾变", en: "Environment & Catastrophe", es: "Medio ambiente y catástrofe", fr: "Environnement et catastrophe", ar: "البيئة والكوارث" },
      desc: {
        zh: "从撒哈拉变绿到核事故与气候协定：环境如何塑造文明，人类又如何改变环境。",
        en: "From the green Sahara to nuclear accidents and climate agreements: how environments shaped civilizations, and how humans reshaped environments.",
        es: "Del Sáhara verde a los accidentes nucleares y los acuerdos climáticos: cómo el medio ambiente formó civilizaciones y cómo las sociedades lo transformaron.",
        fr: "Du Sahara vert aux accidents nucléaires et aux accords climatiques : comment les environnements ont façonné les civilisations et comment les sociétés les ont transformés.",
        ar: "من الصحراء الخضراء إلى الحوادث النووية واتفاقات المناخ: كيف شكّلت البيئة الحضارات وكيف غيّرتها المجتمعات.",
      },
      events: ["the-green-sahara", "thera-eruption", "vesuvius-erupts", "the-black-death", "lisbon-earthquake", "irish-famine", "fukushima-disaster", "paris-agreement"],
    },
    {
      id: "disease-medicine",
      name: { zh: "疾病与医学", en: "Disease & Medicine", es: "Enfermedad y medicina", fr: "Maladie et médecine", ar: "المرض والطب" },
      desc: {
        zh: "瘟疫、流感与抗生素：疾病如何改写人口、帝国与公共卫生。",
        en: "Plague, influenza and antibiotics: how disease reshaped populations, empires and public health.",
        es: "Peste, gripe y antibióticos: cómo las enfermedades transformaron poblaciones, imperios y salud pública.",
        fr: "Peste, grippe et antibiotiques : comment les maladies ont remodelé populations, empires et santé publique.",
        ar: "الطاعون والإنفلونزا والمضادات الحيوية: كيف أعادت الأمراض تشكيل السكان والإمبراطوريات والصحة العامة.",
      },
      events: ["plague-of-justinian", "the-black-death", "the-1918-influenza", "penicillin-discovered", "covid-19-pandemic"],
    },
    {
      id: "ocean-voyages",
      name: { zh: "海洋与远航", en: "Oceans & Voyages", es: "Océanos y travesías", fr: "Océans et voyages", ar: "المحيطات والرحلات" },
      desc: {
        zh: "从拉皮塔独木舟到麦哲伦环球：太平洋与印度洋的航海网络如何连接世界。",
        en: "From Lapita canoes to Magellan's circumnavigation: how Pacific and Indian Ocean voyaging networks connected the world.",
        es: "De las canoas lapita a la vuelta al mundo de Magallanes: cómo las redes de navegación del Pacífico y el Índico conectaron el mundo.",
        fr: "Des pirogues lapita au tour du monde de Magellan : comment les réseaux de navigation du Pacifique et de l’océan Indien ont relié le monde.",
        ar: "من زوارق لابيتا إلى رحلة ماجلان حول العالم: كيف ربطت شبكات الإبحار في المحيطين الهادئ والهندي العالم.",
      },
      events: ["lapita-voyagers", "norse-reach-vinland", "maori-reach-aotearoa", "zheng-hes-voyages", "columbus-reaches-the-americas", "vasco-da-gama-reaches-india", "magellans-circumnavigation", "cook-at-tahiti", "bering-reaches-alaska"],
    },
  ];
  const routeById = (id) => ROUTES.find((r) => r.id === id) || null;
  const routeText = (obj) => (obj && (obj[state.lang] || obj.en || obj.zh)) || "";

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
  const CAT_SHAPES = {
    war: "diamond", politics: "square", trade: "circle", exploration: "circle",
    culture: "square", religion: "square", science: "square",
    disaster: "triangle", plague: "triangle",
    city: "hex", agri: "hex", industry: "hex", hunt: "hex", digital: "hex",
  };
  const catShape = (k) => CAT_SHAPES[k] || "circle";
  const regionColor = (k) => (A.regions[k] ? A.regions[k].color : "#8a6a3f");
  function modernEntityName(e) {
    if (!e) return "";
    if (state.lang === "zh") return e.name.zh || e.name.en || "";
    if (state.lang === "en") return e.name.en || e.name.zh || "";
    const f = A.featureByCode && e.code && A.featureByCode[e.code];
    const n = f && f.properties && f.properties[state.lang];
    return n || e.name.en || e.name.zh || "";
  }
  function countryName(f) {
    if (!f) return L("海域", "Open sea", "Alta mar", "Haute mer", "عرض البحر");
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
  let lastChromeYear = null, lastChromePos = "", lastBandEra = null, lastPlayTs = 0, lastHintStep = null;
  let draggingTrack = false, eventTimer = 0, lastAutoGroup = "";
  let searchItems = [], searchActive = -1, noteTimer = 0, toastTimer = 0, navigatingHistory = false;
  let lastFocusEl = null, chroniclesP = null, detailsP = null, modalReturnFocus = null, aboutReturnFocus = null;
  let bootFailed = false;

  /* ── boot ───────────────────────────────────────── */
  function boot() {
    [
      "search", "search-results", "search-clear", "lang-select", "layers-btn", "layers-pop", "about-btn", "reset-btn",
      "hud-year", "hud-era", "hud-sub", "panel-kicker", "panel-title", "panel-sub", "panel-routes", "panel-body", "map-note",
      "side-panel", "panel-toggle", "panel-reopen", "panel-close", "tooltip", "era-bands", "tick-canvas", "track",
      "playhead", "playhead-label", "play-btn", "speed-btn", "now-btn", "tl-year", "tl-era",
      "zoom-in", "zoom-out", "zoom-fit", "zoom-fill", "map-empty", "sheet-expand", "toast",
      "tl-year-btn", "tl-step-back", "tl-step-fwd", "tl-jump", "tl-year-input", "tl-jump-go", "tl-jump-cancel",
      "tl-zoom-btn", "tl-brush", "tl-cursor", "tl-tip", "tl-scope", "tl-brush-btn",
      "minimap", "minimap-canvas", "minimap-fit",
      "offline-bar", "pwa-bar", "pwa-action", "pwa-dismiss", "panel-offline", "layers-lang-note",
      "event-modal", "scene-canvas", "scene-label", "scene-era", "scene-caption", "scene-toggle",
      "theatre-card", "tc-kicker", "tc-title", "tc-expand", "tc-pause", "tc-close", "sheet-handle",
      "sound-btn", "ev-voice", "fav-btn", "fav-count", "fav-toggle",
      "ev-year", "ev-cat", "ev-title", "ev-title-en", "ev-desc", "ev-desc-en", "ev-meta", "ev-detail", "ev-links",
      "ev-contemp-list", "ev-prev", "ev-next", "about-modal", "about-eras", "about-scenes",
      "event-modal", "hint", "hint-close", "panel-reopen",
      "onboarding", "ob-close", "ob-start", "ob-guide", "legend-cats", "legend-regions",
      "a11y-live", "a11y-nodes",
    ].forEach((id) => { el[id] = document.getElementById(id); });

    // First visit: the era summary is open on desktop (there is room for it)
    // and a three-step guide explains the map; phones keep the map full-bleed.
    const firstVisit = !localStorage.getItem("world-atlas-onboarded");
    state.panelOpen = firstVisit && window.innerWidth > 860;
    el["side-panel"].classList.toggle("collapsed", !state.panelOpen);
    el["panel-reopen"].hidden = state.panelOpen;
    document.getElementById("map-stage").classList.toggle("panel-open", state.panelOpen);
    if (firstVisit) setTimeout(showOnboarding, 1100);
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      state.autoEvent = false;
      const cb = document.getElementById("auto-event-toggle");
      if (cb) cb.checked = false;
    }

    loadFavorites();
    applyI18n();
    updateBrushLabel();
    buildTimeline();
    buildRegionNav();

    // If a core script fails to arrive (flaky network, interrupted cache),
    // say so in the panel instead of leaving a blank map behind the guide.
    if (typeof AtlasMap !== "function") {
      bootFailed = true;
      el["onboarding"].hidden = true;
      el["panel-kicker"].textContent = t("brand");
      el["panel-title"].textContent = L("地图脚本未能载入", "The map script did not load", "No se cargó el script del mapa", "Le script de la carte n’a pas pu être chargé", "لم يُحمَّل نص الخريطة");
      el["panel-sub"].textContent = "";
      el["panel-body"].innerHTML = `<div class="panel-empty">${L("请检查网络后刷新页面重试。", "Check your connection and reload the page.", "Comprueba la conexión y recarga la página.", "Vérifiez la connexion puis rechargez la page.", "تحقق من الاتصال ثم أعد تحميل الصفحة.")}</div>`;
      return;
    }

    map = new AtlasMap($("#map-canvas"), $("#fx-canvas"), {
      onEventClick: (hit) => {
        if (hit && hit.__cluster) {
          map.flyTo(hit.lat, hit.lon, clamp(map.view.zoom * 1.9, 1.6, 5), 650);
          return;
        }
        triggerEvent(hit, "map");
      },
      onCountryClick: (f) => {
        if (f) { openCountry(f); return; }
        closeCountry();
        closeTheatre();
      },
      onHover: showTooltip,
      onHoverMove: moveTooltip,
    });
    if (el["minimap-canvas"]) map.setMinimap(el["minimap-canvas"]);
    map.setYear(state.year);
    map.setLang(state.lang);
    map.setToggles(state.toggles);
    if (window.MapTheatre) {
      window.MapTheatre.init(map);
      window.MapTheatre.setLang(state.lang);
    }

    bindUI();
    window.atlasAPI = { map, state, openEvent, openEventModal, openCountry, theatre: window.MapTheatre, placeInfo, setPanel, setSheet, setYear: (y) => applyYear(y, null, { force: true }),
      shareCardBlob: (ev) => renderShareCard(eventCardSpec(ev || state.selected)),
      cardBlob: (kind, arg) => renderShareCard(kind === "country" ? countryCardSpec(arg || state.country) : kind === "route" ? routeCardSpec(arg || routeById(state.route)) : eventCardSpec(arg || state.selected)) };
    renderPanel(true);
    updateFavUI();
    updateChrome();
    drawTicks();
    requestAnimationFrame(frame);

    loadWorld();
    loadAuxData();
    // Hero/Tier B modules are only needed when a scene opens; warm them in
    // idle time so the first theatre click is instant without paying for
    // 478 KB of script on the critical path.
    const warm = () => ensureSceneAssets();
    const conn = navigator.connection || {};
    const slowNet = conn.saveData || /(^|-)2g$|(^|-)3g$/.test(conn.effectiveType || "");
    if (!slowNet) {
      if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 3500 });
      else setTimeout(warm, 1500);
    }
    setTimeout(() => el.hint.classList.add("hide"), 11000);
    initPWA();
  }

  function loadAuxData() {
    const v = "?v=20261108x";
    A.detailsLoading = true;
    A.detailsLoading = true;
    fetch("data/state_changes.json" + v)
      .then((r) => { if (!r.ok) throw new Error("states " + r.status); return r.json(); })
      .then((st) => {
        A.stateChanges = st;
        if (window.StateChanges && map) { window.StateChanges.init(map); window.StateChanges.setLang(state.lang); }
        lastPanelKey = "";
        if (map && map.features) renderPanel(true);
        drawTicks();
      })
      .catch((err) => console.warn("Auxiliary data unavailable:", err.message));
  }

  function ensureDetails() {
    if (A.eventDetails) { A.detailsLoading = false; return Promise.resolve(A.eventDetails); }
    if (detailsP) return detailsP;
    A.detailsLoading = true;
    detailsP = fetch("data/event_details.json?v=20261108x")
      .then((r) => { if (!r.ok) throw new Error("details " + r.status); return r.json(); })
      .then((d) => {
        A.eventDetails = d || {};
        A.detailsLoading = false;
        lastPanelKey = "";
        if (state.eventView && state.panelOpen) renderPanel(true);
        if (state.selected && !el["event-modal"].hidden) fillEvent(state.selected);
        return A.eventDetails;
      })
      .catch((err) => { A.detailsLoading = false; console.warn("Event details unavailable:", err.message); detailsP = null; return null; });
    return detailsP;
  }

  function ensureChronicles() {
    if (A.chronicles) return Promise.resolve(A.chronicles);
    if (chroniclesP) return chroniclesP;
    chroniclesP = fetch("data/country_chronicles.json?v=20261108x")
      .then((r) => { if (!r.ok) throw new Error("chronicles " + r.status); return r.json(); })
      .then((d) => {
        A.chronicles = d || {};
        lastPanelKey = "";
        if (state.country && state.panelOpen) renderPanel(true);
        return A.chronicles;
      })
      .catch((err) => { console.warn("Country chronicles unavailable:", err.message); chroniclesP = null; return null; });
    return chroniclesP;
  }

  function loadWorld() {
    const stageEl = document.getElementById("map-stage");
    if (stageEl) stageEl.setAttribute("aria-busy", "true");
    const loading = document.createElement("div");
    loading.className = "map-loading";
    loading.innerHTML = '<div class="map-loading-inner"><b>正在展开舆图…</b><div class="map-skeleton" aria-hidden="true"><i></i><i></i><i></i></div><small>UNFOLDING THE ATLAS</small></div>';
    $("#map-stage").appendChild(loading);

    fetch("data/world.geo.json?v=20261108x")
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
        if (stageEl) stageEl.setAttribute("aria-busy", "false");
        renderPanel(true);
        drawTicks();
        applyDeepLink();
        // Historical borders, labels and state changes are heavy (≈650 KB).
        // Let the base map become interactive first, then add the historical
        // layers; labels fade in when the entity layer is ready.
        setTimeout(() => {
          if (window.HistoricalBorders) {
            window.HistoricalBorders.init(map);
            window.HistoricalBorders.setLang(state.lang);
            window.HistoricalBorders.setEnabled(state.toggles.historical);
          }
          if (window.HistoricalEntities) window.HistoricalEntities.init(map);
          if (window.StateChanges) { window.StateChanges.init(map); window.StateChanges.setLang(state.lang); }
        }, 120);
      })
      .catch((err) => {
        loading.innerHTML = "无法载入地图数据<small>Could not load map data — serve this folder over HTTP (e.g. python3 -m http.server)</small>";
        if (stageEl) stageEl.setAttribute("aria-busy", "false");
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
    A.featureByCode = byIso;
    A.events.forEach((ev) => {
      let f = ev.c ? (byIso[ev.c] || null) : null;
      if (!f) f = map.locateCountry(ev.lon, ev.lat);
      ev._country = f;
    });
  }

  function applyDeepLink() {
    // The initial URL state is applied once. If the reader has already opened
    // an event, country, route or search result, do not reset it underneath them.
    setTimeout(() => {
      if (state.selected || state.country || state.route || state.searchQuery || state.eventView) return;
      applyURLState(false);
    }, 350);
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
    // The shortcut legend is arrow-first; in RTL its bidi reordering would
    // mirror the keys, so pin it to LTR while keeping the Arabic words.
    if (el["tl-tip"]) {
      if (state.lang === "ar") el["tl-tip"].setAttribute("dir", "ltr");
      else el["tl-tip"].removeAttribute("dir");
    }
    if (el["layers-lang-note"]) {
      el["layers-lang-note"].hidden = state.lang === "zh" || state.lang === "en";
      el["layers-lang-note"].textContent = L("", "Historical names without a translation stay in their original script.",
        "Los nombres históricos sin traducción se muestran en su escritura original.",
        "Les noms historiques sans traduction restent dans leur écriture d’origine.",
        "الأسماء التاريخية التي لا ترجمة لها تبقى بخطها الأصلي.");
    }
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
    updateTimelineLabels();
  }

  function setLang(lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    localStorage.setItem("world-atlas-lang", lang);
    loadFavorites();
    applyI18n();
    updateBrushLabel();
    buildTimeline();
    buildRegionNav();
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
    updateBrushLabel();
    updateNetUI();
    sysBarText();
    syncURL();
  }

  /* ── system bars: offline status, install + update prompts ── */
  const STANDALONE = () => (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  let deferredInstall = null, pwaMode = "", updateReload = false;

  function sysBarText() {
    const bar = el["pwa-bar"];
    if (!bar || bar.hidden) return;
    const txt = bar.querySelector(".sysbar-text");
    const act = el["pwa-action"];
    if (!txt || !act) return;
    if (pwaMode === "update") {
      txt.textContent = L("有新版本可用 · 刷新后生效", "A new version is ready — reload to use it", "Hay una versión nueva: recarga para usarla", "Une nouvelle version est prête : rechargez pour l’utiliser", "هناك إصدار جديد — أعد التحميل لاستخدامه");
      act.hidden = false;
      act.textContent = L("刷新", "Reload", "Recargar", "Recharger", "إعادة التحميل");
    } else if (pwaMode === "install") {
      txt.textContent = L("可安装到主屏幕 · 离线也能打开地图", "Install to the home screen — the atlas opens offline", "Instálalo en la pantalla de inicio: el atlas se abre sin conexión", "Installez sur l’écran d’accueil : l’atlas s’ouvre hors ligne", "ثبّته على الشاشة الرئيسية — يفتح الأطلس دون اتصال");
      act.hidden = false;
      act.textContent = L("安装", "Install", "Instalar", "Installer", "تثبيت");
    } else if (pwaMode === "ios") {
      txt.textContent = L("iOS：点“分享”→“添加到主屏幕”。安装后可离线阅读；系统清理存储时可能清除缓存", "iOS: Share → Add to Home Screen. Installed, the atlas reads offline; iOS may clear the cache under storage pressure", "iOS: Compartir → Añadir a inicio. Instalado, el atlas se lee sin conexión; iOS puede borrar la caché si falta espacio", "iOS : Partager → Sur l’écran d’accueil. Installé, l’atlas se lit hors ligne ; iOS peut vider le cache faute d’espace", "iOS: مشاركة ← إضافة إلى الشاشة الرئيسية. بعد التثبيت يعمل الأطلس دون اتصال، وقد يمسح iOS الذاكرة المؤقتة عند ضيق التخزين");
      act.hidden = true;
    }
  }
  function showPwaBar(mode) {
    if (!el["pwa-bar"]) return;
    pwaMode = mode;
    el["pwa-bar"].hidden = false;
    sysBarText();
  }
  function hidePwaBar() {
    if (el["pwa-bar"]) el["pwa-bar"].hidden = true;
    pwaMode = "";
  }
  function updateNetUI() {
    if (!el["offline-bar"]) return;
    const off = navigator.onLine === false;
    el["offline-bar"].hidden = !off;
    if (el["panel-offline"]) {
      el["panel-offline"].hidden = !off;
      el["panel-offline"].textContent = L(
        "离线：摘要与已缓存内容可用；长文、未访问事件与剧场需要联网",
        "Offline: summaries and cached content work; long-form records, unvisited events and scenes need a connection",
        "Sin conexión: resúmenes y contenido guardado; las fichas largas, los eventos no visitados y las escenas necesitan conexión",
        "Hors ligne : résumés et contenu en cache ; les fiches longues, les événements non visités et les scènes demandent une connexion",
        "دون اتصال: الملخصات والمحتوى المخزَّن متاح؛ السجلات الطويلة والأحداث غير المزارة والمشاهد تحتاج اتصالًا"
      );
    }
    const t = el["offline-bar"].querySelector(".sysbar-text");
    if (t) t.textContent = L("离线 · 正在显示已缓存的内容；未访问过的事件详情需要联网", "Offline — showing cached content; unvisited records need a connection", "Sin conexión: se muestra lo guardado; las fichas no visitadas necesitan conexión", "Hors ligne : contenu en cache ; les fiches non visitées demandent une connexion", "دون اتصال — يُعرض المخزَّن؛ السجلات غير المزارة تحتاج اتصالًا");
  }
  function applyPwaAction() {
    if (pwaMode === "update") {
      updateReload = true;
      navigator.serviceWorker.getRegistration().then((r) => {
        if (r && r.waiting) r.waiting.postMessage({ type: "SKIP_WAITING" });
        else location.reload();
      }).catch(() => location.reload());
      return;
    }
    if (pwaMode === "install" && deferredInstall) {
      deferredInstall.prompt();
      deferredInstall.userChoice.then(() => { deferredInstall = null; hidePwaBar(); }).catch(() => {});
    }
  }
  function dismissPwaBar() {
    if (pwaMode === "install" || pwaMode === "ios") {
      try { localStorage.setItem("world-atlas-install-dismissed", "1"); } catch (err) { /* private mode */ }
    }
    hidePwaBar();
  }
  function watchWorker(reg) {
    if (reg.waiting && navigator.serviceWorker.controller) showPwaBar("update");
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) showPwaBar("update");
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (updateReload) location.reload(); });
  }
  function initPWA() {
    updateNetUI();
    window.addEventListener("online", updateNetUI);
    window.addEventListener("offline", updateNetUI);
    if (el["pwa-action"]) el["pwa-action"].addEventListener("click", applyPwaAction);
    if (el["pwa-dismiss"]) el["pwa-dismiss"].addEventListener("click", dismissPwaBar);
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
      if (!STANDALONE() && !localStorage.getItem("world-atlas-install-dismissed")) showPwaBar("install");
    });
    window.addEventListener("appinstalled", () => { deferredInstall = null; hidePwaBar(); });
    // iOS Safari never fires beforeinstallprompt: state the manual path once.
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !STANDALONE();
    if (ios && !localStorage.getItem("world-atlas-install-dismissed")) showPwaBar("ios");
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
    const register = () => navigator.serviceWorker.register("sw.js")
      .then(watchWorker)
      .catch((err) => console.warn("Service worker unavailable:", err.message));
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }

  /* ── favourites / bookmarks ─────────────────────── */
  const FAV_KEY = "world-atlas-favorites";
  let favorites = [];
  let favClearArmed = false;
  function loadFavorites() {
    try {
      const a = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      favorites = Array.isArray(a) ? a.filter((x) => x && x.type && x.id) : [];
    } catch (err) { favorites = []; }
  }
  function favKey(x) { return x.type + ":" + x.id + (x.type === "view" ? ":" + x.year + ":" + (x.cat || "") : ""); }
  function saveFavorites() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch (err) { /* storage full */ }
    updateFavUI();
  }
  function exportFavorites() {
    if (!favorites.length) return;
    const payload = { app: "world-chronicle", kind: "favorites", version: 1, exportedAt: new Date().toISOString(), favorites };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "world-chronicle-favorites.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showToast(L("收藏已导出：world-chronicle-favorites.json", "Favourites exported", "Favoritos exportados", "Favoris exportés", "تم تصدير المفضلة"));
  }
  const FAV_TYPES = ["event", "country", "route", "view"];
  function normalizeFavorite(x) {
    if (!x || typeof x !== "object") return null;
    const type = typeof x.type === "string" ? x.type : "";
    const id = typeof x.id === "string" ? x.id : (typeof x.id === "number" ? String(x.id) : "");
    if (FAV_TYPES.indexOf(type) < 0 || !id || id.length > 120) return null;
    const year = Number(x.year);
    return {
      type, id,
      year: Number.isFinite(year) ? Math.max(-12000, Math.min(2026, Math.round(year))) : state.year,
      cat: typeof x.cat === "string" ? x.cat.slice(0, 40) : "",
    };
  }
  function importFavorites(text) {
    const bad = L("这不是有效的收藏备份文件", "That file is not a favourites backup", "Ese archivo no es una copia de favoritos", "Ce fichier n’est pas une sauvegarde de favoris", "هذا الملف ليس نسخة مفضلة");
    let data;
    try { data = JSON.parse(text); } catch (err) { showToast(bad); return; }
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.favorites) ? data.favorites : null);
    if (!list) { showToast(bad); return; }
    const seen = new Set(favorites.map(favKey));
    let added = 0;
    for (const raw of list.slice(0, 500)) {
      const x = normalizeFavorite(raw);
      if (!x) continue;
      const k = favKey(x);
      if (seen.has(k)) continue;
      seen.add(k); favorites.push(x); added += 1;
    }
    if (added) { saveFavorites(); lastPanelKey = ""; renderPanel(true); }
    showToast(added
      ? L(`已导入 ${added} 条收藏`, `Imported ${added} favourite${added === 1 ? "" : "s"}`, `Se importaron ${added} favoritos`, `${added} favori${added === 1 ? "" : "s"} importé${added === 1 ? "" : "s"}`, `تم استيراد ${added} من المفضلة`)
      : L("没有新的收藏需要导入", "Nothing new to import", "No hay nada nuevo que importar", "Rien de nouveau à importer", "لا جديد للاستيراد"));
  }
  function pickFavoritesFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.hidden = true;
    input.setAttribute("data-fav-file", "1");
    document.body.appendChild(input);
    input.addEventListener("change", () => {
      const f = input.files && input.files[0];
      if (f) {
        const reader = new FileReader();
        reader.onload = () => importFavorites(String(reader.result || ""));
        reader.onerror = () => showToast(L("无法读取该文件", "Could not read that file", "No se pudo leer el archivo", "Impossible de lire ce fichier", "تعذّرت قراءة الملف"));
        reader.readAsText(f);
      }
      input.remove();
    });
    input.click();
  }
  function currentFavorite() {
    if (state.favoritesOpen) return null;
    if (state.eventView) return { type: "event", id: state.eventView.id, year: state.eventView.y };
    if (state.country) return { type: "country", id: countryKey(state.country), year: state.year };
    if (state.route) return { type: "route", id: state.route, year: state.year };
    return { type: "view", id: "view", year: state.year, cat: state.catFilter || "" };
  }
  function isFavorite(x) { return !!x && favorites.some((f) => favKey(f) === favKey(x)); }
  function toggleFavorite(x) {
    if (!x) return;
    const k = favKey(x);
    if (favorites.some((f) => favKey(f) === k)) {
      favorites = favorites.filter((f) => favKey(f) !== k);
      showToast(L("已取消收藏", "Removed from favourites", "Eliminado de favoritos", "Retiré des favoris", "أُزيل من المفضلة"));
    } else {
      favorites.push(x);
      showToast(L("已加入收藏", "Saved to favourites", "Guardado en favoritos", "Ajouté aux favoris", "أُضيف إلى المفضلة"));
    }
    saveFavorites();
    if (state.favoritesOpen) { lastPanelKey = ""; renderPanel(true); }
  }
  function favTypeLabel(type) {
    return { event: L("事件", "Event", "Evento", "Événement", "حدث"), country: L("国家", "Country", "País", "Pays", "دولة"), route: L("路线", "Route", "Ruta", "Parcours", "مسار"), view: L("时刻", "Moment", "Momento", "Moment", "لحظة") }[type] || type;
  }
  function favTitle(x) {
    if (x.type === "event") { const ev = byId[x.id]; return ev ? evTitle(ev) : x.id; }
    if (x.type === "country") {
      const f = (A.featureByCode && A.featureByCode[x.id]) || (map && map.features || []).find((q) => countryKey(q) === x.id);
      return f ? countryName(f) : x.id;
    }
    if (x.type === "route") { const r = routeById(x.id); return r ? routeText(r.name) : x.id; }
    const cat = x.cat ? " · " + catName(x.cat) : "";
    return fmtYear(x.year, state.lang) + cat;
  }
  function favMeta(x) {
    const y = x.type === "view" ? "" : fmtYear(x.year, state.lang, true) + " · ";
    return y + favTypeLabel(x.type);
  }
  function updateFavUI() {
    const top = el["fav-btn"];
    if (top) {
      const n = favorites.length;
      top.classList.toggle("is-on", state.favoritesOpen);
      top.setAttribute("aria-pressed", String(state.favoritesOpen));
      top.setAttribute("aria-label", L("我的收藏", "My favourites", "Mis favoritos", "Mes favoris", "مفضلتي") + " · " + n);
    }
    if (el["fav-count"]) {
      el["fav-count"].textContent = String(favorites.length);
      el["fav-count"].hidden = favorites.length === 0;
    }
    const btn = el["fav-toggle"];
    if (!btn) return;
    const cur = currentFavorite();
    btn.hidden = !cur;
    if (cur) {
      const on = isFavorite(cur);
      btn.textContent = on ? "★" : "☆";
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? L("取消收藏", "Remove favourite", "Quitar favorito", "Retirer des favoris", "إزالة من المفضلة") : L("收藏当前", "Add to favourites", "Añadir a favoritos", "Ajouter aux favoris", "أضف إلى المفضلة"));
      btn.title = btn.getAttribute("aria-label");
    }
  }
  function openFavorites(push) {
    favClearArmed = false;
    state.favoritesOpen = true;
    state.eventView = null;
    state.eventGroup = null;
    state.selected = null;
    state.country = null;
    state.route = null;
    state.searchQuery = null;
    state.searchResults = [];
    clearTheatreSurface();
    if (map) { map.setSelected(null); map.setHighlight(null); }
    setPanel(true);
    lastPanelKey = "";
    renderPanel(true);
    updateFavUI();
    if (push) syncURL(true);
  }
  function openFavorite(x) {
    if (!x) return;
    state.favoritesOpen = false;
    if (x.type === "event") { const ev = byId[x.id]; if (ev) triggerEvent(ev, "favorites"); return; }
    if (x.type === "country") {
      const f = (A.featureByCode && A.featureByCode[x.id]) || (map.features || []).find((q) => countryKey(q) === x.id);
      if (f) { openCountry(f, { skipGroup: true }); }
      return;
    }
    if (x.type === "route") { openRouteById(x.id); return; }
    state.catFilter = x.cat || null;
    if (map) map.setCatFilter(state.catFilter);
    applyYear(x.year, null, { force: true, noAuto: true });
    setPanel(true);
    lastPanelKey = "";
    renderPanel(true);
    syncURL(true);
  }

  /* ── panel ──────────────────────────────────────── */
  function panelKey() {
    if (state.favoritesOpen) return "fav:" + state.lang + ":" + favorites.length;
    if (state.route) return "r:" + state.route + ":" + state.lang;
    if (state.searchQuery) return "q:" + state.searchQuery + ":" + state.lang;
    if (state.country) return "c:" + countryKey(state.country) + ":" + A.eraOf(state.year).id + ":" + Math.round(state.year / 10);
    return "e:" + A.eraOf(state.year).id + ":" + Math.floor(state.year / 2);
  }

  /* ── event registry / groups ────────────────────── */
  function detailFor(ev) {
    return (ev && A.eventDetails && A.eventDetails[ev.id]) || null;
  }

  function textOf(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[state.lang] || obj.en || obj.zh || "";
  }

  function groupForEvent(ev) {
    if (!ev || !A.eventGroups) return null;
    for (const g of Object.values(A.eventGroups)) {
      if (g.events && g.events.includes(ev.id)) return g;
    }
    return null;
  }

  function groupForCountryAtYear(f, year) {
    if (!f || !A.eventGroups) return null;
    const code = f.properties.iso3 || f.properties.iso2;
    for (const g of Object.values(A.eventGroups)) {
      if (g.year !== year) continue;
      if ((g.countries || []).includes(code) || (g.countries || []).includes(f.properties.iso2)) return g;
    }
    return null;
  }

  function groupEvents(g) {
    if (!g || !g.events) return [];
    return g.events.map((id) => byId[id]).filter(Boolean);
  }

  function autoGroupForCountry(f, year) {
    if (!f) return null;
    const evs = A.events
      .filter((e) => e._country === f && e.y === year && e.f)
      .sort((a, b) => {
        const pa = (detailFor(a) && detailFor(a).trigger && detailFor(a).trigger.priority) || 60;
        const pb = (detailFor(b) && detailFor(b).trigger && detailFor(b).trigger.priority) || 60;
        return pb - pa || (a.t[1] || "").localeCompare(b.t[1] || "");
      });
    if (!evs.length) return null;
    const nm = countryName(f);
    return {
      id: "auto-" + countryKey(f) + "-" + year,
      name: { zh: nm + " · " + fmtYear(year, "zh", true), en: nm + " · " + fmtYear(year, "en", true) },
      year,
      countries: [f.properties.iso3, f.properties.iso2].filter(Boolean),
      lead: evs[0].id,
      events: evs.map((e) => e.id),
      auto: true,
    };
  }

  function triggerEvent(ev, source, opts) {
    if (!ev) return;
    const now = performance.now();
    if (state.lastTrigger && state.lastTrigger.id === ev.id && now - state.lastTrigger.at < 600) return;
    state.lastTrigger = { id: ev.id, at: now };
    if (!(opts && opts.auto)) {
      const ae = document.activeElement;
      lastFocusEl = (ae && ae !== document.body && ae.focus) ? ae : null;
    }
    openEvent(ev, opts);
    if (source === "country") setPanel(true);
  }

  function triggerGroup(g, opts) {
    if (!g) return;
    const ev = byId[g.lead] || groupEvents(g)[0];
    if (!ev) return;
    state.eventGroup = g;
    triggerEvent(ev, "group", opts);
    lastPanelKey = "";
    renderPanel(true);
  }

  function keyEventsForCountry(f) {
    if (!f) return [];
    return A.events
      .filter((e) => e._country === f && (e.f || (A.eventDetails && A.eventDetails[e.id])))
      .slice()
      .sort((a, b) => a.y - b.y || (a.t[1] || "").localeCompare(b.t[1] || ""));
  }

  function verifyLabel(v) {
    const map = {
      verified: L("已核史实", "Verified", "Verificado", "Vérifié", "موثّق"),
      partial: L("部分核实", "Partly verified", "Parcialmente verificado", "Partiellement vérifié", "موثّق جزئيًا"),
      brief: L("简要条目", "Brief entry", "Entrada breve", "Notice brève", "مدخل موجز"),
      pending: L("待史实确认", "Awaiting verification", "Pendiente de verificación", "En attente de vérification", "بانتظار التحقق"),
    };
    return map[v] || map.brief;
  }

  function renderFavoritesPanel(force) {
    const key = "fav:" + state.lang + ":" + favorites.map(favKey).join(",");
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;
    el["panel-kicker"].textContent = L("我的收藏 · ", "MY FAVOURITES · ", "MIS FAVORITOS · ", "MES FAVORIS · ", "مفضلتي · ") + favorites.length;
    el["panel-title"].textContent = L("收藏与书签", "Favourites & bookmarks", "Favoritos y marcadores", "Favoris et signets", "المفضلة والعلامات");
    el["panel-sub"].textContent = L("保存在本机浏览器中；不会上传。", "Stored in this browser only; never uploaded.", "Guardado solo en este navegador; nunca se sube.", "Enregistré dans ce navigateur uniquement ; jamais envoyé.", "محفوظة في هذا المتصفح فقط؛ لا تُرفع.");
    let html = `<button class="panel-back" data-fav-close="1">‹ ${L("返回时代", "Back to the age", "Volver a la era", "Retour à l’âge", "العودة إلى العصر")}</button>`;
    if (!favorites.length) {
      html += `<div class="panel-empty">${L("还没有收藏。打开事件、国家或路线后，点面板右上角的星标即可保存；时代视图也会保存当前年份与筛选。", "Nothing saved yet. Open an event, country or route and use the star at the top of the panel; era views save the current year and filter.", "Aún no hay nada guardado. Abre un evento, país o ruta y usa la estrella del panel; las vistas de época guardan el año y el filtro.", "Rien d’enregistré. Ouvrez un événement, un pays ou un parcours et utilisez l’étoile du panneau ; les vues d’époque gardent l’année et le filtre.", "لا يوجد محفوظ بعد. افتح حدثًا أو دولة أو مسارًا واستخدم النجمة أعلى اللوحة؛ تحفظ عروض العصور السنة والمرشح.")}</div>`;
    } else {
      html += `<div class="fav-list">`;
      favorites.forEach((x, i) => {
        const on = x.type === "event" ? isFavorite(x) : true;
        html += `<div class="fav-row"><button class="fav-open" type="button" data-fav-open="${i}"><span class="fav-kind">${favTypeLabel(x.type)}</span><span class="fav-text"><b>${favTitle(x)}</b><small>${favMeta(x)}</small></span></button><button class="fav-remove" type="button" data-fav-remove="${i}" aria-label="${L("移除收藏", "Remove favourite", "Quitar favorito", "Retirer des favoris", "إزالة من المفضلة")}" title="${L("移除", "Remove", "Quitar", "Retirer", "إزالة")}">×</button></div>`;
      });
      html += `</div>`;
      if (favClearArmed) {
        html += `<div class="fav-confirm" role="group" aria-label="${L("确认清空收藏", "Confirm clearing favourites", "Confirmar vaciado", "Confirmer la suppression", "تأكيد مسح المفضلة")}"><span>${L("确定清空全部 " + favorites.length + " 条收藏？此操作不可撤销。", "Clear all " + favorites.length + " favourites? This cannot be undone.", "¿Vaciar los " + favorites.length + " favoritos? No se puede deshacer.", "Vider les " + favorites.length + " favoris ? Action irréversible.", "مسح كل " + favorites.length + " من المفضلة؟ لا يمكن التراجع.")}</span><button type="button" class="fav-tool is-danger" data-fav-clear-yes="1">${L("清空", "Clear", "Vaciar", "Vider", "مسح")}</button><button type="button" class="fav-tool" data-fav-clear-no="1">${L("取消", "Cancel", "Cancelar", "Annuler", "إلغاء")}</button></div>`;
      } else {
        html += `<button class="fav-clear" type="button" data-fav-clear="1">${L("清空收藏", "Clear favourites", "Vaciar favoritos", "Vider les favoris", "مسح المفضلة")}</button>`;
      }
    }
    if (!favorites.length) html += `<div class="fav-tools-label">${L("从备份恢复", "Restore from a backup", "Restaurar desde una copia", "Restaurer depuis une sauvegarde", "الاستعادة من نسخة احتياطية")}</div>`;
    html += `<div class="fav-tools">${favorites.length ? `<button type="button" class="fav-tool" data-fav-export="1">${L("导出备份", "Export", "Exportar", "Exporter", "تصدير")}</button>` : ""}<button type="button" class="fav-tool" data-fav-import="1">${L("导入备份", "Import", "Importar", "Importer", "استيراد")}</button></div>`;
    html += `<div class="panel-note">${L("收藏保存在 localStorage；换浏览器或清除站点数据后会丢失，可导出 JSON 备份。", "Favourites live in localStorage; clearing site data or switching browsers removes them — export a JSON backup to keep them.", "Los favoritos viven en localStorage; borrar los datos del sitio los elimina: exporta una copia JSON para conservarlos.", "Les favoris vivent dans localStorage ; effacer les données du site les supprime — exportez une sauvegarde JSON.", "تُحفظ المفضلة في localStorage؛ ومسح بيانات الموقع يزيلها — صدّر نسخة JSON للاحتفاظ بها.")}</div>`;
    el["panel-body"].innerHTML = html;
    el["panel-body"].scrollTop = 0;
  }

  function renderEventPanel(force) {
    const ev = state.eventView;
    if (!ev) return;
    if (!A.eventDetails) ensureDetails();
    const d = detailFor(ev) || {};
    const key = "ev:" + ev.id + ":" + state.lang + (state.eventGroup ? ":g" : "");
    if (!force && key === lastPanelKey) return;
    const changed = key !== lastPanelKey;
    lastPanelKey = key;
    const scroll = el["panel-body"].scrollTop;

    el["panel-kicker"].textContent = (state.eventGroup ? textOf(state.eventGroup.name) + " · " : "") +
      L("重大事件 · ", "MAJOR EVENT · ", "ACONTECIMIENTO · ", "ÉVÉNEMENT · ", "حدث كبرى · ") +
      fmtYear(ev.y, state.lang, true) + " · " + catName(ev.k);
    el["panel-title"].textContent = evTitle(ev);
    // The header carries a one-line summary, not just the foreign title.
    const summary = d.summary ? textOf(d.summary) : evDesc(ev);
    const shortSummary = summary.length > (state.lang === "zh" ? 58 : 118)
      ? summary.slice(0, state.lang === "zh" ? 58 : 118).replace(/[\s,，;；:：]+$/, "") + "…"
      : summary;
    el["panel-sub"].textContent = shortSummary;

    const pinfo = placeInfo(ev);
    const place = pinfo.main;
    const actors = (d.actors || []).map((a) => textOf(a)).filter(Boolean);
    const dateText = d.date ? (textOf(d.date) || fmtYear(ev.y, state.lang)) : fmtYear(ev.y, state.lang);
    const sourceLinks = (d.sources || []).filter((s) => s.url).slice(0, 4);

    let html = `<button class="panel-back" data-ev-close="1">‹ ${L("返回时代", "Back to the age", "Volver a la era", "Retour à l’âge", "العودة إلى العصر")}</button>`;
    html += `<div class="ev-detail-meta">`;
    html += `<div><span>${L("时间", "DATE", "FECHA", "DATE", "التاريخ")}</span><b>${dateText}</b></div>`;
    html += `<div><span>${L("地点", "PLACE", "LUGAR", "LIEU", "المكان")}</span><b>${place || L("待确认", "TBD", "Por confirmar", "À confirmer", "قيد التأكيد")}</b>${pinfo.sub ? `<small class="meta-sub">${pinfo.sub}</small>` : ""}</div>`;
    html += `<div><span>${L("主要参与方", "ACTORS", "ACTORES", "ACTEURS", "الأطراف")}</span><b>${actors.length ? actors.join(" · ") : L("待补", "To be added", "Por añadir", "À compléter", "قيد الإضافة")}</b></div>`;
    html += `<div><span>${L("校验", "VERIFICATION", "VERIFICACIÓN", "VÉRIFICATION", "التحقق")}</span><b>${verifyLabel(d.verification || "brief")}</b></div>`;
    html += `</div>`;

    if (summary) html += `<section class="ev-detail-section"><h4>${L("摘要", "SUMMARY", "RESUMEN", "RÉSUMÉ", "الملخص")}</h4><p>${summary}</p></section>`;
    if (d.why) {
      const why = textOf(d.why);
      if (why) html += `<section class="ev-detail-section ev-why"><h4>${L("为何重要", "WHY IT MATTERS", "POR QUÉ IMPORTA", "POURQUOI C’EST IMPORTANT", "لماذا يهم")}</h4><p>${why}</p></section>`;
    }
    const sections = [
      ["background", L("背景", "BACKGROUND", "CONTEXTO", "CONTEXTE", "الخلفية")],
      ["course", L("经过", "COURSE", "DESARROLLO", "DÉROULEMENT", "مجريات الحدث")],
      ["outcome", L("结果与影响", "OUTCOME", "RESULTADO", "CONSÉQUENCES", "النتائج والأثر")],
    ];
    if (A.detailsLoading && !d.background) {
      html += `<div class="detail-skeleton" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;
    } else for (const [key, label] of sections) {
      const val = d[key] ? textOf(d[key]) : "";
      if (val) html += `<section class="ev-detail-section"><h4>${label}</h4><p>${val}</p></section>`;
      else if (key === "background") html += `<section class="ev-detail-section"><h4>${label}</h4><p class="ev-missing">${L("本条为策展摘要：长文、参与方与来源仍待补齐，不以推测填充。", "This is a curated summary: long-form text, actors and sources are still pending and are not invented.", "Este es un resumen curatorial: el texto largo, los actores y las fuentes están pendientes y no se inventan.", "Ceci est un résumé curatorial : le texte long, les acteurs et les sources restent à compléter et ne sont pas inventés.", "هذا ملخص تخطيطي: النص الطويل والأطراف والمصادر قيد الإضافة، ولا تُختلق.")}</p></section>`;
    }

    const chainIds = state.eventGroup ? (state.eventGroup.events || []) : ((d.chain && d.chain.length) ? d.chain : []);
    const chain = chainIds.map((id) => byId[id]).filter((e) => e && e.id !== ev.id);
    if (chain.length) {
      html += `<section class="ev-detail-section"><h4>${L("同一事件链", "EVENT CHAIN", "CADENA DE EVENTOS", "CHAÎNE D’ÉVÉNEMENTS", "سلسلة الأحداث")}</h4><div class="ev-chain">`;
      for (const e of chain) {
        html += `<button class="ev-chain-row" data-ev="${e.id}"><time>${fmtYear(e.y, state.lang, true)}</time><span>${evTitle(e)}</span><em>${L("播放", "PLAY", "VER", "VOIR", "تشغيل")}</em></button>`;
      }
      html += `</div></section>`;
    }

    if (sourceLinks.length) {
      html += `<section class="ev-detail-section"><h4>${L("来源", "SOURCES", "FUENTES", "SOURCES", "المصادر")}</h4>`;
      sourceLinks.forEach((s) => { html += `<p><a href="${s.url}" target="_blank" rel="noopener">${s.label || s.url}</a></p>`; });
      html += `</section>`;
    }

    const paused = !!(window.MapTheatre && window.MapTheatre.paused);
    const pauseLabel = paused ? L("继续动态", "Resume dynamic", "Reanudar dinámica", "Reprendre la dynamique", "متابعة الحركة") : L("暂停动态", "Pause dynamic", "Pausar dinámica", "Pause dynamique", "إيقاف الحركة");
    html += `<div class="ev-detail-actions">`;
    html += `<button class="primary" data-ev-modal="${ev.id}">${L("展开史志", "Open full record", "Abrir ficha", "Ouvrir la fiche", "فتح السجل")}</button>`;
    html += `<button class="ev-pause" type="button" data-theatre-pause="1" aria-label="${pauseLabel}" title="${pauseLabel}">${paused ? "▶" : "❚❚"}</button>`;
    html += `<details class="ev-more"><summary aria-label="${L("更多操作", "More actions", "Más acciones", "Autres actions", "مزيد من الإجراءات")}" title="${L("更多操作", "More actions", "Más acciones", "Autres actions", "مزيد من الإجراءات")}">⋯</summary><div class="ev-more-menu">`;
    html += `<button type="button" data-ev="${ev.id}">${L("重新播放动态", "Replay dynamic", "Repetir dinámica", "Relancer la dynamique", "إعادة الحركة")}</button>`;
    html += `<button type="button" data-ev-voice="1">${L("朗读", "Read aloud", "Leer", "Lire", "قراءة")}</button>`;
    html += `<button type="button" data-ev-share="1">${L("复制链接", "Copy link", "Copiar enlace", "Copier le lien", "نسخ الرابط")}</button>`;
    html += `<button type="button" data-share-card="1">${L("分享卡片", "Share card", "Tarjeta para compartir", "Carte à partager", "بطاقة للمشاركة")}</button>`;
    if (ev._country) html += `<button type="button" data-country-open="${countryKey(ev._country)}">${L("国家沿革", "Country chronicle", "Crónica del país", "Chronique du pays", "سجل الدولة")}</button>`;
    html += `</div></details></div>`;
    html += `<div class="ev-verify${d.verification === "verified" ? " is-verified" : d.verification === "pending" ? " is-pending" : ""}"><i></i>${verifyLabel(d.verification || "brief")}${d.verification === "brief" ? " · " + L("长文待补，不编造", "long form pending, not invented", "texto largo pendiente", "texte long à compléter", "النص الطويل قيد الإضافة") : ""}</div>`;

    el["panel-body"].innerHTML = html;
    el["panel-body"].scrollTop = changed ? 0 : scroll;
  }

  function renderPanel(force) {
    if (!el["panel-body"]) return;
    if (el["side-panel"]) el["side-panel"].classList.toggle("event-mode", !!state.eventView);
    updateFavUI();
    if (!map || !map.features) {
      el["panel-kicker"].textContent = t("brand");
      el["panel-title"].textContent = L("正在展开舆图", "Unfolding the atlas", "Desplegando el atlas", "Déploiement de l’atlas", "جارٍ فتح الأطلس");
      el["panel-sub"].textContent = "";
      el["panel-body"].innerHTML = `<div class="panel-empty">${L("地图数据载入后，此处会呈现此刻并立的文明与时代节点。", "Civilizations and nodes of this moment will appear once the map has loaded.", "Cuando carguen los datos del mapa, aquí aparecerán las civilizaciones y los nodos de este momento.", "Une fois les données chargées, les civilisations et les nœuds de ce moment apparaîtront ici.", "بعد تحميل بيانات الخريطة ستظهر هنا حضارات وعُقد هذه اللحظة.")}</div>`;
      return;
    }
    const showRoutes = !state.eventView && !state.country && !state.route && !state.searchQuery && !state.favoritesOpen;
    if (el["panel-routes"]) el["panel-routes"].innerHTML = showRoutes ? routeStrip() : "";
    if (state.favoritesOpen) { renderFavoritesPanel(force); return; }
    if (state.eventView) { renderEventPanel(force); return; }
    if (state.country) { renderCountryPanel(force); return; }
    if (state.route) { renderRoutePanel(force); return; }
    if (state.searchQuery) { renderSearchPanel(force); return; }

    const era = A.eraOf(state.year);
    el["panel-kicker"].textContent = L("此刻世界 · ", "THE WORLD AT ", "EL MUNDO EN ", "LE MONDE EN ", "العالم في ") + fmtYear(state.year, state.lang, true);
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
    const eraEventsAll = A.events.filter((e) => e.y >= era.from && (e.y < era.to || era === A.eras[A.eras.length - 1]));
    const eraEvents = filteredEvents(eraEventsAll);
    const seen = new Set();
    const polities = active.filter((a) => {
      if (a.a < 0.18 || seen.has(a.p.id)) return false;
      seen.add(a.p.id);
      return true;
    }).slice(0, 18);
    const moderns = state.year >= 1995 ? modernStatesAt(state.year) : [];

    let html = "";
    const modernCollapsed = isMobilePanel() && !state.modernOpen;
    const modernChip = modernCollapsed && moderns.length
      ? `<button class="cat-chip modern-chip" type="button" data-modern-toggle="1" aria-expanded="false">${L("现代国家", "MODERN", "ESTADOS", "ÉTATS", "الدول")} <small>${moderns.length} ▸</small></button>`
      : "";
    html += catFilterRow(eraEventsAll, modernChip);
    if (moderns.length && modernCollapsed) {
      // the entry lives as a chip inside the filter row; no extra section row
    } else if (moderns.length) {
      html += `<section class="p-section"><h3>${L("现代国家", "MODERN STATES", "ESTADOS MODERNOS", "ÉTATS MODERNES", "الدول الحديثة")} · ${moderns.length}</h3><div class="polity-list">`;
      (state.modernExpanded ? moderns : moderns.slice(0, 8)).forEach((e) => {
        const f = A.featureByCode && A.featureByCode[e.code];
        const rg = f ? byRegion(f.properties.sub) : "";
        const nm = modernEntityName(e);
        html += `<button class="polity-chip" data-country-open="${e.code}"><i style="background:${rg ? regionColor(rg) : "#8a6a3f"}"></i>${nm}<small>${rg ? rgName(rg) : ""}</small></button>`;
      });
      html += `</div>`;
      if (moderns.length > 8) {
        html += `<button class="polity-more" type="button" data-modern-more="1" aria-expanded="${state.modernExpanded}">${state.modernExpanded ? L("收起", "Show fewer", "Mostrar menos", "Réduire", "أقل") : L("全部 " + moderns.length, "All " + moderns.length, "Todos " + moderns.length, "Tous les " + moderns.length, "كل " + moderns.length)}</button>`;
      }
      if (isMobilePanel()) {
        html += `<button class="polity-more" type="button" data-modern-toggle="1" aria-expanded="true">${L("收起现代国家", "Hide modern states", "Ocultar Estados", "Masquer les États", "إخفاء الدول")}</button>`;
      }
      html += `<div class="panel-note-inline">${L("按现代国界列出；点击查看该国沿革。", "Listed by modern borders; click for the country chronicle.", "Listados por fronteras modernas; haz clic para ver la crónica.", "Listés par frontières modernes ; cliquez pour la chronique.", "مرتبة حسب الحدود الحديثة؛ انقر لسجل الدولة.")}</div></section>`;
    }
    html += `<section class="p-section"><h3>${L("时代节点", "NODES OF THE AGE", "NODOS DE LA ERA", "NŒUDS DE L’ÂGE", "عُقد العصر")} · ${eraEvents.length}</h3>`;
    html += `<div class="event-list">`;
    if (!eraEvents.length) {
      html += `<div class="panel-empty">${L("此时代暂无策展节点。", "No curated nodes in this age yet.", "Aún no hay nodos en esta era.", "Pas encore de nœuds pour cet âge.", "لا عُقد بعد في هذا العصر.")}</div>`;
    } else {
      html += eventList(eraEvents);
    }
    html += `</div></section>`;

    if (polities.length) {
      html += `<section class="p-section"><h3>${L("并立文明", "CONTEMPORARIES", "CONTEMPORÁNEOS", "CONTEMPORAINS", "معاصرون")}</h3><div class="polity-list">`;
      polities.forEach(({ p }) => {
        html += `<button class="polity-chip" data-polity="${p.id}"><i style="background:${regionColor(p.rg)}"></i>${nameOf(p.n)}<small>${fmtRange(p.y1, p.y2)}</small></button>`;
      });
      html += `</div></section>`;
    }
    if (!polities.length && !moderns.length) {
      html += `<section class="p-section"><h3>${L("并立文明", "CONTEMPORARIES", "CONTEMPORÁNEOS", "CONTEMPORAINS", "معاصرون")}</h3><div class="panel-empty">${L("此时期的数据尚未收录具名政权；不代表历史上没有政权。", "No named polities are charted for this moment; this does not mean none existed.", "No hay poderes con nombre cartografiados; no significa que no existieran.", "Aucun pouvoir nommé n’est cartographié ; cela ne signifie pas qu’il n’en existait aucun.", "لا توجد كيانات مسماة مرسومة لهذه اللحظة؛ وهذا لا يعني عدم وجودها.")}</div></section>`;
    }

    const changes = stateChangesNear(state.year);
    if (changes.length) {
      html += `<section class="p-section"><h3>${L("国家兴亡", "STATES RISING AND FALLING", "AUGE Y CAÍDA DE ESTADOS", "NAISSANCES ET CHUTES D’ÉTATS", "قيام الدول وزوالها")} · ${changes.length}</h3><div class="change-list">`;
      changes.forEach(({ x, type, i }) => { html += changeRow(x, type, i); });
      html += `</div></section>`;
    }

    html += `<div class="panel-note">${L("点击节点展开动态场景；拖动时间轴，世界随之明灭。", "Click a node for its scene; drag the timeline and watch the world change.", "Haz clic en un nodo para ver su escena; arrastra el tiempo y observa el mundo.", "Cliquez un nœud pour sa scène ; faites glisser le temps et regardez le monde changer.", "انقر عقدة لترى مشهدها؛ اسحب الزمن وشاهد العالم يتغير.")}</div>`;

    el["panel-body"].innerHTML = html;
    if (force && !state.playing) {
      const body = el["panel-body"];
      if (moderns.length) {
        body.scrollTop = 0;
      } else {
        const nd = body.querySelector(".now-divider");
        body.scrollTop = nd ? Math.max(0, nd.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 76) : 0;
      }
    } else {
      el["panel-body"].scrollTop = scroll;
    }
  }

  function openRouteById(routeId) {
    const def = routeById(routeId);
    if (!def) return;
    state.favoritesOpen = false;
    state.route = routeId;
    state.searchQuery = null;
    state.searchResults = [];
    state.country = null;
    state.eventView = null;
    state.eventGroup = null;
    state.selected = null;
    state.autoOpened = false;
    state.catFilter = null;
    if (map) map.setCatFilter(null);
    clearTheatreSurface();
    const first = def.events.map((id) => byId[id]).filter(Boolean).sort((a, b) => a.y - b.y)[0];
    if (first && first.y !== state.year) applyYear(first.y, null, { force: true, silentEvent: true, noAuto: true });
    setPanel(true);
    lastPanelKey = "";
    renderPanel(true);
    syncURL(true);
  }

  function openRandomEvent() {
    const pool = A.events.filter((e) => e.f);
    if (pool.length) triggerEvent(pool[Math.floor(Math.random() * pool.length)], "panel");
  }

  function renderRoutePanel(force) {
    const r = routeById(state.route);
    if (!r) return;
    const key = "route:" + r.id + ":" + state.lang;
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;
    const evs = r.events.map((id) => byId[id]).filter(Boolean).sort((a, b) => a.y - b.y);
    el["panel-kicker"].textContent = L("主题路线 · ", "THEMED ROUTE · ", "RUTA TEMÁTICA · ", "PARCOURS · ", "مسار · ") + evs.length;
    el["panel-title"].textContent = routeText(r.name);
    el["panel-sub"].textContent = routeText(r.desc);
    let html = `<div class="panel-topbar"><button class="panel-back" data-route-close="1">‹ ${L("返回时代", "Back to the age", "Volver a la era", "Retour à l’âge", "العودة إلى العصر")}</button><button type="button" class="panel-tool" data-route-share="1">${L("分享卡片", "Share card", "Tarjeta para compartir", "Carte à partager", "بطاقة للمشاركة")}</button></div>`;
    html += `<div class="event-list">${eventList(evs, { now: false })}</div>`;
    html += `<div class="panel-note">${L("按时间顺序排列；点击节点可继续查看地图剧场与详情。", "In chronological order; click a node for its map theatre and dossier.", "En orden cronológico; haz clic para el teatro y la ficha.", "Par ordre chronologique ; cliquez pour le théâtre et la fiche.", "بترتيب زمني؛ انقر لمشهد الخريطة والملف.")}</div>`;
    el["panel-body"].innerHTML = html;
    el["panel-body"].scrollTop = 0;
  }

  function renderSearchPanel(force) {
    const key = "search:" + state.searchQuery + ":" + state.lang;
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;
    const evs = (state.searchResults || []).map((id) => byId[id]).filter(Boolean);
    el["panel-kicker"].textContent = L("搜索结果 · ", "SEARCH · ", "BÚSQUEDA · ", "RECHERCHE · ", "بحث · ") + evs.length;
    el["panel-title"].textContent = state.searchQuery;
    el["panel-sub"].textContent = L("事件 " + evs.length + " 条；按时间排序。", evs.length + " events, in chronological order.", evs.length + " eventos, en orden cronológico.", evs.length + " événements, par ordre chronologique.", evs.length + " حدثًا بترتيب زمني.");
    let html = `<button class="panel-back" data-search-close="1">‹ ${L("返回时代", "Back to the age", "Volver a la era", "Retour à l’âge", "العودة إلى العصر")}</button>`;
    html += `<div class="event-list">${eventList(evs, { now: false })}</div>`;
    html += `<div class="panel-note">${L("搜索范围：事件标题与摘要、文明名、国家名。", "Search covers event titles and summaries, civilizations and countries.", "La búsqueda cubre títulos y resúmenes, civilizaciones y países.", "La recherche couvre titres et résumés, civilisations et pays.", "يشمل البحث عناوين الأحداث وملخصاتها والحضارات والدول.")}</div>`;
    el["panel-body"].innerHTML = html;
    el["panel-body"].scrollTop = 0;
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
        <div class="chr-name">${nm}${birth ? `<em class="chr-birth">${L("新生 ", "born ", "nace ", "né en ", "قيام ")}${birth.year}</em>` : ""}</div>
        ${list.length ? `<div class="chr-events">${list.map(eventRow).join("")}</div>` : ""}
      </section>`;
    });
    html += "</div>";
    return html;
  }

  function nowDivider() {
    return '<div class="now-divider"><span>' + L("此刻 · ", "NOW · ", "AHORA · ", "MAINTENANT · ", "الآن · ") + fmtYear(state.year, state.lang, true) + "</span></div>";
  }

  function routeStrip() {
    const chips = ROUTES.map((r) =>
      '<button class="route-chip" data-route="' + r.id + '">' + routeText(r.name) + " <small>" + r.events.length + "</small></button>"
    ).join("") +
      '<button class="route-chip random" data-random="1">' + L("随机一瞥", "Random glimpse", "Vistazo aleatorio", "Aperçu aléatoire", "لمحة عشوائية") + "</button>";
    const open = state.routeStripOpen;
    return '<div class="route-strip' + (open ? " is-open" : "") + '">' +
      '<button class="route-strip-toggle" type="button" data-route-strip-toggle="1" aria-expanded="' + open + '" aria-controls="route-chips">' +
      '<span>' + L("探索路线", "EXPLORE ROUTES", "RUTAS PARA EXPLORAR", "PARCOURS À EXPLORER", "مسارات للاستكشاف") + "</span>" +
      "<small>· " + ROUTES.length + "</small><i aria-hidden=\"true\">" + (open ? "▴" : "▾") + "</i></button>" +
      '<div class="route-chips" id="route-chips"' + (open ? "" : " hidden") + ">" + chips + "</div></div>";
  }

  function catFilterRow(events, extra) {
    if (!events || !events.length) return "";
    const counts = {};
    events.forEach((e) => { counts[e.k] = (counts[e.k] || 0) + 1; });
    const allKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const narrow = isMobilePanel();
    const keys = narrow ? allKeys.slice() : (state.catFilterExpanded ? allKeys.slice() : allKeys.slice(0, 5));
    if (state.catFilter && keys.indexOf(state.catFilter) < 0) keys.push(state.catFilter);
    let html = '<div class="cat-filter" role="group" aria-label="' + L("按类别筛选", "Filter by category", "Filtrar por categoría", "Filtrer par catégorie", "تصفية حسب الفئة") + '">';
    if (extra) html += extra;
    html += '<button class="cat-chip' + (!state.catFilter ? " is-on" : "") + '" data-cat-filter="" aria-pressed="' + (!state.catFilter) + '">' + L("全部", "All", "Todo", "Tout", "الكل") + " " + events.length + "</button>";
    keys.forEach((k) => {
      const c = A.categories[k] || { color: "#8a6a3f" };
      const on = state.catFilter === k;
      html += '<button class="cat-chip' + (on ? " is-on" : "") + '" data-cat-filter="' + k + '" aria-pressed="' + on + '"><i style="background:' + c.color + '"></i>' + catName(k) + " <small>" + counts[k] + "</small></button>";
    });
    if (!narrow && allKeys.length > 5) {
      html += '<button class="cat-chip more" data-cat-more="1">' + (state.catFilterExpanded ? L("收起", "Less", "Menos", "Moins", "أقل") : L("更多 +", "More +", "Más +", "Plus +", "المزيد +")) + "</button>";
    }
    html += "</div>";
    return html;
  }

  function filteredEvents(evs) {
    if (!state.catFilter) return evs;
    return evs.filter((e) => e.k === state.catFilter);
  }

  function eventList(evs, opts) {
    opts = opts || {};
    const showNow = opts.now !== false;
    let html = "";
    let placed = false;
    evs.forEach((ev) => {
      if (showNow && !placed && ev.y >= state.year - 0.5) { html += nowDivider(); placed = true; }
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
      <span class="er-meta"><i class="cat-shape shape-${catShape(ev.k)}" style="background:${cat.color}"></i>${catName(ev.k)} · ${rgName(ev.rg)}${future ? " · " + L("未至", "ahead", "próximo", "à venir", "قادم") : ""}</span></span>
    </button>`;
  }

  function renderCountryPanel(force) {
    const f = state.country;
    if (!f) return;
    if (!A.chronicles) ensureChronicles();
    const p = f.properties;
    const isTW = countryKey(f) === "TWN";
    el["panel-kicker"].textContent = (isTW ? L("中国台湾 · ", "TAIWAN, CHINA · ", "TAIWÁN (CHINA) · ", "TAÏWAN (CHINE) · ", "تايوان (الصين) · ") : L("现代国界 · ", "MODERN BORDERS · ", "FRONTERAS MODERNAS · ", "FRONTIÈRES MODERNES · ", "الحدود الحديثة · ")) + rgName(byRegion(p.sub));
    el["panel-title"].textContent = countryName(f);
    el["panel-sub"].textContent = isTW
      ? L("台湾是中国的一个省；此处按地区沿革展示历史政权与节点。", "Taiwan is a province of China; this view reads its historical powers and nodes through that province.", "Taiwán es una provincia de China; esta vista muestra sus poderes y nodos históricos.", "Taïwan est une province de Chine ; cette vue présente ses pouvoirs et nœuds historiques.", "تايوان مقاطعة صينية؛ يعرض هذا القسم قواها وعقدها التاريخية.")
      : L("此处历史上的政权与节点，皆以现代国界为参照。", "Historical powers and nodes, read through the lens of modern borders.", "Poderes y nodos históricos leídos a través de las fronteras modernas.", "Pouvoirs et nœuds historiques lus à travers les frontières modernes.", "القوى والعُقد التاريخية من خلال الحدود الحديثة.");

    const key = panelKey();
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;

    const evs = A.events.filter((e) => e._country === f);
    const here = politiesAt(p.ly, p.lx);
    const isCN = countryKey(f) === "CHN";
    const regimes = isCN ? chinaRegimesAt(state.year) : [];
    const scroll = el["panel-body"].scrollTop;

    let html = `<div class="panel-topbar"><button class="panel-back" data-back="1">‹ ${L("返回时代", "Back to the age", "Volver a la era", "Retour à l’âge", "العودة إلى العصر")}</button><button type="button" class="panel-tool" data-country-share="1">${L("分享卡片", "Share card", "Tarjeta para compartir", "Carte à partager", "بطاقة للمشاركة")}</button></div>`;
    html += `<div class="country-flags"><span class="country-tag">${countryKey(f)}</span><span class="country-tag">${p.cont || ""}</span><span class="country-tag">${evs.length} ${L("节点", "nodes", "nodos", "nœuds", "عقدة")}</span></div>`;

    const hereTitle = regimes.length
      ? L("江山时序 · 并立政权", "CHRONICLE · RIVAL REGIMES", "CRÓNICA · REGÍMENES RIVALES", "CHRONIQUE · RÉGIMES RIVAUX", "السجل · أنظمة متنافسة")
      : L("此处此时", "HERE, NOW", "AQUÍ, AHORA", "ICI, MAINTENANT", "هنا الآن");
    html += `<section class="p-section"><h3>${hereTitle} · ${fmtYear(state.year, state.lang, true)}</h3><div class="polity-list">`;
    if (regimes.length) {
      regimes.forEach((e) => {
        html += `<span class="polity-chip"><i style="background:${e.type === "culture" ? "#8a7a9a" : "#b0432c"}"></i>${e.name}<small>${fmtRange(e.from, e.to)}</small></span>`;
      });
    } else if (here.length) {
      here.forEach(({ p: pol, d }) => {
        html += `<button class="polity-chip" data-polity="${pol.id}"><i style="background:${regionColor(pol.rg)}"></i>${nameOf(pol.n)}<small>${fmtRange(pol.y1, pol.y2)}</small></button>`;
      });
    } else {
      html += `<span class="panel-empty">${L("这一时期，此地不在已标注的主要势力光晕内。", "In this period the area lies outside the principal halos charted here.", "En este periodo el área queda fuera de los principales halos cartografiados.", "Durant cette période, la région est hors des principaux halos cartographiés.", "في هذه الفترة تقع المنطقة خارج الهالات الرئيسية المرسومة.")}</span>`;
    }
    html += `</div></section>`;

    const keyEvsAll = keyEventsForCountry(f);
    const keyEvs = filteredEvents(keyEvsAll);
    if (keyEvsAll.length) {
      html += `<section class="p-section"><h3>${L("重大事件", "MAJOR EVENTS", "ACONTECIMIENTOS", "ÉVÉNEMENTS", "أحداث كبرى")} · ${keyEvs.length}</h3>`;
      html += catFilterRow(keyEvsAll);
      html += `<div class="event-list">`;
      keyEvs.slice(0, 12).forEach((e) => { html += eventRow(e); });
      html += `</div></section>`;
    }

    const chr = chronicleHtml(f);
    html += `<section class="p-section"><h3>${isTW ? L("地区沿革", "A PROVINCIAL CHRONICLE", "CRÓNICA PROVINCIAL", "CHRONIQUE PROVINCIALE", "سجل المقاطعة") : L("国家沿革长卷", "A COUNTRY CHRONICLE", "CRÓNICA DEL PAÍS", "CHRONIQUE DU PAYS", "سجل الدولة")} · ${evs.length}</h3>`;
    if (chr) {
      html += chr;
    } else if (!A.chronicles) {
      html += `<div class="chronicle-loading"><div class="detail-skeleton" aria-hidden="true"><i></i><i></i><i></i></div><span>${L("正在载入国家沿革…", "Loading the country chronicle…", "Cargando la crónica del país…", "Chargement de la chronique du pays…", "جارٍ تحميل سجل الدولة…")}</span></div>`;
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

  const NON_SOVEREIGN = { HKG: 1, MAC: 1, TWN: 1, GRL: 1, NCL: 1, PRI: 1 };
  function modernStatesAt(year) {
    const list = (window.HistoricalEntities && window.HistoricalEntities.list) || [];
    return list
      .filter((e) => e.type === "modern" && !NON_SOVEREIGN[e.code] && year >= e.from && year <= e.to)
      .sort((a, b) => ((b.priority || 0) + Math.sqrt(b.area || 0) * 0.5) - ((a.priority || 0) + Math.sqrt(a.area || 0) * 0.5));
  }

  /* Concurrent Chinese polities at a year (dynasties, rival regimes,
     archaeological cultures). The generic point-based polity lookup sees only
     one of them — at 1200 it finds Song and misses Jin and Western Xia — so
     the China lens reads the curated parent="china" set instead. */
  function chinaRegimesAt(year) {
    const list = (window.HistoricalEntities && window.HistoricalEntities.list) || [];
    const seen = new Set();
    const out = [];
    list.filter((e) => e.parent === "china" && e.from <= year && e.to >= year)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .forEach((e) => {
        const n = state.lang === "zh" ? (e.name.zh || e.name.en) : (e.name[state.lang] || e.name.en || e.name.zh);
        if (!n || seen.has(n)) return;
        seen.add(n);
        out.push({ name: n, from: e.from, to: e.to, type: e.type });
      });
    return out.slice(0, 14);
  }

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
    timeline.spans.forEach((sp) => {
      const era = sp.e;
      const d = document.createElement("div");
      d.className = "era-band";
      d.style.flexGrow = sp.w;
      d.style.flexBasis = "0";
      d.setAttribute("data-era", era.id);
      d.title = eraName(era) + " · " + fmtRange(sp.from, sp.to) + " · " + L("双击放大", "double-click to zoom", "doble clic para ampliar", "double-clic pour zoomer", "انقر مرتين للتكبير");
      d.innerHTML = "<b>" + eraName(era) + "</b><small>" + fmtRange(sp.from, sp.to, state.lang === "zh" ? "zh" : "en") + "</small>";
      bands.appendChild(d);
    });
    bands.classList.toggle("is-precise", timeline.span <= 160);
    lastBandEra = null;
    lastChromeYear = null;
    updateTimelineLabels();
    drawTicks();
  }

  function updateTimelineLabels() {
    if (el["tl-jump-go"]) el["tl-jump-go"].textContent = t("tlGo");
    if (el["tl-scope"]) {
      const range = fmtRange(timeline.from, timeline.to, state.lang === "zh" ? "zh" : "en");
      const step = yearStep(state.year);
      // On phones the readout is narrow: break it into two short lines
      // instead of letting one orphan character wrap.
      const narrow = window.innerWidth <= 430;
      el["tl-scope"].textContent = narrow
        ? L(
          range + "\n步进 " + step + " 年",
          range + "\nstep " + step + " yr",
          range + "\npaso " + step + " años",
          range + "\npas " + step + " ans",
          range + "\nخطوة " + step + " سنة"
        )
        : L(
          "范围 " + range + " · 步进 " + step + " 年",
          "Range " + range + " · step " + step + " yr",
          "Rango " + range + " · paso " + step + " años",
          "Plage " + range + " · pas " + step + " ans",
          "المدى " + range + " · خطوة " + step + " سنوات"
        );
    }
    if (el["tl-year-input"]) el["tl-year-input"].setAttribute("aria-label", t("tlJump"));
    const zb = el["tl-zoom-btn"];
    if (zb) {
      zb.textContent = timeline.full ? t("tlZoomIn") : t("tlZoomOut");
      zb.classList.toggle("is-on", !timeline.full);
      zb.setAttribute("aria-pressed", String(!timeline.full));
      zb.title = timeline.full
        ? L("放大 1750–2026，便于精确选择", "Zoom to 1750–2026 for precise years", "Ampliar 1750–2026", "Zoomer sur 1750–2026", "تكبير 1750–2026")
        : L("回到全史 前12000–2026", "Back to the full span, 12000 BCE–2026", "Volver a la escala completa", "Revenir à la chronologie complète", "العودة إلى المدى الكامل");
    }
    const step = yearStep(state.year);
    if (el["tl-step-back"]) el["tl-step-back"].title = L("后退一年", "Back one year", "Un año atrás", "Reculer d’un an", "سنة إلى الوراء");
    if (el["tl-step-fwd"]) el["tl-step-fwd"].title = L("前进一年", "Forward one year", "Un año adelante", "Avancer d’un an", "سنة إلى الأمام");
    if (el["tl-tip"]) {
      el["tl-tip"].textContent = L(
        "← → 步进 " + step + " 年 · ↑↓ ±1 · ⇧ ×10 · 空格播放",
        "← → " + step + "-year step · ↑↓ ±1 · Shift ×10 · Space play",
        "← → paso de " + step + " años · ↑↓ ±1 · Mayús ×10 · Espacio",
        "← → pas de " + step + " ans · ↑↓ ±1 · Maj ×10 · Espace",
        "← → " + (step === 1 ? "خطوة سنة واحدة" : step === 2 ? "خطوة سنتين" : "خطوة " + step + " سنوات") + " · ↑↓ ±1 · Shift ×10 · مسافة"
      );
    }
  }

  /* ── region / theme navigator ───────────────────── */
  function regionName(r) {
    if (!r || !r.name) return "";
    return r.name[state.lang] || r.name.en || r.name.zh || r.id;
  }

  function buildRegionNav() {
    const nav = document.getElementById("region-nav");
    if (!nav) return;
    nav.innerHTML = "";
    const lab = document.createElement("span");
    lab.className = "region-label";
    lab.textContent = t("regionsLabel");
    nav.appendChild(lab);
    (A.regionNav || []).forEach((r) => {
      if (r.theme) {
        const sep = document.createElement("span");
        sep.className = "region-sep";
        nav.appendChild(sep);
      }
      const b = document.createElement("button");
      b.className = "region-chip" + (r.theme ? " is-theme" : "");
      b.type = "button";
      b.dataset.region = r.id;
      b.textContent = regionName(r);
      b.setAttribute("aria-label", regionName(r));
      b.addEventListener("click", () => focusRegion(r.id));
      nav.appendChild(b);
    });
    updateRegionActive();
  }

  function updateRegionActive() {
    const nav = document.getElementById("region-nav");
    if (!nav) return;
    nav.querySelectorAll(".region-chip").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.region === (state.region || ""));
    });
  }

  function focusRegion(id) {
    const r = (A.regionNav || []).find((x) => x.id === id);
    if (!r || !map) return;
    // Region switching is navigation: stop any transient theatre, but keep
    // the chosen year, the panel and its scroll position.
    if (window.MapTheatre) window.MapTheatre.clear();
    el["theatre-card"].hidden = true;
    document.getElementById("map-stage").classList.remove("theatre-open");
    state.route = null;
    state.favoritesOpen = false;
    state.region = id;
    if (r.bbox && r.id !== "oceania") map.fitBounds(r.bbox, 900);
    else map.flyTo(r.center[0], r.center[1], r.zoom, 900);
    updateRegionActive();
    if (state.panelOpen) { lastPanelKey = ""; renderPanel(true); }
    syncURL(true);
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
    const from = timeline.from, to = timeline.to;

    // In a narrow window, show a real year ruler so the zoomed axis is legible.
    if (timeline.span <= 160) {
      const span = timeline.span;
      const step = span <= 20 ? 1 : span <= 50 ? 5 : span <= 110 ? 10 : 25;
      ctx.font = "500 10px " + (state.lang === "zh" ? "'PingFang SC','Noto Sans SC',sans-serif" : "Georgia,serif");
      ctx.textAlign = "center";
      for (let y = Math.ceil(from / step) * step; y <= to; y += step) {
        const px = timeline.toPos(y) * r.width;
        ctx.strokeStyle = "rgba(70,60,48,0.14)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, base); ctx.stroke();
        ctx.fillStyle = "rgba(70,62,52,0.62)";
        ctx.fillText(fmtYear(y, state.lang, true), px, 12);
      }
    }

    if (A.stateChanges) {
      const all = (A.stateChanges.births || []).map((x) => ({ x, c: "#3f7a5a" }))
        .concat((A.stateChanges.dissolutions || []).map((x) => ({ x, c: "#7a6a66" })));
      for (const it of all) {
        if (it.x.year < from || it.x.year > to) continue;
        const px = timeline.toPos(it.x.year) * r.width;
        ctx.strokeStyle = hexA(it.c, 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, base - 13); ctx.lineTo(px, base - 9); ctx.stroke();
      }
    }
    // De-clutter the tick field: one mark per 2–3 px bucket, featured events
    // win the bucket. Clicking/scubbing still sees every event via tickNear().
    const buckets = new Map();
    for (const ev of A.events) {
      if (ev.y < from || ev.y > to) continue;
      if (narrow && !ev.f) continue;
      if (state.catFilter && ev.k !== state.catFilter) continue;
      const x = timeline.toPos(ev.y) * r.width;
      const key = Math.round(x / (narrow ? 3 : 2));
      const prev = buckets.get(key);
      if (!prev || (ev.f && !prev.f)) buckets.set(key, { x, f: !!ev.f, k: ev.k });
    }
    for (const b of buckets.values()) {
      const h = b.f ? 9 : 5;
      ctx.strokeStyle = hexA(catColor(b.k), b.f ? 0.55 : 0.28);
      ctx.lineWidth = b.f ? 1.3 : 1;
      ctx.beginPath();
      ctx.moveTo(b.x, base);
      ctx.lineTo(b.x, base - h);
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
      const tr = el["track"];
      if (tr) {
        tr.setAttribute("aria-valuemin", String(timeline.from));
        tr.setAttribute("aria-valuemax", String(timeline.to));
        tr.setAttribute("aria-valuenow", String(y));
        tr.setAttribute("aria-valuetext", fmtYear(y, state.lang) + " · " + eraName(era));
      }
      const step = yearStep(y);
      if (step !== lastHintStep) { lastHintStep = step; updateTimelineLabels(); }
      if (el["a11y-live"] && !state.playing) el["a11y-live"].textContent = fmtYear(y, state.lang) + " · " + eraName(era);
      updateMapEmpty();

      if (lastBandEra !== era.id) {
        lastBandEra = era.id;
        if (window.AtlasAudio) window.AtlasAudio.setEra(era.id);
        el["era-bands"].querySelectorAll(".era-band").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-era") === era.id);
        });
        if (map && map.features && !state.country) renderPanel(true);
      }
      if (el["panel-kicker"] && map && map.features && !state.country && !state.eventView) {
        el["panel-kicker"].textContent = L("此刻世界 · ", "THE WORLD AT ", "EL MUNDO EN ", "LE MONDE EN ", "العالم في ") + fmtYear(y, state.lang, true);
      }
      updateMapNote();
      updateReopenLabel();
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
    y = clamp(Math.round(y), timeline.fullFrom, timeline.fullTo);
    // A year outside the zoomed window brings the whole span back, so the
    // requested year is always reachable (deep links, Today, search, API).
    if (y < timeline.from || y > timeline.to) {
      timeline.reset();
      buildTimeline();
      pos = null;
    }
    if (y === 0) y = -1;
    const changed = y !== state.year;
    state.year = y;
    state.pos = pos == null ? timeline.toPos(y) : clamp(pos, 0, 1);
    if (map) map.setYear(y);
    updateChrome();
    if (changed) {
      lastAutoGroup = "";
      if (state.country) renderPanel(true);
      else if (state.eventView) renderPanel(true);
      else if (!state.playing) schedulePanel();
      if (!opts.silentEvent && !opts.noAuto) scheduleAutoEvent();
      syncURL();
    } else if (pos == null) {
      // window changed but the year did not: keep the readout consistent
      updateChrome();
      if (!state.playing) schedulePanel();
    }
  }

  /* ── timeline zoom / brush ─────────────────────── */
  function setTimelineWindow(from, to, opts) {
    opts = opts || {};
    const span = Math.max(5, Math.round(to - from));
    if (span >= timeline.fullTo - timeline.fullFrom) timeline.reset();
    else timeline.setWindow(from, to);
    buildTimeline();
    if (state.year < timeline.from || state.year > timeline.to) {
      // keep the user's year when possible; otherwise stop at the nearest
      // edge instead of jumping to the middle of the new window
      applyYear(state.year < timeline.from ? timeline.from : timeline.to, null, { force: true });
    } else {
      state.pos = timeline.toPos(state.year);
      updateChrome();
      drawTicks();
    }
    if (opts.brush) el["track"].focus({ preventScroll: true });
    syncURL();
  }

  function updateBrushLabel() {
    const b = el["tl-brush-btn"];
    if (!b) return;
    b.setAttribute("aria-pressed", String(!!state.brushMode));
    b.classList.toggle("is-on", !!state.brushMode);
    b.textContent = state.brushMode ? L("刷选中", "Selecting", "Seleccionando", "Sélection", "تحديد") : L("刷选", "Range", "Rango", "Plage", "المدى");
  }

  function setBrushMode(on) {
    state.brushMode = !!on;
    updateBrushLabel();
    if (el["track"]) el["track"].classList.toggle("is-brush", state.brushMode);
    if (state.brushMode) {
      showToast(L("在时间轴上拖动，选择要放大的区间", "Drag on the timeline to select a range", "Arrastra en la línea de tiempo", "Faites glisser sur la chronologie", "اسحب على الشريط الزمني"));
    }
  }

  function toggleTimelineZoom() {
    stopPlay();
    if (timeline.full) setTimelineWindow(1750, timeline.fullTo);
    else setTimelineWindow(timeline.fullFrom, timeline.fullTo);
  }

  function zoomTimelineAt(p, factor) {
    const anchor = timeline.toYear(p);
    const span = timeline.span;
    const next = clamp(span * factor, 10, timeline.fullTo - timeline.fullFrom);
    let from = anchor - (anchor - timeline.from) * (next / span);
    let to = from + next;
    if (from < timeline.fullFrom) { from = timeline.fullFrom; to = from + next; }
    if (to > timeline.fullTo) { to = timeline.fullTo; from = to - next; }
    if (next >= timeline.fullTo - timeline.fullFrom) {
      timeline.reset();
      buildTimeline();
      applyYear(anchor, null, { force: true, silentEvent: true });
      return;
    }
    timeline.setWindow(from, to);
    buildTimeline();
    applyYear(anchor, null, { force: true, silentEvent: true });
  }

  function zoomToEra(eraId) {
    const era = A.eras.find((x) => x.id === eraId);
    if (!era) return;
    const inThis = timeline.from <= era.from && timeline.to >= era.to - 1;
    if (inThis && timeline.span <= (era.to - era.from) + 2) {
      setTimelineWindow(timeline.fullFrom, timeline.fullTo);
    } else {
      setTimelineWindow(era.from, era.to - 1);
    }
  }

  /* ── year editor ────────────────────────────────── */
  function openYearJump() {
    const f = el["tl-jump"];
    if (!f) return;
    f.hidden = false;
    el["tl-year-input"].value = String(state.year);
    el["tl-year-btn"].setAttribute("aria-expanded", "true");
    el["tl-year-input"].focus();
    el["tl-year-input"].select();
  }
  function closeYearJump() {
    if (!el["tl-jump"]) return;
    el["tl-jump"].hidden = true;
    el["tl-year-btn"].setAttribute("aria-expanded", "false");
  }
  function parseYearInput(raw) {
    let s = String(raw == null ? "" : raw).trim().toLowerCase();
    if (!s) return null;
    s = s.replace(/\s|年/g, "");
    let sign = 1;
    if (/^(前|公元前|bc|bce|-)/i.test(s)) sign = -1;
    const m = s.match(/\d+/);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    if (!isFinite(n)) return null;
    return clamp(sign * n, timeline.fullFrom, timeline.fullTo);
  }

  function scheduleAutoEvent() {
    clearTimeout(eventTimer);
    if (!state.autoEvent || state.playing || state.eventView || state.country || !el["event-modal"].hidden) return;
    eventTimer = setTimeout(() => {
      if (!state.autoEvent || state.playing || state.eventView || state.country || !el["event-modal"].hidden) return;
      let groups = Object.values(A.eventGroups || {}).filter((g) => g.year === state.year);
      if (!groups.length) {
        const yearEvents = A.events.filter((e) => e.y === state.year && e.f).sort((a, b) => {
          const pa = (detailFor(a) && detailFor(a).trigger && detailFor(a).trigger.priority) || 60;
          const pb = (detailFor(b) && detailFor(b).trigger && detailFor(b).trigger.priority) || 60;
          return pb - pa;
        });
        if (yearEvents.length) {
          groups = [{
            id: "auto-year-" + state.year,
            name: { zh: fmtYear(state.year, "zh", true) + " 年重大事件", en: "Major events of " + fmtYear(state.year, "en", true) },
            year: state.year, countries: [], lead: yearEvents[0].id,
            events: yearEvents.map((e) => e.id), auto: true,
          }];
        }
      }
      if (!groups.length) return;
      groups.sort((a, b) => {
        const pa = (byId[a.lead] && detailFor(byId[a.lead]) && detailFor(byId[a.lead]).trigger && detailFor(byId[a.lead]).trigger.priority) || 60;
        const pb = (byId[b.lead] && detailFor(byId[b.lead]) && detailFor(byId[b.lead]).trigger && detailFor(byId[b.lead]).trigger.priority) || 60;
        return pb - pa;
      });
      const g = groups[0];
      if (lastAutoGroup === g.id + ":" + state.year) return;
      lastAutoGroup = g.id + ":" + state.year;
      triggerGroup(g, { auto: true });
    }, 420);
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

  function updateMapEmpty() {
    if (!el["map-empty"] || !map) return;
    const none = !!state.catFilter && map.visibleEvents().length === 0;
    el["map-empty"].hidden = !none;
    el["map-empty"].textContent = L("此类别下此刻暂无节点 · 清除筛选", "No nodes of this category here · clear filter", "Sin nodos de esta categoría · quitar filtro", "Aucun nœud de cette catégorie · effacer le filtre", "لا عقد لهذه الفئة هنا · إزالة التصفية");
  }

  function updateFitButton() {
    const b = document.getElementById("zoom-fill");
    if (!b || !map) return;
    const on = map.fitMode === "fill";
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? L("恢复全图", "Back to world view", "Volver al mapa mundial", "Revenir à la carte mondiale", "العودة إلى العرض العالمي") : L("铺满视野", "Fill the screen", "Ampliar vista", "Remplir l’écran", "ملء الشاشة"));
    b.title = b.getAttribute("aria-label");
    const label = b.querySelector(".zf-label");
    if (label) label.textContent = on ? L("全图", "World", "Mundo", "Monde", "العالم") : L("铺满", "Fill", "Llenar", "Remplir", "ملء");
    if (el["minimap"]) {
      const wasHidden = el["minimap"].hidden;
      el["minimap"].hidden = !on;
      el["minimap"].setAttribute("aria-label",
        L("迷你地图：显示当前视野在世界中的位置，点击可定位", "Minimap: your current view in the world; click to recentre", "Minimapa: tu vista actual en el mundo; haz clic para centrar", "Mini-carte : votre vue actuelle ; cliquez pour recentrer", "خريطة مصغرة: موقع نظرتك الحالية؛ انقر لإعادة التمركز"));
      // A hidden canvas has no layout box, so the next frame that follows
      // showing it is what actually paints it. Without this the minimap
      // appears blank until the map redraws for another reason.
      if (on && wasHidden) requestAnimationFrame(() => { if (map) map.drawBase(); });
    }
    if (el["minimap-fit"]) el["minimap-fit"].textContent = L("全图", "World", "Mundo", "Monde", "العالم");
  }

  function flashMapNote(text) {
    if (!el["map-note"]) return;
    clearTimeout(noteTimer);
    el["map-note"].textContent = text;
    noteTimer = setTimeout(updateMapNote, 2800);
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
  function posFromClientX(cx, r) {
    return clamp((cx - r.left) / (r.width || 1), 0, 1);
  }
  function tickNear(px, tol) {
    tol = tol || 11;
    const r = el["track"].getBoundingClientRect();
    if (!r.width) return null;
    let best = null, bd = tol;
    for (const ev of A.events) {
      if (ev.y < timeline.from || ev.y > timeline.to) continue;
      if (state.catFilter && ev.k !== state.catFilter) continue;
      const x = timeline.toPos(ev.y) * r.width;
      const dx = Math.abs(x - px) - (ev.f ? 1.5 : 0);
      if (dx < bd) { bd = dx; best = ev; }
    }
    return best;
  }
  function placeTimelineCursor(px, label, sub) {
    const c = el["tl-cursor"];
    if (!c) return;
    c.innerHTML = "<b>" + label + "</b>" + (sub ? "<span>" + sub + "</span>" : "");
    c.style.left = px + "px";
    c.hidden = false;
  }
  function hideTimelineCursor() {
    if (el["tl-cursor"]) el["tl-cursor"].hidden = true;
  }
  function showTimelineCursor(e) {
    if (e.pointerType === "touch") return;
    const r = el["track"].getBoundingClientRect();
    if (!r.width) return;
    const px = e.clientX - r.left;
    const year = Math.round(timeline.toYear(posFromClientX(e.clientX, r)));
    const near = tickNear(px, 22);
    placeTimelineCursor(px, fmtYear(year, state.lang, true),
      near ? evTitle(near) : L("拖动选择区间可放大", "drag a range to zoom", "arrastra para ampliar", "glisser pour zoomer", "اسحب للتكبير"));
  }
  function updateBrush(x1, x2) {
    const b = el["tl-brush"];
    if (!b) return;
    const left = Math.min(x1, x2), w = Math.abs(x2 - x1);
    b.style.left = left + "px";
    b.style.width = w + "px";
    b.hidden = false;
  }
  function bindTrack() {
    const track = el["track"];
    if (!track) return;
    let drag = null;

    track.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.detail > 1) return;
      stopPlay();
      try { track.focus({ preventScroll: true }); } catch (err) { /* older browsers */ }
      if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
      const r = track.getBoundingClientRect();
      const x = e.clientX - r.left;
      const p = posFromClientX(e.clientX, r);
      drag = { id: e.pointerId, startX: x, startP: p, moved: false, brush: !!e.shiftKey || state.brushMode, snapEv: null, lastP: p, touch: e.pointerType === "touch" };
      track.classList.add("dragging");
      hideTimelineCursor();
      // Scrubbing (or brushing) time leaves an open event dossier; clicking
      // the same event's tick keeps it.
      if (state.eventView) {
        const sameTick = tickNear(x, drag.touch ? 16 : 9);
        if (!sameTick || sameTick.id !== state.eventView.id) closeTheatre();
      }
      if (drag.brush) {
        updateBrush(x, x);
        placeTimelineCursor(x, fmtYear(Math.round(timeline.toYear(p)), state.lang, true), t("tlScrub"));
      } else {
        const near = tickNear(x, drag.touch ? 16 : 9);
        const pp = near ? timeline.toPos(near.y) : p;
        drag.snapEv = near;
        applyYear(Math.round(timeline.toYear(pp)), pp);
      }
      e.preventDefault();
    });

    track.addEventListener("pointermove", (e) => {
      if (!drag) { showTimelineCursor(e); return; }
      if (e.pointerId !== drag.id) return;
      const r = track.getBoundingClientRect();
      const x = clamp(e.clientX - r.left, 0, r.width);
      const p = posFromClientX(e.clientX, r);
      if (Math.abs(x - drag.startX) > 3) drag.moved = true;
      drag.lastP = p;
      if (drag.brush) {
        updateBrush(drag.startX, x);
        const a = timeline.toYear(Math.min(drag.startX, x) / r.width);
        const b = timeline.toYear(Math.max(drag.startX, x) / r.width);
        placeTimelineCursor(x, fmtRange(Math.round(a), Math.round(b), state.lang === "zh" ? "zh" : "en"), t("tlScrub"));
      } else {
        const near = tickNear(x, drag.touch ? 16 : 9);
        const pp = near ? timeline.toPos(near.y) : p;
        drag.snapEv = near;
        applyYear(Math.round(timeline.toYear(pp)), pp);
      }
    });

    const end = (e) => {
      if (!drag || (e.pointerId != null && e.pointerId !== drag.id)) return;
      const r = track.getBoundingClientRect();
      const x = clamp((e.clientX || 0) - r.left, 0, r.width);
      const d = drag;
      drag = null;
      track.classList.remove("dragging");
      el["tl-brush"].hidden = true;
      hideTimelineCursor();
      if (d.brush) {
        const a = timeline.toYear(Math.min(d.startX, x) / r.width);
        const b = timeline.toYear(Math.max(d.startX, x) / r.width);
        if (d.moved && b - a >= 5) {
          setTimelineWindow(a, b, { brush: true });
          if (state.brushMode) setBrushMode(false);
          showToast(L("时间窗 " + fmtRange(Math.round(a), Math.round(b), state.lang === "zh" ? "zh" : "en"), "Range " + fmtRange(Math.round(a), Math.round(b), "en"), "Rango " + fmtRange(Math.round(a), Math.round(b), "es"), "Plage " + fmtRange(Math.round(a), Math.round(b), "fr"), "المدى " + fmtRange(Math.round(a), Math.round(b), "ar")));
          return;
        }
        if (state.brushMode) { showToast(L("拖动至少 5 年以选择时间窗", "Drag at least 5 years to select a range", "Arrastra al menos 5 años", "Faites glisser au moins 5 ans", "اسحب 5 سنوات على الأقل")); return; }
        const p = clamp(x / r.width, 0, 1);
        applyYear(Math.round(timeline.toYear(p)), p);
        renderPanel(true);
        return;
      }
      if (!d.moved && d.snapEv) { triggerEvent(d.snapEv, "timeline"); return; }
      applyYear(Math.round(timeline.toYear(d.lastP)), d.lastP);
      renderPanel(true);
      syncURL();
    };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", (e) => {
      if (!drag || (e.pointerId != null && e.pointerId !== drag.id)) return;
      drag = null;
      track.classList.remove("dragging");
      el["tl-brush"].hidden = true;
      hideTimelineCursor();
    });
    track.addEventListener("pointerleave", () => { if (!drag) hideTimelineCursor(); });
    track.addEventListener("wheel", (e) => {
      if (!e.altKey) return;
      e.preventDefault();
      const r = track.getBoundingClientRect();
      zoomTimelineAt(posFromClientX(e.clientX, r), e.deltaY > 0 ? 1.32 : 1 / 1.32);
      showTimelineCursor(e);
    }, { passive: false });
  }

  /* ── tooltip ────────────────────────────────────── */
  let tooltipEv = null;
  function showTooltip(ev, x, y) {
    tooltipEv = ev;
    if (!ev) { el.tooltip.hidden = true; return; }
    if (ev.__cluster) {
      const names = ev.__cluster.slice(0, 3).map((e) => evTitle(e)).join(" · ");
      el.tooltip.innerHTML =
        '<div class="tt-year">' + ev.count + L(" 个节点", " nodes", " nodos", " nœuds", " عقد") + "</div>" +
        '<div class="tt-title">' + names + (ev.__cluster.length > 3 ? " …" : "") + "</div>" +
        '<div class="tt-hint">' + L("点击放大此处", "Click to zoom in", "Haz clic para ampliar", "Cliquer pour zoomer", "انقر للتكبير") + "</div>";
      placeTooltip(x, y);
      el.tooltip.hidden = false;
      return;
    }
    el.tooltip.innerHTML =
      '<div class="tt-year">' + fmtYear(ev.y, state.lang, true) + " · " + rgName(ev.rg) + "</div>" +
      '<div class="tt-title">' + evTitle(ev) + "</div>" +
      '<div class="tt-hint">' + L("点击展开场景", "Click to enter the scene", "Haz clic para abrir la escena", "Cliquez pour ouvrir la scène", "انقر لفتح المشهد") + "</div>";
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

  function seqPanelAppear() {
    const p = el["side-panel"];
    if (!p) return;
    p.classList.add("seq-in");
    setTimeout(() => p.classList.remove("seq-in"), 1200);
  }

  function syncPauseButtons(paused) {
    const b = el["panel-body"] && el["panel-body"].querySelector("[data-theatre-pause]");
    const label = paused ? L("继续动态", "Resume dynamic", "Reanudar dinámica", "Reprendre la dynamique", "متابعة الحركة") : L("暂停动态", "Pause dynamic", "Pausar dinámica", "Pause dynamique", "إيقاف الحركة");
    if (b) { b.textContent = paused ? "▶" : "❚❚"; b.setAttribute("aria-label", label); b.title = label; }
    if (el["tc-pause"]) el["tc-pause"].textContent = paused ? L("继续", "Resume", "Reanudar", "Reprendre", "متابعة") : L("暂停", "Pause", "Pausa", "Pause", "إيقاف مؤقت");
  }

  function clearTheatreSurface() {
    if (window.MapTheatre) window.MapTheatre.clear();
    if (el["theatre-card"]) el["theatre-card"].hidden = true;
    const stage = document.getElementById("map-stage");
    if (stage) stage.classList.remove("theatre-open");
    if (map) { map.setSelected(null); map.setPaused(false); }
  }

  /* ── event theatre ──────────────────────────────── */
  async function openEvent(ev, opts) {
    if (!ev) return;
    const wasOpen = state.panelOpen;
    state.autoOpened = !!(opts && opts.auto);
    stopPlay();
    // Opening an event moves the timeline to the event's year. Remember the
    // year the reader came from, so "back to the age" returns there instead
    // of stranding them in the event's era.
    if (!(opts && opts.auto)) {
      if (!state.eventView) state.eventReturnYear = ev.y !== state.year ? state.year : null;
    }
    if (!el["event-modal"].hidden && !(opts && opts.auto)) closeEvent();
    state.country = null;
    state.favoritesOpen = false;
    map.setHighlight(null);
    state.eventView = ev;
    const foundGroup = groupForEvent(ev);
    if (foundGroup) state.eventGroup = foundGroup;
    else if (!state.eventGroup || !(state.eventGroup.events || []).includes(ev.id)) state.eventGroup = null;
    state.selected = ev;
    map.setSelected(ev);
    map.setPaused(false);
    // Set the year before rendering: the "当时" line reads the historical
    // snapshot for the event's own year, not the year the user came from.
    if (ev.y !== state.year) applyYear(ev.y, null, { force: true, silentEvent: true });
    else { state.pos = timeline.toPos(ev.y); updateChrome(); }
    lastPanelKey = "";
    // Choreography: camera first, then the scene fades in, then — on a
    // first open — the panel/drawer slides in slightly later. The delay
    // class must exist before the panel's open state changes, otherwise
    // the transition has already started without it.
    if (!wasOpen) seqPanelAppear();
    setPanel(true);
    renderPanel(true);
    await ensureSceneAssets();
    if (state.selected !== ev) return;
    if (window.MapTheatre) {
      window.MapTheatre.setLang(state.lang);
      window.MapTheatre.playEvent(ev);
    } else {
      map.flyTo(ev.lat, ev.lon, 2.8, 800);
    }
    fillTheatreCard(ev);
    syncPauseButtons(false);
    // Focus lands on the panel title so screen-reader and keyboard users
    // arrive at the new content; auto-opened scenes never steal focus.
    if (!(opts && opts.auto)) {
      setTimeout(() => { if (el["panel-title"] && state.eventView) el["panel-title"].focus({ preventScroll: true }); }, 40);
    }
    el["theatre-card"].hidden = false;
    document.getElementById("map-stage").classList.add("theatre-open");
    el.hint.classList.add("hide");
    el["tc-pause"].textContent = L("暂停", "Pause", "Pausar", "Pause", "إيقاف مؤقت");
    syncURL(!state.autoOpened);
  }

  function closeTheatre() {
    if (window.AtlasAudio) window.AtlasAudio.stopSpeak();
    if (window.MapTheatre) window.MapTheatre.clear();
    el["theatre-card"].hidden = true;
    document.getElementById("map-stage").classList.remove("theatre-open");
    const evId = state.selected && state.selected.id;
    state.selected = null;
    state.eventView = null;
    state.eventGroup = null;
    lastPanelKey = "";
    if (map) {
      map.setSelected(null);
      map.setPaused(false);
    }
    const backYear = state.eventReturnYear;
    state.eventReturnYear = null;
    if (backYear != null && backYear !== state.year) applyYear(backYear, null, { force: true, silentEvent: true });
    if (state.panelOpen) renderPanel(true);
    restoreTriggerFocus(evId);
    syncURL();
  }

  function restoreTriggerFocus(evId) {
    let t = lastFocusEl;
    if (t && (!document.contains(t) || t.offsetParent === null)) t = null;
    if (!t && evId) t = document.querySelector('#a11y-nodes [data-ev="' + evId + '"]');
    if (!t) t = document.getElementById("track");
    lastFocusEl = null;
    if (t && t.focus) { try { t.focus({ preventScroll: true }); } catch (err) { /* older browsers */ } }
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
    if (el["tc-expand"]) el["tc-expand"].textContent = L("展开史志", "Open full record", "Abrir ficha", "Ouvrir la fiche", "فتح السجل");
    if (el["tc-pause"]) el["tc-pause"].textContent = L("暂停", "Pause", "Pausa", "Pause", "إيقاف مؤقت");
  }

  function setBackgroundInert(on) {
    const app = document.getElementById("app");
    if (!app) return;
    const anyOpen = !el["event-modal"].hidden || (el["about-modal"] && !el["about-modal"].hidden);
    app.inert = !!on && anyOpen;
  }

  function trapTab(e, root) {
    const nodes = [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter((n) => n.offsetParent !== null && n.getAttribute("aria-hidden") !== "true");
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  async function openEventModal(ev) {
    if (!ev) return;
    clearTimeout(eventTimer);
    if (el["event-modal"].hidden) modalReturnFocus = document.activeElement;
    stopPlay();
    if (state.country) { state.country = null; map.setHighlight(null); lastPanelKey = ""; renderPanel(true); }
    state.selected = ev;
    map.setSelected(ev);
    map.setPaused(true);
    if (ev.y !== state.year) applyYear(ev.y, null, { force: true });
    else { state.pos = timeline.toPos(ev.y); updateChrome(); }
    map.flyTo(ev.lat, ev.lon, 2.6, 750);
    await ensureSceneAssets();
    fillEvent(ev);
    el["event-modal"].hidden = false;
    setBackgroundInert(true);
    if (sceneCtl) sceneCtl.stop();
    const cat = A.categories[ev.k] || { color: "#b04a32" };
    sceneCtl = window.Scenes.mount(el["scene-canvas"], ev.s, { color: cat.color, region: ev.rg, year: ev.y, variant: ev.v, hero: (window.HeroScenes && window.HeroScenes.has(ev.id)) ? ev.id : null, tierB: (window.VariantScenes && window.VariantScenes.has(ev.id)) ? ev.id : null });
    scenePaused = false;
    el["scene-toggle"].textContent = "❚❚";
    setTimeout(() => {
      const c = el["event-modal"].querySelector(".ev-close");
      if (c) c.focus();
    }, 60);
    syncURL();
  }

  /* ── place: modern name + the power that held it then ── */
  const CURATED_SCOPE = {
    "curated-china-roc": ["CN"],
    "curated-japan-empire": ["JP", "TW", "KR", "KP"],
    "curated-british-raj": ["IN", "PK", "BD"],
    "curated-french-indochina": ["VN", "LA", "KH"],
    "curated-dutch-east-indies": ["ID"],
    "curated-british-malaya": ["MY", "SG"],
    "curated-australia-federation": ["AU"],
  };

  const SNAP_NAME_ALIAS = {
    "usa": "united states",
    "us": "united states",
    "u.s.a.": "united states",
    "uk": "united kingdom",
    "u.k.": "united kingdom",
    "soviet union": "ussr",
    "u.s.s.r.": "ussr",
    "byelarus": "belarus",
    "burma": "myanmar",
  };

  function historicalPowerAt(lat, lon, year, feature) {
    const list = (window.HistoricalEntities && window.HistoricalEntities.list) || [];
    if (!list.length) return null;
    const codes = feature ? [countryKey(feature), feature.properties && feature.properties.iso3, feature.properties && feature.properties.iso2].filter(Boolean) : [];
    const cos = Math.max(0.25, Math.cos(lat * Math.PI / 180));
    const cands = [];
    for (const e of list) {
      if (year < e.from || year > e.to) continue;
      if (e.type === "modern" && year < 1900) continue;
      const scope = CURATED_SCOPE[e.id];
      const d = Math.hypot((lat - e.lat) * 0.9, (((lon - e.lon + 540) % 360) - 180) * cos);
      cands.push({ e, d, scoped: !!(scope && codes.length && scope.some((c) => codes.indexOf(c) >= 0)), hasScope: !!scope });
    }

    const scoped = cands.filter((x) => x.scoped && x.e.source === "curated" && ["state", "empire", "colony", "culture"].indexOf(x.e.type) >= 0 && x.d < 28).sort((a, b) => a.d - b.d);
    const modernMatch = cands.filter((x) => x.e.type === "modern" && codes.indexOf(x.e.code) >= 0).sort((a, b) => a.d - b.d)[0];

    // A newly founded modern state wins on its own soil: 1949 Beijing is the
    // PRC, not the Republic of China whose span ends that year.
    if (modernMatch && (year >= 1949 || modernMatch.e.from >= year - 1)) return modernMatch.e;
    if (scoped.length) return scoped[0].e;

    const curated = cands.filter((x) => x.e.source === "curated" && ["state", "empire", "colony", "culture"].indexOf(x.e.type) >= 0 && !x.hasScope && x.d < 5).sort((a, b) => a.d - b.d);
    if (curated.length) return curated[0].e;

    // Snapshot polygon lookup, validated against the entity layer's lifetimes.
    // Spatial containment fixes large empires whose label centroid is far away
    // (USSR, France with its colonies), while the year-matched validation
    // blocks stale snapshot names ("Chinese warlords" over 1937 Beijing).
    const hb = window.HistoricalBorders;
    if (hb && hb.polityAt) {
      let hit = hb.polityAtYear ? hb.polityAtYear(lat, lon, year) : null;
      if (!hit && hb.current && Math.abs(hb.current.year - year) <= 8) hit = hb.polityAt(lat, lon);
      if (hit) {
        const names = [hit.name, hit.sub].filter(Boolean).map((n) => String(n).toLowerCase().trim());
        const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
        const clamps = (window.HistoricalEntities && window.HistoricalEntities.clamps) || {};
        for (const n of names) {
          const key = SNAP_NAME_ALIAS[n] || n;
          const matches = list.filter((e) => norm(e.name.en) === norm(n) || norm(e.name.en) === norm(key));
          const same = matches.find((e) => e.name.zh) || matches[0];
          if (same) {
            if (year >= same.from && year <= same.to) return same;
            // A hand-checked clamp means this name is stale for this year
            // (Chinese warlords over 1937 Beijing); do not synthesise it.
            if (clamps[hit.name] || clamps[same.name.en]) continue;
          }
          // No entity record (or a name that simply predates the snapshot
          // coverage, e.g. "France" in 1916): trust the localized snapshot
          // name. Unlocalised names are skipped rather than shown in English
          // inside a Chinese dossier.
          if (hit.zh) return { name: { zh: hit.zh, en: hit.name }, type: "state", source: "snapshot", synthetic: true };
        }
      }
    }

    if (modernMatch && year >= 1900) return modernMatch.e;

    const gen = cands
      .filter((x) => x.e.source !== "curated" && x.e.type !== "modern" && x.d < 5)
      .sort((a, b) => a.d - b.d || (b.e.priority || 0) - (a.e.priority || 0));
    if (gen.length) return gen[0].e;
    return null;
  }

  function placeInfo(ev) {
    const d = detailFor(ev) || {};
    const f = ev._country;
    const modern = f ? countryName(f) : L("海域", "Open sea", "Alta mar", "Haute mer", "عرض البحر");
    const power = historicalPowerAt(ev.lat, ev.lon, ev.y, f);
    const powerName = power ? (state.lang === "zh" ? (power.name.zh || power.name.en) : (power.name.en || power.name.zh)) : "";
    const detailPlace = d.place ? textOf(d.place) : "";
    const today = L("今", "now", "hoy", "aujourd’hui", "اليوم");
    const then = L("当时", "then", "entonces", "alors", "آنذاك");
    let main = detailPlace || (today + " " + modern);
    const bits = [];
    if (detailPlace && modern) bits.push(today + " " + modern);
    if (powerName && powerName !== modern) bits.push(then + " " + powerName);
    return { main, sub: bits.join(" · "), modern, powerName, power };
  }

  function placeOf(ev) {
    const info = placeInfo(ev);
    return info.sub || info.main;
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
      zh: ["时代", "地域", "今地 / 当时", "场景"],
      en: ["AGE", "REGION", "NOW / THEN", "SCENE"],
      es: ["ÉPOCA", "REGIÓN", "HOY / ENTONCES", "ESCENA"],
      fr: ["ÂGE", "RÉGION", "AUJOURD’HUI / ALORS", "SCÈNE"],
      ar: ["العصر", "المنطقة", "اليوم / آنذاك", "المشهد"],
    })[state.lang] || ["AGE", "REGION", "NOW / THEN", "SCENE"];
    const sc = A.scenes[ev.s];
    const pinfo = placeInfo(ev);
    const nowThen = pinfo.modern + (pinfo.powerName && pinfo.powerName !== pinfo.modern ? " / " + pinfo.powerName : "");
    el["ev-meta"].innerHTML =
      "<div><span>" + en[0] + "</span><b>" + eraName(A.eraOf(ev.y)) + "</b></div>" +
      "<div><span>" + en[1] + "</span><b>" + rgName(ev.rg) + "</b></div>" +
      "<div><span>" + en[2] + "</span><b>" + (ev._country ? nowThen : L("海域", "Open sea", "Alta mar", "Haute mer", "عرض البحر")) + "</b></div>" +
      "<div><span>" + en[3] + "</span><b>" + (sc ? (state.lang === "zh" ? sc.zh : sc.en) : ev.s) + "</b></div>";
    const heroScene = window.HeroScenes && window.HeroScenes.has(ev.id);
    const tierBScene = window.VariantScenes && window.VariantScenes.has(ev.id);
    el["scene-label"].textContent = ((heroScene || tierBScene) ? ev.t[1] : (A.scenes[ev.s] ? A.scenes[ev.s].en : ev.s)).toUpperCase();
    el["scene-era"].textContent = eraName(A.eraOf(ev.y));
    el["scene-caption"].innerHTML = "<b>" + fmtYear(ev.y, state.lang) + "</b> · " + placeOf(ev) + " · " + latlon(ev.lat, ev.lon);

    if (el["ev-detail"]) {
      const d = detailFor(ev) || {};
      let dh = "";
      const sum = d.summary ? textOf(d.summary) : "";
      if (sum) dh += `<section class="ev-detail-section"><h4>${L("摘要", "SUMMARY", "RESUMEN", "RÉSUMÉ", "الملخص")}</h4><p>${sum}</p></section>`;
      if (d.why) {
        const why = textOf(d.why);
        if (why) dh += `<section class="ev-detail-section ev-why"><h4>${L("为何重要", "WHY IT MATTERS", "POR QUÉ IMPORTA", "POURQUOI C’EST IMPORTANT", "لماذا يهم")}</h4><p>${why}</p></section>`;
      }
      for (const [k, label] of [["background", L("背景", "BACKGROUND", "CONTEXTO", "CONTEXTE", "الخلفية")], ["course", L("经过", "COURSE", "DESARROLLO", "DÉROULEMENT", "مجريات الحدث")], ["outcome", L("结果与影响", "OUTCOME", "RESULTADO", "CONSÉQUENCES", "النتائج والأثر")]]) {
        const val = d[k] ? textOf(d[k]) : "";
        if (val) dh += `<section class="ev-detail-section"><h4>${label}</h4><p>${val}</p></section>`;
      }
      if ((d.sources || []).length) {
        dh += `<section class="ev-detail-section"><h4>${L("来源", "SOURCES", "FUENTES", "SOURCES", "المصادر")}</h4>`;
        d.sources.filter((x) => x.url).slice(0, 4).forEach((x) => { dh += `<p><a href="${x.url}" target="_blank" rel="noopener">${x.label || x.url}</a></p>`; });
        dh += `</section>`;
      }
      el["ev-detail"].innerHTML = dh;
    }

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
    el["ev-contemp-list"].innerHTML = ch || '<div class="panel-empty">' + L("同一时刻暂无其他节点。", "No other nodes at this moment.", "No hay otros nodos en este momento.", "Aucun autre nœud à cet instant.", "لا عقد أخرى في هذه اللحظة.") + "</div>";
  }

  function closeEvent() {
    if (window.AtlasAudio) window.AtlasAudio.stopSpeak();
    if (sceneCtl) { sceneCtl.stop(); sceneCtl = null; }
    el["event-modal"].hidden = true;
    setBackgroundInert(false);
    if (map) map.setPaused(false);
    let back = state.selected && state.panelOpen ? el["panel-title"] : modalReturnFocus;
    if (!back || back.offsetParent === null) back = modalReturnFocus;
    modalReturnFocus = null;
    if (back && back.focus) setTimeout(() => { try { back.focus({ preventScroll: true }); } catch (err) { /* noop */ } }, 40);
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
  function openCountry(f, opts) {
    if (!f) return;
    state.favoritesOpen = false;
    state.searchQuery = null;
    state.searchResults = [];
    state.route = null;
    if (!el["event-modal"].hidden) closeEvent();
    if (window.MapTheatre) window.MapTheatre.clear();
    el["theatre-card"].hidden = true;
    document.getElementById("map-stage").classList.remove("theatre-open");
    el["panel-body"].scrollTop = 0;
    const group = (!opts || !opts.skipGroup) ? (groupForCountryAtYear(f, state.year) || autoGroupForCountry(f, state.year)) : null;
    if (group) { triggerGroup(group); return; }
    state.eventView = null;
    state.eventGroup = null;
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
    syncURL(true);
  }
  function closeCountry() {
    if (!state.country) return;
    state.country = null;
    state.eventView = null;
    state.eventGroup = null;
    map.setHighlight(null);
    if (window.MapTheatre) window.MapTheatre.clear();
    lastPanelKey = "";
    el["panel-body"].scrollTop = 0;
    renderPanel(true);
    syncURL();
  }

  /* ── panel open/close ───────────────────────────── */
  function isMobilePanel() { return window.innerWidth <= 860; }
  const SHEET_STATES = ["peek", "half", "full"];

  function clearSheetClasses() {
    document.body.classList.remove("sheet-peek", "sheet-half", "sheet-full");
  }

  function setSheet(name, opts) {
    if (!isMobilePanel()) { clearSheetClasses(); return; }
    if (SHEET_STATES.indexOf(name) < 0) name = "half";
    state.sheet = name;
    clearSheetClasses();
    document.body.classList.add("sheet-" + name);
    const offset = name === "peek" ? 0 : Math.round((map ? map.H : window.innerHeight) * (name === "full" ? 0.26 : 0.15));
    if (map) map.setViewOffset(offset);
    if (el["sheet-handle"]) {
      el["sheet-handle"].setAttribute("aria-label",
        name === "peek" ? L("上拉展开详情", "Swipe up for details", "Desliza para ver detalles", "Glisser vers le haut", "اسحب للأعلى للتفاصيل")
        : name === "half" ? L("上拉全屏", "Swipe up for full screen", "Desliza para pantalla completa", "Glisser en plein écran", "اسحب لملء الشاشة")
        : L("下拉收起详情", "Swipe down to reduce", "Desliza para reducir", "Glisser vers le bas", "اسحب للأسفل للتصغير"));
    }
    if (!opts || !opts.silent) requestAnimationFrame(updatePanelScrollbar);
  }

  function cycleSheet() {
    if (!state.panelOpen) return;
    if (state.sheet === "peek") setSheet("half");
    else if (state.sheet === "half") setSheet("full");
    else setSheet("half");
  }

  function updateReopenLabel() {
    const b = el["panel-reopen"];
    if (!b) return;
    const span = b.querySelector("span");
    if (!span) return;
    if (!isMobilePanel() || state.panelOpen || !map || !map.features) {
      span.textContent = t("panelOpen");
      b.setAttribute("aria-label", t("panelOpen"));
      return;
    }
    const era = A.eraOf(state.year);
    const last = era === A.eras[A.eras.length - 1];
    const n = filteredEvents(A.events.filter((e) => e.y >= era.from && (e.y < era.to || last))).length;
    span.textContent = t("panelOpen") + " · " + n;
    b.setAttribute("aria-label", L("展开面板：此刻有 " + n + " 个节点", "Open the panel: " + n + " nodes at this moment", "Abrir el panel: " + n + " nodos en este momento", "Ouvrir le panneau : " + n + " nœuds en ce moment", "فتح اللوحة: " + n + " عقدة في هذه اللحظة"));
  }

  function setPanel(open) {
    state.panelOpen = open;
    if (open && isMobilePanel()) setSheet(state.sheet || "half", { silent: true });
    else if (!open) {
      clearSheetClasses();
      if (map) map.setViewOffset(0);
    }
    el["side-panel"].classList.toggle("collapsed", !open);
    document.getElementById("map-stage").classList.toggle("panel-open", !!open);
    el["panel-reopen"].hidden = open;
    if (!open && document.activeElement && el["side-panel"].contains(document.activeElement) && el["panel-reopen"]) {
      setTimeout(() => el["panel-reopen"].focus({ preventScroll: true }), 60);
    }
    if (map) map.fit(false);
    if (open && isMobilePanel()) setSheet(state.sheet || "half", { silent: true });
    if (open && map && map.features) renderPanel(true);
    updateReopenLabel();
    requestAnimationFrame(updatePanelScrollbar);
  }

  function bindSheet() {
    const h = el["sheet-handle"];
    if (!h) return;
    h.addEventListener("click", () => {
      if (h.dataset.dragged === "1") { h.dataset.dragged = "0"; return; }
      cycleSheet();
    });
    let drag = null;
    h.addEventListener("pointerdown", (e) => {
      if (!isMobilePanel() || e.button !== 0) return;
      drag = { y: e.clientY, id: e.pointerId, moved: false };
      if (h.setPointerCapture) h.setPointerCapture(e.pointerId);
      h.style.cursor = "grabbing";
    });
    h.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 6) drag.moved = true;
      if (drag.moved) h.style.transform = "translateY(" + clamp(dy, -30, 30) + "px)";
      e.preventDefault();
    });
    const end = (e) => {
      if (!drag) return;
      const dy = (e.clientY || 0) - drag.y;
      const moved = drag.moved;
      drag = null;
      h.style.transform = "";
      h.style.cursor = "grab";
      if (!moved) return;
      h.dataset.dragged = "1";
      if (dy < -24) {
        if (state.sheet === "peek") setSheet("half");
        else if (state.sheet === "half") setSheet("full");
      } else if (dy > 24) {
        if (state.sheet === "full") setSheet("half");
        else if (state.sheet === "half") setSheet("peek");
        else if (state.sheet === "peek") setPanel(false);
      }
    };
    h.addEventListener("pointerup", end);
    h.addEventListener("pointercancel", () => { drag = null; h.style.transform = ""; h.style.cursor = "grab"; });
    h.addEventListener("dblclick", () => {
      if (!state.panelOpen || !isMobilePanel()) return;
      setSheet(state.sheet === "full" ? "half" : "full");
    });
  }

  function updatePanelScrollbar() {
    const body = el["panel-body"];
    const rail = document.getElementById("panel-scroll-rail");
    const thumb = document.getElementById("panel-scroll-thumb");
    if (!body || !rail || !thumb) return;
    const sh = body.scrollHeight, ch = body.clientHeight;
    if (!sh || sh <= ch + 2) { rail.hidden = true; return; }
    rail.hidden = false;
    const track = Math.max(1, rail.clientHeight);
    const h = Math.max(24, Math.round(track * ch / sh));
    thumb.style.height = h + "px";
    const max = Math.max(1, sh - ch);
    const top = Math.round((body.scrollTop / max) * (track - h));
    thumb.style.transform = "translateY(" + top + "px)";
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
    return { evs: evs.slice(0, 6), evsAll: evs, pols, ctry };
  }

  function refreshSearchItems() {
    searchItems = Array.prototype.slice.call(el["search-results"].querySelectorAll(".sr-item"));
    searchActive = -1;
    el["search-results"].setAttribute("role", "listbox");
    searchItems.forEach((node, i) => {
      node.id = "sr-item-" + i;
      node.setAttribute("role", "option");
      node.setAttribute("aria-selected", "false");
      node.tabIndex = -1;
    });
    el.search.removeAttribute("aria-activedescendant");
  }

  function setSearchActive(i) {
    if (!searchItems.length) return;
    searchActive = (i + searchItems.length) % searchItems.length;
    searchItems.forEach((node, j) => {
      node.classList.toggle("active", j === searchActive);
      node.setAttribute("aria-selected", j === searchActive ? "true" : "false");
    });
    const node = searchItems[searchActive];
    if (node && node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
    el.search.setAttribute("aria-activedescendant", node.id);
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
        const cat = A.categories[ev.k] || { color: "#8a6a3f" };
        html += '<button class="sr-item" data-r-ev="' + ev.id + '"><span class="sr-main"><b>' + evTitle(ev) + '</b><span class="sr-meta"><i class="cat-shape shape-' + catShape(ev.k) + '" style="background:' + cat.color + '"></i>' + catName(ev.k) + " · " + rgName(ev.rg) + "</span></span><small>" + fmtYear(ev.y, state.lang, true) + "</small></button>";
      });
      if (res.evsAll.length > 6) {
        html += '<button class="sr-more" data-search-all="1">' + L("查看全部 " + res.evsAll.length + " 条", "See all " + res.evsAll.length, "Ver los " + res.evsAll.length, "Voir les " + res.evsAll.length, "عرض كل " + res.evsAll.length) + "</button>";
      }
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
    refreshSearchItems();
  }

  function pickSearch(target) {
    if (target.dataset.rEv) {
      const ev = byId[target.dataset.rEv];
      if (ev) { closeSearch(); triggerEvent(ev, "search"); }
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
  function openSearchPanel(q) {
    q = String(q || "").trim();
    if (!q) return;
    state.favoritesOpen = false;
    const res = searchIndex(q);
    if (!res || !res.evsAll.length) return;
    state.searchQuery = q;
    state.searchResults = res.evsAll.map((x) => x.ev.id);
    state.route = null;
    state.country = null;
    state.eventView = null;
    state.eventGroup = null;
    state.selected = null;
    state.catFilter = null;
    if (map) map.setCatFilter(null);
    clearTheatreSurface();
    closeSearch();
    setPanel(true);
    lastPanelKey = "";
    renderPanel(true);
    syncURL(true);
  }

  function closeSearchPanel() {
    state.searchQuery = null;
    state.searchResults = [];
    lastPanelKey = "";
    renderPanel(true);
    syncURL(true);
  }

  function closeSearch() {
    el["search-results"].hidden = true;
    el.search.value = "";
    el.search.removeAttribute("aria-activedescendant");
    searchItems = [];
    searchActive = -1;
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
    const autoEv = document.getElementById("auto-event-toggle");
    if (autoEv) autoEv.addEventListener("change", () => { state.autoEvent = autoEv.checked; });
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
    if (el["fav-btn"]) el["fav-btn"].addEventListener("click", () => {
      if (state.favoritesOpen) {
        state.favoritesOpen = false;
        lastPanelKey = "";
        renderPanel(true);
        updateFavUI();
        syncURL(true);
      } else openFavorites(true);
    });
    if (el["fav-toggle"]) el["fav-toggle"].addEventListener("click", () => toggleFavorite(currentFavorite()));
    el["panel-toggle"].addEventListener("click", () => setPanel(false));
    el["panel-close"].addEventListener("click", () => setPanel(false));
    el["panel-reopen"].addEventListener("click", () => setPanel(true));
    ["side-panel", "panel-body"].forEach((id) => {
      if (el[id]) el[id].addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    });
    if (el["panel-routes"]) {
      el["panel-routes"].addEventListener("click", (e) => {
        const toggle = e.target.closest("[data-route-strip-toggle]");
        if (toggle) {
          state.routeStripOpen = !state.routeStripOpen;
          el["panel-routes"].innerHTML = routeStrip();
          const btn = el["panel-routes"].querySelector("[data-route-strip-toggle]");
          if (btn) btn.focus({ preventScroll: true });
          return;
        }
        const routeBtn = e.target.closest("[data-route]");
        if (routeBtn) { openRouteById(routeBtn.getAttribute("data-route")); return; }
        if (e.target.closest("[data-random]")) openRandomEvent();
      });
    }
    if (el["panel-body"]) {
      el["panel-body"].addEventListener("scroll", updatePanelScrollbar, { passive: true });
      new MutationObserver(updatePanelScrollbar).observe(el["panel-body"], { childList: true, subtree: true });
    }
    const rail = document.getElementById("panel-scroll-rail");
    const thumb = document.getElementById("panel-scroll-thumb");
    if (rail && thumb) {
      let drag = false;
      rail.addEventListener("pointerdown", (e) => {
        drag = true;
        rail.setPointerCapture(e.pointerId);
        thumb.classList.add("dragging");
        const r = rail.getBoundingClientRect();
        const tr = thumb.getBoundingClientRect();
        if (e.clientY < tr.top || e.clientY > tr.bottom) {
          const body = el["panel-body"];
          const ratio = clamp((e.clientY - r.top - tr.height / 2) / Math.max(1, r.height - tr.height), 0, 1);
          body.scrollTop = ratio * (body.scrollHeight - body.clientHeight);
        }
        e.preventDefault();
      });
      rail.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const body = el["panel-body"];
        const r = rail.getBoundingClientRect();
        const tr = thumb.getBoundingClientRect();
        const ratio = clamp((e.clientY - r.top - tr.height / 2) / Math.max(1, r.height - tr.height), 0, 1);
        body.scrollTop = ratio * (body.scrollHeight - body.clientHeight);
      });
      const end = () => { drag = false; thumb.classList.remove("dragging"); };
      rail.addEventListener("pointerup", end);
      rail.addEventListener("pointercancel", end);
    }
    window.addEventListener("resize", updatePanelScrollbar);
    el["play-btn"].addEventListener("click", togglePlay);
    el["speed-btn"].addEventListener("click", () => {
      state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
      el["speed-btn"].textContent = state.speed + "×";
    });
    el["now-btn"].addEventListener("click", () => {
      stopPlay();
      applyYear(2026, null, { force: true, noAuto: true });
      setPanel(state.panelOpen);
    });
    el["tl-step-back"].addEventListener("click", () => {
      stopPlay();
      applyYear(state.year - 1, null, { force: true });
      renderPanel(true);
    });
    el["tl-step-fwd"].addEventListener("click", () => {
      stopPlay();
      applyYear(state.year + 1, null, { force: true });
      renderPanel(true);
    });
    el["tl-year-btn"].addEventListener("click", () => {
      if (el["tl-jump"].hidden) openYearJump(); else closeYearJump();
    });
    el["tl-jump-cancel"].addEventListener("click", closeYearJump);
    el["tl-jump"].addEventListener("submit", (e) => {
      e.preventDefault();
      const y = parseYearInput(el["tl-year-input"].value);
      closeYearJump();
      if (y == null) return;
      stopPlay();
      applyYear(y, null, { force: true });
      renderPanel(true);
      el["track"].focus({ preventScroll: true });
    });
    el["tl-year-input"].addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeYearJump(); el["track"].focus({ preventScroll: true }); }
    });
    el["tl-zoom-btn"].addEventListener("click", toggleTimelineZoom);
    if (el["tl-brush-btn"]) el["tl-brush-btn"].addEventListener("click", () => setBrushMode(!state.brushMode));
    el["era-bands"].addEventListener("dblclick", (e) => {
      const band = e.target.closest(".era-band");
      if (!band) return;
      e.preventDefault();
      zoomToEra(band.getAttribute("data-era"));
    });
    bindTrack();
    el["hint-close"].addEventListener("click", () => el.hint.classList.add("hide"));
    if (el["map-empty"]) el["map-empty"].addEventListener("click", () => {
      state.catFilter = null;
      if (map) map.setCatFilter(null);
      lastPanelKey = "";
      renderPanel(true);
      drawTicks();
      updateMapEmpty();
    });
    if (el["ob-start"]) el["ob-start"].addEventListener("click", () => closeOnboarding(false));
    if (el["ob-close"]) el["ob-close"].addEventListener("click", () => closeOnboarding(false));
    if (el["ob-guide"]) el["ob-guide"].addEventListener("click", () => closeOnboarding(true));

    document.getElementById("zoom-in").addEventListener("click", () => map.zoomAt(1.45, map.W / 2, map.H / 2));
    document.getElementById("zoom-out").addEventListener("click", () => map.zoomAt(1 / 1.45, map.W / 2, map.H / 2));
    document.getElementById("zoom-fit").addEventListener("click", () => {
      if (map.fitMode === "fill") map.setFitMode("world");
      map.fit(true);
      updateFitButton();
    });
    if (el["sheet-expand"]) el["sheet-expand"].addEventListener("click", () => {
      setSheet("half");
      setTimeout(() => { if (el["sheet-handle"]) el["sheet-handle"].focus({ preventScroll: true }); }, 60);
    });
    if (el["minimap-canvas"]) el["minimap-canvas"].addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
        e.preventDefault();
        const dx = k === "ArrowLeft" ? map.W * 0.24 : k === "ArrowRight" ? -map.W * 0.24 : 0;
        const dy = k === "ArrowUp" ? map.H * 0.24 : k === "ArrowDown" ? -map.H * 0.24 : 0;
        map.panByPixels(dx, dy);
      } else if (k === "Enter" || k === " ") {
        e.preventDefault();
        if (map.focus) map.flyTo(map.focus.lat, map.focus.lon, Math.max(1.6, map.view.zoom), 420);
      }
    });
    if (el["minimap-fit"]) el["minimap-fit"].addEventListener("click", () => {
      map.setFitMode("world");
      map.fit(true);
      updateFitButton();
    });
    const fillBtn = document.getElementById("zoom-fill");
    if (fillBtn) {
      fillBtn.addEventListener("click", () => {
        const mode = map.toggleFitMode();
        updateFitButton();
        flashMapNote(mode === "fill"
          ? L("铺满视野 · 横向拖动查看全图", "Filled view · pan sideways for the rest", "Vista ampliada · arrastra para ver el resto", "Vue remplie · glissez pour le reste", "عرض ممتلئ · اسحب جانبيًا لبقية العالم")
          : L("已恢复全图", "World view restored", "Vista mundial restaurada", "Vue mondiale rétablie", "تمت استعادة العرض العالمي"));
      });
    }
    updateFitButton();

  function syncSearchClear() {
    if (!el["search-clear"] || !el["search"]) return;
    el["search-clear"].hidden = !el["search"].value;
  }

    el["search"].addEventListener("input", () => { runSearch(); syncSearchClear(); });
    if (el["search-clear"]) el["search-clear"].addEventListener("click", () => {
      el["search"].value = "";
      runSearch();
      syncSearchClear();
      el["search"].focus();
    });
    el["search"].addEventListener("focus", () => { if (el.search.value) runSearch(); });
    el["search"].addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault(); e.stopPropagation();
        if (el["search-results"].hidden) runSearch();
        setSearchActive(searchActive + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault(); e.stopPropagation();
        if (el["search-results"].hidden) runSearch();
        setSearchActive(searchActive - 1);
      } else if (e.key === "Enter") {
        e.preventDefault(); e.stopPropagation();
        const item = searchActive >= 0 ? searchItems[searchActive] : searchItems[0];
        if (item) pickSearch(item);
      } else if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation();
        closeSearch();
      }
    });
    el["search-results"].addEventListener("mousedown", (e) => {
      const all = e.target.closest("[data-search-all]");
      if (all) { e.preventDefault(); openSearchPanel(el.search.value); return; }
      const item = e.target.closest("[data-r-ev],[data-r-pol],[data-r-ctry]");
      if (item) { e.preventDefault(); pickSearch(item); }
    });

    el["panel-body"].addEventListener("click", (e) => {
      const favOpen = e.target.closest("[data-fav-open]");
      if (favOpen) { openFavorite(favorites[Number(favOpen.getAttribute("data-fav-open"))]); return; }
      const favRemove = e.target.closest("[data-fav-remove]");
      if (favRemove) { favorites.splice(Number(favRemove.getAttribute("data-fav-remove")), 1); saveFavorites(); lastPanelKey = ""; renderPanel(true); return; }
      const favClear = e.target.closest("[data-fav-clear]");
      if (favClear) { favClearArmed = true; lastPanelKey = ""; renderPanel(true); return; }
      const favClearYes = e.target.closest("[data-fav-clear-yes]");
      if (favClearYes) { favClearArmed = false; favorites = []; saveFavorites(); lastPanelKey = ""; renderPanel(true); return; }
      const favClearNo = e.target.closest("[data-fav-clear-no]");
      if (favClearNo) { favClearArmed = false; lastPanelKey = ""; renderPanel(true); return; }
      const favExport = e.target.closest("[data-fav-export]");
      if (favExport) { exportFavorites(); return; }
      const favImport = e.target.closest("[data-fav-import]");
      if (favImport) { pickFavoritesFile(); return; }
      const countryShare = e.target.closest("[data-country-share]");
      if (countryShare && state.country) { shareCountryCard(state.country); return; }
      const routeShare = e.target.closest("[data-route-share]");
      if (routeShare && state.route) { const r = routeById(state.route); if (r) shareRouteCard(r); return; }
      const favClose = e.target.closest("[data-fav-close]");
      if (favClose) { state.favoritesOpen = false; lastPanelKey = ""; renderPanel(true); updateFavUI(); syncURL(true); return; }
      const modernToggle = e.target.closest("[data-modern-toggle]");
      if (modernToggle) {
        state.modernOpen = !state.modernOpen;
        lastPanelKey = "";
        renderPanel(true);
        return;
      }
      const modernBtn = e.target.closest("[data-modern-more]");
      if (modernBtn) {
        state.modernExpanded = !state.modernExpanded;
        lastPanelKey = "";
        renderPanel(true);
        const body = el["panel-body"];
        const sec = body && body.querySelector(".polity-more");
        if (sec) body.scrollTop = Math.max(0, sec.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 160);
        return;
      }
      const moreBtn = e.target.closest("[data-cat-more]");
      if (moreBtn) {
        state.catFilterExpanded = !state.catFilterExpanded;
        lastPanelKey = "";
        renderPanel(true);
        const body = el["panel-body"];
        const rowEl = body && body.querySelector(".cat-filter");
        if (rowEl) body.scrollTop = Math.max(0, rowEl.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 24);
        return;
      }
      const catBtn = e.target.closest("[data-cat-filter]");
      if (catBtn) {
        state.catFilter = catBtn.getAttribute("data-cat-filter") || null;
        if (map) map.setCatFilter(state.catFilter);
        lastPanelKey = "";
        renderPanel(true);
        drawTicks();
        updateMapEmpty();
        syncURL();
        const body = el["panel-body"];
        const row = body && body.querySelector(".cat-filter");
        if (row) body.scrollTop = Math.max(0, row.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 24);
        return;
      }
      const routeBtn = e.target.closest("[data-route]");
      if (routeBtn) { openRouteById(routeBtn.getAttribute("data-route")); return; }
      const randomBtn = e.target.closest("[data-random]");
      if (randomBtn) { openRandomEvent(); return; }
      const routeClose = e.target.closest("[data-route-close]");
      if (routeClose) {
        state.route = null;
        lastPanelKey = "";
        renderPanel(true);
        syncURL(true);
        return;
      }
      const searchClose = e.target.closest("[data-search-close]");
      if (searchClose) { closeSearchPanel(); return; }
      const closeEv = e.target.closest("[data-ev-close]");
      if (closeEv) { closeTheatre(); return; }
      const modalBtn = e.target.closest("[data-ev-modal]");
      if (modalBtn) { openEventModal(byId[modalBtn.getAttribute("data-ev-modal")]); return; }
      const countryBtn = e.target.closest("[data-country-open]");
      if (countryBtn) {
        const key = countryBtn.getAttribute("data-country-open");
        const f = (map.features || []).find((x) => x.properties.iso3 === key || x.properties.iso2 === key);
        if (f) openCountry(f, { skipGroup: true });
        return;
      }
      const voiceBtn = e.target.closest("[data-ev-voice]");
      if (voiceBtn) { speakSelected(); return; }
      const shareBtn = e.target.closest("[data-ev-share]");
      if (shareBtn) { shareCurrent(); return; }
      const cardBtn = e.target.closest("[data-share-card]");
      if (cardBtn && state.selected) { shareCard(state.selected); return; }
      const pauseBtn = e.target.closest("[data-theatre-pause]");
      if (pauseBtn && window.MapTheatre) {
        const paused = window.MapTheatre.togglePause();
        syncPauseButtons(paused);
        return;
      }
      const evBtn = e.target.closest("[data-ev]");
      if (evBtn) { triggerEvent(byId[evBtn.getAttribute("data-ev")], "panel"); return; }
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
      if (b) triggerEvent(byId[b.getAttribute("data-contemp")], "panel");
    });
    el["sound-btn"].addEventListener("click", () => {
      if (!window.AtlasAudio) return;
      const on = window.AtlasAudio.toggle();
      el["sound-btn"].classList.toggle("is-on", on);
      updateSoundBtn();
    });
    el["tc-close"].addEventListener("click", closeTheatre);
    el["ev-voice"].addEventListener("click", speakSelected);
    bindSheet();
    el["tc-expand"].addEventListener("click", () => { if (state.selected) openEventModal(state.selected); });
    el["tc-pause"].addEventListener("click", () => {
      if (!window.MapTheatre) return;
      syncPauseButtons(window.MapTheatre.togglePause());
    });
    el["scene-toggle"].addEventListener("click", () => {
      if (!sceneCtl) return;
      scenePaused = sceneCtl.toggle();
      el["scene-toggle"].textContent = scenePaused ? "▶" : "❚❚";
    });

    window.addEventListener("historicalentitieschange", () => {
      if (state.panelOpen && !state.eventView && !state.country) { lastPanelKey = ""; renderPanel(true); }
    });
    window.addEventListener("historicalchange", () => {
      updateMapNote();
      // A snapshot that finishes loading can refine the "当时" line.
      if (state.eventView && state.panelOpen) renderPanel(true);
    });
    document.addEventListener("click", (e) => {
      if (!el["layers-pop"].hidden && !el["layers-pop"].contains(e.target) && e.target !== el["layers-btn"]) {
        el["layers-pop"].hidden = true;
        el["layers-btn"].classList.remove("is-on");
      }
      if (!el["search-results"].hidden && !el["search-results"].contains(e.target) && e.target !== el.search) {
        el["search-results"].hidden = true;
      }
      if (!el["tl-jump"].hidden && !el["tl-jump"].contains(e.target) && !el["tl-year-btn"].contains(e.target)) {
        closeYearJump();
      }
      const more = e.target.closest && e.target.closest(".ev-more");
      const inMenu = e.target.closest && e.target.closest(".ev-more-menu");
      el["panel-body"].querySelectorAll(".ev-more[open]").forEach((d) => { if (inMenu || d !== more) d.open = false; });
    });

    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", () => applyURLState(true));
    window.addEventListener("resize", () => {
      if (map) map.resize();
      if (state.panelOpen) {
        if (isMobilePanel()) setSheet(state.sheet || "half", { silent: true });
        else { clearSheetClasses(); if (map) map.setViewOffset(0); }
      }
      updateReopenLabel();
      drawTicks();
    });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { drawTicks(); });
      ro.observe(el["track"]);
    }
  }

  function onKey(e) {
    if (e.key === "Tab") {
      if (!el["event-modal"].hidden) { trapTab(e, el["event-modal"].querySelector(".event-card")); return; }
      if (!el["about-modal"].hidden) { trapTab(e, el["about-modal"].querySelector(".about-card")); return; }
    }
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";
    if (e.key === "Escape") {
      const openMore = el["panel-body"] && el["panel-body"].querySelector(".ev-more[open]");
      if (openMore) { openMore.open = false; const sm = openMore.querySelector("summary"); if (sm) sm.focus(); return; }
      if (el["onboarding"] && !el["onboarding"].hidden) { closeOnboarding(false); return; }
      if (!el["tl-jump"].hidden) { closeYearJump(); return; }
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
    const k = e.key;
    if (k === "ArrowRight" || k === "ArrowLeft") {
      e.preventDefault();
      stopPlay();
      const unit = e.altKey ? 1 : yearStep(state.year) * (e.shiftKey ? 10 : 1);
      applyYear(state.year + (k === "ArrowRight" ? unit : -unit), null, { force: true });
      renderPanel(true);
    } else if (k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      stopPlay();
      const unit = e.shiftKey ? 10 : 1;
      applyYear(state.year + (k === "ArrowUp" ? unit : -unit), null, { force: true });
      renderPanel(true);
    } else if (k === "PageUp" || k === "PageDown") {
      e.preventDefault();
      stopPlay();
      const i = A.eras.indexOf(A.eraOf(state.year));
      const target = A.eras[clamp(i + (k === "PageDown" ? 1 : -1), 0, A.eras.length - 1)];
      applyYear(target.from, null, { force: true });
      renderPanel(true);
    } else if (k === "Home" || k === "End") {
      e.preventDefault();
      stopPlay();
      applyYear(k === "Home" ? timeline.from : timeline.to, null, { force: true });
      renderPanel(true);
    } else if (k === " ") {
      e.preventDefault();
      togglePlay();
    } else if (k === "/") {
      e.preventDefault();
      el.search.focus();
    } else if (k === "?" ) {
      e.preventDefault();
      openAbout();
    } else if (k === "y" || k === "g") {
      e.preventDefault();
      openYearJump();
    } else if (k === "f" || k === "F") {
      e.preventDefault();
      if (state.favoritesOpen) { state.favoritesOpen = false; lastPanelKey = ""; renderPanel(true); updateFavUI(); syncURL(true); }
      else openFavorites(true);
    } else if (k === "b" || k === "B") {
      e.preventDefault();
      setBrushMode(!state.brushMode);
    } else if (k === "[" || k === "]") {
      e.preventDefault();
      stepEvent(k === "]" ? 1 : -1);
    }
  }

  function yearStep(y) {
    if (y < -3000) return 100;
    if (y < 0) return 25;
    if (y < 1500) return 10;
    if (y < 1900) return 5;
    return 1;
  }

  /* ── onboarding ─────────────────────────────────── */
  function showOnboarding() {
    // Never cover the "map script did not load" message with the guide.
    if (bootFailed) return;
    if (el["onboarding"]) el["onboarding"].hidden = false;
  }
  function closeOnboarding(openGuide) {
    localStorage.setItem("world-atlas-onboarded", "1");
    if (el["onboarding"]) el["onboarding"].hidden = true;
    if (openGuide) openAbout();
  }

  /* ── about ──────────────────────────────────────── */
  function openAbout() {
    if (!el["event-modal"].hidden) closeEvent();
    aboutReturnFocus = document.activeElement;
    populateAbout();
    el["about-modal"].hidden = false;
    setBackgroundInert(true);
    setTimeout(() => {
      const c = el["about-modal"].querySelector(".ev-close");
      if (c) c.focus();
    }, 40);
  }
  function closeAbout() {
    el["about-modal"].hidden = true;
    setBackgroundInert(false);
    const back = aboutReturnFocus || document.getElementById("about-btn");
    aboutReturnFocus = null;
    if (back && back.focus) setTimeout(() => { try { back.focus({ preventScroll: true }); } catch (err) { /* noop */ } }, 40);
  }
  function populateAbout() {
    el["about-eras"].innerHTML = A.eras.map((era) =>
      "<li><time>" + fmtRange(era.from, era.to) + "</time><span><b>" + eraName(era) + "</b><em>" + eraSub(era) + "</em></span></li>"
    ).join("");
    const used = [];
    A.events.forEach((e) => { if (used.indexOf(e.s) < 0) used.push(e.s); });
    el["about-scenes"].textContent = used.map((s) => (A.scenes[s] ? (state.lang === "zh" ? A.scenes[s].zh : A.scenes[s].en) : s)).join(" · ");
    const langNote = document.getElementById("about-lang-note");
    if (langNote) {
      langNote.textContent = L(
        "现代国家与地区名在 ES / FR / AR 下优先使用 Natural Earth 的对应语言名称；历史地名与 1,800 余条历史实体仍以中英为主，缺译时回退英文。事件长文目前以中英为主。",
        "Modern country and region names use Natural Earth's Spanish, French or Arabic names where available. Historical place names and the 1,800+ historical entities remain Chinese/English-first and fall back to English when a translation is pending. Long-form event records are currently Chinese/English.",
        "Los nombres modernos de países y regiones usan los nombres español, francés o árabe de Natural Earth cuando existen. Los nombres históricos y las más de 1.800 entidades históricas siguen en chino/inglés y recurren al inglés si falta traducción. Las fichas largas están por ahora en chino e inglés.",
        "Les noms modernes de pays et de régions utilisent les noms espagnol, français ou arabe de Natural Earth lorsqu’ils existent. Les noms historiques et les plus de 1 800 entités historiques restent en chinois/anglais et reviennent à l’anglais faute de traduction. Les fiches longues sont pour l’instant en chinois et en anglais.",
        "تستخدم أسماء الدول والمناطق الحديثة أسماء Natural Earth بالإسبانية أو الفرنسية أو العربية حيث تتوفر. أما الأسماء التاريخية وأكثر من 1800 كيان تاريخي فتبقى بالصينية والإنجليزية وتعود إلى الإنجليزية عند غياب الترجمة. السجلات الطويلة حاليًا بالصينية والإنجليزية."
      );
    }
    if (el["legend-cats"]) {
      el["legend-cats"].innerHTML = Object.keys(A.categories).map((k) =>
        '<span class="lg"><i class="lg-shape cat-shape shape-' + catShape(k) + '" style="background:' + A.categories[k].color + '"></i>' + catName(k) + "</span>"
      ).join("");
    }
    if (el["legend-regions"]) {
      el["legend-regions"].innerHTML = Object.keys(A.regions).map((k) =>
        '<span class="lg"><i style="background:' + A.regions[k].color + '"></i>' + rgName(k) + "</span>"
      ).join("");
    }
  }

  /* ── URL / history / share ──────────────────────── */
  function buildURL() {
    const p = new URLSearchParams();
    p.set("year", state.year);
    if (!timeline.full) { p.set("from", timeline.from); p.set("to", timeline.to); }
    if (state.catFilter) p.set("cat", state.catFilter);
    if (state.selected && !state.autoOpened) p.set("event", state.selected.id);
    if (state.country) p.set("country", countryKey(state.country));
    else if (state.region) p.set("region", state.region);
    if (state.route) p.set("route", state.route);
    if (state.searchQuery) p.set("search", state.searchQuery);
    if (state.favoritesOpen) p.set("favorites", "1");
    if (state.lang !== "zh") p.set("lang", state.lang);
    return "?" + p.toString();
  }

  function syncURL(push) {
    if (navigatingHistory) return;
    clearTimeout(urlTimer);
    const write = () => {
      try {
        if (push) history.pushState({ atlas: true }, "", buildURL());
        else history.replaceState({ atlas: true }, "", buildURL());
      } catch (err) { /* file:// */ }
    };
    if (push) write();
    else urlTimer = setTimeout(write, 420);
  }

  function showToast(text, action) {
    const t = el["toast"];
    if (!t) return;
    clearTimeout(toastTimer);
    t.textContent = "";
    const span = document.createElement("span");
    span.textContent = text;
    t.appendChild(span);
    if (action && action.label && action.fn) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toast-action";
      b.textContent = action.label;
      b.addEventListener("click", () => {
        clearTimeout(toastTimer);
        t.hidden = true;
        try { action.fn(); } catch (err) { /* noop */ }
      });
      t.appendChild(b);
    }
    t.hidden = false;
    toastTimer = setTimeout(() => { t.hidden = true; }, action ? 9000 : 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
      return;
    }
    fallbackCopy(text);
    function fallbackCopy(t) {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) { /* ignore */ }
      ta.remove();
    }
  }

  function wrapCanvasText(ctx, text, maxWidth, maxLines) {
    const out = [];
    let line = "";
    for (const ch of String(text || "")) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = ch;
        if (out.length >= maxLines - 1) break;
      } else line = test;
    }
    if (line && out.length < maxLines) out.push(line);
    if (out.length === maxLines) {
      const last = out[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) out[maxLines - 1] = last.slice(0, -1);
      out[maxLines - 1] = out[maxLines - 1].replace(/[\s,，;；:：]+$/, "") + "…";
    }
    return out;
  }

  function renderShareCard(spec) {
    return new Promise((resolve, reject) => {
      const W = 1200, H = 630;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#f7f0e2");
      bg.addColorStop(0.6, "#f1e8d7");
      bg.addColorStop(1, "#e7dcc7");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // grain / rules
      ctx.strokeStyle = "rgba(120,96,64,0.10)"; ctx.lineWidth = 1;
      for (let y = 24; y < H; y += 9) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(168,62,40,0.55)"; ctx.lineWidth = 3;
      ctx.strokeRect(22, 22, W - 44, H - 44);
      ctx.strokeStyle = "rgba(120,96,64,0.28)"; ctx.lineWidth = 1;
      ctx.strokeRect(30, 30, W - 60, H - 60);
      // seal
      ctx.fillStyle = "#a83e28"; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(64, 64, 66, 66, 8); else ctx.rect(64, 64, 66, 66);
      ctx.fill();
      ctx.fillStyle = "#f7efdf"; ctx.font = "600 44px 'Songti SC','Noto Serif SC',serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("寰", 97, 99);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#7d5a20"; ctx.font = "600 20px 'PingFang SC','Noto Sans SC',sans-serif";
      ctx.fillText("寰宇时序", 150, 94);
      ctx.fillStyle = "rgba(85,75,64,0.75)"; ctx.font = "13px Georgia,serif";
      ctx.fillText("CHRONICLES OF THE WORLD", 150, 116);
      // year + category
      const yearFont = spec.yearLabel && spec.yearLabel.length > 12
        ? "600 62px 'Iowan Old Style','Palatino',Georgia,serif"
        : "600 92px 'Iowan Old Style','Palatino',Georgia,serif";
      ctx.fillStyle = "#a83e28"; ctx.font = yearFont;
      ctx.fillText(spec.yearLabel, 64, 238);
      ctx.fillStyle = "#7d5a20"; ctx.font = "500 18px 'PingFang SC','Noto Sans SC',sans-serif";
      ctx.fillText(spec.kicker, 68, 278);
      // title
      ctx.fillStyle = "#241f1a"; ctx.font = "600 48px 'Songti SC','Noto Serif SC',serif";
      ctx.fillText(spec.title.length > 22 ? spec.title.slice(0, 22) + "…" : spec.title, 64, 352);
      ctx.fillStyle = "#554b40"; ctx.font = "italic 22px Georgia,serif";
      const subtitle = spec.subtitle || "";
      ctx.fillText(subtitle.length > 60 ? subtitle.slice(0, 60) + "…" : subtitle, 66, 388);
      // summary
      const summary = spec.summary || "";
      ctx.fillStyle = "#554b40"; ctx.font = "19px 'PingFang SC','Noto Sans SC',sans-serif";
      const lines = wrapCanvasText(ctx, summary, W - 150, 4);
      lines.forEach((line, i) => ctx.fillText(line, 64, 440 + i * 30));
      // compass rose, filling the right-hand negative space
      ctx.save();
      ctx.translate(1030, 300);
      ctx.strokeStyle = "rgba(125,90,32,0.35)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 66, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(125,90,32,0.55)";
      ctx.font = "600 13px Georgia,serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("N", 0, -78); ctx.fillText("S", 0, 78); ctx.fillText("E", 78, 0); ctx.fillText("W", -78, 0);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(7, 0); ctx.lineTo(0, 12); ctx.lineTo(-7, 0); ctx.closePath();
        ctx.fillStyle = i === 0 ? "rgba(168,62,40,0.55)" : "rgba(125,90,32,0.32)"; ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // footer
      ctx.strokeStyle = "rgba(168,62,40,0.45)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(64, 560); ctx.lineTo(W - 64, 560); ctx.stroke();
      ctx.fillStyle = "rgba(85,75,64,0.8)"; ctx.font = "12px Georgia,serif";
      const hosts = (spec.hosts || []).slice(0, 2);
      ctx.fillText(spec.footer || ("SOURCES · " + (hosts.join(" · ") || "curated atlas")), 64, 588);
      const host = location.host + location.pathname.replace(/index\.html$/, "");
      ctx.textAlign = "right";
      ctx.fillText(host, W - 64, 588);
      cv.toBlob((blob) => { blob ? resolve(blob) : reject(new Error("card blob failed")); }, "image/png");
    });
  }

  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (err) { return ""; } };
  function eventCardSpec(ev) {
    const d = detailFor(ev) || {};
    return {
      yearLabel: fmtYear(ev.y, state.lang),
      kicker: catName(ev.k) + " · " + rgName(ev.rg) + " · " + (d.place ? textOf(d.place) : placeOf(ev)),
      title: evTitle(ev),
      subtitle: ev.t[1],
      summary: d.summary ? textOf(d.summary) : evDesc(ev),
      hosts: (d.sources || []).filter((s) => s.url).map((s) => hostOf(s.url)).filter(Boolean),
    };
  }
  function countryCardSpec(f) {
    const p = f.properties || {};
    const evs = A.events.filter((e) => e._country === f);
    const era = eraName(A.eraOf(state.year));
    const title = countryName(f);
    const alt = state.lang === "zh" ? (p.n || "") : (p.n && p.n !== title ? p.n : (p.zh || ""));
    return {
      yearLabel: fmtYear(state.year, state.lang),
      kicker: L("现代国界", "MODERN BORDERS", "FRONTERAS MODERNAS", "FRONTIÈRES MODERNES", "الحدود الحديثة") + " · " + rgName(byRegion(p.sub) || p.cont),
      title,
      subtitle: alt,
      summary: L(
        `此处共有 ${evs.length} 个策展节点；当前时代为${era}。同一片土地在不同时代属于不同政权。`,
        `${evs.length} curated nodes fall inside this border; the current age is ${era}. The same ground belonged to different powers across time.`,
        `${evs.length} nodos en esta frontera; la era actual es ${era}. La misma tierra perteneció a distintos poderes.`,
        `${evs.length} nœuds dans cette frontière ; l’âge courant est ${era}. La même terre a appartenu à des pouvoirs différents.`,
        `${evs.length} عقدًا داخل هذه الحدود؛ العصر الحالي ${era}. الأرض نفسها حكمتها قوى مختلفة.`
      ),
      hosts: [],
      footer: "ATLAS · MODERN BORDERS · COUNTRY CHRONICLE",
    };
  }
  function routeCardSpec(r) {
    const evs = r.events.map((id) => byId[id]).filter(Boolean).sort((a, b) => a.y - b.y);
    const first = evs[0], last = evs[evs.length - 1];
    const span = first && last ? fmtYear(first.y, state.lang) + " – " + fmtYear(last.y, state.lang) : "";
    const name = routeText(r.name);
    const alt = state.lang === "zh" ? (r.name && r.name.en) || "" : (r.name && r.name.zh) || "";
    const hosts = [];
    if (A.eventDetails) {
      for (const e of evs) {
        for (const s of ((A.eventDetails[e.id] || {}).sources || [])) {
          const h = s.url && hostOf(s.url);
          if (h && hosts.indexOf(h) < 0) hosts.push(h);
          if (hosts.length >= 2) break;
        }
        if (hosts.length >= 2) break;
      }
    }
    return {
      yearLabel: span,
      kicker: L("主题路线", "THEMED ROUTE", "RUTA TEMÁTICA", "PARCOURS THÉMATIQUE", "مسار موضوعي") + " · " + evs.length + " " + L("节点", "nodes", "nodos", "nœuds", "عقدة"),
      title: name,
      subtitle: alt,
      summary: routeText(r.desc),
      hosts,
      footer: "ATLAS · THEMED ROUTE · " + evs.length + " NODES",
    };
  }
  async function shareSpec(spec, filename, title) {
    try {
      const blob = await renderShareCard(spec);
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      // Keep the blob alive long enough for the toast action to open it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      showToast(
        L("分享卡片已保存到下载文件夹", "Share card saved to your downloads", "Tarjeta guardada en descargas", "Carte enregistrée dans les téléchargements", "حُفظت البطاقة في التنزيلات"),
        { label: L("打开", "Open", "Abrir", "Ouvrir", "فتح"), fn: () => window.open(url, "_blank") }
      );
      if (el["toast"]) el["toast"].title = file.name;
    } catch (err) {
      console.warn("Share card failed:", err.message);
      showToast(L("分享卡片生成失败", "Could not create the card", "No se pudo crear la tarjeta", "Impossible de créer la carte", "تعذّر إنشاء البطاقة"));
    }
  }
  async function shareCard(ev) {
    await ensureDetails();
    return shareSpec(eventCardSpec(ev), "world-chronicle-" + ev.id + ".png", evTitle(ev));
  }
  async function shareCountryCard(f) {
    return shareSpec(countryCardSpec(f), "world-chronicle-country-" + (countryKey(f) || "x").toLowerCase() + ".png", countryName(f));
  }
  async function shareRouteCard(r) {
    await ensureDetails().catch(() => null);
    return shareSpec(routeCardSpec(r), "world-chronicle-route-" + r.id + ".png", routeText(r.name));
  }

  function shareCurrent() {
    state.autoOpened = false;
    syncURL(true);
    copyText(location.href);
    showToast(L("链接已复制 · 包含年份、事件与筛选", "Link copied — year, event and filters included", "Enlace copiado: año, evento y filtros", "Lien copié — année, événement et filtres", "تم نسخ الرابط: السنة والحدث والمرشحات"));
  }

  function applyURLState(fromHistory) {
    navigatingHistory = true;
    clearTimeout(urlTimer);
    try {
      const q = new URLSearchParams(location.search);
      const lang = q.get("lang") || (fromHistory ? "zh" : null);
      if (lang && lang !== state.lang && ["zh", "en", "es", "fr", "ar"].indexOf(lang) >= 0) setLang(lang);
      if (!el["event-modal"].hidden) closeEvent();
      if (window.MapTheatre) window.MapTheatre.clear();
      el["theatre-card"].hidden = true;
      document.getElementById("map-stage").classList.remove("theatre-open");
      state.eventView = null;
      state.eventGroup = null;
      state.selected = null;
      state.autoOpened = false;
      state.country = null;
        state.region = null;
      state.route = null;
      state.searchQuery = null;
      state.searchResults = [];
      state.favoritesOpen = false;
      if (map) { map.setSelected(null); map.setHighlight(null); map.setPaused(false); }

      const from = parseInt(q.get("from"), 10), to = parseInt(q.get("to"), 10);
      if (isFinite(from) && isFinite(to) && to - from >= 5) timeline.setWindow(from, to);
      else timeline.reset();
      buildTimeline();

      const cat = q.get("cat");
      state.catFilter = cat && A.categories[cat] ? cat : null;
      if (map) map.setCatFilter(state.catFilter);

      const route = q.get("route");
      if (route && routeById(route)) {
        state.route = route;
        state.catFilter = null;
        if (map) map.setCatFilter(null);
      }
      const sq = q.get("search");
      if (sq) {
        state.searchQuery = sq;
        state.catFilter = null;
        if (map) map.setCatFilter(null);
        const res = searchIndex(sq);
        state.searchResults = res ? res.evsAll.map((x) => x.ev.id) : [];
      }

      const y = parseInt(q.get("year"), 10);
      if (isFinite(y)) {
        applyYear(y, null, { force: true, silentEvent: true, noAuto: true });
      } else if (state.route) {
        const def = routeById(state.route);
        const first = def && def.events.map((id) => byId[id]).filter(Boolean).sort((a, b) => a.y - b.y)[0];
        if (first) applyYear(first.y, null, { force: true, silentEvent: true, noAuto: true });
      }

      const eid = q.get("event");
      if (q.get("favorites") === "1") {
        state.favoritesOpen = true;
        setPanel(true);
        lastPanelKey = "";
        renderPanel(true);
      } else if (eid && byId[eid]) {
        openEvent(byId[eid]);
      } else {
        const cid = q.get("country");
        if (cid) {
          const f = (map.features || []).find((x) => x.properties.iso3 === cid || x.properties.iso2 === cid || x.properties.n === cid);
          if (f) openCountry(f, { skipGroup: true });
        } else {
          const theme = q.get("theme");
          const region = q.get("region");
          // Old "China chronicle" links now open the China country lens, where
          // the rival-regime list lives.
          if (theme === "china") {
            const cn = (map.features || []).find((x) => x.properties.iso3 === "CHN");
            if (cn) openCountry(cn, { skipGroup: true });
          } else if (region && (A.regionNav || []).some((r) => r.id === region)) focusRegion(region);
        }
      }

      if (state.eventView || state.country || state.route || state.searchQuery) setPanel(true);
      else if (state.panelOpen) { lastPanelKey = ""; renderPanel(true); }
      updateRegionActive();
      drawTicks();
      updateChrome();
    } finally {
      setTimeout(() => {
        navigatingHistory = false;
        // The state may have moved while applying the link (opening an event
        // jumps to its year); keep the address bar in step.
        syncURL(false);
      }, 0);
    }
  }

  /* ── go ─────────────────────────────────────────── */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
