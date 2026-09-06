import { useEffect, useState } from 'react';
import { Button, Modal, Textarea } from '@/shared/ui';

type Props = {
  open: boolean;
  orderNumber?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
};

export function DeclineOrderModal({
  open,
  orderNumber,
  busy,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      title="Decline order"
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={busy}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            Decline order
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        {orderNumber
          ? `Decline #${orderNumber}? The customer will be notified.`
          : 'The customer will be notified that this order could not be fulfilled.'}
      </p>
      <label className="mt-4 block">
        <span className="label">Reason (optional)</span>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. sold out, closing early…"
          disabled={busy}
          autoFocus
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {['Sold out', 'Closing early', 'Too busy'].map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={busy}
            onClick={() => setReason(preset)}
            className="rounded-full border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
          >
            {preset}
          </button>
        ))}
      </div>
    </Modal>
  );
}
