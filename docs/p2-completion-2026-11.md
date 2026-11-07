# P2 完成记录 / P2 completion

Date 2026-11-07. 覆盖 P2-1 至 P2-6 与最终复审。所有改动为本地提交（用户使用 GitHub Desktop 推送）；未执行 `git push`、未发 PR、未改 remote。

## 1. 提交

| 提交 | 内容 |
|---|---|
| `f6208cf` | P2-1 地图剧场统一舞台、淡入淡出、静态末帧、尺度归一、标签降权 |
| `fe77466` | P2-2 60 条完整史志（总 112）、来源校验与标签修正、“为何重要” |
| `184e76c` | P2-3 迷你地图、half 抽屉压缩、路线折叠、筛选单行、现代国家折叠 |
| `fd794ec` | P2-4 面板两个主操作 + “更多”菜单、头部一句摘要 |
| `bce69ac` | P2-5 焦点交接、迷你地图键盘、reduced-motion 与 44px 覆盖层 |
| `04a4a98` | P2-6 现代国名多语言回退、详情按需载入、性能测量、拆分计划、P3 路线图 |
| `eb7eed2` | 搜索/路线分隔线语义、时间轴范围/步长常驻、手机政体单行 |

`docs/content-pass-2026-11.md`、`docs/app-split-plan.md`、`docs/p3-roadmap.md` 为配套文档。

## 2. 验证数字

| 项 | 结果 |
|---|---|
| 事件 / 视觉家族 / 分派错误 | **521 / 56 / 0** |
| Hero / Tier B | **32 / 29**，映射未变 |
| `data/event_details.json` | **112** 条；来源 **226** 个（201 唯一 URL）；新增 60 条含“为何重要” |
| Hero 史志覆盖 | **32 / 32** |
| Tier B 史志覆盖 | **29 / 29** |
| 3 条主题路线事件覆盖 | **28 / 28**（按路线内出现计） |
| 1937 东亚组 | **3 / 3**（卢沟桥、南京、淞沪） |
| `node scripts/validate-data.mjs` | ✓ 521 events valid |
| `node scripts/build-data.mjs` | ✓ `data_bundle.js` **572 KB**（详情拆出前 911 KB） |
| `node scripts/build-scene-taxonomy.mjs` | ✓ 521 / 56 / 0 mismatches |
| `node --check js/*.js` | ✓ 全部通过 |
| `npm run smoke` | **46 / 46**（含 16 秒检查） |
| `npm run content-check` | **112 / 112**，无“背景待补”误报，来源链接 ≥2 |
| 来源 URL 可达性 | 201 个唯一 URL；最终扫描无 404（403/429 为站点反爬/限流） |
| 深链 | `?event=hiroshima`、`?country=JPN&year=1937`、`?route=silk-sea`、`?search=核` 均正确 |
| 浏览器后退/前进 | 事件关闭/重开正确 |
| 分享 | URL 含 `year=1945&event=hiroshima`，toast 正常 |
| 16 秒 | `active=false`、`units=0`、`still` 静态末帧保留 |
| 贸易 LOD | 1 条路线 / 1 艘船 |
| 战斗上限 | 斯大林格勒 16 units |
| 台湾 | 2026 仍为 `province` 实体，界面标签“台湾” |
| 面板滚动 | scrollTop 160，地图 zoom 不变 |
| 390×844 | 无横向溢出；half 头部 88px、正文 251px、首屏 5 条（时代面板） |
| RTL 390×844 | 无横向溢出；现代国名使用阿拉伯语 |
| 1440×900 | 正常；2026 头部 136px（复审记录约 169px） |

### 性能（本机 Chrome，非真机）

`npm run perf`（1440×900，本地 HTTP，无 gzip）：

- 首屏：FCP 88ms，可交互（地图 features 就绪）**192ms**；手机 390×844 **169ms**；
- 剧场：5 秒采样平均 **16.6ms/帧**，p95 16.7ms，最大 16.8ms；
- 全事件（521）在 zoom 1 的 `drawBase` 约 **8ms**，pins 约 1ms；
- 资源（gzip 估算）：data_bundle 209KB、app 46KB、scenes 26KB、hero 81KB、variant 12KB、theatre 23KB、map 14KB、world.geo 247KB、event_details 105KB（按需）。
- **未在低端 Android / iOS Safari / 弱网真机验证**；这是 P3-1。

## 3. P2-1 至 P2-6 完成内容

### P2-1 地图剧场
- 统一舞台：纸色径向晕染、暗角、抖动撕纸墨边；全部场景共用 `drawStage`。
- 尺度归一：`sceneTargetW = clamp(map.W × 0.33, 230, 520)`；Hero/Tier B 与通用场景按可用地图宽度归一，主视觉约 28–35%。
- 主视觉：新增战争/行进阵列、港口徽章、灾变火山/裂纹/疫病徽章；通用 city 改为带城墙的聚落，revolution 改为街垒场景；Tier B 城墙加侧面与顶面、背景改为羽化晕染。
- 标签降权：场景半径内 0.46、1.9 倍半径内 0.3、更远 0.14；历史实体、国家标签、halo 标签同步。
- 动效：相机 620ms → 场景延迟 520ms 起 280ms 淡入 → 面板/抽屉延迟 0.58s/0.74s；关闭 520ms 淡出。
- 16 秒：停止运动并冻结末帧 260ms 后转为静态 `still`，不再清空；活动状态仍按硬约束置 false、units/routes 清空。
- 贸易跨日界线中心修复（Lapita 不再把镜头拉到非洲）。

### P2-2 内容
- 60 条新史志：23 Hero、25 Tier B、10 路线事件（与上重叠不重复）；每条摘要/背景/经过/结果/为何重要/参与方/日期地点/2 来源，`verification: partial`。
- 修复 25 条旧条目失效来源并同步标签；3 条旧条目补第二来源。
- 面板与弹窗显示“为何重要”；简要条目改为明确文案“本条为策展摘要：长文、参与方与来源仍待补齐，不以推测填充”。
- 统计见 `docs/content-pass-2026-11.md`。

### P2-3 手机
- 迷你地图：世界轮廓 + 当前视野框 + N 标记 + “全图”按钮；点击定位，方向键平移，Enter 回到焦点；`localStorage("world-atlas-fit")` 记忆。
- half 抽屉：头部 88px、正文 251px、5 条事件；路线条折叠为一行；类别筛选单行横滑；现代国家 8 个 + “全部 196”；政体 chips 单行横滑。
- RTL 面板宽度约束修复（nowrap 筛选不再把面板撑到 684px）。

### P2-4 面板
- 头部：事件标题 + 一句截断摘要（不再只放英文名）。
- 动作：`展开史志`（主）+ 暂停/继续图标；重播/朗读/分享/国家沿革进入 `<details>` “更多”菜单；Enter/Escape/外部点击均可关闭。
- 暂停图标与剧场卡同步；手机动作行 342px < 正文 386px。

### P2-5 无障碍
- 打开事件焦点到 `#panel-title`；关闭回到触发控件 → 地图节点 → 时间轴；展开 drawer 焦点到把手；收起面板焦点到“卷”。
- 迷你地图可聚焦、方向键操作；`summary`/`canvas` 增加焦点环。
- 44px 地图节点覆盖层保持；时间轴 slider ARIA 保持；`aria-expanded/aria-pressed/aria-controls` 覆盖新控件。
- reduced-motion：剧场静态、自动播放关闭、脉冲/行进光点/旋转印章停止；烟雾测试验证。

### P2-6 多语言与工程
- ES/FR/AR 现代国家/地区名使用 Natural Earth 对应语言；历史实体仍中英优先，凡例底部说明回退规则。
- 详情 JSON 从首屏 bundle 拆出按需载入（911KB → 572KB），加载时 skeleton；历史标签 450ms 淡入；聚类缓存；DPR 上限 2。
- `app.js` 拆分：本轮不做，计划见 `docs/app-split-plan.md`。
- 版本 2.4.0，资源 `20261108l`。

## 4. D1–D7 复审

| 项 | 状态 | 证据 / 说明 |
|---|---|---|
| D1 剧场是贴在舆图上的矢量小插图，缺统一舞台、标签竞争、无淡入淡出 | **已修复** | `theatre.js` `drawStage`/`labelWeight`/`alpha`；截图 `p2-1-*.jpg`；smoke stage 比例与标签降权 |
| D2 Hero/Tier B/通用三层质量断层 | **部分** | 通用 city/revolution/war/disaster 重做、Tier B 墙体质感、Hero 尺度提升；三层仍按设计保持不同精细度，扩量与统一质量门槛在 P3-2 |
| D3 面板 6 个按钮换行、头部过重 | **已修复** | 2 主操作 + 更多菜单；2026 头部 136px（原约 169px）；手机 88px；smoke 动作层级/键盘菜单 |
| D4 时间范围/步长不可见、聚焦近现代跳年、隐藏手势 | **部分** | 时间轴常驻“范围 … · 步进 … 年”，聚焦近现代改为就近夹取（1500 → 1750）；Shift 刷选/双击时代仍是隐藏手势，只在引导与 title 中提示 |
| D5 移动铺满无方向感/迷你地图，边缘标签被裁 | **已修复** | 迷你地图 + 全图返回 + 点击/键盘定位；标签边缘内缩保持；RTL 无溢出 |
| D6 动效未编排，16 秒突然清空 | **已修复** | 相机→场景→面板/抽屉；520ms 淡出；16 秒静态末帧；smoke 验证 |
| D7 8.5px 小字号、图例形状太小、欧洲标签仍挤 | **部分** | 剧场内标签降权/避让改善；基础 8.5–10px 字号与图例尺寸未改（超出 P2 范围，交由 P3-4 WCAG/对比度复核） |

## 5. U1–U9 复审

| 项 | 状态 | 证据 / 说明 |
|---|---|---|
| U1 节点结果不一致（亚齐小徽章/君士坦丁堡矩形/广岛完整场景） | **已修复** | 统一舞台与尺度；亚齐走港口徽章；1453 Tier B 墙体有体积；1791 街垒；1945 Hero 保持最高精细度（层级仍不同属设计） |
| U2 16 秒清理与阅读面板冲突 | **已修复** | 16 秒后保留静态末帧，面板可继续阅读；关闭时 520ms 淡出 |
| U3 重点事件仍是简要条目、没有“为什么重要” | **部分** | 112 条完整（Hero/Tier B/路线/1937 全覆盖），60 条有“为何重要”；409 条简要条目明确标注、不伪造长文 |
| U4 时间轴需要读说明书、范围/步长不常驻 | **部分** | 范围/步长常驻；步进提示、悬浮年份、刻度吸附仍在；刷选/双击等手势未做成显式控件 |
| U5 搜索/路线结果沿用“此刻”分隔线 | **已修复** | `eventList(..., {now:false})`；深链测试 route/search `divider=false` |
| U6 手机 half 抽屉头部吃掉正文、只显示 2–3 条 | **部分** | 时代面板头部 88px、正文 251px、5 条；2026 因现代国家区块只显示 1–2 条（该区块是主导航，P2-4 要求默认 8 个） |
| U7 铺满无空间记忆/全图返回 | **已修复** | 迷你地图、视野框、全图按钮、localStorage、点击/键盘定位 |
| U8 ES/FR/AR 地图地名混合语言 | **部分** | 现代国家/地区名已本地化；1,800+ 历史实体仍中英回退，凡例说明；全量翻译在 P3-3 |
| U9 焦点、reduced-motion、ARIA/键盘 | **已修复** | 焦点交接、44px、菜单/迷你地图键盘、reduced-motion 静态；正式 WCAG/SR 审计在 P3-4 |

## 6. 未完成 / 无法验证

- **真机性能**：未在低端 Android、iOS Safari、弱网实测；本机数字不代表真机（P3-1）。
- **屏幕阅读器**：未用 NVDA/VoiceOver 完整走查，只做了键盘与 ARIA 检查（P3-4）。
- **剩余长文**：409 条仍为简要条目，其中 143 条 featured；未批量伪造。
- **历史实体翻译**：1,800+ 条仍中英为主；现代国家名已本地化（P3-3）。
- **app.js 拆分**：未执行，计划见 `docs/app-split-plan.md`。
- **D2/D4/D7/U4/U6/U8** 为部分完成，原因见上表；不是回归。收口映射：D2→P3-2，D4/U4/U6/D7→P3-8，U8→P3-3，D7→P3-4。
- P3 路线图已补 P3-8（时间轴显式刷选/范围、2026 half 首屏、字号/图例）与台湾标签本地化项。
- 资源版本 `20261108l`；用户需用 GitHub Desktop 推送后 GitHub Pages 才会更新。

## 7. 截图

`docs/p2-shots/`：

- `p2-1-war-kadesh.jpg`、`p2-1-war-constantine.jpg`、`p2-1-revolution-haiti.jpg`、`p2-1-city-jericho.jpg`、`p2-1-trade-lapita.jpg`、`p2-1-atomic-bikini.jpg`、`p2-1-disaster-thera.jpg`、`p2-1-hero-giza.jpg`、`p2-1-hero-silk.jpg`、`p2-1-still-after-16s.jpg`
- `p2-1-m-war-kadesh.jpg`、`p2-1-m-trade-lapita.jpg`、`p2-1-m-rev-haiti.jpg`
- `p2-3-mobile-half.jpg`、`p2-3-mobile-fill-minimap.jpg`、`p2-3-mobile-peek.jpg`、`p2-3-mobile-rtl.jpg`、`p2-3-mobile-2026-half.jpg`
- `p2-4-1440-event-actions.jpg`、`p2-4-390-event-actions.jpg`
- `p2-6-es-2026.jpg`

## 8. 复跑命令

```bash
python3 -m http.server 8001 --directory .
node scripts/validate-data.mjs
node scripts/build-data.mjs
node scripts/build-scene-taxonomy.mjs
node scripts/content-check.mjs
npm run smoke
npm run perf
```

## 9. P3

见 [P3 路线图](p3-roadmap.md)：P3-1 真机性能 → P3-5 CI → P3-4 WCAG/SR → P3-7 数据 QA → P3-3 翻译与长文 → P3-2 场景扩量 → P3-8 交互细节收口 → P3-6 产品功能。

## 10. 键盘与 reduced-motion 走查记录（2026-11-07）

**Tab 顺序（1440×900，1937 年）**：品牌 → 搜索 → 雅乐 → 语言 → 图层 → 凡例 → 复位 → 地区条（亚洲…中国江山时序）→ 地图节点（卢沟桥、南京、淞沪、西安、西班牙内战、意埃战争、长征）→ 放大/缩小/全图/铺满 → 面板 → 时间轴 → 其他控件。地图节点保持 44×44 覆盖层，聚焦时显示 2px 朱红焦点环。

**操作**：
- 搜索框输入后 `↓` 选择、`Enter` 打开事件、`Esc` 关闭；
- 时间轴 `←/→` 按年代步进、`↑/↓` ±1、`Shift` ×10、`Space` 播放；slider 的 `aria-valuetext` 随年份更新；
- 事件面板 `Tab` 到“更多”，`Enter` 展开，`Tab` 进入重播/朗读/分享/国家沿革，`Esc` 关闭并回到“更多”；
- 打开事件后焦点落到 `#panel-title`；关闭后回到触发控件/地图节点/时间轴；
- 抽屉 peek 的“展开”点击后焦点回到把手；收起面板后焦点到“卷”；
- 迷你地图聚焦后 `←/→/↑/↓` 平移，`Enter` 回到当前焦点；
- `prefers-reduced-motion: reduce`：剧场停在 p=4.2、自动播放关闭、脉冲/行进光点/旋转印章停止、CSS 过渡近零；场景仍可读。

**未做**：NVDA/VoiceOver 完整朗读走查（P3-4）。
