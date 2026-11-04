#!/usr/bin/env python3
"""Add Spanish, French and Arabic country names (and missing ISO codes) to world.geo.json.
Source for translations: world-countries (npm), passed as a JSON file.
Usage: python3 scripts/enrich-world-i18n.py /path/to/countries.json
"""
import json, os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=sys.argv[1] if len(sys.argv)>1 else "/tmp/world-countries.json"
w=json.load(open(os.path.join(ROOT,"data","world.geo.json")))
wc=json.load(open(SRC))
by={}
for c in wc:
    for k in [c.get('cca3'),c.get('cca2'),c['name']['common']]+c.get('altSpellings',[]):
        if k: by[str(k).lower()]=c
ALIAS={"people's republic of china":"China","united states of america":"United States","russian federation":"Russia","republic of the congo":"Republic of the Congo","democratic republic of the congo":"DR Congo","vatican city":"Vatican City","north macedonia":"North Macedonia","timor-leste":"Timor-Leste","cabo verde":"Cape Verde","côte d'ivoire":"Ivory Coast","falkland islands":"Falkland Islands","saint helena":"Saint Helena","sint maarten":"Sint Maarten","the bahamas":"Bahamas","the gambia":"Gambia","macao":"Macau","northern cyprus":"Northern Cyprus","somaliland":"Somaliland","kosovo":"Kosovo","western sahara":"Western Sahara","french southern territories":"French Southern and Antarctic Lands"}
for f in w['features']:
    p=f['properties']; c=by.get((p.get('iso3') or '').lower()) or by.get((p.get('iso2') or '').lower()) or by.get(p['n'].lower()) or by.get(ALIAS.get(p['n'].lower(),'').lower())
    if c:
        tr=c.get('translations',{})
        p['es']=(tr.get('spa') or {}).get('common') or c['name']['common']
        p['fr']=(tr.get('fra') or {}).get('common') or c['name']['common']
        p['ar']=(tr.get('ara') or {}).get('common') or c['name']['common']
        if p.get('iso2') in (None,'-99') and c.get('cca2'): p['iso2']=c['cca2']
        if p.get('iso3') in (None,'-99') and c.get('cca3'): p['iso3']=c['cca3']
    else:
        p.setdefault('es',p['n']); p.setdefault('fr',p['n']); p.setdefault('ar',p['n'])
json.dump(w,open(os.path.join(ROOT,"data","world.geo.json"),"w"),ensure_ascii=False,separators=(',',':'))
print('enriched',len(w['features']),'features')
