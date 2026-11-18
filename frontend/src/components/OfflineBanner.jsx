import { useEffect, useState } from 'react';
import { countQueuedOrders } from '../offlineQueue';
import './OfflineBanner.css';

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const count = await countQueuedOrders();
        if (!cancelled) setPending(count);
      } catch {
      }
    }

    function handleOnline() {
      setOnline(true);
      refresh();
    }

    function handleOffline() {
      setOnline(false);
    }

    function handleMessage(event) {
      if (event.data && event.data.type === 'orders-synced') {
        refresh();
      }
    }

    refresh();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('outbox-changed', refresh);

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('outbox-changed', refresh);

      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className={online ? 'offline-banner pending' : 'offline-banner'}>
      {!online && (
        <p>
          You are offline. You can still browse saved products. Orders will be
          sent when you are back online.
        </p>
      )}
      {pending > 0 && (
        <p>
          {pending} order{pending > 1 ? 's' : ''} waiting to be sent.
        </p>
      )}
    </div>
  );
}

export default OfflineBanner;