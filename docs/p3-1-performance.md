# P3-1 性能记录 / Performance pass

Date 2026-11-07. 目标：把首屏关键路径从“所有模块与数据一次加载”改为“基础地图先可交互，历史图层与剧场场景后到”，并给出可重复的测量。

**重要：以下数字来自本机 Chrome 的模拟环境，不是真机。** 低端 Android、iOS Safari、DPR 3 与真实弱网仍需 P3-1 的设备阶段验证。

## 1. 方法

```bash
node scripts/serve-gzip.mjs 8002 .      # 本地 gzip，近似 GitHub Pages 传输
BASE_URL=http://localhost:8002/ npm run perf:throttle
npm run perf                            # 本机无节流
```

`perf-throttle` 使用 Chrome DevTools Protocol：

- 视口 390×844；
- Slow 4G：下行 1.6 Mbps、上行 750 kbps、延迟 150 ms；
- CPU 4× 降速；
- 冷缓存（每次新 context）；
- gzip 由本地服务器提供（GitHub Pages 同样会压缩）。

## 2. 结果

| 指标 | 优化前（模拟） | 优化后（模拟，gzip） |
|---|---:|---:|
| FCP | 1888 ms | **708 ms** |
| 地图可交互（features ready） | 21.4 s（无 gzip，本地 raw） | **4.27 s** |
| 首屏 JS 传输 | — | **447 KB**（gzip） |
| 首屏 JSON 传输 | — | **587 KB**（gzip） |
| 首屏总传输 | — | **1.05 MB**（gzip） |
| 剧场帧时间（5 秒） | — | 平均 16.6 ms / p95 16.7 ms |
| 本机 1440×900 ready | 192 ms | **128 ms** |
| 本机全事件 drawBase（521） | 8 ms | **7 ms** |

说明：优化前的 21.4s 是“无 gzip + 所有 JSON/脚本一次加载”的本地 raw 数字，不代表 GitHub Pages 的真实传输；优化后的 4.27s 是 gzip + 模拟弱网数字。两者方法不同，不能直接当作同一基线的提升倍数；可比的是“首屏总传输 1.05MB / ready 4.27s”这一组。

## 3. 本轮改动

1. **Hero / Tier B 场景按需加载**（`js/hero-scenes.js` 430 KB + `js/variant-scenes.js` 61 KB）
   - 从 `index.html` 移除阻塞脚本；首次打开事件/史志时 `ensureSceneAssets()` 注入，`openEvent`/`openEventModal` 等待后播放；
   - 失败时回退到通用家族场景，不影响面板；
   - 不再在 idle 时预取，避免与弱网首屏争带宽。
2. **国家沿革按需加载**（`data/country_chronicles.json` 921 KB）
   - 打开国家面板时才 `ensureChronicles()`；面板先显示 skeleton，加载完成后重渲染。
3. **事件详情按需加载**（`data/event_details.json` 310 KB）
   - 打开事件面板时才 `ensureDetails()`；加载前显示 skeleton，完成后重渲染；不再在 boot 阶段占用带宽。
4. **历史图层延后**（实体标签 401 KB + 边界快照 ≈250 KB + 国家兴亡 75 KB）
   - 世界 GeoJSON 与基础地图先绘制并可交互；120 ms 后再初始化历史边界、历史实体与 state changes；
   - 实体标签就绪后按 450 ms 淡入（原有逻辑）。
5. **世界 GeoJSON 保持压缩单行**
   - 一次性修正：台湾标签修改时误将 `world.geo.json` 重新格式化为 4.0 MB，已恢复为 **774 KB** 单行 JSON。
6. **本地 gzip 服务器** `scripts/serve-gzip.mjs`，用于近似 GitHub Pages 的传输测量。

## 4. 验收对照

- 目标“Slow 4G 冷缓存可交互 ≤5s”：模拟环境 **4.27s**，达标（但仅模拟）。
- “低端 Android 剧场平均 ≥30fps”：模拟 CPU 4× 下 16.6ms/帧（60fps），但模拟 CPU 不等于低端 GPU/内存；未达标结论需真机。
- “不出现画布内存崩溃”：本机未出现；未在 DPR 3 真机验证。
- 首屏资源：1.05 MB gzip；较 P2 的初始路径（详情 310 KB + 沿革 921 KB + Hero/TierB 490 KB + 历史层 650 KB 全在首屏）显著下降。

## 5. 未完成 / 风险

- **真机矩阵未做**：需要低端 Android、iPhone SE/Safari、DPR 3、真实 Slow 4G；模拟结果不能替代。
- **内存峰值未测**：`performance.memory` 仅 Chrome 可用，且模拟环境无意义；需要真机 DevTools/Android Studio。
- **world.geo.json 仍 774 KB**（gzip 247 KB）：可考虑 3 位小数坐标或按视口分块，但会带来边界缝隙/拓扑风险。
- **data_bundle.js 585 KB** 仍包含 521 事件的多语言短描述；可按语言拆包，但会影响搜索与切换语言的即时性。
- Hero/Tier B 首次打开会增加一次 490 KB 下载（gzip 约 93 KB）；弱网下会有可感知等待，可能需要在剧场卡上显示“正在展开场景”。

## 6. 复跑

```bash
python3 -m http.server 8001 --directory .   # 或 node scripts/serve-gzip.mjs 8002 .
BASE_URL=http://localhost:8001/ npm run perf
BASE_URL=http://localhost:8002/ npm run perf:throttle
```
