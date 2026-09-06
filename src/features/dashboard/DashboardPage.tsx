import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CircleCheck,
  Clock3,
  Filter,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
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
  DonutChart,
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

const statusColors: Record<OrderStatus, string> = {
  RECEIVED: '#6BA3D4',
  PREPARING: '#162947',
  READY_FOR_PICKUP: '#E02A3A',
  COMPLETED: '#94A3B8',
  DECLINED: '#F87171',
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

export function DashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [liveFlash, setLiveFlash] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mode, setMode] = useState<PeriodMode>('day');
  const [date, setDate] = useState(todayIso);
  const [month, setMonth] = useState(monthIso);
  const filterRef = useRef<HTMLDivElement>(null);

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
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    setLiveFlash('Updated');
    window.setTimeout(() => setLiveFlash(null), 2500);
  }, [qc]);

  const { connected } = useSocket(onLive);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [filterOpen]);

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
  const filterActive = !isToday && !(mode === 'month' && isThisMonth);

  if (q.isLoading) {
    return (
      <div className="page-enter space-y-5">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
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
  const pending = (d.counts?.RECEIVED ?? 0) + (d.counts?.PREPARING ?? 0);
  const completed = d.counts?.COMPLETED ?? 0;
  const revenue = Number(d.todayRevenue ?? 0);
  const aov = totalOrders > 0 && revenue ? revenue / totalOrders : 0;
  const uniqueCustomers = new Set(
    (d.recentOrders ?? [])
      .map((o) => o.customer?.id || o.customer?.email || o.customer?.name)
      .filter(Boolean),
  ).size;

  const statusSlices = statuses.map((s) => ({
    key: s,
    label: titleCase(s),
    value: d.counts?.[s] ?? 0,
    color: statusColors[s],
  }));

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

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
            {periodLabel}
          </p>
          <h1 className="font-display mt-1 text-[1.85rem] font-semibold tracking-tight text-[var(--foreground)]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {mode === 'month'
              ? `Café activity for ${periodLabel}`
              : isToday
                ? 'Today’s café activity at a glance'
                : `Café activity for ${periodLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] shadow-[var(--shadow-xs)]">
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

          <div className="relative" ref={filterRef}>
            <Button
              type="button"
              variant={filterActive ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              aria-haspopup="dialog"
              aria-label="Filter by date or month"
              title="Filter period"
            >
              <Filter size={14} aria-hidden />
              Filter
            </Button>
            {filterOpen && (
              <div
                role="dialog"
                aria-label="Dashboard period filter"
                className="absolute top-full right-0 z-30 mt-2 w-[17.5rem] rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-md)]"
              >
                <div className="flex gap-1 rounded-lg bg-[var(--muted)] p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                      mode === 'day'
                        ? 'bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-xs)]'
                        : 'text-[var(--muted-foreground)]'
                    }`}
                    onClick={() => setMode('day')}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                      mode === 'month'
                        ? 'bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-xs)]'
                        : 'text-[var(--muted-foreground)]'
                    }`}
                    onClick={() => setMode('month')}
                  >
                    Month
                  </button>
                </div>

                <label className="mt-3 block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
                    {mode === 'month' ? 'Select month' : 'Select date'}
                  </span>
                  {mode === 'month' ? (
                    <Input
                      type="month"
                      value={month}
                      max={monthIso()}
                      onChange={(e) => setMonth(e.target.value)}
                      aria-label="Filter month"
                    />
                  ) : (
                    <Input
                      type="date"
                      value={date}
                      max={todayIso()}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Filter date"
                    />
                  )}
                </label>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMode('day');
                      setDate(todayIso());
                      setMonth(monthIso());
                      setFilterOpen(false);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFilterOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>

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
              hint={`${pending} in progress`}
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
              hint={`${pending} in progress`}
              icon={ShoppingBag}
              accent="teal"
              spark={<Sparkline values={sparkValues} />}
            />
            <MetricCard
              label="Pending"
              value={<AnimatedNumber value={pending} />}
              hint="Received + preparing"
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
        <section className="card flex flex-col p-5 sm:p-6 lg:col-span-4">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Kitchen pipeline
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {totalOrders} order{totalOrders === 1 ? '' : 's'} · {scopeHint}
            </p>
          </div>

          <DonutChart
            slices={statusSlices}
            size={168}
            thickness={20}
            center={
              <>
                <p className="font-display text-3xl font-semibold tabular-nums text-[var(--foreground)]">
                  {totalOrders}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  total
                </p>
              </>
            }
          />

          <ul className="mt-5 flex-1 space-y-1">
            {statusSlices.map((slice) => (
              <li
                key={slice.key}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-[var(--muted)]/60"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden
                  />
                  <span className="truncate text-[var(--foreground)]">
                    {slice.label}
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--foreground)]">
                  {slice.value}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card flex flex-col p-5 sm:p-6 lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Orders by hour
              </h2>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                Volume across the service window · {scopeHint}
              </p>
            </div>
            {hasChartData && (
              <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
                Peak{' '}
                <span className="font-semibold text-[var(--foreground)]">
                  {Math.max(...activity.map((b) => b.value))}
                </span>
              </p>
            )}
          </div>

          {!hasChartData ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 py-16 text-sm text-[var(--muted-foreground)]">
              Orders will appear here for this period
            </div>
          ) : (
            <div className="mt-auto">
              <AreaChart items={activity} height={240} />
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card p-5 sm:p-6 lg:col-span-4">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Popular
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Top items · {scopeHint}
            </p>
          </div>
          {!popular.length ? (
            <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
              Rankings appear once orders include items.
            </p>
          ) : (
            <HorizontalBars items={popular} />
          )}
        </section>

        <section className="card overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Recent orders
              </h2>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                {scopeHint}
              </p>
            </div>
            <Link
              to="/orders"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              View all
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>

          {!d.recentOrders?.length ? (
            <div className="flex min-h-40 flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                No orders in this period
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Try another date or month from Filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentOrders.map((o: Order) => (
                    <tr key={o.id}>
                      <td>
                        <Link
                          className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          to={`/orders/${o.id}`}
                        >
                          #{o.orderNumber}
                        </Link>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2.5">
                          <Avatar
                            name={o.customer?.name || 'Guest'}
                            size="sm"
                          />
                          <span>{o.customer?.name || 'Guest'}</span>
                        </span>
                      </td>
                      <td className="tabular-nums text-[var(--muted-foreground)]">
                        {o.items?.reduce((n, i) => n + i.quantity, 0) || 0}
                      </td>
                      <td className="font-semibold tabular-nums">
                        {money(o.total)}
                      </td>
                      <td>
                        <Badge tone={orderStatusTone(o.status)}>
                          {titleCase(o.status)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                        {dateTime(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
