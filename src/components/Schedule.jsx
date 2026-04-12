import './Schedule.css';

function shortDate(dateStr) {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\w+)\s+(\d+)/);
  return m ? m[1].substring(0, 3) + ' ' + m[2] : dateStr;
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

export default function Schedule({ games }) {
  if (!games?.length) return null;

  return (
    <div className="section">
      <div className="section-label">Schedule</div>
      <div className="schedule">
        {games.map((g, i) => {
          const isLive = g.status === 'LIVE';
          const isConcluded = g.status === 'CONCLUDED';
          const isPreAir = g.status === 'PRE-AIR';
          const venueParts = (g.subtitle || '').split(' · ').slice(1);
          const venue = venueParts.join(' · ');

          return (
            <a
              key={i}
              className={`game-row ${isLive ? 'active' : ''}`}
              href={`https://www.flohockey.tv${g.url}`}
              target="_blank"
              rel="noreferrer"
            >
              <div className="date">{shortDate(g.date)}</div>
              <div className="title-wrap">
                <div className="title">{g.title}</div>
                {venue && <div className="venue">{venue}</div>}
              </div>
              <div className="meta">
                {isLive && <span className="badge live">LIVE</span>}
                {isConcluded && <span className="badge off">Final</span>}
                {isPreAir && <span className="badge upcoming">Upcoming</span>}
                <div className="time">{formatTime(g.startDateTime)}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
