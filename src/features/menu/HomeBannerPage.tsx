import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Trash2 } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import { mediaUrl } from '@/shared/lib/media';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  useToast,
} from '@/shared/ui';

type BannerPayload = {
  homeBannerImageUrl?: string | null;
  recommendedSize?: {
    width: number;
    height: number;
    aspectRatio: string;
    maxFileMb: number;
    formats: string[];
    note: string;
  };
  updatedAt?: string;
};

export function HomeBannerPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['home-banner'],
    queryFn: async () =>
      dataOf<BannerPayload>(await api.get('/admin/settings/home-banner')),
  });

  useEffect(() => {
    if (!file) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose an image first');
      const body = new FormData();
      body.append('image', file);
      return api.patch('/admin/settings/home-banner', body);
    },
    onSuccess: () => {
      toast('Home banner updated');
      setFile(null);
      void qc.invalidateQueries({ queryKey: ['home-banner'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const clear = useMutation({
    mutationFn: () => api.patch('/admin/settings/home-banner/clear'),
    onSuccess: () => {
      toast('Banner cleared — app will show the default image');
      setFile(null);
      void qc.invalidateQueries({ queryKey: ['home-banner'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const size = q.data?.recommendedSize;
  const preview =
    localPreview || mediaUrl(q.data?.homeBannerImageUrl) || null;

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Home banner" />
        <Skeleton className="h-72 max-w-2xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load banner"
        message="Something went wrong while loading the home banner settings."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Home banner"
        description="Image shown at the top of the customer app Home screen."
      />

      <div className="card max-w-2xl space-y-5 p-6">
        <div className="flex items-start gap-3 border-b border-[var(--border)] pb-5">
          <span className="icon-well icon-well-primary size-12">
            <ImageIcon size={22} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Customer app promo banner
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Upload a landscape photo only (no in-image text needed). The app
              crops with cover to fill the banner box.
            </p>
          </div>
        </div>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/40 p-4">
          <h3 className="section-title mb-2">Recommended size</h3>
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            <li>
              <strong>
                {size?.width ?? 1200} × {size?.height ?? 576} px
              </strong>{' '}
              (aspect {size?.aspectRatio ?? '2.08:1'})
            </li>
            <li>Formats: {(size?.formats ?? ['JPG', 'PNG']).join(', ')}</li>
            <li>Max file size: {size?.maxFileMb ?? 5} MB</li>
          </ul>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {size?.note ??
              'Landscape ~2:1 works best for the home banner (height 168 on phone).'}
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="section-title">Preview</h3>
          <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#E7BC91]">
            {preview ? (
              <img
                src={preview}
                alt="Home banner preview"
                className="aspect-[1200/576] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[1200/576] items-center justify-center text-sm text-[var(--muted-foreground)]">
                No custom banner — app uses built-in default
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3 border-t border-[var(--border)] pt-5">
          <h3 className="section-title">Upload</h3>
          <label className="block">
            <span className="label">Banner image</span>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              loading={save.isPending}
              disabled={!file || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Saving…' : 'Save banner'}
            </Button>
            {(q.data?.homeBannerImageUrl || file) && (
              <Button
                type="button"
                variant="secondary"
                loading={clear.isPending}
                onClick={() => clear.mutate()}
              >
                <Trash2 size={16} aria-hidden />
                Clear custom banner
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
