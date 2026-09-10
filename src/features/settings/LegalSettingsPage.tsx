import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import {
  Button,
  ErrorState,
  PageHeader,
  Skeleton,
  Textarea,
  useToast,
} from '@/shared/ui';

type LegalPayload = {
  impressum: string;
  privacy: string;
  terms: string;
  updatedAt?: string | null;
};

export function LegalSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [impressum, setImpressum] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [terms, setTerms] = useState('');

  const q = useQuery({
    queryKey: ['legal-settings'],
    queryFn: async () =>
      dataOf<LegalPayload>(await api.get('/admin/settings/legal')),
  });

  useEffect(() => {
    if (!q.data) return;
    setImpressum(q.data.impressum ?? '');
    setPrivacy(q.data.privacy ?? '');
    setTerms(q.data.terms ?? '');
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () =>
      api.patch('/admin/settings/legal', { impressum, privacy, terms }),
    onSuccess: () => {
      toast('Legal pages saved — shown in the customer app');
      void qc.invalidateQueries({ queryKey: ['legal-settings'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (q.isLoading) {
    return (
      <div className="page-enter space-y-4">
        <PageHeader title="Legal pages" />
        <Skeleton className="h-96 w-full max-w-3xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Could not load legal settings"
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Legal pages"
        description="Impressum, Datenschutzerklärung, and AGB shown in the customer app (Profile → Legal)."
      />

      <section className="card max-w-3xl space-y-6 p-6">
        <div className="flex items-start gap-3 border-b border-[var(--border)] pb-5">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--foreground)]">
            <Scale size={16} aria-hidden />
          </span>
          <div>
            <h2 className="section-title">Store compliance texts</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Plain text only. Include exact business name, street address, contact,
              and owner for Impressum; GDPR details for privacy; order / no-show rules
              for terms. Have a lawyer review before going live in DE/AT stores.
            </p>
          </div>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            Impressum (Legal notice)
          </span>
          <Textarea
            rows={12}
            value={impressum}
            onChange={(e) => setImpressum(e.target.value)}
            placeholder={`Business name\nStreet address\nEmail · Phone\nLegal representative / owner`}
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            Datenschutzerklärung (Privacy policy)
          </span>
          <Textarea
            rows={14}
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            placeholder="Why you collect email/phone, retention, hosting providers (GDPR)…"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            AGB (Terms of use)
          </span>
          <Textarea
            rows={14}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Account rules, ordering, no-show / uncollected orders…"
          />
        </label>

        <Button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save legal pages'}
        </Button>
      </section>
    </div>
  );
}
