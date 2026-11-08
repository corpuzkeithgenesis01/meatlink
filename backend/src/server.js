import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';

const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`[api] REST + WebSocket listening on http://localhost:${PORT}`);
});
