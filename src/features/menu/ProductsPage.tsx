import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import type { Product } from '@/shared/types';
import { mapProduct } from '@/shared/lib/mappers';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { dateTime, money } from '@/shared/lib/format';
import { mediaUrl } from '@/shared/lib/media';

function hasProductImage(p: Product): boolean {
  return Boolean(p.imageUrl?.trim());
}

export function ProductsPage() {
  const [s, setS] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [del, setDel] = useState<Product | null>(null);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const q = useQuery({
    queryKey: ['products'],
    queryFn: async () =>
      dataOf<Record<string, unknown>[]>(await api.get('/admin/products')).map(
        (p) => mapProduct(p) as Product,
      ),
  });

  const toggle = useMutation({
    mutationFn: (p: Product) =>
      api.patch(`/admin/products/${p.id}/availability`, {
        isSoldOut: !p.soldOut,
      }),
    onSuccess: (_res, p) => {
      toast(p.soldOut ? 'Product restored' : 'Marked sold out');
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: (product: Product) =>
      api.delete(`/admin/products/${product.id}`),
    onSuccess: (_res, product) => {
      toast(`${product.name} removed from menu`);
      setDel(null);
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const rows = useMemo(() => {
    const qText = s.toLowerCase();
    return (
      q.data?.filter((p) => {
        if (!hasProductImage(p)) return false;
        if (!showInactive && p.active === false) return false;
        return `${p.name} ${p.category?.name ?? ''}`
          .toLowerCase()
          .includes(qText);
      }) ?? []
    );
  }, [q.data, s, showInactive]);

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Products" />
        <Skeleton className="h-10 max-w-sm" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load products"
        message="Something went wrong while fetching the menu."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Products"
        description={`${rows.length} items · pricing, images, and availability`}
        action={
          <Link to="/menu/products/new">
            <Button type="button">
              <Plus size={16} aria-hidden />
              Add product
            </Button>
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={s}
            onChange={(e) => setS(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            className="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>
      {!rows.length ? (
        <EmptyState
          title="No products found"
          message="Try another search, or add a new product."
          action={
            <Link to="/menu/products/new">
              <Button type="button">
                <Plus size={16} aria-hidden />
                Add product
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Badge</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img
                          src={mediaUrl(p.imageUrl)}
                          alt=""
                          className="size-10 rounded-[var(--radius-md)] object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--muted)] text-xs font-bold text-[var(--muted-foreground)]">
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="font-semibold text-[var(--foreground)]">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-[var(--muted-foreground)]">
                    {p.category?.name || '—'}
                  </td>
                  <td className="font-semibold">{money(p.price)}</td>
                  <td>
                    {p.discountPercent && p.discountPercent > 0 ? (
                      <Badge tone="red">{p.discountPercent}% OFF</Badge>
                    ) : p.isTopSale ? (
                      <Badge tone="blue">TOP SALE</Badge>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>
                  <td>
                    {p.active === false ? (
                      <Badge tone="gray">Inactive</Badge>
                    ) : p.soldOut ? (
                      <Badge tone="red">Sold out</Badge>
                    ) : (
                      <Badge tone="green">Available</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                    {dateTime(p.createdAt)}
                  </td>
                  <td className="space-x-2 text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => nav(`/menu/products/${p.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={toggle.isPending || p.active === false}
                      onClick={() => toggle.mutate(p)}
                    >
                      {p.soldOut ? 'Restore' : 'Sold out'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => setDel(p)}
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
      <ConfirmDialog
        open={!!del}
        message={`Remove ${del?.name}? It will be hidden from the customer app.`}
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) remove.mutate(del);
        }}
        busy={remove.isPending}
      />
    </div>
  );
}
