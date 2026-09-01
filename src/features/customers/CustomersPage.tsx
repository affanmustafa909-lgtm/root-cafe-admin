import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { api, dataOf } from '@/shared/api/client';
import type { Customer } from '@/shared/types';
import { mapCustomer } from '@/shared/lib/mappers';
import {
  Avatar,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
} from '@/shared/ui';
import { dateOnly, money } from '@/shared/lib/format';

export function CustomersPage() {
  const [s, setS] = useState('');
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ['customers'],
    queryFn: async () =>
      dataOf<Record<string, unknown>[]>(await api.get('/admin/customers')).map(
        mapCustomer,
      ) as Customer[],
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Customers" description="Loading customers…" />
        <Skeleton className="h-10 max-w-sm" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load customers"
        message="Something went wrong while fetching customers."
        onRetry={() => void q.refetch()}
      />
    );
  }

  const rows = q.data?.filter((c) =>
    `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(s.toLowerCase()),
  );

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Customers"
        description={`${q.data?.length ?? 0} profiles · search by name, email, or phone`}
      />
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted-foreground)]"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Search customers…"
          value={s}
          onChange={(e) => setS(e.target.value)}
          aria-label="Search customers"
        />
      </div>
      {!rows?.length ? (
        <EmptyState
          title="No customers found"
          message="Try another search, or wait for new sign-ups."
          icon={Users}
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Orders</th>
                <th>Spend</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="row-link"
                  onClick={() => nav(`/customers/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      nav(`/customers/${c.id}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td>
                    <span className="inline-flex items-center gap-2.5">
                      <Avatar name={c.name} size="sm" />
                      <span className="font-semibold text-[var(--foreground)]">
                        {c.name}
                      </span>
                    </span>
                  </td>
                  <td className="text-[var(--muted-foreground)]">
                    {c.email || c.phone || '—'}
                  </td>
                  <td>{c.ordersCount ?? 0}</td>
                  <td className="font-semibold">{money(c.totalSpent)}</td>
                  <td className="text-[var(--muted-foreground)]">
                    {dateOnly(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
