import {
  LoaderCircle,
  Inbox,
  AlertTriangle,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export { Toaster } from './Toaster';
export { useToast } from './useToast';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'destructive'
  | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_1px_2px_rgb(243_142_34/0.3)] hover:bg-[var(--primary-hover)] focus-visible:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]',
  secondary:
    'border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:ring-[color-mix(in_srgb,var(--foreground)_10%,transparent)]',
  outline:
    'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:ring-[color-mix(in_srgb,var(--foreground)_10%,transparent)]',
  ghost:
    'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-[color-mix(in_srgb,var(--foreground)_10%,transparent)]',
  danger:
    'bg-[var(--destructive)] text-white hover:bg-red-700 focus-visible:ring-red-200',
  destructive:
    'bg-[var(--destructive)] text-white hover:bg-red-700 focus-visible:ring-red-200',
  success:
    'bg-[var(--success)] text-white hover:bg-[color-mix(in_srgb,var(--success)_88%,black)] focus-visible:ring-[color-mix(in_srgb,var(--success)_25%,transparent)]',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-[var(--radius-md)] px-3 text-xs font-medium',
  md: 'h-9 rounded-[var(--radius-md)] px-3.5 text-sm font-medium',
  lg: 'h-10 rounded-[var(--radius-md)] px-4 text-sm font-medium',
};

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} {...props} className={`field ${props.className || ''}`} />;
  },
);

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className || ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field ${props.className || ''}`} />;
}

export function Checkbox({
  className = '',
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const control = (
    <input type="checkbox" className={`checkbox ${className}`} {...props} />
  );
  if (!label) return control;
  return (
    <label className="inline-flex items-center gap-2.5 text-sm text-[var(--foreground)]">
      {control}
      <span>{label}</span>
    </label>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="flex min-h-40 items-center justify-center gap-2.5 text-sm text-[var(--muted-foreground)]"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="animate-spin text-[var(--primary)]" size={20} aria-hidden />
      {label}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({
  title = 'Nothing here',
  message = 'No records found.',
  action,
  icon: Icon = Inbox,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="card flex min-h-48 flex-col items-center justify-center px-8 py-12 text-center">
      <span className="icon-well icon-well-stone mb-4">
        <Icon size={18} aria-hidden />
      </span>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">
        {message}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card flex min-h-48 flex-col items-center justify-center px-8 py-12 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-[0.7rem] bg-red-50 text-[var(--destructive)]">
        <AlertTriangle size={18} aria-hidden />
      </span>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">
        {message || 'Unable to load data. Please try again.'}
      </p>
      {onRetry && (
        <Button className="mt-5" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

type BadgeTone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'teal';

const badgeTones: Record<BadgeTone, string> = {
  gray: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
  blue: 'bg-[color-mix(in_srgb,var(--sky)_35%,white)] text-[var(--success)]',
  green: 'bg-[color-mix(in_srgb,var(--success)_14%,white)] text-[var(--success)]',
  red: 'bg-[color-mix(in_srgb,var(--coral)_14%,white)] text-[var(--coral)]',
  amber: 'bg-[color-mix(in_srgb,var(--primary)_16%,white)] text-[var(--primary-hover)]',
  teal: 'bg-[color-mix(in_srgb,var(--navy)_12%,white)] text-[var(--navy)]',
};

export function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
        <h1 className="font-display text-[1.85rem] font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
      )}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="backdrop-enter fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="modal-enter flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-md"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  message,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal open={open} title="Confirm action" onClose={onCancel}>
      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        {message}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
}

const avatarPalettes = [
  'bg-[color-mix(in_srgb,var(--primary)_16%,white)] text-[var(--primary)]',
  'bg-[color-mix(in_srgb,var(--warning)_16%,white)] text-[var(--warning)]',
  'bg-[color-mix(in_srgb,var(--sky)_32%,white)] text-[var(--success)]',
  'bg-[color-mix(in_srgb,var(--navy)_14%,white)] text-[var(--navy)]',
  'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--primary-hover)]',
  'bg-[var(--muted)] text-[var(--muted-foreground)]',
  'bg-[color-mix(in_srgb,var(--gold)_18%,white)] text-[var(--gold)]',
  'bg-[color-mix(in_srgb,var(--success)_14%,white)] text-[var(--success)]',
];

function avatarTone(name?: string) {
  const s = name || '?';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return avatarPalettes[Math.abs(h) % avatarPalettes.length];
}

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const sizes = {
    sm: 'size-7 text-[10px]',
    md: 'size-9 text-xs',
    lg: 'size-11 text-sm',
  };
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`inline-flex shrink-0 rounded-full object-cover ${sizes[size]}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${avatarTone(name)}`}
      aria-hidden
    >
      {initials || '?'}
    </span>
  );
}

const metricAccents: Record<
  'teal' | 'blue' | 'amber' | 'green' | 'gray' | 'gold',
  string
> = {
  teal: 'icon-well-primary',
  blue: 'icon-well-sky',
  amber: 'icon-well-amber',
  green: 'icon-well-green',
  gray: 'icon-well-stone',
  gold: 'icon-well-gold',
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  accent = 'teal',
  delay = 0,
  spark,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: 'teal' | 'blue' | 'amber' | 'green' | 'gray' | 'gold';
  delay?: number;
  spark?: ReactNode;
}) {
  return (
    <div
      className="stat-card anim-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
          {label}
        </p>
        {Icon && (
          <span className={`icon-well ${metricAccents[accent]}`}>
            <Icon size={16} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 text-[1.75rem] leading-none font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
        {value}
      </p>
      {(trend || hint || spark) && (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
            {trend && (
              <span
                className={`font-semibold ${
                  trend.positive === false
                    ? 'text-[var(--destructive)]'
                    : 'text-[var(--success)]'
                }`}
              >
                {trend.value}
              </span>
            )}
            {hint && <span>{hint}</span>}
          </div>
          {spark && (
            <span className="text-[var(--primary)] opacity-80">{spark}</span>
          )}
        </div>
      )}
    </div>
  );
}
