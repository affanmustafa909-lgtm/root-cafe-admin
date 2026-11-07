import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import { Button, Input } from '@/shared/ui';

const schema = z.object({
  email: z.string().email(),
});
type Form = z.infer<typeof schema>;

type ForgotResponse = {
  success?: boolean;
  message?: string;
  emailSent?: boolean;
  debugResetUrl?: string;
};

export function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [result, setResult] = useState<ForgotResponse | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to sign in
        </Link>

        <div className="card mt-4 p-6 sm:p-8">
          <span className="icon-well icon-well-primary size-11">
            <KeyRound size={20} aria-hidden />
          </span>
          <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Forgot password
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Enter the staff email for your admin account. We’ll send a reset
            link if it matches an active account.
          </p>

          {result ? (
            <div className="mt-6 space-y-4">
              <div
                className="rounded-xl border border-[color-mix(in_srgb,var(--success)_30%,var(--border))] bg-[color-mix(in_srgb,var(--success)_8%,var(--card))] px-3.5 py-3 text-sm text-[var(--foreground)]"
                role="status"
              >
                {result.message ||
                  'If that email belongs to a staff account, reset instructions were sent.'}
              </div>
              {result.debugResetUrl ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-3.5 py-3 text-sm">
                  <p className="font-medium text-[var(--foreground)]">
                    Development reset link
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    SMTP is not configured, so use this link locally:
                  </p>
                  <a
                    href={result.debugResetUrl}
                    className="mt-2 block break-all text-sm font-semibold text-[var(--primary)] hover:underline"
                  >
                    Open reset link
                  </a>
                </div>
              ) : null}
              <Link
                to="/login"
                className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
              >
                Return to sign in
              </Link>
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={handleSubmit(async (v) => {
                setError('');
                try {
                  const payload = dataOf<ForgotResponse>(
                    await api.post('/auth/forgot-password', {
                      email: v.email,
                      audience: 'admin',
                    }),
                  );
                  setResult(payload);
                } catch (e) {
                  setError(errorMessage(e));
                }
              })}
              noValidate
            >
              {error ? (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              <label className="block">
                <span className="label">Email</span>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@rootscafe.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email ? (
                  <small className="mt-1 block text-[var(--destructive)]">
                    Enter a valid email
                  </small>
                ) : null}
              </label>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
