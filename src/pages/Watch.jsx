import { useState, useEffect, useMemo } from 'react';
import { fetchAllLiveStreams } from '../api/flo';
import StreamCard from '../components/StreamCard';
import './Watch.css';

export default function Watch() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  async function loadStreams() {
    setLoading(true);
    setStreams(await fetchAllLiveStreams());
    setLoading(false);
  }

  useEffect(() => { loadStreams(); }, []);

  // Get unique leagues from streams, sorted by count
  const leagues = useMemo(() => {
    const counts = new Map();
    for (const s of streams) {
      const key = s.section || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [streams]);

  const filtered = activeFilter === 'all'
    ? streams
    : streams.filter(s => (s.section || 'Other') === activeFilter);

  return (
    <div className="watch-page">
      <div className="watch-nav">
        <h1>Rinkside</h1>
        <span className="badge live">{streams.length} LIVE</span>
        <button className="refresh-btn" onClick={loadStreams}>Refresh</button>
      </div>

      <div className="watch-content">
        {!loading && streams.length > 0 && leagues.length > 1 && (
          <div className="league-filters">
            <button
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All ({streams.length})
            </button>
            {leagues.map(([league, count]) => (
              <button
                key={league}
                className={`filter-btn ${activeFilter === league ? 'active' : ''}`}
                onClick={() => setActiveFilter(league)}
              >
                {league} ({count})
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="loading"><div className="spinner" /><br />Loading live streams from all leagues...</div>
        ) : filtered.length === 0 ? (
          <div className="loading">No live streams right now.</div>
        ) : (
          <div className="stream-grid">
            {filtered.map(s => <StreamCard key={s.eventId} stream={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
