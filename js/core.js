// Loading games, weather, ticket prices, and working out scores and trips. No DOM in this file.
import { AIRPORTS, AIRLINES, MLB_VENUES, AAA_VENUES, NHL_ARENAS } from './data.js?v=4';

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

export async function loadBaseball(start, end, sports) {
  const ids = [sports.includes('mlb') && 1, sports.includes('aaa') && 11].filter(Boolean);
  if (!ids.length) return [];
  const data = await getJSON(`https://statsapi.mlb.com/api/v1/schedule?sportId=${ids.join(',')}&startDate=${start}&endDate=${end}&hydrate=team,venue(location,timezone),probablePitcher`);
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
      away: { name: away.name, short: away.teamName || away.name, logo: `https://www.mlbstatic.com/team-logos/${away.id}.svg` },
      home: { name: home.name, short: home.teamName || home.name, logo: `https://www.mlbstatic.com/team-logos/${home.id}.svg` },
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
  const out = [];
  for (const g of nhlCache.games) {
    const ms = new Date(g.start).getTime();
    const arena = NHL_ARENAS[g.home];
    const atHome = arena && !g.neutral;
    const tz = atHome ? arena.tz : (g.tz || 'America/New_York');
    const date = dateInZone(ms, tz);
    if (date < start || date > end) continue;
    const t = c => ({ name: nhlCache.teams[c]?.name || c, short: nhlCache.teams[c]?.short || c, logo: nhlCache.teams[c]?.logo || '' });
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

export async function attachWeather(list, start, end) {
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
        }
      });
    }
  }

  // Past the forecast horizon: what is typical for that week, from the last three years
  const blank = venues.filter(v => v.games.some(g => !g.wxHours));
  if (!blank.length) { if (anyFailed) throw new Error('some weather missing'); return; }
  const lastFull = new Date().getUTCFullYear() - 1;
  const years = []; for (let y = Math.min(+start.slice(0, 4) - 1, lastFull); years.length < 3; y--) years.push(y);
  const shift = (s, y) => y + s.slice(4);
  const packs = await Promise.all(years.map(y =>
    hourlyFor('https://archive-api.open-meteo.com/v1/archive', blank,
      `hourly=temperature_2m,precipitation,wind_speed_10m&start_date=${addDays(shift(start, y), -4)}&end_date=${addDays(shift(end, y), 5)}&${units}`)
      .then(arr => arr.map(h => {
        const m = new Map();
        h?.time.forEach((t, k) => { if (h.temperature_2m[k] != null) m.set(t, [h.temperature_2m[k], h.precipitation[k] || 0, h.wind_speed_10m[k] || 0]); });
        return m;
      }))));
  blank.forEach((v, i) => {
    for (const g of v.games) {
      if (g.wxHours) continue;
      const hrs = OFFSETS.map(off => {
        const d = new Date(hourMs(g, off));
        let n = 0, st = 0, sw = 0, wet = 0;
        years.forEach((y, yi) => {
          const m = packs[yi]?.[i]; if (!m) return;
          for (let k = -3; k <= 3; k++) {
            const s = m.get(new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate() + k, d.getUTCHours())).toISOString().slice(0, 13) + ':00');
            if (!s) continue;
            n++; st += s[0]; sw += s[2]; if (s[1] >= 0.25) wet++;
          }
        });
        if (!n) return null;
        return { off, t: Math.round(st / n), feels: st / n, pop: Math.round(100 * wet / n / 5) * 5, wind: Math.round(sw / n), code: null, day: true };
      });
      if (hrs[2]) { g.wxHours = hrs; g.wxSrc = 'typical'; }
    }
  });
}

export function skyOf(h, indoor) {
  if (!h) return indoor ? 'indoor' : 'none';
  const c = h.code;
  if (c == null) return h.pop >= 50 ? 'rain' : h.pop >= 25 ? 'partly' : 'clear';
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
      g.wx = { val, outdoor, t0: g.wxHours[2].t, feels: Math.round(feels), pop, wind, storm, sky: skyOf(g.wxHours[2], g.indoor) };
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
const DEPLANE = 25, BUFFER = 30, EXIT = 15, CHECKIN = 45;

// kinds: local, day (out and back the same day), same (arrive the day of the game), before (go the day before), none
export function planTrip(g, prefs) {
  g.trip = null;
  const home = AIRPORTS[prefs.home];
  if (!home || !g.info?.routes?.length) return;
  const opts = [];
  for (const route of g.info.routes) {
    const dest = AIRPORTS[route.a]; if (!dest) continue;
    if (route.a === prefs.home || miles(home[1], home[2], dest[1], dest[2]) < 60) {
      opts.push({ kind: 'local', airport: route.a, rank: 5 });
      continue;
    }
    const out = flightMin(prefs.home, route.a), back = flightMin(route.a, prefs.home);
    const direct = nonstopLikely(prefs.home, route.a, prefs.airline);
    const earliest = zonedTime(g.date, prefs.earliest, home[3]);
    const latestHome = zonedTime(g.date, prefs.latest, dest[3]);
    const ground = (DEPLANE + route.mins + BUFFER) * 60000;
    const leaveBy = stop => g.start - ground - (out.mins + (stop ? STOP_MIN : 0)) * 60000;
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
    best.earliest = earliest; best.latestHome = latestHome; best.outMin = out.mins;
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
  planTrip(g, prefs);
  g.tripScore = g.trip ? TRIP_SCORE[g.trip.kind] : null;
  g.best = g.tripScore == null
    ? Math.round(g.wxScore * 0.6 + g.transitScore * 0.4)
    : Math.round(g.wxScore * 0.5 + g.transitScore * 0.28 + g.tripScore * 0.22);
}

// ───────── Two games, one trip ─────────
export function findPairs(list) {
  const pairs = [];
  const ok = list.filter(g => g.lat != null && !g.tbd && !/postponed|cancel|final|completed/i.test(g.status));
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
const SG_TYPE = { mlb: 'mlb', aaa: 'minor_league_baseball', nhl: 'nhl' };
export async function attachPrices(list, start, end, clientId) {
  for (const g of list) { g.price = null; g.priceUrl = null; }
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
          g.priceUrl = best.url || null;
          const p = best.stats?.lowest_price;
          if (p != null) { g.price = Math.round(p); matched++; }
        }
      }
    } catch (e) { failed = e.message; }
  }));
  return failed && !matched ? { ok: false, reason: failed } : { ok: true, matched };
}

export function ticketLinks(g) {
  const when = new Date(g.start).toLocaleDateString('en-US', { timeZone: g.tz, year: 'numeric', month: 'short', day: 'numeric' });
  return {
    seatgeek: g.priceUrl || `https://seatgeek.com/search?q=${encodeURIComponent(`${g.away.name} at ${g.home.name}`)}`,
    stubhub: `https://www.stubhub.com/find/s/?q=${encodeURIComponent(`${g.away.name} at ${g.home.name} ${when}`)}`,
    team: g.teamLink || null
  };
}
