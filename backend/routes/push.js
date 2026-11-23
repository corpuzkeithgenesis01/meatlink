const express = require('express');
const supabase = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const { sendToUser } = require('../utils/push');

const router = express.Router();

// Ibigay ang public key sa browser
router.get('/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// Tanungin kung may subscription ang kasalukuyang user (hindi lang sa browser)
router.get('/status', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', req.user.id)
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ enabled: data.length > 0 });
});

// Magpadala ng test notification sa kasalukuyang user
router.post('/test', verifyToken, async (req, res) => {
  await sendToUser(req.user.id, {
    title: 'MeatLink test',
    body: 'Notifications are working on this account.',
    url: '/',
  });
  res.json({ message: 'Test notification sent' });
});

// I-save ang subscription ng browser ng naka-login na user
router.post('/subscribe', verifyToken, async (req, res) => {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'endpoint,user_id' }
  );

  if (error) {
    if (/unique|constraint|onconflict/i.test(error.message)) {
      return res.status(500).json({
        error:
          'Push subscriptions are not set up yet. Run backend/push_subscriptions_schema.sql in Supabase SQL Editor.',
      });
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ message: 'Subscribed to notifications' });
});

// Alisin ang subscription
router.post('/unsubscribe', verifyToken, async (req, res) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint is required' });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Unsubscribed from notifications' });
});

module.exports = router;