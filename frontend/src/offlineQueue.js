import { API_URL } from './api';

const DB_NAME = 'meatlink-offline';
const STORE = 'outbox';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));

    transaction.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function registerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    return false;
  }

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service worker is not ready')), 3000)
      ),
    ]);

    await registration.sync.register('sync-orders');
    return true;
  } catch {
    return false;
  }
}

export async function queueOrder(token, payload) {
  await withStore('readwrite', (store) =>
    store.add({
      apiUrl: API_URL,
      token,
      payload,
      createdAt: Date.now(),
    })
  );

  window.dispatchEvent(new Event('outbox-changed'));
  return registerBackgroundSync();
}

export async function countQueuedOrders() {
  return withStore('readonly', (store) => store.count());
}

let flushing = false;

export async function flushQueuedOrders() {
  if (flushing) return;
  flushing = true;

  try {
    const orders = await withStore('readonly', (store) => store.getAll());

    for (const order of orders) {
      let response;

      try {
        response = await fetch(`${order.apiUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${order.token}`,
          },
          body: JSON.stringify(order.payload),
        });
      } catch {
        break;
      }

      if (response.status >= 500) break;

      await withStore('readwrite', (store) => store.delete(order.id));
    }
  } finally {
    flushing = false;
    window.dispatchEvent(new Event('outbox-changed'));
  }
}

export function setupFallbackSync() {
  if ('SyncManager' in window) return;

  function run() {
    if (navigator.onLine) {
      flushQueuedOrders().catch(() => {});
    }
  }

  window.addEventListener('online', run);
  run();
}