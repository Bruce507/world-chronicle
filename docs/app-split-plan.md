# app.js 拆分计划 / App split plan

Date 2026-11-07. Status: **本轮不执行**，只记录可执行方案。P2-6 要求说明为何不做，以及下一步如何安全地做。

## 1. 现状

`js/app.js` 约 3,150 行，包含：

| 区域 | 大约行数 | 主要函数 |
|---|---:|---|
| 数据归一化 / i18n / 工具 | 1–410 | `slugify`, `L`, `evTitle`, `countryName`, `applyI18n` |
| boot / 数据载入 / URL | 411–610 | `boot`, `loadWorld`, `loadAuxData`, `applyURLState` |
| 面板渲染 | 606–1160 | `renderEventPanel`, `renderPanel`, `renderCountryPanel`, `eventRow`, `catFilterRow` |
| 时间轴 | 1188–1545 | `buildTimeline`, `drawTicks`, `updateChrome`, `applyYear`, brush/keyboard |
| 搜索 | 2337–2484 | `searchIndex`, `runSearch`, `pickSearch`, `openSearchPanel` |
| 事件/国家/路线/剧场 | 1857–2335 | `openEvent`, `closeTheatre`, `openCountry`, `setSheet`, `setPanel` |
| 绑定 / 键盘 / URL | 2485–3095 | `bindUI`, `onKey`, `buildURL`, `syncURL`, `shareCurrent` |

它是一个 IIFE，`state`、`el`、`map`、`lastPanelKey`、计时器等都通过闭包共享。没有构建框架，脚本以全局 `<script>` 顺序加载。

## 2. 为什么本轮不做

1. **收益有限**：本机 ready 约 168–192ms，剧场 16.6ms/帧；拆分不会改变首屏下载量（app.js 158KB / gzip 46KB），主要收益是维护性。
2. **回归面大**：面板、搜索、URL、抽屉、焦点与剧场相互调用；P2 刚改动焦点、抽屉和事件表面，此时整体搬迁会把两类风险叠加。
3. **缺少模块边界**：没有 bundler，拆分需要引入全局命名空间或动态 `import()`；在没有类型检查的情况下，跨文件隐式依赖比单文件更难追踪。
4. **测试仍以端到端为主**：43 项 smoke + content-check 能覆盖行为，但不能替代函数级单测；拆分前应先补少量纯函数测试（`searchIndex`, `buildURL`, `parseYearInput`）。

## 3. 可执行步骤（下一轮，按顺序）

每次只搬一个模块，搬完立即跑 `npm run smoke` + `npm run content-check`，行为不变才提交。

1. **`js/core/i18n.js`**（最低风险）
   - 搬 `I18N`, `t`, `L`, `eraName`, `eraSub`, `catName`, `rgName`, `nameOf`, `evTitle`, `evDesc`, `modernEntityName`, `countryName`, `slugify`, `fmtYear`, `fmtRange`。
   - 暴露 `window.AtlasI18n = { t, L, ... }`；`app.js` 改为解构引用。
   - 依赖：`state.lang` 通过参数传入或用 getter，避免直接读 app 的 `state`。
2. **`js/core/search.js`**
   - 搬 `searchIndex`, `runSearch`, `pickSearch`, `openSearchPanel`, `closeSearch`。
   - 通过 `window.AtlasApp = { state, A, el, map, byId, L }` 注入共享上下文。
3. **`js/core/routes.js`**
   - 搬 `ROUTES`, `routeById`, `routeText`, `routeStrip`, `openRouteById`, `renderRoutePanel`。
4. **`js/ui/panel.js`**
   - 搬 `renderEventPanel`, `renderPanel`, `renderCountryPanel`, `eventRow`, `catFilterRow`, `eventList`, `detailFor`。
   - 先抽纯渲染函数（输入 `ev/d/data/state`，返回 HTML 字符串），再包一层 DOM 写入。
5. **`js/ui/sheet.js`**
   - 搬 `setSheet`, `cycleSheet`, `bindSheet`, `setPanel`, `updatePanelScrollbar`。
6. **`js/app.js` 剩余**
   - boot、时间轴、相机、键盘、URL、分享、剧场编排。

## 4. 验收与风险

- 验收：43 项 smoke、`content-check` 112/112、`validate-data`、`build-data`、深链 event/country/route/search、浏览器后退、390×844、RTL、reduced-motion。
- 风险：闭包状态（`lastPanelKey`, `panelTimer`, `eventTimer`）在跨文件后容易变成隐式全局；加载顺序（`app.js` 最后）不能变；`window.AtlasApp` 必须在每个模块执行前就绪。
- 回退：每个模块单独提交，保留原函数名与调用点；任一 smoke 失败即回退该提交，不影响其他模块。

## 5. 结论

本轮优先完成 P2-1 至 P2-6 的用户可见质量项；拆分留到 P3 的工程窗口，按上述顺序逐模块进行，并以行为不变为前提。
