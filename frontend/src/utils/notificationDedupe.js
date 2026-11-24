const KEY = 'meatlink-notified';

export function notificationKey({ title, body }) {
  return `${title || ''}|${body || ''}`;
}

export function shouldNotify(key) {
  try {
    const recent = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    return !recent[key] || Date.now() - recent[key] > 6000;
  } catch {
    return true;
  }
}

export function markNotified(key) {
  try {
    const recent = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    recent[key] = Date.now();
    sessionStorage.setItem(KEY, JSON.stringify(recent));
  } catch {
    // storage unavailable — notifications still show
  }
}
