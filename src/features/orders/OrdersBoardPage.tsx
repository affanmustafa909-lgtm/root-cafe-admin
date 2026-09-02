import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock3,
  Inbox,
  PackageCheck,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import type { Order, OrderStatus } from '@/shared/types';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  useToast,
} from '@/shared/ui';
import {
  dateTime,
  money,
  paymentStatusTone,
  titleCase,
} from '@/shared/lib/format';
import { mapOrder } from '@/shared/lib/mappers';
import { useSocket } from '@/shared/hooks/useSocket';

const cols: OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COMPLETED',
];

const next: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }>
> = {
  RECEIVED: { status: 'PREPARING', label: 'Prepare' },
  PREPARING: { status: 'READY_FOR_PICKUP', label: 'Mark ready' },
  READY_FOR_PICKUP: { status: 'COMPLETED', label: 'Complete' },
};

const columnMeta: Record<
  OrderStatus,
  { label: string; dot: string; hint: string; icon: typeof Inbox }
> = {
  RECEIVED: {
    label: 'Received',
    dot: 'bg-sky-400',
    hint: 'New orders',
    icon: Inbox,
  },
  PREPARING: {
    label: 'Preparing',
    dot: 'bg-amber-400',
    hint: 'In the kitchen',
    icon: ChefHat,
  },
  READY_FOR_PICKUP: {
    label: 'Ready',
    dot: 'bg-[var(--success)]',
    hint: 'Awaiting pickup',
    icon: PackageCheck,
  },
  COMPLETED: {
    label: 'Completed',
    dot: 'bg-stone-400',
    hint: 'Fulfilled',
    icon: CheckCircle2,
  },
};

function itemCount(order: Order) {
  return order.items?.reduce((n, i) => n + i.quantity, 0) || 0;
}

function relativeTime(v?: string) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return dateTime(v);
}

function OrderCard({
  order,
  action,
  busy,
  onAdvance,
}: {
  order: Order;
  action?: { label: string };
  busy: boolean;
  onAdvance?: () => void;
}) {
  const count = itemCount(order);
  const paid = (order.paymentStatus || '').toUpperCase() === 'PAID';

  return (
    <article className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] hover:border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/orders/${order.id}`}
          className="font-semibold tracking-tight text-[var(--foreground)] underline-offset-2 hover:text-[var(--primary)] hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          #{order.orderNumber}
        </Link>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
          {money(order.total)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <Avatar name={order.customer?.name || 'Guest'} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">
            {order.customer?.name || 'Guest'}
          </p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {order.pickupTime || 'ASAP'}
            <span className="mx-1 text-[var(--border)]">·</span>
            {count} {count === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <Clock3 size={12} aria-hidden />
          <span title={dateTime(order.createdAt)}>
            {relativeTime(order.createdAt)}
          </span>
        </span>
        <Badge tone={paymentStatusTone(order.paymentStatus)}>
          {paid ? 'Paid' : titleCase(order.paymentStatus || 'unpaid')}
        </Badge>
      </div>

      {action && onAdvance && (
        <Button
          className="mt-3 w-full"
          size="sm"
          variant={order.status === 'READY_FOR_PICKUP' ? 'primary' : 'secondary'}
          loading={busy}
          onClick={onAdvance}
        >
          {action.label}
          <ArrowRight size={14} aria-hidden />
        </Button>
      )}
    </article>
  );
}

export function OrdersBoardPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['orders'],
    queryFn: async () =>
      dataOf<Order[]>(await api.get('/admin/orders')).map((o) =>
        mapOrder(o as unknown as Record<string, unknown>),
      ),
  });

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['orders'] });
  }, [qc]);

  const { connected } = useSocket(refresh);

  const m = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/admin/orders/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      setAdvancingId(id);
      await qc.cancelQueries({ queryKey: ['orders'] });
      const prev = qc.getQueryData<Order[]>(['orders']);
      if (prev) {
        qc.setQueryData<Order[]>(
          ['orders'],
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  ...(status === 'COMPLETED'
                    ? { paymentStatus: 'PAID' as const }
                    : {}),
                }
              : o,
          ),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast('Order updated');
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['orders'], ctx.prev);
      const msg = errorMessage(e);
      // Stale UI / double-click after success — refresh quietly.
      if (/invalid status transition/i.test(msg)) {
        refresh();
        return;
      }
      toast(msg, 'error');
    },
    onSettled: () => {
      setAdvancingId(null);
      refresh();
    },
  });

  const filtered = useMemo(() => {
    const orders = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter(
      (o) =>
        String(o.orderNumber).toLowerCase().includes(s) ||
        (o.customer?.name || '').toLowerCase().includes(s),
    );
  }, [q.data, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(cols.map((c) => [c, 0])) as Record<
      OrderStatus,
      number
    >;
    for (const o of filtered) map[o.status] = (map[o.status] ?? 0) + 1;
    return map;
  }, [filtered]);

  const activeCount =
    counts.RECEIVED + counts.PREPARING + counts.READY_FOR_PICKUP;

  if (q.isLoading) {
    return (
      <div className="page-enter space-y-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cols.map((s) => (
            <div className="space-y-3 rounded-xl bg-[var(--muted)] p-3" key={s}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load orders"
        message="Something went wrong while fetching your orders."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-[var(--foreground)]">
            Orders
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Live kitchen board
            {activeCount > 0 && (
              <>
                {' '}
                ·{' '}
                <span className="font-medium text-[var(--foreground)]">
                  {activeCount} active
                </span>
              </>
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] shadow-[var(--shadow-xs)]">
          <span
            className={
              connected
                ? 'live-dot'
                : 'size-1.5 rounded-full bg-[var(--muted-foreground)]'
            }
          />
          {connected ? 'Live' : 'Reconnecting…'}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden
          />
          <Input
            className="h-9 border-[var(--border)] bg-[var(--card)] pl-9 text-sm"
            placeholder="Search order # or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {cols.map((status) => {
            const Icon = columnMeta[status].icon;
            return (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
              >
                <Icon size={12} aria-hidden />
                {columnMeta[status].label}
                <span className="font-semibold tabular-nums text-[var(--foreground)]">
                  {counts[status]}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {!q.data?.length ? (
        <EmptyState
          title="No orders yet"
          message="Orders will appear here once customers place them."
          icon={ShoppingBag}
        />
      ) : !filtered.length ? (
        <EmptyState
          title="No matching orders"
          message="Try another search term."
        />
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cols.map((status) => {
            const meta = columnMeta[status];
            const Icon = meta.icon;
            const columnOrders = filtered.filter((o) => o.status === status);
            const action = next[status];

            return (
              <section
                key={status}
                className="flex min-h-[18rem] flex-col rounded-xl bg-[var(--muted)]/80 p-2.5"
                aria-label={`${meta.label} column`}
              >
                <header className="mb-2.5 flex items-center justify-between gap-2 px-1.5 pt-0.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="icon-well icon-well-stone size-8">
                      <Icon size={14} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[var(--foreground)]">
                        {meta.label}
                      </h2>
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        {meta.hint}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--card)] text-xs font-semibold tabular-nums text-[var(--foreground)] ring-1 ring-[var(--border)]">
                    {columnOrders.length}
                  </span>
                </header>

                <div className="flex flex-1 flex-col gap-2">
                  {!columnOrders.length ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 px-3 py-10 text-center text-xs text-[var(--muted-foreground)]">
                      No orders
                    </div>
                  ) : (
                    columnOrders.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        action={action}
                        busy={advancingId === o.id}
                        onAdvance={
                          action && !advancingId
                            ? () =>
                                m.mutate({
                                  id: o.id,
                                  status: action.status,
                                })
                            : undefined
                        }
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
