import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAuth, type AuthScope } from "@/api/client";
import type { AuthResponse, Role } from "@/api/types";
import { setLanguage } from "@/i18n/i18n";

interface CurrentUser {
  userId: string;
  role: Role;
  name: string;
  language: string;
  scope: AuthScope;
  tenantCode: string | null;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  loginTenant: (tenantCode: string, email: string, password: string) => Promise<void>;
  loginPlatform: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setMustChangePassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function fromResponse(data: AuthResponse, scope: AuthScope, tenantCode: string | null): CurrentUser {
  return {
    userId: data.userId, role: data.role, name: data.name, language: data.language,
    scope, tenantCode, mustChangePassword: data.mustChangePassword,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedTenantCode = sessionStorage.getItem("tenantCode");
      const storedScope = sessionStorage.getItem("scope") as AuthScope;
      try {
        if (storedScope === "PLATFORM") {
          setAuth(null, "PLATFORM");
          const res = await api.post<AuthResponse>("/platform/auth/refresh");
          setAuth(res.data.accessToken, "PLATFORM");
          setUser(fromResponse(res.data, "PLATFORM", null));
        } else if (storedScope === "TENANT") {
          setAuth(null, "TENANT");
          const res = await api.post<AuthResponse>("/auth/refresh");
          setAuth(res.data.accessToken, "TENANT");
          setUser(fromResponse(res.data, "TENANT", storedTenantCode));
          setLanguage(res.data.language === "ta" ? "ta" : "en");
        }
      } catch {
        setAuth(null, null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loginTenant = useCallback(async (tenantCode: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", { tenantCode, email, password });
    setAuth(res.data.accessToken, "TENANT");
    sessionStorage.setItem("scope", "TENANT");
    sessionStorage.setItem("tenantCode", tenantCode);
    setUser(fromResponse(res.data, "TENANT", tenantCode));
    setLanguage(res.data.language === "ta" ? "ta" : "en");
  }, []);

  const loginPlatform = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/platform/auth/login", { email, password });
    setAuth(res.data.accessToken, "PLATFORM");
    sessionStorage.setItem("scope", "PLATFORM");
    setUser(fromResponse(res.data, "PLATFORM", null));
  }, []);

  const logout = useCallback(async () => {
    const path = user?.scope === "PLATFORM" ? "/platform/auth/logout" : "/auth/logout";
    try { await api.post(path); } catch { /* ignore */ }
    setAuth(null, null);
    sessionStorage.clear();
    setUser(null);
  }, [user]);

  const setMustChangePassword = useCallback((value: boolean) => {
    setUser((u) => (u ? { ...u, mustChangePassword: value } : u));
  }, []);

  const value = useMemo(
    () => ({ user, loading, loginTenant, loginPlatform, logout, setMustChangePassword }),
    [user, loading, loginTenant, loginPlatform, logout, setMustChangePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
