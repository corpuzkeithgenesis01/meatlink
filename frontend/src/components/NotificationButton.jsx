import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showError, showSuccess } from '../utils/alerts';
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

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const result = await isPushEnabled();
      if (!cancelled) setEnabled(result);
    }

    if (user) check();

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  return (
    <button onClick={handleClick} disabled={loading}>
      {enabled ? 'Notifications: ON' : 'Enable notifications'}
    </button>
  );
}

export default NotificationButton;