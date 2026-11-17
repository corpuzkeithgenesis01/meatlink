import { API_URL } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function pushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Tingnan kung naka-on na ang notification sa browser na ito
export async function isPushEnabled() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

// I-on ang notification
export async function enablePush(token) {
  if (!pushSupported()) {
    throw new Error('This browser does not support push notifications');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not allowed');
  }

  await navigator.serviceWorker.register('/sw.js');
  const registration = await navigator.serviceWorker.ready;

  const keyRes = await fetch(API_URL + '/api/push/public-key');
  const keyData = await keyRes.json();
  const publicKey = keyData.publicKey;
  if (!publicKey) {
    throw new Error('Push is not set up on the server');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch(API_URL + '/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(subscription),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to save subscription');
  }
}

// I-off ang notification
export async function disablePush(token) {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch(API_URL + '/api/push/unsubscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  await subscription.unsubscribe();
}
