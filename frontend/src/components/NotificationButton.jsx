import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showError, showSuccess } from '../utils/alerts';
import { setNotificationsEnabledFor } from '../utils/notificationPref';
import {
  disablePush,
  enablePush,
  isPushEnabled,
  pushSupported,
} from '../push';

function NotificationButton() {
  const { token, user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported = pushSupported();
  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const inAppBrowser = /FBAN|FBAV|Instagram|LINE|Messenger/i.test(ua);
  const permissionDenied =
    supported && typeof Notification !== 'undefined' && Notification.permission === 'denied';

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const result = await isPushEnabled(token);
      if (!cancelled) {
        setEnabled(result);
        setNotificationsEnabledFor(user.id, result);
      }
    }

    if (user && token) check();

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  if (!user) {
    return (
      <Link className="btn btn-small btn-outline-light" to="/login">
        Log in for alerts
      </Link>
    );
  }

  if (!supported) {
    const reason = !window.isSecureContext
      ? 'Notifications need HTTPS. Open the deployed site (https://...) on your phone.'
      : isIOS && !isStandalone
        ? 'On iPhone, add MeatLink to Home Screen and open it from there.'
        : inAppBrowser
          ? 'Open this page in Chrome or Safari to enable notifications.'
          : 'This browser does not support push notifications.';

    return (
      <span className="notification-controls">
        <button disabled title={reason}>Notifications unavailable</button>
        <small className="notification-hint">{reason}</small>
      </span>
    );
  }

  async function handleClick() {
    const confirmed = await confirmAction({
      title: enabled ? 'Turn off notifications?' : 'Enable notifications?',
      text: enabled
        ? 'You will no longer receive order updates on this device.'
        : 'MeatLink will ask for browser permission, then send order updates to this device.',
      confirmButtonText: enabled ? 'Turn off' : 'Continue',
      icon: 'question',
    });
    if (!confirmed) return;

    setLoading(true);

    try {
      if (enabled) {
        await disablePush(token);
        setNotificationsEnabledFor(user.id, false);
        setEnabled(false);
        showSuccess('Notifications are now off.', 'Notifications off');
      } else {
        await enablePush(token);
        setNotificationsEnabledFor(user.id, true);
        setEnabled(true);
        showSuccess(
          'You will now receive order updates on this device.',
          'Notifications on'
        );
      }
    } catch (err) {
      showError(err.message, 'Notifications unavailable');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="notification-controls">
      <button onClick={handleClick} disabled={loading}>
        {enabled ? 'Notifications: ON' : 'Enable notifications'}
      </button>
      {permissionDenied && (
        <small className="notification-hint">
          Allow notifications for this site in your browser settings.
        </small>
      )}
    </span>
  );
}

export default NotificationButton;
