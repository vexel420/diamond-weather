// Builds data/events.json: golf, tennis and racing events with where they are held and the nearest airports.
// ESPN lists the events but rarely says where they are: tennis gives a city, NASCAR and IndyCar race names
// usually name the place, and golf and F1 use the hand-written tables below. Events that cannot be placed
// are kept (they still appear on the site, without weather or airports) and listed at the end of the run.
// Run by hand (`node scripts/build-events.mjs`) or by the weekly GitHub Action.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';
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
const year = new Date().getUTCFullYear();

// site sport key, label shown on the card, ESPN sport/league
const TOURS = [
  ['golf', 'PGA Tour', 'golf', 'pga'], ['golf', 'LPGA', 'golf', 'lpga'],
  ['tennis', 'ATP', 'tennis', 'atp'], ['tennis', 'WTA', 'tennis', 'wta'],
  ['racing', 'F1', 'racing', 'f1'], ['racing', 'NASCAR Cup', 'racing', 'nascar-premier'], ['racing', 'IndyCar', 'racing', 'irl']
];

// ── Where events are held. Each entry: [pattern matched against the event name, city, state or country, venue] ──
// A year in the entry limits it to that year (majors move between courses).
const GOLF = [
  [/masters tournament/i, 'Augusta', 'Georgia', 'Augusta National Golf Club'],
  [/pga championship/i, 'Newtown Square', 'Pennsylvania', 'Aronimink Golf Club', 2026],
  [/pga championship/i, 'Frisco', 'Texas', 'PGA Frisco (Fields Ranch East)', 2027],
  [/^u\.?s\.? open/i, 'Southampton', 'New York', 'Shinnecock Hills Golf Club', 2026],
  [/^u\.?s\.? open/i, 'Pebble Beach', 'California', 'Pebble Beach Golf Links', 2027],
  [/^the open|open championship/i, 'Southport', 'United Kingdom', 'Royal Birkdale', 2026],
  [/^the open|open championship/i, 'St Andrews', 'United Kingdom', 'Old Course at St Andrews', 2027],
  [/the sentry/i, 'Kapalua', 'Hawaii', 'Plantation Course at Kapalua'],
  [/sony open/i, 'Honolulu', 'Hawaii', 'Waialae Country Club'],
  [/american express/i, 'La Quinta', 'California', 'PGA West'],
  [/farmers insurance open/i, 'San Diego', 'California', 'Torrey Pines'],
  [/pebble beach pro-am/i, 'Pebble Beach', 'California', 'Pebble Beach Golf Links'],
  [/phoenix open/i, 'Scottsdale', 'Arizona', 'TPC Scottsdale'],
  [/genesis invitational/i, 'Pacific Palisades', 'California', 'Riviera Country Club'],
  [/mexico open/i, 'Puerto Vallarta', 'Mexico', 'Vidanta Vallarta'],
  [/cognizant classic/i, 'Palm Beach Gardens', 'Florida', 'PGA National'],
  [/arnold palmer/i, 'Orlando', 'Florida', 'Bay Hill Club'],
  [/puerto rico open/i, 'Río Grande', 'Puerto Rico', 'Grand Reserve Golf Club'],
  [/players championship/i, 'Ponte Vedra Beach', 'Florida', 'TPC Sawgrass'],
  [/valspar/i, 'Palm Harbor', 'Florida', 'Innisbrook (Copperhead)'],
  [/houston open/i, 'Houston', 'Texas', 'Memorial Park Golf Course'],
  [/valero texas open/i, 'San Antonio', 'Texas', 'TPC San Antonio'],
  [/rbc heritage/i, 'Hilton Head Island', 'South Carolina', 'Harbour Town Golf Links'],
  [/corales puntacana/i, 'Punta Cana', 'Dominican Republic', 'Corales Golf Course'],
  [/zurich classic/i, 'Avondale', 'Louisiana', 'TPC Louisiana'],
  [/myrtle beach classic/i, 'Myrtle Beach', 'South Carolina', 'Dunes Golf and Beach Club'],
  [/byron nelson/i, 'McKinney', 'Texas', 'TPC Craig Ranch'],
  [/charles schwab challenge/i, 'Fort Worth', 'Texas', 'Colonial Country Club'],
  [/memorial tournament|the memorial/i, 'Dublin', 'Ohio', 'Muirfield Village Golf Club'],
  [/travelers championship/i, 'Cromwell', 'Connecticut', 'TPC River Highlands'],
  [/rocket classic|rocket mortgage classic/i, 'Detroit', 'Michigan', 'Detroit Golf Club'],
  [/john deere classic/i, 'Silvis', 'Illinois', 'TPC Deere Run'],
  [/scottish open/i, 'North Berwick', 'United Kingdom', 'The Renaissance Club'],
  [/barracuda championship/i, 'Truckee', 'California', 'Tahoe Mountain Club'],
  [/3m open/i, 'Blaine', 'Minnesota', 'TPC Twin Cities'],
  [/wyndham championship/i, 'Greensboro', 'North Carolina', 'Sedgefield Country Club'],
  [/fedex st\.? jude/i, 'Memphis', 'Tennessee', 'TPC Southwind'],
  [/tour championship/i, 'Atlanta', 'Georgia', 'East Lake Golf Club'],
  [/procore championship/i, 'Napa', 'California', 'Silverado Resort'],
  [/sanderson farms/i, 'Jackson', 'Mississippi', 'Country Club of Jackson'],
  [/black desert championship/i, 'Ivins', 'Utah', 'Black Desert Resort'],
  [/shriners children'?s open/i, 'Las Vegas', 'Nevada', 'TPC Summerlin'],
  [/world wide technology championship/i, 'Cabo San Lucas', 'Mexico', 'El Cardonal at Diamante'],
  [/bermuda championship/i, 'Southampton', 'Bermuda', 'Port Royal Golf Course'],
  [/rsm classic/i, 'St. Simons Island', 'Georgia', 'Sea Island Golf Club'],
  [/hero world challenge/i, 'Nassau', 'Bahamas', 'Albany'],
  [/zozo championship|baycurrent classic/i, 'Yokohama', 'Japan', 'Yokohama Country Club'],
  [/cadillac championship/i, 'Doral', 'Florida', 'Trump National Doral'], [/truist championship/i, 'Charlotte', 'North Carolina', 'Quail Hollow Club'],
  [/rbc canadian open/i, 'Caledon', 'Canada', 'TPC Toronto at Osprey Valley', 2026], [/isco championship/i, 'Louisville', 'Kentucky', 'Hurstbourne Country Club'],
  [/bmw championship/i, 'St. Louis', 'Missouri', 'Bellerive Country Club', 2026], [/biltmore championship/i, 'Asheville', 'North Carolina', ''],
  [/presidents cup/i, 'Medinah', 'Illinois', 'Medinah Country Club', 2026], [/bank of utah championship/i, 'Ivins', 'Utah', 'Black Desert Resort'],
  [/austin championship/i, 'Austin', 'Texas', ''], [/ryder cup/i, 'Adare', 'Ireland', 'Adare Manor', 2027],
  [/riviera maya|mayakoba/i, 'Playa del Carmen', 'Mexico', 'El Camaleón at Mayakoba'], [/lotte championship/i, 'Ewa Beach', 'Hawaii', 'Hoakalei Country Club'],
  [/maybank championship/i, 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur Golf & Country Club'], [/solheim cup/i, 'Cromvoirt', 'Netherlands', 'Bernardus Golf', 2026],
  [/u\.?s\.? women'?s open/i, 'Pacific Palisades', 'California', 'Riviera Country Club', 2026],
  // LPGA
  [/tournament of champions/i, 'Orlando', 'Florida', 'Lake Nona Golf & Country Club'],
  [/founders cup/i, 'Bradenton', 'Florida', 'Bradenton Country Club'],
  [/ford championship/i, 'Gilbert', 'Arizona', 'Seville Golf & Country Club'],
  [/fir hills seri pak|seri pak/i, 'Palos Verdes Estates', 'California', 'Palos Verdes Golf Club'],
  [/t-mobile match play/i, 'North Las Vegas', 'Nevada', 'Shadow Creek'],
  [/la championship/i, 'Los Angeles', 'California', 'El Caballero Country Club'],
  [/chevron championship/i, 'The Woodlands', 'Texas', 'Carlton Woods'],
  [/mizuho americas open/i, 'Mountainside', 'New Jersey', 'Echo Lake Country Club'],
  [/shoprite/i, 'Galloway', 'New Jersey', 'Seaview (Bay Course)'],
  [/meijer lpga/i, 'Belmont', 'Michigan', 'Blythefield Country Club'],
  [/dow championship/i, 'Midland', 'Michigan', 'Midland Country Club'],
  [/queen city championship/i, 'Cincinnati', 'Ohio', 'Kenwood Country Club'],
  [/nw arkansas championship/i, 'Rogers', 'Arkansas', 'Pinnacle Country Club'],
  [/fm championship/i, 'Norton', 'Massachusetts', 'TPC Boston'],
  [/evian championship/i, 'Évian-les-Bains', 'France', 'Evian Resort Golf Club'],
  [/portland classic/i, 'Portland', 'Oregon', 'Columbia Edgewater Country Club'],
  [/the annika/i, 'Belleair', 'Florida', 'Pelican Golf Club'],
  [/cme group tour championship/i, 'Naples', 'Florida', 'Tiburón Golf Club'],
  [/blue bay/i, 'Hainan', 'China', 'Jian Lake Blue Bay Golf Course'],
  [/hsbc women'?s world championship/i, 'Singapore', 'Singapore', 'Sentosa Golf Club'],
  [/honda lpga thailand/i, 'Pattaya', 'Thailand', 'Siam Country Club'],
  [/buick lpga shanghai/i, 'Shanghai', 'China', 'Qizhong Garden Golf Club'],
  [/bmw ladies championship/i, 'Busan', 'South Korea', 'LPGA International Busan'],
  [/toto japan classic/i, 'Otsu', 'Japan', 'Seta Golf Course']
];
const F1 = [
  [/australian/i, 'Melbourne', 'Australia', 'Albert Park Circuit'], [/chinese/i, 'Shanghai', 'China', 'Shanghai International Circuit'],
  [/japanese/i, 'Suzuka', 'Japan', 'Suzuka Circuit'], [/bahrain/i, 'Sakhir', 'Bahrain', 'Bahrain International Circuit'],
  [/saudi/i, 'Jeddah', 'Saudi Arabia', 'Jeddah Corniche Circuit'], [/miami/i, 'Miami Gardens', 'Florida', 'Miami International Autodrome'],
  [/emilia|imola/i, 'Imola', 'Italy', 'Imola Circuit'], [/monaco/i, 'Monaco', 'Monaco', 'Circuit de Monaco'],
  [/barcelona/i, 'Montmeló', 'Spain', 'Circuit de Barcelona-Catalunya'], [/spanish/i, 'Madrid', 'Spain', 'Madring'],
  [/canadian/i, 'Montreal', 'Canada', 'Circuit Gilles Villeneuve'], [/austrian/i, 'Spielberg', 'Austria', 'Red Bull Ring'],
  [/british/i, 'Silverstone', 'United Kingdom', 'Silverstone Circuit'], [/belgian/i, 'Stavelot', 'Belgium', 'Circuit de Spa-Francorchamps'],
  [/hungarian/i, 'Mogyoród', 'Hungary', 'Hungaroring'], [/dutch/i, 'Zandvoort', 'Netherlands', 'Circuit Zandvoort'],
  [/italian/i, 'Monza', 'Italy', 'Monza Circuit'], [/azerbaijan/i, 'Baku', 'Azerbaijan', 'Baku City Circuit'],
  [/singapore/i, 'Singapore', 'Singapore', 'Marina Bay Street Circuit'], [/united states|\bu\.?s\.? grand prix/i, 'Austin', 'Texas', 'Circuit of the Americas'],
  [/mexico/i, 'Mexico City', 'Mexico', 'Autódromo Hermanos Rodríguez'], [/são paulo|sao paulo|brazil/i, 'São Paulo', 'Brazil', 'Interlagos'],
  [/las vegas/i, 'Las Vegas', 'Nevada', 'Las Vegas Strip Circuit'], [/qatar/i, 'Lusail', 'Qatar', 'Lusail International Circuit'],
  [/abu dhabi/i, 'Abu Dhabi', 'United Arab Emirates', 'Yas Marina Circuit']
];
// NASCAR and IndyCar: names that do not say where the track is, then track towns by the name they go by
const RACE_NAMES = [
  [/daytona 500|daytona|^duel\b/i, 'Daytona Beach', 'Florida', 'Daytona International Speedway'],
  [/coca-cola 600|charlotte|roval/i, 'Concord', 'North Carolina', 'Charlotte Motor Speedway'],
  [/brickyard|indianapolis 500|indy 500|indianapolis/i, 'Speedway', 'Indiana', 'Indianapolis Motor Speedway'],
  [/southern 500|darlington/i, 'Darlington', 'South Carolina', 'Darlington Raceway'],
  [/all[- ]star race|north wilkesboro/i, 'North Wilkesboro', 'North Carolina', 'North Wilkesboro Speedway'],
  [/bowman gray/i, 'Winston-Salem', 'North Carolina', 'Bowman Gray Stadium'],
  [/atlanta/i, 'Hampton', 'Georgia', 'EchoPark Speedway'], [/phoenix/i, 'Avondale', 'Arizona', 'Phoenix Raceway'],
  [/circuit of the americas|cota/i, 'Austin', 'Texas', 'Circuit of the Americas'], [/talladega/i, 'Lincoln', 'Alabama', 'Talladega Superspeedway'],
  [/texas/i, 'Fort Worth', 'Texas', 'Texas Motor Speedway'], [/kansas/i, 'Kansas City', 'Kansas', 'Kansas Speedway'],
  [/nashville superspeedway/i, 'Lebanon', 'Tennessee', 'Nashville Superspeedway'], [/michigan/i, 'Brooklyn', 'Michigan', 'Michigan International Speedway'],
  [/pocono/i, 'Long Pond', 'Pennsylvania', 'Pocono Raceway'], [/sonoma/i, 'Sonoma', 'California', 'Sonoma Raceway'],
  [/iowa/i, 'Newton', 'Iowa', 'Iowa Speedway'], [/watkins glen/i, 'Watkins Glen', 'New York', 'Watkins Glen International'],
  [/gateway|world wide technology raceway/i, 'Madison', 'Illinois', 'World Wide Technology Raceway'],
  [/new hampshire/i, 'Loudon', 'New Hampshire', 'New Hampshire Motor Speedway'], [/homestead|miami/i, 'Homestead', 'Florida', 'Homestead-Miami Speedway'],
  [/bristol/i, 'Bristol', 'Tennessee', 'Bristol Motor Speedway'], [/martinsville/i, 'Ridgeway', 'Virginia', 'Martinsville Speedway'],
  [/richmond/i, 'Richmond', 'Virginia', 'Richmond Raceway'], [/dover/i, 'Dover', 'Delaware', 'Dover Motor Speedway'],
  [/las vegas/i, 'Las Vegas', 'Nevada', 'Las Vegas Motor Speedway'], [/mexico city/i, 'Mexico City', 'Mexico', 'Autódromo Hermanos Rodríguez'],
  [/chicago/i, 'Chicago', 'Illinois', 'Chicago Street Course'], [/san diego|coronado/i, 'San Diego', 'California', 'Naval Base Coronado street course'],
  [/rockingham/i, 'Rockingham', 'North Carolina', 'Rockingham Speedway'],
  [/st\.? petersburg/i, 'St. Petersburg', 'Florida', 'Streets of St. Petersburg'], [/thermal/i, 'Thermal', 'California', 'The Thermal Club'],
  [/long beach/i, 'Long Beach', 'California', 'Streets of Long Beach'], [/alabama|barber/i, 'Birmingham', 'Alabama', 'Barber Motorsports Park'],
  [/detroit/i, 'Detroit', 'Michigan', 'Streets of Detroit'], [/road america/i, 'Elkhart Lake', 'Wisconsin', 'Road America'],
  [/mid-ohio/i, 'Lexington', 'Ohio', 'Mid-Ohio Sports Car Course'], [/toronto/i, 'Toronto', 'Canada', 'Exhibition Place'],
  [/monterey|laguna seca/i, 'Monterey', 'California', 'WeatherTech Raceway Laguna Seca'], [/portland/i, 'Portland', 'Oregon', 'Portland International Raceway'],
  [/milwaukee/i, 'West Allis', 'Wisconsin', 'Milwaukee Mile'], [/nashville/i, 'Nashville', 'Tennessee', 'Nashville street course'],
  [/arlington/i, 'Arlington', 'Texas', 'Arlington street course'], [/washington|freedom 250/i, 'Washington', 'District of Columbia', 'Washington street course'],
  [/markham|ontario/i, 'Markham', 'Canada', 'Markham street course'],
  [/illinois/i, 'Madison', 'Illinois', 'World Wide Technology Raceway']
];
const TENNIS = [
  [/australian open/i, 'Melbourne', 'Australia', 'Melbourne Park'], [/roland garros|french open/i, 'Paris', 'France', 'Stade Roland Garros'],
  [/wimbledon/i, 'London', 'United Kingdom', 'All England Club'], [/^us open|u\.s\. open/i, 'New York', 'New York', 'USTA Billie Jean King National Tennis Center'],
  [/atp finals/i, 'Turin', 'Italy', 'Inalpi Arena'], [/wta finals/i, 'Riyadh', 'Saudi Arabia', ''], [/next gen/i, 'Jeddah', 'Saudi Arabia', ''],
  [/united cup/i, 'Sydney', 'Australia', 'Ken Rosewall Arena'], [/brisbane/i, 'Brisbane', 'Australia', 'Queensland Tennis Centre'],
  [/hong kong/i, 'Hong Kong', 'Hong Kong', 'Victoria Park'], [/adelaide/i, 'Adelaide', 'Australia', 'Memorial Drive'],
  [/asb classic|auckland/i, 'Auckland', 'New Zealand', 'ASB Tennis Centre'], [/hobart/i, 'Hobart', 'Australia', 'Domain Tennis Centre'],
  [/occitanie|montpellier/i, 'Montpellier', 'France', 'Sud de France Arena'], [/dallas open/i, 'Dallas', 'Texas', 'Ford Center at The Star'],
  [/abn amro|rotterdam/i, 'Rotterdam', 'Netherlands', 'Rotterdam Ahoy'], [/argentina open|buenos aires/i, 'Buenos Aires', 'Argentina', 'Buenos Aires Lawn Tennis Club'],
  [/dubai/i, 'Dubai', 'United Arab Emirates', 'Dubai Duty Free Tennis Stadium'], [/qatar|doha/i, 'Doha', 'Qatar', 'Khalifa International Tennis Complex'],
  [/delray beach/i, 'Delray Beach', 'Florida', 'Delray Beach Tennis Center'], [/rio open/i, 'Rio de Janeiro', 'Brazil', 'Jockey Club Brasileiro'],
  [/chile open|santiago/i, 'Santiago', 'Chile', ''], [/abierto mexicano|acapulco/i, 'Acapulco', 'Mexico', 'Arena GNP Seguros'],
  [/bnp paribas open|indian wells/i, 'Indian Wells', 'California', 'Indian Wells Tennis Garden'], [/miami open/i, 'Miami Gardens', 'Florida', 'Hard Rock Stadium'],
  [/american tennis open miami/i, 'Miami', 'Florida', ''], [/hassan ii|marrakech/i, 'Marrakesh', 'Morocco', ''],
  [/clay court championship|houston/i, 'Houston', 'Texas', 'River Oaks Country Club'], [/tiriac|bucharest/i, 'Bucharest', 'Romania', ''],
  [/monte-carlo|monte carlo/i, 'Roquebrune-Cap-Martin', 'France', 'Monte-Carlo Country Club'], [/bmw open|munich/i, 'Munich', 'Germany', 'MTTC Iphitos'],
  [/barcelona open/i, 'Barcelona', 'Spain', 'Real Club de Tenis Barcelona'], [/madrid open/i, 'Madrid', 'Spain', 'Caja Mágica'],
  [/internazionali|italian open|rome/i, 'Rome', 'Italy', 'Foro Italico'], [/geneva/i, 'Geneva', 'Switzerland', ''],
  [/hamburg/i, 'Hamburg', 'Germany', 'Am Rothenbaum'], [/boss open|stuttgart|porsche/i, 'Stuttgart', 'Germany', ''],
  [/libéma|libema|hertogenbosch/i, "'s-Hertogenbosch", 'Netherlands', ''], [/terra wortmann|halle/i, 'Halle', 'Germany', 'OWL Arena'],
  [/hsbc championships|queen'?s club/i, 'London', 'United Kingdom', "Queen's Club"], [/mallorca/i, 'Santa Ponsa', 'Spain', ''],
  [/eastbourne/i, 'Eastbourne', 'United Kingdom', 'Devonshire Park'], [/gstaad/i, 'Gstaad', 'Switzerland', ''],
  [/umag|croatia open/i, 'Umag', 'Croatia', ''], [/nordea|båstad|bastad/i, 'Båstad', 'Sweden', ''], [/kitzb/i, 'Kitzbühel', 'Austria', ''],
  [/dc open|washington/i, 'Washington', 'District of Columbia', 'Rock Creek Park Tennis Center'],
  [/national bank open|canadian open/i, 'Montreal', 'Canada', 'IGA Stadium'], [/cincinnati/i, 'Mason', 'Ohio', 'Lindner Family Tennis Center'],
  [/winston-salem/i, 'Winston-Salem', 'North Carolina', 'Wake Forest Tennis Complex'], [/chengdu/i, 'Chengdu', 'China', ''],
  [/hangzhou/i, 'Hangzhou', 'China', ''], [/china open|beijing/i, 'Beijing', 'China', 'National Tennis Center'],
  [/japan open|tokyo/i, 'Tokyo', 'Japan', 'Ariake Coliseum'], [/shanghai/i, 'Shanghai', 'China', 'Qizhong Forest Sports City Arena'],
  [/stockholm/i, 'Stockholm', 'Sweden', ''], [/european open|antwerp/i, 'Antwerp', 'Belgium', ''], [/almaty/i, 'Almaty', 'Kazakhstan', ''],
  [/swiss indoors|basel/i, 'Basel', 'Switzerland', 'St. Jakobshalle'], [/erste bank|vienna/i, 'Vienna', 'Austria', 'Wiener Stadthalle'],
  [/paris masters|rolex paris/i, 'Nanterre', 'France', 'Paris La Défense Arena'], [/moselle|metz/i, 'Metz', 'France', ''],
  [/athens|hellenic/i, 'Athens', 'Greece', ''], [/limoges/i, 'Limoges', 'France', ''], [/transylvania|cluj/i, 'Cluj-Napoca', 'Romania', ''],
  [/abu dhabi/i, 'Abu Dhabi', 'United Arab Emirates', ''], [/ostrava/i, 'Ostrava', 'Czechia', ''], [/linz/i, 'Linz', 'Austria', ''],
  [/atx open|austin/i, 'Austin', 'Texas', ''], [/mérida|merida/i, 'Mérida', 'Mexico', ''], [/charleston/i, 'Charleston', 'South Carolina', 'Credit One Stadium'],
  [/colsanitas|bogot/i, 'Bogotá', 'Colombia', ''], [/rouen/i, 'Rouen', 'France', ''], [/lalla meryem|rabat/i, 'Rabat', 'Morocco', ''],
  [/strasbourg/i, 'Strasbourg', 'France', ''], [/berlin/i, 'Berlin', 'Germany', 'Steffi Graf Stadium'], [/nottingham/i, 'Nottingham', 'United Kingdom', ''],
  [/bad homburg/i, 'Bad Homburg', 'Germany', ''], [/birmingham/i, 'Birmingham', 'United Kingdom', 'Edgbaston Priory Club'],
  [/iasi/i, 'Iași', 'Romania', ''], [/prague/i, 'Prague', 'Czechia', ''], [/palermo/i, 'Palermo', 'Italy', ''],
  [/monterrey/i, 'Monterrey', 'Mexico', ''], [/guadalajara/i, 'Guadalajara', 'Mexico', ''], [/cleveland|tennis in the land/i, 'Cleveland', 'Ohio', ''],
  [/korea open|seoul/i, 'Seoul', 'South Korea', ''], [/wuhan/i, 'Wuhan', 'China', ''], [/ningbo/i, 'Ningbo', 'China', ''],
  [/pan pacific/i, 'Tokyo', 'Japan', ''], [/osaka/i, 'Osaka', 'Japan', ''], [/guangzhou/i, 'Guangzhou', 'China', ''],
  [/singapore/i, 'Singapore', 'Singapore', ''], [/chennai/i, 'Chennai', 'India', ''], [/jiangxi|jiujiang/i, 'Jiujiang', 'China', '']
];
const placeFrom = (table, name, y) => {
  const hit = table.find(r => r[0].test(name) && (!r[4] || r[4] === y)) || table.find(r => r[0].test(name) && !r[4]);
  return hit ? { city: hit[1], region: hit[2], venue: hit[3] } : null;
};

// ── 1) Event lists ──
const events = [];
const seen = new Set();
async function eventDetail(sport, league, ref) {
  const id = String(ref).match(/events\/(\d+)/)?.[1] || ref;
  if (seen.has(`${league}:${id}`)) return null;
  seen.add(`${league}:${id}`);
  return getJSON(`${CORE}/${sport}/leagues/${league}/events/${id}?lang=en&region=us`).catch(() => null);
}
for (const [key, label, sport, league] of TOURS) {
  const before = events.length;
  if (sport === 'tennis') {
    // Tennis lists tournaments by day, each with its city: sample every 4 days over the coming months
    for (let k = -10; k < 240; k += 4) {
      const day = new Date(Date.now() + k * 86400000).toISOString().slice(0, 10).replaceAll('-', '');
      const d = await getJSON(`${SITE}/${sport}/${league}/scoreboard?dates=${day}`).catch(() => ({}));
      for (const e of d.events || []) {
        if (seen.has(`${league}:${e.id}`)) continue;
        seen.add(`${league}:${e.id}`);
        const parts = String(e.venue?.displayName || '').split(',').map(s => s.trim()).filter(Boolean);
        const fromEspn = parts.length >= 2 ? { city: parts[parts.length - 2], region: parts[parts.length - 1], venue: parts.length > 2 ? parts.slice(0, -2).join(', ') : '' } : null;
        const fromTable = placeFrom(TENNIS, e.name, +(e.date || '').slice(0, 4));
        events.push({ key, label, id: e.id, name: e.name, start: e.date, end: e.endDate || e.date, timeValid: false,
          place: fromEspn ? { ...fromEspn, venue: fromEspn.venue || fromTable?.venue || '' } : fromTable, major: !!e.major });
      }
    }
  } else {
    // Golf and racing: this season and next, from the season lists
    for (const y of [year, year + 1]) {
      const list = await getJSON(`${CORE}/${sport}/leagues/${league}/seasons/${y}/types/2/events?lang=en&region=us&limit=200`).catch(() => ({}));
      for (const item of list.items || []) {
        const e = await eventDetail(sport, league, item.$ref);
        if (!e) continue;
        const y2 = +(e.date || '').slice(0, 4) || y;
        let place = sport === 'golf' ? placeFrom(GOLF, e.name, y2) : league === 'f1' ? placeFrom(F1, e.name, y2) : placeFrom(RACE_NAMES, e.name, y2);
        // NASCAR names like "NASCAR Cup Series at Atlanta"
        if (!place && sport === 'racing') { const at = e.name.match(/\bat ([A-Z][\w .'-]+)$/); if (at) place = placeFrom(RACE_NAMES, at[1], y2); }
        // racing: the race itself, not practice or qualifying
        const race = (e.competitions || []).find(c => /race/i.test(c.type?.abbreviation || c.type?.name || c.type?.text || '')) || e.competitions?.slice(-1)[0];
        events.push({ key, label, id: e.id, name: e.name, start: sport === 'racing' ? (race?.date || e.date) : e.date,
          end: sport === 'racing' ? (race?.date || e.endDate || e.date) : (e.endDate || e.date),
          timeValid: sport === 'racing' && race?.timeValid !== false && !!race?.date, place, major: false });
        await sleep(60);
      }
    }
  }
  console.log(`${label}: ${events.length - before} events`);
}

// ── 2) Place each event and find its airports ──
const outPath = here('../data/events.json');
const old = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { events: [] };
const oldPlaces = new Map((old.events || []).filter(e => e.lat != null).map(e => [`${e.city}|${e.region}`, [e.lat, e.lon, e.tz]]));
const geo = new Map();
async function locate(p) {
  const key = `${p.city}|${p.region}`;
  if (oldPlaces.has(key)) { const [lat, lon, tz] = oldPlaces.get(key); return { lat, lon, tz }; }
  if (geo.has(key)) return geo.get(key);
  const search = name => getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=50&language=en`).catch(() => ({}));
  let d = await search(p.city);
  if (!(d.results || []).length && /^St\.? /.test(p.city)) d = await search(p.city.replace(/^St\.? /, 'Saint '));
  const r = (p.region || '').toLowerCase().replace(/^usa$/, 'united states');
  const hits = d.results || [];
  const hit = hits.find(h => [h.admin1, h.country].some(x => (x || '').toLowerCase() === r))
    || hits.find(h => r && ((h.country || '').toLowerCase().includes(r) || r.includes((h.country || '').toLowerCase()))) || (r ? null : hits[0]) || hits[0];
  const loc = hit ? { lat: +hit.latitude.toFixed(3), lon: +hit.longitude.toFixed(3), tz: hit.timezone } : null;
  geo.set(key, loc);
  await sleep(120);
  return loc;
}
const ap = JSON.parse(readFileSync(here('../data/airports.json'), 'utf8'));
const rad = x => x * Math.PI / 180;
const miles = (aLat, aLon, bLat, bLon) => {
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
};
const BIG = new Set('ATL BOS BWI CLT DCA DEN DFW DAL DTW EWR FLL HOU IAD IAH JFK LAS LAX LGA MCO MDW MIA MSP ORD PDX PHL PHX SAN SEA SFO SLC STL BNA AUS OAK SMF MSY SAT MCI CLE PIT IND CMH CVG RDU MKE TPA MEM SDF JAX ABQ OMA BUF SJC RSW PBI YYZ YUL YVR LHR LGW MAD BCN FRA MUC CDG DUB MEX GRU SYD MEL DXB DOH SIN HND NRT ICN PEK PVG FCO MXP AMS ZRH VIE BRU'.split(' '));
const airportsOut = {};
const unplaced = [];
const out = [];
for (const e of events) {
  const row = { k: e.key, t: e.label, id: e.id, n: e.name, s: e.start, e: e.end, tv: e.timeValid, m: e.major };
  if (e.place) {
    Object.assign(row, { city: e.place.city, region: e.place.region, v: e.place.venue });
    const loc = await locate(e.place);
    if (loc) {
      const near = ap.list.filter(a => Math.abs(a[4] - loc.lat) < 4 && Math.abs(a[5] - loc.lon) < 6)
        .map(a => ({ a, mi: miles(loc.lat, loc.lon, a[4], a[5]) })).sort((x, y) => x.mi - y.mi);
      const picks = near.slice(0, 1);
      const big = near.find(x => BIG.has(x.a[0]) && x.mi <= 170);
      if (big && big !== picks[0]) picks.push(big);
      for (const { a } of picks) airportsOut[a[0]] = [a[1], a[4], a[5], ap.zones[a[6]]];
      Object.assign(row, { lat: loc.lat, lon: loc.lon, tz: loc.tz, ap: picks.map(p => [p.a[0], Math.round(p.mi)]) });
    } else unplaced.push(`${e.label}: ${e.name} (${e.place.city}, ${e.place.region} not found)`);
  } else unplaced.push(`${e.label}: ${e.name}`);
  out.push(row);
}
out.sort((a, b) => a.s.localeCompare(b.s));
writeFileSync(outPath, JSON.stringify({ updated: new Date().toISOString(), airports: airportsOut, events: out }));
console.log(`Wrote ${out.length} events; ${unplaced.length} without a location`);
if (unplaced.length) console.log('Not placed:\n  ' + unplaced.join('\n  '));
