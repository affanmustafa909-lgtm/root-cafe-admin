import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import type { Customization } from '@/shared/types';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Skeleton,
  Textarea,
  useToast,
} from '@/shared/ui';
import { money } from '@/shared/lib/format';

const schema = z.object({
  name: z.string().min(1),
  options: z.string().min(1),
  required: z.boolean(),
});
type Form = z.infer<typeof schema>;

export function CustomizationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edit, setEdit] = useState<Customization | null | undefined>();
  const [del, setDel] = useState<Customization | null>(null);
  const { register, handleSubmit, reset } = useForm<Form>({
    resolver: zodResolver(schema),
  });
  const q = useQuery({
    queryKey: ['customizations'],
    queryFn: async () =>
      dataOf<Customization[]>(await api.get('/admin/customizations')),
  });

  const save = useMutation({
    mutationFn: (v: Form) => {
      const body = {
        ...v,
        options: v.options
          .split('\n')
          .filter(Boolean)
          .map((x) => {
            const [n, p] = x.split('|');
            return { name: n.trim(), price: Number(p) || 0 };
          }),
      };
      return edit
        ? api.patch(`/admin/customizations/${edit.id}`, body)
        : api.post('/admin/customizations', body);
    },
    onSuccess: () => {
      toast('Customization saved');
      setEdit(undefined);
      void qc.invalidateQueries({ queryKey: ['customizations'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/customizations/${del!.id}`),
    onSuccess: () => {
      toast('Customization deleted');
      setDel(null);
      void qc.invalidateQueries({ queryKey: ['customizations'] });
    },
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Customizations" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load customizations"
        message="Something went wrong while fetching option groups."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Customizations"
        description="Options such as milk, size, and extras."
        action={
          <Button
            onClick={() => {
              reset({ name: '', options: '', required: false });
              setEdit(null);
            }}
          >
            <Plus size={16} aria-hidden />
            Add customization
          </Button>
        }
      />
      {!q.data?.length ? (
        <EmptyState
          title="No customizations"
          message="Add option groups customers can choose from."
          action={
            <Button
              onClick={() => {
                reset({ name: '', options: '', required: false });
                setEdit(null);
              }}
            >
              <Plus size={16} aria-hidden />
              Add customization
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data.map((c) => (
            <div className="card flex flex-col p-5" key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-[var(--foreground)]">
                  {c.name}
                </h3>
                <Badge tone={c.required ? 'amber' : 'gray'}>
                  {c.required ? 'Required' : 'Optional'}
                </Badge>
              </div>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-[var(--muted-foreground)]">
                {c.options.map((x) => (
                  <li
                    key={x.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{x.name}</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {x.price ? `+${money(x.price)}` : 'Free'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    reset({
                      name: c.name,
                      options: c.options
                        .map((x) => `${x.name}|${x.price}`)
                        .join('\n'),
                      required: !!c.required,
                    });
                    setEdit(c);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDel(c)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={edit !== undefined}
        title={edit ? 'Edit customization' : 'New customization'}
        onClose={() => setEdit(undefined)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit((v) => save.mutate(v))}
        >
          <label className="block">
            <span className="label">Name</span>
            <Input {...register('name')} />
          </label>
          <label className="block">
            <span className="label">Options (one per line: Name|Price)</span>
            <Textarea
              className="min-h-32"
              placeholder={'Oat milk|0.5\nLarge|1'}
              {...register('options')}
            />
          </label>
          <Checkbox label="Required choice" {...register('required')} />
          <Button type="submit" className="w-full" loading={save.isPending}>
            Save
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!del}
        message={`Delete ${del?.name}?`}
        onCancel={() => setDel(null)}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
