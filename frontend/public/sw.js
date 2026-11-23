const CACHE = 'meatlink-v1';
const APP_SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

const DB_NAME = 'meatlink-offline';
const STORE = 'outbox';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {})))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);

  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const shell = await cache.match('/');
      if (shell) return shell;
    }

    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isProductsApi = url.pathname === '/api/products';

  if (isProductsApi || (sameOrigin && !url.pathname.startsWith('/api/'))) {
    event.respondWith(networkFirst(request));
  }
});

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

const getQueuedOrders = () =>
  withStore('readonly', (store) => store.getAll()).then((all) =>
    all.filter((item) => item.type === 'order' || !item.type)
  );
const removeQueuedOrder = (id) => withStore('readwrite', (store) => store.delete(id));


async function notify(body) {
  try {
    await self.registration.showNotification('MeatLink', {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/orders' },
    });
  } catch {
  }

  await tellClients({
    type: 'push-notification',
    title: 'MeatLink',
    body,
  });
}

async function tellClients(message) {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  windowClients.forEach((client) => client.postMessage(message));
}

async function syncOrders() {
  const orders = await getQueuedOrders();

  try {
    for (const order of orders) {
      const response = await fetch(`${order.apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${order.token}`,
        },
        body: JSON.stringify(order.payload),
      });

      if (response.ok) {
        await removeQueuedOrder(order.id);
        await notify('Your offline order was sent to the seller.');
      } else if (response.status >= 500) {
        throw new Error('Server error, will retry later');
      } else {
        let reason = 'Please try again.';

        try {
          const data = await response.json();
          if (data.error) reason = data.error;
        } catch {
        }

        await removeQueuedOrder(order.id);
        await notify(`Your offline order could not be placed: ${reason}`);
      }
    }
  } finally {
    await tellClients({ type: 'orders-synced' });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'MeatLink',
    body: 'You have a new notification.',
    url: '/',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url },
      }),
      tellClients({
        type: 'push-notification',
        title: data.title,
        body: data.body,
        recipientId: data.recipientId,
        recipientRole: data.recipientRole,
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});