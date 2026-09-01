import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CakeSlice } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import {
  Button,
  Checkbox,
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

export function CakeOfDayPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({
    queryKey: ['cake'],
    queryFn: async () =>
      dataOf<Partial<Form>>(await api.get('/admin/cake-of-day')),
  });
  const { register, handleSubmit } = useForm<Form>({
    resolver: zodResolver(schema),
    values: {
      name: q.data?.name || '',
      description: q.data?.description || '',
      price: q.data?.price || 0,
      date: q.data?.date || new Date().toISOString().slice(0, 10),
      available: q.data?.available !== false,
      image: undefined,
    },
  });

  const save = useMutation({
    mutationFn: (v: Form) => {
      const f = new FormData();
      Object.entries(v).forEach(([k, val]) => {
        const file = k === 'image' ? (val as FileList)?.[0] : null;
        if (file) f.append(k, file);
        else if (k !== 'image') f.append(k, String(val));
      });
      return api.put('/admin/cake-of-day', f);
    },
    onSuccess: () => {
      toast('Cake of the day saved');
      void qc.invalidateQueries({ queryKey: ['cake'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cake of the day" />
        <Skeleton className="h-96 max-w-2xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load cake of the day"
        message="Something went wrong while fetching today’s feature."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Cake of the day"
        description="Publish today’s featured cake for the customer menu."
      />
      <form
        className="card max-w-2xl space-y-5 p-6"
        onSubmit={handleSubmit((v) => save.mutate(v))}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-5">
          <span className="icon-well icon-well-gold size-12">
            <CakeSlice size={22} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Featured cake
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Shown on the customer menu for the selected date.
            </p>
          </div>
        </div>
        <section className="space-y-4">
          <h3 className="section-title">Feature details</h3>
          <label className="block">
            <span className="label">Name</span>
            <Input {...register('name')} />
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
            {save.isPending ? 'Saving…' : 'Save feature'}
          </Button>
        </div>
      </form>
    </div>
  );
}
