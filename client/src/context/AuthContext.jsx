import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const TOKEN_KEY = 'pizza-shop-admin-token';
const AuthContext = createContext(null);

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(readToken()));

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  // Re-validate a stored token when the app loads.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    api('/auth/me', { token })
      .then((d) => !cancelled && setUser(d.user))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async (username, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { username, password } });
    writeToken(d.token);
    setUser(d.user);
    setToken(d.token);
    return d.user;
  }, []);

  /** api() with the admin token attached; an expired token logs the user out. */
  const authApi = useCallback(
    async (path, options = {}) => {
      try {
        return await api(path, { ...options, token });
      } catch (err) {
        if (err.status === 401) logout();
        throw err;
      }
    },
    [token, logout]
  );

  const value = useMemo(
    () => ({ token, user, loading, login, logout, authApi }),
    [token, user, loading, login, logout, authApi]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
