#!/usr/bin/env python3
"""Build a continuous 'country chronicle' for every modern country.

For each country, sample the simplified historical snapshots at its label point,
group consecutive samples by ruling polity, attach event nodes and a modern-state
segment, and write data/country_chronicles.json.
"""
import json, math, os, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(ROOT, "data", "historical")
OUT = os.path.join(ROOT, "data", "country_chronicles.json")

world = json.load(open(os.path.join(ROOT, "data", "world.geo.json")))
events = json.load(open(os.path.join(ROOT, "data", "events.json")))
manifest = json.load(open(os.path.join(HIST, "manifest.json")))["snapshots"]
STATE = json.load(open(os.path.join(ROOT, "data", "state_changes.json")))
BIRTH_BY_KEY = {b["key"]: b for b in STATE.get("births", [])}
BIRTH_BY_NAME = {b["name"]["en"]: b for b in STATE.get("births", [])}
meta = json.load(open(os.path.join(ROOT, "data", "meta.json")))
ERA_BOUNDS = sorted({e["from"] for e in meta["eras"] if -1200 <= e["from"] <= 1991})
ERA_OF = [(e["from"], e["to"], e["id"], e["zh"], e["en"]) for e in meta["eras"]]
manifest = [s for s in manifest if s["year"] <= 1994]

SAMPLES = [-3000, -2500, -2000, -1500, -1000, -500, 1, 500, 1000, 1300, 1500, 1600, 1700, 1815, 1900, 1914, 1938, 1945, 1960, 1994, 2010]
SNAP = {s["year"]: json.load(open(os.path.join(HIST, s["file"]))) for s in manifest}
SNAP_YEARS = sorted(SNAP.keys())

def norm(s):
    return (s or "").strip().lower().replace("’", "'").replace("&", "and")

def slug(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    s = s.lower().replace("'", "").replace("’", "")
    out = []
    for ch in s:
        if ch.isalnum(): out.append(ch)
        else:
            if not out or out[-1] != "-": out.append("-")
    return "".join(out).strip("-")[:64] or "event"

def ring_contains(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

def geom_contains(x, y, geom, bbox):
    if not bbox: return False
    if x < bbox[0] or x > bbox[2] or y < bbox[1] or y > bbox[3]: return False
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        if ring_contains(x, y, poly[0]):
            hole = False
            for k in range(1, len(poly)):
                if ring_contains(x, y, poly[k]): hole = True; break
            if not hole: return True
    return False

def bbox_of(geom):
    xs = []; ys = []
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        for x, y in poly[0]:
            xs.append(x); ys.append(y)
    return [min(xs), min(ys), max(xs), max(ys)]

def key_of(p):
    if p.get("iso3") and p["iso3"] != "-99": return p["iso3"]
    if p.get("iso2") and p["iso2"] != "-99": return p["iso2"]
    return p["n"]

# prepare modern features
feats = []
for f in world["features"]:
    p = f["properties"]
    if p.get("cont") == "Antarctica": continue
    b = bbox_of(f["geometry"])
    lens = []
    polys = [f["geometry"]["coordinates"]] if f["geometry"]["type"] == "Polygon" else f["geometry"]["coordinates"]
    best = max(polys, key=lambda poly: abs(sum(poly[0][i][0]*poly[0][i-1][1]-poly[0][i-1][0]*poly[0][i][1] for i in range(len(poly[0])))))
    # label point, fallback to bbox centre
    lon = p.get("lx"); lat = p.get("ly")
    if lon is None or lat is None or not geom_contains(lon, lat, f["geometry"], b):
        lon = (b[0]+b[2])/2; lat = (b[1]+b[3])/2
    feats.append({"f": f, "p": p, "key": key_of(p), "bbox": b, "lon": lon, "lat": lat})

# map events to modern countries (explicit country code first)
by_key = {f["key"]: f for f in feats}
by_code = {}
for f in feats:
    p = f["p"]
    for k in (p.get("iso2"), p.get("iso3"), p.get("n")):
        if k and k != "-99": by_code[k] = f
event_ids = {}
for e in events:
    eid = slug(e["t"][1])
    f = by_code.get(e.get("c")) if e.get("c") else None
    if not f:
        for cand in feats:
            if geom_contains(e["lon"], e["lat"], cand["f"]["geometry"], cand["bbox"]):
                f = cand; break
    if f:
        event_ids.setdefault(f["key"], []).append((e["y"], eid, e["t"][0]))

def nearest_snap(y):
    if y < SNAP_YEARS[0] or y > SNAP_YEARS[-1]: return None
    return min(SNAP_YEARS, key=lambda s: abs(s-y))

def ruler_at(lon, lat, y):
    sy = nearest_snap(y)
    if sy is None: return None
    snap = SNAP[sy]
    for f in snap["features"]:
        p = f["properties"]
        g = f["geometry"]
        b = bbox_of(g)
        if geom_contains(lon, lat, g, b):
            return {"name": p.get("sub") or p.get("name"), "zh": p.get("zh") or "", "year": sy}
    return {"name": "Local communities", "zh": "地方社群", "year": sy}

ZH_EXTRA = {
    "Sinic": "华夏", "Jin Empire": "晋", "Eastern Roman Empire": "东罗马帝国",
    "Fatimid Caliphate": "法蒂玛王朝", "Mamluke Sultanate": "马穆鲁克苏丹国",
    "Urnfield cultures": "瓮棺文化", "Franks": "法兰克人", "Pawnee": "波尼人",
    "Plain bison hunters": "平原野牛猎民", "USA": "美国", "United States of America": "美国",
    "United States": "美国", "United Kingdom": "英国", "United Kingdom of Great Britain and Ireland": "大英帝国",
    "China": "中国", "Chinese warlords": "中国军阀", "Local communities": "地方社群",
    "Prehistoric communities": "史前社群", "Russia": "俄罗斯", "Soviet Union": "苏联",
    "Ottoman Empire": "奥斯曼帝国", "Ming Chinese Empire": "明", "Manchu Empire": "清",
}

def era_of(year):
    for f, t, i, zh, en in ERA_OF:
        if f <= year < t:
            return {"id": i, "zh": zh, "en": en}
    return ERA_OF[-1][3:] and {"id": ERA_OF[-1][2], "zh": ERA_OF[-1][3], "en": ERA_OF[-1][4]}

ALIASES = {
    "United States of America": "United States", "United States": "United States",
    "United Kingdom of Great Britain and Ireland": "United Kingdom", "United Kingdom": "United Kingdom",
    "Russia": "Russia", "Russian Empire": "Russia", "USSR": "Russia", "Tsardom of Muscovy": "Russia",
    "China": "China", "Ming Chinese Empire": "China", "Manchu Empire": "China", "Chinese warlords": "China",
    "France": "France", "Spain": "Spain", "Portugal": "Portugal", "Denmark": "Denmark", "Sweden": "Sweden",
    "Poland": "Poland", "Poland-Lithuania": "Poland", "Germany": "Germany", "German Empire": "Germany",
    "Italy": "Italy", "Turkey": "Turkey", "Ottoman Empire": "Turkey", "Egypt": "Egypt",
    "India": "India", "Pakistan": "Pakistan", "Iran": "Iran", "Iraq": "Iraq", "Japan": "Japan",
    "Korea": "Korea", "Vietnam": "Vietnam", "Thailand": "Thailand", "Siam": "Thailand",
    "Ethiopia": "Ethiopia", "Morocco": "Morocco", "Algeria": "Algeria", "Tunisia": "Tunisia", "Libya": "Libya",
    "South Africa": "South Africa", "Nigeria": "Nigeria", "Kenya": "Kenya", "Tanzania": "Tanzania",
    "Mexico": "Mexico", "Brazil": "Brazil", "Argentina": "Argentina", "Chile": "Chile", "Peru": "Peru",
    "Canada": "Canada", "Australia": "Australia", "Indonesia": "Indonesia", "Philippines": "Philippines",
}

def matches_modern(subject, country_name):
    a = norm(ALIASES.get(subject, subject))
    b = norm(ALIASES.get(country_name, country_name))
    if not a or not b: return False
    return a == b or a in b or b in a

out = {}
for f in feats:
    p = f["p"]; name_zh = p.get("zh") or p.get("n"); name_en = p.get("n")
    modern_name = {"zh": name_zh, "en": name_en}
    samples = []
    for y in SAMPLES:
        if y >= 2010:
            r = {"name": name_en, "zh": name_zh, "year": 2010}
        else:
            r = ruler_at(f["lon"], f["lat"], y)
            if not r:
                r = {"name": "Prehistoric communities", "zh": "史前社群", "year": y}
        r["y"] = y
        samples.append(r)
    # group consecutive samples by subject
    groups = []
    for s in samples:
        if groups and norm(groups[-1]["name"]) == norm(s["name"]):
            groups[-1]["to"] = s["y"]
        else:
            groups.append({"from": s["y"], "to": s["y"], "name": s["name"], "zh": s["zh"], "year": s["year"]})
    if not groups:
        groups = [{"from": -12000, "to": 2026, "name": "Local communities", "zh": "地方社群", "year": -3000}]
    groups[0]["from"] = -12000
    groups[-1]["to"] = 2026
    for i in range(1, len(groups)):
        groups[i]["from"] = groups[i - 1]["to"]
    # modern run: prefer the curated birth year, else the earliest 20th-century match
    birth = BIRTH_BY_KEY.get(f["key"]) or BIRTH_BY_NAME.get(name_en)
    if birth and -3000 <= birth["year"] <= 2026:
        modern_from = birth["year"]
    else:
        modern_from = 1994
        for g in groups:
            if g["to"] >= 1900 and g["from"] <= 1994 and matches_modern(g["name"], name_en):
                modern_from = max(1900, g["from"])
                break
    # split long reigns at era boundaries so the chronicle reads as periods, not one block
    split_groups = []
    for g in groups:
        cuts = [b for b in ERA_BOUNDS if g["from"] + 60 < b < g["to"] - 60]
        pts = [g["from"]] + cuts + [g["to"]]
        for a, b in zip(pts, pts[1:]):
            ng = dict(g); ng["from"] = a; ng["to"] = b
            split_groups.append(ng)
    groups = split_groups
    # trim/merge around modern segment
    trimmed = []
    for g in groups:
        if g["to"] <= modern_from: trimmed.append(g)
        elif g["from"] < modern_from:
            g["to"] = modern_from; trimmed.append(g)
    if not trimmed or trimmed[-1]["to"] < 2026:
        trimmed.append({"from": modern_from, "to": 2026, "name": name_en, "zh": name_zh, "year": modern_from})
        if birth:
            trimmed[-1]["birth"] = {"year": birth["year"], "kind": birth["kind"],
                                    "note": birth["note"]}
    for g in trimmed:
        if not g.get("zh"):
            g["zh"] = ZH_EXTRA.get(g["name"], "")
        g["era"] = era_of(g["from"])
    # attach events
    evs = sorted(event_ids.get(f["key"], []), key=lambda x: x[0])
    for g in trimmed:
        g["events"] = [eid for (y, eid, t) in evs if g["from"] <= y < g["to"]]
        g["modern"] = g["from"] >= modern_from and g["to"] >= 2026
        g["name"] = g.get("name") or "Local communities"
        g["zh"] = g.get("zh") or ""
    # summary
    first = next((g for g in trimmed if g["from"] >= -3000 and g["name"] and g["name"] != "Local communities"), trimmed[0])
    summary = {
        "zh": "从" + (first.get("zh") or first["name"]) + "到" + name_zh + "的沿革长卷。",
        "en": "A chronicle from " + first["name"] + " to " + name_en + ".",
    }
    out[f["key"]] = {
        "name": modern_name,
        "key": f["key"],
        "segments": trimmed,
        "summary": summary,
        "nodeCount": len(evs),
    }

json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print("countries", len(out), "with events", sum(1 for v in out.values() if v["nodeCount"]), "size KB", round(os.path.getsize(OUT)/1024))
print("sample China:", json.dumps(out.get("CHN", out.get("China", {})), ensure_ascii=False)[:500])
