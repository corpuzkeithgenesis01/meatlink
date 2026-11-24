import { markNotified, notificationKey, shouldNotify } from './notificationDedupe';

// OS-level notification for events that arrive while the app is open.
// Web push (service worker) handles the case where the app is closed.
export function notifyBrowser({ title, body, url = '/' }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const key = notificationKey({ title, body });
  if (!shouldNotify(key)) return false;
  markNotified(key);

  try {
    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
    });
    notification.onclick = () => {
      window.focus();
      window.location.assign(url);
    };
    return true;
  } catch {
    return false;
  }
}
