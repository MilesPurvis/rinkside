import { useState, useEffect } from 'react';
import { fetchEventHub, fetchEventVideos, fetchTeamHub, parseGames } from '../api/flo';
import LivePlayer from '../components/LivePlayer';
import GameCenter from '../components/GameCenter';
import ReplayCard from '../components/ReplayCard';
import './Game.css';

export default function Game({ eventId }) {
  const [event, setEvent] = useState(null);
  const [replays, setReplays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    load();
  }, [eventId]);

  async function load() {
    const data = await fetchEventHub(eventId);
    setEvent(data);

    // Find related events for both teams via aggregated node IDs
    // These include both team IDs from the ad targeting data
    const targeting = data?.adTargeting || data?.header?.adTargeting || {};
    const nodeIds = targeting?.aggregatedNodeIds || [];
    // Team IDs are typically 8-digit numbers, events are also 8-digit but we filter by fetching team hubs
    // Fetch team schedules in parallel to find all concluded matchups
    const teamIds = nodeIds.filter(id => id !== Number(eventId));

    try {
      const teamResults = await Promise.allSettled(
        teamIds.map(id => fetchTeamHub(id).then(d => parseGames(d)).catch(() => []))
      );

      // Collect all unique concluded event IDs from both teams
      const concludedIds = new Set();
      for (const result of teamResults) {
        if (result.status !== 'fulfilled') continue;
        for (const game of result.value) {
          if (game.status === 'CONCLUDED' && game.eventId) {
            concludedIds.add(game.eventId);
          }
        }
      }

      // Fetch videos for all concluded events in parallel
      const videoResults = await Promise.allSettled(
        [...concludedIds].map(async (eid) => {
          const vData = await fetchEventVideos(eid);
          const items = vData?.container?.content?.items || [];
          return items.map(item => ({
            title: item.title || '',
            duration: item.label1 || '',
            image: item.previewImage?.url || '',
            nodeId: item.action?.analytics?.nodeId,
            gameDate: '',
          }));
        })
      );

      const allReplays = videoResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(v => v.nodeId);

      // Dedupe by nodeId
      const seen = new Set();
      setReplays(allReplays.filter(v => {
        if (seen.has(v.nodeId)) return false;
        seen.add(v.nodeId);
        return true;
      }));
    } catch {
      setReplays([]);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="game-page">
        <nav className="game-nav">
          <a href="#/" className="back-link">← All Streams</a>
        </nav>
        <div className="game-content">
          <div className="loading"><div className="spinner" /><br />Loading game...</div>
        </div>
      </div>
    );
  }

  const metadata = event?.metadata || {};
  const header = event?.header || {};
  const seo = event?.seo || {};
  const streams = metadata.streams || [];
  const activeStream = streams.find(s => s.streamActive) || streams[0];
  const isLive = metadata.liveEventStatus === 'LIVE';
  const assetUrl = metadata.assetUrl || seo.imageUrl || '';

  // Parse title from SEO or header
  const title = seo.title?.replace(/ - FloHockey.*$/, '') || header?.nav?.title || '';

  // Get game center iframe
  const htmlView = (event?.container?.items || []).find(i => i.type === 'html-view');
  const iframeSrc = htmlView?.htmlContent?.match(/src="([^"]+)"/)?.[1];

  // Parse team names from title (e.g. "2026 Elmira Sugar Kings vs St. Marys Lincolns")
  const titleClean = title.replace(/^\d{4}\s+/, '');
  const teamNames = titleClean.split(/\s+vs\s+/i);
  const team1 = teamNames[0] || '';
  const team2 = teamNames[1] || '';


  // Parse venue from header summary or banner
  const summaryItems = header?.summary?.items || [];
  const timeText = summaryItems.find(i => i.style === 'standard' && i.text?.includes('•'))?.text || '';
  const drillLinks = header?.drillThroughLinks || [];
  const leagueName = drillLinks[0]?.title || '';

  return (
    <div className="game-page">
      <nav className="game-nav">
        <a href="#/" className="back-link">← All Streams</a>
        {leagueName && <span className="nav-league">{leagueName}</span>}
      </nav>

      <div className="game-content">
        {/* Matchup header */}
        <div className="matchup-header">
          {assetUrl && <img src={assetUrl} alt={title} className="matchup-banner" />}
          <div className="matchup-info">
            <div className="matchup-teams">
              <span className="matchup-team">{team1}</span>
              <span className="matchup-vs">vs</span>
              <span className="matchup-team">{team2}</span>
            </div>
            <div className="matchup-meta">
              {isLive && <span className="badge live">LIVE</span>}
              {timeText && <span className="matchup-time">{timeText}</span>}
            </div>
          </div>
        </div>

        {/* Live stream */}
        {isLive && activeStream && (
          <LivePlayer
            streamId={activeStream.streamId || activeStream.stream_id}
            title={title}
          />
        )}

        {/* Multi-stream selector */}
        {isLive && streams.length > 1 && (
          <StreamSelector streams={streams} eventId={eventId} />
        )}

        {/* Game Center */}
        <GameCenter iframeSrc={iframeSrc} />

        {/* Replays */}
        {replays.length > 0 && (
          <div className="section">
            <div className="section-label">Replays</div>
            <div className="replays-list">
              {replays.map(v => <ReplayCard key={v.nodeId} video={v} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StreamSelector({ streams }) {
  // For now just show available streams as info
  if (streams.length <= 1) return null;
  return (
    <div className="stream-selector">
      {streams.map(s => (
        <span key={s.streamId || s.stream_id} className="stream-option">
          {s.streamName || s.stream_name}
        </span>
      ))}
    </div>
  );
}
