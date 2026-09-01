import { useState } from 'react';
import {
  Flag,
  LogOut,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar, Badge, Button, PageHeader } from '@/shared/ui';

const tabs = [
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'features', label: 'Features', icon: Flag },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<TabId>('account');
  const features = Object.entries(user?.features || {});

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Settings"
        description="Account details and café capabilities."
      />

      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-xs)]">
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
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <Button variant="outline" onClick={() => void logout()}>
              <LogOut size={15} aria-hidden />
              Sign out
            </Button>
          </div>
        </section>
      )}

      {tab === 'features' && (
        <section className="card max-w-xl p-6">
          <h2 className="section-title">Feature flags</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Capabilities enabled for your account by the server.
          </p>
          <div className="mt-5">
            {features.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No feature flags available.
              </p>
            ) : (
              features.map(([k, v], i) => (
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
              ))
            )}
          </div>
        </section>
      )}

      {tab === 'preferences' && (
        <section className="card max-w-xl p-6">
          <h2 className="section-title">Preferences</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Display preferences for this browser.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Compact sidebar
                </p>
                <p className="text-[var(--muted-foreground)]">
                  Collapse navigation on large screens via the sidebar toggle.
                </p>
              </div>
              <Badge tone="gray">Manual</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Live updates
                </p>
                <p className="text-[var(--muted-foreground)]">
                  Orders board refreshes automatically when connected.
                </p>
              </div>
              <Badge tone="green">On</Badge>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
