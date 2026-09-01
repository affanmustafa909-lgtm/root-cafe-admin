import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  ChartNoAxesCombined,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { api, dataOf } from '@/shared/api/client';
import { useAuth } from '@/features/auth/AuthContext';
import {
  EmptyState,
  ErrorState,
  Input,
  MetricCard,
  PageHeader,
  Skeleton,
} from '@/shared/ui';
import {
  AnimatedNumber,
  BarChart,
  HorizontalBars,
} from '@/shared/ui/charts';
import { money } from '@/shared/lib/format';

type PopularRow = {
  productNameSnapshot?: string;
  _sum?: { quantity?: number; lineTotal?: number };
};

type Aggregate = {
  _count?: number;
  _sum?: { total?: number };
};

export function ReportsPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const daily = useQuery({
    queryKey: ['reports-daily', date],
    enabled: !!user?.features.reporting,
    queryFn: async () =>
      dataOf<Aggregate>(
        await api.get('/admin/reports/daily', { params: { date } }),
      ),
  });
  const monthly = useQuery({
    queryKey: ['reports-monthly', month],
    enabled: !!user?.features.reporting,
    queryFn: async () =>
      dataOf<Aggregate>(
        await api.get('/admin/reports/monthly', { params: { month } }),
      ),
  });
  const popular = useQuery({
    queryKey: ['reports-popular'],
    enabled: !!user?.features.reporting,
    queryFn: async () =>
      dataOf<PopularRow[]>(
        await api.get('/admin/reports/popular-products'),
      ),
  });

  const popularBars = useMemo(() => {
    const rows = popular.data ?? [];
    return rows.slice(0, 8).map((row, i) => ({
      key: String(i),
      label: row.productNameSnapshot ?? 'Unknown',
      value: row._sum?.quantity ?? 0,
      meta: `${row._sum?.quantity ?? 0} · ${money(Number(row._sum?.lineTotal ?? 0))}`,
    }));
  }, [popular.data]);

  const popularChart = useMemo(
    () =>
      popularBars.map((row) => ({
        key: row.key,
        label: row.label.split(' ').slice(0, 2).join(' '),
        value: row.value,
      })),
    [popularBars],
  );

  if (!user?.features.reporting) {
    return (
      <div className="page-enter">
        <PageHeader
          title="Reports"
          description="Analytics for revenue, orders, and products."
        />
        <EmptyState
          title="Reporting is not enabled"
          message="Ask an administrator to enable reporting for this environment."
          icon={ChartNoAxesCombined}
        />
      </div>
    );
  }

  if (daily.isLoading || monthly.isLoading || popular.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Reports" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (daily.isError || monthly.isError || popular.isError) {
    return (
      <ErrorState
        title="Unable to load reports"
        message="Something went wrong while fetching analytics."
        onRetry={() => {
          void daily.refetch();
          void monthly.refetch();
          void popular.refetch();
        }}
      />
    );
  }

  const dailyOrders = daily.data?._count ?? 0;
  const monthlyOrders = monthly.data?._count ?? 0;
  const dailyRevenue = Number(daily.data?._sum?.total ?? 0);
  const monthlyRevenue = Number(monthly.data?._sum?.total ?? 0);
  const dailyAov = dailyOrders ? dailyRevenue / dailyOrders : 0;
  const monthlyAov = monthlyOrders ? monthlyRevenue / monthlyOrders : 0;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Reports"
        description="Daily, monthly, and product performance."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Daily orders"
          value={<AnimatedNumber value={dailyOrders} />}
          icon={ShoppingBag}
          accent="blue"
        />
        <MetricCard
          label="Daily revenue"
          value={
            <AnimatedNumber value={dailyRevenue} format={(n) => money(n)} />
          }
          icon={Wallet}
          accent="gold"
          delay={40}
        />
        <MetricCard
          label="Monthly orders"
          value={<AnimatedNumber value={monthlyOrders} />}
          icon={TrendingUp}
          accent="green"
          delay={80}
        />
        <MetricCard
          label="Monthly revenue"
          value={
            <AnimatedNumber value={monthlyRevenue} format={(n) => money(n)} />
          }
          icon={ChartNoAxesCombined}
          accent="teal"
          delay={120}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="icon-well icon-well-sky">
                <CalendarDays size={16} aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Daily performance
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Avg. order {money(dailyAov)}
                </p>
              </div>
            </div>
            <Input
              type="date"
              className="max-w-[11rem]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Report date"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[var(--muted)]/60 px-4 py-4">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                Orders
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                <AnimatedNumber value={dailyOrders} />
              </p>
            </div>
            <div className="rounded-xl bg-[var(--muted)]/60 px-4 py-4">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                Revenue
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                <AnimatedNumber value={dailyRevenue} format={(n) => money(n)} />
              </p>
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="icon-well icon-well-primary">
                <CalendarDays size={16} aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Monthly performance
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Avg. order {money(monthlyAov)}
                </p>
              </div>
            </div>
            <Input
              type="month"
              className="max-w-[11rem]"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Report month"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[var(--muted)]/60 px-4 py-4">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                Orders
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                <AnimatedNumber value={monthlyOrders} />
              </p>
            </div>
            <div className="rounded-xl bg-[var(--muted)]/60 px-4 py-4">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                Revenue
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                <AnimatedNumber
                  value={monthlyRevenue}
                  format={(n) => money(n)}
                />
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Product performance
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Top products by quantity sold
          </p>
        </div>
        {!popularBars.length ? (
          <div className="p-5">
            <EmptyState
              title="No product data yet"
              message="Rankings appear once orders are placed."
            />
          </div>
        ) : (
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <BarChart items={popularChart} height={220} />
            </div>
            <div className="lg:col-span-5">
              <HorizontalBars items={popularBars} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
