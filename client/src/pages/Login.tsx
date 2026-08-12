import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithGoogleToken } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setLoading(true);
    try {
      if (!credentialResponse.credential) {
        throw new Error('Google credential token missing');
      }
      await loginWithGoogleToken(credentialResponse.credential);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Authentication popup returned invalid_client or was cancelled.');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        padding: '3rem 2.5rem',
        textAlign: 'center'
      }} className="glass-card">

        {/* Portal Logo */}
        <div style={{
          display: 'inline-flex',
          padding: '18px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.25))',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          marginBottom: '1.75rem',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.35)'
        }}>
          <ShieldCheck size={48} color="#818cf8" />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '0.4rem' }}>
          Elite Class Portal
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2.25rem' }}>
          Smart Attendance Management System
        </p>

        {error && (
          <div style={{
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#f87171',
            fontSize: '0.875rem',
            marginBottom: '2rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        {/* Official Google OAuth 2.0 Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            theme="filled_blue"
            size="large"
            text="continue_with"
            shape="pill"
            width="320"
          />
        </div>

        {loading && (
          <p style={{ color: '#818cf8', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
            Verifying Google credentials with server...
          </p>
        )}

        <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: '1.5' }}>
          Sign in using your Google Account (<strong style={{ color: 'var(--text-muted)' }}>@gmail.com</strong> or College Email)
        </p>

      </div>
    </div>
  );
};
