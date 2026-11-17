import { AIRPORTS, AIRLINES, TRANSIT_LABEL } from './data.js?v=4';
import {
  todayStr, addDays, clock, pad, OFFSETS,
  loadBaseball, loadHockey, nextBaseballDate, nextHockeyDate, nhlUpdated,
  attachWeather, attachPrices, scoreGame, weatherGrade, skyOf, findPairs, ticketLinks, TRIP_LABEL
} from './core.js?v=4';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ───────── State ─────────
const DEFAULTS = {
  sports: ['mlb', 'aaa', 'nhl'], span: 3, sort: 'best',
  minTemp: 10, maxTemp: 115, maxRain: 100, coverPass: true, transit: 1, trip: 'any', maxPrice: 300, savedOnly: false,
  home: '', airline: '', stops: true, earliest: 360, latest: 1260, sgKey: ''
};
let prefs = { ...DEFAULTS };
let saved = new Set();
let anchor = todayStr();
let games = [], pairs = [], open = new Set();
let query = '', loadSeq = 0, state = 'loading', nextDate = null, priceInfo = null, errors = [];

try {
  const s = JSON.parse(localStorage.getItem('diamondWeather3') || 'null');
  if (s) { prefs = { ...DEFAULTS, ...s.prefs }; saved = new Set(s.saved || []); }
} catch { /* storage unavailable: run with defaults */ }
// A home airport outside the venue list carries its own details, saved when it was picked
if (prefs.home && !AIRPORTS[prefs.home]) {
  if (Array.isArray(prefs.homeInfo)) AIRPORTS[prefs.home] = prefs.homeInfo;
  else prefs.home = '';
}
const store = () => { try { localStorage.setItem('diamondWeather3', JSON.stringify({ prefs, saved: [...saved] })); } catch { /* ignore */ } };

// ───────── Formatting ─────────
function niceDate(s, opts) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts || { weekday: 'long', month: 'long', day: 'numeric' });
}
const shortDate = s => niceDate(s, { weekday: 'short', month: 'short', day: 'numeric' });
const dur = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)} min`;
const SPORT_NAME = { mlb: 'MLB', aaa: 'Triple-A', nhl: 'NHL' };

const ICON = {
  clear: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/>',
  night: '<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7Z"/>',
  partly: '<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.8v1.4M2.8 8.5h1.4M4.5 4.5l1 1M12.5 4.5l-1 1"/><path d="M9 19.5h8.2a3.3 3.3 0 0 0 .4-6.6 4.6 4.6 0 0 0-8.8 1.3A2.7 2.7 0 0 0 9 19.5Z"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .5-8 5.6 5.6 0 0 0-10.8 1.6A3.2 3.2 0 0 0 7 18.5Z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .5-8A5.6 5.6 0 0 0 6.7 8.6 3.2 3.2 0 0 0 7 15Z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
  storm: '<path d="M7 14.5h10a4 4 0 0 0 .5-8A5.6 5.6 0 0 0 6.7 8.1 3.2 3.2 0 0 0 7 14.5Z"/><path d="m12.5 15.5-2.2 3.3h3.2l-1.8 3"/>',
  snow: '<path d="M7 14.5h10a4 4 0 0 0 .5-8A5.6 5.6 0 0 0 6.7 8.1 3.2 3.2 0 0 0 7 14.5Z"/><path d="M8.5 18.5h.01M12 20h.01M15.5 18.5h.01M12 17h.01"/>',
  indoor: '<path d="M3.5 19.5v-7a8.5 8.5 0 0 1 17 0v7M3.5 19.5h17M9 19.5v-4.5h6v4.5"/>',
  none: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 16.5h.01"/>'
};
const TONE = { clear: '#e8a400', partly: '#e8a400', night: '#5b6bd6', rain: 'var(--rain)', storm: '#7a4fd6', snow: '#4aa3c7', cloud: 'var(--faint)', indoor: 'var(--faint)', none: 'var(--faint)' };
const icon = (name, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${TONE[name]}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
const chev = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 9.5 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ───────── Loading ─────────
async function load() {
  const seq = ++loadSeq;
  state = 'loading'; errors = []; nextDate = null; priceInfo = null;
  render();
  const start = anchor, end = addDays(anchor, prefs.span - 1);
  const wantBall = prefs.sports.some(s => s !== 'nhl'), wantNhl = prefs.sports.includes('nhl');
  const [ball, puck] = await Promise.all([
    wantBall ? loadBaseball(start, end, prefs.sports).catch(e => { errors.push('baseball'); console.error(e); return []; }) : [],
    wantNhl ? loadHockey(start, end).catch(e => { errors.push('hockey'); console.error(e); return []; }) : []
  ]);
  if (seq !== loadSeq) return;
  games = [...ball, ...puck];
  if (!games.length) {
    if (errors.length === (wantBall ? 1 : 0) + (wantNhl ? 1 : 0) && errors.length) { state = 'error'; render(); return; }
    const cands = await Promise.all([
      wantBall ? nextBaseballDate(end, prefs.sports).catch(() => null) : null,
      wantNhl ? nextHockeyDate(end) : null
    ]);
    if (seq !== loadSeq) return;
    nextDate = cands.filter(Boolean).sort()[0] || null;
    state = 'ready'; render(); return;
  }
  games.forEach(g => scoreGame(g, prefs));
  state = 'ready'; render();           // show the schedule right away, then fill in weather and prices
  await Promise.all([
    attachWeather(games, start, end).catch(e => { errors.push('weather'); console.error(e); }),
    attachPrices(games, start, end, prefs.sgKey).then(r => { priceInfo = r; }).catch(() => { priceInfo = { ok: false, reason: 'failed' }; })
  ]);
  if (seq !== loadSeq) return;
  rescore(); render();
}
function rescore() { games.forEach(g => scoreGame(g, prefs)); pairs = findPairs(games.filter(passes)); }

// ───────── Filters ─────────
const hasPrices = () => games.some(g => g.price != null);
function filterCount() {
  let n = 0;
  if (prefs.minTemp > DEFAULTS.minTemp) n++;
  if (prefs.maxTemp < DEFAULTS.maxTemp) n++;
  if (prefs.maxRain < DEFAULTS.maxRain) n++;
  if (prefs.transit > 1) n++;
  if (prefs.trip !== 'any' && prefs.home) n++;
  if (prefs.maxPrice < DEFAULTS.maxPrice && hasPrices()) n++;
  if (prefs.savedOnly) n++;
  if (query) n++;
  return n;
}
function passes(g) {
  const q = query.toLowerCase();
  if (q && ![g.away.name, g.home.name, g.venue, g.city, g.affiliate].some(s => (s || '').toLowerCase().includes(q))) return false;
  if (prefs.savedOnly && !saved.has(g.venueKey)) return false;
  if (prefs.transit > 1 && g.level < prefs.transit) return false;
  if (prefs.home && prefs.trip !== 'any') {
    const k = g.trip?.kind;
    if (prefs.trip === 'day' && !(k === 'day' || k === 'local')) return false;
    if (prefs.trip === 'same' && !(k === 'day' || k === 'same' || k === 'local')) return false;
  }
  if (prefs.maxPrice < DEFAULTS.maxPrice && hasPrices() && (g.price == null || g.price > prefs.maxPrice)) return false;
  const wxOn = prefs.minTemp > DEFAULTS.minTemp || prefs.maxTemp < DEFAULTS.maxTemp || prefs.maxRain < DEFAULTS.maxRain;
  if (!wxOn) return true;
  if ((g.indoor || g.roof) && prefs.coverPass) return true;
  if (!g.wx || g.wx.bare) return false;
  return g.wx.t0 >= prefs.minTemp && g.wx.t0 <= prefs.maxTemp && g.wx.pop <= prefs.maxRain;
}

// ───────── Card pieces ─────────
function weatherFact(g) {
  const gr = weatherGrade(g), w = g.wx;
  if (!w) return `<div class="fact"><div class="k">${icon('none')} No forecast yet</div><div class="s">Check back closer to the game</div></div>`;
  if (w.bare) return `<div class="fact"><div class="k">${icon('indoor')} ${g.indoor ? 'Indoors' : esc(g.roof)}</div><div class="s">Plays in any weather</div></div>`;
  const typ = g.wxSrc === 'typical';
  const sub = g.indoor ? `Indoors, ${w.pop}% rain outside` : `${typ ? 'Typical' : gr.word}, ${w.pop}% rain${g.roof ? ', roof' : ''}`;
  return `<div class="fact"><div class="k">${icon(w.sky)} <span class="temp">${w.t0}°</span></div><div class="s"><span class="dot g${g.indoor ? 0 : gr.n}" style="display:inline-block;margin-right:6px"></span>${esc(sub)}</div></div>`;
}
function transitFact(g) {
  if (!g.info) return `<div class="fact"><div class="k"><span class="dot"></span> No transit notes</div><div class="s">Not a regular home venue</div></div>`;
  const r = g.trip ? g.info.routes.find(x => x.a === g.trip.airport) || g.info.routes[0] : g.info.routes[0];
  const more = g.info.routes.length - 1;
  return `<div class="fact"><div class="k"><span class="dot g${g.level}"></span> ${TRANSIT_LABEL[g.level]}</div><div class="s">About ${r.mins} min from ${r.a}${more ? `, +${more} airport${more > 1 ? 's' : ''}` : ''}</div></div>`;
}
function tripFact(g) {
  if (!prefs.home) return '';
  const t = g.trip;
  if (!t) return `<div class="fact"><div class="k"><span class="dot"></span> No estimate</div><div class="s">No airport notes here</div></div>`;
  const tone = { local: 4, day: 4, same: 3, before: 2, none: 1 }[t.kind];
  const homeTz = AIRPORTS[prefs.home][3];
  let sub;
  if (t.kind === 'local') sub = 'No flight needed';
  else if (t.kind === 'none') sub = 'Turn on one-stop flights';
  else if (t.kind === 'before') sub = 'Morning flights land too late';
  else sub = `Leave ${prefs.home} by ${clock(t.leaveBy, homeTz)}${t.stop ? ', one stop' : ''}`;
  return `<div class="fact"><div class="k"><span class="dot g${tone}"></span> ${TRIP_LABEL[t.kind]}</div><div class="s">${esc(sub)}</div></div>`;
}
function priceFact(g) {
  if (g.price != null) return `<div class="price"><div class="amt"><small>from</small>$${g.price}</div><div class="s">Details ${chev}</div></div>`;
  return `<div class="price"><div class="s">Details ${chev}</div></div>`;
}
function teamHTML(t) {
  return `<span class="t">${t.logo ? `<img src="${esc(t.logo)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${esc(t.short)}</span>`;
}

function hoursHTML(g) {
  if (!g.wxHours) return `<p class="hint">${state === 'ready' && errors.includes('weather') ? "The forecast service didn't answer. Refresh to try again." : 'No hourly forecast for this date yet.'}</p>`;
  const cells = g.wxHours.map((h, i) => {
    const t = new Date(g.start + OFFSETS[i] * 3600000).toLocaleTimeString('en-US', { timeZone: g.tz, hour: 'numeric' }).replace(/\s?AM/i, 'a').replace(/\s?PM/i, 'p');
    if (!h) return `<div class="hr"><span class="h">${t}</span><span class="t muted">–</span></div>`;
    return `<div class="hr${OFFSETS[i] === 0 ? ' first' : ''}">
      <span class="h">${t}</span>${icon(skyOf(h, false), 18)}<span class="t">${h.t}°</span>
      <span class="bar" title="${h.pop}% chance of rain"><i style="height:${h.pop}%"></i></span>
      <span class="p${h.pop >= 30 ? ' wet' : ''}">${h.pop}%</span><span class="w">${h.wind} mph</span></div>`;
  }).join('');
  const cap = g.wxSrc === 'typical'
    ? 'Too far out for a forecast. This is what is typical for the week, averaged over the past three years.'
    : `Shaded column is ${g.sport === 'nhl' ? 'puck drop' : 'first pitch'}. Bars show the chance of rain; wind is in mph.`;
  return `<div class="hours">${cells}</div><p class="cap">${cap}</p>`;
}
function mapsLink(g, r) {
  const o = encodeURIComponent(`${AIRPORTS[r.a]?.[0] || r.a} Airport (${r.a})`), d = encodeURIComponent(`${g.venue}, ${g.city}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=transit`;
}
function routesHTML(g) {
  if (!g.info) return `<p class="hint">No transit notes for this venue. <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.venue)}" target="_blank" rel="noopener">Find it on the map</a></p>`;
  return g.info.routes.map(r => `<div class="route">
    <h5>From ${esc(r.a)} <span>${esc(AIRPORTS[r.a]?.[0] || '')}, about ${r.mins} min</span></h5>
    <p>${esc(r.how)}</p>
    <a href="${mapsLink(g, r)}" target="_blank" rel="noopener">Live transit directions</a></div>`).join('');
}
function planHTML(g) {
  if (!prefs.home) return `<p class="hint">Set your home airport to see whether you can fly in the day of the game and get home that night.</p><div class="acts"><button class="btn ghost" data-do="settings" type="button">Set home airport</button></div>`;
  const t = g.trip;
  if (!t) return `<p class="hint">No airport notes for this venue, so there is no flight estimate.</p>`;
  if (t.kind === 'local') return `<p class="hint">${esc(t.airport)} is your home airport area. No flight needed.</p>`;
  const homeTz = AIRPORTS[prefs.home][3], destTz = AIRPORTS[t.airport][3];
  const air = AIRLINES[prefs.airline]?.[0];
  const li = [];
  li.push(`<li><span><b>${prefs.home} to ${t.airport}</b>, ${t.dist.toLocaleString()} miles, about ${dur(t.outMin)} in the air nonstop.</span></li>`);
  if (t.direct) li.push(`<li class="${t.nonstopBy >= t.earliest ? 'yes' : 'no'}"><span><b>Nonstop:</b> take off by ${clock(t.nonstopBy, homeTz)} to make ${g.sport === 'nhl' ? 'puck drop' : 'first pitch'}${t.nonstopBy < t.earliest ? ', earlier than you fly' : ''}.</span></li>`);
  else li.push(`<li class="no"><span><b>Nonstop:</b> unlikely${air ? ` on ${esc(air)}` : ''}; neither airport is a hub.</span></li>`);
  if (prefs.stops) li.push(`<li class="${t.stopBy >= t.earliest ? 'yes' : 'no'}"><span><b>One stop:</b> take off by ${clock(t.stopBy, homeTz)}${t.stopBy < t.earliest ? ', earlier than you fly' : ''}.</span></li>`);
  else li.push(`<li><span><b>One stop:</b> turned off. <button class="link" data-do="stops" type="button">Include one-stop flights</button></span></li>`);
  if (t.freeAt) {
    const can = t.kind === 'day';
    li.push(`<li class="${can ? 'yes' : 'no'}"><span><b>Getting home:</b> you could be back through security at ${t.airport} around ${clock(t.freeAt, destTz)}, ${can ? 'in time for' : 'too late for'} a ${clock(t.latestHome - (t.stop ? 7200000 : 0), destTz)} ${t.stop ? 'connection' : 'flight'}.</span></li>`);
  }
  return `<div class="plan"><ul>${li.join('')}</ul><p class="cap">Estimated from distance and airline hub lists, not live schedules or seat loads. Check your airline before you go.</p></div>`;
}

function cardHTML(g, rank, showDate) {
  const isOpen = open.has(g.id), isSaved = saved.has(g.venueKey);
  const off = /postponed|cancel|suspended/i.test(g.status);
  const tier = g.best >= 70 ? 3 : g.best >= 50 ? 2 : 1;
  const tags = [];
  if (rank === 1) tags.push('<span class="tag top">Top pick</span>');
  tags.push(`<span class="tag">${SPORT_NAME[g.sport]}</span>`);
  if (g.label) tags.push(`<span class="tag">${esc(g.label)}</span>`);
  if (g.status && !/^(scheduled|pre-game|warmup)$/i.test(g.status)) tags.push(`<span class="tag${off ? ' alert' : ''}">${esc(g.status)}</span>`);
  const when = `${showDate ? `<b>${shortDate(g.date)}</b>` : ''}<b>${g.tbd ? 'Time to be announced' : clock(g.start, g.tz, true)}</b>`;
  const t = ticketLinks(g);
  const detail = !isOpen ? '' : `<div class="detail">
      <div>
        <div class="block"><h4>Hour by hour at ${esc(g.venue)}</h4>${hoursHTML(g)}</div>
        <div class="block"><h4>Flying in${prefs.home ? ` from ${prefs.home}` : ''}</h4>${planHTML(g)}</div>
      </div>
      <div>
        <div class="block"><h4>Airport to the ${g.sport === 'nhl' ? 'arena' : 'ballpark'}</h4>${routesHTML(g)}</div>
        <div class="block"><h4>Tickets${g.price != null ? `, from $${g.price} on SeatGeek` : ''}</h4>
          ${g.note ? `<p class="hint" style="margin-bottom:10px">${esc(g.note)}</p>` : ''}
          <div class="acts">
            <a class="btn accent" href="${esc(t.seatgeek)}" target="_blank" rel="noopener">SeatGeek</a>
            <a class="btn ghost" href="${esc(t.stubhub)}" target="_blank" rel="noopener">StubHub</a>
            ${t.team ? `<a class="btn ghost" href="${esc(t.team)}" target="_blank" rel="noopener">Team box office</a>` : ''}
            <button class="btn ghost save" data-do="save" aria-pressed="${isSaved}" type="button">${isSaved ? 'Saved venue' : 'Save venue'}</button>
          </div>
        </div>
      </div>
    </div>`;
  return `<article class="game${isOpen ? ' open' : ''}${off ? ' dim' : ''}" data-id="${g.id}">
    <div class="game-main${prefs.home ? '' : ' no-trip'}" role="button" tabindex="0" aria-expanded="${isOpen}" data-do="toggle">
      <div class="score t${tier}" style="--v:${g.best}" title="Overall score out of 100">${g.best}</div>
      <div class="who">
        <div class="eyebrow">${when}${tags.join('')}</div>
        <div class="teams">${teamHTML(g.away)}<span class="at">at</span>${teamHTML(g.home)}</div>
        <div class="venue">${esc(g.venue)}${g.city ? ', ' + esc(g.city) : ''}${isSaved ? ' · saved' : ''}</div>
      </div>
      <div class="facts">${weatherFact(g)}${transitFact(g)}${tripFact(g)}</div>
      ${priceFact(g)}
    </div>${detail}
  </article>`;
}

function pairsHTML() {
  if (!pairs.length) return '';
  return `<div class="pairs"><h3>Two games, one trip</h3><div class="pair-row">${pairs.map(p => {
    const leg = g => `<div class="leg"><time>${clock(g.start, g.tz)}</time><b>${esc(g.away.short)} at ${esc(g.home.short)}</b></div>`;
    const where = p.sameDay ? `${shortDate(p.a.date)}, same day` : `${shortDate(p.a.date)} and ${niceDate(p.b.date, { weekday: 'short' })}`;
    const apart = p.a.venueKey === p.b.venueKey ? 'same venue' : p.dist < 1 ? 'next door' : `${Math.round(p.dist)} mi apart`;
    return `<button class="pair" type="button" data-do="pair" data-a="${p.a.id}" data-b="${p.b.id}">
      <span class="where">${esc(p.a.city && p.b.city && p.a.city !== p.b.city ? `${p.a.city} and ${p.b.city}` : (p.a.city || p.b.city))}, ${apart}</span><span class="where">${where}</span>${leg(p.a)}${leg(p.b)}</button>`;
  }).join('')}</div></div>`;
}

// ───────── Render ─────────
function render() {
  syncControls();
  const list = $('list'), count = $('count'), notice = $('notice'), end = addDays(anchor, prefs.span - 1);
  const range = prefs.span === 1 ? niceDate(anchor) : `${niceDate(anchor, { month: 'short', day: 'numeric' })} to ${niceDate(end, { month: 'short', day: 'numeric' })}`;
  $('pairs').innerHTML = ''; notice.innerHTML = ''; $('foot').hidden = true;

  if (state === 'loading') {
    count.textContent = `Loading games for ${range}`;
    list.innerHTML = `<div class="cards">${'<div class="skel"></div>'.repeat(5)}</div>`;
    return;
  }
  if (state === 'error') {
    count.textContent = '';
    list.innerHTML = `<div class="empty"><h3>The schedule didn't load</h3><p>The schedule service didn't answer. Check your connection and try again.</p><div class="acts"><button class="btn primary" data-do="reload" type="button">Try again</button></div></div>`;
    return;
  }
  if (!prefs.sports.length) {
    count.textContent = '';
    list.innerHTML = `<div class="empty"><h3>Pick a sport</h3><p>Turn on MLB, Triple-A or NHL above to see games.</p></div>`;
    return;
  }
  if (!games.length) {
    count.textContent = '';
    list.innerHTML = `<div class="empty"><h3>No games ${prefs.span === 1 ? 'on' : 'from'} ${esc(range)}</h3>
      <p>${nextDate ? `The next games in the sports you picked are on ${esc(niceDate(nextDate))}.` : 'Nothing is on the calendar for these dates in the sports you picked.'}</p>
      ${nextDate ? `<div class="acts"><button class="btn primary" data-do="jump" data-date="${nextDate}" type="button">Go to ${esc(niceDate(nextDate, { month: 'long', day: 'numeric' }))}</button></div>` : ''}</div>`;
    return;
  }

  const shown = games.filter(passes);
  const bySport = prefs.sports.map(s => { const n = shown.filter(g => g.sport === s).length; return n ? `${n} ${SPORT_NAME[s]}` : ''; }).filter(Boolean).join(', ');
  count.innerHTML = `<strong>${shown.length} game${shown.length === 1 ? '' : 's'}</strong>, ${esc(range)}${bySport && prefs.sports.length > 1 ? ` <span class="muted">(${bySport})</span>` : ''}`;

  const notes = [];
  if (errors.includes('baseball')) notes.push(`<div class="note warn"><p>Baseball schedules didn't load. Showing what did.</p><button class="link" data-do="reload" type="button">Try again</button></div>`);
  if (errors.includes('hockey')) notes.push(`<div class="note warn"><p>The NHL schedule didn't load. Showing what did.</p><button class="link" data-do="reload" type="button">Try again</button></div>`);
  if (!prefs.home) notes.push(`<div class="note"><p>Add your home airport and airline to see which games you can fly to and from in a day.</p><button class="link" data-do="settings" type="button">Set home airport</button></div>`);
  if (prefs.sgKey && priceInfo && !priceInfo.ok) notes.push(`<div class="note warn"><p>Ticket prices didn't load. Check that your SeatGeek client ID is right.</p><button class="link" data-do="settings" type="button">Open settings</button></div>`);
  notice.innerHTML = notes.join('');

  if (!shown.length) {
    list.innerHTML = `<div class="empty"><h3>No games match your filters</h3><p>${games.length} game${games.length === 1 ? ' is' : 's are'} scheduled. Loosen a filter to see ${games.length === 1 ? 'it' : 'them'}.</p><div class="acts"><button class="btn primary" data-do="reset" type="button">Reset filters</button></div></div>`;
    return;
  }
  $('pairs').innerHTML = pairsHTML();

  const byTime = (a, b) => a.start - b.start;
  if (prefs.sort === 'time') {
    const days = [...new Set(shown.map(g => g.date))].sort();
    list.innerHTML = days.map(d => {
      const l = shown.filter(g => g.date === d).sort(byTime);
      return `<h3 class="group">${esc(niceDate(d))} <small>${l.length} game${l.length > 1 ? 's' : ''}</small></h3><div class="cards">${l.map(g => cardHTML(g, 0, false)).join('')}</div>`;
    }).join('');
  } else {
    const val = { best: g => g.best, wx: g => g.wxScore, transit: g => g.transitScore, trip: g => g.tripScore ?? -1, price: g => (g.price == null ? -1e6 : -g.price) }[prefs.sort];
    const l = shown.slice().sort((a, b) => (val(b) - val(a)) || (b.best - a.best) || byTime(a, b));
    list.innerHTML = `<div class="cards">${l.map((g, i) => cardHTML(g, prefs.sort === 'best' ? i + 1 : 0, prefs.span > 1)).join('')}</div>`;
  }

  const foot = $('foot'); foot.hidden = false;
  const upd = nhlUpdated();
  foot.innerHTML = `<p>The score blends weather, the airport-to-venue ride${prefs.home ? ' and how easy the flight is' : ''}. Weather looks at the hours you would be in your seat: comfort between 65 and 82°F, the highest rain chance, wind and storms. Indoor and roofed venues are mostly shielded from it.</p>
    <p>Transit times are estimates without checked bags, written by hand; service thins out late, so check the last train before a night game. All times are local to the venue.</p>
    <p>Schedules from MLB and the NHL${upd ? ` (NHL refreshed ${new Date(upd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''}, weather from Open-Meteo${hasPrices() ? ', prices from SeatGeek' : ''}.</p>`;
}

function syncControls() {
  $('dateIn').value = anchor;
  const press = (id, attr, val) => document.querySelectorAll(`#${id} button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))));
  document.querySelectorAll('#sports button').forEach(b => b.setAttribute('aria-pressed', String(prefs.sports.includes(b.dataset.sport))));
  press('spanSeg', 'span', prefs.span); press('transitSeg', 't', prefs.transit); press('tripSeg', 'trip', prefs.home ? prefs.trip : 'any');
  document.querySelectorAll('#tripSeg button').forEach(b => { b.disabled = !prefs.home && b.dataset.trip !== 'any'; });
  const set = (id, v) => { const el = $(id); if (el.value !== String(v)) el.value = v; };
  set('minTemp', prefs.minTemp); set('maxTemp', prefs.maxTemp); set('maxRain', prefs.maxRain); set('maxPrice', prefs.maxPrice); set('sortSel', prefs.sort);
  $('minTempOut').textContent = prefs.minTemp <= DEFAULTS.minTemp ? 'Any' : prefs.minTemp + '°';
  $('maxTempOut').textContent = prefs.maxTemp >= DEFAULTS.maxTemp ? 'Any' : prefs.maxTemp + '°';
  $('maxRainOut').textContent = prefs.maxRain >= 100 ? 'Any' : prefs.maxRain + '%';
  $('maxPriceOut').textContent = prefs.maxPrice >= DEFAULTS.maxPrice ? 'Any' : '$' + prefs.maxPrice;
  $('priceBox').hidden = !hasPrices();
  $('stops').checked = prefs.stops; $('coverPass').checked = prefs.coverPass; $('savedOnly').checked = prefs.savedOnly;
  $('savedCount').textContent = saved.size ? `(${saved.size})` : '';
  const air = AIRLINES[prefs.airline]?.[0];
  $('tripBtnText').textContent = prefs.home ? `From ${prefs.home}${air ? ` on ${air}` : ''}` : 'Set your home airport';
  $('tripHint').innerHTML = prefs.home
    ? `Flying from ${prefs.home}${air ? ` on ${esc(air)}` : ''}, taking off no earlier than ${fmtMin(prefs.earliest)}.`
    : 'Set your home airport to filter by trip length.';
  $('sortSel').querySelector('[value=trip]').disabled = !prefs.home;
  $('sortSel').querySelector('[value=price]').disabled = !hasPrices();
  const n = filterCount(); $('filterBadge').hidden = !n; $('filterBadge').textContent = n;
}
const fmtMin = m => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`; };

// ───────── Events ─────────
function setAnchor(s) { if (s) { anchor = s; open.clear(); load(); } }
function refilter() { store(); pairs = findPairs(games.filter(passes)); render(); }
function replan() { store(); rescore(); render(); }

$('prevBtn').onclick = () => setAnchor(addDays(anchor, -prefs.span));
$('nextBtn').onclick = () => setAnchor(addDays(anchor, prefs.span));
$('todayBtn').onclick = () => setAnchor(todayStr());
$('weekendBtn').onclick = () => {
  const t = todayStr(), [y, m, d] = t.split('-').map(Number), dow = new Date(y, m - 1, d).getDay();
  prefs.span = 3; store();
  setAnchor(dow === 6 ? addDays(t, -1) : dow === 0 ? addDays(t, -2) : addDays(t, 5 - dow));
};
$('dateIn').onchange = e => setAnchor(e.target.value);
$('spanSeg').onclick = e => { const b = e.target.closest('button'); if (b) { prefs.span = +b.dataset.span; store(); setAnchor(anchor); } };
$('sports').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const s = b.dataset.sport;
  prefs.sports = prefs.sports.includes(s) ? prefs.sports.filter(x => x !== s) : [...prefs.sports, s];
  store(); setAnchor(anchor);
};
$('sortSel').onchange = e => { prefs.sort = e.target.value; store(); render(); };
$('transitSeg').onclick = e => { const b = e.target.closest('button'); if (b) { prefs.transit = +b.dataset.t; refilter(); } };
$('tripSeg').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) { prefs.trip = b.dataset.trip; refilter(); } };
['minTemp', 'maxTemp', 'maxRain', 'maxPrice'].forEach(id => { $(id).oninput = e => { prefs[id] = +e.target.value; refilter(); }; });
$('q').oninput = e => { query = e.target.value.trim(); refilter(); };
$('savedOnly').onchange = e => { prefs.savedOnly = e.target.checked; refilter(); };
$('coverPass').onchange = e => { prefs.coverPass = e.target.checked; refilter(); };
$('stops').onchange = e => { prefs.stops = e.target.checked; replan(); };
function resetFilters() {
  for (const k of ['minTemp', 'maxTemp', 'maxRain', 'coverPass', 'transit', 'trip', 'maxPrice', 'savedOnly']) prefs[k] = DEFAULTS[k];
  query = ''; $('q').value = ''; refilter();
}
$('resetBtn').onclick = resetFilters;
$('filtersBtn').onclick = () => document.body.classList.add('filters-open');
$('railDone').onclick = () => document.body.classList.remove('filters-open');

function act(el) {
  const row = el.closest('.game'), g = row && games.find(x => x.id === row.dataset.id);
  switch (el.dataset.do) {
    case 'toggle': if (g) { open.has(g.id) ? open.delete(g.id) : open.add(g.id); render(); } break;
    case 'save': if (g) { saved.has(g.venueKey) ? saved.delete(g.venueKey) : saved.add(g.venueKey); refilter(); } break;
    case 'stops': prefs.stops = true; replan(); break;
    case 'settings': openSettings(); break;
    case 'reload': load(); break;
    case 'reset': resetFilters(); break;
    case 'jump': setAnchor(el.dataset.date); break;
    case 'pair': {
      open.add(el.dataset.a); open.add(el.dataset.b); render();
      document.querySelector(`.game[data-id="${el.dataset.a}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
  }
}
document.querySelector('.results').addEventListener('click', e => {
  if (e.target.closest('a')) return;
  const el = e.target.closest('[data-do]'); if (el) act(el);
});
document.querySelector('.results').addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.game-main')) { e.preventDefault(); act(e.target); }
});

// ───────── Trip settings ─────────
const dlg = $('tripDlg');
$('airlineIn').insertAdjacentHTML('beforeend', Object.entries(AIRLINES).map(([c, a]) => `<option value="${c}">${esc(a[0])}</option>`).join(''));
const timeOpts = (from, to) => { let s = ''; for (let m = from; m <= to; m += 30) s += `<option value="${m}">${fmtMin(m)}</option>`; return s; };
$('earliestIn').innerHTML = timeOpts(300, 600);
$('latestIn').innerHTML = timeOpts(1020, 1410);

// Home airport picker: a searchable list of every airport with airline service
let airportDb = null, airportLoad = null, pick = null, matches = [], hi = -1;
function loadAirports() {
  airportLoad ||= fetch('data/airports.json?v=4')
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(d => {
      airportDb = d.list.map(a => ({
        code: a[0], city: a[1], region: a[2], name: a[3], lat: a[4], lon: a[5], tz: d.zones[a[6]],
        home: a[2].length === 2, hay: `${a[1]} ${a[3]} ${a[7] || ''} ${a[2]}`.toLowerCase()
      }));
    })
    .catch(e => { airportLoad = null; throw e; });
  return airportLoad;
}
const airportLabel = a => `${a.code}  ${a.city}${a.region ? ', ' + a.region : ''}`;
function searchAirports(q) {
  q = q.trim().toLowerCase();
  if (!q || !airportDb) return [];
  const found = [];
  for (const a of airportDb) {
    const code = a.code.toLowerCase(), at = a.hay.indexOf(q);
    let tier = -1;
    if (code === q) tier = 0;
    else if (code.startsWith(q)) tier = 1;
    else if (at === 0) tier = 2;
    else if (q.length >= 2 && new RegExp('[\\s/(-]' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(a.hay)) tier = 3; // start of a later word
    if (tier >= 0) found.push([tier, a]);
  }
  // Exact and prefix matches first, North American airports ahead of the rest of the world
  found.sort((x, y) => (x[0] - y[0]) || (y[1].home - x[1].home) || x[1].code.localeCompare(y[1].code));
  return found.slice(0, 40).map(x => x[1]);
}
function showMatches() {
  const ul = $('homeList'), inp = $('homeIn'), q = inp.value;
  $('homeClear').hidden = !q;
  if (pick || !q.trim()) { ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); return; }
  matches = searchAirports(q); hi = matches.length ? 0 : -1;
  ul.innerHTML = !airportDb ? '<li class="none">Loading airports</li>'
    : !matches.length ? '<li class="none">No airport matches that. Try the three-letter code or the city.</li>'
    : matches.map((a, i) => `<li role="option" id="ap${i}" data-i="${i}" aria-selected="${i === hi}"><b>${a.code}</b><span>${esc(a.city)}${a.region ? ', ' + esc(a.region) : ''}</span>${a.name && a.name !== a.city ? `<small>${esc(a.name)}</small>` : ''}</li>`).join('');
  ul.hidden = false; inp.setAttribute('aria-expanded', 'true');
}
function moveHi(d) {
  if (!matches.length) return;
  hi = (hi + d + matches.length) % matches.length;
  $('homeList').querySelectorAll('li').forEach((li, i) => { li.setAttribute('aria-selected', String(i === hi)); if (i === hi) li.scrollIntoView({ block: 'nearest' }); });
  $('homeIn').setAttribute('aria-activedescendant', `ap${hi}`);
}
function choose(a) {
  pick = a; $('homeIn').value = airportLabel(a); $('homeMsg').hidden = true;
  $('homeIn').removeAttribute('aria-activedescendant');
  showMatches();
}
function homeError(msg) { const m = $('homeMsg'); m.textContent = msg; m.className = 'hint err'; m.hidden = false; }

function openSettings() {
  pick = prefs.home ? { code: prefs.home, keep: true } : null;
  $('homeIn').value = prefs.home ? (prefs.homeLabel || `${prefs.home}  ${AIRPORTS[prefs.home]?.[0] || ''}`.trim()) : '';
  $('homeClear').hidden = !prefs.home; $('homeList').hidden = true; $('homeMsg').hidden = true;
  $('airlineIn').value = prefs.airline;
  $('earliestIn').value = prefs.earliest; $('latestIn').value = prefs.latest; $('sgIn').value = prefs.sgKey;
  dlg.showModal();
  loadAirports().then(showMatches).catch(() => homeError("The airport list didn't load. Check your connection, then close and reopen settings."));
}
$('tripBtn').onclick = openSettings;
$('homeIn').addEventListener('input', () => { pick = null; $('homeMsg').hidden = true; showMatches(); });
$('homeIn').addEventListener('focus', e => { if (pick) e.target.select(); });
$('homeIn').addEventListener('keydown', e => {
  const listOpen = !$('homeList').hidden;
  if (e.key === 'ArrowDown') { e.preventDefault(); moveHi(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveHi(-1); }
  else if (e.key === 'Enter' && listOpen) { e.preventDefault(); if (matches[hi]) choose(matches[hi]); }
  else if (e.key === 'Escape' && listOpen) { e.preventDefault(); $('homeList').hidden = true; }
});
$('homeList').addEventListener('mousedown', e => e.preventDefault()); // keep focus in the box while picking
$('homeList').addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) choose(matches[+li.dataset.i]); });
$('homeClear').onclick = () => { pick = null; $('homeIn').value = ''; $('homeMsg').hidden = true; showMatches(); $('homeIn').focus(); };

$('tripForm').addEventListener('submit', e => {
  if (e.submitter?.value !== 'save') return;
  const typed = $('homeIn').value.trim();
  if (typed && !pick) {
    // Typed a code without tapping a row: accept it if it is an exact airport code
    const exact = airportDb?.find(a => a.code === typed.toUpperCase());
    if (exact) choose(exact);
    else { e.preventDefault(); homeError('Choose an airport from the list so the code is one we know.'); $('homeIn').focus(); showMatches(); return; }
  }
  const keyChanged = $('sgIn').value.trim() !== prefs.sgKey;
  Object.assign(prefs, { airline: $('airlineIn').value, earliest: +$('earliestIn').value, latest: +$('latestIn').value, sgKey: $('sgIn').value.trim() });
  if (!typed) { prefs.home = ''; prefs.homeInfo = null; prefs.homeLabel = ''; prefs.trip = 'any'; }
  else if (!pick.keep) {
    prefs.home = pick.code; prefs.homeLabel = airportLabel(pick);
    prefs.homeInfo = [pick.city, pick.lat, pick.lon, pick.tz];
    AIRPORTS[pick.code] ||= prefs.homeInfo;
  }
  store();
  if (keyChanged) load(); else { rescore(); render(); }
});

const jump = new URLSearchParams(location.search).get('date');
if (/^\d{4}-\d{2}-\d{2}$/.test(jump || '')) anchor = jump;
load();
