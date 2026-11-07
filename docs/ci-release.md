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
