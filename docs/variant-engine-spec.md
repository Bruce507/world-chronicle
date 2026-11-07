# 半独立变体引擎规格 / Variant Engine Spec

Version 1.1 · 2026-11-07. Tier B：100–150 个重点事件的“半独立”场景。

> 执行状态：**试点已完成**（siege / caravel / modern 3 家族 × 5 变体，15 个事件），代码在 `js/variant-scenes.js`，评审见 `docs/tierb-pilot.md`。试点 override 目前内嵌于模块；引擎改为运行时读数据时再导出 `data/variant_overrides.json`。目标不是手工重画，而是**同一家族语法下的参数化变体**。

## 1. 原则

- 家族提供“世界语法”：建筑类型、地貌、人物比例、光向、材质。
- 变体提供“这一次的不同”：天际线、主建筑、人物组、天气、时段、色板、镜头、前景框。
- 变体必须能通过**去标签盲测**：同家族 10 张里，至少 7 张能被认出是不同事件/地域。
- 不改变 `data/scene_variants.json` 的 482 条家族映射；变体是可选覆盖层。

## 2. 三层资产

| 层 | 内容 | 复用 |
|---|---|---|
| 笔刷层 | 人、马、骆驼、船、树、屋顶、柱、拱、塔、山、水 | 所有家族 |
| 家族层 | 家族专属建筑/地貌/构图语法（如 `siege`、`caravel`、`modern-founding`） | 同家族所有变体 |
| 变体层 | 10 个参数 + 2–3 个专属道具/建筑 | 单个事件 |

## 3. 参数（10 个）

| 参数 | 取值示例 | 作用 |
|---|---|---|
| `palette` | dawn / dusk / noon / night / storm / snow | 天空与整体色温 |
| `horizon` | 0.35 / 0.55 / 0.75 | 地平线高度，改变构图重心 |
| `skyline` | low / walls / towers / mountains / palms / masts | 远景剪影类型 |
| `structure` | gate / keep / dome / pagoda / longhouse / factory / none | 主建筑变体 |
| `crowd` | none / workers / soldiers / monks / sailors / family | 人物组类型与数量 |
| `weather` | clear / dust / rain / snow / smoke / ash | 粒子与能见度 |
| `camera` | wide / medium / low-angle / aerial | 取景与透视 |
| `frame` | tree / banner / hull / arch / rocks / none | 前景框 |
| `props` | 2–3 个专属道具（旗、鼓、船、经幡、机器…） | 事件辨识点 |
| `motion` | still / flag / waves / caravan / smoke | 动画强度 |

## 4. 数据 schema

新增 `data/variant_overrides.json`（可选，按事件 id 覆盖）：

```json
{
  "fall-of-constantinople": {
    "family": "siege",
    "palette": "dawn",
    "horizon": 0.62,
    "skyline": "walls",
    "structure": "gate",
    "crowd": "soldiers",
    "weather": "smoke",
    "camera": "low-angle",
    "frame": "banner",
    "props": ["cannon", "chain", "galleys"],
    "motion": "smoke"
  }
}
```

- 未列出的参数由家族默认值补齐。
- `family` 必须与 `data/scene_variants.json` 一致；不一致时以 `scene_variants.json` 为准，变体只调参数。
- 不把 482 条全部写进 override；只为 Tier B 的 100–150 个事件写。

## 5. 渲染架构

```
variantFor(ev) -> params
  params = merge(familyDefaults[family], overrides[ev.id] || {}, derived(ev))
drawVariant(ctx, family, params, t, mode)  // mode = "stage" | "map"
```

- `familyDefaults`：每个家族的默认参数（代码内）。
- `derived(ev)`：从事件数据推导（年份、地区、类别、标题关键词），保证没有 override 时也能合理。
- `drawVariant` 调用家族层渲染器；家族层再调用笔刷层。
- 地图徽章使用同一 params，但 `camera` 固定为 `wide`、`frame` 简化、粒子减半。
- 每帧不创建新对象/数组；参数在 `playEvent` 时计算一次并缓存。
- 不用大面积 `globalCompositeOperation`；印版基调由 `finishPlate`（stage）或轻量版（map）统一。

## 6. 家族层改造

| 家族 | 当前 | 需要参数化 |
|---|---|---|
| `siege` | 固定城墙+攻城 | `structure`（gate/keep/walls）、`weather`（smoke/dust）、`crowd`（soldiers/refugees） |
| `caravel` | 固定帆船+海岸 | `palette`（dawn/dusk/storm）、`skyline`（palms/cliffs/port）、`props`（cross/flag/anchor） |
| `modern-founding` | 旗帜+人群+议会 | `structure`（capitol/square/port）、`crowd`（citizens/soldiers）、`frame`（banner/arch） |
| `city-medieval` | 城墙+教堂 | `skyline`（keep/cathedral/market）、`weather`（snow/rain）、`camera` |
| `camel` | 沙丘+驼队 | `palette`（dawn/noon/dusk）、`skyline`（dunes/oasis/mountains）、`props`（loads/guide） |
| `plague` | 烟雾+城门 | `palette`（grey/dawn）、`structure`（gate/market）、`weather`（fog/ash） |

先做 3 个家族：`siege`、`caravel`、`modern-founding`。

## 7. 辨识度 QA

### 硬门槛

- 同家族 5 个变体：轮廓/主建筑/色板/人物组至少 3 项不同。
- 去标签盲测：10 张中 ≥7 张能说出不同事件或地域。
- 不重复标题；不出现同家族连续 3 张相同构图。
- 与 Hero 场景不冲突：Hero 用独立构图，Tier B 用家族变体；不得把 Hero 降级为变体。

### 测试方法

1. 生成 3 家族 × 5 变体 = 15 张，去掉标签。
2. 让 3–5 位评审各看 10 张，写下“这是哪个事件/地域”。
3. 正确率 <70%：增加参数差异或换家族。
4. 记录失败样本，进入下一轮。

## 8. 性能预算

- 单帧：中端手机 <16ms；低端 <33ms。
- 每帧路径数：<250；粒子 <60；人物 <25。
- 变体参数缓存；不每帧 merge。
- 地图徽章：离屏画布 + 羽化遮罩（已有 `mapWrap`），dpr 上限 1.5。
- 首帧：<200ms；切换事件不重建大纹理。

## 9. 试点计划

### 阶段 1（1 周）

- 实现 `variantFor` + `drawVariant` 骨架。
- 改造 `siege`、`caravel`、`modern-founding` 三个家族。
- 每个家族 5 个变体，共 15 张。
- 盲测 + 性能测试。

### 阶段 2（2–3 周）

- 扩到 8–10 个家族、100–150 个变体。
- 只写 override，不重画家族。
- 每批 20 个做一次 A/B 与回归。

### 阶段 3

- 与 Hero 场景共用印版基调；Tier B 不抢 Hero 的视觉焦点。
- 更新 `docs/scene-coverage.md` 的家族分布与变体覆盖。

## 10. 风险

| 风险 | 对策 |
|---|---|
| 变体看起来像换色 | 强制 3 项差异；盲测门槛 |
| 参数组合爆炸 | 每家族限 10–15 个合法组合；其余回退默认 |
| 移动端变慢 | 路径/粒子预算；缓存；地图简化 |
| 与 Hero 混淆 | Hero 独立构图；Tier B 明确“家族变体”层级 |
| 史实错误 | 参数只调视觉，不改事件数据；每变体 2–3 条考据 |
| 维护成本 | 家族层集中；override 数据化；文档化 |
