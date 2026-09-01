import { useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, Menu, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { useSidebarState } from './useSidebarState';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar, Button } from '@/shared/ui';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/customers': 'Customers',
  '/menu': 'Menu',
  '/menu/products': 'Products',
  '/menu/products/new': 'New product',
  '/menu/categories': 'Categories',
  '/menu/customizations': 'Customizations',
  '/menu/cake-of-day': 'Cake of the Day',
  '/menu/home-banner': 'Home Banner',
  '/settings/pickup': 'Pickup schedule',
  '/settings': 'Settings',
  '/reports': 'Reports',
};

function resolveTitle(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/orders/')) return 'Order detail';
  if (pathname.startsWith('/customers/')) return 'Customer';
  if (pathname.includes('/menu/products/') && pathname.endsWith('/edit')) {
    return 'Edit product';
  }
  return 'Admin';
}

function breadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; to?: string }[] = [];
  let acc = '';
  for (const part of parts) {
    acc += `/${part}`;
    const label =
      titles[acc] ||
      (part.match(/^[0-9a-f-]{8,}$/i) ? 'Detail' : part.replace(/-/g, ' '));
    crumbs.push({ label, to: acc });
  }
  return crumbs;
}

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const {
    collapsed,
    toggleCollapse,
    mobileOpen,
    openMobile,
    closeMobile,
  } = useSidebarState();

  const title = useMemo(
    () => resolveTitle(location.pathname),
    [location.pathname],
  );
  const crumbs = useMemo(
    () => breadcrumbs(location.pathname),
    [location.pathname],
  );

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(new Date()),
    [],
  );

  const sidebarOffset = collapsed
    ? 'lg:ml-[var(--sidebar-collapsed)]'
    : 'lg:ml-[var(--sidebar-width)]';

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-200 ${sidebarOffset}`}
      >
        <header className="sticky top-0 z-20 flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_78%,transparent)] px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            className="inline-flex rounded-[var(--radius-md)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:hidden"
            onClick={openMobile}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <nav
              className="hidden items-center gap-1.5 text-[13px] text-[var(--muted-foreground)] sm:flex"
              aria-label="Breadcrumb"
            >
              <Link
                to="/dashboard"
                className="hover:text-[var(--foreground)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Home
              </Link>
              {crumbs.map((c, i) => (
                <span key={c.to} className="flex items-center gap-1.5">
                  <span className="text-[var(--border)]" aria-hidden>
                    /
                  </span>
                  {i === crumbs.length - 1 ? (
                    <span className="font-medium capitalize text-[var(--foreground)]">
                      {c.label}
                    </span>
                  ) : (
                    <Link
                      to={c.to!}
                      className="capitalize hover:text-[var(--foreground)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      {c.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
            <p className="truncate font-display text-base font-semibold text-[var(--foreground)] sm:hidden">
              {title}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] shadow-[var(--shadow-xs)] sm:inline-flex">
              <CalendarDays size={13} aria-hidden />
              {today}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-[var(--muted-foreground)] sm:inline-flex"
              onClick={() => void qc.invalidateQueries()}
              aria-label="Refresh data"
            >
              <RefreshCw size={14} aria-hidden />
            </Button>

            <div className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] py-1 pr-3 pl-1 shadow-[var(--shadow-sm)]">
              <Avatar name={user?.name} size="sm" />
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[9rem] truncate text-xs font-semibold text-[var(--foreground)]">
                  {user?.name}
                </p>
                <p className="text-[11px] capitalize text-[var(--muted-foreground)]">
                  {user?.role?.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
