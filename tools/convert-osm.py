# ממיר נתוני OpenStreetMap (פלט Overpass ב-JSON) לקובץ JS קומפקטי בקואורדינטות מקומיות (מטרים)
# x מזרחה, z דרומה. המרכז: lat0/lon0 שניתנים, או מרכז תיבת הבניינים.
# הרצה לדוגמה:
#   python tools\convert-osm.py data\raw\petah-tikva-osm.json data\city-pt.js --id pt --name "פתח תקווה"
import json, math, sys, argparse

ap = argparse.ArgumentParser()
ap.add_argument('inp')
ap.add_argument('out')
ap.add_argument('--id', default='city')
ap.add_argument('--name', default='')
ap.add_argument('--lat0', type=float)
ap.add_argument('--lon0', type=float)
a = ap.parse_args()

with open(a.inp, encoding='utf-8') as f:
    els = json.load(f)['elements']

if a.lat0 is None:
    lats, lons = [], []
    for e in els:
        if e.get('type') == 'way' and 'building' in (e.get('tags') or {}) and e.get('geometry'):
            g = e['geometry'][0]
            lats.append(g['lat']); lons.append(g['lon'])
    lats.sort(); lons.sort()
    # מרכז לפי חציון — לא מושפע מחריגים בקצוות
    a.lat0 = lats[len(lats) // 2]; a.lon0 = lons[len(lons) // 2]
kx = math.cos(math.radians(a.lat0)) * 111320.0
kz = 110540.0

def P(pt):
    return (round((pt['lon'] - a.lon0) * kx, 1), round(-(pt['lat'] - a.lat0) * kz, 1))

def num(v):
    s = ('%.1f' % v)
    return s[:-2] if s.endswith('.0') else s

def pts(geom, closed):
    g = geom
    if closed and len(g) > 1 and g[0]['lat'] == g[-1]['lat'] and g[0]['lon'] == g[-1]['lon']:
        g = g[:-1]
    out = []
    for p in g:
        x, z = P(p)
        out.append(num(x)); out.append(num(z))
    return '[' + ','.join(out) + ']'

def Q(s):
    return 'null' if not s else json.dumps(s, ensure_ascii=False)

B, R, A, POI, TR = [], [], [], [], []
minx = minz = 1e9; maxx = maxz = -1e9
for e in els:
    t = e.get('tags') or {}
    if e.get('type') == 'way' and e.get('geometry'):
        if 'building' in t:
            lv = 'null'
            try:
                lv = str(int(float(t['building:levels'].replace(',', ';').split(';')[0])))
            except Exception:
                pass
            h = 'null'
            try:
                h = num(float(''.join(c for c in t['height'] if c.isdigit() or c == '.')))
            except Exception:
                pass
            for p in e['geometry']:
                x, z = P(p)
                minx = min(minx, x); maxx = max(maxx, x); minz = min(minz, z); maxz = max(maxz, z)
            B.append('{p:%s,l:%s,h:%s,k:%s,n:%s,a:%s}' % (pts(e['geometry'], True), lv, h, Q(t.get('building')), Q(t.get('name')), Q(t.get('amenity'))))
        elif 'highway' in t:
            ln = 'null'
            try:
                ln = str(int(t['lanes'].split(';')[0]))
            except Exception:
                pass
            R.append('{p:%s,t:%s,n:%s,ne:%s,o:%d,ln:%s}' % (pts(e['geometry'], False), Q(t['highway']), Q(t.get('name')), Q(t.get('name:en')), 1 if t.get('oneway') == 'yes' else 0, ln))
        else:
            k = None
            if t.get('leisure') in ('park', 'garden', 'playground', 'pitch', 'dog_park'): k = t['leisure']
            elif t.get('landuse') in ('grass', 'recreation_ground', 'village_green', 'meadow', 'orchard', 'forest'): k = t['landuse']
            elif t.get('natural') in ('wood', 'scrub', 'grassland'): k = t['natural']
            elif t.get('amenity') == 'parking': k = 'parking'
            elif t.get('amenity'): k = 'amenity'
            elif t.get('landuse'): k = 'landuse_' + t['landuse']
            if k:
                A.append('{p:%s,k:%s,n:%s,a:%s}' % (pts(e['geometry'], True), Q(k), Q(t.get('name')), Q(t.get('amenity'))))
    elif e.get('type') == 'node' and 'lat' in e:
        x, z = P(e)
        if t.get('natural') == 'tree':
            TR.append('[%s,%s]' % (num(x), num(z)))
        else:
            k = ('shop:' + t['shop']) if t.get('shop') else ('amenity:' + str(t.get('amenity')))
            POI.append('{x:%s,z:%s,k:%s,n:%s,r:%s}' % (num(x), num(z), Q(k), Q(t.get('name')), Q(t.get('religion'))))

half = math.ceil(max(abs(minx), abs(maxx), abs(minz), abs(maxz)) + 20)
js = ('// נוצר אוטומטית מ-OpenStreetMap (© OpenStreetMap contributors, ODbL) — %s\n' % a.name +
      '// קואורדינטות במטרים: x מזרחה, z דרומה; מרכז: %.5f, %.5f\n' % (a.lat0, a.lon0) +
      'window.CITY_DATA = {\nid: %s, name: %s, half: %d,\n' % (Q(a.id), Q(a.name), half) +
      'buildings: [' + ',\n'.join(B) + '],\nroads: [' + ',\n'.join(R) + '],\nareas: [' + ',\n'.join(A) +
      '],\npois: [' + ',\n'.join(POI) + '],\ntrees: [' + ','.join(TR) + ']\n};\n')
with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
    f.write(js)
print('center %.5f,%.5f half %d m | buildings %d, roads %d, areas %d, pois %d, trees %d -> %d KB' % (
    a.lat0, a.lon0, half, len(B), len(R), len(A), len(POI), len(TR), len(js.encode('utf-8')) // 1024))
