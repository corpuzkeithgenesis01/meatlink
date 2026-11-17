const express = require('express');
const supabase = require('../config/supabase');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { sendToUser, sendToAdmins } = require('../utils/push');

const router = express.Router();

const ADMIN_STATUSES = ['confirmed', 'ready', 'completed', 'cancelled'];

const STATUS_MESSAGES = {
  confirmed: 'has been confirmed by the seller.',
  ready: 'is ready for pickup.',
  completed: 'is completed. Thank you!',
  cancelled: 'was cancelled.',
};

// Ibalik ang stock ng mga produkto ng isang order
async function restoreStock(orderId) {
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);

  for (const item of items || []) {
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single();

    if (product) {
      await supabase
        .from('products')
        .update({ stock: product.stock + item.quantity })
        .eq('id', item.product_id);
    }
  }
}

// CREATE: mag-place ng order (buyer o admin na naka-login)
router.post('/', verifyToken, async (req, res) => {
  const { items, buyer_type, pickup_notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  // Pagsamahin ang magkaparehong product at suriin ang input
  const quantities = new Map();
  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return res
        .status(400)
        .json({ error: 'Each item needs a product and a whole-number quantity' });
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const productIds = [...quantities.keys()];

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds)
    .is('deleted_at', null);

  if (productError) return res.status(500).json({ error: productError.message });

  if (products.length !== productIds.length) {
    return res
      .status(400)
      .json({ error: 'Some products are no longer available' });
  }

  // Suriin ang stock at kuwentahin ang total
  const lines = [];
  let total = 0;

  for (const product of products) {
    const quantity = quantities.get(product.id);

    if (quantity > product.stock) {
      return res.status(400).json({
        error: `Not enough stock for ${product.name} (only ${product.stock} left)`,
      });
    }

    total += Number(product.price) * quantity;
    lines.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
      unit: product.unit,
      currentStock: product.stock,
    });
  }

  total = Math.round(total * 100) / 100;

  // I-save ang order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: req.user.id,
      buyer_type: buyer_type === 'wholesale' ? 'wholesale' : 'retail',
      pickup_notes: pickup_notes || null,
      total,
    })
    .select()
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });

  // I-save ang mga item ng order
  const itemRows = lines.map((line) => ({
    order_id: order.id,
    product_id: line.product_id,
    product_name: line.product_name,
    unit_price: line.unit_price,
    quantity: line.quantity,
    unit: line.unit,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemRows);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return res.status(500).json({ error: itemsError.message });
  }

  // Bawasan ang stock
  for (const line of lines) {
    await supabase
      .from('products')
      .update({ stock: line.currentStock - line.quantity })
      .eq('id', line.product_id);
  }

  // Abisuhan ang mga admin
  const { data: buyer } = await supabase
    .from('users')
    .select('name')
    .eq('id', req.user.id)
    .single();

  sendToAdmins({
    title: `New order #${order.id}`,
    body: `${buyer?.name || 'A buyer'} placed an order worth ₱${total}.`,
    url: '/admin/orders',
  });

  res.status(201).json({ ...order, order_items: itemRows });
});

// READ: ang mga order ng naka-login na user
router.get('/mine', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select(', order_items()')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// READ: lahat ng order (admin lang)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select(', users(name, email), order_items()')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// UPDATE: palitan ang status ng order (admin lang)
router.patch('/:id/status', verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;

  if (!ADMIN_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${ADMIN_STATUSES.join(', ')}`,
    });
  }

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (findError) {
    if (findError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(500).json({ error: findError.message });
  }

  if (order.status === 'cancelled' || order.status === 'completed') {
    return res.status(400).json({ error: 'This order is already closed' });
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', order.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (status === 'cancelled') {
    await restoreStock(order.id);
  }

  sendToUser(order.user_id, {
    title: `Order #${order.id}`,
    body: `Your order #${order.id} ${STATUS_MESSAGES[status]}`,
    url: '/orders',
  });

  res.json(updated);
});

// DELETE (cancel): kanselahin ng buyer ang sarili niyang pending na order
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (findError) {
    if (findError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(500).json({ error: findError.message });
  }

  if (order.status !== 'pending') {
    return res
      .status(400)
      .json({ error: 'Only pending orders can be cancelled' });
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await restoreStock(order.id);

  sendToAdmins({
    title: `Order #${order.id} cancelled`,
    body: `The buyer cancelled order #${order.id}.`,
    url: '/admin/orders',
  });

  res.json(updated);
});

module.exports = router;