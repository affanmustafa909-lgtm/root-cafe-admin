import { LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar, Badge, Button, PageHeader } from '@/shared/ui';
import { AccountCredentialsForm } from './AccountCredentialsForm';

export function AccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Account"
        description="Manage your admin login email and password."
      />

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
            <div className="mt-2">
              <Badge tone="teal">{user?.role}</Badge>
            </div>
          </div>
        </div>

        <AccountCredentialsForm />

        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <Button variant="outline" onClick={() => void logout()}>
            <LogOut size={15} aria-hidden />
            Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}
