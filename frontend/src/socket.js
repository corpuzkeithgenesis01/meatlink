import { io } from 'socket.io-client';
import { API_URL } from './api';

// Gumawa ng bagong koneksyon sa chat server gamit ang token ng user
export function connectSocket(token) {
  return io(API_URL, {
    auth: { token },
  });
}
