const webpush = require('web-push');
const supabase = require('../config/supabase');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const pushReady = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (pushReady) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.log('Push notifications are off: VAPID keys are missing in .env');
}

// Magpadala ng notification sa listahan ng subscriptions
async function sendToSubscriptions(subscriptions, payload) {
  const message = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
      } catch (err) {
        // 404 o 410 ay ibig sabihin patay na ang subscription, kaya buburahin
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        } else {
          console.log('Push failed:', err.statusCode || err.message);
        }
      }
    })
  );
}

// Magpadala sa isang user
async function sendToUser(userId, payload) {
  if (!pushReady) return;

  try {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    await sendToSubscriptions(data || [], payload);
  } catch (err) {
    console.log('Push error:', err.message);
  }
}

// Magpadala sa lahat ng admin
async function sendToAdmins(payload) {
  if (!pushReady) return;

  try {
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    const adminIds = (admins || []).map((a) => a.id);
    if (adminIds.length === 0) return;

    const { data } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', adminIds);

    await sendToSubscriptions(data || [], payload);
  } catch (err) {
    console.log('Push error:', err.message);
  }
}

module.exports = { pushReady, sendToUser, sendToAdmins };