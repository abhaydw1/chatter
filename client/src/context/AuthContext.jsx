import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ping the backend on mount to wake it up (Render free tier sleeps after inactivity).
  // This runs silently in the background so the backend is warm when the user submits the form.
  useEffect(() => { api.get('/health').catch(() => {}); }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('chatter_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        initSocket(token);
      })
      .catch(() => {
        localStorage.removeItem('chatter_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('chatter_token', data.token);
    setUser(data.user);
    initSocket(data.token);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('chatter_token', data.token);
    setUser(data.user);
    initSocket(data.token);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('chatter_token');
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
