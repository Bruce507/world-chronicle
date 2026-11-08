# Featured 简要条目扩写 / Featured brief entries

Date 2026-11-08。本轮把 15 个**已有 Hero / Tier B 场景但只有简要条目**的事件扩写为完整史志；每条两个来源都在本轮实际请求过（HTTP 200）。

## 1. 选择标准

优先扩写"看着重要、点开只有两段话"的事件：它们在 32 个 Hero 或 57 个 Tier B 场景中有完整插画，却没有史志。名单：

| 事件 | id | 年份 | 来源 1 | 来源 2 |
|---|---|---:|---|---|
| 锡拉火山爆发 | `thera-eruption` | −1600 | Wikipedia — Minoan eruption（百科） | World History Encyclopedia — The Eruption of Thera（二手） |
| 里斯本大地震 | `lisbon-earthquake` | 1755 | Wikipedia — 1755 Lisbon earthquake（百科） | World History Encyclopedia — Lisbon Earthquake（二手） |
| 爱尔兰大饥荒 | `irish-famine` | 1845 | Wikipedia — Great Famine (Ireland)（百科） | BBC History — The Great Famine（二手） |
| 西班牙无敌舰队 | `the-spanish-armada` | 1588 | Wikipedia — Spanish Armada（百科） | World History Encyclopedia — Spanish Armada（二手） |
| 拉美独立运动 | `latin-american-independence` | 1810 | Wikipedia — Latin American wars of independence（百科） | Wikipedia — Simón Bolívar（百科） |
| 1848 年欧洲革命 | `revolutions-of-1848` | 1848 | Wikipedia — Revolutions of 1848（百科） | Wikipedia — French Revolution of 1848（百科） |
| 德意志帝国成立 | `german-unification` | 1871 | Wikipedia — Unification of Germany（百科） | World History Encyclopedia — Unification of Germany（二手） |
| 墨西哥革命 | `mexican-revolution` | 1910 | Wikipedia — Mexican Revolution（百科） | World History Encyclopedia — Mexican Revolution（二手） |
| 土耳其共和国 | `turkish-republic` | 1923 | Wikipedia — Turkish War of Independence（百科） | Wikipedia — Mustafa Kemal Atatürk（百科） |
| 古巴革命 | `cuban-revolution` | 1953 | Wikipedia — Cuban Revolution（百科） | Wikipedia — Fulgencio Batista（百科） |
| 孟加拉国独立 | `bangladesh-independence` | 1971 | Wikipedia — Bangladesh Liberation War（百科） | Wikipedia — Sheikh Mujibur Rahman（百科） |
| 伊朗伊斯兰革命 | `iranian-revolution` | 1978 | Wikipedia — Iranian Revolution（百科） | World History Encyclopedia — Iranian Revolution（二手） |
| 南非种族隔离终结 | `end-of-apartheid` | 1990 | Wikipedia — Negotiations to end apartheid in South Africa（百科） | Nobel Prize — Nelson Mandela facts（机构） |
| 香港回归 | `hong-kong-handover` | 1997 | Wikipedia — Handover of Hong Kong（百科） | Wikipedia — Sino-British Joint Declaration（百科） |
| 汤加火山爆发 | `tonga-eruption` | 2022 | Wikipedia — 2022 Hunga Tonga–Hunga Haʻapai eruption and tsunami（百科） | NASA Earth Observatory — Hunga Tonga-Hunga Ha'apai eruption（机构） |

- 每条包含 `background / course / outcome` 三段中英文本与来源；结构沿用现有 112 条。
- 有争议的数字明确写出争议：孟加拉国独立死亡人数、锡拉喷发年代、里斯本死亡人数。
- 不写没有把握的细节；机构来源 2 条（Nobel、NASA），其余为百科与二手，`verification` 统一标 `partial`。

## 2. content-check 暴露的 4 条旧问题（已修）

首次跑 `content-check` 时，127 条中 4 条失败，全部是**原有条目只有 1 个来源**（不是本轮新增的）：

`end-of-world-war-ii`、`french-revolution`、`peace-of-westphalia`、`the-reformation`。

各补 1 个 Wikipedia 来源（均实测 200），现在目录内所有史志都有 ≥2 个可点击来源。这说明上一轮"content-check 112/112"的结论没有被复跑过——本轮以实际结果为准。

## 3. 结果

| 项 | 之前 | 现在 |
|---|---:|---:|
| 完整史志 | 112 | **127** |
| 简要条目 | 409 | **394** |
| `content-check` | 112/112（记录值，未复跑） | **127/127（本轮实测）** |
| smoke 的按需加载断言 | 112 | 127（已同步） |

## 4. 来源核验方式

所有 URL 用 `curl -L -A "Mozilla/5.0"` 实测返回 200（2026-11-08）。Britannica、Smithsonian、USGS 等站点对脚本返回 403/429，因此**没有**把它们作为本轮新增来源，避免写入未经实测的链接。
