import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <h1>Chatter</h1>
        </div>
        <p className="auth-subtitle">
          {tab === 'login'
            ? 'Welcome back! Sign in to continue chatting.'
            : 'Create your account and start chatting.'}
        </p>

        <div className="auth-tabs">
          <button
            id="tab-login"
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            id="tab-register"
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                className="form-input"
                placeholder="e.g. alice123"
                value={form.username}
                onChange={handle}
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handle}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder={tab === 'register' ? 'At least 6 characters' : '••••••••'}
              value={form.password}
              onChange={handle}
              required
              minLength={6}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button id="btn-submit-auth" type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
