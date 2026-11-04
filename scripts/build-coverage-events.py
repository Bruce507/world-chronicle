#!/usr/bin/env python3
"""Ensure every modern state/territory has at least one curated node.
Generates a modern-statehood event for countries with no event, using state_changes.json.
Entries are tagged gen='coverage' so the script can regenerate them safely.
"""
import json, math, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
world = json.load(open(os.path.join(ROOT, "data", "world.geo.json")))
events = json.load(open(os.path.join(ROOT, "data", "events.json")))
curated = [e for e in events if e.get("gen") != "coverage"]
states = json.load(open(os.path.join(ROOT, "data", "state_changes.json")))

def slug(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    s = s.lower().replace("'", "").replace("’", "")
    out=[]
    for ch in s:
        if ch.isalnum(): out.append(ch)
        elif not out or out[-1] != "-": out.append("-")
    return "".join(out).strip("-")[:64] or "event"

def ring_contains(x,y,ring):
    inside=False; j=len(ring)-1
    for i in range(len(ring)):
        xi,yi=ring[i]; xj,yj=ring[j]
        if ((yi>y)!=(yj>y)) and x < (xj-xi)*(y-yi)/(yj-yi)+xi: inside=not inside
        j=i
    return inside

def bbox(g):
    polys=[g["coordinates"]] if g["type"]=="Polygon" else g["coordinates"]
    xs=[];ys=[]
    for poly in polys:
        for x,y in poly[0]: xs.append(x);ys.append(y)
    return [min(xs),min(ys),max(xs),max(ys)]

def contains(x,y,g,b):
    if x<b[0] or x>b[2] or y<b[1] or y>b[3]: return False
    polys=[g["coordinates"]] if g["type"]=="Polygon" else g["coordinates"]
    for poly in polys:
        if ring_contains(x,y,poly[0]):
            hole=False
            for k in range(1,len(poly)):
                if ring_contains(x,y,poly[k]): hole=True; break
            if not hole: return True
    return False

def key_of(p):
    if p.get("iso3") and p["iso3"] != "-99": return p["iso3"]
    if p.get("iso2") and p["iso2"] != "-99": return p["iso2"]
    return p["n"]

feats=[]
for f in world["features"]:
    p=f["properties"]
    if p.get("cont")=="Antarctica": continue
    b=bbox(f["geometry"])
    feats.append({"p":p,"key":key_of(p),"bbox":b,"g":f["geometry"]})
bykey={f["key"]:f for f in feats}
bycode={}
for f in feats:
    p=f["p"]
    for k in (p.get("iso2"),p.get("iso3"),p.get("n")):
        if k and k!="-99": bycode[k]=f

# countries already covered by a curated event (point-in-polygon or country code)
covered=set()
for e in curated:
    found = bycode.get(e.get("c")) if e.get("c") else None
    if not found:
        for f in feats:
            if contains(e["lon"],e["lat"],f["g"],f["bbox"]): found=f; break
    if found: covered.add(found["key"])

def region(p):
    c=(p.get("cont") or "").lower(); s=(p.get("sub") or "").lower()
    if "africa" in c: return "af"
    if "europe" in c: return "eu"
    if "north america" in c: return "na"
    if "south america" in c: return "la"
    if "oceania" in c: return "oc"
    if "asia" in c:
        if "south-eastern" in s: return "sea"
        if "southern" in s: return "sa"
        if "central" in s: return "ca"
        if "western" in s: return "me"
        return "ea"
    return "eu"

base=list(curated)
added=[]
for b in states.get("births",[]):
    if b["key"] in covered: continue
    if not (-12000 <= b["year"] <= 2026): continue
    p=bykey.get(b["key"])
    if not p: continue
    name=b["name"]; note=b["note"]; kind=b["kind"]
    if kind == "independence":
        zh_title=name["zh"]+" · 独立建国"; en_title=name["en"]+" · Independence"
    elif kind in ("state","federation","union","unification"):
        zh_title=name["zh"]+" · 现代国家形成"; en_title=name["en"]+" · Modern Statehood"
    elif kind == "territory":
        zh_title=name["zh"]+" · 现代地位确立"; en_title=name["en"]+" · Modern Status"
    else:
        zh_title=name["zh"]+" · 国家地位确立"; en_title=name["en"]+" · Statehood"
    scene = "protest" if kind == "independence" else "city"
    added.append({
        "y": b["year"],
        "lat": b["lat"], "lon": b["lon"],
        "c": (b.get("iso2") if b.get("iso2") not in (None,"-99") else ""),
        "rg": region(p["p"]),
        "k": "politics",
        "s": scene,
        "t": [zh_title, en_title],
        "d": [note["zh"]+"。"+name["zh"]+"的现代国家形态由此展开。", note["en"]+". The modern state of "+name["en"]+" takes shape."],
        "gen": "coverage",
    })

json.dump(base+added, open(os.path.join(ROOT,"data","events.json"),"w"), ensure_ascii=False, indent=2)
print("coverage added",len(added),"total",len(base)+len(added),"covered now",len(covered)+len(added))
