import { useState, useRef } from 'react';
import { useHls } from '../hooks/useHls';
import { fetchVideoDetail } from '../api/flo';
import './ReplayCard.css';

export default function ReplayCard({ video }) {
  const videoRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);

  useHls(videoRef, streamUrl);

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      setStreamUrl(null);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    } else {
      setExpanded(true);
      const data = await fetchVideoDetail(video.nodeId);
      const playlist = data?.data?.videoPlayer?.contentMetadata?.playlist;
      if (playlist) setStreamUrl(playlist);
    }
  }

  const cleanTitle = video.title.replace(/^Replay:\s*Home\s*-\s*\d{4}\s*/, '');

  return (
    <div className={`replay-card ${expanded ? 'playing' : ''}`}>
      <div className="replay-info" onClick={toggle}>
        {video.image && <img className="replay-thumb" src={video.image} alt="" />}
        <div className="replay-details">
          <div className="replay-title">{cleanTitle}</div>
          <div className="replay-sub">{video.gameDate} · {video.duration}</div>
        </div>
        <div className="replay-meta">
          <span className={`replay-chevron ${expanded ? 'open' : ''}`}>›</span>
        </div>
      </div>
      {expanded && (
        <div className="replay-video">
          <video ref={videoRef} controls playsInline />
        </div>
      )}
    </div>
  );
}
