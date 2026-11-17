// Builds data/logos.json: ESPN's logo for every NHL and MLB team, keyed by team name.
// NBA, NFL and college games already carry ESPN logos; using the same set for NHL and MLB keeps
// every logo drawn the same way. Run by hand (`node scripts/build-logos.mjs`) or by the weekly GitHub Action.
import { writeFileSync } from 'node:fs';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const plain = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

const logos = {};
for (const path of ['hockey/nhl', 'baseball/mlb']) {
  const res = await fetch(`${ESPN}/${path}/teams`);
  if (!res.ok) throw new Error(`${path} teams: HTTP ${res.status}`);
  const data = await res.json();
  for (const { team } of data.sports?.[0]?.leagues?.[0]?.teams || []) {
    const logo = (team.logos || []).find(l => (l.rel || []).includes('default'))?.href || team.logos?.[0]?.href;
    if (logo) logos[plain(team.displayName)] = logo;
  }
}
if (Object.keys(logos).length < 50) throw new Error(`Only ${Object.keys(logos).length} logos found; not saving`);
writeFileSync(new URL('../data/logos.json', import.meta.url), JSON.stringify({ updated: new Date().toISOString(), logos }));
console.log(`Wrote ${Object.keys(logos).length} logos`);
