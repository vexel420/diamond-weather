// Builds data/venues.json (where each venue is and its nearest airports) and data/conferences.json
// (each college team's conference, per sport) for every sport loaded from ESPN.
// ESPN's schedule names a venue's city but not its coordinates, so each city is looked up once with
// Open-Meteo's geocoder. Run by hand (`node scripts/build-venues.mjs`) or by the weekly GitHub Action.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const CORE = 'https://sports.core.api.espn.com/v2/sports';
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

// key: [ESPN path, extra query]. Keys match the site's sport keys.
const SPORTS = {
  nba: ['basketball/nba', ''], nfl: ['football/nfl', ''], wnba: ['basketball/wnba', ''],
  mls: ['soccer/usa.1', ''], nwsl: ['soccer/usa.nwsl', ''],
  cfb: ['football/college-football', '&groups=80'], fcs: ['football/college-football', '&groups=81'],
  mbb: ['basketball/mens-college-basketball', '&groups=50'], wbb: ['basketball/womens-college-basketball', '&groups=50'],
  mhk: ['hockey/mens-college-hockey', ''], cbase: ['baseball/college-baseball', '']
};
const COLLEGE = ['cfb', 'fcs', 'mbb', 'wbb', 'mhk', 'cbase'];

const STATES = { AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'District of Columbia', FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming', PR:'Puerto Rico' };
const PROVINCES = { ON:'Ontario', QC:'Quebec', PQ:'Quebec', BC:'British Columbia', AB:'Alberta', MB:'Manitoba', NS:'Nova Scotia', SK:'Saskatchewan' };
// City fields that are not towns the geocoder knows: what to look up instead
const CITY_FIX = { 'Toyota Stadium': ['Frisco', 'TX'], 'Niagara University': ['Lewiston', 'NY'], 'Riverdale|NY': ['Bronx', 'NY'],
  'Evanston|': ['Evanston', 'IL'], 'Saint-Denis|': ['Saint-Denis', '', 'France'], 'Quebec City': ['Québec', 'QC'] };
const CA_PROVINCE_CODES = new Set(['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU']);
// Busy airports with many flights: offered as a second option when the nearest airport is small
const HUBS = new Set(('ATL BOS BWI CLT DCA DEN DFW DAL DTW EWR FLL HOU IAD IAH JFK LAS LAX LGA MCO MDW MIA MSP ORD PDX PHL PHX SAN SEA SFO SLC STL BNA AUS OAK SMF '
  + 'MSY SAT MCI CLE PIT IND CMH CVG RDU MKE TPA MEM SDF JAX ABQ OMA TUL BUF SJC BUR ONT SNA RSW PBI RIC ORF YYZ YUL YVR YYC LHR LGW MAD BCN FRA MUC BER CDG DUB MEX GRU SYD').split(' '));

// Short, familiar conference names
const CONF_SHORT = {
  'Southeastern Conference': 'SEC', 'Atlantic Coast Conference': 'ACC', 'Big Ten Conference': 'Big Ten', 'Big 12 Conference': 'Big 12',
  'Big East Conference': 'Big East', 'Pac-12 Conference': 'Pac-12', 'Mountain West Conference': 'Mountain West',
  'American Conference': 'American', 'American Athletic Conference': 'American', 'Atlantic 10 Conference': 'A-10',
  'West Coast Conference': 'WCC', 'Mid-American Conference': 'MAC', 'Conference USA': 'C-USA', 'Sun Belt Conference': 'Sun Belt',
  'Missouri Valley Conference': 'Missouri Valley', 'Missouri Valley Football Conference': 'Missouri Valley',
  'Coastal Athletic Association': 'CAA', 'Colonial Athletic Association': 'CAA', 'CAA Football': 'CAA',
  'Southern Conference': 'SoCon', 'Southland Conference': 'Southland', 'Ivy League': 'Ivy', 'Patriot League': 'Patriot',
  'Big Sky Conference': 'Big Sky', 'Big West Conference': 'Big West', 'Western Athletic Conference': 'WAC',
  'Horizon League': 'Horizon', 'Ohio Valley Conference': 'OVC', 'Mid-Eastern Athletic Conference': 'MEAC',
  'Southwestern Athletic Conference': 'SWAC', 'Northeast Conference': 'NEC', 'America East Conference': 'America East',
  'Atlantic Sun Conference': 'ASUN', 'Big South Conference': 'Big South', 'Big South-OVC Football Association': 'Big South-OVC',
  'Summit League': 'Summit', 'United Athletic Conference': 'UAC', 'Pioneer Football League': 'Pioneer',
  'National Collegiate Hockey Conference': 'NCHC', 'Hockey East': 'Hockey East', 'ECAC Hockey': 'ECAC',
  'Central Collegiate Hockey Association': 'CCHA', 'Atlantic Hockey America': 'Atlantic Hockey',
  'FBS Independents': 'Independent', 'FCS Independents': 'Independent', 'Independent': 'Independent'
};
const confShort = name => CONF_SHORT[name] || name.replace(/^The /, '').replace(/ (Conference|Athletic Conference|League)$/, '');
// The same conference can come back under slightly different names in different sports
const CONF_SAME = {"Big 10": "Big Ten", "East Coast": "ECAC", "Metro": "MAAC", "Metro Atlantic": "MAAC", "Northeast 10": "NE-10"};

// 1) Collect venues from every sport's schedule, month by month
const venues = new Map();
const homeGames = {};          // "nba:BOS": { venue id: home games there }
// College baseball numbers its teams differently from other sports, so schools are matched by name
const plainName = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const schoolGames = {};        // school name: { venue id: home games there }
function take(data, sport) {
  for (const e of data.events || []) {
    const c = e.competitions?.[0], v = c?.venue;
    if (!v?.id || !v.address?.city) continue;
    const home = c.competitors?.find(t => t.homeAway === 'home');
    if (COLLEGE.includes(sport) && home && !c.neutralSite) {
      const byVenue = (schoolGames[plainName(home.team.location || home.team.displayName)] ||= {});
      byVenue[v.id] = (byVenue[v.id] || 0) + 1;
    }
    // which pro team calls this venue home, so other leagues playing there can reuse its transit notes
    if ((sport === 'nba' || sport === 'nfl') && !c.neutralSite && home) {
      const team = `${sport}:${home.team.abbreviation}`;
      (homeGames[team] ||= {})[v.id] = (homeGames[team][v.id] || 0) + 1;
    }
    venues.set(String(v.id), { name: v.fullName || '', city: v.address.city, state: v.address.state || '', country: v.address.country || '', hint: '' });
  }
}
const months = [];
for (let k = -10; k <= 8; k++) {
  const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + k, 1));
  months.push([d.getUTCFullYear(), d.getUTCMonth() + 1]);
}
for (const [sport, [path, extra]] of Object.entries(SPORTS)) {
  const before = venues.size;
  for (const [y, m] of months) {
    const ym = `${y}${String(m).padStart(2, '0')}`;
    const data = await getJSON(`${ESPN}/${path}/scoreboard?dates=${ym}${extra}&limit=1000`).catch(() => ({}));
    if ((data.events || []).length >= 1000) {
      // the reply is capped at 1000 games, so busy months go day by day
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d = 1; d <= days; d++) take(await getJSON(`${ESPN}/${path}/scoreboard?dates=${ym}${String(d).padStart(2, '0')}${extra}&limit=1000`).catch(() => ({})), sport);
    } else take(data, sport);
  }
  console.log(`${sport}: ${venues.size - before} new venues`);
}
console.log(`${venues.size} venues found`);
for (const [team, byVenue] of Object.entries(homeGames)) {
  const main = Object.entries(byVenue).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (main && venues.has(String(main))) venues.get(String(main)).hint = team;
}

// 2) Conferences for college teams, per sport (a school can be in different conferences in different sports),
// from ESPN's lists of conferences and their members. Seasons are named by the year they end in for some sports.
const conferences = {};
const lastId = ref => String(ref).split('?')[0].split('/').pop();
for (const sport of COLLEGE) {
  const [type, league] = SPORTS[sport][0].split('/');
  const map = {};
  for (const season of [new Date().getUTCFullYear() + 1, new Date().getUTCFullYear()]) {
    const base = `${CORE}/${type}/leagues/${league}/seasons/${season}/types/2/groups`;
    const top = await getJSON(`${base}?lang=en&limit=200`).catch(() => null);
    if (!top?.items?.length) continue;
    const visit = async (id, depth) => {
      if (depth > 3) return;
      const g = await getJSON(`${base}/${id}?lang=en`).catch(() => null);
      if (!g) return;
      if (/division i(i|ii)\b|ii\/iii/i.test(g.name || '')) return;   // Division I only
      if (g.isConference) {
        const teams = await getJSON(`${base}/${id}/teams?lang=en&limit=500`).catch(() => ({}));
        const raw = CONF_SHORT[g.name] || g.shortName || confShort(g.name || '');
        const name = CONF_SAME[raw] || raw;
        for (const t of teams.items || []) map[lastId(t.$ref)] ||= name;
        return;
      }
      const kids = await getJSON(`${base}/${id}/children?lang=en&limit=200`).catch(() => ({}));
      for (const k of kids.items || []) await visit(lastId(k.$ref), depth + 1);
    };
    for (const item of top.items) await visit(lastId(item.$ref), 0);
    if (Object.keys(map).length) break;
  }
  conferences[sport] = map;
  console.log(`${sport}: ${Object.keys(map).length} teams with a conference`);
}

// 3) Keep what we already located, look up the rest by city
const outPath = here('../data/venues.json');
const old = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { venues: {} };
const cityCache = new Map();
async function locate(v0) {
  const fix = CITY_FIX[v0.city] || CITY_FIX[`${v0.city}|${v0.state}`];
  const v = fix ? { ...v0, city: fix[0], state: fix[1], country: fix[2] ?? v0.country } : v0;
  const key = `${v.city}|${v.state}|${v.country}`;
  if (cityCache.has(key)) return cityCache.get(key);
  // states come as codes ("MA") from most sports and as names ("Massachusetts") from soccer
  const region = STATES[v.state] || PROVINCES[v.state] || (Object.values(STATES).includes(v.state) || Object.values(PROVINCES).includes(v.state) ? v.state : '');
  const cc = region === 'Puerto Rico' ? 'PR' : Object.values(STATES).includes(region) ? 'US' : Object.values(PROVINCES).includes(region) ? 'CA' : '';
  const search = name => getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=50&language=en${cc ? `&countryCode=${cc}` : ''}`).catch(() => ({}));
  let d = await search(v.city);
  if (!(d.results || []).length && /^St\.? /.test(v.city)) d = await search(v.city.replace(/^St\.? /, 'Saint '));
  const hits = d.results || [];
  const country = (v.country || '').toLowerCase();
  const hit = region && cc !== 'PR' ? hits.find(r => r.admin1 === region)
    : hits.find(r => country && ((r.country || '').toLowerCase() === country || (country === 'usa' && r.country_code === 'US') || (country === 'england' && r.country_code === 'GB'))) || hits[0] || null;
  const loc = hit ? { lat: +hit.latitude.toFixed(3), lon: +hit.longitude.toFixed(3), tz: hit.timezone } : null;
  cityCache.set(key, loc);
  await sleep(120);
  return loc;
}

// 4) Nearest airports
const ap = JSON.parse(readFileSync(here('../data/airports.json'), 'utf8'));
const rad = x => x * Math.PI / 180;
const miles = (aLat, aLon, bLat, bLon) => {
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
};
function nearby(lat, lon, v) {
  // the state can be a code, a name, or the end of the city field ("Denver, Colorado")
  const region = v.state || (v.city || '').split(', ').slice(1).pop() || '';
  const inUS = !!STATES[region] || Object.values(STATES).includes(region) || /^(usa|united states)$/i.test(v.country || '');
  const inCA = !!PROVINCES[region] || Object.values(PROVINCES).includes(region) || /^canada$/i.test(v.country || '');
  const sameCountry = a => inUS ? (a[2].length === 2 && !CA_PROVINCE_CODES.has(a[2])) || ['Puerto Rico', 'Guam', 'U.S. Virgin Islands'].includes(a[2]) : inCA ? CA_PROVINCE_CODES.has(a[2]) : true;
  const near = ap.list.filter(a => Math.abs(a[4] - lat) < 4 && Math.abs(a[5] - lon) < 5 && sameCountry(a))
    .map(a => ({ a, mi: miles(lat, lon, a[4], a[5]) })).sort((x, y) => x.mi - y.mi);
  const picks = near.slice(0, 1);
  const hub = near.find(x => HUBS.has(x.a[0]) && x.mi <= 170);
  if (hub && hub !== picks[0]) picks.push(hub);
  return picks;
}

// venue id: [lat, lon, time zone, [[airport, miles]...], "city|state", name, home team hint]
const out = { updated: new Date().toISOString(), airports: {}, venues: {}, schools: {} };
let missed = 0;
for (const [id, v] of venues) {
  const prev = old.venues?.[id];
  const where = `${v.city}|${v.state}`;
  const loc = prev && prev[4] === where ? { lat: prev[0], lon: prev[1], tz: prev[2] } : await locate(v);
  if (!loc) { missed++; console.warn('Could not locate', v.name, v.city, v.state, v.country); continue; }
  const picks = nearby(loc.lat, loc.lon, v);
  if (!picks.length) { missed++; console.warn('No airport near', v.name, v.city); continue; }
  for (const { a } of picks) out.airports[a[0]] = [a[1], a[4], a[5], ap.zones[a[6]]];
  out.venues[id] = [loc.lat, loc.lon, loc.tz, picks.map(p => [p.a[0], Math.round(p.mi)]), where, v.name, v.hint];
}
// each school's campus: the venue where it plays the most home games (tournament games elsewhere don't count)
for (const [team, byVenue] of Object.entries(schoolGames)) {
  const venue = Object.entries(byVenue).filter(([id]) => out.venues[id]).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (venue) out.schools[team] = venue;
}
writeFileSync(outPath, JSON.stringify(out));
writeFileSync(here('../data/conferences.json'), JSON.stringify({ updated: out.updated, conferences }));
console.log(`Wrote ${Object.keys(out.venues).length} venues, ${Object.keys(out.schools).length} school campuses, ${Object.keys(out.airports).length} airports; ${missed} not placed`);
