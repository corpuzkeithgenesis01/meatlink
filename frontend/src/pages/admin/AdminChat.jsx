import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { connectSocket } from '../../socket';
import '../Chat.css';

function AdminChat() {
  const { token } = useAuth();

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
          setMessages(data);
        }
      } catch (err) {
        setError(err.message);
      }
    },
    [token]
  );

  useEffect(() => {
    loadConversations();

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      loadConversations();
      if (selectedRef.current !== null) {
        openConversation(selectedRef.current);
      }
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

    return () => {
      socket.disconnect();
    };
  }, [token, loadConversations, openConversation]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();

    const content = text.trim();
    if (!content || selected === null || !socketRef.current) return;

    setError('');
    socketRef.current.emit('chat:send', { content, to: selected }, (reply) => {
      if (!reply || !reply.ok) {
        setError((reply && reply.error) || 'Failed to send message');
      }
    });
    setText('');
  }

  const current = conversations.find((c) => c.buyer_id === selected);

  return (
    <div>
      <h2 className="page-title">Chat</h2>
      <p className={connected ? 'chat-status online' : 'chat-status'}>
        {connected ? 'Connected' : 'Connecting...'}
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
                <p className="chat-empty">
                  Chatting with {current ? current.name : 'buyer'}
                </p>

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.sender_id === m.buyer_id ? 'bubble theirs' : 'bubble mine'
                    }
                  >
                    <p>{m.content}</p>
                    <span>
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
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
                <button type="submit" disabled={!connected}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminChat;