import './StreamCard.css';

export default function StreamCard({ stream }) {
  const location = [stream.city, stream.region].filter(Boolean).join(', ');
  const time = new Date(stream.startDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

  return (
    <a className="stream-card" href={`#/game/${stream.eventId}`}>
      <div className="stream-video-wrap">
        {stream.asset && <img className="stream-poster" src={stream.asset} alt={stream.shortTitle} />}
        <div className="stream-play-overlay">
          <div className="play-btn"><div className="play-triangle" /></div>
        </div>
      </div>
      <div className="stream-info">
        <div className="stream-details">
          <div className="stream-title">{stream.shortTitle}</div>
          <div className="stream-sub">
            {time}
            {location && ` · ${location}`}
          </div>
        </div>
        <span className="badge live">LIVE</span>
      </div>
    </a>
  );
}
