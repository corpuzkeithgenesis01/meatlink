require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabase');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const pushRoutes = require('./routes/push');
const chatRoutes = require('./routes/chat');
const setupSocket = require('./socket');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  let db = 'ok';
  let dbError = null;

  try {
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);

    if (error) {
      db = 'error';
      dbError = error.message;
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      db = 'slow';
    } else {
      db = 'error';
      dbError = e.message;
    }
  } finally {
    clearTimeout(timer);
  }

  if (dbError) return res.status(500).json({ ok: false, error: dbError });
  res.json({ ok: true, message: 'MeatLink API is connected to Supabase', db });
});

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/chat', chatRoutes);

const server = http.createServer(app);
setupSocket(server);

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
  // Warm up the Supabase connection so the first request is fast.
  supabase.from('products').select('id').limit(1).then(() => {}).catch(() => {});
});
