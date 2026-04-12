# FloHockey / FloSports API Reference

## Base URLs

| Service | URL | Auth |
|---|---|---|
| FloHockey API | `https://api.flohockey.tv` | None (public) |
| FloSports Live API | `https://live-api-3.flosports.tv` | None for preview tokens |
| HockeyTech Stats | `https://lscluster.hockeytech.com` | None (iframe embed) |
| HockeyTV API | `https://api.hockeytv.com` | None (public) |

## Required Headers (FloHockey)

```
x-flo-app: flosports-webapp
x-301-location: web
Accept: application/json
```

CORS restricted to `https://www.flohockey.tv` — requires a proxy for local dev.

## Required Headers (HockeyTV)

```
product_id: 1
lang_id: 1
```

CORS is `*` — works from anywhere.

---

## FloHockey Endpoints

### Watch Page — All Live Streams
```
GET /api/experiences/web/watch?version=1.7.82&limit=50&offset=0&site_id=29&filterSiteIds=29
```
Returns sections: `live-and-upcoming`, league collections (AHL, ECHL, OHL, QMJHL, USHL, SPHL, CJHL, BCHL), highlights, replays, films.

**Note:** The `live-and-upcoming` section caps at 12 items. Smaller leagues (GOHL, AJHL, etc.) are NOT included. To find all live games, also query league entity-hubs.

Each live item includes:
- `node_id` — event ID (use for game page routing)
- `live_event.stream_list[]` — stream IDs for preview tokens
- `live_event.status` — `LIVE`, `PRE-AIR`, or absent
- `asset` — matchup banner image URL
- `slug_uri` — FloHockey URL path

### Team Page
```
GET /api/experiences/web/entity-hub/{teamId}?version=1.33.2&tz=America/Toronto&site_id=29&enableMultiday=true
```
Returns team schedule grouped by date. Each game row contains:
- `cells[0].data.textParts.status` — `LIVE`, `CONCLUDED`, `PRE-AIR`
- `cells[0].data.text` — "Elmira vs St. Marys"
- `cells[0].data.subText` — "GOHL · Pyramid Recreation Centre · Saint Marys, ON"
- `action.analytics.nodeId` — event ID
- `action.url` — FloHockey event URL path

The `container.filters.tabs` array shows available months.

### League Page
```
GET /api/experiences/web/entity-hub/{leagueId}?version=1.33.2&tz=America/Toronto&site_id=29&enableMultiday=true
```
Same format as team page but shows all games across the league. Useful for finding live games the watch endpoint misses.

### Event Page (Game Detail)
```
GET /api/experiences/web/event-hub/{eventId}?version=1.33.2&tz=America/Toronto&site_id=29
```

The event ID comes from the FloHockey URL: `/events/15763120-2026-north-bay-battalion-vs-brantford-bulldogs` → event ID is `15763120`.

**Example:**
```
GET /api/experiences/web/event-hub/15763120?version=1.33.2&tz=America/Toronto&site_id=29
```

**Full response structure:**
```
httpStatus: 200
seo:
  title: "2026 North Bay Battalion vs Brantford Bulldogs - FloHockey - Hockey"
  imageUrl: "https://d2779tscntxxsw.cloudfront.net/tmis_69d3fbcce687f.png"  (matchup banner)
  canonicalUrl: "https://www.flohockey.tv/events/15763120-..."
metadata:
  liveEventStatus: "LIVE" | "PRE-AIR" | absent (concluded)
  startAt: "2026-04-08T23:00:00+00:00"
  endAt: "2026-04-09T03:59:59+00:00"
  liveId: 248080                    (used in stream codes: fo{liveId}-{streamId})
  isPremium: true
  assetUrl: "https://d2779tscntxxsw.cloudfront.net/..."  (matchup banner)
  numberOfDays: 1
  streams:
    - streamId: 354146
      streamName: "Home"
      streamCode: "fo248080-354146"
      streamActive: true
      streamType: "multiple"        (can have Home + Away streams)
container:
  items:
    - type: "html-view"             (HockeyTech game center iframe)
      htmlContent: "<iframe src=\"https://lscluster.hockeytech.com/statview/mobile/flo/ohl/#/game-center/...\">"
secondaryContainer:
  items:
    - type: "image-with-buttons"    (matchup image + CTA)
      image.url: "https://..."
      cta1: { title: "Watch Live", url: "/live/248080" }
    - type: "ad"
    - type: "expandable-text"       (event description)
header:
  summary.items:
    - text: "Tomorrow • 7:00 PM EDT"
  drillThroughLinks:
    - title: "Ontario Hockey League (OHL)"
      url: "/leagues/10826825-ontario-hockey-league-ohl"
adTargeting:
  aggregatedNodeIds: [15763120, 10316262, 10826825, 14186655]
    [0] = event ID      (15763120 - this event)
    [1] = team ID       (10316262 - North Bay or Brantford)
    [2] = league ID     (10826825 - OHL)
    [3] = team ID       (14186655 - the other team)
```

**How to get team/league IDs from an event:** Use `adTargeting.aggregatedNodeIds`. The event ID is always `[0]`, league is typically `[2]`, and the two teams are `[1]` and `[3]`. You can then fetch each team's entity-hub to get their full schedule and find related replays.

### Event Videos / Replays
```
GET /api/experiences/web/event-hub/{eventId}/videos?version=1.33.2&tz=America/Toronto&site_id=29
```
Returns replay videos for a concluded event:
- `container.content.items[]` — video list
- Each item: `title`, `label1` (duration like "3:16:59"), `previewImage.url`, `action.analytics.nodeId` (video ID)

### Video Detail (VOD Playlist)
```
GET /api/experiences/web/partials/video/{videoId}?version=1.33.2&tz=America/Toronto
```
Returns:
- `data.videoPlayer.contentMetadata.playlist` — **Direct HLS URL (CloudFront, no auth needed)**
- `data.videoPlayer.contentMetadata.isPremium` — always `true` but the playlist URL works anyway
- `data.title` — "Replay: Home - 2026 Elmira vs St. Marys | Apr 4 @ 7 PM"

**Key finding:** VOD replay URLs are completely open CloudFront HLS playlists. No tokens or auth required. They persist indefinitely.

### Navigation
```
GET /api/experiences/web/partials/navigation?version=1.33.2&site_id=29&useCoreApi=true&route=/watch
```
Returns site navigation with league links. Useful for discovering league IDs.

### Event Ticker
```
GET /api/experiences/web/partials/event-ticker?version=1.33.2&limit=15&site_id=29
```
Scrolling ticker of live/recent events. Often empty or limited.

### Search
```
GET /api/experiences/web/search?version=1.33.2&site_id=29&term={query}&limit=10
```
Search across events, teams, etc. Returns sections with results.

---

## Live Stream Token Flow

### 1. Get Preview Token
```
POST /streams/{streamId}/tokens/preview
Host: live-api-3.flosports.tv
Content-Type: application/json

{"adTracking":{"appName":"flosports-web"}}
```

Returns:
```json
{
  "data": {
    "uri": "https://live-fastly.flosports.tv/live-streams/fo247479-352760/playlist.m3u8?token=...",
    "stream": { "id": 352760, "name": "Home", "code": "fo247479-352760" },
    "adParams": { "event_name": "...", "level": "Junior B", ... }
  }
}
```

### 2. Token Expiry
| Token Type | Expiry | Notes |
|---|---|---|
| Master playlist (`.m3u8`) | ~30s (`exp` field) | Must refresh to keep discovering new segments |
| Segment playlist (`index_*.m3u8`) | ~80s | Fetched by hls.js automatically |
| Video segments (`.ts`) | ~24h | Long-lived, cached on CDN |

### 3. Quality
Preview tokens include `pv:80` — limited to low resolution. Full quality requires a paid FloHockey subscription + JWT auth in `Authorization: Bearer <token>`.

### 4. HLS Playback
Use hls.js to load the `uri` from the token response. For continuous playback, refresh the token every ~70s and call `hls.loadSource(newUrl)`.

---

## HockeyTV API (Legacy)

Base: `https://api.hockeytv.com`

### Team Info
```
GET /htv2020/team/{teamId}
```
Returns team details including `strteamlogoimageurl`, `label`, `strleaguename`, `floUrl`.

### Live & Upcoming Games
```
GET /htv2020/team/{teamId}/live_and_upcoming_games?page=1
```
Each game: `currentlyStreaming`, `homeTeam`, `visitingTeam` (with individual logo URLs), `venue`, `dateTime`.

### Completed Games
```
GET /htv2020/team/{teamId}/completed_games?page=1
```

### Team Schedule (Date Range)
```
GET /htv2020/team/{teamId}/schedule?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

### League Endpoints
```
GET /htv2020/league/{leagueId}
GET /htv2020/league/{leagueId}/live_and_upcoming_games?page=1
GET /htv2020/league/{leagueId}/completed_games?page=1
GET /htv2020/schedule_league/{leagueId}?start_date=...&end_date=...
```

### Platform (Lists All Leagues)
```
GET /htv2020/platform/1
```

### Other
```
GET /htv2020/search?term={query}
GET /htv2020/promo/{adtype}?pageType={pagetype}
GET /htv2020/schedule/elite?start_date=...&end_date=...
```

### Auth-Required (HockeyTV)
```
GET /htv2020/game/{gameId}          — requires API key
GET /htv2020/streams/{gameId}       — requires auth
GET /htv2020/clips                  — user clips
GET /htv2020/favorites              — user favorites
POST /sessions/api_key              — login
```

---

## Known FloHockey IDs

### Leagues
| ID | Name |
|---|---|
| 10826833 | AHL |
| 10824633 | ECHL |
| 10826825 | OHL |
| 10826800 | QMJHL |
| 10826743 | USHL |
| 10826834 | SPHL |
| 12843322 | SHL |
| 10826758 | GOHL |
| 10826751 | BCHL |

### Teams (Examples)
| Flo ID | HTV ID | Name |
|---|---|---|
| 10422747 | 10754 | Elmira Sugar Kings |
| 10422765 | — | St. Marys Lincolns |

### Site IDs (FloSports Verticals)

All verticals share the same API backend. Change `site_id` to get different sports. The API domain doesn't matter — `api.flohockey.tv`, `api.flobaseball.tv`, etc. all hit the same server.

| ID | Site | Status |
|---|---|---|
| 1 | FloTrack | Active |
| 2 | FloWrestling | Active |
| 4 | FloGymnastics | Active |
| 7 | FloHoops | Active |
| 8 | FloGrappling | Active |
| 10 | FloCheer | Active |
| 12 | FloElite | Active |
| 14 | FloSoftball | Active |
| 20 | Varsity | Active |
| 22 | FloVolleyball | Active |
| 23 | FloCombat | Active |
| 27 | FloMarching | Active |
| 28 | FloSwimming | Active |
| 29 | FloHockey | Active |
| 30 | FloRodeo | Active |
| 32 | FloRacing | Active |
| 33 | FloVoice | Active |
| 34 | FloRugby | Active |
| 35 | FloLive | Active |
| 36 | FloDance | Active |
| 37 | FloBikes | Active |
| 38 | FloFootball | Active |
| 41 | FloBowling | Active |
| 42 | FloBaseball | Active |
| 43 | FloFC | Active |
| 45 | FloCollege | Active |

To query a different sport, just change `site_id`:
```
GET /api/experiences/web/watch?version=1.7.82&limit=50&offset=0&site_id=2   # FloWrestling
GET /api/experiences/web/watch?version=1.7.82&limit=50&offset=0&site_id=1   # FloTrack
```

---

## FloSports Infrastructure

### Services

| Service | URL | Purpose |
|---|---|---|
| `api.flohockey.tv` | BFF API | Content, schedules, events (any `api.flo*.tv` domain works) |
| `live-api-3.flosports.tv` | Live stream tokens | Only instance that exists (1,2,4,5 are dead) |
| `live-fastly.flosports.tv` | Live CDN | HLS live stream segments via Fastly |
| `d17cyqyz9yhmep.cloudfront.net` | VOD CDN | Replay HLS playlists & segments (us-east-1 only) |
| `amg02278-...playouts.now.amagi.tv` | 24/7 Stream | Amagi playout for FloHockey 24/7 channel |
| `api.flosports.tv` | CMS | Internal CMS login (redirects to `/cms`) |
| `app30.flosports.tv` | Ad server | Serves ad-server.js and ad tracking |
| `siop.flosports.tv` | Analytics | Segment-based event tracking |
| `lscluster.hockeytech.com` | Game stats | HockeyTech game center iframe (hockey only) |
| `billing.flosports.tv` | Billing | Subscription management (204 response, needs auth) |

### Live Stream Token — Only One Type

```
POST https://live-api-3.flosports.tv/streams/{streamId}/tokens/preview
```
This is the **only** token endpoint. `/tokens/full`, `/tokens/auth`, `/tokens/subscriber`, etc. all return 404. Full-quality streams require a JWT in the `Authorization: Bearer` header, not a different endpoint.

### CDN Architecture

- **Live**: Fastly CDN (`live-fastly.flosports.tv`)
  - Master playlist: `token` expires ~30s
  - Segment playlist (`index_*.m3u8`): expires ~80s
  - Video segments (`.ts`): expire ~24h
- **VOD Replays**: CloudFront (`d17cyqyz9yhmep.cloudfront.net`)
  - **No auth required** — direct HLS URLs
  - Only `us-east-1` region works (us-west-2 returns 403)
  - Pattern: `/{region}/streams/{streamId}/playlist_{startTs}_{endTs}.m3u8`
- **24/7 Channels**: Amagi playout service
  - Separate HLS URL per channel
  - No token required

### Architecture Notes

- FloSports runs a shared platform across 25+ sports verticals
- All verticals use the same API, differentiated by `site_id`
- Frontend is Next.js, API is a "Backend for Frontend" pattern
- The BFF returns pre-rendered UI components (containers, cards, tables, grids)
- LaunchDarkly for feature flags, Segment for analytics, Sentry for errors
- Fastly for live CDN + API caching, CloudFront for VOD/static assets
- HockeyTech provides hockey-specific game stats via embedded iframes
