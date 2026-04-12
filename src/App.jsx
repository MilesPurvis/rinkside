import { useState, useEffect } from 'react';
import Watch from './pages/Watch';
import Game from './pages/Game';
import './App.css';

function getRoute() {
  return window.location.hash.slice(1) || '/';
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    function onHash() { setRoute(getRoute()); }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Route: /game/:eventId
  const gameMatch = route.match(/^\/game\/(\d+)/);
  if (gameMatch) {
    return <Game eventId={gameMatch[1]} />;
  }

  // Default: Watch page (all live streams)
  return <Watch />;
}
