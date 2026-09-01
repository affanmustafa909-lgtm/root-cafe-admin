import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock3,
  CreditCard,
  MapPin,
  Wallet,
} from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import type { OrderStatus } from '@/shared/types';
import {
  Avatar,
  Badge,
  Button,
  ErrorState,
  PageHeader,
  Skeleton,
  useToast,
} from '@/shared/ui';
import {
  dateTime,
  money,
  orderStatusTone,
  paymentStatusTone,
  titleCase,
} from '@/shared/lib/format';
import { mapOrder } from '@/shared/lib/mappers';

const acts: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }>
> = {
  RECEIVED: { status: 'PREPARING', label: 'Accept / Start Preparing' },
  PREPARING: { status: 'READY_FOR_PICKUP', label: 'Mark Ready' },
  READY_FOR_PICKUP: {
    status: 'COMPLETED',
    label: 'Mark Paid & Completed',
  },
};

const steps: { status: OrderStatus; label: string }[] = [
  { status: 'RECEIVED', label: 'Received' },
  { status: 'PREPARING', label: 'Preparing' },
  { status: 'READY_FOR_PICKUP', label: 'Ready' },
  { status: 'COMPLETED', label: 'Completed' },
];

export function OrderDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({
    queryKey: ['order', id],
    queryFn: async () =>
      mapOrder(
        dataOf<Record<string, unknown>>(await api.get(`/admin/orders/${id}`)),
      ),
  });
  const m = useMutation({
    mutationFn: (status: OrderStatus) =>
      api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast('Order updated');
      void qc.invalidateQueries({ queryKey: ['order', id] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load order"
        message="Something went wrong while fetching this order."
        onRetry={() => void q.refetch()}
      />
    );
  }

  const o = q.data!;
  const action = acts[o.status];
  const current = steps.findIndex((s) => s.status === o.status);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={`Order #${o.orderNumber}`}
        description={`Placed ${dateTime(o.createdAt)}`}
        action={
          <Link to="/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} aria-hidden />
              Back to board
            </Button>
          </Link>
        }
      />

      <section className="card px-5 py-5 sm:px-6">
        <ol className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={step.status} className="flex flex-1 items-center gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? 'bg-[var(--primary)] text-white'
                      : active
                        ? 'bg-[color-mix(in_srgb,var(--primary)_16%,white)] text-[var(--primary)] ring-2 ring-[var(--primary)]'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {done ? <Check size={14} aria-hidden /> : i + 1}
                </span>
                <span
                  className={`text-sm font-medium ${
                    done || active
                      ? 'text-[var(--foreground)]'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <span
                    className={`hidden h-px flex-1 sm:block ${
                      done ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                    }`}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={orderStatusTone(o.status)}>{titleCase(o.status)}</Badge>
        <Badge tone={paymentStatusTone(o.paymentStatus)}>
          {titleCase(o.paymentStatus || 'unpaid')}
        </Badge>
        {action && (
          <Button
            loading={m.isPending}
            onClick={() => m.mutate(action.status)}
          >
            {action.label}
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="section-title">Customer</h3>
          <div className="mt-4 flex items-start gap-3">
            <Avatar name={o.customer?.name || 'Guest'} size="lg" />
            <div>
              <p className="font-semibold text-[var(--foreground)]">
                {o.customer?.name || 'Guest'}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {o.customer?.email || '—'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {o.customer?.phone || '—'}
              </p>
            </div>
          </div>
        </section>
        <section className="card p-5">
          <h3 className="section-title">Pickup & payment</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-2 text-[var(--muted-foreground)]">
                <MapPin size={14} aria-hidden />
                Pickup
              </dt>
              <dd className="font-semibold text-[var(--foreground)]">
                {o.pickupTime || 'ASAP'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-2 text-[var(--muted-foreground)]">
                <CreditCard size={14} aria-hidden />
                Method
              </dt>
              <dd className="font-semibold text-[var(--foreground)]">
                {o.paymentMethod || 'Pay at café'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-2 text-[var(--muted-foreground)]">
                <Clock3 size={14} aria-hidden />
                Placed
              </dt>
              <dd className="font-semibold text-[var(--foreground)]">
                {dateTime(o.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-2 text-[var(--muted-foreground)]">
                <Wallet size={14} aria-hidden />
                Total
              </dt>
              <dd className="font-bold text-[var(--foreground)]">
                {money(o.total)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h3 className="section-title">Line items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {o.items?.length ? (
                o.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-semibold text-[var(--foreground)]">
                        {item.name}
                      </div>
                      {item.customizations?.map((c, i) => (
                        <div
                          className="text-xs text-[var(--muted-foreground)]"
                          key={i}
                        >
                          {c.option} (+{money(c.price ?? 0)})
                        </div>
                      ))}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{money(item.unitPrice)}</td>
                    <td className="font-semibold">
                      {money(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-[var(--muted-foreground)]">
                    No items on this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 border-t border-[var(--border)] bg-[var(--muted)]/40 px-5 py-4 text-right text-sm">
          <p className="text-[var(--muted-foreground)]">
            Subtotal: {money(o.subtotal ?? o.total)}
          </p>
          <p className="text-[var(--muted-foreground)]">
            Tax: {money(o.tax ?? 0)}
          </p>
          <p className="pt-1 text-lg font-bold text-[var(--foreground)]">
            Total: {money(o.total)}
          </p>
        </div>
      </section>
    </div>
  );
}
