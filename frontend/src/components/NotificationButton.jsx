import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
    setLoading(true);

    try {
      if (enabled) {
        await disablePush(token);
        setEnabled(false);
      } else {
        await enablePush(token);
        setEnabled(true);
      }
    } catch (err) {
      window.alert(err.message);
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