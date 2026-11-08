# Tier B 盲测包 / Blind test kit

Date 2026-11-08。用于 Gate 2/3 的"去标签识别"测试。**本包只是材料，测试尚未进行**——需要 6 名评审，不能由开发者自评代替。

## 1. 文件

| 文件 | 内容 |
|---|---|
| `sheet-siege-1.png` / `sheet-siege-2.png` | 15 个 siege 场景，未标注 |
| `sheet-urban.png` | 4 个 urban-war 场景 |
| `sheet-caravel.png` | 6 个 caravel 场景 |
| `sheet-modern-1.png` / `sheet-modern-2.png` | 20 个 modern 场景 |
| `sheet-disaster-1.png` / `sheet-disaster-2.png` | 12 个 disaster 场景 |
| `key.json` | 每张图的编号 → 事件 id；**评审时不得打开** |
| `results-template.csv` | 记录表 |

每格是第 8 秒的静态帧，480×300 渲染后缩到 320×200 排版；只有编号，没有标题、年份、旗帜说明。

## 2. 测试流程（6 人）

1. 评审只看对应家族的图，不看 `key.json`、不看文档、不看网站。
2. 每格用一句话写出"你认为这是哪个事件 / 哪个地区 / 哪个时代"，并给 **识别置信度 1–5**。
3. 再给 **画面清晰度 1–5**（能否在 3 秒内读出主体与场景）。
4. 全部完成后才对照 `key.json` 计分。
5. 记录进 `results-template.csv`：`reviewer,sheet,card,guess,confidence,clarity`。

## 3. 通过线（沿用 variant-engine-spec）

- 同家族 10 格中 **≥7 格**能被认出是不同事件/地域（允许猜对地区或时代，不要求事件名完全一致）。
- 平均清晰度 **≥4.5**，且没有单格 <3。
- 任一子构图（balcony / barricade / assembly / quake / wave / siege 的 walls/gate/keep）低于 6/10，即判该子构图未过，不能扩量。

## 4. 当前已知风险

- `siege` 的 walls/gate/keep 仍共享同一套城墙与营地；本轮加了穹顶、柱廊、工厂、棕榈、金字塔、尖塔、桨帆船、铁路、桥、坦克、芦苇等 13 个地标，但 64×40 灰度差异只有 0.066，预计仍是盲测最弱的一组。
- `modern / balcony`（5 个）虽然加了乔治式山花、加勒比拱廊、热带檐廊、歌剧院柱廊、殖民式女儿墙，但共享人群与街道，灰度差异 0.025；需要评审判断"人眼是否够分辨"。
- `disaster / quake` 与 `wave` 本轮才拆出城市/海岸（里斯本河岸双塔、关东木屋火灾、墨西哥中层街区、印度洋渔村、福岛厂区），差异仍低（0.021 / 0.029）。
- 以上数字不替代盲测结论。

## 5. 不能做的事

- 没有 6 名评审，就不能写"Gate 2/3 通过"。
- 评审若是项目参与者，结果只能算内部走查，不能算盲测。
