import { useEffect, useState } from 'react';
import api from './api/client.js';

export default function App() {
  const [health, setHealth] = useState('checking...');

  useEffect(() => {
    api
      .get('/api/health')
      .then(({ data }) => setHealth(data.status))
      .catch(() => setHealth('offline'));
  }, []);

  return (
    <main className="app">
      <h1>MeatLink</h1>
      <p>
        API: <strong>{health}</strong>
      </p>
      <p className="hint">React + Express + WebSocket + PWA baseline</p>
    </main>
  );
}
