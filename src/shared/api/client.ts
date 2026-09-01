import axios from 'axios';
import { apiBaseUrl } from '@/shared/lib/apiBase';

const KEY = 'roots_admin_token';

export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (v: string | null) =>
  v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY);

export const api = axios.create({
  baseURL: apiBaseUrl(),
});

api.interceptors.request.use((c) => {
  const t = getToken();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(e);
  },
);

export const dataOf = <T,>(r: { data: T | { data: T } }): T =>
  r.data && typeof r.data === 'object' && 'data' in r.data
    ? (r.data as { data: T }).data
    : (r.data as T);

export function errorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) {
    return e instanceof Error ? e.message : 'Something went wrong';
  }
  const payload = e.response?.data as
    | { message?: string | string[]; error?: string }
    | undefined;
  const msg = payload?.message;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (typeof payload?.error === 'string') return payload.error;
  if (e.response?.status === 403) return 'You do not have permission for this action';
  if (!e.response) {
    return `Cannot reach the API at ${apiBaseUrl()}. Confirm Vercel was redeployed after setting VITE_API_URL, and that Railway CORS allows this site.`;
  }
  return e.message || 'Something went wrong';
}
