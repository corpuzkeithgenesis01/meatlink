import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../socket';
import './Chat.css';

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
      const res = await fetch`(${API_URL}/api/chat/messages, {
        headers: { Authorization: Bearer ${token} },
      })`;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages');
      setMessages(data);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      loadHistory();
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

    return () => {
      socket.disconnect();
    };
  }, [token, loadHistory]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();

    const content = text.trim();
    if (!content || !socketRef.current) return;

    setError('');
    socketRef.current.emit('chat:send', { content }, (reply) => {
      if (!reply || !reply.ok) {
        setError((reply && reply.error) || 'Failed to send message');
      }
    });
    setText('');
  }

  return (
    <div>
      <h2>Chat with the seller</h2>
      <p className={connected ? 'chat-status online' : 'chat-status'}>
        {connected ? 'Connected' : 'Connecting...'}
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
              className={m.sender_id === user.id ? 'bubble mine' : 'bubble theirs'}
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
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          <button type="submit" disabled={!connected}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;