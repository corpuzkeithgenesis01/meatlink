const express = require('express');
const supabase = require('../config/supabase');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { sendToUser, sendToAdmins } = require('../utils/push');

const router = express.Router();

const ADMIN_STATUSES = ['confirmed', 'ready', 'completed', 'cancelled'];
const FULFILLMENTS = ['pickup', 'delivery'];
const PAYMENT_METHODS = ['cod', 'cop'];
const WHOLESALE_MIN_KG = 10;
const WHOLESALE_DISCOUNT_PER_KG = 10;

function normalizeOrderOptions(body) {
  const fulfillment = FULFILLMENTS.includes(body.fulfillment)
    ? body.fulfillment
    : 'pickup';
  const payment_method = PAYMENT_METHODS.includes(body.payment_method)
    ? body.payment_method
    : fulfillment === 'delivery'
      ? 'cod'
      : 'cop';

  if (fulfillment !== 'delivery') {
    return {
      options: {
        fulfillment,
        payment_method,
        delivery_street: null,
        delivery_barangay: null,
        delivery_municipality: null,
      },
    };
  }

  const delivery_street = String(body.delivery_street || '').trim();
  const delivery_barangay = String(body.delivery_barangay || '').trim();
  const delivery_municipality = String(body.delivery_municipality || '').trim();

  if (!delivery_street || !delivery_barangay || !delivery_municipality) {
    return {
      error: 'Street, barangay, and municipality are required for delivery',
    };
  }

  return {
    options: {
      fulfillment,
      payment_method,
      delivery_street,
      delivery_barangay,
      delivery_municipality,
    },
  };
}

function isMissingOptionColumns(error) {
  const message = String((error && error.message) || '').toLowerCase();
  return (
    message.includes('fulfillment') ||
    message.includes('payment_method') ||
    message.includes('delivery_street') ||
    message.includes('delivery_barangay') ||
    message.includes('delivery_municipality')
  );
}

function isMissingDiscountColumn(error) {
  return String((error && error.message) || '')
    .toLowerCase()
    .includes('discount');
}

const STATUS_MESSAGES = {
  confirmed: 'has been confirmed by the seller.',
  ready: 'is ready for pickup.',
  completed: 'is completed. Thank you!',
  cancelled: 'was cancelled.',
};

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

router.post('/', verifyToken, async (req, res) => {
  const { items, buyer_type, pickup_notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  const { error: optionsError, options } = normalizeOrderOptions(req.body);
  if (optionsError) return res.status(400).json({ error: optionsError });

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
  const isWholesale = buyer_type === 'wholesale';
  let subtotal = 0;
  let totalKg = 0;

  for (const product of products) {
    const quantity = quantities.get(product.id);

    if (quantity > product.stock) {
      return res.status(400).json({
        error: `Not enough stock for ${product.name} (only ${product.stock} left)`,
      });
    }

    subtotal += Number(product.price) * quantity;
    if (String(product.unit).toLowerCase() === 'kg') totalKg += quantity;
    lines.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
      unit: product.unit,
      currentStock: product.stock,
    });
  }

  if (isWholesale && totalKg < WHOLESALE_MIN_KG) {
    return res.status(400).json({
      error: `Wholesale orders require at least ${WHOLESALE_MIN_KG} kg (currently ${totalKg} kg)`,
    });
  }

  const discount = isWholesale ? totalKg * WHOLESALE_DISCOUNT_PER_KG : 0;
  const total = Math.round(Math.max(subtotal - discount, 0) * 100) / 100;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: req.user.id,
      buyer_type: isWholesale ? 'wholesale' : 'retail',
      pickup_notes: pickup_notes || null,
      discount,
      total,
      ...options,
    })
    .select()
    .single();

  if (isMissingOptionColumns(orderError)) {
    return res.status(500).json({
      error:
        'Order options are not set up yet. Run backend/order_options_schema.sql in Supabase SQL Editor.',
    });
  }
  if (isMissingDiscountColumn(orderError)) {
    return res.status(500).json({
      error:
        'Wholesale discount is not set up yet. Run backend/wholesale_discount_schema.sql in Supabase SQL Editor.',
    });
  }
  if (orderError) return res.status(500).json({ error: orderError.message });

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

  for (const line of lines) {
    await supabase
      .from('products')
      .update({ stock: line.currentStock - line.quantity })
      .eq('id', line.product_id);
  }

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

router.get('/mine', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users(name, email), order_items(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

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