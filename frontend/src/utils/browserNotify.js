// Device notification for events that arrive while the app is open.
// Web push (service worker) handles the case where the app is closed.
export function notifyBrowser({ title, body, url = '/' }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  // Avoid a duplicate when both the socket event and web push deliver it.
  const key = `${title}|${body}`;
  const now = Date.now();
  let recent = {};
  try {
    recent = JSON.parse(sessionStorage.getItem('meatlink-notified') || '{}');
  } catch {
    recent = {};
  }
  if (recent[key] && now - recent[key] < 6000) return false;
  recent[key] = now;
  try {
    sessionStorage.setItem('meatlink-notified', JSON.stringify(recent));
  } catch {
    // storage unavailable — still show the notification
  }

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
