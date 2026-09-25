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
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E2EDF0', padding: '0.85rem 2rem', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: '#DDF5E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#0B8F55" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#10231A' }}>
                ELITE CLASS PORTAL
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#66756D', fontWeight: 500 }}>IFET College of Engineering • Smart Attendance</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10231A' }}>{user.name}</div>
              <span className="badge badge-role" style={{ fontSize: '0.65rem' }}>{user.role}</span>
            </div>

            <button onClick={logout} className="glass-button-outline" style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}>
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
      <footer style={{ padding: '1.25rem', textAlign: 'center', color: '#66756D', fontSize: '0.82rem', borderTop: '1px solid #E2EDF0', marginTop: 'auto', background: '#FFFFFF' }}>
        IFET College of Engineering • Elite Attendance Portal © 2026 • Strictly Protected by @ifet.ac.in Google Auth
      </footer>

    </div>
  );
};
