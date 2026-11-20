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

// Explicit CORS configuration para sa meatlink-web at local development
const allowedOrigins = [
  'https://onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN.replace(/\/$/, ''));
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (gaya ng mobile apps, Postman, o server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Pansamantalang allow lahat kung may ibang preview URL
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Root route para sa default health check ng Render
app.get('/', (req, res) => {
  res.status(200).json({ ok: true, message: 'MeatLink API is running' });
});

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

<<<<<<< HEAD
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
=======
server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT}`);
>>>>>>> 9b123e442cc6915a2ce2b0ae50d20e33e0d1f6b9
  // Warm up the Supabase connection so the first request is fast.
  supabase.from('products').select('id').limit(1).then(() => {}).catch(() => {});
});
