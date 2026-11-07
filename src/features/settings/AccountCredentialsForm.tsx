import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/features/auth/AuthContext';
import { api, dataOf, errorMessage } from '@/shared/api/client';
import type { User } from '@/shared/types';
import { Button, Input, useToast } from '@/shared/ui';

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const next = v.newPassword?.trim() || '';
    if (next && next.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'At least 8 characters',
      });
    }
    if (next && next !== (v.confirmPassword || '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

type Form = z.infer<typeof schema>;

export function AccountCredentialsForm() {
  const { user, applySession } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  return (
    <form
      className="mt-6 space-y-4 border-t border-[var(--border)] pt-5"
      onSubmit={handleSubmit(async (v) => {
        setFormError('');
        const email = v.email.trim().toLowerCase();
        const newPassword = v.newPassword?.trim() || undefined;
        const emailChanged = email !== (user?.email || '').toLowerCase();

        if (!emailChanged && !newPassword) {
          setFormError('Change your email and/or set a new password.');
          return;
        }

        try {
          const payload = dataOf<{
            user: User;
            accessToken?: string;
            token?: string;
          }>(
            await api.patch('/auth/me/credentials', {
              ...(emailChanged ? { email } : {}),
              ...(newPassword ? { newPassword } : {}),
            }),
          );

          const token = payload.accessToken || payload.token;
          if (token && payload.user) {
            applySession(token, payload.user);
          } else if (payload.user) {
            applySession(undefined, payload.user);
          }

          reset({
            email: payload.user?.email || email,
            newPassword: '',
            confirmPassword: '',
          });
          toast('Credentials updated');
        } catch (e) {
          setFormError(errorMessage(e));
        }
      })}
      noValidate
    >
      <div className="flex items-start gap-3">
        <span className="icon-well icon-well-navy size-9 shrink-0">
          <ShieldCheck size={16} aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Login credentials
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Update the email or password used to sign in to the admin portal.
          </p>
        </div>
      </div>

      {formError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <label className="block">
        <span className="label">Email</span>
        <Input
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email ? (
          <small className="mt-1 block text-[var(--destructive)]">
            {errors.email.message}
          </small>
        ) : null}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">New password</span>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-11"
              placeholder="Leave blank to keep"
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
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
          {errors.newPassword ? (
            <small className="mt-1 block text-[var(--destructive)]">
              {errors.newPassword.message}
            </small>
          ) : (
            <small className="mt-1 block text-[var(--muted-foreground)]">
              Optional · min. 8 characters
            </small>
          )}
        </label>
        <label className="block">
          <span className="label">Confirm new password</span>
          <Input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <small className="mt-1 block text-[var(--destructive)]">
              {errors.confirmPassword.message}
            </small>
          ) : null}
        </label>
      </div>

      <Button
        type="submit"
        loading={isSubmitting}
        disabled={!isDirty && !isSubmitting}
      >
        Save credentials
      </Button>
    </form>
  );
}
