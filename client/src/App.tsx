import React from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { LogOut, ShieldCheck, User } from 'lucide-react';

export const App: React.FC = () => {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontSize: '1.2rem', fontWeight: 600 }}>
        Connecting to IFET Portal...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="glass-card" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
              <ShieldCheck size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ELITE CLASS PORTAL
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IFET College of Engineering • Smart Attendance</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{user.name}</div>
              <span className="badge badge-role" style={{ fontSize: '0.65rem' }}>{user.role}</span>
            </div>

            <button onClick={logout} className="glass-button-outline" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>

        </div>
      </header>

      {/* Main View Router strictly by 2 Roles (admin | student) */}
      <main style={{ flex: 1 }}>
        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'student' && <StudentDashboard />}
      </main>

      {/* Footer */}
      <footer style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', borderTop: '1px solid var(--border-glass)', marginTop: 'auto' }}>
        IFET College of Engineering • Elite Attendance Portal © 2026 • Strictly Protected by @ifet.ac.in Google Auth
      </footer>

    </div>
  );
};
