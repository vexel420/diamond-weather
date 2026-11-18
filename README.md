# Diamond Weather

Pick the game by the forecast, the ride in from the airport, and whether you can fly there and back in a day.
Two tabs:

- **Professional:** MLB, Triple-A, NHL, NBA, NFL, MLS, WNBA, NWSL, golf (PGA Tour, LPGA), tennis (ATP, WTA) and racing (F1, NASCAR Cup, IndyCar).
- **College:** FBS and FCS football, men's and women's Division I basketball, men's hockey and baseball, with a conference filter.

A static site: no build step and no server. Open `index.html` through any web server, or publish the folder with GitHub Pages.

## Where the data comes from

| What | Source | Notes |
| --- | --- | --- |
| MLB and Triple-A schedules | MLB Stats API | Loaded live in the browser |
| NBA, NFL, MLS, WNBA, NWSL and college schedules | ESPN's public scoreboard feed | Loaded live in the browser. It is unofficial and undocumented, so ESPN could change it without notice. It also carries a "tickets from" price from Vivid Seats, used for NHL and MLB games too. |
| Golf, tennis and racing | `data/events.json` | `scripts/build-events.mjs` reads each tour's season from ESPN. ESPN rarely says where these events are, so locations come from ESPN's city (tennis), the race name (NASCAR, IndyCar) or hand-written tables in the script (golf, F1, upcoming tennis). Events it cannot place still show, without weather or airports, and the script lists them. Refreshed weekly. |
| College conferences | `data/conferences.json` | Each college team's conference per sport, from ESPN's conference lists, saved by `scripts/build-venues.mjs`. |
| Venue locations for ESPN sports | `data/venues.json` | ESPN names each venue's city but not its coordinates, so `scripts/build-venues.mjs` looks each city up with Open-Meteo's geocoder and finds the nearest airports in the same country. A GitHub Action refreshes it weekly. Venues missing from the file are looked up in the browser. ESPN gives no venue for most college baseball games, so those use the home school's campus. |
| Team logos | ESPN; Triple-A from MLB | `data/logos.json` maps NHL and MLB teams to ESPN's logos (`scripts/build-logos.mjs`, refreshed weekly). The page trims each logo's empty space and draws them all at the same size. |
| NHL schedule | NHL schedule service | The NHL does not allow requests from web pages, so `scripts/build-nhl.mjs` saves it to `data/nhl.json`. A GitHub Action refreshes it daily. |
| Weather | Open-Meteo | Hourly forecast with feels-like temperature, up to 16 days out. Beyond that, what is typical for the week over the past three years. Indoor games skip the forecast to stay within Open-Meteo's free limits. |
| Ticket prices | SeatGeek | Needs a free client ID, entered in Trip settings. Stored only in the browser. |
| Transit notes, airline hubs | `js/data.js` | Written by hand for MLB, Triple-A, NHL, NBA and NFL venues, and for about 90 college venues with real transit (`VENUE_NOTES`, by ESPN venue id). Every other venue gets its nearest airports and a drive estimate. Edit this file to correct a route. |
| Home airport list | `data/airports.json` | About 3,270 airports with airline service worldwide, from OurAirports (public domain) plus small US airports added by hand. Rebuilt with `scripts/build-airports.py`. |

## Flight estimates

Trip labels (Day trip, Fly in that day, Go the day before) are estimates from great-circle distance, typical
ground times and each airline's hub list. They are not built from airline schedules or seat availability.

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository: Settings, Pages, set Source to "Deploy from a branch", branch `main`, folder `/ (root)`.
3. In Settings, Actions, General, set Workflow permissions to "Read and write" so the daily NHL refresh and the weekly venue and event refresh can save their updates.

## After changing a file

Browsers hold on to old copies of the scripts. When you change anything in `js/`, `css/` or `data/airports.json`,
raise the `?v=` number in `index.html`, `js/app.js` and `js/core.js` (it must be the same number everywhere).

## Run locally

    python3 -m http.server 8000

Then open http://localhost:8000.
