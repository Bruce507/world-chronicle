#!/usr/bin/env python3
"""Build a simplified 50m world country file from world-atlas (TopoJSON).
Source: https://unpkg.com/world-atlas@2/countries-50m.json
"""
import json, math, os, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/countries-50m.json"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "world.geo.json")
OLD = json.load(open("/tmp/world_110m_backup.json"))
OLD_BY_NAME = {f["properties"]["n"]: f["properties"] for f in OLD["features"]}

# world-atlas abbreviated name -> full name used in this atlas
ALIAS = {
    "China": "People's Republic of China", "Czechia": "Czechia", "Macedonia": "North Macedonia", "eSwatini": "Eswatini",
    "Timor-Leste": "Timor-Leste", "S. Sudan": "South Sudan", "Cabo Verde": "Cabo Verde",
    "Côte d'Ivoire": "Côte d'Ivoire", "Dem. Rep. Congo": "Democratic Republic of the Congo",
    "Congo": "Republic of the Congo", "Eq. Guinea": "Equatorial Guinea",
    "Dominican Rep.": "Dominican Republic", "Central African Rep.": "Central African Republic",
    "Bosnia and Herz.": "Bosnia and Herzegovina", "Solomon Is.": "Solomon Islands",
    "St. Vin. and Gren.": "Saint Vincent and the Grenadines", "St. Kitts and Nevis": "Saint Kitts and Nevis",
    "Antigua and Barb.": "Antigua and Barbuda", "Fr. Polynesia": "French Polynesia",
    "Faeroe Is.": "Faroe Islands", "W. Sahara": "Western Sahara", "N. Cyprus": "Northern Cyprus",
    "São Tomé and Principe": "Sao Tome and Principe", "Bahamas": "The Bahamas", "Gambia": "The Gambia",
    "Macao": "Macao", "Hong Kong": "Hong Kong", "Vatican": "Vatican City",
    "Micronesia": "Micronesia", "Marshall Is.": "Marshall Islands", "N. Mariana Is.": "Northern Mariana Islands",
    "U.S. Virgin Is.": "U.S. Virgin Islands", "Guam": "Guam", "American Samoa": "American Samoa",
    "S. Geo. and the Is.": "South Georgia and the South Sandwich Islands",
    "Br. Indian Ocean Ter.": "British Indian Ocean Territory", "Saint Helena": "Saint Helena",
    "Pitcairn Is.": "Pitcairn Islands", "Anguilla": "Anguilla", "Falkland Is.": "Falkland Islands",
    "Cayman Is.": "Cayman Islands", "Bermuda": "Bermuda", "British Virgin Is.": "British Virgin Islands",
    "Turks and Caicos Is.": "Turks and Caicos Islands", "Montserrat": "Montserrat",
    "Jersey": "Jersey", "Guernsey": "Guernsey", "Isle of Man": "Isle of Man",
    "Tonga": "Tonga", "Singapore": "Singapore", "Seychelles": "Seychelles",
    "San Marino": "San Marino", "Samoa": "Samoa", "Saint Lucia": "Saint Lucia",
    "Palau": "Palau", "Niue": "Niue", "Cook Is.": "Cook Islands", "Aruba": "Aruba", "Curaçao": "Curaçao",
    "Nauru": "Nauru", "Monaco": "Monaco", "Mauritius": "Mauritius", "Malta": "Malta",
    "Maldives": "Maldives", "Liechtenstein": "Liechtenstein", "Kiribati": "Kiribati",
    "Grenada": "Grenada", "St. Pierre and Miquelon": "Saint Pierre and Miquelon",
    "Wallis and Futuna Is.": "Wallis and Futuna", "St-Martin": "Saint Martin", "St-Barthélemy": "Saint Barthélemy",
    "Fr. S. Antarctic Lands": "French Southern Territories", "Åland": "Åland Islands",
    "Dominica": "Dominica", "Comoros": "Comoros", "Andorra": "Andorra",
    "Sint Maarten": "Sint Maarten", "Indian Ocean Ter.": "Australian Indian Ocean Territories",
    "Heard I. and McDonald Is.": "Heard Island and McDonald Islands", "Norfolk Island": "Norfolk Island",
    "Ashmore and Cartier Is.": "Ashmore and Cartier Islands", "Siachen Glacier": "Siachen Glacier",
}

# extra metadata for names absent from the 110m file: zh, iso2, iso3, continent, subregion
EXTRA = {
    "Vatican City": ("梵蒂冈", "VA", "VAT", "Europe", "Southern Europe"),
    "Micronesia": ("密克罗尼西亚", "FM", "FSM", "Oceania", "Micronesia"),
    "Marshall Islands": ("马绍尔群岛", "MH", "MHL", "Oceania", "Micronesia"),
    "Northern Mariana Islands": ("北马里亚纳群岛", "MP", "MNP", "Oceania", "Micronesia"),
    "U.S. Virgin Islands": ("美属维尔京群岛", "VI", "VIR", "North America", "Caribbean"),
    "Guam": ("关岛", "GU", "GUM", "Oceania", "Micronesia"),
    "American Samoa": ("美属萨摩亚", "AS", "ASM", "Oceania", "Polynesia"),
    "South Georgia and the South Sandwich Islands": ("南乔治亚和南桑威奇群岛", "GS", "SGS", "South America", "South America"),
    "British Indian Ocean Territory": ("英属印度洋领地", "IO", "IOT", "Asia", "Southern Asia"),
    "Saint Helena": ("圣赫勒拿", "SH", "SHN", "Africa", "Western Africa"),
    "Pitcairn Islands": ("皮特凯恩群岛", "PN", "PCN", "Oceania", "Polynesia"),
    "Anguilla": ("安圭拉", "AI", "AIA", "North America", "Caribbean"),
    "Falkland Islands": ("福克兰群岛", "FK", "FLK", "South America", "South America"),
    "Cayman Islands": ("开曼群岛", "KY", "CYM", "North America", "Caribbean"),
    "Bermuda": ("百慕大", "BM", "BMU", "North America", "Northern America"),
    "British Virgin Islands": ("英属维尔京群岛", "VG", "VGB", "North America", "Caribbean"),
    "Turks and Caicos Islands": ("特克斯和凯科斯群岛", "TC", "TCA", "North America", "Caribbean"),
    "Montserrat": ("蒙特塞拉特", "MS", "MSR", "North America", "Caribbean"),
    "Jersey": ("泽西", "JE", "JEY", "Europe", "Northern Europe"),
    "Guernsey": ("根西", "GG", "GGY", "Europe", "Northern Europe"),
    "Isle of Man": ("马恩岛", "IM", "IMN", "Europe", "Northern Europe"),
    "Tonga": ("汤加", "TO", "TON", "Oceania", "Polynesia"),
    "Timor-Leste": ("东帝汶", "TL", "TLS", "Asia", "South-Eastern Asia"),
    "Eswatini": ("斯威士兰", "SZ", "SWZ", "Africa", "Southern Africa"),
    "South Sudan": ("南苏丹", "SS", "SSD", "Africa", "Eastern Africa"),
    "Solomon Islands": ("所罗门群岛", "SB", "SLB", "Oceania", "Melanesia"),
    "Singapore": ("新加坡", "SG", "SGP", "Asia", "South-Eastern Asia"),
    "Seychelles": ("塞舌尔", "SC", "SYC", "Africa", "Eastern Africa"),
    "Sao Tome and Principe": ("圣多美和普林西比", "ST", "STP", "Africa", "Middle Africa"),
    "San Marino": ("圣马力诺", "SM", "SMR", "Europe", "Southern Europe"),
    "Samoa": ("萨摩亚", "WS", "WSM", "Oceania", "Polynesia"),
    "Saint Vincent and the Grenadines": ("圣文森特和格林纳丁斯", "VC", "VCT", "North America", "Caribbean"),
    "Saint Lucia": ("圣卢西亚", "LC", "LCA", "North America", "Caribbean"),
    "Saint Kitts and Nevis": ("圣基茨和尼维斯", "KN", "KNA", "North America", "Caribbean"),
    "Palau": ("帕劳", "PW", "PLW", "Oceania", "Micronesia"),
    "Niue": ("纽埃", "NU", "NIU", "Oceania", "Polynesia"),
    "Cook Islands": ("库克群岛", "CK", "COK", "Oceania", "Polynesia"),
    "Aruba": ("阿鲁巴", "AW", "ABW", "North America", "Caribbean"),
    "Curaçao": ("库拉索", "CW", "CUW", "North America", "Caribbean"),
    "Nauru": ("瑙鲁", "NR", "NRU", "Oceania", "Micronesia"),
    "Western Sahara": ("西撒哈拉", "EH", "ESH", "Africa", "Northern Africa"),
    "Monaco": ("摩纳哥", "MC", "MCO", "Europe", "Western Europe"),
    "Mauritius": ("毛里求斯", "MU", "MUS", "Africa", "Eastern Africa"),
    "Malta": ("马耳他", "MT", "MLT", "Europe", "Southern Europe"),
    "Maldives": ("马尔代夫", "MV", "MDV", "Asia", "Southern Asia"),
    "North Macedonia": ("北马其顿", "MK", "MKD", "Europe", "Southern Europe"),
    "Liechtenstein": ("列支敦士登", "LI", "LIE", "Europe", "Western Europe"),
    "Kiribati": ("基里巴斯", "KI", "KIR", "Oceania", "Micronesia"),
    "Grenada": ("格林纳达", "GD", "GRD", "North America", "Caribbean"),
    "The Gambia": ("冈比亚", "GM", "GMB", "Africa", "Western Africa"),
    "Saint Pierre and Miquelon": ("圣皮埃尔和密克隆", "PM", "SPM", "North America", "Northern America"),
    "Wallis and Futuna": ("瓦利斯和富图纳", "WF", "WLF", "Oceania", "Polynesia"),
    "Saint Martin": ("圣马丁", "MF", "MAF", "North America", "Caribbean"),
    "Saint Barthélemy": ("圣巴泰勒米", "BL", "BLM", "North America", "Caribbean"),
    "French Polynesia": ("法属波利尼西亚", "PF", "PYF", "Oceania", "Polynesia"),
    "French Southern Territories": ("法属南部领地", "TF", "ATF", "Antarctica", "Antarctica"),
    "Åland Islands": ("奥兰群岛", "AX", "ALA", "Europe", "Northern Europe"),
    "Equatorial Guinea": ("赤道几内亚", "GQ", "GNQ", "Africa", "Middle Africa"),
    "Dominican Republic": ("多米尼加", "DO", "DOM", "North America", "Caribbean"),
    "Dominica": ("多米尼克", "DM", "DMA", "North America", "Caribbean"),
    "Faroe Islands": ("法罗群岛", "FO", "FRO", "Europe", "Northern Europe"),
    "Czechia": ("捷克", "CZ", "CZE", "Europe", "Eastern Europe"),
    "Northern Cyprus": ("北塞浦路斯", "-99", "-99", "Asia", "Western Asia"),
    "Côte d'Ivoire": ("科特迪瓦", "CI", "CIV", "Africa", "Western Africa"),
    "Democratic Republic of the Congo": ("刚果民主共和国", "CD", "COD", "Africa", "Middle Africa"),
    "Republic of the Congo": ("刚果共和国", "CG", "COG", "Africa", "Middle Africa"),
    "Comoros": ("科摩罗", "KM", "COM", "Africa", "Eastern Africa"),
    "Macao": ("澳门", "MO", "MAC", "Asia", "Eastern Asia"),
    "Hong Kong": ("香港", "HK", "HKG", "Asia", "Eastern Asia"),
    "Central African Republic": ("中非共和国", "CF", "CAF", "Africa", "Middle Africa"),
    "Cabo Verde": ("佛得角", "CV", "CPV", "Africa", "Western Africa"),
    "Bosnia and Herzegovina": ("波斯尼亚和黑塞哥维那", "BA", "BIH", "Europe", "Southern Europe"),
    "Barbados": ("巴巴多斯", "BB", "BRB", "North America", "Caribbean"),
    "Bahrain": ("巴林", "BH", "BHR", "Asia", "Western Asia"),
    "The Bahamas": ("巴哈马", "BS", "BHS", "North America", "Caribbean"),
    "Heard Island and McDonald Islands": ("赫德岛和麦克唐纳群岛", "HM", "HMD", "Antarctica", "Antarctica"),
    "Norfolk Island": ("诺福克岛", "NF", "NFK", "Oceania", "Australia and New Zealand"),
    "Ashmore and Cartier Islands": ("阿什莫尔和卡捷群岛", "-99", "-99", "Oceania", "Australia and New Zealand"),
    "Antigua and Barbuda": ("安提瓜和巴布达", "AG", "ATG", "North America", "Caribbean"),
    "Andorra": ("安道尔", "AD", "AND", "Europe", "Southern Europe"),
    "Siachen Glacier": ("锡亚琴冰川", "-99", "-99", "Asia", "Southern Asia"),
    "Sint Maarten": ("荷属圣马丁", "SX", "SXM", "North America", "Caribbean"),
    "Australian Indian Ocean Territories": ("澳属印度洋领地", "-99", "-99", "Asia", "South-Eastern Asia"),
}
SKIP = {"Antarctica", "Siachen Glacier", "Ashmore and Cartier Islands", "Heard Island and McDonald Islands", "British Indian Ocean Territory", "South Georgia and the South Sandwich Islands", "French Southern Territories", "Australian Indian Ocean Territories"}

def rdp(pts, eps):
    if len(pts) < 4: return pts
    keep = [False]*len(pts); keep[0]=keep[-1]=True
    stack=[(0,len(pts)-1)]
    while stack:
        a,b=stack.pop()
        if b<=a+1: continue
        ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay
        den=math.hypot(dx,dy) or 1; imax=-1; dmax=0
        for i in range(a+1,b):
            px,py=pts[i]; d=abs(dy*px-dx*py+bx*ay-by*ax)/den
            if d>dmax: dmax,imax=d,i
        if dmax>eps:
            keep[imax]=True; stack.append((a,imax)); stack.append((imax,b))
    return [p for p,k in zip(pts,keep) if k]

def simp_ring(r, eps=0.02):
    pts=[]
    for x,y in r:
        p=(round(x,2),round(y,2))
        if not pts or p!=pts[-1]: pts.append(p)
    closed=len(pts)>1 and pts[0]==pts[-1]
    if closed: pts=pts[:-1]
    if len(pts)>3:
        q=rdp(pts,eps)
        if len(q)>=3: pts=q
    if len(pts)>=3: pts=pts+[pts[0]]
    return [list(p) for p in pts]

def area(r):
    s=0
    for i in range(len(r)-1): s+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1]
    return abs(s)/2

topo=json.load(open(SRC))
tr=topo["transform"]; sx,sy=tr["scale"]; tx,ty=tr["translate"]
arcs=[]
for arc in topo["arcs"]:
    x=y=0; pts=[]
    for dx,dy in arc:
        x+=dx; y+=dy; pts.append([x*sx+tx, y*sy+ty])
    arcs.append(pts)
def arcpts(i): return arcs[i] if i>=0 else list(reversed(arcs[~i]))
def ring(idxs):
    out=[]
    for k,i in enumerate(idxs):
        pts=arcpts(i)
        if k>0: pts=pts[1:]
        out.extend(pts)
    return out
def geom(g):
    if g["type"]=="Polygon":
        return {"type":"Polygon","coordinates":[simp_ring(r) for r in [ring(x) for x in g["arcs"]]]}
    if g["type"]=="MultiPolygon":
        polys=[]
        for poly in g["arcs"]:
            rings=[simp_ring(ring(x)) for x in poly]
            if len(rings[0])>=4 and area(rings[0])>0.00005: polys.append(rings)
        return {"type":"MultiPolygon","coordinates":polys} if polys else None
    return None

out=[]
for g in topo["objects"]["countries"]["geometries"]:
    raw=g.get("properties",{}).get("name") or "?"
    name=ALIAS.get(raw, raw)
    if name in SKIP: continue
    gg=geom(g)
    if not gg: continue
    old=OLD_BY_NAME.get(name) or OLD_BY_NAME.get(raw)
    if old:
        zh=old.get("zh") or name; iso2=old.get("iso2") or "-99"; iso3=old.get("iso3") or "-99"
        cont=old.get("cont") or ""; sub=old.get("sub") or ""
    else:
        e=EXTRA.get(name) or EXTRA.get(raw)
        if e: zh,iso2,iso3,cont,sub=e
        else: zh=name; iso2="-99"; iso3="-99"; cont=""; sub=""
    # label point from old, else bbox centre of largest ring
    lx=old.get("lx") if old else None; ly=old.get("ly") if old else None
    if lx is None or ly is None:
        polys=[gg["coordinates"]] if gg["type"]=="Polygon" else gg["coordinates"]
        best=max(polys,key=lambda poly: area(poly[0]))
        xs=[q[0] for q in best[0]]; ys=[q[1] for q in best[0]]
        lx=(min(xs)+max(xs))/2; ly=(min(ys)+max(ys))/2
    out.append({"type":"Feature","properties":{"n":name,"zh":zh,"iso2":iso2,"iso3":iso3,"cont":cont,"sub":sub,"lx":round(lx,2),"ly":round(ly,2)},"geometry":gg})

if not any(f["properties"]["n"] == "Tuvalu" for f in out):
    # Tuvalu's atolls are below the 50m generalization threshold; add a schematic ring.
    lon, lat, r = 179.2, -8.52, 0.12
    ring = [[round(lon - r, 2), round(lat - r, 2)], [round(lon + r, 2), round(lat - r, 2)],
            [round(lon + r, 2), round(lat + r, 2)], [round(lon - r, 2), round(lat + r, 2)],
            [round(lon - r, 2), round(lat - r, 2)]]
    out.append({"type": "Feature", "properties": {"n": "Tuvalu", "zh": "图瓦卢", "iso2": "TV", "iso3": "TUV",
                "cont": "Oceania", "sub": "Polynesia", "lx": lon, "ly": lat},
                "geometry": {"type": "Polygon", "coordinates": [ring]}})

json.dump({"type":"FeatureCollection","features":out},open(OUT,"w"),ensure_ascii=False,separators=(",",":"))
print("features",len(out),"KB",round(os.path.getsize(OUT)/1024))
print("missing meta", [f["properties"]["n"] for f in out if f["properties"]["iso3"] in (None,"-99") and f["properties"]["zh"]==f["properties"]["n"]][:20])
print("small present",[f["properties"]["n"] for f in out if f["properties"]["n"] in ("Antigua and Barbuda","Barbados","Comoros","Maldives","Malta","Singapore","Tonga","Vatican City","San Marino","Monaco","Nauru")])
