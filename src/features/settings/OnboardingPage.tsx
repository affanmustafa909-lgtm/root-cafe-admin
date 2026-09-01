import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Plus, Trash2, Pencil } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import { mediaUrl } from '@/shared/lib/media';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  useToast,
  Modal,
  Checkbox,
} from '@/shared/ui';

type RecommendedSize = {
  width: number;
  height: number;
  aspectRatio: string;
  maxFileMb: number;
  formats: string[];
  note: string;
};

type OnboardingSlide = {
  id: string;
  sortOrder: number;
  isActive: boolean;
  imageUrl?: string | null;
  title: string;
  body: string;
  titlePlacement: string;
  titleAlign: string;
  bodyAlign: string;
  copyBlockVertical: string;
  showBottomShadow: boolean;
};

type OnboardingPayload = {
  slides: OnboardingSlide[];
  ctaText: string;
  recommendedSize: RecommendedSize;
};

type SlideForm = {
  title: string;
  body: string;
  titlePlacement: string;
  titleAlign: string;
  bodyAlign: string;
  copyBlockVertical: string;
  showBottomShadow: boolean;
  sortOrder: number;
  isActive: boolean;
  file: File | null;
};

const emptyForm = (): SlideForm => ({
  title: '',
  body: '',
  titlePlacement: 'top',
  titleAlign: 'center',
  bodyAlign: 'center',
  copyBlockVertical: 'bottom',
  showBottomShadow: false,
  sortOrder: 1,
  isActive: true,
  file: null,
});

export function OnboardingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<OnboardingSlide | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SlideForm>(emptyForm());
  const [ctaText, setCtaText] = useState('Get Started');
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () =>
      dataOf<OnboardingPayload>(await api.get('/admin/onboarding')),
  });

  useEffect(() => {
    if (q.data?.ctaText) setCtaText(q.data.ctaText);
  }, [q.data?.ctaText]);

  useEffect(() => {
    if (!form.file) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(form.file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  const openCreate = () => {
    const nextOrder = (q.data?.slides.length ?? 0) + 1;
    setEditing(null);
    setCreating(true);
    setForm({ ...emptyForm(), sortOrder: nextOrder });
  };

  const openEdit = (slide: OnboardingSlide) => {
    setCreating(false);
    setEditing(slide);
    setForm({
      title: slide.title,
      body: slide.body,
      titlePlacement: slide.titlePlacement,
      titleAlign: slide.titleAlign,
      bodyAlign: slide.bodyAlign,
      copyBlockVertical: slide.copyBlockVertical,
      showBottomShadow: slide.showBottomShadow,
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
      file: null,
    });
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm());
  };

  const saveCta = useMutation({
    mutationFn: () => api.patch('/admin/onboarding/cta', { ctaText }),
    onSuccess: () => {
      toast('Button text updated');
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const saveSlide = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append('title', form.title);
      body.append('body', form.body);
      body.append('titlePlacement', form.titlePlacement);
      body.append('titleAlign', form.titleAlign);
      body.append('bodyAlign', form.bodyAlign);
      body.append('copyBlockVertical', form.copyBlockVertical);
      body.append('showBottomShadow', String(form.showBottomShadow));
      body.append('sortOrder', String(form.sortOrder));
      body.append('isActive', String(form.isActive));
      if (form.file) body.append('image', form.file);
      if (editing) return api.patch(`/admin/onboarding/${editing.id}`, body);
      return api.post('/admin/onboarding', body);
    },
    onSuccess: () => {
      toast(editing ? 'Slide updated' : 'Slide added');
      closeModal();
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const removeSlide = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/onboarding/${id}`),
    onSuccess: () => {
      toast('Slide removed');
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const size = q.data?.recommendedSize;
  const previewImage = useMemo(
    () =>
      localPreview ||
      (editing ? mediaUrl(editing.imageUrl) : null) ||
      null,
    [localPreview, editing],
  );

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Get Started screens" />
        <Skeleton className="h-72 max-w-2xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Unable to load onboarding"
        message="Something went wrong while loading Get Started screens."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Get Started screens"
        description="Manage the onboarding carousel shown before customers enter the app."
        action={
          <Button type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden />
            Add slide
          </Button>
        }
      />

      <div className="card max-w-3xl space-y-5 p-6">
        <div className="flex items-start gap-3 border-b border-[var(--border)] pb-5">
          <span className="icon-well icon-well-primary size-12">
            <ImageIcon size={22} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Recommended image size
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
              <li>
                <strong>
                  {size?.width ?? 1080} × {size?.height ?? 1920} px
                </strong>{' '}
                (aspect {size?.aspectRatio ?? '9:16'})
              </li>
              <li>Formats: {(size?.formats ?? ['JPG', 'PNG']).join(', ')}</li>
              <li>Max file size: {size?.maxFileMb ?? 5} MB</li>
            </ul>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {size?.note ??
                'Full-screen portrait photo. Text overlays on top — keep important details away from edges.'}
            </p>
          </div>
        </div>

        <section className="space-y-3 border-b border-[var(--border)] pb-5">
          <h3 className="section-title">Get Started button</h3>
          <label className="block max-w-sm">
            <span className="label">Button text</span>
            <Input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
            />
          </label>
          <Button
            type="button"
            loading={saveCta.isPending}
            onClick={() => saveCta.mutate()}
          >
            Save button text
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="section-title">Slides ({q.data?.slides.length ?? 0})</h3>
          <div className="space-y-3">
            {(q.data?.slides ?? []).map((slide) => (
              <div
                key={slide.id}
                className="flex flex-wrap items-start gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
              >
                <div className="aspect-[9/16] h-28 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]">
                  {slide.imageUrl ? (
                    <img
                      src={mediaUrl(slide.imageUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--muted-foreground)]">
                      Upload image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    #{slide.sortOrder} — {slide.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                    {slide.body}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Title: {slide.titlePlacement} / {slide.titleAlign} · Body:{' '}
                    {slide.copyBlockVertical} / {slide.bodyAlign}
                    {!slide.isActive ? ' · Hidden' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEdit(slide)}
                  >
                    <Pencil size={16} aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={removeSlide.isPending}
                    onClick={() => {
                      if (confirm('Remove this slide?')) removeSlide.mutate(slide.id);
                    }}
                  >
                    <Trash2 size={16} aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
            {(q.data?.slides.length ?? 0) === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                No slides yet. Add your first Get Started screen.
              </p>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={creating || !!editing}
        onClose={closeModal}
        title={editing ? 'Edit slide' : 'Add slide'}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={saveSlide.isPending}
              disabled={!form.title.trim() || !form.body.trim()}
              onClick={() => saveSlide.mutate()}
            >
              {editing ? 'Save changes' : 'Done'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="label">Background image</span>
            <Input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) =>
                setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))
              }
            />
          </label>
          {previewImage ? (
            <img
              src={previewImage}
              alt="Preview"
              className="mx-auto aspect-[9/16] h-56 w-auto rounded-xl object-cover shadow-sm"
            />
          ) : null}
          <label className="block">
            <span className="label">Title</span>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="label">Body text</span>
            <Textarea
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Title position</span>
              <Select
                value={form.titlePlacement}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titlePlacement: e.target.value }))
                }
              >
                <option value="top">Top of screen</option>
                <option value="bottom">With body (bottom block)</option>
              </Select>
            </label>
            <label className="block">
              <span className="label">Title align</span>
              <Select
                value={form.titleAlign}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titleAlign: e.target.value }))
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </label>
            <label className="block">
              <span className="label">Text block vertical</span>
              <Select
                value={form.copyBlockVertical}
                onChange={(e) =>
                  setForm((f) => ({ ...f, copyBlockVertical: e.target.value }))
                }
              >
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </Select>
            </label>
            <label className="block">
              <span className="label">Body align</span>
              <Select
                value={form.bodyAlign}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyAlign: e.target.value }))
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </label>
            <label className="block">
              <span className="label">Sort order</span>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value) || 0,
                  }))
                }
              />
            </label>
            <label className="flex items-center gap-2 pt-7">
              <Checkbox
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              <span className="text-sm">Active (visible in app)</span>
            </label>
          </div>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={form.showBottomShadow}
              onChange={(e) =>
                setForm((f) => ({ ...f, showBottomShadow: e.target.checked }))
              }
            />
            <span className="text-sm">Dark gradient at bottom (better text readability)</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
