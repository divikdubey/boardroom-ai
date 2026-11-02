import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { API_URL } from "../config";

const AuthContext = createContext(null);
const TOKEN_KEY = "boardroom_token";

// localStorage can be blocked, so wrap in try/catch
const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const saveToken = (t) => {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
};
const clearToken = () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(readToken());
  const [loading, setLoading] = useState(Boolean(readToken()));

  // On page load: ask the backend if the saved token is still valid
  useEffect(() => {
    const saved = readToken();
    if (!saved) {
      setLoading(false);
      return;
    }
    request("/auth/me", { headers: { Authorization: `Bearer ${saved}` } })
      .then((data) => setUser(data.user))
      .catch(() => {
        clearToken();
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const finish = (data) => {
    saveToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (email, password) =>
    finish(
      await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    );

  const signup = async (name, email, password) =>
    finish(
      await request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      })
    );

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
  }, []);

  // fetch + token. If the backend says 401, the token is bad, so log out
  const authFetch = useCallback(
    (path, options = {}) =>
      fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => {
        if (res.status === 401) logout();
        return res;
      }),
    [token, logout]
  );

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, signup, logout, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);