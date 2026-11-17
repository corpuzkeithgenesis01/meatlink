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
  const { error } = await supabase.from('products').select('id').limit(1);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, message: 'MeatLink API is connected to Supabase' });
});

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/chat', chatRoutes);

// Gumawa ng HTTP server para magamit ng Express at Socket.io ang iisang port
const server = http.createServer(app);
setupSocket(server);

server.listen(process.env.PORT, () => {
  console.log(Server running on port ${process.env.PORT});
});
