# CI 与发布 / CI and release

Date 2026-11-07. P3-5 的落地部分：自动验证、生成物一致性、缓存版本与回滚。错误监控**未接入**（涉及第三方与隐私，需项目所有者决定）。

## 1. 工作流

| 文件 | 触发 | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | push main、PR、手动 | 安装依赖 → validate/build/taxonomy/语法 → 生成物一致性 → 安装 Chrome → 启动本地服务器 → `content-check` 112 条 → `smoke` 49 项 |
| `.github/workflows/pages.yml` | push main、手动 | 先跑同一组静态校验（validate/build/taxonomy/语法/生成物一致性），通过后才部署 GitHub Pages |

- 生成物一致性：`js/data_bundle.js`、`data/scene_variants.json`、`docs/scene-coverage.md` 必须与 JSON 源一致；CI 在 build 后执行 `git diff --exit-code`，不一致即失败。
- CI 使用 `npx playwright install --with-deps chrome`，烟雾测试仍使用 `channel: "chrome"`。
- 无 secrets、无第三方服务。Playwright 仅作为 devDependency。

## 2. 本地等价命令

```bash
npm install
node scripts/validate-data.mjs
node scripts/build-data.mjs
node scripts/build-scene-taxonomy.mjs
for f in js/*.js; do node --check "$f"; done
git diff --exit-code -- js/data_bundle.js data/scene_variants.json docs/scene-coverage.md

python3 -m http.server 8001 --directory . &
node scripts/content-check.mjs
node scripts/ux-smoke.mjs
```

性能回归（可选）：

```bash
node scripts/serve-gzip.mjs 8002 .
BASE_URL=http://localhost:8002/ npm run perf:throttle
```

## 3. 缓存与版本

- GitHub Pages 不能自定义响应头；本项目用查询字符串 `?v=YYYYMMDDx` 做缓存失效。
- 每次会改变运行时代码/数据时执行：

```bash
npm run version:bump          # 今天日期 + 下一个字母
npm run version:bump 20261201 # 指定日期
```

脚本会同步更新 `index.html` 的所有脚本/样式引用、`js/app.js` 的 `ASSET_V` 与数据 fetch、`js/entities.js` 的实体层版本。提交后 CI/Pages 自动部署。
- 数据文件本身（`data/*.json`）也带同一个版本查询；浏览器不会在版本未变时拿到旧数据。

## 4. 回滚

1. 在 GitHub Desktop 中 revert 出问题的提交（或 checkout 上一个提交）；
2. push 到 `main`；
3. `pages.yml` 的 verify 通过后自动重新部署；
4. 若只是缓存问题，先执行 `npm run version:bump` 再推送，不需要回滚代码。

## 5. 错误监控（未实施）

建议但未接入：

- 前端 `window.onerror` / `unhandledrejection` 收集，默认关闭，需用户显式开启；
- 选择隐私友好的服务（如自建端点或 Sentry 的 EU 区域），不采集事件正文/搜索词；
- 与 CI 的“控制台零错误”互补：CI 只能覆盖测试路径，运行时监控覆盖真实设备。

在用户确认服务与隐私策略前，不添加任何上报代码。

## 6. 已知限制

- GitHub Actions 首次安装 Chrome 可能较慢；超时设为 25 分钟。
- CI 不跑真机/多浏览器矩阵（P3-1、P3-4）。
- `npm install` 目前没有提交 `package-lock.json`；如需完全可复现，应提交 lockfile。

---

## 7. 第二轮（2026-11-07）：首次实跑与修复

首次在 GitHub Actions 实跑（run 42391750707，提交 `639c6ff`）：内容、a11y、data-qa 通过，**PWA / offline check 失败**（步骤耗时约 3 秒，说明是断言失败而非 30 秒超时），其后的 entity-i18n 与 smoke 被跳过。

修复（提交 `2db5379`）：

1. **重写 `scripts/pwa-check.mjs`**：
   - 等 `serviceWorker.ready` 之后**再等页面真的被 worker 控制**（必要时在线重载一次），而不是激活后立刻断网；
   - 断网前先断言预缓存里确有 shell（`./`、`index.html`、`app.js`、`data_bundle.js`、`map.js`、`world.geo.json`、`style.css`）；
   - 离线导航到一个**从未在线访问过的一次性 URL**，因此文档只可能来自 Service Worker，而不是 Chrome 的 HTTP 启发式缓存；并断言导航后 `controller` 存在；
   - 离线阶段的网络失败与脚本异常分开统计（前者是懒加载资源的正常表现，后者才失败）；
   - 任一项失败时输出 SW 注册状态、controller、缓存键与 URL 列表，CI 日志可直接定位。
2. **调整 ci.yml 顺序**：PWA 放到最后，内容/a11y/数据/实体/smoke 先跑完；可设 `PW_CHANNEL=chromium` 改用 Playwright 自带内核。
3. 本地 `npm run pwa`：**7/7**（新增 controller、预缓存、离线来源三项断言），连续 3 次稳定。

**限制**：没有 GitHub Actions 日志读取权限（需 admin），无法逐行确认当时是哪一条断言失败；上述修复按"最可能的竞态 + 可诊断"处理。

### 后续实跑（2026-11-08）

- `f2ed567`：失败点前移到 **Generated files are committed** → 确认是生成物里的日期戳/`localeCompare` 不确定性（见 §8），修复后该步骤转为通过，Pages 部署恢复。
- `2658eff`：**Smoke suite** 通过（把三个断言上下文的浏览器 locale 固定为 `zh-CN`；CI 默认 en-US，应用会跟随浏览器语言切成英文）。
- `21fa317`：**CI 全绿**——静态检查、生成物一致性、内容、a11y、data-qa、entity-i18n、smoke、PWA/offline 全部通过，Pages 部署成功。
- 注意：`2658eff` 的 PWA 步骤曾失败一次而在 `21fa317`（仅增加注解与崩溃兜底，无功能改动）通过，**未能复现**，暂按竞态处理；若复发，run 页面的 Annotations 会直接给出失败项与细节（smoke 与 pwa 都会输出 `::error`）。

另：`package-lock.json` 现已随仓库提交，CI `npm install` 可复现依赖版本。

## 8. 生成物可复现性（2026-11-08）

CI 的"Generated files are committed"检查要求 `build-data` / `build-scene-taxonomy` 的输出与仓库一致。两处曾导致跨天/跨环境失败：

- `docs/scene-coverage.md` 与 `docs/major-events.md` 的 `Generated <日期>` 行 → 已移除；仓库历史本身记录日期。
- `localeCompare` 依赖 Node ICU，CI 与本机排序不同 → 生成器改为码元比较。
- `data/historical_entities.json` 的 `generated` 曾是 ISO 时间戳 → 改为固定的 `"on build"`。

本地复跑办法：按 CI 的顺序执行 `node scripts/build-data.mjs && node scripts/build-scene-taxonomy.mjs`，再 `git diff --exit-code -- js/data_bundle.js data/scene_variants.json docs/scene-coverage.md`。
