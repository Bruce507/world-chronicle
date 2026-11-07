# P2-2 内容深度记录 / Content depth pass

Date 2026-11-07. 承接 `docs/p0-p1-round2-2026-11.md` 与 `docs/next-stage-2026-11.md`。本轮只补齐史志与来源，不改事件的地理、年份、类别、视觉家族映射。

## 1. 数字

| 项 | 本轮前 | 本轮后 |
|---|---:|---:|
| `data/event_details.json` 完整/结构化条目 | 52 | **112** |
| Hero 事件有完整史志 | 9 / 32 | **32 / 32** |
| Tier B 事件有完整史志 | 4 / 29 | **29 / 29** |
| 3 条主题路线内事件有完整史志 | 18 / 28 | **28 / 28** |
| 1937 东亚组（卢沟桥 / 南京 / 淞沪） | 2 / 3 | **3 / 3** |
| 来源链接总数 | 约 100 | **226**（201 个唯一 URL），平均每条 2.0 |
| 带「为何重要」段落的条目 | 0 | **60**（本轮新增的全部条目） |
| 仍为“简要条目”的事件 | 469 | **409** |

事件总数仍为 **521**，56 个视觉家族、32 Hero、29 Tier B 未变。

## 2. 本轮新增的 60 条

### Hero（23 条此前缺史志）

song-dynasty, qing-takes-beijing, founding-of-rome, russian-revolution, taj-mahal,
cai-lun-improves-papermaking, peloponnesian-war, zheng-hes-voyages,
columbus-reaches-the-americas, xuanzangs-journey-to-the-west, pyramids-of-giza,
code-of-hammurabi, athenian-democracy, maurya-empire, the-silk-road, the-hijra,
genghis-khan, mali-empire, borobudur, tenochtitlan-founded, maori-reach-aotearoa,
vasco-da-gama-reaches-india, fall-of-the-inca

### Tier B（25 条此前缺史志）

fall-of-constantinople, mongols-sack-baghdad, fall-of-granada, sack-of-rome,
siege-of-leningrad, cabral-reaches-brazil, magellans-circumnavigation, the-mayflower,
cook-at-tahiti, bering-reaches-alaska, haiti-independent, greek-war-of-independence,
italian-unification, indonesia-proclaims-independence, peoples-republic-of-china,
battle-of-shanghai, battle-of-taierzhuang, battle-of-wuhan, hundred-regiments-offensive,
battle-of-plassey, mukden-incident, ottoman-conquest-of-egypt, battle-of-mohacs,
siege-of-vienna-1529, second-italo-ethiopian-war, second-battle-of-el-alamein,
ottoman-capture-of-baghdad

### 主题路线事件（与上重叠者不重复计）

baghdad-founded, portuguese-capture-malacca, english-east-india-company,
fall-of-the-han, fall-of-western-rome, fall-of-the-aztec-empire,
stockton-darlington-railway, wright-brothers-first-flight, penicillin-discovered,
sputnik-1

## 3. 每条的结构

新增条目统一包含：

- 摘要（summary）
- 背景（background）
- 经过（course）
- 结果与影响（outcome）
- 为何重要（why，本轮新增字段，界面以朱线强调）
- 参与方（actors，2–4 组中英名）
- 日期与地点（含经纬度）
- 2 个可核对来源（`sources`）
- `verification: "partial"`（“部分核实”，不冒充“已核史实”）

界面在事件面板与“展开史志”弹窗中都会显示“为何重要”；已有 52 条旧条目不改写，因此没有该字段，仍正常显示摘要/背景/经过/结果/来源。

## 4. 来源策略

- Britannica 条目 101 条，覆盖君主、战争、建筑与科技主题；
- Wikipedia 英文条目 67 条，作为可核对的第二来源；URL 经 REST API 或 HTTP 访问校验；
- 少量机构页（NASA、UN、UNESCO、NLM、Nobel Prize、Library of Congress、Plimoth、CERN/info.cern.ch 等）用于科技与纪念性主题；
- 本轮同时修复了 25 条旧条目中的失效 URL（404/timeout），替换为可达的 Britannica / Wikipedia / UNESCO 页面，并同步改写来源标签，避免标签与域名不符；
- 未编造 DOI、档案编号或未公开馆藏链接。所有链接在 2026-11-07 做过可达性检查：返回 200、403（站点反爬）或 429（限流）者保留，404/000 者已替换。

来源的选择标准是“能核对事实”，不等于逐条独立史学审稿；因此校验状态统一标为“部分核实”。

## 5. 未完成 / 边界

- 仍有 **409** 个事件是“简要条目”（其中 143 个为 featured）。这些条目保留策展摘要，界面明确写“本条为策展摘要：长文、参与方与来源仍待补齐，不以推测填充”，不批量伪造长文。
- 本轮新增条目以中英双语为主；ES/FR/AR 仍回退英文（见 P2-6 与 `docs/qa-and-limitations.md`）。
- 古代事件的日期多为学界通行纪年或传统纪年，已在字段中写“约 / 传统”；不把争议年代写成确定事实。
- 敏感事件（南京大屠杀、亚齐、海地、印巴核试验等）保持纪念性、非煽动叙述；伤亡数字只引用有出处的区间或说明争议。

## 6. 验证

```bash
node scripts/validate-data.mjs
node scripts/build-data.mjs
node scripts/content-check.mjs   # 逐条打开 112 条史志，检查背景/为何重要/来源链接
```

`content-check` 结果：112 条全部能在面板中渲染摘要、背景与至少 2 个来源；60 条新条目全部有“为何重要”；无控制台错误。
