// Builds data/nhl.json from the NHL schedule service.
// The NHL service does not allow requests from web pages, so this runs on a schedule
// in GitHub Actions (or by hand: `node scripts/build-nhl.mjs`) and the site reads the file.
import { writeFile, mkdir } from 'node:fs/promises';

const iso = d => d.toISOString().slice(0, 10);
const start = new Date(Date.now() - 2 * 86400000);
let cursor = iso(start);
const teams = {};
const games = [];
const seen = new Set();

for (let week = 0; week < 45 && cursor; week++) {
  const res = await fetch(`https://api-web.nhle.com/v1/schedule/${cursor}`);
  if (!res.ok) throw new Error(`NHL schedule ${cursor}: HTTP ${res.status}`);
  const data = await res.json();
  for (const day of data.gameWeek || []) {
    for (const g of day.games || []) {
      if (seen.has(g.id) || g.gameType === 1) continue; // skip preseason
      seen.add(g.id);
      for (const t of [g.homeTeam, g.awayTeam]) {
        if (!teams[t.abbrev]) {
          teams[t.abbrev] = {
            name: `${t.placeName?.default || ''} ${t.commonName?.default || ''}`.trim() || t.abbrev,
            short: t.commonName?.default || t.abbrev,
            logo: t.logo || ''
          };
        }
      }
      games.push({
        id: g.id,
        start: g.startTimeUTC,
        home: g.homeTeam.abbrev,
        away: g.awayTeam.abbrev,
        venue: g.venue?.default || '',
        tz: g.venueTimezone || '',
        neutral: !!g.neutralSite,
        state: g.gameScheduleState || 'OK',
        type: g.gameType,
        tickets: (g.ticketsLink || '').split('?')[0]
      });
    }
  }
  const next = data.nextStartDate;
  cursor = next && next > cursor ? next : null;
}

games.sort((a, b) => a.start.localeCompare(b.start));
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/nhl.json', import.meta.url),
  JSON.stringify({ updated: new Date().toISOString(), teams, games }));
console.log(`Wrote ${games.length} NHL games, ${Object.keys(teams).length} teams, through ${games.at(-1)?.start}`);
