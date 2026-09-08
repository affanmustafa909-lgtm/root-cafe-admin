import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CakeSlice } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import { mediaUrl } from '@/shared/lib/media';
import { dateOnly, money } from '@/shared/lib/format';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
  useToast,
} from '@/shared/ui';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  date: z.string().min(1),
  available: z.boolean(),
  image: z.any().optional(),
});
type Form = z.infer<typeof schema>;

type CakeRow = {
  id: string;
  name?: string;
  title?: string | null;
  description?: string | null;
  price?: number;
  date?: string;
  imageUrl?: string | null;
  available?: boolean;
  isActive?: boolean;
  productId?: string | null;
  product?: { id: string; name: string; price?: number } | null;
};

const emptyForm: Form = {
  name: '',
  description: '',
  price: 0,
  date: new Date().toISOString().slice(0, 10),
  available: true,
  image: undefined,
};

export function CakeOfDayPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [del, setDel] = useState<CakeRow | null>(null);

  const history = useQuery({
    queryKey: ['cake-history'],
    queryFn: async () => {
      const raw = dataOf<CakeRow[] | null>(
        await api.get('/admin/cake-of-day/history'),
      );
      return Array.isArray(raw) ? raw.filter(Boolean) : [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });

  const save = useMutation({
    mutationFn: async (v: Form) => {
      const f = new FormData();
      f.append('name', v.name);
      f.append('description', v.description ?? '');
      f.append('price', String(v.price));
      f.append('date', v.date);
      f.append('available', v.available ? 'true' : 'false');
      const file = (v.image as FileList | undefined)?.[0];
      if (file) f.append('image', file);
      return api.put('/admin/cake-of-day', f);
    },
    onSuccess: () => {
      toast('Cake of the day added');
      reset({
        ...emptyForm,
        date: new Date().toISOString().slice(0, 10),
      });
      void qc.invalidateQueries({ queryKey: ['cake-history'] });
      void qc.invalidateQueries({ queryKey: ['cake'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/admin/cake-of-day/${id}/deactivate`),
    onSuccess: () => {
      toast('Removed from featured');
      void qc.invalidateQueries({ queryKey: ['cake-history'] });
      void qc.invalidateQueries({ queryKey: ['cake'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const destroy = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cake-of-day/${id}`),
    onSuccess: () => {
      toast('Cake deleted');
      setDel(null);
      void qc.invalidateQueries({ queryKey: ['cake-history'] });
      void qc.invalidateQueries({ queryKey: ['cake'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (history.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cake of the day" />
        <Skeleton className="h-96 max-w-2xl" />
      </div>
    );
  }

  if (history.isError) {
    return (
      <ErrorState
        title="Unable to load cake of the day"
        message="Something went wrong while fetching featured cakes."
        onRetry={() => void history.refetch()}
      />
    );
  }

  const rows = history.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Cake of the day"
        description="Add a featured cake — it also appears as a product with a Cake of the Day tag."
      />

      <form
        className="card max-w-2xl space-y-5 p-6"
        onSubmit={handleSubmit((v) => save.mutate(v))}
        noValidate
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-5">
          <span className="icon-well icon-well-gold size-12">
            <CakeSlice size={22} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Add featured cake
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Creates a product and marks it as Cake of the Day for the date.
            </p>
          </div>
        </div>
        <section className="space-y-4">
          <h3 className="section-title">Feature details</h3>
          <label className="block">
            <span className="label">Name</span>
            <Input {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && (
              <small className="mt-1 block text-[var(--destructive)]">
                Required
              </small>
            )}
          </label>
          <label className="block">
            <span className="label">Description</span>
            <Textarea {...register('description')} />
          </label>
        </section>
        <section className="grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Price (EUR)</span>
            <Input type="number" step=".01" {...register('price')} />
          </label>
          <label className="block">
            <span className="label">Date</span>
            <Input type="date" {...register('date')} />
          </label>
        </section>
        <section className="space-y-4 border-t border-[var(--border)] pt-5">
          <h3 className="section-title">Media & availability</h3>
          <label className="block">
            <span className="label">Image</span>
            <Input type="file" accept="image/*" {...register('image')} />
          </label>
          <Checkbox label="Available today" {...register('available')} />
        </section>
        <div className="border-t border-[var(--border)] pt-5">
          <Button type="submit" loading={save.isPending}>
            {save.isPending ? 'Adding…' : 'Add cake of the day'}
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
          Cake of the day listing
        </h2>
        {!rows.length ? (
          <EmptyState
            title="No featured cakes yet"
            message="Add one above — it will show here and on the products list."
            icon={CakeSlice}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cake</th>
                  <th>Date</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const name = c.name || c.title || c.product?.name || 'Cake';
                  const img = mediaUrl(c.imageUrl);
                  const d = String(c.date ?? '').slice(0, 10);
                  const isTodayFeatured = c.isActive !== false && d === today;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              className="size-10 rounded-[var(--radius-md)] object-cover"
                            />
                          ) : (
                            <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--muted)] text-xs font-bold text-[var(--muted-foreground)]">
                              {name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[var(--foreground)]">
                                {name}
                              </span>
                              {isTodayFeatured ? (
                                <Badge tone="amber">Today</Badge>
                              ) : null}
                            </div>
                            {c.description ? (
                              <p className="truncate text-xs text-[var(--muted-foreground)]">
                                {c.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                        {dateOnly(d)}
                      </td>
                      <td className="font-semibold">
                        {money(Number(c.price ?? c.product?.price ?? 0))}
                      </td>
                      <td>
                        {c.isActive === false ? (
                          <Badge tone="gray">Archived</Badge>
                        ) : c.available === false ? (
                          <Badge tone="red">Unavailable</Badge>
                        ) : (
                          <Badge tone="green">Active</Badge>
                        )}
                      </td>
                      <td className="space-x-2 whitespace-nowrap text-right">
                        {c.isActive !== false ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={remove.isPending}
                            onClick={() => remove.mutate(c.id)}
                          >
                            Remove
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={destroy.isPending}
                          onClick={() => setDel(c)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!del}
        message={`Delete ${del?.name || del?.title || 'this cake'} from the listing? The linked product stays in Products unless you delete it there.`}
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) destroy.mutate(del.id);
        }}
        busy={destroy.isPending}
      />
    </div>
  );
}
