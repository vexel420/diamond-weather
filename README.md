# Diamond Weather

Pick the game by the forecast, the ride in from the airport, and whether you can fly there and back in a day.
Covers MLB, Triple-A, the NHL, the NBA, the NFL and top-division (FBS) college football.

A static site: no build step and no server. Open `index.html` through any web server, or publish the folder with GitHub Pages.

## Where the data comes from

| What | Source | Notes |
| --- | --- | --- |
| MLB and Triple-A schedules | MLB Stats API | Loaded live in the browser |
| NBA, NFL and college football schedules | ESPN's public scoreboard feed | Loaded live in the browser. It is unofficial and undocumented, so ESPN could change it without notice. It also carries a "tickets from" price from Vivid Seats. |
| NBA, NFL and college venue locations | `data/venues.json` | ESPN names each venue's city but not its coordinates, so `scripts/build-venues.mjs` looks each city up with Open-Meteo's geocoder and finds the nearest airports. A GitHub Action refreshes it weekly. Venues missing from the file are looked up in the browser. |
| NHL schedule | NHL schedule service | The NHL does not allow requests from web pages, so `scripts/build-nhl.mjs` saves it to `data/nhl.json`. A GitHub Action refreshes it daily. |
| Weather | Open-Meteo | Hourly forecast up to 16 days out. Beyond that, what is typical for the week over the past three years. |
| Ticket prices | SeatGeek | Needs a free client ID, entered in Trip settings. Stored only in the browser. |
| Transit notes, airline hubs | `js/data.js` | Written by hand for MLB, Triple-A, NHL, NBA and NFL venues. College venues get the nearest airports and a drive estimate instead. Edit this file to correct a route. |
| Home airport list | `data/airports.json` | About 3,270 airports with airline service worldwide, from OurAirports (public domain) plus small US airports added by hand. Rebuilt with `scripts/build-airports.py`. |

## Flight estimates

Trip labels (Day trip, Fly in that day, Go the day before) are estimates from great-circle distance, typical
ground times and each airline's hub list. They are not built from airline schedules or seat availability.

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository: Settings, Pages, set Source to "Deploy from a branch", branch `main`, folder `/ (root)`.
3. In Settings, Actions, General, set Workflow permissions to "Read and write" so the daily NHL refresh and the weekly venue refresh can save their updates.

## After changing a file

Browsers hold on to old copies of the scripts. When you change anything in `js/`, `css/` or `data/airports.json`,
raise the `?v=` number in `index.html`, `js/app.js` and `js/core.js` (it must be the same number everywhere).

## Run locally

    python3 -m http.server 8000

Then open http://localhost:8000.
