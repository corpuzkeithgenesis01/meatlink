import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showError, showSuccess } from '../utils/alerts';
import {
  disablePush,
  enablePush,
  isPushEnabled,
  pushSupported,
  sendTestPush,
} from '../push';

function NotificationButton() {
  const { token, user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const result = await isPushEnabled(token);
      if (!cancelled) setEnabled(result);
    }

    if (user && token) check();

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  if (!user || !pushSupported()) return null;

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
        setEnabled(false);
        showSuccess('Notifications are now off.', 'Notifications off');
      } else {
        await enablePush(token);
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

  async function handleTest() {
    setLoading(true);
    try {
      await sendTestPush(token);
      showSuccess('Test notification sent. Check your device.', 'Test notification');
    } catch (err) {
      showError(err.message, 'Test failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="notification-controls">
      <button onClick={handleClick} disabled={loading}>
        {enabled ? 'Notifications: ON' : 'Enable notifications'}
      </button>
      {enabled && (
        <button className="btn-small" onClick={handleTest} disabled={loading}>
          Test
        </button>
      )}
    </span>
  );
}

export default NotificationButton;