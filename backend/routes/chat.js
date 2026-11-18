const express = require('express');
const supabase = require('../config/supabase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/messages', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('buyer_id', req.user.id)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/conversations', verifyToken, requireAdmin, async (req, res) => {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('id', { ascending: false })
    .limit(1000);

  if (error) return res.status(500).json({ error: error.message });

  const latest = new Map();
  for (const message of messages) {
    if (!latest.has(message.buyer_id)) {
      latest.set(message.buyer_id, message);
    }
  }

  const buyerIds = [...latest.keys()];
  if (buyerIds.length === 0) return res.json([]);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', buyerIds);

  if (usersError) return res.status(500).json({ error: usersError.message });

  const conversations = buyerIds.map((buyerId) => {
    const user = users.find((u) => u.id === buyerId);
    const last = latest.get(buyerId);

    return {
      buyer_id: buyerId,
      name: user ? user.name : 'Unknown',
      email: user ? user.email : '',
      last_message: last.content,
      last_at: last.created_at,
    };
  });

  res.json(conversations);
});

router.get('/conversations/:buyerId', verifyToken, requireAdmin, async (req, res) => {
  const buyerId = Number(req.params.buyerId);

  if (!Number.isInteger(buyerId)) {
    return res.status(400).json({ error: 'Invalid buyer id' });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;