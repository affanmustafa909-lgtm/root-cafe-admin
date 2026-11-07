import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import { mediaUrl } from '@/shared/lib/media';
import type { Order } from '@/shared/types';
import { mapOrder } from '@/shared/lib/mappers';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  MetricCard,
  PageHeader,
  Skeleton,
  useToast,
} from '@/shared/ui';
import {
  dateOnly,
  dateTime,
  money,
  orderStatusTone,
  titleCase,
} from '@/shared/lib/format';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm the password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

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
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [lastSetPassword, setLastSetPassword] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

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

      <section className="card p-5">
        <div className="flex items-start gap-3">
          <span className="icon-well icon-well-navy size-9 shrink-0">
            <KeyRound size={16} aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Password help
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Set a temporary password if this customer forgot theirs. The old
              password cannot be recovered — share the new one with them
              securely.
            </p>
          </div>
        </div>

        {lastSetPassword ? (
          <div
            className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2.5 text-sm"
            role="status"
          >
            <p className="font-medium text-[var(--foreground)]">
              Temporary password set
            </p>
            <p className="mt-1 text-[var(--muted-foreground)]">
              Tell the customer to sign in with:{' '}
              <code className="rounded bg-[var(--background)] px-1.5 py-0.5 font-mono text-[var(--foreground)]">
                {lastSetPassword}
              </code>
            </p>
          </div>
        ) : null}

        {formError ? (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (v) => {
            setFormError('');
            setLastSetPassword(null);
            try {
              dataOf(
                await api.post(`/admin/customers/${c.id}/reset-password`, {
                  password: v.password,
                }),
              );
              setLastSetPassword(v.password);
              reset({ password: '', confirmPassword: '' });
              toast('Temporary password set');
            } catch (e) {
              setFormError(errorMessage(e));
            }
          })}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Temporary password</span>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-11"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? (
                <small className="mt-1 block text-[var(--destructive)]">
                  {errors.password.message}
                </small>
              ) : (
                <small className="mt-1 block text-[var(--muted-foreground)]">
                  Min. 8 characters
                </small>
              )}
            </label>
            <label className="block">
              <span className="label">Confirm password</span>
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <small className="mt-1 block text-[var(--destructive)]">
                  {errors.confirmPassword.message}
                </small>
              ) : null}
            </label>
          </div>
          <Button type="submit" loading={isSubmitting}>
            Set temporary password
          </Button>
        </form>
      </section>

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
