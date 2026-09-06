import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import {
  mapCategory,
  mapCustomization,
  mapProduct,
} from '@/shared/lib/mappers';
import { mediaUrl } from '@/shared/lib/media';
import type { Category, Customization, Product } from '@/shared/types';
import {
  Button,
  Checkbox,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@/shared/ui';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  active: z.boolean(),
  soldOut: z.boolean(),
  isTopSale: z.boolean(),
  discountPercent: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().min(0).max(50).nullable(),
  ),
  compareAtPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().min(0).nullable(),
  ),
  image: z.any().optional(),
  imageHot: z.any().optional(),
  imageCold: z.any().optional(),
});
type Form = z.infer<typeof schema>;

type ProductWithGroups = Product & {
  customizationGroups?: {
    groupId?: string;
    enabledOptionIds?: string[];
    group?: { id: string; options?: { id?: string }[] };
  }[];
};

function selectedGroupIds(product?: ProductWithGroups | null) {
  if (!product?.customizationGroups?.length) return [] as string[];
  return product.customizationGroups
    .map((row) => row.groupId || row.group?.id)
    .filter((id): id is string => !!id);
}

function selectedOptionsByGroup(
  product: ProductWithGroups | null | undefined,
  catalog: Customization[] | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!product?.customizationGroups?.length) {
    return out;
  }
  for (const row of product.customizationGroups) {
    const gid = row.groupId || row.group?.id;
    if (!gid) continue;
    const saved = row.enabledOptionIds ?? [];
    if (saved.length) {
      out[gid] = saved;
      continue;
    }
    const catalogGroup = catalog?.find((g) => g.id === gid);
    out[gid] = (catalogGroup?.options ?? row.group?.options ?? [])
      .map((o) => o.id)
      .filter((id): id is string => !!id);
  }
  return out;
}

function firstFile(v: unknown): File | undefined {
  if (!v) return undefined;
  if (v instanceof File) return v;
  const list = v as FileList;
  return list?.[0];
}

export function ProductFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [previewHot, setPreviewHot] = useState<string | null>(null);
  const [previewCold, setPreviewCold] = useState<string | null>(null);
  const [showVariations, setShowVariations] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [optionIdsByGroup, setOptionIdsByGroup] = useState<
    Record<string, string[]>
  >({});

  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      dataOf<Record<string, unknown>[]>(
        await api.get('/admin/categories'),
      ).map((c) => mapCategory(c) as Category),
    staleTime: 30_000,
  });

  const customs = useQuery({
    queryKey: ['customizations'],
    queryFn: async () =>
      dataOf<Record<string, unknown>[]>(
        await api.get('/admin/customizations'),
      ).map((row) => mapCustomization(row) as Customization),
    staleTime: 30_000,
  });

  const product = useQuery({
    queryKey: ['product', id],
    queryFn: async () =>
      mapProduct(
        dataOf<Record<string, unknown>>(await api.get(`/admin/products/${id}`)),
      ) as ProductWithGroups,
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema) as Resolver<Form>,
    defaultValues: {
      active: true,
      soldOut: false,
      isTopSale: false,
      discountPercent: null,
      compareAtPrice: null,
    },
  });

  const imageFiles = watch('image');
  const imageHotFiles = watch('imageHot');
  const imageColdFiles = watch('imageCold');
  const categoryId = watch('categoryId');

  useEffect(() => {
    if (!product.data) return;
    reset({
      name: product.data.name,
      description: product.data.description || '',
      price: product.data.price,
      categoryId:
        product.data.categoryId || product.data.category?.id || '',
      active: product.data.active !== false,
      soldOut: !!product.data.soldOut,
      isTopSale: !!product.data.isTopSale,
      discountPercent: product.data.discountPercent ?? null,
      compareAtPrice: product.data.compareAtPrice ?? null,
    });
    setGroupIds(selectedGroupIds(product.data));
    setOptionIdsByGroup(
      selectedOptionsByGroup(product.data, customs.data ?? undefined),
    );
    setPreview(mediaUrl(product.data.imageUrl) ?? null);
    setPreviewHot(mediaUrl(product.data.imageUrlHot) ?? null);
    setPreviewCold(mediaUrl(product.data.imageUrlCold) ?? null);
    if (product.data.imageUrlHot || product.data.imageUrlCold) {
      setShowVariations(true);
    }
  }, [product.data, customs.data, reset]);

  useEffect(() => {
    const file = firstFile(imageFiles);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFiles]);

  useEffect(() => {
    const file = firstFile(imageHotFiles);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewHot(url);
    return () => URL.revokeObjectURL(url);
  }, [imageHotFiles]);

  useEffect(() => {
    const file = firstFile(imageColdFiles);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewCold(url);
    return () => URL.revokeObjectURL(url);
  }, [imageColdFiles]);

  useEffect(() => {
    if (categoryId === 'menu-cat-protein') setShowVariations(true);
  }, [categoryId]);

  const toggleGroup = (groupId: string) => {
    const group = customs.data?.find((g) => g.id === groupId);
    const allOpts =
      group?.options.map((o) => o.id).filter((x): x is string => !!x) ?? [];
    setGroupIds((prev) => {
      if (prev.includes(groupId)) {
        setOptionIdsByGroup((opts) => {
          const next = { ...opts };
          delete next[groupId];
          return next;
        });
        return prev.filter((x) => x !== groupId);
      }
      setOptionIdsByGroup((opts) => ({ ...opts, [groupId]: allOpts }));
      return [...prev, groupId];
    });
  };

  const toggleOption = (groupId: string, optionId: string) => {
    setOptionIdsByGroup((prev) => {
      const current = prev[groupId] ?? [];
      const nextOpts = current.includes(optionId)
        ? current.filter((x) => x !== optionId)
        : [...current, optionId];
      if (nextOpts.length === 0) {
        setGroupIds((g) => g.filter((id) => id !== groupId));
      } else {
        setGroupIds((g) => (g.includes(groupId) ? g : [...g, groupId]));
      }
      return { ...prev, [groupId]: nextOpts };
    });
  };

  const showAllCustoms = () => {
    const ids = (customs.data ?? []).map((g) => g.id);
    setGroupIds(ids);
    const all: Record<string, string[]> = {};
    for (const g of customs.data ?? []) {
      all[g.id] = g.options.map((o) => o.id).filter((x): x is string => !!x);
    }
    setOptionIdsByGroup(all);
  };

  const save = useMutation({
    mutationFn: async (v: Form) => {
      const f = new FormData();
      f.append('name', v.name);
      f.append('description', v.description ?? '');
      f.append('price', String(v.price));
      f.append('categoryId', v.categoryId);
      f.append('active', v.active ? 'true' : 'false');
      f.append('soldOut', v.soldOut ? 'true' : 'false');
      f.append('isTopSale', v.isTopSale ? 'true' : 'false');
      f.append(
        'discountPercent',
        v.discountPercent === null || v.discountPercent === undefined
          ? ''
          : String(v.discountPercent),
      );
      f.append(
        'compareAtPrice',
        v.compareAtPrice === null || v.compareAtPrice === undefined
          ? ''
          : String(v.compareAtPrice),
      );
      const file = firstFile(v.image);
      if (file) f.append('image', file);
      if (showVariations) {
        const hot = firstFile(v.imageHot);
        const cold = firstFile(v.imageCold);
        if (hot) f.append('imageHot', hot);
        if (cold) f.append('imageCold', cold);
      }

      const res = id
        ? await api.patch(`/admin/products/${id}`, f)
        : await api.post('/admin/products', f);
      const saved = dataOf<Record<string, unknown>>(res);
      const productId = (saved.id as string) || id!;
      await api.put(`/admin/customizations/products/${productId}/groups`, {
        groups: groupIds.map((groupId) => ({
          groupId,
          optionIds: optionIdsByGroup[groupId] ?? [],
        })),
      });
      return saved;
    },
    onSuccess: () => {
      toast('Product saved');
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['product', id] });
      nav('/menu/products');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (cats.isLoading || customs.isLoading || product.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 max-w-3xl" />
      </div>
    );
  }

  if (cats.isError || customs.isError || product.isError) {
    return (
      <ErrorState
        title="Unable to load form"
        message="Something went wrong while loading the product form."
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={id ? 'Edit product' : 'Add product'}
        description={
          id
            ? 'Update menu details, photos, and availability.'
            : 'Name, price, photo, and hot/cold variants for the customer app.'
        }
        action={
          <Link to="/menu/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} aria-hidden />
              Back
            </Button>
          </Link>
        }
      />
      <form
        className="card mx-auto max-w-3xl space-y-7 p-6 sm:p-8"
        onSubmit={handleSubmit((v) => save.mutate(v))}
        noValidate
      >
        <section className="space-y-4">
          <h3 className="section-title">Basics</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="label">Name</span>
              <Input {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && (
                <small className="mt-1 block text-[var(--destructive)]">
                  Required
                </small>
              )}
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Description</span>
              <Textarea
                {...register('description')}
                rows={3}
                placeholder="Short description shown on the menu"
              />
            </label>
            <label className="block">
              <span className="label">Price (EUR)</span>
              <Input type="number" step="0.01" {...register('price')} />
              {errors.price && (
                <small className="mt-1 block text-[var(--destructive)]">
                  Enter a valid price
                </small>
              )}
            </label>
            <label className="block">
              <span className="label">Category</span>
              <Select
                {...register('categoryId')}
                aria-invalid={!!errors.categoryId}
              >
                <option value="">Select category</option>
                {cats.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {errors.categoryId && (
                <small className="mt-1 block text-[var(--destructive)]">
                  Select a category
                </small>
              )}
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-[var(--border)] pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="section-title">Photos</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Main image for lists. Add hot/cold when the drink changes by
                temperature (protein drinks).
              </p>
            </div>
            <Button
              type="button"
              variant={showVariations ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setShowVariations((v) => !v)}
            >
              {showVariations ? 'Hide variations' : 'Add variations'}
            </Button>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            {preview ? (
              <img
                src={preview}
                alt="Product preview"
                className="size-28 rounded-[var(--radius-lg)] border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                No photo
              </div>
            )}
            <label className="block min-w-[12rem] flex-1">
              <span className="label">Main image</span>
              <Input type="file" accept="image/*" {...register('image')} />
              <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                JPG or PNG, ideally square.
              </span>
            </label>
          </div>

          {showVariations && (
            <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/30 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="label">Hot variation</span>
                {previewHot ? (
                  <img
                    src={previewHot}
                    alt="Hot"
                    className="size-24 rounded-[var(--radius-lg)] border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
                    Hot
                  </div>
                )}
                <Input type="file" accept="image/*" {...register('imageHot')} />
              </div>
              <div className="space-y-2">
                <span className="label">Cold variation</span>
                {previewCold ? (
                  <img
                    src={previewCold}
                    alt="Cold"
                    className="size-24 rounded-[var(--radius-lg)] border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
                    Cold
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  {...register('imageCold')}
                />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 border-t border-[var(--border)] pt-6">
          <h3 className="section-title">Customizations on app</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tick a group to show it on the app, then tick which options inside
            (e.g. Temperature → Hot / Cold).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={showAllCustoms}
            >
              Show all
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setGroupIds([]);
                setOptionIdsByGroup({});
              }}
            >
              Hide all
            </Button>
          </div>
          <div className="space-y-3">
            {(customs.data ?? []).map((g) => {
              const groupOn = groupIds.includes(g.id);
              const selectedOpts = optionIdsByGroup[g.id] ?? [];
              return (
                <div
                  key={g.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3"
                >
                  <Checkbox
                    label={g.name}
                    checked={groupOn}
                    onChange={() => toggleGroup(g.id)}
                  />
                  {groupOn && g.options.length > 0 ? (
                    <div className="mt-2 ml-6 grid gap-1.5 sm:grid-cols-2">
                      {g.options.map((opt) => {
                        const oid = opt.id;
                        if (!oid) return null;
                        return (
                          <Checkbox
                            key={oid}
                            label={
                              opt.price > 0
                                ? `${opt.name} (+${opt.price})`
                                : opt.name
                            }
                            checked={selectedOpts.includes(oid)}
                            onChange={() => toggleOption(g.id, oid)}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {!customs.data?.length && (
            <p className="text-sm text-[var(--muted-foreground)]">
              No customization groups yet. Add them under Menu → Customizations.
            </p>
          )}
        </section>

        <section className="space-y-4 border-t border-[var(--border)] pt-6">
          <h3 className="section-title">Sale badges</h3>
          <Checkbox
            label="Top sale"
            checked={watch('isTopSale')}
            onChange={(e) => setValue('isTopSale', e.target.checked)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Discount % (optional)</span>
              <Input
                type="number"
                min={0}
                max={50}
                step={1}
                placeholder="e.g. 4"
                {...register('discountPercent')}
              />
            </label>
            <label className="block">
              <span className="label">Original price (optional)</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="Shown with strikethrough"
                {...register('compareAtPrice')}
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 border-t border-[var(--border)] pt-6">
          <h3 className="section-title">Availability</h3>
          <div className="flex flex-wrap gap-6">
            <Checkbox
              label="Active on menu"
              checked={watch('active')}
              onChange={(e) => setValue('active', e.target.checked)}
            />
            <Checkbox
              label="Sold out"
              checked={watch('soldOut')}
              onChange={(e) => setValue('soldOut', e.target.checked)}
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-6">
          <Button type="submit" loading={save.isPending}>
            {save.isPending ? 'Saving…' : id ? 'Save changes' : 'Add product'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => nav('/menu/products')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
