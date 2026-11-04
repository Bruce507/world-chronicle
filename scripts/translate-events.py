#!/usr/bin/env python3
"""Machine-assisted translation of event titles/descriptions into es/fr/ar.
Uses the public Google Translate gtx endpoint, caches every batch, and merges
tx/dx into data/events.json. Translations are editable afterwards.
"""
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVENTS = os.path.join(ROOT, "data", "events.json")
CACHE = os.path.join(ROOT, "data", "translations_cache.json")
LANGS = ["es", "fr", "ar"]
BATCH = 10

def slug(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    s = s.lower().replace("'", "").replace("’", "")
    out = []
    for ch in s:
        if ch.isalnum(): out.append(ch)
        elif not out or out[-1] != "-": out.append("-")
    return "".join(out).strip("-")[:64] or "event"

def translate_batch(pairs, lang):
    # pairs: list of (slug, title, desc)
    lines = []
    for i, (sl, t, d) in enumerate(pairs, 1):
        lines.append(f"[E{i}] {t}")
        lines.append(d.replace("\n", " "))
    text = "\n".join(lines)
    url = ("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
           lang + "&dt=t&q=" + urllib.parse.quote(text))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = json.load(r)
    out = "".join(seg[0] for seg in data[0] if seg and seg[0])
    parts = re.split(r"\[E(\d+)\]", out)
    res = {}
    for i in range(1, len(parts) - 1, 2):
        try: idx = int(parts[i])
        except ValueError: continue
        chunk = parts[i + 1].strip()
        if not chunk: continue
        lines2 = chunk.split("\n", 1)
        title = lines2[0].strip()
        desc = lines2[1].strip() if len(lines2) > 1 else ""
        if idx - 1 < len(pairs):
            res[pairs[idx - 1][0]] = {"t": title, "d": desc}
    return res

def translate_one(t, d, lang):
    text = t + "\n" + d.replace("\n", " ")
    url = ("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
           lang + "&dt=t&q=" + urllib.parse.quote(text))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = json.load(r)
    out = "".join(seg[0] for seg in data[0] if seg and seg[0])
    lines = out.split("\n", 1)
    return {"t": lines[0].strip(), "d": lines[1].strip() if len(lines) > 1 else d}

def main():
    events = json.load(open(EVENTS))
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    for lang in LANGS:
        cache.setdefault(lang, {})
        todo = []
        for e in events:
            sl = slug(e["t"][1])
            if sl in cache[lang]: continue
            if e.get("tx", {}).get(lang) and e.get("dx", {}).get(lang): continue
            todo.append((sl, e["t"][1], e["d"][1]))
        print(lang, "todo", len(todo), flush=True)
        for start in range(0, len(todo), BATCH):
            batch = todo[start:start + BATCH]
            got = {}
            try:
                got = translate_batch(batch, lang)
            except Exception as e:
                print(lang, "batch error", start, e, flush=True)
            for (sl, t, d) in batch:
                if sl in got and got[sl].get("t"):
                    cache[lang][sl] = got[sl]
                else:
                    try:
                        cache[lang][sl] = translate_one(t, d, lang)
                        time.sleep(0.15)
                    except Exception as e:
                        print(lang, "single error", sl, e, flush=True)
            json.dump(cache, open(CACHE, "w"), ensure_ascii=False)
            print(lang, min(start + BATCH, len(todo)), "/", len(todo), flush=True)
            time.sleep(0.25)
    # merge into events
    for e in events:
        sl = slug(e["t"][1])
        tx = e.get("tx") or {}
        dx = e.get("dx") or {}
        for lang in LANGS:
            c = cache.get(lang, {}).get(sl)
            if c:
                if not tx.get(lang): tx[lang] = c.get("t", "")
                if not dx.get(lang): dx[lang] = c.get("d", "")
        if tx: e["tx"] = tx
        if dx: e["dx"] = dx
    json.dump(events, open(EVENTS, "w"), ensure_ascii=False, indent=2)
    open(EVENTS, "a").write("\n")
    print("merged translations into", len(events), "events")

if __name__ == "__main__":
    main()
