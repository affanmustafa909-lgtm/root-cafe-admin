import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Utensils,
  Users,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  FolderTree,
  Package,
  SlidersHorizontal,
  CakeSlice,
  ImageIcon,
  Clock3,
  Stamp,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { canManage } from '@/shared/lib/roles';
import { Avatar } from '@/shared/ui';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

type PanelProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
  showCollapseToggle: boolean;
};

function SidebarPanel({
  collapsed,
  onToggleCollapse,
  onNavigate,
  showCollapseToggle,
}: PanelProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const manage = canManage(user?.role);
  const onMenuPath = location.pathname.startsWith('/menu');
  const onSettingsPath = location.pathname.startsWith('/settings');
  const [menuForced, setMenuForced] = useState<boolean | null>(null);
  const [settingsForced, setSettingsForced] = useState<boolean | null>(null);
  const menuOpen = menuForced ?? onMenuPath;
  const settingsOpen = settingsForced ?? onSettingsPath;

  const groups = useMemo<NavGroup[]>(() => {
    const main: NavItem[] = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/orders', label: 'Orders', icon: ClipboardList },
      ...(manage
        ? [{ to: '/customers', label: 'Customers', icon: Users }]
        : []),
    ];

    const analytics: NavItem[] = manage
      ? [{ to: '/reports', label: 'Reports', icon: ChartNoAxesCombined }]
      : [];

    return [
      { id: 'main', label: 'Main', items: main },
      ...(analytics.length
        ? [{ id: 'analytics', label: 'Analytics', items: analytics }]
        : []),
    ];
  }, [manage]);

  const menuChildren: NavItem[] = [
    { to: '/menu', label: 'Overview', icon: Utensils, end: true },
    { to: '/menu/products', label: 'Products', icon: Package },
    { to: '/menu/categories', label: 'Categories', icon: FolderTree },
    {
      to: '/menu/customizations',
      label: 'Customizations',
      icon: SlidersHorizontal,
    },
    { to: '/menu/cake-of-day', label: 'Cake of the Day', icon: CakeSlice },
    { to: '/menu/home-banner', label: 'Home Banner', icon: ImageIcon },
  ];

  const settingsChildren: NavItem[] = [
    { to: '/settings', label: 'Overview', icon: Settings, end: true },
    { to: '/settings/pickup', label: 'Pickup schedule', icon: Clock3 },
    { to: '/settings/stamp-card', label: 'Stamp card', icon: Stamp },
    { to: '/settings/onboarding', label: 'Get Started', icon: ImageIcon },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''} ${
      collapsed ? 'justify-center px-0' : ''
    }`;

  const renderExpandable = (
    label: string,
    Icon: LucideIcon,
    open: boolean,
    activePath: boolean,
    onToggle: () => void,
    children: NavItem[],
  ) => (
    <div>
      <button
        type="button"
        className={`nav-link w-full ${
          collapsed ? 'justify-center px-0' : ''
        } ${activePath ? 'text-white' : ''}`}
        onClick={onToggle}
        aria-expanded={open}
        title={collapsed ? label : undefined}
      >
        <span className="nav-link-icon">
          <Icon size={collapsed ? 18 : 17} aria-hidden />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{label}</span>
            <ChevronDown
              size={14}
              className={`shrink-0 text-[var(--sidebar-muted)] transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="nav-sub space-y-0.5">
          {children.map(({ to, label: childLabel, icon: ChildIcon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={linkClass}
              onClick={onNavigate}
            >
              <span className="nav-link-icon">
                <ChildIcon size={15} aria-hidden />
              </span>
              <span className="truncate">{childLabel}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <aside
      className={`flex h-full flex-col border-r border-white/[0.06] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width] duration-200 ${
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
      }`}
    >
      <div
        className={`flex shrink-0 items-center border-b border-white/[0.06] ${
          collapsed
            ? 'h-auto flex-col gap-2 px-2 py-3'
            : 'h-[var(--header-height)] gap-2.5 px-3'
        }`}
      >
        <img
          src="/logo.png"
          alt=""
          className={`shrink-0 object-contain ${collapsed ? 'size-10' : 'size-11'}`}
        />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-[15px] leading-tight font-semibold tracking-tight">
              Roots Café
            </p>
            <p className="mt-1 flex items-center gap-1" aria-hidden>
              <span className="h-1 w-2 rotate-[-28deg] rounded-full bg-[var(--sky)]" />
              <span className="h-1 w-2 rotate-[-28deg] rounded-full bg-[var(--navy)]" />
              <span className="h-1 w-2 rotate-[-28deg] rounded-full bg-[var(--coral)]" />
            </p>
          </div>
        )}
        {showCollapseToggle && (
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        )}
      </div>

      <nav
        className={`flex-1 overflow-y-auto py-3 ${collapsed ? 'px-2' : 'px-2.5'}`}
        aria-label="Main"
      >
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id}>
              {!collapsed && (
                <p className="nav-section-label">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={linkClass}
                    onClick={onNavigate}
                  >
                    <span className="nav-link-icon">
                      <Icon size={collapsed ? 18 : 17} aria-hidden />
                    </span>
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {manage && (
            <div>
              {!collapsed && (
                <p className="nav-section-label">Management</p>
              )}
              <div className="space-y-0.5">
                {renderExpandable(
                  'Menu',
                  Utensils,
                  menuOpen,
                  onMenuPath,
                  () => {
                    if (collapsed) {
                      onToggleCollapse();
                      setMenuForced(true);
                    } else {
                      setMenuForced((prev) => !(prev ?? onMenuPath));
                    }
                  },
                  menuChildren,
                )}
                {renderExpandable(
                  'Settings',
                  Settings,
                  settingsOpen,
                  onSettingsPath,
                  () => {
                    if (collapsed) {
                      onToggleCollapse();
                      setSettingsForced(true);
                    } else {
                      setSettingsForced((prev) => !(prev ?? onSettingsPath));
                    }
                  },
                  settingsChildren,
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div
        className={`shrink-0 border-t border-white/[0.06] ${
          collapsed ? 'p-2' : 'p-2.5'
        }`}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Avatar name={user?.name} size="sm" />
            <button
              type="button"
              className="rounded-md p-1.5 text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              onClick={() => void logout()}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg bg-[var(--sidebar-accent)] px-2 py-2">
            <Avatar name={user?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight font-semibold">
                {user?.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] leading-none text-[var(--sidebar-muted)]">
                {user?.role}
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 text-[var(--sidebar-muted)] hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              onClick={() => void logout()}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onMobileClose}
        aria-hidden
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarPanel
          collapsed={false}
          onToggleCollapse={onToggleCollapse}
          onNavigate={onMobileClose}
          showCollapseToggle={false}
        />
      </div>
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <SidebarPanel
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onNavigate={() => undefined}
          showCollapseToggle
        />
      </div>
    </>
  );
}
