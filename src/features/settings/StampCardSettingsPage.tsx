import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stamp } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  useToast,
} from '@/shared/ui';

type StampCardPayload = {
  enabled: boolean;
  stampsRequired: number;
  title: string;
  subtitle: string;
  updatedAt?: string | null;
};

export function StampCardSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [stampsRequired, setStampsRequired] = useState('8');
  const [title, setTitle] = useState('Stamp Card');
  const [subtitle, setSubtitle] = useState(
    'Collect 8 drinks on the app — the 9th is free',
  );

  const q = useQuery({
    queryKey: ['stamp-card-settings'],
    queryFn: async () =>
      dataOf<StampCardPayload>(await api.get('/admin/settings/stamp-card')),
  });

  useEffect(() => {
    if (!q.data) return;
    setEnabled(q.data.enabled);
    setStampsRequired(String(q.data.stampsRequired));
    setTitle(q.data.title);
    setSubtitle(q.data.subtitle);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () =>
      api.patch('/admin/settings/stamp-card', {
        enabled,
        stampsRequired: Number(stampsRequired),
        title,
        subtitle,
      }),
    onSuccess: () => {
      toast('Stamp card settings saved — mobile app will use these values');
      void qc.invalidateQueries({ queryKey: ['stamp-card-settings'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (q.isLoading) {
    return (
      <div className="page-enter space-y-4">
        <PageHeader title="Stamp card" />
        <Skeleton className="h-48 w-full max-w-xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Could not load stamp card settings"
        onRetry={() => void q.refetch()}
      />
    );
  }

  const required = Math.max(1, Number(stampsRequired) || 8);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Stamp card"
        description="Digital loyalty card. Every collected app order adds a stamp; after the required stamps, the next drink is free."
      />

      <section className="card max-w-xl space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--foreground)]">
            <Stamp size={16} aria-hidden />
          </span>
          <div>
            <h2 className="section-title">Loyalty rules</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Default: collect {required} stamps → drink #{required + 1} is free.
              Stamps apply when staff marks an order Complete.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4"
          />
          <span className="font-medium">Enable stamp card in the app</span>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            Stamps required for a free drink
          </span>
          <Input
            type="number"
            min={1}
            max={50}
            value={stampsRequired}
            onChange={(e) => setStampsRequired(e.target.value)}
          />
          <span className="text-xs text-[var(--muted-foreground)]">
            Example: 8 means the 9th drink ordered through the app is free.
          </span>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">Title</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">Subtitle</span>
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={200}
          />
        </label>

        <Button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save stamp card'}
        </Button>
      </section>
    </div>
  );
}
