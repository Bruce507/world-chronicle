# 英雄场景选片矩阵 / Hero Selection Matrix

Version 1.0 · 2026-11-06. 用于从 24 个候选中选出下一批 18 个，使 Hero Tier 从 12 个主题达到 30 个。

> 执行状态：2A、2B 各 6 个已完成结构复审（4.08/5，见 `docs/hero-2a-review.md`、`docs/hero-2b-review.md`），当前 24 个主题 / 26 个事件条目；2C 可开工，纹理 pass 留到 30 个 Hero。

## 1. 评分模型

| 维度 | 权重 | 说明 |
|---|---:|---|
| 历史转折 | 30% | 是否改变区域或全球走向；是否常被教材/博物馆讲述 |
| 地域覆盖 | 25% | 相对当前 12 个主题的覆盖缺口；非洲、大洋洲、中东、南亚、美洲优先 |
| 视觉差异 | 20% | 是否能支撑独立构图、建筑、人物、道具；是否容易和已有场景区分 |
| 复用价值 | 15% | 能否沉淀新笔刷/新建筑类型/新材质，供 Tier B/C 复用 |
| 用户关注 | 10% | 搜索、点击、教学与传播潜力 |

加权分 = (转折×30 + 覆盖×25 + 视觉×20 + 复用×15 + 关注×10) / 100。

评分为 1–5 的工作估计，不是绝对排名；如有真实流量/教学数据，应替换“用户关注”一列。

## 2. 当前 12 个主题的覆盖

- 中国：宋、清、蔡伦、郑和、玄奘（5）
- 欧洲：罗马、俄国革命、伯罗奔尼撒（3）
- 南亚：泰姬陵（1）
- 美洲：哥伦布（1）
- 日本/1945：广岛、长崎、投降（1 组）
- 太空/全球：阿波罗（1）

缺口：非洲、大洋洲、中东、东南亚、中亚、前哥伦布美洲、现代南亚/全球治理。

## 3. 24 个候选与评分

| # | 事件 id | 主题 | 地区/年代 | 转折 | 覆盖 | 视觉 | 复用 | 关注 | 加权 |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|
| 1 | `pyramids-of-giza` | 吉萨金字塔 | 非洲/古埃及 | 5 | 5 | 5 | 4 | 5 | **4.85** |
| 2 | `the-silk-road` | 丝绸之路贯通 | 中亚/跨区域 | 5 | 4 | 4 | 5 | 5 | **4.55** |
| 3 | `the-hijra` | 希吉拉 | 中东/伊斯兰 | 5 | 5 | 4 | 3 | 4 | **4.40** |
| 4 | `vasco-da-gama-reaches-india` | 达伽马抵达印度 | 印度洋/全球 | 5 | 4 | 4 | 4 | 4 | **4.30** |
| 5 | `genghis-khan` | 成吉思汗建国 | 中亚/草原 | 5 | 3 | 5 | 4 | 4 | **4.25** |
| 6 | `tenochtitlan-founded` | 特诺奇蒂特兰建城 | 中美/阿兹特克 | 4 | 4 | 5 | 4 | 4 | **4.20** |
| 7 | `fall-of-the-inca` | 皮萨罗灭印加 | 南美/安第斯 | 4 | 4 | 5 | 4 | 4 | **4.20** |
| 8 | `athenian-democracy` | 雅典民主改革 | 欧洲/古典 | 5 | 3 | 4 | 4 | 5 | **4.15** |
| 9 | `maurya-empire` | 孔雀王朝 | 南亚/古典 | 4 | 5 | 4 | 4 | 3 | **4.15** |
| 10 | `gutenbergs-press` | 古腾堡活字印刷 | 欧洲/早期现代 | 5 | 3 | 4 | 4 | 5 | **4.15** |
| 11 | `code-of-hammurabi` | 汉谟拉比法典 | 中东/两河 | 4 | 5 | 4 | 3 | 4 | **4.10** |
| 12 | `mali-empire` | 马里帝国 | 西非/中世纪 | 4 | 5 | 4 | 3 | 3 | **4.00** |
| 13 | `qin-unifies-china` | 秦统一六国 | 东亚/古典 | 5 | 2 | 4 | 4 | 5 | **3.90** |
| 14 | `french-revolution` | 法国大革命 | 欧洲/近代 | 5 | 2 | 4 | 4 | 5 | **3.90** |
| 15 | `partition-of-india` | 印巴分治与独立 | 南亚/现代 | 4 | 4 | 4 | 3 | 4 | **3.85** |
| 16 | `the-world-wide-web` | 万维网公开 | 全球/数字 | 4 | 3 | 4 | 4 | 4 | **3.75** |
| 17 | `borobudur` | 婆罗浮屠 | 东南亚/佛教 | 3 | 5 | 4 | 3 | 3 | **3.70** |
| 18 | `maori-reach-aotearoa` | 毛利人抵达新西兰 | 大洋洲/波利尼西亚 | 3 | 5 | 4 | 3 | 3 | **3.70** |
| 19 | `the-black-death` | 黑死病 | 欧洲/全球 | 5 | 2 | 3 | 3 | 4 | 3.45 |
| 20 | `the-reformation` | 宗教改革 | 欧洲/近代 | 5 | 2 | 3 | 3 | 4 | 3.45 |
| 21 | `constantinople` | 君士坦丁堡建都 | 欧洲/拜占庭 | 4 | 2 | 4 | 3 | 4 | 3.35 |
| 22 | `united-nations-founded` | 联合国成立 | 全球/20 世纪 | 4 | 3 | 3 | 2 | 4 | 3.25 |
| 23 | `covid-19-pandemic` | 新冠全球大流行 | 全球/当代 | 3 | 3 | 3 | 3 | 5 | 3.20 |
| 24 | `tang-dynasty` | 唐朝建立 | 东亚/中世纪 | 4 | 1 | 3 | 4 | 4 | 3.05 |

## 4. 入选 18 个

按加权分排序，保留地域约束（至少非洲 1、大洋洲 1、美洲 2、南亚 2、中东 2、东南亚 1、中亚 1；欧洲不超过 4）：

1. `pyramids-of-giza`
2. `the-silk-road`
3. `the-hijra`
4. `vasco-da-gama-reaches-india`
5. `genghis-khan`
6. `tenochtitlan-founded`
7. `fall-of-the-inca`
8. `athenian-democracy`
9. `maurya-empire`
10. `gutenbergs-press`
11. `code-of-hammurabi`
12. `mali-empire`
13. `qin-unifies-china`
14. `french-revolution`
15. `partition-of-india`
16. `the-world-wide-web`
17. `borobudur`
18. `maori-reach-aotearoa`

覆盖检查：非洲 2、中东 2、欧洲 3、东亚 1、南亚 2、美洲 2、大洋洲 1、东南亚 1、中亚 1、跨区域 3。

## 5. 三批 × 6

### 2A · 古代轴心

`pyramids-of-giza` · `code-of-hammurabi` · `athenian-democracy` · `qin-unifies-china` · `maurya-empire` · `the-silk-road`

设计重点：石构/法典/柱式/城防/佛塔/商队；建立“古代建筑 + 商路”笔刷库。

### 2B · 中世纪交流

`the-hijra` · `genghis-khan` · `mali-empire` · `borobudur` · `tenochtitlan-founded` · `maori-reach-aotearoa`

设计重点：沙漠商队/草原骑兵/西非土筑/婆罗浮屠/中美洲金字塔/波利尼西亚航海；覆盖此前缺席的非洲、大洋洲、东南亚、美洲。

### 2C · 早期现代与全球

`gutenbergs-press` · `vasco-da-gama-reaches-india` · `fall-of-the-inca` · `french-revolution` · `partition-of-india` · `the-world-wide-web`

设计重点：印刷工坊/卡拉维尔/安第斯山地/革命广场/分治地图/数字光网；把“全球连线”讲到当代。

## 6. 未入选 6 个与原因

| 事件 | 原因 | 去向 |
|---|---|---|
| `tang-dynasty` | 中国已有 5 个主题；视觉与宋/清重叠 | Tier B 变体 |
| `the-black-death` | 欧洲已有 3 个；灾难家族可复用 | Tier B 变体 |
| `the-reformation` | 与教堂/文档家族重叠；视觉差异有限 | Tier B 变体 |
| `constantinople` | 与罗马/城市家族重叠 | Tier C 家族 |
| `united-nations-founded` | 20 世纪已有俄国/阿波罗/1945；会议室视觉弱 | Tier B 变体 |
| `covid-19-pandemic` | 当代敏感、视觉语言未成熟 | 观察，暂缓 |

## 7. 执行规则

- 每批 6 个，先出 3 个样板，评审通过再做后 3 个。
- 每个场景必须过 `hero-art-direction.md` 的硬门槛与 rubric。
- 每批结束更新 `docs/hero-illustrations.md` 的场景表、评分和缩略图。
- 不改变 `data/scene_variants.json` 的 482 条家族映射；Hero 场景通过 `HeroScenes.has(id)` 覆盖。
- 如真实流量/教学数据推翻“用户关注”评分，可替换候选，但必须保持地域覆盖约束。

## 8. Gate 1 验收

- 30 个 Hero：12 + 18，全部可打开、16 秒清理、手机可运行。
- 平均 rubric ≥4.5；版画质感 ≥4。
- 单场景 ≤1.5 人日；返工率 ≤20%。
- 无“同批轮廓重复”；去标签盲测 7/10 可辨识。
- 现有 482 事件、56 家族、贸易 LOD、战斗上限、台湾省、面板滚动无回归。
