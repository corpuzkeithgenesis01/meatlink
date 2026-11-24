import { createContext, useContext, useState } from 'react';
import { API_URL } from '../api';

const AuthContext = createContext(null);

function readSaved() {
  try {
    // sessionStorage is per tab, so a buyer tab and a seller tab in the same
    // browser can stay logged in as different accounts.
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const rawUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    const user = JSON.parse(rawUser);
    return token && user ? { token, user } : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readSaved);

  async function request(path, body) {
      
      const res = await fetch(`${API_URL}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setAuth({ token: data.token, user: data.user });
    return data;
  }

  const login = (email, password) => request('login', { email, password });
  const register = (name, email, password) =>
    request('register', { name, email, password });

  function logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ token: null, user: null });
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
