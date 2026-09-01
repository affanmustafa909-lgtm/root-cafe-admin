import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3 } from 'lucide-react';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  useToast,
} from '@/shared/ui';

type PickupPayload = {
  openTime: string;
  closeTime: string;
  slotIntervalMinutes: number;
  maxDaysAhead: number;
  asapEstimateMinutes: number | null;
  updatedAt?: string;
};

export function PickupSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState('15');
  const [maxDaysAhead, setMaxDaysAhead] = useState('7');
  const [asapEstimateMinutes, setAsapEstimateMinutes] = useState('10');

  const q = useQuery({
    queryKey: ['pickup-settings'],
    queryFn: async () =>
      dataOf<PickupPayload>(await api.get('/admin/settings/pickup')),
  });

  useEffect(() => {
    if (!q.data) return;
    setOpenTime(q.data.openTime);
    setCloseTime(q.data.closeTime);
    setSlotIntervalMinutes(String(q.data.slotIntervalMinutes));
    setMaxDaysAhead(String(q.data.maxDaysAhead));
    setAsapEstimateMinutes(
      q.data.asapEstimateMinutes != null
        ? String(q.data.asapEstimateMinutes)
        : '10',
    );
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () =>
      api.patch('/admin/settings/pickup', {
        openTime,
        closeTime,
        slotIntervalMinutes: Number(slotIntervalMinutes),
        maxDaysAhead: Number(maxDaysAhead),
        asapEstimateMinutes: Number(asapEstimateMinutes) || null,
      }),
    onSuccess: () => {
      toast('Pickup settings saved — mobile app will use these values');
      void qc.invalidateQueries({ queryKey: ['pickup-settings'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (q.isLoading) {
    return (
      <div className="page-enter space-y-4">
        <PageHeader title="Pickup schedule" />
        <Skeleton className="h-48 w-full max-w-xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        title="Could not load pickup settings"
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Pickup schedule"
        description="Control how far ahead customers can book and which times appear in the app."
      />

      <section className="card max-w-xl space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--foreground)]">
            <Clock3 size={16} aria-hidden />
          </span>
          <div>
            <h2 className="section-title">Customer checkout</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              These values drive the calendar days and time dropdown on Scheduled
              Pickup.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">
              Open time
            </span>
            <Input
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">
              Close time
            </span>
            <Input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">
              Slot interval (minutes)
            </span>
            <Input
              type="number"
              min={5}
              max={120}
              value={slotIntervalMinutes}
              onChange={(e) => setSlotIntervalMinutes(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground)]">
              Days ahead (calendar)
            </span>
            <Input
              type="number"
              min={0}
              max={60}
              value={maxDaysAhead}
              onChange={(e) => setMaxDaysAhead(e.target.value)}
            />
            <span className="text-xs text-[var(--muted-foreground)]">
              0 = today only. 7 = today + next 7 days.
            </span>
          </label>
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--foreground)]">
              “Now” estimate (minutes)
            </span>
            <Input
              type="number"
              min={1}
              max={120}
              value={asapEstimateMinutes}
              onChange={(e) => setAsapEstimateMinutes(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] pt-4">
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => void save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save pickup settings'}
          </Button>
        </div>
      </section>
    </div>
  );
}
