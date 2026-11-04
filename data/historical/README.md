# Historical borders

Simplified snapshots derived from **[aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)** (GPL-3.0).

- `manifest.json` lists the snapshots and can be regenerated with `scripts/build-historical.py`.
- Each `world_<year>.json` contains simplified polygons, a subject colour, and pre-computed labels. Coordinates are rounded and simplified for display; these are **schematic historical territories**, not surveyed borders.
- Snapshots included: 3000 BCE, 1000 BCE, 500 BCE, 1 CE, 500, 1000, 1300, 1500, 1600, 1700, 1815, 1900, 1914, 1938, 1945, 1960, 1994, 2010.

To rebuild (requires a checkout of the source repository):

```bash
python3 scripts/build-historical.py /path/to/historical-basemaps/geojson
```

The app uses the snapshots up to 1994; later years use the modern Natural Earth layer. See the repository's GPL-3.0 `LICENSE` and the project root `LICENSE`.
