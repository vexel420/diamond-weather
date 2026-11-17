// Builds data/venues.json: where each NBA, NFL and college football (FBS) venue is, and its nearest airports.
// ESPN's schedule names a venue's city but not its coordinates, so each city is looked up once with
// Open-Meteo's geocoder. Run by hand (`node scripts/build-venues.mjs`) or by the weekly GitHub Action.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const here = p => new URL(p, import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries = 3) {
  for (let n = 1; ; n++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { if (n >= tries) throw e; await sleep(800 * n); }
  }
}
const STATES = { AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'District of Columbia', FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming' };
const PROVINCES = { ON:'Ontario', QC:'Quebec', BC:'British Columbia', AB:'Alberta', MB:'Manitoba' };
// Busy airports with many flights: offered as a second option when the nearest airport is small
const HUBS = new Set(('ATL BOS BWI CLT DCA DEN DFW DAL DTW EWR FLL HOU IAD IAH JFK LAS LAX LGA MCO MDW MIA MSP ORD PDX PHL PHX SAN SEA SFO SLC STL BNA AUS OAK SMF '
  + 'MSY SAT MCI CLE PIT IND CMH CVG RDU MKE TPA MEM SDF JAX ABQ OMA TUL BUF SJC BUR ONT SNA RSW PBI RIC ORF YYZ YUL YVR YYC LHR LGW MAD BCN FRA MUC BER CDG DUB MEX GRU SYD').split(' '));

// 1) Collect venues from the schedules
const venues = new Map();
function take(data) {
  for (const e of data.events || []) {
    const c = e.competitions?.[0], v = c?.venue;
    if (!v?.id || !v.address?.city) continue;
    venues.set(String(v.id), { name: v.fullName || '', city: v.address.city, state: v.address.state || '', country: v.address.country || '' });
  }
}
const year = new Date().getUTCMonth() < 6 ? new Date().getUTCFullYear() - 1 : new Date().getUTCFullYear();
for (let w = 1; w <= 18; w++) take(await getJSON(`${ESPN}/football/nfl/scoreboard?dates=${year}&seasontype=2&week=${w}`).catch(() => ({})));
for (let w = 1; w <= 16; w++) take(await getJSON(`${ESPN}/football/college-football/scoreboard?dates=${year}&seasontype=2&week=${w}&groups=80&limit=300`).catch(() => ({})));
for (let w = 1; w <= 5; w++) take(await getJSON(`${ESPN}/football/nfl/scoreboard?dates=${year}&seasontype=3&week=${w}`).catch(() => ({})));
take(await getJSON(`${ESPN}/football/college-football/scoreboard?dates=${year}&seasontype=3&week=1&groups=80&limit=300`).catch(() => ({})));
for (let d = 0; d < 24; d++) {
  const day = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10).replaceAll('-', '');
  take(await getJSON(`${ESPN}/basketball/nba/scoreboard?dates=${day}`).catch(() => ({})));
}
console.log(`${venues.size} venues found`);

// 2) Keep what we already located, look up the rest by city
const outPath = here('../data/venues.json');
const old = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { venues: {} };
const cityCache = new Map();
async function locate(v) {
  const key = `${v.city}|${v.state}`;
  if (cityCache.has(key)) return cityCache.get(key);
  const region = STATES[v.state] || PROVINCES[v.state];
  const cc = STATES[v.state] ? 'US' : PROVINCES[v.state] ? 'CA' : '';
  const d = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(v.city)}&count=10&language=en${cc ? `&countryCode=${cc}` : ''}`).catch(() => ({}));
  const hits = d.results || [];
  const hit = (region && hits.find(r => r.admin1 === region)) || (!region && hits[0]) || null;
  const loc = hit ? { lat: +hit.latitude.toFixed(3), lon: +hit.longitude.toFixed(3), tz: hit.timezone } : null;
  cityCache.set(key, loc);
  await sleep(120);
  return loc;
}

// 3) Nearest airports
const ap = JSON.parse(readFileSync(here('../data/airports.json'), 'utf8'));
const rad = x => x * Math.PI / 180;
const miles = (aLat, aLon, bLat, bLon) => {
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
};
function nearby(lat, lon) {
  const near = ap.list.filter(a => Math.abs(a[4] - lat) < 4 && Math.abs(a[5] - lon) < 5)
    .map(a => ({ a, mi: miles(lat, lon, a[4], a[5]) })).sort((x, y) => x.mi - y.mi);
  const picks = near.slice(0, 1);
  const hub = near.find(x => HUBS.has(x.a[0]) && x.mi <= 170);
  if (hub && hub !== picks[0]) picks.push(hub);
  return picks;
}

const out = { updated: new Date().toISOString(), airports: {}, venues: {} };
let missed = 0;
for (const [id, v] of venues) {
  const prev = old.venues?.[id];
  const loc = prev && prev[4] === `${v.city}|${v.state}` ? { lat: prev[0], lon: prev[1], tz: prev[2] } : await locate(v);
  if (!loc) { missed++; console.warn('Could not locate', v.name, v.city, v.state); continue; }
  const picks = nearby(loc.lat, loc.lon);
  for (const { a } of picks) out.airports[a[0]] = [a[1], a[4], a[5], ap.zones[a[6]]];
  out.venues[id] = [loc.lat, loc.lon, loc.tz, picks.map(p => [p.a[0], Math.round(p.mi)]), `${v.city}|${v.state}`];
}
writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${Object.keys(out.venues).length} venues, ${Object.keys(out.airports).length} airports; ${missed} not located`);
