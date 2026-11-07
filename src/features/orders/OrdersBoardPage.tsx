import { useMemo, useState } from 'react';
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
  XCircle,
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
import { DeclineOrderModal } from './DeclineOrderModal';

type BoardView = 'kitchen' | 'history';

const kitchenCols: OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'READY_FOR_PICKUP',
];

const historyCols: OrderStatus[] = ['COMPLETED', 'DECLINED'];

const next: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }>
> = {
  RECEIVED: { status: 'PREPARING', label: 'Start preparing' },
  PREPARING: { status: 'READY_FOR_PICKUP', label: 'Mark ready' },
  READY_FOR_PICKUP: { status: 'COMPLETED', label: 'Complete order' },
};

const columnMeta: Record<
  OrderStatus,
  {
    label: string;
    hint: string;
    icon: typeof Inbox;
    accent: string;
    well: string;
    headerBg: string;
  }
> = {
  RECEIVED: {
    label: 'Received',
    hint: 'Waiting to start',
    icon: Inbox,
    accent: 'bg-sky-400',
    well: 'icon-well-sky',
    headerBg: 'bg-[color-mix(in_srgb,var(--sky)_22%,var(--card))]',
  },
  PREPARING: {
    label: 'Preparing',
    hint: 'In the kitchen',
    icon: ChefHat,
    accent: 'bg-[var(--primary)]',
    well: 'icon-well-primary',
    headerBg: 'bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))]',
  },
  READY_FOR_PICKUP: {
    label: 'Ready',
    hint: 'Awaiting pickup',
    icon: PackageCheck,
    accent: 'bg-[var(--success)]',
    well: 'icon-well-green',
    headerBg: 'bg-[color-mix(in_srgb,var(--success)_12%,var(--card))]',
  },
  COMPLETED: {
    label: 'Completed',
    hint: 'Fulfilled orders',
    icon: CheckCircle2,
    accent: 'bg-stone-400',
    well: 'icon-well-stone',
    headerBg: 'bg-[color-mix(in_srgb,var(--muted)_70%,var(--card))]',
  },
  DECLINED: {
    label: 'Declined',
    hint: 'Could not fulfil',
    icon: XCircle,
    accent: 'bg-[var(--destructive)]',
    well: 'icon-well-amber',
    headerBg: 'bg-[color-mix(in_srgb,var(--destructive)_8%,var(--card))]',
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
  compact,
  onAdvance,
  onDecline,
}: {
  order: Order;
  action?: { label: string };
  busy: boolean;
  compact?: boolean;
  onAdvance?: () => void;
  onDecline?: () => void;
}) {
  const count = itemCount(order);
  const paid = (order.paymentStatus || '').toUpperCase() === 'PAID';
  const canDecline =
    order.status === 'RECEIVED' ||
    order.status === 'PREPARING' ||
    order.status === 'READY_FOR_PICKUP';
  const meta = columnMeta[order.status];

  if (compact) {
    return (
      <article className="group relative shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]/70 p-3 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:bg-[var(--card)] hover:shadow-[var(--shadow-sm)]">
        <span
          className={`absolute inset-y-0 left-0 w-[3px] ${meta.accent}`}
          aria-hidden
        />
        <div className="flex items-center gap-3 pl-1">
          <Avatar name={order.customer?.name || 'Guest'} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Link
                to={`/orders/${order.id}`}
                className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)] underline-offset-2 hover:text-[var(--primary)] hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                #{order.orderNumber}
              </Link>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
                {money(order.total)}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
              <span className="truncate font-medium text-[var(--foreground)]/80">
                {order.customer?.name || 'Guest'}
              </span>
              <span className="opacity-40" aria-hidden>
                ·
              </span>
              <span title={dateTime(order.createdAt)}>
                {relativeTime(order.createdAt)}
              </span>
              <span className="opacity-40" aria-hidden>
                ·
              </span>
              <span>
                {count} {count === 1 ? 'item' : 'items'}
              </span>
              <Badge tone={paymentStatusTone(order.paymentStatus)}>
                {paid ? 'Paid' : titleCase(order.paymentStatus || 'unpaid')}
              </Badge>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:shadow-[var(--shadow-sm)]">
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${meta.accent}`}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <Link
            to={`/orders/${order.id}`}
            className="block truncate font-semibold tracking-tight text-[var(--foreground)] underline-offset-2 hover:text-[var(--primary)] hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            #{order.orderNumber}
          </Link>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            <span title={dateTime(order.createdAt)}>
              {relativeTime(order.createdAt)}
            </span>
            <span className="mx-1 opacity-40">·</span>
            {count} {count === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
            {money(order.total)}
          </p>
          <div className="mt-1 flex justify-end">
            <Badge tone={paymentStatusTone(order.paymentStatus)}>
              {paid ? 'Paid' : titleCase(order.paymentStatus || 'unpaid')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-2.5 pl-1">
        <Avatar name={order.customer?.name || 'Guest'} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">
            {order.customer?.name || 'Guest'}
          </p>
          <p className="inline-flex items-center gap-1 truncate text-xs text-[var(--muted-foreground)]">
            <Clock3 size={11} aria-hidden />
            {order.pickupTime || 'ASAP'}
          </p>
        </div>
      </div>

      {(action && onAdvance) || (canDecline && onDecline) ? (
        <div className="mt-3.5 flex gap-2 pl-1">
          {action && onAdvance ? (
            <Button
              className="min-w-0 flex-1"
              size="sm"
              variant={
                order.status === 'READY_FOR_PICKUP' ? 'primary' : 'secondary'
              }
              loading={busy}
              onClick={onAdvance}
            >
              {action.label}
              <ArrowRight size={14} aria-hidden />
            </Button>
          ) : null}
          {canDecline && onDecline ? (
            <Button
              className="shrink-0"
              size="sm"
              variant="ghost"
              loading={busy}
              onClick={onDecline}
              aria-label="Decline order"
            >
              Decline
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function BoardColumn({
  status,
  orders,
  advancingId,
  onAdvance,
  onDecline,
  compact,
}: {
  status: OrderStatus;
  orders: Order[];
  advancingId: string | null;
  onAdvance: (order: Order, nextStatus: OrderStatus) => void;
  onDecline: (order: Order) => void;
  compact?: boolean;
}) {
  const meta = columnMeta[status];
  const Icon = meta.icon;
  const action = next[status];

  return (
    <section
      className="flex max-h-[min(70vh,42rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-xs)]"
      aria-label={`${meta.label} column`}
    >
      <header
        className={`flex items-center justify-between gap-3 border-b border-[var(--border)] px-3.5 py-3 ${meta.headerBg}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`icon-well size-8 ${meta.well}`}>
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
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--card)] px-2 text-xs font-semibold tabular-nums text-[var(--foreground)] ring-1 ring-[var(--border)]">
          {orders.length}
        </span>
      </header>

      <div className="min-h-[14rem] flex-1 overflow-y-auto p-2.5">
        {!orders.length ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/35 px-4 py-12 text-center">
            <span className={`icon-well size-9 ${meta.well}`}>
              <Icon size={15} aria-hidden />
            </span>
            <p className="text-sm font-medium text-[var(--foreground)]">
              No {meta.label.toLowerCase()} orders
            </p>
            <p className="max-w-[12rem] text-xs text-[var(--muted-foreground)]">
              {status === 'RECEIVED'
                ? 'New orders will land here instantly.'
                : status === 'PREPARING'
                  ? 'Move received orders here when you start.'
                  : status === 'READY_FOR_PICKUP'
                    ? 'Orders ready for pickup show here.'
                    : 'Nothing in this list yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                compact={compact}
                action={action}
                busy={advancingId === o.id}
                onAdvance={
                  action && !advancingId
                    ? () => onAdvance(o, action.status)
                    : undefined
                }
                onDecline={
                  !advancingId &&
                  (o.status === 'RECEIVED' ||
                    o.status === 'PREPARING' ||
                    o.status === 'READY_FOR_PICKUP')
                    ? () => onDecline(o)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function OrdersBoardPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<BoardView>('kitchen');
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Order | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['orders'] });
  };

  const q = useQuery({
    queryKey: ['orders'],
    queryFn: async () =>
      dataOf<Order[]>(await api.get('/admin/orders')).map((o) =>
        mapOrder(o as unknown as Record<string, unknown>),
      ),
    staleTime: 3_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Live socket + new-order toast/sound are owned by LiveOrdersProvider.
  const { connected } = useSocket();

  const m = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: OrderStatus;
      notes?: string;
    }) => api.patch(`/admin/orders/${id}/status`, { status, notes }),
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
    const map = {
      RECEIVED: 0,
      PREPARING: 0,
      READY_FOR_PICKUP: 0,
      COMPLETED: 0,
      DECLINED: 0,
    } as Record<OrderStatus, number>;
    for (const o of filtered) map[o.status] = (map[o.status] ?? 0) + 1;
    return map;
  }, [filtered]);

  const kitchenCount =
    counts.RECEIVED + counts.PREPARING + counts.READY_FOR_PICKUP;
  const historyCount = counts.COMPLETED + counts.DECLINED;

  const boardCols = view === 'kitchen' ? kitchenCols : historyCols;
  const boardOrders = useMemo(() => {
    const set = new Set(boardCols);
    return filtered.filter((o) => set.has(o.status));
  }, [filtered, boardCols]);

  if (q.isLoading) {
    return (
      <div className="page-enter space-y-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-11 w-full max-w-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kitchenCols.map((s) => (
            <div
              className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"
              key={s}
            >
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
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
          <p className="text-xs font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
            Kitchen
          </p>
          <h1 className="font-display mt-1 text-[1.75rem] font-semibold tracking-tight text-[var(--foreground)]">
            Orders
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {view === 'kitchen'
              ? kitchenCount > 0
                ? `${kitchenCount} active · move tickets left to right`
                : 'No active tickets — waiting for the next order'
              : `${historyCount} past orders`}
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
          {connected ? 'Live updates' : 'Reconnecting…'}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-3.5">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden
          />
          <Input
            className="h-10 border-[var(--border)] bg-[var(--background)] pl-9 text-sm"
            placeholder="Search order # or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
        </div>

        <div
          className="flex w-full gap-1 rounded-xl bg-[var(--muted)] p-1 sm:w-auto"
          role="tablist"
          aria-label="Orders view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'kitchen'}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              view === 'kitchen'
                ? 'bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setView('kitchen')}
          >
            Active
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums ${
                view === 'kitchen'
                  ? kitchenCount > 0
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  : 'bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-[var(--muted-foreground)]'
              }`}
            >
              {kitchenCount}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'history'}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              view === 'history'
                ? 'bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setView('history')}
          >
            History
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums ${
                view === 'history'
                  ? 'bg-[var(--foreground)] text-[var(--card)]'
                  : 'bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-[var(--muted-foreground)]'
              }`}
            >
              {historyCount}
            </span>
          </button>
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
      ) : !boardOrders.length ? (
        <EmptyState
          title={
            view === 'kitchen' ? 'Kitchen is clear' : 'No history matches'
          }
          message={
            view === 'kitchen'
              ? 'All caught up. New orders will show in Active.'
              : 'No completed or declined orders match this search.'
          }
          icon={view === 'kitchen' ? CheckCircle2 : ShoppingBag}
        />
      ) : (
        <div
          className={`grid items-stretch gap-4 ${
            view === 'kitchen'
              ? 'md:grid-cols-2 xl:grid-cols-3'
              : 'md:grid-cols-2'
          }`}
        >
          {boardCols.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              orders={filtered.filter((o) => o.status === status)}
              advancingId={advancingId}
              compact={view === 'history'}
              onAdvance={(order, statusNext) =>
                m.mutate({ id: order.id, status: statusNext })
              }
              onDecline={(order) => setDeclineTarget(order)}
            />
          ))}
        </div>
      )}

      <DeclineOrderModal
        open={!!declineTarget}
        orderNumber={declineTarget?.orderNumber}
        busy={
          !!declineTarget && advancingId === declineTarget.id && m.isPending
        }
        onClose={() => setDeclineTarget(null)}
        onConfirm={(notes) => {
          if (!declineTarget) return;
          m.mutate(
            {
              id: declineTarget.id,
              status: 'DECLINED',
              notes,
            },
            {
              onSuccess: () => setDeclineTarget(null),
            },
          );
        }}
      />
    </div>
  );
}
