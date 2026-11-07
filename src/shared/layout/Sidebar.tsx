import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
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
  Scale,
  Sparkles,
  UserRound,
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
  const manage = canManage(user?.role);

  const groups = useMemo<NavGroup[]>(() => {
    const main: NavItem[] = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/orders', label: 'Orders', icon: ClipboardList },
      ...(manage
        ? [{ to: '/customers', label: 'Customers', icon: Users }]
        : []),
      { to: '/account', label: 'Account', icon: UserRound },
    ];

    const analytics: NavItem[] = manage
      ? [{ to: '/reports', label: 'Reports', icon: ChartNoAxesCombined }]
      : [];

    const menu: NavItem[] = manage
      ? [
          { to: '/menu', label: 'Menu overview', icon: Utensils, end: true },
          { to: '/menu/products', label: 'Products', icon: Package },
          { to: '/menu/categories', label: 'Categories', icon: FolderTree },
          {
            to: '/menu/customizations',
            label: 'Customizations',
            icon: SlidersHorizontal,
          },
          { to: '/menu/cake-of-day', label: 'Cake of the Day', icon: CakeSlice },
          { to: '/menu/home-banner', label: 'Home Banner', icon: ImageIcon },
        ]
      : [];

    const settings: NavItem[] = manage
      ? [
          { to: '/settings', label: 'Settings overview', icon: Settings, end: true },
          { to: '/settings/pickup', label: 'Pickup schedule', icon: Clock3 },
          { to: '/settings/stamp-card', label: 'Stamp card', icon: Stamp },
          { to: '/settings/legal', label: 'Legal pages', icon: Scale },
          {
            to: '/settings/onboarding',
            label: 'Get Started',
            icon: Sparkles,
          },
        ]
      : [];

    return [
      { id: 'main', label: 'Operations', items: main },
      ...(analytics.length
        ? [{ id: 'analytics', label: 'Analytics', items: analytics }]
        : []),
      ...(menu.length ? [{ id: 'menu', label: 'Menu', items: menu }] : []),
      ...(settings.length
        ? [{ id: 'settings', label: 'Settings', items: settings }]
        : []),
    ];
  }, [manage]);

  const collapsedItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/orders', label: 'Orders', icon: ClipboardList },
      { to: '/account', label: 'Account', icon: UserRound },
    ];
    if (manage) {
      items.push(
        { to: '/customers', label: 'Customers', icon: Users },
        { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
        { to: '/menu/products', label: 'Products', icon: Package },
        { to: '/settings', label: 'Settings', icon: Settings, end: true },
      );
    }
    return items;
  }, [manage]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''} ${
      collapsed ? 'nav-link-collapsed' : ''
    }`;

  return (
    <aside
      className={`sidebar-shell flex h-full flex-col transition-[width] duration-200 ${
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
      }`}
    >
      <div
        className={`sidebar-brand flex shrink-0 items-center ${
          collapsed
            ? 'flex-col gap-2 px-2 py-3.5'
            : 'h-[var(--header-height)] gap-3 px-4'
        }`}
      >
        <div className="sidebar-logo-mark">
          <img src="/logo.png" alt="" className="size-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-[15px] leading-none font-semibold tracking-tight text-white">
              Roots Café
            </p>
            <p className="mt-1.5 truncate text-[11px] leading-none tracking-wide text-white/45">
              Staff console
            </p>
          </div>
        )}
        {showCollapseToggle && (
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        )}
      </div>

      <nav
        className={`sidebar-nav flex-1 overflow-y-auto ${
          collapsed ? 'px-2 py-3' : 'px-3 py-4'
        }`}
        aria-label="Main"
      >
        {collapsed ? (
          <div className="space-y-1">
            {collapsedItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={linkClass}
                onClick={onNavigate}
              >
                <span className="nav-link-icon">
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`nav-${group.id}`}>
                <p className="nav-section-label" id={`nav-${group.id}`}>
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={linkClass}
                      onClick={onNavigate}
                    >
                      <span className="nav-link-icon">
                        <Icon size={16} strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="truncate">{label}</span>
                    </NavLink>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </nav>

      <div
        className={`sidebar-footer shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={user?.name} size="sm" />
            <button
              type="button"
              className="sidebar-icon-btn"
              onClick={() => void logout()}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div className="sidebar-user">
            <Avatar name={user?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight font-semibold text-white">
                {user?.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] leading-none capitalize text-white/45">
                {user?.role?.toLowerCase()}
              </p>
            </div>
            <button
              type="button"
              className="sidebar-icon-btn"
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
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition-opacity lg:hidden ${
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
