import { useEffect, useRef, useState } from 'react';
import './GameCenter.css';

export default function GameCenter({ iframeSrc }) {
  const iframeRef = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!iframeSrc || !iframeRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/iframe-resizer/4.3.9/iframeResizer.min.js';
    script.onload = () => {
      if (window.iFrameResize && iframeRef.current) {
        window.iFrameResize({ checkOrigin: false, scrolling: true }, iframeRef.current);
      }
    };
    document.head.appendChild(script);

    return () => { script.remove(); };
  }, [iframeSrc]);

  if (!iframeSrc) return null;

  return (
    <div className="section">
      <div className="section-label gc-header" onClick={() => setVisible(!visible)}>
        Game Center
        <span className={`gc-toggle ${visible ? 'open' : ''}`}>›</span>
      </div>
      {visible && (
        <div className="gamecenter">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Game Center"
            scrolling="auto"
          />
        </div>
      )}
    </div>
  );
}
