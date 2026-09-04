import { useCallback, useEffect, useState } from 'react';

export const SIDEBAR_COLLAPSED_KEY = 'roots_sidebar_collapsed';
export const SIDEBAR_COLLAPSED_EVENT = 'roots-sidebar-collapsed';

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist compact sidebar and notify open layouts (Settings prefs + header toggle). */
export function setSidebarCollapsed(next: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(SIDEBAR_COLLAPSED_EVENT, { detail: next }),
  );
}

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setCollapsed(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_COLLAPSED_KEY) {
        setCollapsed(e.newValue === '1');
      }
    };
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed(!readCollapsed());
  }, []);

  return {
    collapsed,
    toggleCollapse,
    setCollapsed: setSidebarCollapsed,
    mobileOpen,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
  };
}
