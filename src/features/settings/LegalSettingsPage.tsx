import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Scale } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
  useToast,
} from '@/shared/ui';

type CafeContact = {
  name: string;
  street: string;
  postalCity: string;
  phone: string;
  email: string;
  owner: string;
  vatId: string;
  notes: string;
};

type LegalPayload = {
  contact?: CafeContact;
  impressum: string;
  privacy: string;
  terms: string;
  templates?: { privacy: string; terms: string };
  updatedAt?: string | null;
};

const emptyContact = (): CafeContact => ({
  name: '',
  street: '',
  postalCity: '',
  phone: '',
  email: '',
  owner: '',
  vatId: '',
  notes: '',
});

function composeImpressumPreview(contact: CafeContact, fallback: string) {
  const hasIdentity =
    contact.name ||
    contact.street ||
    contact.postalCity ||
    contact.phone ||
    contact.email ||
    contact.owner;
  if (!hasIdentity) return fallback;

  const lines = [
    'Impressum',
    '',
    'Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)',
    '',
  ];
  if (contact.name) lines.push(contact.name);
  if (contact.street) lines.push(contact.street);
  if (contact.postalCity) lines.push(contact.postalCity);
  if (contact.owner) lines.push('', 'Vertreten durch:', contact.owner);
  const reach: string[] = [];
  if (contact.phone) reach.push(`Telefon: ${contact.phone}`);
  if (contact.email) reach.push(`E-Mail: ${contact.email}`);
  if (reach.length) lines.push('', ...reach);
  if (contact.vatId) {
    lines.push('', 'Umsatzsteuer-Identifikationsnummer:', contact.vatId);
  }
  if (contact.notes) lines.push('', contact.notes);
  const contentOwner = contact.owner || contact.name;
  if (contentOwner) {
    lines.push(
      '',
      'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:',
      contentOwner,
    );
  }
  return lines.join('\n').trim();
}

export function LegalSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [contact, setContact] = useState<CafeContact>(emptyContact);
  const [privacy, setPrivacy] = useState('');
  const [terms, setTerms] = useState('');

  const q = useQuery({
    queryKey: ['legal-settings'],
    queryFn: async () =>
      dataOf<LegalPayload>(await api.get('/admin/settings/legal')),
  });

  useEffect(() => {
    if (!q.data) return;
    setContact({ ...emptyContact(), ...q.data.contact });
    setPrivacy(q.data.privacy ?? '');
    setTerms(q.data.terms ?? '');
  }, [q.data]);

  const impressumPreview = useMemo(
    () => composeImpressumPreview(contact, q.data?.impressum ?? ''),
    [contact, q.data?.impressum],
  );

  const save = useMutation({
    mutationFn: async () =>
      api.patch('/admin/settings/legal', {
        cafeName: contact.name,
        cafeStreet: contact.street,
        cafePostalCity: contact.postalCity,
        cafePhone: contact.phone,
        cafeEmail: contact.email,
        cafeOwner: contact.owner,
        cafeVatId: contact.vatId,
        cafeImpressumNotes: contact.notes,
        privacy,
        terms,
      }),
    onSuccess: (res) => {
      toast('Legal pages saved — shown in the customer app');
      const payload = dataOf<LegalPayload>(res);
      qc.setQueryData(['legal-settings'], payload);
      void qc.invalidateQueries({ queryKey: ['legal-settings'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const setField = (key: keyof CafeContact, value: string) => {
    setContact((c) => ({ ...c, [key]: value }));
  };

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
        description="Café contact (Impressum) plus Datenschutzerklärung and AGB shown in the customer app."
      />

      <section className="card max-w-3xl space-y-6 p-6">
        <div className="flex items-start gap-3 border-b border-[var(--border)] pb-5">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--foreground)]">
            <MapPin size={16} aria-hidden />
          </span>
          <div>
            <h2 className="section-title">Café contact (Impressum)</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Enter the café’s real details only — business name, street (no P.O.
              box), phone, email, and owner. These appear in the app Impressum.
              Leave a field empty if you do not have it yet.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--foreground)]">
              Business name
            </span>
            <Input
              value={contact.name}
              onChange={(e) => setField('name', e.target.value)}
              maxLength={200}
              autoComplete="organization"
            />
          </label>
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--foreground)]">
              Street and number
            </span>
            <Input
              value={contact.street}
              onChange={(e) => setField('street', e.target.value)}
              maxLength={200}
              autoComplete="street-address"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">
              Postcode and city
            </span>
            <Input
              value={contact.postalCity}
              onChange={(e) => setField('postalCity', e.target.value)}
              maxLength={200}
              autoComplete="address-level2"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">
              Owner / legal representative
            </span>
            <Input
              value={contact.owner}
              onChange={(e) => setField('owner', e.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">Phone</span>
            <Input
              type="tel"
              value={contact.phone}
              onChange={(e) => setField('phone', e.target.value)}
              maxLength={80}
              autoComplete="tel"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">Email</span>
            <Input
              type="email"
              value={contact.email}
              onChange={(e) => setField('email', e.target.value)}
              maxLength={200}
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--foreground)]">
              VAT ID (optional)
            </span>
            <Input
              value={contact.vatId}
              onChange={(e) => setField('vatId', e.target.value)}
              maxLength={80}
            />
          </label>
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--foreground)]">
              Extra Impressum notes (optional)
            </span>
            <Textarea
              rows={3}
              value={contact.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Handelsregister, Aufsichtsbehörde, …"
            />
          </label>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Impressum preview (app)
          </p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-[var(--foreground)]">
            {impressumPreview ||
              'Save contact details to generate the Impressum.'}
          </pre>
        </div>
      </section>

      <section className="card max-w-3xl space-y-6 p-6">
        <div className="flex items-start gap-3 border-b border-[var(--border)] pb-5">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--foreground)]">
            <Scale size={16} aria-hidden />
          </span>
          <div>
            <h2 className="section-title">Datenschutz & AGB</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Pre-filled with typical German café / pickup-app texts (DSGVO +
              AGB). Verantwortlicher is the operator named in the Impressum — no
              invented address. Have a lawyer review before going live.
            </p>
          </div>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            Datenschutzerklärung (Privacy policy)
          </span>
          <Textarea
            rows={16}
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            AGB (Terms of use)
          </span>
          <Textarea
            rows={16}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPrivacy(q.data?.templates?.privacy ?? privacy);
              setTerms(q.data?.templates?.terms ?? terms);
              toast('German café templates restored — save to publish');
            }}
          >
            Restore German café templates
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save legal pages'}
          </Button>
        </div>
      </section>
    </div>
  );
}
