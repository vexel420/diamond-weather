"""Builds data/airports.json for the home airport picker.

Usage: python3 build-airports.py <airports.json> <airport-timezones.json> <hand-list.json> <out.json> <countries.json>
  airports.json, countries.json: from the npm package airports-json (OurAirports data, public domain)
  airport-timezones.json: airports.json from the npm package airport-timezone
  hand-list.json: the AIRPORTS table from js/data.js, exported as JSON (its names and time zones win)
"""
import json, sys, collections
src, tzsrc, mine_path, out, countries_path = sys.argv[1:6]
COUNTRY = {c['code']: c['name'] for c in json.load(open(countries_path))}

# Small US airports with airline service that the source list leaves out (it only has large and medium airports).
# code: city, state, airport name, lat, lon, time zone
EXTRA = {
 'MBL':('Manistee','MI','Manistee County Blacker Airport',44.272,-86.247,'America/Detroit'),
 'CWA':('Wausau','WI','Central Wisconsin Airport',44.778,-89.667,'America/Chicago'), 'BJI':('Bemidji','MN','Bemidji Regional Airport',47.510,-94.934,'America/Chicago'),
 'DIK':('Dickinson','ND','Dickinson Theodore Roosevelt Regional Airport',46.797,-102.802,'America/Denver'), 'DVL':('Devils Lake','ND','Devils Lake Regional Airport',48.114,-98.909,'America/Chicago'),
 'CYS':('Cheyenne','WY','Cheyenne Regional Airport',41.156,-104.812,'America/Denver'), 'HDN':('Steamboat Springs','CO','Yampa Valley Airport',40.481,-107.218,'America/Denver'),
 'GUC':('Gunnison','CO','Gunnison-Crested Butte Regional Airport',38.534,-106.933,'America/Denver'), 'DRO':('Durango','CO','Durango-La Plata County Airport',37.152,-107.754,'America/Denver'),
 'TEX':('Telluride','CO','Telluride Regional Airport',37.954,-107.908,'America/Denver'), 'CEZ':('Cortez','CO','Cortez Municipal Airport',37.303,-108.628,'America/Denver'),
 'CNY':('Moab','UT','Canyonlands Regional Airport',38.755,-109.755,'America/Denver'), 'EAT':('Wenatchee','WA','Pangborn Memorial Airport',47.399,-120.207,'America/Los_Angeles'),
 'WYS':('West Yellowstone','MT','Yellowstone Airport',44.688,-111.118,'America/Denver'), 'SDY':('Sidney','MT','Sidney-Richland Airport',47.707,-104.193,'America/Denver'),
 'OLF':('Wolf Point','MT','L. M. Clayton Airport',48.094,-105.575,'America/Denver'), 'HVR':('Havre','MT','Havre City-County Airport',48.543,-109.762,'America/Denver'),
 'GDV':('Glendive','MT','Dawson Community Airport',47.139,-104.807,'America/Denver'), 'WRL':('Worland','WY','Worland Municipal Airport',43.966,-107.951,'America/Denver'),
 'CIC':('Chico','CA','Chico Regional Airport',39.795,-121.858,'America/Los_Angeles'), 'IPL':('El Centro','CA','Imperial County Airport',32.834,-115.579,'America/Los_Angeles'),
 'SOW':('Show Low','AZ','Show Low Regional Airport',34.265,-110.006,'America/Phoenix'), 'PGA':('Page','AZ','Page Municipal Airport',36.926,-111.448,'America/Phoenix'),
 'IFP':('Bullhead City','AZ','Laughlin/Bullhead International Airport',35.157,-114.560,'America/Phoenix'), 'SVC':('Silver City','NM','Grant County Airport',32.637,-108.156,'America/Denver'),
 'MWA':('Marion','IL','Veterans Airport of Southern Illinois',37.755,-89.011,'America/Chicago'), 'MCW':('Mason City','IA','Mason City Municipal Airport',43.158,-93.331,'America/Chicago'),
 'PGV':('Greenville','NC','Pitt-Greenville Airport',35.635,-77.385,'America/New_York'), 'HHH':('Hilton Head Island','SC','Hilton Head Airport',32.224,-80.697,'America/New_York'),
 'BKG':('Branson','MO','Branson Airport',36.532,-93.200,'America/Chicago'), 'HGR':('Hagerstown','MD','Hagerstown Regional Airport',39.708,-77.729,'America/New_York'),
 'OGS':('Ogdensburg','NY','Ogdensburg International Airport',44.682,-75.466,'America/New_York'), 'IMT':('Iron Mountain','MI','Ford Airport',45.818,-88.115,'America/Menominee'),
 'ESC':('Escanaba','MI','Delta County Airport',45.723,-87.094,'America/Detroit'), 'MVY':("Martha's Vineyard",'MA',"Martha's Vineyard Airport",41.393,-70.614,'America/New_York'),
 'RKD':('Rockland','ME','Knox County Regional Airport',44.060,-69.099,'America/New_York'), 'LWB':('Lewisburg','WV','Greenbrier Valley Airport',37.858,-80.399,'America/New_York'),
 'HYS':('Hays','KS','Hays Regional Airport',38.842,-99.273,'America/Chicago'), 'CDR':('Chadron','NE','Chadron Municipal Airport',42.838,-103.095,'America/Denver'),
 'AIA':('Alliance','NE','Alliance Municipal Airport',42.053,-102.804,'America/Denver'), 'PRB':('Paso Robles','CA','Paso Robles Municipal Airport',35.673,-120.627,'America/Los_Angeles'),
 'DRT':('Del Rio','TX','Del Rio International Airport',29.374,-100.927,'America/Chicago'), 'HOM':('Homer','AK','Homer Airport',59.646,-151.477,'America/Anchorage'),
 'ENA':('Kenai','AK','Kenai Municipal Airport',60.573,-151.245,'America/Anchorage'), 'PVC':('Provincetown','MA','Provincetown Municipal Airport',42.072,-70.221,'America/New_York'),
 'MSL':('Muscle Shoals','AL','Northwest Alabama Regional Airport',34.745,-87.610,'America/Chicago'), 'MCE':('Merced','CA','Merced Regional Airport',37.285,-120.514,'America/Los_Angeles'),
 'ELY':('Ely','NV','Ely Airport',39.300,-114.842,'America/Los_Angeles'), 'CLD':('Carlsbad','CA','McClellan-Palomar Airport',33.128,-117.280,'America/Los_Angeles'),
 'MMH':('Mammoth Lakes','CA','Mammoth Yosemite Airport',37.624,-118.838,'America/Los_Angeles'), 'BIH':('Bishop','CA','Eastern Sierra Regional Airport',37.373,-118.364,'America/Los_Angeles'),
 'SCK':('Stockton','CA','Stockton Metropolitan Airport',37.894,-121.238,'America/Los_Angeles'), 'OWB':('Owensboro','KY','Owensboro-Daviess County Airport',37.740,-87.167,'America/Chicago'),
 'PAH':('Paducah','KY','Barkley Regional Airport',37.061,-88.774,'America/Chicago'), 'BRL':('Burlington','IA','Southeast Iowa Regional Airport',40.783,-91.125,'America/Chicago'),
 'TVF':('Thief River Falls','MN','Thief River Falls Regional Airport',48.066,-96.185,'America/Chicago'), 'GLH':('Greenville','MS','Mid-Delta Regional Airport',33.483,-90.986,'America/Chicago'),
 'HOT':('Hot Springs','AR','Memorial Field Airport',34.478,-93.096,'America/Chicago'), 'ELD':('El Dorado','AR','South Arkansas Regional Airport',33.221,-92.813,'America/Chicago'),
 'JBR':('Jonesboro','AR','Jonesboro Municipal Airport',35.832,-90.646,'America/Chicago'), 'BKW':('Beckley','WV','Raleigh County Memorial Airport',37.787,-81.124,'America/New_York'),
 'PSM':('Portsmouth','NH','Portsmouth International Airport at Pease',43.078,-70.823,'America/New_York'), 'LCK':('Columbus Rickenbacker','OH','Rickenbacker International Airport',39.814,-82.928,'America/New_York'),
 'VRB':('Vero Beach','FL','Vero Beach Regional Airport',27.656,-80.418,'America/New_York'), 'LAL':('Lakeland','FL','Lakeland Linder International Airport',27.989,-82.019,'America/New_York'),
 'FKL':('Franklin','PA','Venango Regional Airport',41.378,-79.860,'America/New_York'), 'EWB':('New Bedford','MA','New Bedford Regional Airport',41.676,-70.957,'America/New_York')
}
allap = json.load(open(src)); mine = json.load(open(mine_path))
tzmap = {}
for t in json.load(open(tzsrc)):
    if t.get('code') and t.get('timezone'): tzmap.setdefault(t['code'], t['timezone'])
rows = {}; notz = []
for a in allap:
    code = (a.get('iata_code') or '').strip().upper()
    if len(code) != 3 or not code.isalnum(): continue
    m = mine.get(code)
    if a.get('scheduled_service') != 'yes' and not m: continue
    try: lat = float(a['latitude_deg']); lon = float(a['longitude_deg'])
    except Exception: continue
    tz = (m[3] if m else None) or tzmap.get(code)
    if not tz: notz.append(code); continue
    country = a.get('iso_country') or ''
    # US states and Canadian provinces by their two-letter code; everywhere else by country name
    region = ((a.get('iso_region') or '').split('-') + [''])[1] if country in ('US', 'CA') else COUNTRY.get(country, country)
    town = (a.get('municipality') or '').strip()
    city = (m[0] if m else town or a.get('name') or '').strip()
    big = a.get('type') == 'large_airport'
    if code in rows and rows[code]['big'] and not big: continue
    rows[code] = dict(code=code, city=city, region=region, name=(a.get('name') or '').strip(), lat=round(lat, 3), lon=round(lon, 3), tz=tz, big=big, town=town)
for code, m in mine.items():
    if code not in rows:
        print('added from hand list:', code)
        rows[code] = dict(code=code, city=m[0], region='', name=m[0], lat=m[1], lon=m[2], tz=m[3], big=False, town='')
added = 0
for code, (city, region, name, lat, lon, tz) in EXTRA.items():
    if code not in rows:
        rows[code] = dict(code=code, city=city, region=region, name=name, lat=lat, lon=lon, tz=tz, big=False, town=''); added += 1
print('added small airports:', added)
zones = sorted({r['tz'] for r in rows.values()})
zi = {z: i for i, z in enumerate(zones)}
lst = []
for r in sorted(rows.values(), key=lambda r: r['code']):
    row = [r['code'], r['city'], r['region'], r['name'], r['lat'], r['lon'], zi[r['tz']]]
    if r['town'] and r['town'].lower() not in r['city'].lower(): row.append(r['town'])
    lst.append(row)
json.dump({'source': 'OurAirports (public domain): large and medium airports with scheduled service', 'zones': zones, 'list': lst}, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(lst), 'airports', len(zones), 'zones; no time zone for', len(notz), notz[:30])
print(collections.Counter(x[2] for x in lst).most_common(6))
print(next(x for x in lst if x[0]=='DEL'), next(x for x in lst if x[0]=='IND'), next(x for x in lst if x[0]=='YYZ'))
for c in ['TYS', 'ELM', 'ITH', 'ORD', 'YQB', 'SCE', 'HNL', 'LHR', 'PHX', 'SDF']:
    x = next((x for x in lst if x[0] == c), None); print(x, zones[x[6]] if x else '')
have = {x[0] for x in lst}
print('missing rural:', [c for c in 'BFD LBE PLN CIU RHI SLK MSS OGS ART PBG IMT ESC MGW BGM SWF ACK MVY HYA BHB RKD PQI AUG LEB RUT DUJ JST AOO IPT ERI CKB LWB SHD HGR PKB'.split() if c not in have])
