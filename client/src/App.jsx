import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading Chatter…</span>
      </div>
    );
  }

  return user ? <ChatPage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
