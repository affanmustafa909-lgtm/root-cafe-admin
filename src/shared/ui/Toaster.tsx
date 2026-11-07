import { useState, type ReactNode } from 'react';
import { Bell, CheckCircle2, X } from 'lucide-react';
import {
  ToastContext,
  type ToastOptions,
  type ToastType,
} from './useToast';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  onClick?: () => void;
};

export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = (
    message: string,
    type: ToastType = 'success',
    options?: ToastOptions,
  ) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const duration = options?.duration ?? (type === 'info' ? 8000 : 3500);
    setItems((prev) => [
      ...prev,
      { id, message, type, onClick: options?.onClick },
    ]);
    window.setTimeout(
      () => setItems((prev) => prev.filter((x) => x.id !== id)),
      duration,
    );
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`toast-enter flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-medium shadow-md ${
              item.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : item.type === 'info'
                  ? 'border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] text-[var(--foreground)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]'
            } ${item.onClick ? 'cursor-pointer' : ''}`}
            role="status"
            onClick={
              item.onClick
                ? () => {
                    item.onClick?.();
                    setItems((prev) => prev.filter((x) => x.id !== item.id));
                  }
                : undefined
            }
          >
            {item.type === 'success' ? (
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-[var(--success)]"
                aria-hidden
              />
            ) : item.type === 'info' ? (
              <Bell
                size={18}
                className="mt-0.5 shrink-0 text-[var(--primary)]"
                aria-hidden
              />
            ) : (
              <span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-[var(--destructive)]" />
            )}
            <span className="flex-1 leading-snug">{item.message}</span>
            <button
              type="button"
              className="rounded p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={(e) => {
                e.stopPropagation();
                setItems((prev) => prev.filter((x) => x.id !== item.id));
              }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
