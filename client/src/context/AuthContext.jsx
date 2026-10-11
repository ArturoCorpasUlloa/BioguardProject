import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bioguard_token');
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('bioguard_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      can: (permission) =>
        user?.role?.permissions?.some(({ permission: item }) => item.key === permission) || false,
      login: async (credentials) => {
        const data = await authApi.login(credentials);
        localStorage.setItem('bioguard_token', data.token);
        setUser(data.user);
        return data.user;
      },
      register: async (payload) => {
        const data = await authApi.register(payload);
        localStorage.setItem('bioguard_token', data.token);
        setUser(data.user);
        return data.user;
      },
      logout: () => {
        localStorage.removeItem('bioguard_token');
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
