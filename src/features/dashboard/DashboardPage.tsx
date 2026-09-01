import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CircleCheck,
  Clock3,
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
};

const statuses: OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COMPLETED',
];

const statusColors: Record<OrderStatus, string> = {
  RECEIVED: '#6BA3D4',
  PREPARING: '#162947',
  READY_FOR_PICKUP: '#E02A3A',
  COMPLETED: '#94A3B8',
};

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

export function DashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [liveFlash, setLiveFlash] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const raw = dataOf<Summary>(await api.get('/admin/dashboard/summary'));
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

  const activity = useMemo(
    () => hourBuckets(q.data?.recentOrders ?? []),
    [q.data?.recentOrders],
  );

  const popular = useMemo(
    () => popularFromOrders(q.data?.recentOrders ?? []),
    [q.data?.recentOrders],
  );

  const hasChartData = activity.some((b) => b.value > 0);

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
        message="Something went wrong while fetching today’s summary."
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
  const todayLabel = new Intl.DateTimeFormat('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
            {todayLabel}
          </p>
          <h1 className="font-display mt-1 text-[1.85rem] font-semibold tracking-tight text-[var(--foreground)]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Today’s café activity at a glance
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
              hint="Completed today"
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
              hint="Fulfilled today"
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
              hint="Fulfilled today"
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
              {totalOrders} order{totalOrders === 1 ? '' : 's'} today
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
                Volume across today’s service window
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
              Orders will appear here as they come in
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
              Popular today
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Top items from recent orders
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
                Latest activity
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
                No orders yet
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                New orders will show up here in real time.
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
