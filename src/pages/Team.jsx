import { useState, useEffect } from 'react';
import { fetchTeamHub, fetchEventHub, fetchEventVideos, parseGames } from '../api/flo';
import LivePlayer from '../components/LivePlayer';
import GameCenter from '../components/GameCenter';
import ReplayCard from '../components/ReplayCard';
import Schedule from '../components/Schedule';
import './Team.css';

export default function Team({ teamId, teamName, teamLogo, league }) {
  const [games, setGames] = useState([]);
  const [liveStream, setLiveStream] = useState(null);
  const [iframeSrc, setIframeSrc] = useState(null);
  const [assetUrl, setAssetUrl] = useState(null);
  const [replays, setReplays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [teamId]);

  async function load() {
    setLoading(true);
    const data = await fetchTeamHub(teamId);
    const parsed = parseGames(data);
    setGames(parsed);

    const liveGame = parsed.find(g => g.status === 'LIVE');
    if (liveGame) {
      const eventData = await fetchEventHub(liveGame.eventId);
      const meta = eventData?.metadata || {};
      const streams = meta.streams || [];
      const stream = streams.find(s => s.streamActive) || streams[0];
      setAssetUrl(meta.assetUrl || null);

      if (stream) {
        setLiveStream({ streamId: stream.streamId || stream.stream_id, title: liveGame.title });
      }

      const htmlView = (eventData?.container?.items || []).find(i => i.type === 'html-view');
      const src = htmlView?.htmlContent?.match(/src="([^"]+)"/)?.[1];
      setIframeSrc(src || null);
    } else {
      setLiveStream(null);
      setIframeSrc(null);
      setAssetUrl(null);
    }

    // Load replays
    const concluded = parsed.filter(g => g.status === 'CONCLUDED' && g.eventId);
    const videoPromises = concluded.map(async (game) => {
      try {
        const vData = await fetchEventVideos(game.eventId);
        const items = vData?.container?.content?.items || [];
        return items.map(item => ({
          title: item.title || '',
          duration: item.label1 || '',
          image: item.previewImage?.url || '',
          nodeId: item.action?.analytics?.nodeId,
          gameDate: game.date,
        }));
      } catch { return []; }
    });
    const results = await Promise.all(videoPromises);
    setReplays(results.flat());
    setLoading(false);
  }

  const liveGame = games.find(g => g.status === 'LIVE');
  const nextGame = games.find(g => g.status === 'PRE-AIR');
  const venueText = liveGame ? (liveGame.subtitle || '').split(' · ').slice(1).join(' · ') : '';
  const teamNames = liveGame ? liveGame.title.split(/\s+vs\s+/i) : [];

  return (
    <div className="team-page">
      <div className="team-header">
        <div className="team-header-logo">
          <img src={teamLogo} alt={teamName} />
        </div>
        <div>
          <div className="team-header-title">
            <h1>{teamName}</h1>
            <span className={`badge ${liveGame ? 'live' : nextGame ? 'upcoming' : 'off'}`}>
              {liveGame ? 'LIVE' : nextGame ? 'NEXT GAME' : 'OFF SEASON'}
            </span>
          </div>
          <div className="team-sub">{league}</div>
        </div>
        <div className="team-header-right">
          <a className="flo-link" href={`https://www.flohockey.tv/teams/${teamId}-${teamName.toLowerCase().replace(/\s+/g, '-')}`} target="_blank" rel="noreferrer">FloHockey</a>
        </div>
      </div>

      <div className="team-content">
        {loading ? (
          <div className="loading"><div className="spinner" /><br />Loading...</div>
        ) : (
          <>
            {liveGame && (
              <>
                <div className="matchup-bar">
                  {assetUrl && <img src={assetUrl} alt={liveGame.title} className="matchup-asset" />}
                  <div className="matchup-team">{teamNames[0]}</div>
                  <div className="matchup-vs">vs</div>
                  <div className="matchup-team">{teamNames[1]}</div>
                </div>
                {venueText && <div className="matchup-detail">{venueText}</div>}
                <LivePlayer streamId={liveStream?.streamId} />
                <GameCenter iframeSrc={iframeSrc} />
              </>
            )}

            {!liveGame && nextGame && (
              <Countdown game={nextGame} onExpired={load} />
            )}

            {replays.length > 0 && (
              <div className="section">
                <div className="section-label">Replays</div>
                <div className="replays-list">
                  {replays.map(v => <ReplayCard key={v.nodeId} video={v} />)}
                </div>
              </div>
            )}

            <Schedule games={games} />
          </>
        )}
      </div>
    </div>
  );
}

function Countdown({ game, onExpired }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(game.startDateTime) - new Date();
      if (diff <= 0) {
        setTimeLeft('Starting now...');
        setTimeout(onExpired, 5000);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [game.startDateTime]);

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

  return (
    <div className="countdown">
      <div className="countdown-label">Next Game</div>
      <div className="countdown-title">{game.title}</div>
      <div className="countdown-time">{game.date} at {formatTime(game.startDateTime)}</div>
      <div className="countdown-timer">{timeLeft}</div>
    </div>
  );
}
