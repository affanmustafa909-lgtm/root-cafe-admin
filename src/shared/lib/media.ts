import { mediaBaseUrl } from './apiBase';

/** Resolve relative `/uploads/...` paths (and data URIs) for admin previews. */
export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:)/i.test(path)) return path;
  const base = mediaBaseUrl();
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
