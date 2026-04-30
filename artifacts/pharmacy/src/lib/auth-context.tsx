import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setAuthTokenGetter, useLogin as useLoginMutation, useLogout as useLogoutMutation } from "@workspace/api-client-react";

interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: false,
  login: async () => {},
  logout: async () => {},
});

const TOKEN_KEY = "pharma_token";
const USER_KEY = "pharma_user";

function setupAuthToken(token: string | null) {
  setAuthTokenGetter(token ? () => token : null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  useEffect(() => {
    setupAuthToken(token);
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await loginMutation.mutateAsync({ data: { username, password } });
      const { token: newToken, user: newUser } = result as { token: string; user: AuthUser };
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setupAuthToken(newToken);
    } finally {
      setIsLoading(false);
    }
  }, [loginMutation]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setupAuthToken(null);
  }, [logoutMutation]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
