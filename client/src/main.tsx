import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const savedClientId = localStorage.getItem('elite_google_client_id');
const GOOGLE_CLIENT_ID = savedClientId || "1067204780517-samplegoogleclientid.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
