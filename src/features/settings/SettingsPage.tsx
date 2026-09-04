import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CakeSlice,
  Clock3,
  Coffee,
  FolderTree,
  ImageIcon,
  LogOut,
  Radio,
  SlidersHorizontal,
  Stamp,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  readCollapsed,
  setSidebarCollapsed,
  SIDEBAR_COLLAPSED_EVENT,
} from '@/shared/layout/useSidebarState';
import { Avatar, Badge, Button, PageHeader } from '@/shared/ui';

const tabs = [
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'cafe', label: 'Café', icon: Store },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
] as const;

type TabId = (typeof tabs)[number]['id'];

type ControlCard = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  well: string;
};

const cafeOps: ControlCard[] = [
  {
    to: '/settings/pickup',
    label: 'Pickup schedule',
    description: 'Open hours, ASAP estimate, and booking window.',
    icon: Clock3,
    well: 'icon-well-sky',
  },
  {
    to: '/settings/stamp-card',
    label: 'Stamp card',
    description: 'Loyalty stamps and free-drink rewards.',
    icon: Stamp,
    well: 'icon-well-amber',
  },
  {
    to: '/settings/onboarding',
    label: 'Get Started screens',
    description: 'Customer app onboarding slides and CTA.',
    icon: ImageIcon,
    well: 'icon-well-navy',
  },
  {
    to: '/menu/home-banner',
    label: 'Home banner',
    description: 'Featured image on the customer home screen.',
    icon: ImageIcon,
    well: 'icon-well-primary',
  },
  {
    to: '/menu/cake-of-day',
    label: 'Cake of the day',
    description: 'Publish today’s featured item.',
    icon: CakeSlice,
    well: 'icon-well-gold',
  },
];

const menuShortcuts: ControlCard[] = [
  {
    to: '/menu/products',
    label: 'Products',
    description: 'Pricing, images, and availability.',
    icon: Coffee,
    well: 'icon-well-primary',
  },
  {
    to: '/menu/categories',
    label: 'Categories',
    description: 'Organize products for browsing.',
    icon: FolderTree,
    well: 'icon-well-sky',
  },
  {
    to: '/menu/customizations',
    label: 'Customizations',
    description: 'Milk, size, extras, and more.',
    icon: SlidersHorizontal,
    well: 'icon-well-amber',
  },
];

function ControlGrid({ items }: { items: ControlCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ to, label, description, icon: Icon, well }) => (
        <Link
          key={to}
          to={to}
          className="card-interactive flex items-start gap-3 p-4"
        >
          <span className={`icon-well ${well} shrink-0`}>
            <Icon size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--foreground)]">
                {label}
              </span>
              <ArrowRight
                size={14}
                className="shrink-0 text-[var(--muted-foreground)]"
                aria-hidden
              />
            </span>
            <span className="mt-1 block text-sm text-[var(--muted-foreground)]">
              {description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<TabId>('cafe');
  const [compactSidebar, setCompactSidebar] = useState(readCollapsed);
  const features = Object.entries(user?.features || {});

  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setCompactSidebar(detail);
    };
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onCustom);
    return () => window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onCustom);
  }, []);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Settings"
        description="Account, café controls, and display preferences."
      />

      <div
        className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-xs)]"
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                tab === t.id
                  ? 'bg-[var(--muted)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              aria-selected={tab === t.id}
              role="tab"
            >
              <Icon size={15} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'account' && (
        <section className="card max-w-xl p-6">
          <div className="flex items-center gap-4 border-b border-[var(--border)] pb-5">
            <Avatar name={user?.name} size="lg" />
            <div>
              <p className="font-semibold text-[var(--foreground)]">
                {user?.name}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {user?.email}
              </p>
            </div>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted-foreground)]">Name</dt>
              <dd className="font-semibold text-[var(--foreground)]">
                {user?.name}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted-foreground)]">Email</dt>
              <dd className="text-[var(--foreground)]">{user?.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted-foreground)]">Role</dt>
              <dd>
                <Badge tone="teal">{user?.role}</Badge>
              </dd>
            </div>
          </dl>
          {features.length > 0 && (
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <h2 className="section-title">Server features</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Enabled for your account by the API.
              </p>
              <div className="mt-4">
                {features.map(([k, v], i) => (
                  <div
                    className={`flex items-center justify-between gap-3 py-3 ${
                      i < features.length - 1
                        ? 'border-b border-[var(--border)]'
                        : ''
                    }`}
                    key={k}
                  >
                    <span className="text-sm capitalize text-[var(--foreground)]">
                      {k}
                    </span>
                    <Badge tone={v ? 'green' : 'gray'}>
                      {v ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <Button variant="outline" onClick={() => void logout()}>
              <LogOut size={15} aria-hidden />
              Sign out
            </Button>
          </div>
        </section>
      )}

      {tab === 'cafe' && (
        <div className="space-y-8">
          <section className="space-y-3">
            <div>
              <h2 className="section-title">Café operations</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Hours, loyalty, app screens, and featured content.
              </p>
            </div>
            <ControlGrid items={cafeOps} />
          </section>
          <section className="space-y-3">
            <div>
              <h2 className="section-title">Menu</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Catalog shortcuts — full editors open on their own pages.
              </p>
            </div>
            <ControlGrid items={menuShortcuts} />
          </section>
        </div>
      )}

      {tab === 'preferences' && (
        <section className="card max-w-xl p-6">
          <h2 className="section-title">Preferences</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Display preferences for this browser.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Compact sidebar
                </p>
                <p className="text-[var(--muted-foreground)]">
                  Collapse navigation icons on large screens.
                </p>
              </div>
              <input
                type="checkbox"
                className="checkbox"
                checked={compactSidebar}
                onChange={(e) => {
                  const next = e.target.checked;
                  setCompactSidebar(next);
                  setSidebarCollapsed(next);
                }}
                aria-label="Compact sidebar"
              />
            </label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="icon-well icon-well-green mt-0.5 shrink-0">
                  <Radio size={16} aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Live updates
                  </p>
                  <p className="text-[var(--muted-foreground)]">
                    Orders board refreshes automatically when connected.
                  </p>
                </div>
              </div>
              <Badge tone="green">On</Badge>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
