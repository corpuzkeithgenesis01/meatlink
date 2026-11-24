import { showNotificationAlert } from './alerts';
import { notifyBrowser } from './browserNotify';
import { markNotified, notificationKey, shouldNotify } from './notificationDedupe';

// Shows a notification on the screen whether or not browser permission was granted.
// The OS notification is added on top when permission is available.
export function notifyUser(payload) {
  const key = notificationKey(payload);
  if (!shouldNotify(key)) return;
  markNotified(key);

  notifyBrowser(payload);
  showNotificationAlert(payload);
}
