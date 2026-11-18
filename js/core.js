// Loading games, weather, ticket prices, and working out scores and trips. No DOM in this file.
import { AIRPORTS, AIRLINES, MLB_VENUES, AAA_VENUES, NHL_ARENAS, NBA_VENUES, NFL_VENUES, VENUE_NOTES } from './data.js?v=13';

// ───────── Dates and time zones ─────────
export const pad = n => String(n).padStart(2, '0');
export function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function addDays(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function dateInZone(ms, tz) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  return p.slice(0, 10);
}
function zoneOffsetMs(ms, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}
// The instant at which a wall clock in `tz` reads dateStr hh:mm
export function zonedTime(dateStr, minutes, tz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  return guess - zoneOffsetMs(guess - zoneOffsetMs(guess, tz), tz);
}
export function clock(ms, tz, withZone) {
  return new Date(ms).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', ...(withZone ? { timeZoneName: 'short' } : {}) });
}
const hourKey = ms => new Date(ms).toISOString().slice(0, 13) + ':00';

async function getJSON(url, ms = 12000, tries = 2) {
  for (let n = 1; ; n++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { final: res.status >= 400 && res.status < 500 && res.status !== 429 });
      return await res.json();
    } catch (e) {
      if (e.final || n >= tries) throw e;
      await new Promise(r => setTimeout(r, 1500 * n)); // busy services usually answer on the second try
    }
  }
}

// ───────── Schedules ─────────
const BASEBALL_TYPES = { S: 'Spring training', E: 'Exhibition', A: 'All-Star Game', F: 'Wild Card', D: 'Division Series', L: 'League Championship', W: 'World Series' };

// ESPN's logo for each NHL and MLB team, saved by scripts/build-logos.mjs
let logoCache = null;
const logoTable = () => (logoCache ||= getJSON('data/logos.json').then(d => d.logos || {}).catch(() => ({})));
const espnLogo = (logos, name, fallback) => logos[plain(name)] || fallback;

export async function loadBaseball(start, end, sports) {
  const ids = [sports.includes('mlb') && 1, sports.includes('aaa') && 11].filter(Boolean);
  if (!ids.length) return [];
  const [data, logos] = await Promise.all([
    getJSON(`https://statsapi.mlb.com/api/v1/schedule?sportId=${ids.join(',')}&startDate=${start}&endDate=${end}&hydrate=team,venue(location,timezone),probablePitcher`),
    logoTable()
  ]);
  const out = [];
  for (const day of data.dates || []) for (const g of day.games || []) {
    const home = g.teams.home.team, away = g.teams.away.team;
    const sport = home.sport?.id === 11 ? 'aaa' : 'mlb';
    const v = g.venue || {}, loc = v.location || {}, c = loc.defaultCoordinates || {};
    const info = (sport === 'aaa' ? AAA_VENUES : MLB_VENUES)[v.id] || MLB_VENUES[v.id] || null;
    const pitchers = [g.teams.away.probablePitcher?.fullName, g.teams.home.probablePitcher?.fullName];
    out.push({
      id: `b${g.gamePk}`, sport, date: g.officialDate || day.date, tbd: !!g.status?.startTimeTBD,
      // No start time yet: assume a 7 PM local start so the weather and trip estimates have something to work from
      start: g.status?.startTimeTBD ? zonedTime(g.officialDate || day.date, 19 * 60, v.timeZone?.id || 'America/New_York') : new Date(g.gameDate).getTime(), status: g.status?.detailedState || '', label: BASEBALL_TYPES[g.gameType] || '',
      away: { name: away.name, short: away.teamName || away.name, logo: sport === 'mlb' ? espnLogo(logos, away.name, `https://www.mlbstatic.com/team-logos/${away.id}.svg`) : `https://www.mlbstatic.com/team-logos/${away.id}.svg` },
      home: { name: home.name, short: home.teamName || home.name, logo: sport === 'mlb' ? espnLogo(logos, home.name, `https://www.mlbstatic.com/team-logos/${home.id}.svg`) : `https://www.mlbstatic.com/team-logos/${home.id}.svg` },
      venue: v.name || 'Venue to be announced', venueKey: `v${v.id}`,
      city: info?.city || loc.city || '', tz: v.timeZone?.id || 'America/New_York',
      lat: c.latitude, lon: c.longitude,
      info, indoor: false, roof: info?.roof || '', hours: 3,
      note: pitchers[0] && pitchers[1] ? `Probable starters: ${pitchers[0]} and ${pitchers[1]}` : '',
      affiliate: sport === 'aaa' ? (home.parentOrgName || '') : ''
    });
  }
  return out;
}

let nhlCache = null;
export async function loadHockey(start, end) {
  nhlCache ||= await getJSON('data/nhl.json');
  const logos = await logoTable();
  const out = [];
  for (const g of nhlCache.games) {
    const ms = new Date(g.start).getTime();
    const arena = NHL_ARENAS[g.home];
    const atHome = arena && !g.neutral;
    const tz = atHome ? arena.tz : (g.tz || 'America/New_York');
    const date = dateInZone(ms, tz);
    if (date < start || date > end) continue;
    const t = c => ({ name: nhlCache.teams[c]?.name || c, short: nhlCache.teams[c]?.short || c, logo: espnLogo(logos, nhlCache.teams[c]?.name, nhlCache.teams[c]?.logo || '') });
    out.push({
      id: `h${g.id}`, sport: 'nhl', start: ms, date, tbd: false,
      status: g.state === 'OK' ? '' : ({ PPD: 'Postponed', CNCL: 'Cancelled', SUSP: 'Suspended', TBD: 'Time to be announced' }[g.state] || g.state),
      label: g.type === 3 ? 'Playoffs' : (g.neutral ? 'Neutral site' : ''),
      away: t(g.away), home: t(g.home),
      venue: g.venue || arena?.name || '', venueKey: atHome ? `n${g.home}` : `nx${g.venue}`,
      city: atHome ? arena.city : '', tz, lat: atHome ? arena.lat : undefined, lon: atHome ? arena.lon : undefined,
      info: atHome ? arena : null, indoor: true, roof: '', hours: 2.6, note: '', affiliate: '', teamLink: g.tickets
    });
  }
  return out;
}
export const nhlUpdated = () => nhlCache?.updated || null;

export async function nextBaseballDate(after, sports) {
  const ids = [sports.includes('mlb') && 1, sports.includes('aaa') && 11].filter(Boolean);
  // One sport per request: the service caps multi-sport requests at 45 days
  const found = await Promise.all(ids.map(async id => {
    const data = await getJSON(`https://statsapi.mlb.com/api/v1/schedule?sportId=${id}&startDate=${addDays(after, 1)}&endDate=${addDays(after, 240)}`);
    return (data.dates || []).find(x => x.games?.length)?.date || null;
  }));
  return found.filter(Boolean).sort()[0] || null;
}
export function nextHockeyDate(after) {
  if (!nhlCache) return null;
  const g = nhlCache.games.find(x => x.start.slice(0, 10) > after);
  return g ? dateInZone(new Date(g.start).getTime(), NHL_ARENAS[g.home]?.tz || 'America/New_York') : null;
}

// ───────── Team sports from ESPN: NBA, NFL, WNBA, MLS, NWSL and college ─────────
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const ESPN_PATH = {
  nba: 'basketball/nba', nfl: 'football/nfl', wnba: 'basketball/wnba', mls: 'soccer/usa.1', nwsl: 'soccer/usa.nwsl',
  cfb: 'football/college-football', fcs: 'football/college-football', mbb: 'basketball/mens-college-basketball',
  wbb: 'basketball/womens-college-basketball', mhk: 'hockey/mens-college-hockey', cbase: 'baseball/college-baseball'
};
// groups=80 is the top football division (FBS), 81 the second (FCS), 50 Division I basketball
const ESPN_EXTRA = { cfb: '&groups=80&limit=300', fcs: '&groups=81&limit=300', mbb: '&groups=50&limit=500', wbb: '&groups=50&limit=500', mhk: '&limit=200', cbase: '&limit=500' };
const GAME_HOURS = { nba: 2.5, nfl: 3.25, wnba: 2.25, mls: 2, nwsl: 2, cfb: 3.5, fcs: 3.25, mbb: 2.25, wbb: 2.25, mhk: 2.6, cbase: 3.25 };
// When the start time is unknown, plan around an early start: arriving early beats missing kickoff
const ASSUMED_START = { nba: 19 * 60, nfl: 12 * 60, wnba: 18 * 60, mls: 18 * 60, nwsl: 18 * 60, cfb: 12 * 60, fcs: 12 * 60, mbb: 17 * 60, wbb: 17 * 60, mhk: 18 * 60, cbase: 13 * 60 };
const INDOOR = new Set(['nba', 'wnba', 'mbb', 'wbb', 'mhk']);
export const COLLEGE = new Set(['cfb', 'fcs', 'mbb', 'wbb', 'mhk', 'cbase']);

// Each college team's conference, per sport, saved by scripts/build-venues.mjs
let confCache = null;
const conferenceTable = () => (confCache ||= getJSON('data/conferences.json').then(d => d.conferences || {}).catch(() => ({})));
const ET = 'America/New_York';
// ESPN sometimes sends a placeholder date (seen: January 1993). It still files each game under the right
// day, so a date more than a day away from the day we asked for is treated as unknown.
function espnStart(e, asked) {
  const at = new Date(e.date).getTime();
  const day = Number.isFinite(at) ? dateInZone(at, ET) : '';
  const ok = day >= addDays(asked, -1) && day <= addDays(asked, 1);
  return ok ? { at, lost: false } : { at: zonedTime(asked, 12 * 60, ET), lost: true };
}
export const ESPN_SPORTS = Object.keys(ESPN_PATH);

// ESPN's "Tickets as low as $13" line, with the Vivid Seats link it points to
function espnPrice(tk) {
  const m = tk?.summary?.match(/\$\s?([\d,]+(?:\.\d+)?)/);
  const url = tk?.links?.[0]?.href || null;
  const vivid = /vividseats/i.test(url || '') ? url : null;
  return m ? { price: Math.round(parseFloat(m[1].replace(/,/g, ''))), priceSrc: vivid ? 'Vivid Seats' : 'ESPN', vividUrl: vivid } : { price: null, priceSrc: null, vividUrl: vivid };
}

// Where each venue is and its nearest airports, saved by scripts/build-venues.mjs
let venueDb = null;
async function venueTable() {
  if (!venueDb) {
    venueDb = await getJSON('data/venues.json');
    for (const [code, a] of Object.entries(venueDb.airports || {})) AIRPORTS[code] ||= a;
  }
  return venueDb;
}

// Venues without hand-written notes: the nearest airports and a drive estimate
const driveMin = mi => Math.max(15, Math.round((15 + mi * 1.4) / 5) * 5);
function driveInfo(near, city) {
  const routes = near.filter(([c]) => AIRPORTS[c]).map(([c, mi]) => ({
    a: c, mins: driveMin(mi),
    how: `No transit notes for this venue yet. It is about ${mi} miles from ${AIRPORTS[c][0]}, so plan on a rideshare or a rental car${mi > 25 ? ' and allow extra time for game-day traffic' : ''}.`
  }));
  if (!routes.length) return null;
  return { city, drive: true, level: near[0][1] <= 12 ? 2 : 1, routes };
}

// A venue missing from the saved table (a new stadium, a neutral-site or overseas game) is looked up by city
let airportRows = null;
const geoCache = new Map();
const US_STATES = { AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'District of Columbia', FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming' };
async function geocode(place) {
  const state = US_STATES[place.state] || (Object.values(US_STATES).includes(place.state) ? place.state : '');
  const us = !!state && (!place.country || place.country === 'USA');
  const d = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place.city)}&count=10&language=en${us ? '&countryCode=US' : ''}`, 10000);
  const hits = d.results || [];
  const hit = (us && hits.find(h => h.admin1 === state)) || (!us && hits[0]) || null;
  return hit ? { lat: hit.latitude, lon: hit.longitude, tz: hit.timezone } : null;
}
async function locateUnknown(list) {
  const todo = list.filter(g => g.lat == null && g.place?.city);
  if (!todo.length) return;
  for (const g of todo) {
    const key = `${g.place.city}|${g.place.state}|${g.place.country}`;
    if (!geoCache.has(key)) geoCache.set(key, geocode(g.place).catch(() => null));
  }
  await Promise.all(todo.map(g => geoCache.get(`${g.place.city}|${g.place.state}|${g.place.country}`)));
  for (const g of todo) {
    const loc = await geoCache.get(`${g.place.city}|${g.place.state}|${g.place.country}`);
    if (!loc) continue;
    g.lat = loc.lat; g.lon = loc.lon; g.tz = loc.tz || g.tz;
    if (!g.info) {
      airportRows ||= await getJSON('data/airports.json?v=13').then(d => d.list.map(a => [a[0], a[1], a[4], a[5], d.zones[a[6]]])).catch(() => []);
      const near = airportRows.map(a => [a, miles(loc.lat, loc.lon, a[2], a[3])]).sort((x, y) => x[1] - y[1]).slice(0, 2);
      for (const [a] of near) AIRPORTS[a[0]] ||= [a[1], a[2], a[3], a[4]];
      g.info = driveInfo(near.map(([a, mi]) => [a[0], Math.round(mi)]), g.city);
    }
  }
}

export async function loadEspn(sport, start, end) {
  const [db, confs] = await Promise.all([venueTable(), conferenceTable()]);
  const conf = confs[sport] || {};
  const college = COLLEGE.has(sport);
  const days = [];
  for (let d = addDays(start, -1); d <= end; d = addDays(d, 1)) days.push(d); // the day before catches late games west of Eastern time
  const pages = await Promise.all(days.map(d =>
    getJSON(`${ESPN}/${ESPN_PATH[sport]}/scoreboard?dates=${d.replaceAll('-', '')}${ESPN_EXTRA[sport] || ''}`, 15000)));
  const notesFor = sport === 'nba' ? NBA_VENUES : sport === 'nfl' ? NFL_VENUES : {};
  const out = [], seen = new Set();
  for (const [pi, page] of pages.entries()) for (const e of page.events || []) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const c = e.competitions?.[0];
    const home = c?.competitors?.find(t => t.homeAway === 'home'), away = c?.competitors?.find(t => t.homeAway === 'away');
    if (!home || !away) continue;
    let v = c.venue || {}, addr = v.address || {};
    let known = db.venues?.[String(v.id)];
    let campus = false;
    const campusId = db.schools?.[plain(home.team.location || home.team.displayName)];
    if (!v.id && college && campusId) {
      // ESPN gives no venue for most college baseball games; the field is on the home school's campus
      known = db.venues[campusId];
      if (known) { campus = true; const [cty, st] = known[4].split('|'); addr = { city: cty, state: st }; }
    }
    // Transit notes: the home team's (NBA, NFL), the notes of the pro team that plays at this venue
    // (a WNBA or MLS game in an NBA arena or NFL stadium), notes for this venue, or the nearest airports
    const hint = known?.[6] ? known[6].split(':') : null;
    const notes = notesFor[home.team.abbreviation] && !c.neutralSite ? notesFor[home.team.abbreviation]
      : hint ? (hint[0] === 'nba' ? NBA_VENUES : NFL_VENUES)[hint[1]] : null;
    const shared = notes?.share ? NHL_ARENAS[notes.share] : null;
    // ESPN sometimes puts the stadium's name in the city field
    const city = shared?.city || (addr.city && addr.city !== v.fullName ? addr.city : '');
    let info = null;
    if (shared) info = shared;
    else if (notes) info = { city, level: notes.level, routes: notes.routes };
    else if (VENUE_NOTES[v.id]?.share) info = NHL_ARENAS[VENUE_NOTES[v.id].share];
    else if (VENUE_NOTES[v.id]) info = { city, ...VENUE_NOTES[v.id] };
    else if (known) info = driveInfo(known[3], city);

    const team = t => {
      const rank = t.curatedRank?.current;
      return {
        name: t.team.displayName || t.team.name || t.team.abbreviation,
        short: (rank && rank <= 25 ? `#${rank} ` : '') + ((college && t.team.location) || t.team.shortDisplayName || t.team.name || t.team.abbreviation),
        logo: t.team.logo || '', record: t.records?.[0]?.summary || ''
      };
    };
    const A = team(away), H = team(home);
    const confA = conf[away.team.id], confH = conf[home.team.id];
    const st = e.status?.type || {};
    const headline = (c.notes?.[0]?.headline || '').replace(/\s+presented by.*$/i, '').trim();
    const post = e.season?.type === 3;
    const tk = c.tickets?.[0];
    out.push({
      id: `e${e.id}`, sport, ...(when => ({ rawStart: when.at, timeLost: when.lost, tbd: c.timeValid === false || when.lost }))(espnStart(e, days[pi])),
      status: st.name === 'STATUS_SCHEDULED' ? '' : (st.description || ''),
      label: headline.length && headline.length <= 34 ? headline : post ? (sport === 'cfb' ? 'Bowl game' : college ? 'Postseason' : 'Playoffs') : (c.neutralSite ? 'Neutral site' : ''),
      college, confs: [confA, confH].filter(Boolean), confGame: confA && confA === confH && confA !== 'Independent' ? confA : '',
      away: A, home: H,
      venue: campus ? `${home.team.location || H.short} campus` : (shared?.name || v.fullName || 'Venue to be announced').replace(/\s*\([^)]*\)$/, ''),
      venueKey: campus ? `s${home.team.id}` : `e${v.id || e.id}`, city,
      tz: shared?.tz || known?.[2] || 'America/New_York',
      lat: shared ? shared.lat : known?.[0], lon: shared ? shared.lon : known?.[1],
      place: { city: addr.city || '', state: addr.state || '', country: addr.country || '' },
      info, indoor: INDOOR.has(sport) || v.indoor === true, roof: '', hours: GAME_HOURS[sport],
      note: [A.record && H.record ? `Records: ${A.short} ${A.record}, ${H.short} ${H.record}.` : '',
        campus ? "ESPN doesn't say which field this game is on, so the location shown is the home school's campus." : ''].filter(Boolean).join(' '),
      affiliate: '', teamLink: null,
      ...espnPrice(tk)
    });
  }
  await locateUnknown(out);
  // Local date and start, now that every venue we could place has a time zone
  for (const g of out) {
    if (g.tbd) { g.date = dateInZone(g.rawStart, ET); g.start = zonedTime(g.date, ASSUMED_START[sport], g.tz); }
    else { g.start = g.rawStart; g.date = dateInZone(g.start, g.tz); }
  }
  return out.filter(g => g.date >= start && g.date <= end);
}

// Prices for NHL and MLB games: their schedules come from the leagues, so match each game to ESPN's
// listing of it (same home team, closest start time) and take ESPN's "tickets from" price.
const ESPN_PRICE_PATH = { nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const plain = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const nickname = s => plain((s || '').trim().split(/\s+/).pop());
export async function attachEspnPrices(list, start, end) {
  const sports = Object.keys(ESPN_PRICE_PATH).filter(sp => list.some(g => g.sport === sp && g.price == null));
  await Promise.all(sports.map(async sp => {
    const days = [];
    for (let d = addDays(start, -1); d <= end; d = addDays(d, 1)) days.push(d);
    const pages = await Promise.all(days.map(d =>
      getJSON(`${ESPN}/${ESPN_PRICE_PATH[sp]}/scoreboard?dates=${d.replaceAll('-', '')}`, 15000).catch(() => ({}))));
    const events = pages.flatMap((p, i) => (p.events || []).map(e => {
      const c = e.competitions?.[0];
      const when = espnStart(e, days[i]);
      // Games without a set start time (ESPN marks them, and lists them at midnight) are matched by day
      return { ...when, dayOnly: when.lost || c?.timeValid === false, day: days[i], home: c?.competitors?.find(t => t.homeAway === 'home')?.team?.displayName || '', tk: c?.tickets?.[0] };
    })).filter(e => e.tk);
    for (const g of list) {
      if (g.sport !== sp || g.price != null) continue;
      let best = null;
      for (const e of events) {
        // With a usable time, the closest start within 4 hours; without one, the same day
        const gap = e.dayOnly || g.tbd ? (dateInZone(g.start, ET) === e.day ? 0 : Infinity) : Math.abs(e.at - g.start);
        if (gap > 4 * 3600000) continue;
        const same = plain(e.home) === plain(g.home.name) ? 0 : nickname(e.home) === nickname(g.home.name) ? 1 : -1;
        if (same < 0) continue;
        if (!best || same < best.same || (same === best.same && gap < best.gap)) best = { e, same, gap };
      }
      if (best) Object.assign(g, espnPrice(best.e.tk));
    }
  }));
}

// ───────── Golf, tennis and racing, saved by scripts/build-events.mjs ─────────
let eventDb = null;
async function eventTable() {
  if (!eventDb) {
    eventDb = await getJSON('data/events.json');
    for (const [code, a] of Object.entries(eventDb.airports || {})) AIRPORTS[code] ||= a;
  }
  return eventDb;
}
// Golf and tennis run all day; the land-by time aims to get you there for the morning
const EVENT_START = { golf: 10 * 60, tennis: 11 * 60, racing: 13 * 60 };
const EVENT_HOURS = { golf: 8, tennis: 8, racing: 3 };
export async function loadTournaments(sport, start, end) {
  const db = await eventTable();
  const out = [];
  for (const e of db.events) {
    if (e.k !== sport) continue;
    const tz = e.tz || ET;
    const first = dateInZone(new Date(e.s).getTime(), tz), last = dateInZone(new Date(e.e || e.s).getTime(), tz);
    if (last < start || first > end) continue;
    const day = first < start ? start : first;         // the first day of play inside the dates shown
    const days = [];
    for (let d = first; d <= last && days.length < 21; d = addDays(d, 1)) days.push(d);
    const timed = sport === 'racing' && e.tv;
    const begin = timed ? new Date(e.s).getTime() : zonedTime(day, EVENT_START[sport], tz);
    out.push({
      id: `t${e.k}${e.id}`, sport, start: begin, date: timed ? dateInZone(begin, tz) : day, tbd: false, allDay: !timed,
      multiDay: days.length > 1, days, first, last, dayIndex: days.indexOf(day) + 1,
      status: '', label: e.t, title: e.n, major: !!e.m,
      away: null, home: null,
      venue: e.v || (e.city ? `${e.city}${e.region ? ', ' + e.region : ''}` : 'Location not listed'),
      venueKey: `t${e.v || e.city || e.n}`, city: e.v ? e.city : '', tz,
      lat: e.lat, lon: e.lon, info: e.ap ? driveInfo(e.ap, e.city) : null,
      indoor: false, roof: '', hours: EVENT_HOURS[sport], note: '', affiliate: '', teamLink: null, price: null
    });
  }
  return out;
}
export async function nextEventDate(sport, after) {
  const db = await eventTable();
  const e = db.events.find(x => x.k === sport && dateInZone(new Date(x.s).getTime(), x.tz || ET) > after);
  return e ? dateInZone(new Date(e.s).getTime(), e.tz || ET) : null;
}

// The first day after `after` with games, from ESPN's season calendar
export async function nextEspnDate(sport, after) {
  const d = await getJSON(`${ESPN}/${ESPN_PATH[sport]}/scoreboard${ESPN_EXTRA[sport] ? '?' + ESPN_EXTRA[sport].slice(1) : ''}`, 15000);
  const L = d.leagues?.[0];
  if (!L) return null;
  if (L.calendarType === 'day') {
    return (L.calendar || []).map(x => String(x).slice(0, 10)).find(x => x > after) || null;
  }
  for (const section of L.calendar || []) {
    if (/off ?season/i.test(section.label || '')) continue;
    for (const wk of section.entries || []) {
      if ((wk.endDate || '').slice(0, 10) <= after) continue;
      const w = await getJSON(`${ESPN}/${ESPN_PATH[sport]}/scoreboard?dates=${L.season?.year}&seasontype=${section.value}&week=${wk.value}${ESPN_EXTRA[sport] || ''}`, 15000);
      const day = (w.events || []).map(e => dateInZone(new Date(e.date).getTime(), 'America/New_York')).filter(x => x > after).sort()[0];
      if (day) return day;
    }
  }
  return null;
}

// ───────── Weather ─────────
export const OFFSETS = [-2, -1, 0, 1, 2, 3, 4, 5];
const hourMs = (g, off) => Math.floor(g.start / 3600000) * 3600000 + off * 3600000;

function venueGroups(list) {
  const by = new Map();
  for (const g of list) {
    if (g.lat == null || g.lon == null) continue;
    const k = g.lat.toFixed(2) + ',' + g.lon.toFixed(2);
    if (!by.has(k)) by.set(k, { lat: g.lat, lon: g.lon, games: [] });
    by.get(k).games.push(g);
  }
  return [...by.values()];
}

// Ask for many venues in small batches, so one dropped connection only costs a few venues
async function hourlyFor(base, venues, params) {
  const out = new Array(venues.length).fill(null), size = 14, jobs = [];
  for (let i = 0; i < venues.length; i += size) {
    const part = venues.slice(i, i + size);
    const q = `latitude=${part.map(v => v.lat.toFixed(3)).join(',')}&longitude=${part.map(v => v.lon.toFixed(3)).join(',')}`;
    jobs.push(getJSON(`${base}?${q}&${params}`, 20000, 3)
      .then(d => (Array.isArray(d) ? d : [d]).forEach((x, k) => { out[i + k] = x.hourly || null; }))
      .catch(e => console.warn('Weather batch failed', e)));
  }
  await Promise.all(jobs);
  return out;
}

export async function attachWeather(all, start, end) {
  // Indoor games skip the forecast: it saves most of the weather service's limited requests on busy days
  const list = all.filter(g => !g.indoor);
  const venues = venueGroups(list);
  if (!venues.length) return;
  const units = 'temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=GMT';
  let anyFailed = false;
  const today = new Date().toISOString().slice(0, 10);
  const needA = addDays(start, -1), needB = addDays(end, 2);
  const fA = needA < addDays(today, -2) ? addDays(today, -2) : needA;
  const fB = needB > addDays(today, 15) ? addDays(today, 15) : needB;

  if (fA <= fB) {
    {
      const arr = await hourlyFor('https://api.open-meteo.com/v1/forecast', venues,
        `hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day&start_date=${fA}&end_date=${fB}&${units}`);
      if (arr.some(x => !x)) anyFailed = true;
      venues.forEach((v, i) => {
        const h = arr[i]; if (!h) return;
        const idx = new Map(h.time.map((t, k) => [t, k]));
        for (const g of v.games) {
          const hrs = OFFSETS.map(off => {
            const k = idx.get(hourKey(hourMs(g, off)));
            if (k == null || h.temperature_2m[k] == null) return null;
            return {
              off, t: Math.round(h.temperature_2m[k]), feels: h.apparent_temperature[k] ?? h.temperature_2m[k],
              pop: Math.round(h.precipitation_probability[k] ?? 0), wind: Math.round(h.wind_speed_10m[k] ?? 0),
              code: h.weather_code[k], day: h.is_day?.[k] !== 0
            };
          });
          if (hrs[2]) { g.wxHours = hrs; g.wxSrc = 'forecast'; }
          if (g.multiDay) {
            // high, low, feels-like and rain for 10 AM to 6 PM on each day of play
            g.daily = g.days.map(d => {
              const hs = [];
              for (let m = 10 * 60; m <= 18 * 60; m += 60) { const k = idx.get(hourKey(zonedTime(d, m, g.tz))); if (k != null && h.temperature_2m[k] != null) hs.push(k); }
              if (!hs.length) return { date: d };
              const t = hs.map(k => h.temperature_2m[k]), f = hs.map(k => h.apparent_temperature[k] ?? h.temperature_2m[k]);
              const mid = hs[Math.floor(hs.length / 2)];
              return { date: d, hi: Math.round(Math.max(...t)), lo: Math.round(Math.min(...t)), feels: Math.round(f.reduce((a, b) => a + b, 0) / f.length),
                pop: Math.max(...hs.map(k => h.precipitation_probability[k] ?? 0)), code: Math.max(...hs.map(k => h.weather_code[k] ?? 0)), t: Math.round(Math.min(...t)) };
            });
          }
        }
      });
    }
  }

  // Past the forecast horizon: what is typical for that week, from the last three years
  // Typical weather only for dates past the forecast, never as a stand-in when the forecast fails
  const today0 = new Date().toISOString().slice(0, 10);
  const beyond = g => g.date > addDays(today0, 15) || g.date < addDays(today0, -2);
  const blank = venues.filter(v => v.games.some(g => !g.wxHours && beyond(g)));
  if (!blank.length) { if (anyFailed) throw new Error('some weather missing'); return; }
  const lastFull = new Date().getUTCFullYear() - 1;
  const years = []; for (let y = Math.min(+start.slice(0, 4) - 1, lastFull); years.length < 3; y--) years.push(y);
  const shift = (s, y) => y + s.slice(4);
  const packs = await Promise.all(years.map(y =>
    hourlyFor('https://archive-api.open-meteo.com/v1/archive', blank,
      `hourly=temperature_2m,apparent_temperature,precipitation,snowfall,wind_speed_10m&start_date=${addDays(shift(start, y), -4)}&end_date=${addDays(shift(end, y), 5)}&${units}`)
      .then(arr => arr.map(h => {
        const m = new Map();
        h?.time.forEach((t, k) => { if (h.temperature_2m[k] != null) m.set(t, [h.temperature_2m[k], h.precipitation[k] || 0, h.wind_speed_10m[k] || 0, h.apparent_temperature?.[k] ?? h.temperature_2m[k], h.snowfall?.[k] || 0]); });
        return m;
      }))));
  blank.forEach((v, i) => {
    for (const g of v.games) {
      if (g.wxHours || !beyond(g)) continue;
      const hrs = OFFSETS.map(off => {
        const d = new Date(hourMs(g, off));
        let n = 0, st = 0, sw = 0, sf = 0, wet = 0, snowy = 0;
        years.forEach((y, yi) => {
          const m = packs[yi]?.[i]; if (!m) return;
          for (let k = -3; k <= 3; k++) {
            const s = m.get(new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate() + k, d.getUTCHours())).toISOString().slice(0, 13) + ':00');
            if (!s) continue;
            n++; st += s[0]; sw += s[2]; sf += s[3]; if (s[1] >= 0.25) { wet++; if (s[4] > 0) snowy++; }
          }
        });
        if (!n) return null;
        return { off, t: Math.round(st / n), feels: sf / n, pop: Math.round(100 * wet / n / 5) * 5, wind: Math.round(sw / n), code: null, day: true, snowShare: wet ? snowy / wet : null };
      });
      if (hrs[2]) { g.wxHours = hrs; g.wxSrc = 'typical'; }
    }
  });
  if (list.some(g => g.lat != null && !g.wxHours)) throw new Error('Some weather did not load');
}

// What the weather is, from the forecast's weather code
const WMO = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
  85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorms', 96: 'Thunderstorms with hail', 99: 'Thunderstorms with hail' };
export const conditionText = h => (h?.code == null ? null : WMO[h.code] || null);
// What would fall: snow, ice (freezing rain or drizzle), storms or rain. Without a weather code (typical weather)
// it goes by how often it snowed in past years, or by temperature.
export function precipKind(h) {
  const c = h?.code;
  if (c != null) {
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if ([56, 57, 66, 67].includes(c)) return 'ice';
    if (c >= 95) return 'storm';
    if (c >= 51) return 'rain';
  }
  if (h?.snowShare != null) return h.snowShare >= 0.5 ? 'snow' : 'rain';
  return (h?.t ?? 50) <= 32 ? 'snow' : 'rain';
}
export const KIND_WORD = { snow: 'snow', ice: 'freezing rain', storm: 'storms', rain: 'rain' };

export function skyOf(h, indoor) {
  if (!h) return indoor ? 'indoor' : 'none';
  const c = h.code;
  if (c == null) return h.pop >= 50 ? (precipKind(h) === 'snow' ? 'snow' : 'rain') : h.pop >= 25 ? 'partly' : 'clear';
  if (c >= 95) return 'storm';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 51) return 'rain';
  if (c === 3 || c === 45 || c === 48) return 'cloud';
  if (c === 2) return 'partly';
  return h.day === false ? 'night' : 'clear';
}

// ───────── Scores ─────────
export const TRANSIT_SCORE = { 4: 100, 3: 80, 2: 52, 1: 18, 0: 35 };

export function scoreWeather(g) {
  g.wx = null;
  const covered = g.indoor || !!g.roof;
  if (g.wxHours) {
    const span = Math.ceil(g.hours);
    const win = g.wxHours.filter(h => h && h.off >= 0 && h.off <= span);
    if (win.length) {
      const feels = win.reduce((s, h) => s + h.feels, 0) / win.length;
      const pop = Math.max(...win.map(h => h.pop)), wind = Math.max(...win.map(h => h.wind));
      const storm = win.some(h => h.code != null && h.code >= 95);
      let s = 100;
      if (feels < 65) s -= (65 - feels) * 2.2;
      if (feels > 82) s -= (feels - 82) * 2.6;
      s -= pop * 0.6; if (storm) s -= 15;
      if (wind > 15) s -= (wind - 15) * 1.5;
      const outdoor = Math.max(0, Math.min(100, Math.round(s)));
      // Under a roof the weather only matters on the way there, so it counts for much less
      const val = g.indoor ? Math.round(72 + outdoor * 0.18) : g.roof ? Math.max(outdoor, 85) : outdoor;
      const wettest = win.reduce((a, h) => (h.pop > a.pop ? h : a), win[0]);
      g.wx = { cond: conditionText(g.wxHours[2]), kind: precipKind(wettest), t0: g.wxHours[2].t, val, outdoor, feels0: Math.round(g.wxHours[2].feels), feels: Math.round(feels), pop, wind, storm, sky: skyOf(g.wxHours[2], g.indoor) };
    }
  }
  if (!g.wx && covered) g.wx = { val: g.indoor ? 80 : 85, bare: true, sky: 'indoor' };
  g.wxScore = g.wx ? g.wx.val : 45;
}

export function weatherGrade(g) {
  if (!g.wx) return { n: 0, word: 'No forecast yet' };
  if (g.indoor) return { n: 3, word: 'Indoors' };
  if (g.wx.bare) return { n: 3, word: 'Covered' };
  const v = g.wx.val;
  return v >= 80 ? { n: 4, word: 'Ideal' } : v >= 62 ? { n: 3, word: 'Good' } : v >= 42 ? { n: 2, word: 'Iffy' } : { n: 1, word: 'Rough' };
}

// ───────── Trips: rough flight timing from the home airport ─────────
const R = 3958.8, rad = x => x * Math.PI / 180;
export function miles(aLat, aLon, bLat, bLon) {
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const ALL_HUBS = new Set(Object.values(AIRLINES).flatMap(x => x[1]));
function nonstopLikely(home, dest, airline) {
  const hubs = AIRLINES[airline]?.[1];
  if (hubs) return hubs.includes(home) || hubs.includes(dest);
  return ALL_HUBS.has(home) || ALL_HUBS.has(dest);
}
function flightMin(home, dest) {
  const A = AIRPORTS[home], B = AIRPORTS[dest];
  const d = miles(A[1], A[2], B[1], B[2]);
  const wind = B[2] < A[2] ? 1.06 : 0.96; // westbound flights run longer
  return { dist: d, mins: Math.max(50, Math.round((d / 470 * 60 + 38) * wind)) };
}
const STOP_MIN = 135;        // added by a connection: layover plus the detour
export const DEPLANE = 25;   // gate to curb
const EXIT = 15, CHECKIN = 45;

// The latest you can land at an airport and still be in your seat with time to spare.
// Built only from the game time and the transit notes, so it needs no flight data.
export const landBy = (g, route, prefs) => g.start - (DEPLANE + route.mins + (prefs.cushion ?? 45)) * 60000;

// kinds: local, day (out and back the same day), same (arrive the day of the game), before (go the day before), none
export function planTrip(g, prefs) {
  g.trip = null;
  const home = AIRPORTS[prefs.home];
  if (!home || !g.info?.routes?.length) return;
  const opts = [];
  for (const route of g.info.routes) {
    const dest = AIRPORTS[route.a]; if (!dest) continue;
    if (route.a === prefs.home || miles(home[1], home[2], dest[1], dest[2]) < 60) {
      opts.push({ kind: 'local', airport: route.a, rank: 5, arriveBy: landBy(g, route, prefs) });
      continue;
    }
    const out = flightMin(prefs.home, route.a), back = flightMin(route.a, prefs.home);
    const direct = nonstopLikely(prefs.home, route.a, prefs.airline);
    const earliest = zonedTime(g.date, prefs.earliest, home[3]);
    const latestHome = zonedTime(g.date, prefs.latest, dest[3]);
    const arriveBy = landBy(g, route, prefs);
    const leaveBy = stop => arriveBy - (out.mins + (stop ? STOP_MIN : 0)) * 60000;
    const freeAt = g.start + (g.hours * 60 + EXIT + route.mins + CHECKIN) * 60000;
    const ways = [];
    if (direct) ways.push(false);
    if (prefs.stops) ways.push(true);
    let best = null;
    for (const stop of ways) {
      const lb = leaveBy(stop);
      const arrive = lb >= earliest;
      const lastDep = latestHome - (stop ? 120 : 0) * 60000; // a connection home has to start earlier
      const ret = arrive && freeAt <= lastDep;
      const kind = ret ? 'day' : arrive ? 'same' : 'before';
      const o = {
        kind, stop, airport: route.a, direct, leaveBy: lb, freeAt, flight: out.mins + (stop ? STOP_MIN : 0),
        backFlight: back.mins + (stop ? STOP_MIN : 0), dist: Math.round(out.dist),
        rank: ({ day: 4, same: 3, before: 1 })[kind] + (stop ? 0 : 0.5)
      };
      if (!best || o.rank > best.rank) best = o;
    }
    if (!best) best = { kind: 'none', airport: route.a, direct, rank: 0, dist: Math.round(out.dist) };
    best.nonstopBy = direct ? leaveBy(false) : null;
    best.stopBy = prefs.stops ? leaveBy(true) : null;
    best.earliest = earliest; best.latestHome = latestHome; best.outMin = out.mins; best.arriveBy = arriveBy; best.freeAt = freeAt;
    opts.push(best);
  }
  opts.sort((x, y) => y.rank - x.rank);
  g.trip = opts[0] || null;
}
export const TRIP_SCORE = { local: 100, day: 100, same: 72, before: 35, none: 20 };
export const TRIP_LABEL = { local: 'Home game', day: 'Day trip', same: 'Fly in that day', before: 'Go the day before', none: 'Needs a connection' };

export function scoreGame(g, prefs) {
  scoreWeather(g);
  g.level = g.info?.level || 0;
  g.transitScore = TRANSIT_SCORE[g.level];
  g.arrivals = (g.info?.routes || []).filter(r => AIRPORTS[r.a]).map(r => ({ a: r.a, mins: r.mins, by: landBy(g, r, prefs) }));
  planTrip(g, prefs);
  g.tripScore = g.trip ? TRIP_SCORE[g.trip.kind] : null;
  g.best = g.tripScore == null
    ? Math.round(g.wxScore * 0.6 + g.transitScore * 0.4)
    : Math.round(g.wxScore * 0.5 + g.transitScore * 0.28 + g.tripScore * 0.22);
}

// ───────── Two games, one trip ─────────
export function findPairs(list) {
  const pairs = [];
  const ok = list.filter(g => g.lat != null && !g.tbd && !g.title && !/postponed|cancel|final|completed/i.test(g.status));
  for (let i = 0; i < ok.length; i++) for (let j = 0; j < ok.length; j++) {
    const a = ok[i], b = ok[j];
    if (i === j || a.start >= b.start) continue;
    const gap = (b.start - (a.start + a.hours * 3600000)) / 3600000;
    if (gap < 1.25 || b.start - a.start > 30 * 3600000) continue;
    const d = miles(a.lat, a.lon, b.lat, b.lon);
    if (d > 45) continue;
    if (a.venueKey === b.venueKey && a.sport === b.sport && a.date !== b.date) continue; // same team two nights running is a series, not a find
    const sameDay = a.date === b.date;
    if (sameDay && gap < 1.25 + d / 20) continue;
    pairs.push({ a, b, sameDay, dist: d, score: Math.round((a.best + b.best) / 2) + (sameDay ? 6 : 0) + (a.sport !== b.sport ? 3 : 0) });
  }
  pairs.sort((x, y) => y.score - x.score);
  // One suggestion per pair of venues, and each game in at most one suggestion
  const venuesUsed = new Set(), gamesUsed = new Set(), out = [];
  for (const p of pairs) {
    const k = [p.a.venueKey, p.b.venueKey].sort().join('|');
    if (venuesUsed.has(k) || gamesUsed.has(p.a.id) || gamesUsed.has(p.b.id)) continue;
    venuesUsed.add(k); gamesUsed.add(p.a.id); gamesUsed.add(p.b.id);
    out.push(p);
    if (out.length >= 8) break;
  }
  return out;
}

// ───────── Ticket prices (SeatGeek) ─────────
const SG_TYPE = { mlb: 'mlb', aaa: 'minor_league_baseball', nhl: 'nhl', nba: 'nba', nfl: 'nfl', cfb: 'ncaa_football', fcs: 'ncaa_football',
  wnba: 'wnba', mls: 'mls', nwsl: 'nwsl', mbb: 'ncaa_basketball', wbb: 'ncaa_womens_basketball', mhk: 'ncaa_hockey', cbase: 'ncaa_baseball',
  golf: 'golf', tennis: 'tennis', racing: 'auto_racing' };
export async function attachPrices(list, start, end, clientId) {
  for (const g of list) g.sgUrl = null;
  if (!clientId) return { ok: false, reason: 'nokey' };
  const sports = [...new Set(list.map(g => g.sport))];
  let matched = 0, failed = null;
  await Promise.all(sports.map(async sport => {
    try {
      const events = [];
      for (let page = 1; page <= 4; page++) {
        const d = await getJSON(`https://api.seatgeek.com/2/events?client_id=${encodeURIComponent(clientId)}&taxonomies.name=${SG_TYPE[sport]}`
          + `&datetime_utc.gte=${addDays(start, -1)}&datetime_utc.lte=${addDays(end, 2)}&per_page=250&page=${page}`, 15000);
        events.push(...(d.events || []));
        if (!d.events || d.events.length < 250) break;
      }
      for (const g of list) {
        if (g.sport !== sport || g.lat == null) continue;
        let best = null, bestGap = 5 * 3600000;
        for (const e of events) {
          const loc = e.venue?.location; if (!loc) continue;
          if (Math.abs(loc.lat - g.lat) > 0.04 || Math.abs(loc.lon - g.lon) > 0.04) continue;
          const gap = Math.abs(new Date(e.datetime_utc + 'Z').getTime() - g.start);
          if (gap < bestGap) { best = e; bestGap = gap; }
        }
        if (best) {
          g.sgUrl = best.url || null;
          const p = best.stats?.lowest_price;
          if (p != null) {
            matched++;
            if (g.price == null || p < g.price) { g.price = Math.round(p); g.priceSrc = 'SeatGeek'; }
          }
        }
      }
    } catch (e) { failed = e.message; }
  }));
  return failed && !matched ? { ok: false, reason: failed } : { ok: true, matched };
}

export function ticketLinks(g) {
  const when = new Date(g.start).toLocaleDateString('en-US', { timeZone: g.tz, year: 'numeric', month: 'short', day: 'numeric' });
  const what = g.title || `${g.away.name} at ${g.home.name}`;
  return {
    vivid: g.vividUrl || null,
    seatgeek: g.sgUrl || `https://seatgeek.com/search?q=${encodeURIComponent(what)}`,
    stubhub: `https://www.stubhub.com/find/s/?q=${encodeURIComponent(`${what} ${when}`)}`,
    team: g.teamLink || null
  };
}
