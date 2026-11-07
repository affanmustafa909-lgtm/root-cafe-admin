import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, errorMessage } from '@/shared/api/client';
import { Button, Input } from '@/shared/ui';

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(8, 'At least 8 characters'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type Form = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = useMemo(() => params.get('token')?.trim() || '', [params]);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
        <div className="card w-full max-w-md p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">
            Invalid reset link
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            This link is missing a reset token. Request a new password reset
            from the sign-in page.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

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
            <LockKeyhole size={20} aria-hidden />
          </span>
          <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Pick a strong password for your admin account. You’ll use it the
            next time you sign in.
          </p>

          {done ? (
            <div className="mt-6 space-y-4">
              <div
                className="rounded-xl border border-[color-mix(in_srgb,var(--success)_30%,var(--border))] bg-[color-mix(in_srgb,var(--success)_8%,var(--card))] px-3.5 py-3 text-sm text-[var(--foreground)]"
                role="status"
              >
                Password updated. You can sign in now.
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => nav('/login')}
              >
                Go to sign in
              </Button>
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={handleSubmit(async (v) => {
                setError('');
                try {
                  await api.post('/auth/reset-password', {
                    token,
                    password: v.password,
                  });
                  setDone(true);
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
                <span className="label">New password</span>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-11"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password ? (
                  <small className="mt-1 block text-[var(--destructive)]">
                    {errors.password.message}
                  </small>
                ) : null}
              </label>

              <label className="block">
                <span className="label">Confirm password</span>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirm}
                  {...register('confirm')}
                />
                {errors.confirm ? (
                  <small className="mt-1 block text-[var(--destructive)]">
                    {errors.confirm.message}
                  </small>
                ) : null}
              </label>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isSubmitting}
              >
                {isSubmitting ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
