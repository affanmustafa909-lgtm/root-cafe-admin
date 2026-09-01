import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import type { Category } from '@/shared/types';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Skeleton,
  useToast,
} from '@/shared/ui';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.coerce.number().min(0),
});
type Form = z.infer<typeof schema>;

export function CategoriesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edit, setEdit] = useState<Category | null | undefined>();
  const [del, setDel] = useState<Category | null>(null);
  const q = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      dataOf<Category[]>(await api.get('/admin/categories')),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const save = useMutation({
    mutationFn: (v: Form) =>
      edit
        ? api.patch(`/admin/categories/${edit.id}`, v)
        : api.post('/admin/categories', v),
    onSuccess: () => {
      toast('Category saved');
      setEdit(undefined);
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/categories/${del!.id}`),
    onSuccess: () => {
      toast('Category deleted');
      setDel(null);
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Categories" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load categories"
        message="Something went wrong while fetching categories."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Categories"
        description="Organize products for fast browsing."
        action={
          <Button
            onClick={() => {
              reset({ name: '', description: '', sortOrder: 0 });
              setEdit(null);
            }}
          >
            <Plus size={16} aria-hidden />
            Add category
          </Button>
        }
      />
      {!q.data?.length ? (
        <EmptyState
          title="No categories"
          message="Create a category to start organizing products."
          action={
            <Button
              onClick={() => {
                reset({ name: '', description: '', sortOrder: 0 });
                setEdit(null);
              }}
            >
              <Plus size={16} aria-hidden />
              Add category
            </Button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Sort</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold text-[var(--foreground)]">
                    {c.name}
                  </td>
                  <td className="text-[var(--muted-foreground)]">
                    {c.description || '—'}
                  </td>
                  <td>{c.sortOrder ?? 0}</td>
                  <td className="space-x-2 text-right whitespace-nowrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        reset({
                          name: c.name,
                          description: c.description || '',
                          sortOrder: c.sortOrder || 0,
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={edit !== undefined}
        title={edit ? 'Edit category' : 'New category'}
        onClose={() => setEdit(undefined)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit((v) => save.mutate(v))}
          noValidate
        >
          <label className="block">
            <span className="label">Name</span>
            <Input {...register('name')} />
            {errors.name && (
              <small className="mt-1 block text-[var(--destructive)]">
                Required
              </small>
            )}
          </label>
          <label className="block">
            <span className="label">Description</span>
            <Input {...register('description')} />
          </label>
          <label className="block">
            <span className="label">Sort order</span>
            <Input type="number" {...register('sortOrder')} />
          </label>
          <Button type="submit" className="w-full" loading={save.isPending}>
            Save category
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!del}
        message={`Delete ${del?.name}?`}
        onCancel={() => setDel(null)}
        onConfirm={() => remove.mutate()}
        busy={remove.isPending}
      />
    </div>
  );
}
