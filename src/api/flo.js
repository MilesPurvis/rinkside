const FLO_PARAMS = 'version=1.33.2&tz=America/Toronto&site_id=29';

// All known FloHockey league IDs — the watch page only shows a subset
const LEAGUES = [
  { id: 10826833, name: 'AHL',   full: 'American Hockey League' },
  { id: 10824633, name: 'ECHL',  full: 'ECHL' },
  { id: 10826825, name: 'OHL',   full: 'Ontario Hockey League' },
  { id: 10826800, name: 'QMJHL', full: 'Ligue de Hockey Junior Maritimes Quebec' },
  { id: 10826743, name: 'USHL',  full: 'United States Hockey League' },
  { id: 10826834, name: 'SPHL',  full: 'Southern Professional Hockey League' },
  { id: 12843322, name: 'SHL',   full: 'Swedish Hockey League' },
  { id: 10826758, name: 'GOHL',  full: 'Greater Ontario Hockey League' },
  { id: 10826751, name: 'BCHL',  full: 'British Columbia Hockey League' },
  { id: 10826763, name: 'AJHL',  full: 'Alberta Junior Hockey League' },
  { id: 10826768, name: 'SJHL',  full: 'Saskatchewan Junior Hockey League' },
  { id: 10826773, name: 'MJHL',  full: 'Manitoba Junior Hockey League' },
  { id: 10826778, name: 'NOJHL', full: 'Northern Ontario Junior Hockey League' },
  { id: 10826783, name: 'CCHL',  full: 'Central Canada Hockey League' },
  { id: 10826788, name: 'MHL',   full: 'Maritime Hockey League' },
  { id: 10826793, name: 'LNAH',  full: 'Ligue Nord-Americaine de Hockey' },
];

export { LEAGUES };

export async function fetchWatch(limit = 50) {
  const res = await fetch(`/api/experiences/web/watch?version=1.7.82&limit=${limit}&offset=0&site_id=29&filterSiteIds=29`);
  return res.json();
}

export async function fetchLeagueHub(leagueId) {
  const res = await fetch(`/api/experiences/web/entity-hub/${leagueId}?${FLO_PARAMS}&enableMultiday=true`);
  return res.json();
}

export async function fetchTeamHub(teamId) {
  const res = await fetch(`/api/experiences/web/entity-hub/${teamId}?${FLO_PARAMS}&enableMultiday=true`);
  return res.json();
}

export async function fetchEventHub(eventId) {
  const res = await fetch(`/api/experiences/web/event-hub/${eventId}?${FLO_PARAMS}`);
  return res.json();
}

export async function fetchEventVideos(eventId) {
  const res = await fetch(`/api/experiences/web/event-hub/${eventId}/videos?${FLO_PARAMS}`);
  return res.json();
}

export async function fetchVideoDetail(videoId) {
  const res = await fetch(`/api/experiences/web/partials/video/${videoId}?version=1.33.2&tz=America/Toronto`);
  return res.json();
}

export async function fetchPreviewToken(streamId) {
  const res = await fetch(`/live-api/streams/${streamId}/tokens/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adTracking: { appName: 'flosports-web' } }),
  });
  const data = await res.json();
  return data?.data?.uri || null;
}

// Parse games from entity-hub response
export function parseGames(data) {
  const items = data?.container?.content?.items || [];
  const games = [];
  for (const item of items) {
    const dateTitle = item.title || '';
    for (const row of (item.rows || [])) {
      const action = row.action || {};
      const analytics = action.analytics || {};
      const cell0 = (row.cells || [])[0]?.data || {};
      const tp = cell0.textParts || {};
      games.push({
        date: dateTitle,
        title: cell0.text || analytics.name || '',
        subtitle: cell0.subText || '',
        status: tp.status || '',
        startDateTime: tp.startDateTime || '',
        url: action.url || '',
        eventId: analytics.nodeId,
      });
    }
  }
  return games;
}

// Parse live streams from watch response — scans ALL sections, dedupes by eventId
export function parseLiveStreams(data) {
  const seen = new Set();
  const results = [];

  for (const section of (data?.sections || [])) {
    for (const item of (section.items || [])) {
      const le = item.live_event || item.liveEvent;
      if (!le || le.status !== 'LIVE') continue;

      const eventId = item.node_id || item.nodeId;
      if (seen.has(eventId)) continue;
      seen.add(eventId);

      const streams = le.stream_list || [];
      results.push({
        eventId,
        title: item.title,
        shortTitle: le.short_title || item.title,
        streams: streams.map(s => ({ id: s.stream_id, name: s.stream_name, code: s.stream_code })),
        streamId: streams[0]?.stream_id,
        liveId: le.id,
        startDateTime: le.start_date_time,
        asset: item.asset?.url || item.asset || '',
        city: item.city,
        region: item.region,
        slugUri: item.slug_uri || item.slugUri,
        section: section.title || section.id,
      });
    }
  }

  return results;
}

// Fetch live games from all league entity-hubs in parallel
// Returns games the watch endpoint misses
export async function fetchAllLeagueLiveGames() {
  const results = await Promise.allSettled(
    LEAGUES.map(async (league) => {
      try {
        const data = await fetchLeagueHub(league.id);
        const games = parseGames(data);
        return games
          .filter(g => g.status === 'LIVE')
          .map(g => ({ ...g, league: league.name, leagueFull: league.full }));
      } catch {
        return [];
      }
    })
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// Merge watch streams + league live games, deduped
export async function fetchAllLiveStreams() {
  const [watchData, leagueGames] = await Promise.all([
    fetchWatch(),
    fetchAllLeagueLiveGames(),
  ]);

  const watchStreams = parseLiveStreams(watchData);

  // Merge: watch streams are richer (have stream IDs), league games fill gaps
  const seen = new Set(watchStreams.map(s => s.eventId));
  const extraGames = leagueGames.filter(g => !seen.has(g.eventId));

  // For extra games, we need to fetch event details to get stream info
  const extraStreams = await Promise.allSettled(
    extraGames.map(async (game) => {
      try {
        const eventData = await fetchEventHub(game.eventId);
        const meta = eventData?.metadata || {};
        const streams = meta.streams || [];
        if (!streams.length) return null;
        return {
          eventId: game.eventId,
          title: game.title,
          shortTitle: game.title,
          streams: streams.map(s => ({ id: s.streamId || s.stream_id, name: s.streamName || s.stream_name })),
          streamId: streams[0]?.streamId || streams[0]?.stream_id,
          liveId: meta.liveId,
          startDateTime: meta.startAt || game.startDateTime,
          asset: meta.assetUrl || '',
          city: '',
          region: '',
          slugUri: game.url,
          section: game.league || 'Other',
        };
      } catch {
        return null;
      }
    })
  );

  const extra = extraStreams
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  return [...watchStreams, ...extra];
}
