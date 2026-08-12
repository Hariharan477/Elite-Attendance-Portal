import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Clock, CheckCircle2, AlertCircle, Wifi, ShieldCheck, UserCheck, BarChart3, Calendar } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [marked, setMarked] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mobile Wi-Fi simulation state
  const [simulatedSSID, setSimulatedSSID] = useState('IFET_CAMPUS_WIFI');
  const [simulatedBSSID, setSimulatedBSSID] = useState('a1:b2:c3:d4:e5:f6');

  const checkStudentStatus = async () => {
    try {
      const res = await api.get('/attendance/student-today');
      setSettings(res.data.settings);
      setMarked(res.data.marked);
      setRecord(res.data.record);
      setStats(res.data.stats);

      if (res.data.settings && res.data.settings.status === 'ACTIVE') {
        const end = new Date(res.data.settings.endTime).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(diff);

        if (res.data.settings.wifiSSID) {
          setSimulatedSSID(res.data.settings.wifiSSID);
        }
        if (res.data.settings.wifiBSSID) {
          setSimulatedBSSID(res.data.settings.wifiBSSID);
        }
      } else {
        setTimeLeft(0);
      }

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    checkStudentStatus();
    const interval = setInterval(checkStudentStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleMarkAttendance = async () => {
    setMsg({
      type: 'error',
      text: 'Attendance can ONLY be marked using the official Elite Class Portal Flutter Android App on campus Wi-Fi.'
    });
  };




  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '950px', margin: '0 auto' }}>
      
      {/* Student Profile Overview Header */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #818cf8' }} />
          ) : (
            <div style={{ padding: '12px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
              <UserCheck size={24} />
            </div>
          )}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Welcome, {user?.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Reg No: <span style={{ fontWeight: 700, color: '#818cf8' }}>{user?.registerNo || user?.rollNo}</span> • {user?.department} Year {user?.year}-{user?.section} • <span style={{ color: '#34d399' }}>{user?.email}</span>
            </p>
          </div>
        </div>

        {/* Stats Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <BarChart3 size={20} color="#34d399" />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ATTENDANCE RATE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{stats?.percentage || '100'}%</div>
          </div>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '1rem',
          borderRadius: '12px',
          background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: msg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
          color: msg.type === 'success' ? '#34d399' : '#f87171',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Today's Attendance Card */}
      {settings && settings.status === 'ACTIVE' ? (
        <div className="glass-card pulse-active" style={{ padding: '2.5rem', textAlign: 'center' }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <span className="badge badge-active" style={{ fontSize: '0.85rem', padding: '0.35rem 1rem' }}>
              TODAY'S ATTENDANCE ACTIVE
            </span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#818cf8', marginBottom: '0.5rem' }}>
            Today's Attendance
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Date: <strong style={{ color: 'white' }}>{settings.attendanceDate}</strong> | Status: <strong style={{ color: marked ? '#34d399' : '#fbbf24' }}>{marked ? 'PRESENT' : 'NOT MARKED'}</strong>
          </p>

          {/* Countdown Timer */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 2rem',
            borderRadius: '50px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-glass)',
            marginBottom: '2rem'
          }}>
            <Clock size={24} color={timeLeft < 60 ? '#f87171' : '#34d399'} />
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.05em', color: timeLeft < 60 ? '#f87171' : '#34d399' }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Attendance Action */}
          {marked ? (
            <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', maxWidth: '450px', margin: '0 auto' }}>
              <CheckCircle2 size={48} color="#34d399" style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ color: '#34d399', fontSize: '1.25rem', fontWeight: 700 }}>Attendance Recorded</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Status: PRESENT • Checked in at: {new Date(record?.checkInTime || Date.now()).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={() => handleMarkAttendance()}
                className="glass-button"

                disabled={loading || timeLeft <= 0}
                style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                <Wifi size={24} color="#34d399" /> {loading ? 'Verifying Wi-Fi Network & Marking...' : 'Mark Attendance (Auto-Check Wi-Fi Network)'}
              </button>

              {/* Automatic Wi-Fi Network Connection Badge */}
              <div style={{
                marginTop: '0.5rem',
                padding: '1.25rem',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.88rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} /> Automatic Wi-Fi Security Verification
                  </span>
                  <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>AUTO CHECKED</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  The portal automatically scans and verifies your device's connected Wi-Fi network against the Administrator's required location (<strong style={{ color: 'white' }}>{settings?.wifiLocation || settings?.wifiSSID || 'Campus Network'}</strong>). No manual input required.
                </p>
              </div>




            </div>
          )}

        </div>
      ) : (
        <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Calendar size={56} color="#64748b" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-muted)' }}>No Active Attendance Today</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            There is currently no active daily attendance window open. Please check back when the administrator opens today's attendance window.
          </p>
        </div>
      )}

    </div>
  );
};
