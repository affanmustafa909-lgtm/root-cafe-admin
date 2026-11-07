import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  CircleCheck,
  Clock3,
  Inbox,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { api, dataOf } from '@/shared/api/client';
import type { Order, OrderStatus } from '@/shared/types';
import { mapOrder } from '@/shared/lib/mappers';
import {
  Avatar,
  Badge,
  Button,
  ErrorState,
  Input,
  MetricCard,
  Skeleton,
} from '@/shared/ui';
import {
  AnimatedNumber,
  AreaChart,
  HorizontalBars,
  Sparkline,
} from '@/shared/ui/charts';
import {
  dateTime,
  money,
  orderStatusTone,
  titleCase,
} from '@/shared/lib/format';
import { useAuth } from '@/features/auth/AuthContext';
import { useSocket } from '@/shared/hooks/useSocket';

type Summary = {
  counts?: Partial<Record<OrderStatus, number>>;
  recentOrders?: Record<string, unknown>[];
  todayRevenue?: number | null;
  period?: 'day' | 'month';
};

type PeriodMode = 'day' | 'month';

const statuses: OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'DECLINED',
];

const statusMeta: Record<
  OrderStatus,
  {
    label: string;
    icon: typeof Inbox;
    well: string;
    bar: string;
  }
> = {
  RECEIVED: {
    label: 'Received',
    icon: Inbox,
    well: 'icon-well-sky',
    bar: 'bg-sky-400',
  },
  PREPARING: {
    label: 'Preparing',
    icon: ChefHat,
    well: 'icon-well-primary',
    bar: 'bg-[var(--primary)]',
  },
  READY_FOR_PICKUP: {
    label: 'Ready',
    icon: PackageCheck,
    well: 'icon-well-green',
    bar: 'bg-[var(--success)]',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    well: 'icon-well-stone',
    bar: 'bg-stone-400',
  },
  DECLINED: {
    label: 'Declined',
    icon: XCircle,
    well: 'icon-well-amber',
    bar: 'bg-[var(--destructive)]',
  },
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthIso() {
  return todayIso().slice(0, 7);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function hourLabel(h: number) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function hourBuckets(orders: Order[]) {
  const start = 8;
  const end = 20;
  const counts = new Map<number, number>();

  for (const order of orders) {
    const d = new Date(order.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    let h = d.getHours();
    if (h < start) h = start;
    if (h > end) h = end;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => {
    const hour = start + i;
    return {
      key: String(hour),
      label: hourLabel(hour),
      value: counts.get(hour) ?? 0,
    };
  });
}

function popularFromOrders(orders: Order[]) {
  const map = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items ?? []) {
      map.set(item.name, (map.get(item.name) ?? 0) + item.quantity);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({
      key: label,
      label,
      value,
    }));
}

function formatPeriodLabel(mode: PeriodMode, date: string, month: string) {
  if (mode === 'month') {
    const [y, m] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IE', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(y, m - 1, 1));
  }
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d));
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

export function DashboardPage() {
  const { user } = useAuth();
  const [liveFlash, setLiveFlash] = useState<string | null>(null);
  const [mode, setMode] = useState<PeriodMode>('day');
  const [date, setDate] = useState(todayIso);
  const [month, setMonth] = useState(monthIso);

  const queryParams = mode === 'month' ? { month } : { date };

  const q = useQuery({
    queryKey: ['dashboard', mode, mode === 'month' ? month : date],
    queryFn: async () => {
      const raw = dataOf<Summary>(
        await api.get('/admin/dashboard/summary', { params: queryParams }),
      );
      return {
        ...raw,
        recentOrders: raw.recentOrders?.map((o) => mapOrder(o)) ?? [],
      };
    },
  });

  const onLive = useCallback(() => {
    setLiveFlash('Updated');
    window.setTimeout(() => setLiveFlash(null), 2500);
  }, []);

  const { connected } = useSocket(onLive);

  const activity = useMemo(
    () => hourBuckets(q.data?.recentOrders ?? []),
    [q.data?.recentOrders],
  );

  const popular = useMemo(
    () => popularFromOrders(q.data?.recentOrders ?? []),
    [q.data?.recentOrders],
  );

  const hasChartData = activity.some((b) => b.value > 0);
  const periodLabel = formatPeriodLabel(mode, date, month);
  const isToday = mode === 'day' && date === todayIso();
  const isThisMonth = mode === 'month' && month === monthIso();

  if (q.isLoading) {
    return (
      <div className="page-enter space-y-5">
        <Skeleton className="h-16 w-full max-w-xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-64 lg:col-span-7" />
          <Skeleton className="h-64 lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message="Something went wrong while fetching the summary."
        onRetry={() => void q.refetch()}
      />
    );
  }

  const d = q.data!;
  const totalOrders = statuses.reduce((sum, s) => sum + (d.counts?.[s] ?? 0), 0);
  const pending =
    (d.counts?.RECEIVED ?? 0) +
    (d.counts?.PREPARING ?? 0) +
    (d.counts?.READY_FOR_PICKUP ?? 0);
  const completed = d.counts?.COMPLETED ?? 0;
  const revenue = Number(d.todayRevenue ?? 0);
  const aov = totalOrders > 0 && revenue ? revenue / totalOrders : 0;
  const uniqueCustomers = new Set(
    (d.recentOrders ?? [])
      .map((o) => o.customer?.id || o.customer?.email || o.customer?.name)
      .filter(Boolean),
  ).size;

  const sparkValues = activity.map((b) => b.value);
  const firstName = user?.name?.split(' ')[0] || 'team';
  const showReporting = Boolean(user?.features.reporting);
  const scopeHint =
    mode === 'month'
      ? isThisMonth
        ? 'This month'
        : periodLabel
      : isToday
        ? 'Today'
        : periodLabel;
  const peakValue = hasChartData
    ? Math.max(...activity.map((b) => b.value))
    : 0;
  const maxStatus = Math.max(
    1,
    ...statuses.map((s) => d.counts?.[s] ?? 0),
  );

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
              Overview
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] shadow-[var(--shadow-xs)]">
              <span
                className={
                  connected
                    ? 'live-dot'
                    : 'size-1.5 rounded-full bg-[var(--muted-foreground)]'
                }
              />
              {connected ? 'Live' : 'Offline'}
              {liveFlash && (
                <span className="anim-fade-in text-[var(--foreground)]">
                  · {liveFlash}
                </span>
              )}
            </span>
          </div>
          <h1 className="font-display mt-1.5 text-[1.85rem] font-semibold tracking-tight text-[var(--foreground)]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {scopeHint} café snapshot · {totalOrders} order
            {totalOrders === 1 ? '' : 's'}
            {pending > 0 ? ` · ${pending} active in kitchen` : ''}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-xs)]">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'day'
                  ? 'bg-[var(--foreground)] text-[var(--card)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              onClick={() => setMode('day')}
            >
              Day
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'month'
                  ? 'bg-[var(--foreground)] text-[var(--card)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              onClick={() => setMode('month')}
            >
              Month
            </button>
          </div>

          {mode === 'month' ? (
            <Input
              type="month"
              value={month}
              max={monthIso()}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Filter month"
              className="h-9 w-full border-[var(--border)] bg-[var(--card)] sm:w-[11.5rem]"
            />
          ) : (
            <Input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Filter date"
              className="h-9 w-full border-[var(--border)] bg-[var(--card)] sm:w-[11.5rem]"
            />
          )}

          {!isToday && !(mode === 'month' && isThisMonth) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode('day');
                setDate(todayIso());
                setMonth(monthIso());
              }}
            >
              Reset
            </Button>
          ) : null}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void q.refetch()}
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={14} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {pending > 0 && isToday ? (
        <Link
          to="/orders"
          className="card-interactive flex items-center justify-between gap-4 px-4 py-3.5 no-underline"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="icon-well icon-well-primary size-10">
              <ChefHat size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {pending} order{pending === 1 ? '' : 's'} need attention
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Open the kitchen board to advance tickets
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--primary)]">
            Open board
            <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showReporting ? (
          <>
            <MetricCard
              label="Revenue"
              value={
                <AnimatedNumber value={revenue} format={(n) => money(n)} />
              }
              hint={`${scopeHint} · completed`}
              icon={Wallet}
              accent="gold"
              spark={<Sparkline values={sparkValues} />}
            />
            <MetricCard
              label="Orders"
              value={<AnimatedNumber value={totalOrders} />}
              hint={`${pending} active`}
              icon={ShoppingBag}
              accent="teal"
              delay={40}
              spark={<Sparkline values={sparkValues} />}
            />
            <MetricCard
              label="Avg. order"
              value={<AnimatedNumber value={aov} format={(n) => money(n)} />}
              hint="Revenue ÷ orders"
              icon={TrendingUp}
              accent="blue"
              delay={80}
            />
            <MetricCard
              label="Completed"
              value={<AnimatedNumber value={completed} />}
              hint={`Fulfilled · ${scopeHint.toLowerCase()}`}
              icon={CircleCheck}
              accent="green"
              delay={120}
            />
          </>
        ) : (
          <>
            <MetricCard
              label="Orders"
              value={<AnimatedNumber value={totalOrders} />}
              hint={`${pending} active`}
              icon={ShoppingBag}
              accent="teal"
              spark={<Sparkline values={sparkValues} />}
            />
            <MetricCard
              label="Pending"
              value={<AnimatedNumber value={pending} />}
              hint="In the kitchen"
              icon={Clock3}
              accent="amber"
              delay={40}
            />
            <MetricCard
              label="Completed"
              value={<AnimatedNumber value={completed} />}
              hint={`Fulfilled · ${scopeHint.toLowerCase()}`}
              icon={CircleCheck}
              accent="green"
              delay={80}
            />
            <MetricCard
              label="Customers"
              value={<AnimatedNumber value={uniqueCustomers} />}
              hint="In recent orders"
              icon={Users}
              accent="blue"
              delay={120}
            />
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card flex flex-col p-5 sm:p-6 lg:col-span-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-title">Volume</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">
                Orders by hour
              </h2>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                Service window · {scopeHint}
              </p>
            </div>
            {hasChartData ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-right">
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Peak hour
                </p>
                <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                  {peakValue} order{peakValue === 1 ? '' : 's'}
                </p>
              </div>
            ) : null}
          </div>

          {!hasChartData ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/35 px-4 py-16 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                No order volume yet
              </p>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">
                Activity for this period will show here as orders come in.
              </p>
            </div>
          ) : (
            <div className="mt-auto">
              <AreaChart items={activity} height={240} />
            </div>
          )}
        </section>

        <section className="card flex flex-col p-5 sm:p-6 lg:col-span-5">
          <div className="mb-5">
            <p className="section-title">Pipeline</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">
              Order status
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {totalOrders} total · {scopeHint}
            </p>
          </div>

          <ul className="flex flex-1 flex-col gap-3">
            {statuses.map((status) => {
              const meta = statusMeta[status];
              const Icon = meta.icon;
              const value = d.counts?.[status] ?? 0;
              const pct = Math.round((value / maxStatus) * 100);

              return (
                <li key={status}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`icon-well size-7 ${meta.well}`}>
                        <Icon size={13} aria-hidden />
                      </span>
                      <span className="truncate text-sm font-medium text-[var(--foreground)]">
                        {meta.label}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                      {value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className={`h-full rounded-full ${meta.bar} transition-[width] duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card p-5 sm:p-6 lg:col-span-4">
          <div className="mb-5">
            <p className="section-title">Bestsellers</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">
              Popular items
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Top sellers · {scopeHint}
            </p>
          </div>
          {!popular.length ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/35 px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                No item rankings yet
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Rankings appear once orders include items.
              </p>
            </div>
          ) : (
            <HorizontalBars items={popular} />
          )}
        </section>

        <section className="card overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div>
              <p className="section-title">Live feed</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">
                Recent orders
              </h2>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                Latest activity · {scopeHint}
              </p>
            </div>
            <Link
              to="/orders"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              View all
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>

          {!d.recentOrders?.length ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                No orders in this period
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Try another day or month above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {d.recentOrders.slice(0, 8).map((o: Order) => {
                const count =
                  o.items?.reduce((n, i) => n + i.quantity, 0) || 0;
                return (
                  <Link
                    key={o.id}
                    to={`/orders/${o.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-[var(--muted)]/45 sm:px-6"
                  >
                    <Avatar name={o.customer?.name || 'Guest'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          #{o.orderNumber}
                        </p>
                        <Badge tone={orderStatusTone(o.status)}>
                          {titleCase(o.status)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                        {o.customer?.name || 'Guest'}
                        <span className="mx-1 opacity-40">·</span>
                        {count} {count === 1 ? 'item' : 'items'}
                        <span className="mx-1 opacity-40">·</span>
                        <span title={dateTime(o.createdAt)}>
                          {relativeTime(o.createdAt)}
                        </span>
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
                      {money(o.total)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
