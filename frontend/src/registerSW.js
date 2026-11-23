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

    // The service worker broadcasts to every open tab. Only show the in-app
    // alert in the tab belonging to the intended recipient.
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('user'));
    } catch {
      // not logged in
    }

    if (message.recipientId && Number(message.recipientId) !== Number(currentUser?.id)) return;
    if (message.recipientRole && message.recipientRole !== currentUser?.role) return;

    showNotificationAlert(message);
  });
}
