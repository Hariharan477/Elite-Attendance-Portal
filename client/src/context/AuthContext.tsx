import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  department?: string;
  year?: string;
  section?: string;
  rollNo?: string;
  registerNo?: string;
  profilePicture?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loginWithGoogleToken: (credential: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('elite_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('elite_token'));
  const [loading, setLoading] = useState(false);

  const loginWithGoogleToken = async (credential: string) => {
    const res = await api.post('/auth/google', { credential });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('elite_token', newToken);
    localStorage.setItem('elite_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('elite_token');
    localStorage.removeItem('elite_user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('elite_user', JSON.stringify(res.data));
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loginWithGoogleToken, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
