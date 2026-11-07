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

---

## 7. 第二轮：DPR 3 / 内存 / 二次访问（2026-11-07）

`npm run perf:throttle` 扩展为：DPR 3 + CPU 4× + Slow 4G(1.6 Mbps/150 ms) + gzip + `--enable-precise-memory-info`，并测量冷启动、二次访问（Service Worker 已接管）、剧场帧率与 JS/画布内存。

| 指标 | 冷启动 | 二次访问 |
|---|---:|---:|
| FCP | **684 ms** | 48 ms |
| 可交互（features ready） | **4.24 s** | **0.30 s** |
| 网络传输 | **726 KB**（JS 446 + JSON 265） | **0** |
| JS 堆（used） | 14.1 MB | 22.8 MB（累积上下文） |
| JS 堆（total） | 20.8 MB | 36.1 MB |
| 画布后备存储（map+fx+minimap+tick+scene） | **7.8 MB** | 7.8 MB |
| `window.devicePixelRatio` / map 内部 DPR | 3 / **2**（有上限） | 3 / 2 |

剧场（CPU 4×、DPR 3、390×844）：**平均 16.6 ms / p95 16.7 ms**（约 60fps）。

本机无节流（`npm run perf`，1440×900）：地图可交互 **126 ms**，521 事件 `drawBase` **8 ms**，剧场 16.6 ms / p95 16.8 ms。

### 本轮修掉的两个真实缺陷

1. **隐藏的迷你地图画布会指数级放大后备存储。** `_drawMinimap` 在元素 `display:none`（`clientWidth = 0`）时回退到"上一次的画布宽度"，再乘以 DPR 写回，于是每帧翻倍；DPR 3 手机上实测达到 **39,321,600 × 19,660,800 px**。修复：没有布局尺寸时直接返回，不做 resize/绘制。修复后画布总量稳定 7.8 MB。
2. **迷你地图在"铺满视野"模式下是空白**，要等下一次无关重绘才出现。修复：显示迷你地图时主动调度一次 `drawBase()`；smoke 现在断言像素覆盖 >50% 且后备存储 ≤ 2×CSS 尺寸。

### Service Worker：版本化资源改为 stale-while-revalidate

`?v=YYYYMMDDx` 每次发布都会变，旧 URL 不会被复用，因此命中缓存即可直接返回并在后台刷新；导航与无版本参数的文件仍保持 network-first，避免部署被缓存掩盖。效果即上表的二次访问：**0.30 s 可交互、0 字节网络**。

### 仍未完成

- **没有真机**：以上全部是 CDP 模拟（DPR 3、CPU 4×、带宽/延迟节流），不能替代低端 Android / iPhone SE+Safari 的真实内存、GPU 与发热测量；`performance.memory` 也只有 Chromium 有。
- 4× CPU 节流下剧场仍 60fps，说明主线程预算充足；但低端 GPU 的栅格化开销无法用 CPU 节流模拟。
- `world.geo.json` 已是 2 位小数（无 ≥3 位小数的坐标），继续压缩只能减少顶点，会改变边界形状，本轮不做。
- `data_bundle.js` 仍含多语言短描述（572 KB 未压缩）；按语言拆包需要重做搜索与即时切换语言，风险大于收益，留待 P4 评估。
