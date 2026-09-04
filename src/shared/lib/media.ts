import { mediaBaseUrl } from './apiBase';

/** Resolve relative `/uploads/...` paths for admin previews. */
export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = mediaBaseUrl();
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
