import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    () =>
      api.get('/auth/me').then((r) => {
        setUser(r.data.user);
        setPermissions(r.data.permissions || {});
      }),
    []
  );

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return setLoading(false);
    refresh()
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, [refresh]);

  // Pick up permission changes made by Super Admin without needing a re-login.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => refresh().catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setPermissions(data.permissions || {});
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setPermissions({});
  };

  const isSuperAdmin = user?.role === 'superadmin';
  const can = useCallback(
    (module, action = 'view') => isSuperAdmin || Boolean(permissions[module]?.includes(action)),
    [isSuperAdmin, permissions]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, can, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
