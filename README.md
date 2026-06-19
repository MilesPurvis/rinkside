# 🏒 Rinkside

A clean React front-end for browsing and watching live hockey streams and replays from **FloHockey / FloSports**, without the noise of the official site.

Built with **React 19 + Vite**. Streams play in-browser via [hls.js](https://github.com/video-dev/hls.js).

## Features

- 📺 **All live games in one grid** — pulls from every FloHockey league, not just the 12 the official watch page shows
- 🏆 **League filter** — AHL, ECHL, OHL, QMJHL, USHL, SPHL, SHL, and the smaller junior leagues (GOHL, BCHL, AJHL, …)
- ▶️ **Built-in player** — HLS playback with a lightweight custom UI
- 🎬 **Game center** — open any game for its streams and replays
- 🔄 **Live refresh** — re-poll for the current set of live events

## Quick start

```sh
git clone git@github.com:MilesPurvis/rinkside.git
cd rinkside
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```sh
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint     # eslint
```

## How it works

The FloHockey API restricts CORS to `https://www.flohockey.tv`, so the Vite dev
server proxies API calls and injects the required origin/headers:

- `/api/*` → `https://api.flohockey.tv` (watch page, league/team/event hubs, video details)
- `/live-api/*` → `https://live-api-3.flosports.tv` (live stream preview tokens)

The watch endpoint caps its `live-and-upcoming` section at 12 items and omits the
smaller leagues entirely, so Rinkside also queries each league's entity-hub
directly and merges the results to surface **every** live game.

See [`API.md`](./API.md) for the full endpoint reference (base URLs, required
headers, response shapes, and routing IDs).

## Project layout

```
src/
  App.jsx              Hash-based router (Watch ↔ Game)
  api/flo.js           FloHockey/FloSports API client + league IDs + parsers
  pages/
    Watch.jsx          All live streams, grouped/filtered by league
    Game.jsx           Single game: streams + replays
    Team.jsx           Team schedule
  components/
    StreamCard.jsx     Live stream tile
    GameCenter.jsx     Game detail view
    LivePlayer.jsx     hls.js video player
    ReplayCard.jsx     VOD replay tile
    Schedule.jsx       Date-grouped schedule rows
  hooks/useHls.js      hls.js lifecycle hook
vite.config.js         Dev proxy (origin/header injection for FloHockey)
```

## Tech stack

React 19 · Vite · hls.js · vanilla CSS

## Disclaimer

This is a personal project that consumes FloSports' public API endpoints. The
endpoints it relies on return premium content without authentication; this was
[responsibly disclosed](./DISCLOSURE.md) to FloSports. Use it only for content
you're entitled to watch.
