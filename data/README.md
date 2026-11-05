# Data sources

| File | Role |
| --- | --- |
| `meta.json` | Eras, regions, categories, scenes and atlas metadata |
| `events.json` | The curated event corpus (maintained source; includes generated coverage nodes tagged `gen: "coverage"`) |
| `event_details.json` | Structured event dossiers (background / course / outcome / actors / sources / verification) |
| `event_groups.json` | Event chains and same-country/same-year groups, e.g. `japan-1945` |
| `regions.json` | Camera presets for the top region navigator |
| `historical_entities.json` | Generated historical label layer (snapshot names + modern state births + curated entities) |
| `entities_curated.json` | Hand-curated key entities (China dynasties, Japan, Australia, colonial Americas, etc.) |
| `name_gloss.json` | Chinese display names for common historical polities/cultures; untranslated names are hidden in Chinese mode rather than shown in English |
| `scene_variants.json` | Event ID → visual family (cn-founding, roman-founding, cn-cavalry, greek-naval, paper, mughal-tomb, etc.) |
| `polities.json` | Schematic contemporaneous civilizations (halos) |
| `theatre.json` | Map-theatre scripts: sides, fronts, battles, routes, trade networks |
| `world.geo.json` | Modern countries and territories, simplified from Natural Earth 50m / world-atlas, with en/zh/es/fr/ar names |
| `state_changes.json` | Modern state births and major dissolutions |
| `country_chronicles.json` | Generated per-country chronicles (historical ruler segments + event nodes) |
| `historical/` | Simplified historical boundary snapshots (GPL-3.0, see its README) |

Event titles/descriptions include `tx`/`dx` translations for Spanish, French and Arabic (machine-assisted). Everything except `country_chronicles.json` and the historical snapshots is editable by hand. Run:

```bash
node scripts/validate-data.mjs
node scripts/build-historical-entities.mjs  # historical label layer
node scripts/build-data.mjs   # writes js/data_bundle.js
node scripts/build-reports.mjs # docs/ inventory + coverage matrix
python3 scripts/build-chronicles.py  # after events or state changes change
```

See `CONTRIBUTING.md` for the event schema and workflow.
