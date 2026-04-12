import { useRef, useEffect, useState } from 'react';
import { useHls } from '../hooks/useHls';
import { fetchPreviewToken } from '../api/flo';
import './LivePlayer.css';

export default function LivePlayer({ streamId, title, assetUrl }) {
  const videoRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [showUnmute, setShowUnmute] = useState(true);
  const { updateSource } = useHls(videoRef, streamUrl);

  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;

    fetchPreviewToken(streamId).then(url => {
      if (!cancelled && url) setStreamUrl(url);
    });

    // Renew token every 70s
    const timer = setInterval(async () => {
      const url = await fetchPreviewToken(streamId);
      if (url) updateSource(url);
    }, 70000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [streamId]);

  useEffect(() => {
    if (!showUnmute) return;
    const t = setTimeout(() => setShowUnmute(false), 5000);
    return () => clearTimeout(t);
  }, [showUnmute]);

  function unmute() {
    if (videoRef.current) videoRef.current.muted = false;
    setShowUnmute(false);
  }

  if (!streamId) return null;

  return (
    <div className="live-player">
      <div className="video-container">
        <video ref={videoRef} controls muted playsInline />
        {showUnmute && (
          <button className="unmute-hint" onClick={unmute}>
            Click to unmute
          </button>
        )}
      </div>
    </div>
  );
}
