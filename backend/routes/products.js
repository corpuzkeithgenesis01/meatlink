const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// READ: kunin ang lahat ng products na hindi archived
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .is('deleted_at', null)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CREATE: magdagdag ng bagong product
router.post('/', async (req, res) => {
  const { name, category, price, stock, unit } = req.body;

  if (!name || !category || price == null) {
    return res.status(400).json({ error: 'name, category and price are required' });
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ name, category, price, stock, unit })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// UPDATE: baguhin ang product
router.put('/:id', async (req, res) => {
  const { name, category, price, stock, unit } = req.body;

  const { data, error } = await supabase
    .from('products')
    .update({ name, category, price, stock, unit })
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// SOFT DELETE: i-archive ang product (hindi talaga binubura)
router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'Product archived', product: data });
});

// Tingnan ang mga archived products
router.get('/archived/list', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Ibalik ang archived product
router.patch('/:id/restore', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .update({ deleted_at: null })
    .eq('id', req.params.id)
    .not('deleted_at', 'is', null)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Archived product not found' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'Product restored', product: data });
});

module.exports = router;