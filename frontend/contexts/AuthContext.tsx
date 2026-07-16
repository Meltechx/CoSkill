"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, AuthResponse } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      auth
        .me(savedToken)
        .then((u) => {
          setUser(u);
          setToken(savedToken);
        })
        .catch(() => {
          localStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthResponse = (res: AuthResponse) => {
    setUser(res.user);
    setToken(res.session.access_token);
    localStorage.setItem("token", res.session.access_token);
  };

  const login = async (email: string, password: string) => {
    const res = await auth.login(email, password);
    handleAuthResponse(res);
  };

  const register = async (email: string, password: string, full_name: string) => {
    const res = await auth.register(email, password, full_name);
    handleAuthResponse(res);
  };

  const logout = async () => {
    if (token) {
      try {
        await auth.logout(token);
      } catch {}
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
