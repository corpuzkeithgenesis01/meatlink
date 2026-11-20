import { showNotificationAlert } from './utils/alerts';

// Irehistro ang service worker pagbukas ng app
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.log('Service worker failed:', err));
  });
}

// Ipakita ang push notification bilang SweetAlert habang bukas ang app.
// Tuloy-tuloy ang browser notification kahit naka-close ang tab.
export function setupPushAlerts() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.type !== 'push-notification') return;
    showNotificationAlert(message);
  });
}
