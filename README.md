# 寰宇时序 · World Chronicle

> 从猛犸猎场到人工智能：一张可以走进去的全球文明地图。
> From mammoth hunts to artificial intelligence — a world history you can walk into.

**寰宇时序** 把「江山时序」的中国历史地图设计语言，扩展成一幅全球尺度的交互式文明地图。时间从公元前 12000 年延伸到今天；地图本身会动——战争在地理空间里推进，驼队与商船沿着真实商路行走，新国家在原野上亮起，旧帝国在年表中熄灭。

**v2 重点**：地图内动态剧场、18 个时代的历史疆域多边形、逐国「国家沿革长卷」、国家兴亡图层、五种界面语言、程序化雅乐与朗读，以及一套可协作的 JSON 数据管线。

**v2.3 英雄插画 Pilot 1**：521 个事件全部映射到 56 个视觉家族（0 条分派审计错误）；地图节点使用限尺寸版画徽章；30 个主题（32 个事件条目）有插画级场景（首批 12 + 2A 6 + 2B 6 + 2C 6，含 1945 日本事件组），v3 完成线质与材质精修；32 个枢纽条目进入 Hero 清单；Tier B 覆盖 29 个变体（siege / caravel / modern，含 1949 与 12 个关键战争节点），其余事件继续按 56 家族绘制。资源版本 `20261108e`。

**v2.1 重点**：地图上的名称改为随年份变化的历史实体层（默认历史模式，现代国名可选）；新增顶部地区导航与中国江山时序专题；重大事件接入统一触发与事件组，1945 年点击日本可直接看到核爆动态与完整事件链；事件详情补齐背景、经过、结果、参与方与来源；右侧面板支持滚轮、触控板与滚动条；新增 Phase 0 清单与覆盖报告（`docs/`）。

---

## 快速开始

```bash
cd "世界时序地图"
python3 -m http.server 8000
```

打开 <http://localhost:8000>。默认停在 **1500 年的大航海时代**；向左拖动回到史前，向右到今天。

> 请通过 HTTP 打开，而不是双击 `index.html`：地图与数据都通过 `fetch` 载入。

无需构建即可运行；提交数据或修改翻译后，见下方「构建与验证」。

**分享给家人**：Mac 双击 `start.command`，Windows 双击 `start.bat`；或把文件夹拖到 [Netlify Drop](https://app.netlify.com/drop) 获得公开网址。详细步骤（局域网、GitHub Pages、手机、常见问题）见 [分享与部署.md](分享与部署.md)。在线访问直接用上面的网址即可；如需离线发送，可使用本地生成的 `世界时序地图-分享包.zip`（解压后双击 `start.command` / `start.bat`）。

---

## 怎么玩

| 操作 | 效果 |
| --- | --- |
| 拖动 / 点击底部时间轴 | 在 14000 年里穿行；每个时代在轴上占不同宽度 |
| `空格` 或播放按钮 | 自动播放整部历史（1× / 2× / 4×） |
| **点击地图节点** | **在地图本身展开动态剧场**：战线、军队、舰队、商队、核爆冲击波；左下角出现事件卡 |
| 事件卡「展开史志」 | 打开木刻版画风格的完整场景与双语史志 |
| 点击任意国家 | 国家透镜 + 「国家沿革长卷」；有商路的国家会在地图上出现驼队/商船 |
| 点击「国家兴亡」条目 | 跳到该国新生/消亡的年份，地图上出现绿色新生或灰色消亡脉冲 |
| 图层 | 历史疆域、事件节点、文明光晕、全球联动、现代国名、国家兴亡、全部历史 |
| 语言 | 中 / EN / ES / FR / AR；阿拉伯语自动切换 RTL |
| 搜索 | 国家、文明或事件；支持本地化国名 |
| `←` `→` | 逐年；`Shift` 十倍；`/` 搜索；`Esc` 关闭 |
| 声音 | 「雅乐」开启合成环境音；事件卡/史志中的「朗读」使用浏览器语音 |

右侧「此刻世界」卷轴可展开/收起。移动端默认全屏地图，点击「此刻世界」打开编年史。

### 分享链接

- `?year=1945` —— 1945 年的世界
- `?event=hiroshima` —— 直接播放广岛核爆的地图剧场
- `?country=CHN` —— 中国国家透镜与沿革长卷
- `?lang=ar` —— 阿拉伯语界面

事件 ID 是由英文标题生成的稳定 slug（例如 `world-war-ii-begins`、`the-silk-road`）。

---

## v2 内容

### 1. 地图内动态剧场

点击节点后，不再先弹出一个脱离地图的舞台，而是：

- 镜头飞到事件对应的地理范围；战区国家被轴心色/同盟色染色；
- 战线以带火星的虚线绘制，军队、战马、战车、火炮、坦克、舰船、飞机在坐标上移动；
- 全球战争（一战、二战、蒙古西征等）同时展示多条战线、多个战场与结束标记；
- 丝绸之路、马尼拉大帆船、大西洋三角贸易、印度洋季风、一带一路等以驼队/商船/船队沿真实路径行进；
- 原子弹以轰炸机、投弹、全图闪白、冲击波环与蘑菇云直接落在地图上的广岛；
- 疫情、海啸、火山以扩散环与多点爆发呈现；
- 革命、长征、食盐进军以人群、旗帜与行军纵队呈现。

事件卡保留史志入口；完整舞台仍可打开，但地图是主叙事面。

### 2. 历史疆域多边形

不再只用光晕示意。`data/historical/` 包含 18 个时代快照（前 3000、前 1000、前 500、公元 1、500、1000、1300、1500、1600、1700、1815、1900、1914、1938、1945、1960、1994、2010），由 [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) 简化而来：

- 每个时代按彩色多边形绘制政权，带中英文标签（主要政权有中文名）；
- 年份变化时加载最近快照，地图注记显示「历史疆域 · 1500 · 示意性边界」；
- 「文明光晕」作为辅助图层保留，可在图层中打开；
- 1995 年以后回到现代国界图层。

历史边界为示意性数字化，不构成精确国界或领土主张。

### 3. 国家沿革长卷

每个现代国家都有一条连续的「长卷」：

- 从最早的取样政权（或史前社群）开始，按时代分段；
- 每段显示年代、时代、政权名与国界内的策展节点；
- 现代国家段以「新生 1949」等标记锚定在策展的建国/独立年；
- 中国的长卷从「地方社群 → 华夏 → 汉 → 晋 → 宋 → 元 → 明 → 清 → 中国 → 中华人民共和国」；
- 法国、印度、埃及、尼日利亚、美国等均有各自的政权序列；
- 234 个国家/地区都有条目，205 个已有专属节点；其余仍可通过长卷、历史疆域与文明层理解。

### 4. 国家兴亡

`data/state_changes.json` 收录 200 余个现代国家形成年与 18 个重大消亡/分裂事件：

- 1960 年非洲独立年会在图上同时亮起十余面绿色新生旗；
- 1991 年苏联/南斯拉夫解体以灰色断环呈现；
- 国家透镜与长卷中显示「新生」年；
- 地图图层、侧栏列表、时间轴刻度三处联动。

### 5. 场景与变体

25 种程序化场景，随文明与时代变化：

- 建筑：金字塔、巨石阵、柱廊、穹顶、佛塔、吴哥莲花塔、T 形石柱、摩艾、阶梯塔；
- 船只：地中海桨帆船、中国福船、波利尼西亚双体独木舟、卡拉维尔帆船、蒸汽船；
- 骑兵：草原弓骑兵、欧洲骑士、波斯/拜占庭具装骑兵、近代龙骑兵；
- 城市：古代城墙/塔庙/宣礼塔与近代摩天楼两套构图；
- 战争形态：车战、方阵、攻城、骑战、海战、炮战、火枪线列、堑壕、空袭、核爆。

### 6. 语言与声音

- 界面：中文、English、Español、Français、العربية（RTL）；
- 国家名：五种语言（Natural Earth / world-countries）；
- 时代、地域、类别：五种语言；
- 事件全文：中文、English、Español、Français、العربية，均含标题与摘要（机器辅助翻译，可继续校对）；
- 「雅乐」：Web Audio 合成的低频 drone、五声音阶拨弦与延迟回声，随时代换调；
- 「朗读」：浏览器 `speechSynthesis` 按当前语言朗读标题与摘要。

### 7. 协作数据管线

- 数据源：`data/meta.json`、`events.json`、`polities.json`、`theatre.json`、`state_changes.json`；
- `node scripts/validate-data.mjs` 校验字段、坐标、类别、场景、slug、联动坐标、剧场键、国家码与历史快照；
- `node scripts/build-data.mjs` 生成 `js/data_bundle.js`；
- `python3 scripts/build-chronicles.py` 重建逐国长卷；
- 详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 目录结构

```
世界时序地图/
├── index.html
├── css/style.css
├── data/
│   ├── meta.json                时代、地域、类别、场景
│   ├── events.json              521 个策展节点（含 1945 事件链与覆盖补编）
│   ├── event_details.json       重点事件的结构化详情与来源
│   ├── event_groups.json        事件链/事件组（如日本 1945）
│   ├── regions.json             顶部地区导航的相机预设
│   ├── historical_entities.json 历史实体标签层（生成）
│   ├── entities_curated.json    中国/日本/澳洲等策展实体
│   ├── polities.json            125 个并立文明光晕
│   ├── theatre.json             地图剧场：战线、战役、商路
│   ├── state_changes.json       国家新生与消亡
│   ├── country_chronicles.json  逐国沿革长卷（生成）
│   ├── world.geo.json           234 个现代国家/地区（50m 简化，五语国名）
│   └── historical/              18 个历史疆域快照（GPL-3.0）
├── js/
│   ├── data_bundle.js           由 JSON 生成，不要手改
│   ├── historical.js            历史疆域图层
│   ├── theatre.js               地图内动态剧场
│   ├── statechanges.js          国家兴亡图层
│   ├── hero-scenes.js           12 个英雄插画场景（地图徽章 + 完整舞台）
│   ├── scenes.js                25 个程序化场景与地图微缩动画
│   ├── map.js                   Robinson 投影、渲染、拾取、光晕、节点、联动
│   ├── audio.js                 合成雅乐与朗读
│   ├── i18n_extra.js            ES / FR / AR 界面翻译
│   └── app.js                   时间轴、面板、搜索、国家透镜、剧场卡、语言
├── scripts/                     构建、简化、校验与长卷生成
├── docs/                        Phase 0 事件清单与覆盖矩阵
├── CONTRIBUTING.md
├── LICENSE                      GPL-3.0
└── README.md
```

---

## 构建与验证

```bash
npm run validate   # 校验 JSON 数据
npm run build      # 生成 js/data_bundle.js
npm run serve      # 本地静态服务器
```

完整重建（需要外部源数据）：

```bash
python3 scripts/build-historical.py /path/to/historical-basemaps/geojson
python3 scripts/build-world-50m.py /path/to/countries-50m.json
python3 scripts/enrich-world-i18n.py /path/to/countries.json
python3 scripts/build-state-changes.py
python3 scripts/build-coverage-events.py
node scripts/build-data.mjs
python3 scripts/build-chronicles.py
# optional: re-run machine-assisted translations (network)
python3 scripts/translate-events.py
```

---

## 文档与报告

- [重大事件清单](docs/major-events.md)
- [地区 × 时代覆盖矩阵](docs/coverage-matrix.md)
- [测试与已知限制](docs/qa-and-limitations.md)
- [分享与部署](分享与部署.md)

## 数据来源

- **现代国界**：Natural Earth 50m，经 [world-atlas](https://github.com/topojson/world-atlas) TopoJSON 解码、简化；国名多语种来自 [world-countries](https://www.npmjs.com/package/world-countries)。
- **历史疆域**：[aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)，GPL-3.0；本项目做了坐标简化与标签预计算。
- **历史节点**：本项目原创策展，年代取通行学界纪年；不同学派存在差异。
- **翻译**：西班牙文、法文、阿拉伯文为机器辅助翻译（Google Translate），可继续人工校对。
- **设计语言**：取意于 DeanChensj 的「江山时序」中国历史地图（[GitHub](https://github.com/DeanChensj/jiangshan-map)）；本项目为独立的全球尺度实现，未复制其代码或数据。

## 免责声明

现代国界仅作地理参照，不代表任何领土主张。历史疆域为示意性数字化，文明光晕为「影响圈」而非精确边疆。动画为写意版画风格，不是考古复原。国家形成年份为策展性近似。并非每个国家都有专属节点；每个国家都有沿革长卷与国界内的节点索引。

## License

**GPL-3.0**。历史边界数据本身即为 GPL-3.0；本项目整体沿用同一许可，详见 [LICENSE](LICENSE)。
