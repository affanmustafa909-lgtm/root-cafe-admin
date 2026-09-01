import { useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { ToastContext } from './useToast';

type ToastItem = { id: number; message: string; type: 'success' | 'error' };

export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = (message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3500);
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
              item.type === 'success'
                ? 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role="status"
          >
            {item.type === 'success' ? (
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-[var(--success)]"
                aria-hidden
              />
            ) : (
              <span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-[var(--destructive)]" />
            )}
            <span className="flex-1 leading-snug">{item.message}</span>
            <button
              type="button"
              className="rounded p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={() =>
                setItems((prev) => prev.filter((x) => x.id !== item.id))
              }
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
