# P3-6 产品功能 / Product features

Date 2026-11-07. 本轮落地：收藏/书签、3 条新主题路线、分享卡片、PWA/离线。收藏与离线数据都只在本机，不上传。

## 1. 收藏与书签

- 本机存储键：`world-atlas-favorites`（localStorage）。
- 可收藏：事件、国家、主题路线、时代视图（年份 + 类别筛选）。
- 入口：
  - 面板右上角星标（☆/★）收藏当前上下文；
  - 顶栏星标打开“收藏与书签”；数字角标显示数量；
  - 快捷键 `F` 打开/关闭收藏列表；`?favorites=1` 深链。
- 收藏列表：按保存顺序列出类型、标题、年份；点击打开；可单条移除或清空。
- 边界：清除站点数据/换浏览器会丢失；不做账号同步（P3-6 后续可评估，涉及隐私与后端）。

## 2. 主题路线

在原有 3 条（丝路与海路、帝国崩溃、技术与交流）基础上新增：

| 路线 | 事件数 | 范围 |
|---|---:|---|
| 环境与灾变 | 8 | 绿色撒哈拉 → 巴黎协定 |
| 疾病与医学 | 5 | 查士丁尼瘟疫 → COVID-19 |
| 海洋与远航 | 9 | 拉皮塔 → 白令 |

路线条现在有 6 条 + 随机一瞥；仍按时间排序，事件可打开面板与剧场。

## 3. 分享卡片

- 事件面板“更多”菜单新增“分享卡片”，生成 **1200×630 PNG**：年份、类别/地区/地点、中英文标题、摘要、来源域名、站点域名、指南针与印章。
- 优先使用 Web Share API 分享文件；不支持时直接下载 `world-chronicle-<id>.png`。
- 不包含长文全文、个人数据或未公开内容；来源域名来自该事件的 `sources`。
- 局限：Canvas 字体依赖系统（Songti/PingFang 缺失时回退 Georgia/sans）；未在真实社交平台预览中逐项检查裁切。

## 4. PWA / 离线

- `manifest.json`：名称、短名、standalone、主题/背景色、192/512 maskable 图标。
- `sw.js`：network-first；联网时始终取新资源并写入缓存，离线时回退缓存；导航离线回退 `index.html`。
- 预缓存：HTML/CSS/核心 JS、`world.geo.json`、`historical_entities.json`、`state_changes.json`；事件详情、国家沿革、Hero/Tier B 场景在首次使用时进入运行时缓存。
- 缓存名带资源版本（`world-atlas-20261108s`），`npm run version:bump` 会同步更新 `sw.js`，旧缓存自动清理。
- 离线能力：首次访问必须联网；之后至少能打开地图、时间轴、历史标签与已访问的事件/场景。未访问过的详情/场景离线时回退为简要或通用场景。
- 未做：安装引导 UI、更新提示（“有新版本，刷新”）、后台同步、离线状态条。

## 5. 验证

| 项 | 结果 |
|---|---|
| `npm run smoke` | **53/53**（含 16 秒静态末帧、收藏保存/打开/清空、6 条路线） |
| `npm run pwa` | 4/4（manifest/图标可达、SW activated、离线重载地图、无控制台错误） |
| `npm run a11y` | 14/14 |
| `npm run content-check` | 112/112 |
| 390×844 | 顶栏不溢出（手机隐藏品牌文字，保留印章）；收藏面板正常 |
| 1440×900 | 收藏、路线、分享卡片正常 |

截图：`docs/p3-shots/p3-6-mobile-favorites.jpg`、`p3-6-routes.jpg`、`p3-6-share-card.png`。

## 6. 未完成 / 风险

- 收藏无同步、无导入导出；清缓存即丢失。
- 分享卡片只覆盖事件，不含国家/路线卡片；社交平台的实际预览未测。
- PWA 安装提示未做；iOS Safari 的离线/安装行为需真机验证。
- Service Worker 采用 network-first，弱网下首屏仍等网络；离线只在已缓存资源范围内有效。
- 新路线的 5 条疾病事件较少，后续可补疫苗、公共卫生等节点。

---

## 7. 第二轮：导入导出、国家/路线卡片、安装/更新/离线提示（2026-11-07）

| 功能 | 实现 | 验证 |
|---|---|---|
| 收藏导出 | 收藏面板"导出备份"→ `world-chronicle-favorites.json`（含 `app/kind/version/exportedAt/favorites`） | smoke：下载事件 + JSON 解析 |
| 收藏导入 | "导入备份"→ 文件选择 → 校验类型/长度/年份 → 按 key 去重合并；空列表时也可导入（换浏览器恢复） | smoke：导出→清空→导入回环，条数一致 |
| 国家分享卡片 | 国家面板新增"分享卡片"，1200×630，标题/英文名/节点数/当前时代 | smoke：`atlasAPI.cardBlob("country")` 断言尺寸与体积 |
| 路线分享卡片 | 路线面板新增"分享卡片"，含起止年份、路线名、描述、来源域名 | smoke：同上（route） |
| 安装提示 | `beforeinstallprompt` → 底部条"可安装到主屏幕"；关闭后记住 | 手动（Chromium 无安装条件时不显示） |
| iOS 提示 | iOS Safari 非 standalone 时显示一次"分享 → 添加到主屏幕" | 截图 `docs/ux-p3-shots/mobile-ios-hint.jpg` |
| 更新提示 | SW `updatefound` → 底部条"有新版本 · 刷新"；点击 `postMessage(SKIP_WAITING)`，`controllerchange` 后刷新 | 代码路径；**未在真实增量发布中验证** |
| 离线状态条 | 监听 online/offline，时间轴上方显示"离线 · 显示已缓存内容" | smoke：断网出现、恢复消失 |
| iOS 限制说明 | 见第 8 节 | — |

卡片渲染抽成一个 `renderShareCard(spec)`，事件/国家/路线共用同一套版式；`atlasAPI.cardBlob(kind)` 暴露给测试用。

### 8. iOS 真机限制（未验证，写在文档里而不是猜）

- iOS Safari 不支持 `beforeinstallprompt`，只能手动"添加到主屏幕"，本项目用一次性提示说明路径；
- iOS 的 Service Worker 在**标签页被系统回收后可能被清除缓存**（存储压力下），离线可用性弱于 Android；
- Web Share API 支持分享文件（iOS 15+），但 `navigator.canShare({files})` 的行为需真机确认；
- 以上三条**均未在 iPhone 上实测**，标记为 P4 真机项。

### 9. 验证

`npm run smoke` 57/57（P2 收口后含确认清空、工具条与离线面板提示）、`npm run pwa` 7/7、`npm run a11y` 20/20。
