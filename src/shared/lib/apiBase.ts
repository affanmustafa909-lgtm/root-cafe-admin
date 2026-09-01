/** API origin for REST, sockets, and uploaded media. */
export function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Dev server proxies /api → http://localhost:3000 (see vite.config.ts)
  if (import.meta.env.DEV) return '/api';
  return 'http://localhost:3000';
}

/** Socket.IO must share the page origin when using the Vite dev proxy. */
export function socketBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (import.meta.env.DEV) return window.location.origin;
  return 'http://localhost:3000';
}
