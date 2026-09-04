import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import type { Category, Product } from '@/shared/types';
import { mapCategory, mapProduct } from '@/shared/lib/mappers';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { dateTime, money } from '@/shared/lib/format';
import { mediaUrl } from '@/shared/lib/media';

type StatusFilter = 'all' | 'available' | 'sold_out' | 'inactive';
type BadgeFilter = 'all' | 'sale' | 'top';

export function ProductsPage() {
  const [s, setS] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [badge, setBadge] = useState<BadgeFilter>('all');
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

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      dataOf<Record<string, unknown>[]>(
        await api.get('/admin/categories'),
      ).map((c) => mapCategory(c) as Category),
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

  const categoryOptions = useMemo(() => {
    const list = categories.data ?? [];
    return [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || ''),
    );
  }, [categories.data]);

  const filtersActive =
    s.trim() !== '' ||
    categoryId !== 'all' ||
    status !== 'all' ||
    badge !== 'all';

  const rows = useMemo(() => {
    const qText = s.toLowerCase().trim();
    return (
      q.data?.filter((p) => {
        if (categoryId !== 'all') {
          const id = p.categoryId || p.category?.id;
          if (id !== categoryId) return false;
        }

        if (status === 'available') {
          if (p.active === false || p.soldOut) return false;
        } else if (status === 'sold_out') {
          if (p.active === false || !p.soldOut) return false;
        } else if (status === 'inactive') {
          if (p.active !== false) return false;
        } else if (p.active === false) {
          // "all" still hides inactive unless explicitly filtered
          return false;
        }

        if (badge === 'sale') {
          if (!(p.discountPercent && p.discountPercent > 0)) return false;
        } else if (badge === 'top') {
          if (!p.isTopSale) return false;
        }

        if (!qText) return true;
        return `${p.name} ${p.category?.name ?? ''}`
          .toLowerCase()
          .includes(qText);
      }) ?? []
    );
  }, [q.data, s, categoryId, status, badge]);

  const clearFilters = () => {
    setS('');
    setCategoryId('all');
    setStatus('all');
    setBadge('all');
  };

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
          <Button type="button" onClick={() => nav('/menu/products/new')}>
            <Plus size={16} aria-hidden />
            Add product
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] max-w-sm flex-1">
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

        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filter by category"
          className="min-w-[10rem]"
        >
          <option value="all">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="min-w-[9rem]"
        >
          <option value="all">All status</option>
          <option value="available">Available</option>
          <option value="sold_out">Sold out</option>
          <option value="inactive">Inactive</option>
        </Select>

        <Select
          value={badge}
          onChange={(e) => setBadge(e.target.value as BadgeFilter)}
          aria-label="Filter by badge"
          className="min-w-[8rem]"
        >
          <option value="all">All badges</option>
          <option value="sale">On sale</option>
          <option value="top">Top sale</option>
        </Select>

        {filtersActive && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            <X size={14} aria-hidden />
            Clear
          </Button>
        )}
      </div>

      {!rows.length ? (
        <EmptyState
          title="No products found"
          message={
            filtersActive
              ? 'Try clearing filters or searching another term.'
              : 'Try another search, or add a new product.'
          }
          action={
            filtersActive ? (
              <Button type="button" variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button type="button" onClick={() => nav('/menu/products/new')}>
                <Plus size={16} aria-hidden />
                Add product
              </Button>
            )
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
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback =
                              e.currentTarget.nextElementSibling;
                            if (fallback instanceof HTMLElement) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span
                        className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--muted)] text-xs font-bold text-[var(--muted-foreground)]"
                        style={{ display: p.imageUrl ? 'none' : 'flex' }}
                        aria-hidden
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
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
