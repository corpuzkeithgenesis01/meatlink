import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerServiceWorker } from './registerSW';
import { setupFallbackSync } from './offlineQueue';

registerServiceWorker();
setupFallbackSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);