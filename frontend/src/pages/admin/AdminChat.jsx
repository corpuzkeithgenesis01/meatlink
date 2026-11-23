import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { connectSocket } from '../../socket';
import { getQueuedMessages, queueMessage, removeQueuedItem } from '../../offlineQueue';
import '../Chat.css';

function pendingMessage(content, senderId, buyerId, clientId) {
  return {
    id: clientId,
    sender_id: senderId,
    buyer_id: buyerId,
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

function AdminChat() {
  const { token, user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const selectedRef = useRef(null);
  const listRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversations');
      setConversations(data);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const openConversation = useCallback(
    async (buyerId) => {
      selectedRef.current = buyerId;
      setSelected(buyerId);
      setError('');

      try {
        const res = await fetch(`${API_URL}/api/chat/conversations/${buyerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load messages');

        if (selectedRef.current === buyerId) {
          setMessages((current) => [
            ...data,
            ...current.filter((m) => m.pending && m.buyer_id === buyerId),
          ]);
        }
      } catch (err) {
        setError(err.message);
      }
    },
    [token]
  );

  const restoreQueued = useCallback(async () => {
    try {
      const queued = await getQueuedMessages();
      setMessages((current) => {
        const ids = new Set(current.map((m) => m.id));
        const restored = queued
          .filter(
            (item) => item.payload?.clientId && Number.isFinite(Number(item.payload.to)) && !ids.has(item.payload.clientId)
          )
          .map((item) =>
            pendingMessage(
              item.payload.content,
              user.id,
              Number(item.payload.to),
              item.payload.clientId
            )
          );
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
    const sentBuyers = new Set();

    for (const item of queued) {
      const ok = await new Promise((resolve) => {
        socket.emit('chat:send', item.payload, (reply) => resolve(!!(reply && reply.ok)));
      });

      if (!ok) {
        setError('Some messages could not be sent yet. They will be retried.');
        break;
      }

      await removeQueuedItem(item.id);
      sentBuyers.add(Number(item.payload.to));
      setMessages((current) => current.filter((m) => m.id !== item.payload.clientId));
    }

    if (queued.length > 0) {
      loadConversations();
      if (selectedRef.current !== null && sentBuyers.has(selectedRef.current)) {
        openConversation(selectedRef.current);
      }
    }
  }, [loadConversations, openConversation]);

  useEffect(() => {
    loadConversations().then(restoreQueued);

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      loadConversations();
      restoreQueued();
      flushQueued();
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err.message);
    });

    socket.on('chat:message', (message) => {
      loadConversations();

      if (message.buyer_id === selectedRef.current) {
        setMessages((current) =>
          current.some((m) => m.id === message.id) ? current : [...current, message]
        );
      }
    });

    function handleOnline() {
      flushQueued();
    }
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      socket.disconnect();
    };
  }, [token, loadConversations, openConversation, restoreQueued, flushQueued]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();

    const content = text.trim();
    if (!content || selected === null) return;

    setError('');
    setText('');

    const clientId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = { content, to: selected, clientId };
    setMessages((current) => [
      ...current,
      pendingMessage(content, user.id, selected, clientId),
    ]);

    const socket = socketRef.current;
    if (!navigator.onLine || !socket || !socket.connected) {
      queueMessage(token, payload).catch(() =>
        setError('Could not save the message on this device.')
      );
      return;
    }

    socket.emit('chat:send', payload, (reply) => {
      if (reply && reply.ok) {
        setMessages((current) => current.filter((m) => m.id !== clientId));
        openConversation(selected);
      } else {
        queueMessage(token, payload).catch(() => {});
        setError((reply && reply.error) || 'Message will be sent when connected again.');
      }
    });
  }

  const current = conversations.find((c) => c.buyer_id === selected);

  return (
    <div>
      <h2 className="page-title">Chat</h2>
      <p className={connected ? 'chat-status online' : 'chat-status'}>
        {connected
          ? 'Connected'
          : 'Offline — messages will be sent when you are back online'}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="admin-chat">
        <div className="conversation-list">
          {conversations.length === 0 && <p>No conversations yet.</p>}

          {conversations.map((c) => (
            <button
              key={c.buyer_id}
              className={
                c.buyer_id === selected
                  ? 'conversation-item active'
                  : 'conversation-item'
              }
              onClick={() => openConversation(c.buyer_id)}
            >
              <strong>{c.name}</strong>
              <span>{c.last_message}</span>
            </button>
          ))}
        </div>

        <div className="chat-box">
          {selected === null ? (
            <div className="chat-messages">
              <p className="chat-empty">Select a buyer to start chatting.</p>
            </div>
          ) : (
            <>
              <div className="chat-messages" ref={listRef}>
                {messages
                  .filter((m) => m.buyer_id === selected)
                  .map((m) => (
                    <div
                      key={m.id}
                      className={`bubble ${m.sender_id === m.buyer_id ? 'theirs' : 'mine'} ${m.pending ? 'pending' : ''}`}
                    >
                      <p>{m.content}</p>
                      <span>{m.pending ? 'Sending...' : formatTime(m.created_at)}</span>
                    </div>
                  ))}
              </div>

              <form className="chat-form" onSubmit={handleSend}>
                <input
                  placeholder="Type a reply..."
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
                  Replies sent offline will show “Sending...” until delivered.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminChat;
