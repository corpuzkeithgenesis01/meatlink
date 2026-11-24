// Per-user ON/OFF preference for in-app notifications, stored in this browser.
const KEY = 'meatlink-notify-pref';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function currentUserId() {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    return raw ? JSON.parse(raw)?.id : null;
  } catch {
    return null;
  }
}

export function notificationsEnabledFor(userId) {
  if (userId == null) return true;
  return readAll()[userId] !== false;
}

export function setNotificationsEnabledFor(userId, enabled) {
  if (userId == null) return;
  const all = readAll();
  all[userId] = Boolean(enabled);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // preference is best-effort
  }
}
