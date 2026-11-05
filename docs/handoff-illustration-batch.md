> 状态：已完成（2026-11-06）。实现与验收见 `docs/hero-illustrations.md`；本文件保留为任务交接记录。

# 新会话交接：首批 12 个英雄插画场景

## 项目位置

`/Users/lk/Claude Code开发目录/世界时序地图`

## 当前线上状态

- 线上：https://bruce507.github.io/world-chronicle/
- 线上资源版本：`20261107h`
- 最新提交：`05a5f1c`（trade route LOD, upright vehicles and battle unit caps）
- 工作区应为 clean；推送前先 `git status`。

## 已完成、不要重做

- 482 个事件已全部映射到 56 个视觉家族，审计 0 条误分：
  - `data/scene_variants.json`
  - `docs/scene-coverage.md`
  - `scripts/build-scene-taxonomy.mjs`
- 地图节点徽章、标签去重、节点尺寸封顶、船只朝向、贸易路线 LOD、战斗单位上限已完成。
- 13 个英雄条目已有基础专属场景；不要删除现有功能。
- 右侧面板滚动、地区导航、中国江山时序专题、台湾省数据处理已经上线，需保持。
- 482 个全部独立插画级不现实；本批只做 12 个英雄事件，不要扩大到 482 个独立场景。

## 本批目标：12 个英雄插画级场景

1. 宋朝建立 `song-dynasty`
2. 清军入关 `qing-takes-beijing`
3. 罗马建城 `founding-of-rome`
4. 俄国十月革命 `russian-revolution`
5. 泰姬陵 `taj-mahal`
6. 蔡伦造纸 `cai-lun-improves-papermaking`
7. 伯罗奔尼撒战争 `peloponnesian-war`
8. 郑和下西洋 `zheng-hes-voyages`
9. 哥伦布抵达美洲 `columbus-reaches-the-americas`
10. 玄奘西行 `xuanzangs-journey-to-the-west`
11. 阿波罗登月 `apollo-11`
12. 1945 日本核爆与投降 `hiroshima` / `nagasaki` / `japan-1945`

## 设计标准

- 版画 / 羊皮纸 / 朱砂 / 赭金 / 墨褐，不使用纯黑大块。
- 每个场景 3–5 层：地理背景、主建筑或主体、人物/动作、粒子/光效、地图标签。
- 每个事件有独立构图，不是同一套模板换颜色。
- 地图节点保持徽章，最大约 64px；完整剧场才展开插画。
- 16 秒自动清理；关闭/切换地区清理；不无限循环。
- 手机端可运行，避免每帧绘制几十个人物。
- 文字、标签、事件详情、年份必须与事件一致；不得编造史实。
- 动画是写意版画，不是考古复原；不要声称照片级。

## 建议实现位置

- 地图节点徽章：`js/scenes.js` 的 `Scenes.mini` 和各 `mini*` 函数。
- 地图完整剧场：`js/theatre.js` 的 `MapTheatre`，重点看 `playEvent`、`modeFor`、`defaultTheatre`、`drawFounding`、`drawCavalryScene`、`drawNavalScene`、`drawCity`、`drawMonument`、`drawCraft`。
- 事件数据/分派：`data/scene_variants.json`、`data/event_details.json`、`data/event_groups.json`。
- 不要改 `data/scene_variants.json` 的 482 条全量映射，除非新增事件。

## 验收

- 12 个事件逐个在桌面宽度 1200×800 和高倍缩放截图检查。
- 节点徽章：无黑团、无重复标题、无超出 64px。
- 完整剧场：构图可辨、时代/地域正确、16 秒清理。
- 贸易路线和战斗单位 LOD 不回退：每条路线 1 艘正方向船/1 匹骆驼，战斗单位分散、上限 16。
- 右侧面板滚动、地区导航、1945 日本事件组、2026 台湾省标签不回归。
- `node scripts/validate-data.mjs`、`node scripts/build-data.mjs`、`node --check js/*.js` 通过。

## 备注

- 本会话历史很长；新会话请读取本文件和相关源码，不要依赖旧对话。
- 不要一次性删除现有 56 家族或 13 个英雄场景；在现有基础上细化。
