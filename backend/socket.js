const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const supabase = require('./config/supabase');
const { sendToUser, sendToAdmins } = require('./utils/push');

const MAX_MESSAGE_LENGTH = 1000;

let ioInstance = null;

function getIO() {
  return ioInstance;
}

async function getPrimaryAdminId() {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ? data.id : null;
}

function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });
  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) return next(new Error('Login required'));

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const isAdmin = socket.user.role === 'admin';

    socket.join(`user:${userId}`);
    if (isAdmin) socket.join('admins');

    socket.on('chat:send', async (payload, ack) => {
      const reply = (result) => {
        if (typeof ack === 'function') ack(result);
      };

      try {
        const content = String((payload && payload.content) || '').trim();

        if (!content) {
          return reply({ ok: false, error: 'Message is empty' });
        }
        if (content.length > MAX_MESSAGE_LENGTH) {
          return reply({
            ok: false,
            error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
          });
        }

        let buyerId;
        let receiverId;

        if (isAdmin) {
          // Admin: kailangang sabihin kung kaninong buyer ang sasagutin
          buyerId = Number(payload.to);

          if (!Number.isInteger(buyerId)) {
            return reply({ ok: false, error: 'Choose a buyer to reply to' });
          }

          const { data: target } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', buyerId)
            .maybeSingle();

          if (!target || target.role === 'admin') {
            return reply({ ok: false, error: 'Buyer not found' });
          }

          receiverId = buyerId;
        } else {
          // Buyer: ang usapan ay laging sa seller (unang admin)
          buyerId = userId;
          receiverId = await getPrimaryAdminId();

          if (!receiverId) {
            return reply({ ok: false, error: 'No seller is available right now' });
          }
        }

        // I-save ang message sa database
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            sender_id: userId,
            receiver_id: receiverId,
            buyer_id: buyerId,
            content,
          })
          .select()
          .single();

        if (error) {
          return reply({ ok: false, error: error.message });
        }

        // Real-time: ipadala sa buyer at sa lahat ng admin
        io.to(`user:${buyerId}`).to('admins').emit('chat:message', message);
        reply({ ok: true });

        // Kung walang naka-online na tatanggap, mag-push notification
        try {
          const room = isAdmin ? `user:${buyerId}` : 'admins';
          const online = await io.in(room).fetchSockets();

          if (online.length === 0) {
            const preview =
              content.length > 80 ? `${content.slice(0, 80)}...` : content;

            if (isAdmin) {
              sendToUser(buyerId, {
                title: 'New message from the seller',
                body: preview,
                url: '/chat',
              });
            } else {
              const { data: sender } = await supabase
                .from('users')
                .select('name')
                .eq('id', userId)
                .single();

              sendToAdmins({
                title: `New message from ${sender ? sender.name : 'a buyer'}`,
                body: preview,
                url: '/admin/chat',
              });
            }
          }
        } catch (pushError) {
          console.log('Chat push skipped:', pushError.message);
        }
      } catch (err) {
        reply({ ok: false, error: err.message });
      }
    });
  });

  return io;
}

setupSocket.getIO = getIO;

module.exports = setupSocket;