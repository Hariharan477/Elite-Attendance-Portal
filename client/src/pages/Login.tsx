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
      backgroundColor: 'var(--bg-page)',
      background: 'radial-gradient(circle at 50% 0%, #EEF9F2 0%, #F7FBF8 70%)',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        padding: '3rem 2.25rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid #DDEBE3',
        borderRadius: '24px',
        boxShadow: '0 12px 32px rgba(11, 143, 85, 0.06)'
      }}>

        {/* Portal Logo */}
        <div style={{
          display: 'inline-flex',
          padding: '18px',
          borderRadius: '20px',
          background: 'var(--bg-pale)',
          border: '1.5px solid var(--bg-light)',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(11, 143, 85, 0.12)'
        }}>
          <ShieldCheck size={44} color="#0B8F55" />
        </div>

        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
          Elite <span style={{ color: 'var(--primary-green)' }}>Class Portal</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500, marginBottom: '2.25rem' }}>
          Smart Attendance Management System
        </p>

        {error && (
          <div style={{
            padding: '0.875rem 1rem',
            borderRadius: '12px',
            background: 'var(--error-bg)',
            border: '1px solid rgba(224, 82, 82, 0.25)',
            color: 'var(--error-red)',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '1.75rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--error-red)' }} />
            <div>{error}</div>
          </div>
        )}

        {/* Official Google OAuth 2.0 Button - White Theme with Outline */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="320"
          />
        </div>

        {loading && (
          <p style={{ color: 'var(--primary-green)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
            Verifying Google credentials with server...
          </p>
        )}

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.5', fontWeight: 500 }}>
          Sign in using your Google Account (<strong style={{ color: 'var(--text-primary)' }}>@gmail.com</strong> or College Email)
        </p>

      </div>
    </div>
  );
};

