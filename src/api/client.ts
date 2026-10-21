import axios, { AxiosError } from "axios";

export type AuthScope = "TENANT" | "PLATFORM" | null;

let accessToken: string | null = null;
let scope: AuthScope = null;

export function setAuth(token: string | null, authScope: AuthScope) {
  accessToken = token;
  scope = authScope;
}

export function getAccessToken() {
  return accessToken;
}

export function getScope() {
  return scope;
}

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const path = scope === "PLATFORM" ? "/platform/auth/refresh" : "/auth/refresh";
  try {
    const response = await api.post(path);
    const token = response.data.accessToken as string;
    setAuth(token, scope);
    return token;
  } catch {
    setAuth(null, null);
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (error.response?.status === 401 && code === "TOKEN_EXPIRED" && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface ApiErrorBody {
  code: string;
  detail: string;
  requestId: string;
  details?: Record<string, unknown>;
}

export function apiErrorCode(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  return axiosError.response?.data?.code ?? "INTERNAL_ERROR";
}
