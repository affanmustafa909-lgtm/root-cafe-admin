import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, ShoppingBag, Wallet } from 'lucide-react';
import { api, dataOf } from '@/shared/api/client';
import { mediaUrl } from '@/shared/lib/media';
import type { Order } from '@/shared/types';
import { mapOrder } from '@/shared/lib/mappers';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  Skeleton,
} from '@/shared/ui';
import {
  dateOnly,
  dateTime,
  money,
  orderStatusTone,
  titleCase,
} from '@/shared/lib/format';

type CustomerDetail = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  accountStatus?: string;
  createdAt?: string;
  orders: Order[];
};

export function CustomerDetailPage() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const raw = dataOf<Record<string, unknown>>(
        await api.get(`/admin/customers/${id}`),
      );
      const orders = (
        (raw.orders as Record<string, unknown>[] | undefined) ?? []
      ).map(mapOrder);
      return {
        id: raw.id as string,
        name: raw.name as string,
        email: raw.email as string | undefined,
        phone: raw.phone as string | undefined,
        avatarUrl: (raw.avatarUrl as string | null | undefined) ?? null,
        accountStatus: raw.accountStatus as string | undefined,
        createdAt: raw.createdAt as string | undefined,
        orders,
      } satisfies CustomerDetail;
    },
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-28 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load customer"
        message="Something went wrong while fetching this profile."
        onRetry={() => void q.refetch()}
      />
    );
  }

  const c = q.data!;
  const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const lastOrder = c.orders[0];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={c.name}
        description="Customer profile and order history."
        action={
          <Link to="/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} aria-hidden />
              Back to customers
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar
              name={c.name}
              src={mediaUrl(c.avatarUrl)}
              size="lg"
            />
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">{c.name}</h3>
              <Badge tone="green">
                {titleCase(c.accountStatus || 'active')}
              </Badge>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <Mail size={13} aria-hidden />
                Email
              </dt>
              <dd className="mt-1 font-medium text-[var(--foreground)]">
                {c.email || '—'}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <Phone size={13} aria-hidden />
                Phone
              </dt>
              <dd className="mt-1 font-medium text-[var(--foreground)]">
                {c.phone || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Customer since</dt>
              <dd className="mt-1 font-medium text-[var(--foreground)]">
                {dateOnly(c.createdAt)}
              </dd>
            </div>
            {lastOrder && (
              <div>
                <dt className="text-[var(--muted-foreground)]">Last order</dt>
                <dd className="mt-1 font-medium text-[var(--foreground)]">
                  {dateTime(lastOrder.createdAt)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <MetricCard
            label="Orders"
            value={c.orders.length}
            hint="Lifetime orders"
            icon={ShoppingBag}
            accent="blue"
          />
          <MetricCard
            label="Total spent"
            value={money(totalSpent)}
            hint="Across all orders"
            icon={Wallet}
            accent="gold"
          />
        </section>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-[var(--foreground)]">
          Order history
        </h2>
        {!c.orders.length ? (
          <EmptyState
            title="No orders yet"
            message="This customer has not placed any orders."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Placed</th>
                  <th>Items</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        className="font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        to={`/orders/${o.id}`}
                      >
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <Badge tone={orderStatusTone(o.status)}>
                        {titleCase(o.status)}
                      </Badge>
                    </td>
                    <td className="text-[var(--muted-foreground)]">
                      {dateTime(o.createdAt)}
                    </td>
                    <td>
                      {o.items?.reduce((n, i) => n + i.quantity, 0) || 0}
                    </td>
                    <td>
                      <span className="font-bold">{money(o.total)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
