import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../socket';
import { getQueuedMessages, queueMessage, removeQueuedItem } from '../offlineQueue';
import './Chat.css';

function pendingMessage(content, userId, clientId) {
  return {
    id: clientId,
    sender_id: userId,
    content,
    created_at: new Date().toISOString(),
    pending: true,
  };
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Chat() {
  const { token, user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const listRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages');

      // Keep locally queued (Sending...) messages visible until they are delivered.
      setMessages((current) => [...data, ...current.filter((m) => m.pending)]);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const restoreQueued = useCallback(async () => {
    try {
      const queued = await getQueuedMessages();
      setMessages((current) => {
        const ids = new Set(current.map((m) => m.id));
        const restored = queued
          .filter((item) => item.payload?.clientId && !ids.has(item.payload.clientId))
          .map((item) => pendingMessage(item.payload.content, user.id, item.payload.clientId));
        return [...current, ...restored];
      });
    } catch {
      // IndexedDB unavailable — the app still works online.
    }
  }, [user.id]);

  const flushQueued = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    const queued = await getQueuedMessages();
    for (const item of queued) {
      const ok = await new Promise((resolve) => {
        socket.emit('chat:send', item.payload, (reply) => resolve(!!(reply && reply.ok)));
      });

      if (!ok) {
        setError('Some messages could not be sent yet. They will be retried.');
        break;
      }

      await removeQueuedItem(item.id);
      setMessages((current) => current.filter((m) => m.id !== item.payload.clientId));
    }

    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadHistory().then(restoreQueued);

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      loadHistory();
      restoreQueued();
      flushQueued();
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err.message);
    });

    socket.on('chat:message', (message) => {
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message]
      );
    });

    function handleOnline() {
      flushQueued();
    }
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      socket.disconnect();
    };
  }, [token, loadHistory, restoreQueued, flushQueued]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();

    const content = text.trim();
    if (!content) return;

    setError('');
    setText('');

    const clientId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = { content, clientId };
    setMessages((current) => [...current, pendingMessage(content, user.id, clientId)]);

    const socket = socketRef.current;
    if (!navigator.onLine || !socket || !socket.connected) {
      queueMessage(token, payload).catch(() =>
        setError('Could not save the message on this device.')
      );
      return;
    }

    socket.emit('chat:send', { content }, (reply) => {
      if (reply && reply.ok) {
        setMessages((current) => current.filter((m) => m.id !== clientId));
        loadHistory();
      } else {
        queueMessage(token, payload).catch(() => {});
        setError((reply && reply.error) || 'Message will be sent when connected again.');
      }
    });
  }

  return (
    <div>
      <h2>Chat with the seller</h2>
      <p className={connected ? 'chat-status online' : 'chat-status'}>
        {connected
          ? 'Connected'
          : 'Offline — messages will be sent when you are back online'}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="chat-box">
        <div className="chat-messages" ref={listRef}>
          {messages.length === 0 && (
            <p className="chat-empty">No messages yet. Say hello to the seller!</p>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`bubble ${m.sender_id === user.id ? 'mine' : 'theirs'} ${m.pending ? 'pending' : ''}`}
            >
              <p>{m.content}</p>
              <span>{m.pending ? 'Sending...' : formatTime(m.created_at)}</span>
            </div>
          ))}
        </div>

        <form className="chat-form" onSubmit={handleSend}>
          <input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          <button type="submit" disabled={!text.trim()}>
            Send
          </button>
        </form>
        {!connected && (
          <p className="chat-offline-hint">
            You can still send messages offline. They will show “Sending...” until delivered.
          </p>
        )}
      </div>
    </div>
  );
}

export default Chat;
