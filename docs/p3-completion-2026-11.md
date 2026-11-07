# P3 第一轮完成记录 / P3 completion

Date 2026-11-07. 覆盖 P3-1 至 P3-8 的第一轮。所有改动为本地提交；用户通过 GitHub Desktop 推送，未执行 `git push`、未发 PR。

## 1. 提交

| 提交 | 内容 |
|---|---|
| `4d8ce94` | 地图标签由“台湾省”改为“台湾”（数据仍为 province / parent china；国家面板/沿革不变） |
| `9e8c68a` | P3-8 可见刷选、时间轴范围/步长、2026 half 5 条、字号/图例 |
| `81fffbe` | P3-1 场景/沿革/详情按需载入、历史图层延后、gzip/弱网测量 |
| `07b03e5` | P3-5 CI、Pages 部署前校验、版本脚本 |
| `fb08fde` | P3-4 对比度、跳过链接、弹窗 inert/Tab 陷阱、a11y 审计 |
| `16837ce` | P3-7 19 条机构来源、数据 QA 报告与 CI 检查 |
| `b273803` | P3-6 收藏、3 条新路线、分享卡片、PWA/离线 |
| `f111638` | P3-3 64 条 curated 实体 ES/FR/AR 翻译 |
| `39bfd8b` | P3-2 Tier B 29→45、modern/caravel 构图增强 |

## 2. 验证

| 项 | 结果 |
|---|---|
| 事件 / 视觉家族 / 分派错误 | **521 / 56 / 0**（未变） |
| Hero / Tier B | **32 / 45**（Tier B 29→45；Hero 未变） |
| 完整史志 | **112** 条；Tier B 中 32/45 有完整史志 |
| 主题路线 | **6** 条（新增环境与灾变 8、疾病与医学 5、海洋与远航 9） |
| `validate-data` / `build-data` / `build-scene-taxonomy` | ✓ / 572 KB / 521·56·0 |
| `node --check js/*.js` | ✓ |
| `npm run smoke` | **53 / 53**（含 16 秒静态末帧、收藏、6 路线、RTL、reduced-motion） |
| `npm run content-check` | **112 / 112** |
| `npm run a11y` | **14 / 14** |
| `npm run pwa` | **4 / 4**（manifest/图标、SW activated、离线重载地图、零错误） |
| `npm run data-qa` | 245 来源；0 越界；0 重复 id；机构来源 22.4% |
| `npm run entity-i18n` | 活跃实体 91%、实际显示标签 90%（2026 100%） |
| `npm run perf`（本机） | ready **128 ms**，521 事件 drawBase 7 ms |
| `npm run perf:throttle`（gzip + Slow4G + CPU4×） | FCP **708 ms**，ready **4.27 s**，首屏 **1.05 MB**，剧场 16.6 ms/帧 |
| 390×844 | 无横向溢出；2026 half 首屏 5 条；half 头部 88px |
| 1440×900 | 正常；2026 头部约 136px |
| 台湾 | 地图标签显示“台湾”；国家面板/沿革仍为“台湾省”；数据 `type: province`、`parent: china`，不计入现代国家 |

## 3. P3-1 至 P3-8 状态

### P3-1 真机性能、内存与首屏 — **部分**
- 完成：Hero/Tier B 场景（490 KB）、国家沿革（921 KB）、事件详情（310 KB）按需载入；基础地图先交互，历史边界/实体/国家兴亡延后 120ms；世界 GeoJSON 恢复 774 KB 单行；新增 gzip 服务器与 CDP 弱网探针。
- 结果：模拟 Slow 4G（1.6 Mbps/150 ms）+ CPU 4× + gzip，可交互 4.27s、首屏 1.05 MB；本机 128ms。
- 未完成：低端 Android / iOS Safari / DPR 3 / 真实弱网 / 内存峰值。模拟不能替代真机。

### P3-2 Hero / Tier B 扩量 — **部分**
- 完成：Tier B 29→45（14 个 modern 政治变体、阿兹特克 siege、西班牙无敌舰队 caravel）；modern 地图场景改为广场/议会/人群/旗帜，caravel 改为双船/海浪/海鸥；Stalingrad 的 siege 变体因“中世纪城墙误表 1942 城市战”被移除。
- 未完成：Hero 32→60、Tier B 100–150、Gate 2/3 盲测、新家族（cavalry/city/monument/revolution/disaster）。本轮 16 个变体只是参数种子批次，不能宣称 Gate 3 达标；详见 `docs/p3-2-scenes.md`。

### P3-3 历史实体全量多语言与剩余长文 — **部分**
- 完成：64 条 curated 实体全部补齐 ES/FR/AR；标签优先 `name[lang]`；现代国家继续用 Natural Earth；抽样覆盖率 91%（活跃）/90%（显示），2026 100%。
- 未完成：1,800+ 条历史快照标签、112 条史志的 ES/FR/AR 长文、409 条简要条目。理由与回退规则见 `docs/p3-3-i18n.md`。

### P3-4 正式 WCAG / 屏幕阅读器审计 — **部分**
- 完成：颜色 token ≥4.5:1（最差纸底）；跳过链接；弹窗 `inert` + Tab 陷阱 + 焦点恢复；装饰画布 aria-hidden；`a11y` 14 项自动检查；WCAG 2.2 AA 对照表。
- 未完成：NVDA/VoiceOver 实测、200%/400% 缩放、高对比模式、画布标签逐项对比度。见 `docs/wcag-audit-2026-12.md`。

### P3-5 CI / 发布 / 缓存 / 错误监控 — **完成（代码）**
- 完成：`ci.yml`（validate/build/taxonomy/syntax/content/a11y/data-qa/PWA/smoke）；`pages.yml` 部署前 verify；`bump-version.mjs` 同步 index/app/entities/sw，且不会把版本回退；发布/回滚文档。
- 未完成：未在 GitHub Actions 上实际运行（需用户推送后验证）；错误监控按隐私原则未接入。见 `docs/ci-release.md`。

### P3-6 产品功能 — **完成（第一版）**
- 完成：收藏/书签（事件/国家/路线/时刻、F 快捷键、`?favorites=1`、localStorage）；3 条新路线；1200×630 分享卡片（Web Share/下载）；PWA manifest、192/512 图标、network-first SW、离线重载地图。
- 未完成：账号同步/导入导出、国家/路线分享卡片、安装引导、更新提示、离线状态条、iOS 真机。见 `docs/p3-6-product.md`。

### P3-7 数据 QA — **部分**
- 完成：245 来源、0 越界、0 重复 id、每条 ≥2 来源；新增 19 条机构来源（UNESCO/NPS/NASA/Nobel/铁路博物馆）；20 条高敏感条目人工阅读；抽样标签可见重叠 0、边缘裁切 0；修复 2 处中英混排。
- 未完成：机构来源 22.4%（目标 60%）；64 条无机构来源；共享 WWII 页面仍复用；41 条敏感条目仅关键词扫描。见 `docs/data-qa-2026-12.md`。

### P3-8 交互细节收口 — **完成**
- 完成：可见“刷选”按钮（B 快捷键、toast、范围 chip）；范围/步长常驻；聚焦近现代就近夹取；2026 half 5 条事件；正文/图例/地图标签 ≥10–11px；路线条 6 条。

## 4. 未完成 / 无法验证

- **真机性能与内存**（P3-1）：无低端 Android、iPhone SE/Safari、DPR 3 设备。
- **屏幕阅读器**（P3-4）：无 NVDA/VoiceOver 实测。
- **Hero 扩量/盲测**（P3-2）：未产出新插画，未做 Gate 2/3。
- **全量翻译/长文**（P3-3）：1,800+ 快照标签、409 条简要条目未完成。
- **机构来源 60%**（P3-7）：22.4%，未达标。
- **CI 实际运行**（P3-5）：需推送后在 GitHub Actions 验证。
- **PWA iOS 真机**（P3-6）：未验证安装与离线行为。

## 5. D/U 复审映射（P2 遗留）

| 项 | P3 状态 |
|---|---|
| D2 三层质量断层 | 部分：Tier B +16、modern/caravel 构图增强；Hero 未扩量 |
| D4/U4 时间轴范围/隐藏手势 | 已修复/部分：显式刷选与范围常驻；双击时代、Alt+滚轮仍无显式按钮 |
| D7 小字号/图例 | 部分：正文/图例/地图标签 ≥10–11px；8.5px 装饰性文字仍存在 |
| U3 简要条目 | 部分：112 条完整；13 个新 Tier B 事件仍为简要条目 |
| U6 2026 half 首屏 | 已修复：5 条事件（现代国家折叠为筛选行内 chip） |
| U8 多语言混合 | 部分：64 curated + 2026 现代国名已本地化；快照标签仍英文回退 |

## 6. 下一步

按 [P3 路线图](p3-roadmap.md) 继续：真机矩阵与内存（P3-1）→ CI 实跑与错误监控决策（P3-5）→ NVDA/VoiceOver（P3-4）→ 机构来源与敏感条目（P3-7）→ Hero/Gate 3（P3-2）→ 全量翻译/长文（P3-3）→ PWA 安装/更新体验（P3-6）。
