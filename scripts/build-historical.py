#!/usr/bin/env python3
"""Build simplified historical boundary snapshots from aourednik/historical-basemaps.

Source: https://github.com/aourednik/historical-basemaps (GPL-3.0)
Run:  python3 scripts/build-historical.py /path/to/historical-basemaps/geojson
Output: data/historical/manifest.json + world_<year>.json
"""
import json, math, os, sys, hashlib

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/historical-basemaps/geojson"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "historical")
os.makedirs(OUT, exist_ok=True)

SNAPSHOTS = [
    ("bc3000", -3000), ("bc1000", -1000), ("bc500", -500), ("bc1", 1),
    (500, 500), (1000, 1000), (1300, 1300), (1500, 1500), (1600, 1600),
    (1700, 1700), (1815, 1815), (1900, 1900), (1914, 1914), (1938, 1938),
    (1945, 1945), (1960, 1960), (1994, 1994), (2010, 2010),
]

# A compact Chinese gloss table for the polities a reader is most likely to meet.
ZH = {
    "Achaemenid Empire": "阿契美尼德波斯", "Persian Empire": "波斯帝国",
    "Roman Empire": "罗马帝国", "Roman Republic": "罗马共和国", "Byzantine Empire": "拜占庭帝国",
    "Han": "汉", "Han Empire": "汉", "Han Chinese Empire": "汉", "Tang Empire": "唐", "Tang Chinese Empire": "唐",
    "Song Empire": "宋", "Song Chinese Empire": "宋", "Ming Chinese Empire": "明", "Ming Empire": "明",
    "Manchu Empire": "清", "Qing Empire": "清", "Yuan Empire": "元", "Mongol Empire": "蒙古帝国",
    "Xiongnu": "匈奴", "Xianbei": "鲜卑", "Tibet": "吐蕃", "Tubo": "吐蕃", "Nanzhao": "南诏",
    "Sasanian Empire": "萨珊波斯", "Parthian Empire": "帕提亚", "Seleucid Empire": "塞琉古",
    "Maurya Empire": "孔雀王朝", "Gupta Empire": "笈多王朝", "Mughal Empire": "莫卧儿帝国",
    "Delhi Sultanate": "德里苏丹国", "Maratha Confederacy": "马拉塔联盟", "Vijayanagara": "维查耶纳伽尔",
    "Chola Empire": "朱罗王朝", "Pallava": "帕拉瓦", "Rashtrakuta": "罗湿陀罗拘陀",
    "Ottoman Empire": "奥斯曼帝国", "Seljuk Empire": "塞尔柱帝国", "Timurid Empire": "帖木儿帝国",
    "Umayyad Caliphate": "伍麦叶哈里发", "Abbasid Caliphate": "阿拔斯哈里发", "Rashidun Caliphate": "正统哈里发",
    "Safavid Empire": "萨法维波斯", "Qajar Persia": "恺加波斯", "Ilkhanate": "伊儿汗国",
    "Chagatai Khanate": "察合台汗国", "Golden Horde": "金帐汗国", "White Horde": "白帐汗国",
    "Khwarazmian Empire": "花剌子模", "Ghaznavid Empire": "伽色尼王朝", "Ghurid Empire": "古尔王朝",
    "Holy Roman Empire": "神圣罗马帝国", "Frankish Empire": "法兰克帝国", "Carolingian Empire": "加洛林帝国",
    "France": "法国", "Kingdom of France": "法兰西王国", "Spain": "西班牙", "Portugal": "葡萄牙",
    "England": "英格兰", "United Kingdom": "英国", "United Kingdom of Great Britain and Ireland": "大英帝国",
    "Austria": "奥地利", "Austria Hungary": "奥匈帝国", "Austrian Empire": "奥地利帝国",
    "Prussia": "普鲁士", "German Empire": "德意志帝国", "Germany": "德国", "Russia": "俄罗斯",
    "Russian Empire": "俄罗斯帝国", "USSR": "苏联", "Tsardom of Muscovy": "莫斯科沙皇国",
    "Grand Duchy of Moscow": "莫斯科大公国", "Poland": "波兰", "Poland-Lithuania": "波兰立陶宛",
    "Denmark": "丹麦", "Denmark-Norway": "丹麦-挪威", "Kalmar Union": "卡尔马联盟", "Sweden": "瑞典",
    "Norway": "挪威", "Netherlands": "荷兰", "Belgium": "比利时", "Switzerland": "瑞士",
    "Italy": "意大利", "Papal States": "教宗国", "Venice": "威尼斯", "Genoa": "热那亚",
    "Greece": "希腊", "Byzantium": "拜占庭", "Serbia": "塞尔维亚", "Bulgaria": "保加利亚",
    "Hungary": "匈牙利", "Romania": "罗马尼亚", "Ukraine": "乌克兰", "Belarus": "白俄罗斯",
    "Lithuania": "立陶宛", "Latvia": "拉脱维亚", "Estonia": "爱沙尼亚", "Finland": "芬兰",
    "Ireland": "爱尔兰", "Scotland": "苏格兰", "Iceland": "冰岛", "Greenland": "格陵兰",
    "Egypt": "埃及", "Ancient Egypt": "古埃及", "Kush": "库什", "Aksum": "阿克苏姆",
    "Ethiopia": "埃塞俄比亚", "Nubia": "努比亚", "Carthage": "迦太基", "Numidia": "努米底亚",
    "Mali Empire": "马里帝国", "Songhai Empire": "桑海帝国", "Ghana Empire": "加纳帝国",
    "Kanem-Bornu": "卡涅姆-博尔努", "Benin": "贝宁", "Kongo": "刚果", "Great Zimbabwe": "大津巴布韦",
    "Zulu": "祖鲁", "Asante": "阿散蒂", "Dahomey": "达荷美", "Morocco": "摩洛哥",
    "Algeria": "阿尔及利亚", "Tunisia": "突尼斯", "Libya": "利比亚", "Sudan": "苏丹",
    "Nigeria": "尼日利亚", "South Africa": "南非", "Kenya": "肯尼亚", "Tanzania": "坦桑尼亚",
    "Angola": "安哥拉", "Mozambique": "莫桑比克", "Madagascar": "马达加斯加",
    "United States": "美国", "United States of America": "美国", "Canada": "加拿大", "Mexico": "墨西哥",
    "Aztec Empire": "阿兹特克", "Maya": "玛雅", "Maya city-states": "玛雅城邦", "Teotihuacan": "特奥蒂瓦坎",
    "Inca Empire": "印加帝国", "Brazil": "巴西", "Argentina": "阿根廷", "Chile": "智利",
    "Peru": "秘鲁", "Colombia": "哥伦比亚", "Venezuela": "委内瑞拉", "Bolivia": "玻利维亚",
    "China": "中国", "Chinese warlords": "中国军阀", "Japan": "日本", "Empire of Japan": "大日本帝国",
    "Korea": "朝鲜", "Joseon": "朝鲜", "Vietnam": "越南", "Annam": "安南", "Champa": "占婆",
    "Khmer Empire": "高棉帝国", "Srivijaya": "室利佛逝", "Majapahit": "满者伯夷", "Aceh": "亚齐",
    "Thailand": "泰国", "Siam": "暹罗", "Burma": "缅甸", "Pagan": "蒲甘", "Laos": "老挝",
    "Cambodia": "柬埔寨", "Malaysia": "马来西亚", "Indonesia": "印度尼西亚", "Philippines": "菲律宾",
    "India": "印度", "Pakistan": "巴基斯坦", "Bangladesh": "孟加拉", "Afghanistan": "阿富汗",
    "Iran": "伊朗", "Iraq": "伊拉克", "Syria": "叙利亚", "Israel": "以色列", "Palestine": "巴勒斯坦",
    "Jordan": "约旦", "Lebanon": "黎巴嫩", "Saudi Arabia": "沙特阿拉伯", "Yemen": "也门",
    "Oman": "阿曼", "United Arab Emirates": "阿联酋", "Qatar": "卡塔尔", "Kuwait": "科威特",
    "Turkey": "土耳其", "Armenia": "亚美尼亚", "Georgia": "格鲁吉亚", "Azerbaijan": "阿塞拜疆",
    "Kazakhstan": "哈萨克斯坦", "Uzbekistan": "乌兹别克斯坦", "Turkmenistan": "土库曼斯坦",
    "Tajikistan": "塔吉克斯坦", "Kyrgyzstan": "吉尔吉斯斯坦", "Mongolia": "蒙古",
    "Australia": "澳大利亚", "New Zealand": "新西兰", "Papua New Guinea": "巴布亚新几内亚",
    "Antarctica": "南极洲", "Arabs": "阿拉伯人", "Timurid Emirates": "帖木儿埃米尔国",
    "Mamluke Sultanate": "马穆鲁克苏丹国", "Oirat Confederation": "瓦剌",
    "Emirate of the White Sheep Turks": "白羊王朝", "Thule": "图勒文化", "Athabaskan": "阿萨巴斯卡人",
    "T'atsaot'ine": "塔察奥特内", "Subarctic forest hunter-gatherers": "亚北极森林猎民",
    "Plain bison hunters": "平原野牛猎民", "Pampas cultures": "潘帕斯文化",
    "Indus valley civilization": "印度河流域文明", "Yamnaya culture": "颜那亚文化",
    "Afanasevo": "阿凡纳谢沃文化", "Semites": "闪米特人", "Ur": "乌尔",
    "Kimek-Kipchak khaganate": "基马克-钦察汗国", "Quazaq Khanate": "哈萨克汗国",
    "central Asian khanates": "中亚诸汗国", "Arabs": "阿拉伯人", "Hawaii": "夏威夷", "Philippines": "菲律宾",
    "Austronesians": "南岛语族", "Bantu": "班图人", "Bantu peoples": "班图人", "Khoisan": "科伊桑人",
    "Aboriginal tribes": "澳洲原住民", "Australian aboriginal hunter-gatherers": "澳洲原住民",
    "Siberians": "西伯利亚民族", "Paleo-Siberian hunter-gatherers": "古西伯利亚猎民",
    "Arctic marine mammal hunters": "北极海猎民", "Saharan pastoral nomads": "撒哈拉牧民",
    "West African cereal farmers": "西非农人", "Savanna hunter-gatherers": "草原狩猎采集者",
    "Amazon hunter-gatherers": "亚马逊狩猎采集者", "Andean hunter-gatherers": "安第斯狩猎采集者",
    "Adena Culture": "阿登纳文化", "Thule": "图勒文化", "Dorset": "多塞特文化",
    "Polynesian": "波利尼西亚人", "Polynesians": "波利尼西亚人", "Maori": "毛利人",
    "Inuit": "因纽特人", "Cree": "克里人", "Iroquois": "易洛魁", "Sioux": "苏人",
    "Navajo": "纳瓦霍", "Apache": "阿帕奇", "Maya": "玛雅", "Olmec": "奥尔梅克",
}

PALETTE = ["#b56a4a", "#7d8f6a", "#6f7f9a", "#c39a54", "#8e6b7f", "#5f8a83",
           "#a47b56", "#7a6a9a", "#9a8a56", "#b06a6a", "#657c5e", "#8a7a9a"]

def rdp(pts, eps):
    if len(pts) < 4:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        den = math.hypot(dx, dy) or 1
        imax, dmax = -1, 0
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / den
            if d > dmax:
                dmax, imax = d, i
        if dmax > eps:
            keep[imax] = True
            stack.append((a, imax)); stack.append((imax, b))
    return [p for p, k in zip(pts, keep) if k]

def ring_area(r):
    s = 0
    for i in range(len(r) - 1):
        s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    return abs(s) / 2

def simp_ring(r, eps=0.06):
    pts = []
    for x, y in r:
        p = (round(x, 2), round(y, 2))
        if not pts or p != pts[-1]:
            pts.append(p)
    closed = len(pts) > 1 and pts[0] == pts[-1]
    if closed:
        pts = pts[:-1]
    if len(pts) > 3:
        simplified = rdp(pts, eps)
        if len(simplified) >= 3:
            pts = simplified
    if len(pts) >= 3:
        pts = pts + [pts[0]]
    return [list(p) for p in pts]

def simp_geom(g):
    if g["type"] == "Polygon":
        rings = [simp_ring(r) for r in g["coordinates"]]
        return {"type": "Polygon", "coordinates": rings} if len(rings[0]) >= 4 else None
    if g["type"] == "MultiPolygon":
        polys = []
        for poly in g["coordinates"]:
            rings = [simp_ring(r) for r in poly]
            if len(rings[0]) >= 4 and ring_area(rings[0]) > 0.002:
                polys.append(rings)
        return {"type": "MultiPolygon", "coordinates": polys} if polys else None
    return None

def centroid(ring):
    a = 0; cx = 0; cy = 0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i]; x1, y1 = ring[i + 1]
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if abs(a) < 1e-9:
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        return sum(xs) / len(xs), sum(ys) / len(ys)
    a *= 0.5
    return cx / (6 * a), cy / (6 * a)

def in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

CULTURE_HINTS = ("hunter", "pastoral", "farmer", "tribe", "peoples", "culture", "nomad", "fisher",
                 "siberians", "khoisan", "bantu", "austronesian", "semites", "inuit", "cree",
                 "iroquois", "sioux", "navajo", "apache", "aboriginal", "foragers", "gatherers")

def kind_of(name):
    n = (name or "").lower()
    return "culture" if any(k in n for k in CULTURE_HINTS) else "state"

def color_for(sub):
    h = int(hashlib.md5(sub.encode("utf-8")).hexdigest()[:8], 16)
    return PALETTE[h % len(PALETTE)]

manifest = []
for key, year in SNAPSHOTS:
    path = os.path.join(SRC, f"world_{key}.geojson")
    if not os.path.exists(path):
        print("missing", path); continue
    src = json.load(open(path))
    feats = []
    subjects = {}
    for f in src["features"]:
        p = f.get("properties", {})
        name = p.get("NAME") or "?"
        sub = p.get("SUBJECTO") or name
        if name in ("?", "Antarctica") or sub in ("?", "Antarctica"):
            continue
        g = simp_geom(f["geometry"])
        if not g:
            continue
        col = color_for(sub)
        feat = {
            "type": "Feature",
            "properties": {"name": name, "sub": sub, "zh": ZH.get(sub, ""), "color": col},
            "geometry": g,
        }
        feats.append(feat)
        # aggregate for labels
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        best = max(polys, key=lambda poly: ring_area(poly[0]))
        a = ring_area(best[0])
        cx, cy = centroid(best[0])
        if not in_ring(cx, cy, best[0]):
            xs = [q[0] for q in best[0]]; ys = [q[1] for q in best[0]]
            cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        ent = subjects.setdefault(sub, {"name": sub, "zh": ZH.get(sub, ""), "area": 0, "lon": cx, "lat": cy, "color": col})
        ent["area"] += a
        if a > ent.get("_best", 0):
            ent["_best"] = a; ent["lon"] = cx; ent["lat"] = cy
    labels = []
    for ent in sorted(subjects.values(), key=lambda e: -e["area"])[:26]:
        if ent["area"] < 0.5:
            continue
        labels.append({"name": ent["name"], "zh": ent["zh"], "lon": round(ent["lon"], 2), "lat": round(ent["lat"], 2), "area": round(ent["area"], 1), "kind": kind_of(ent["name"])})
    out = {"type": "FeatureCollection", "year": year, "snapshot": key, "source": "aourednik/historical-basemaps", "features": feats, "labels": labels}
    fn = f"world_{key}.json"
    with open(os.path.join(OUT, fn), "w") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    manifest.append({"year": year, "file": fn, "features": len(feats), "labels": len(labels)})
    print(key, year, len(feats), "features,", len(labels), "labels,", round(os.path.getsize(os.path.join(OUT, fn)) / 1024), "KB")

with open(os.path.join(OUT, "manifest.json"), "w") as fh:
    json.dump({"source": "aourednik/historical-basemaps", "license": "GPL-3.0",
               "note": "Simplified for display; boundaries are schematic and not surveyed.",
               "snapshots": manifest}, fh, ensure_ascii=False, indent=1)
print("manifest", len(manifest), "snapshots")
