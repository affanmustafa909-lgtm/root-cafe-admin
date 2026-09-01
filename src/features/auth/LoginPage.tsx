import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ChartNoAxesCombined,
  ClipboardList,
  Eye,
  EyeOff,
  Leaf,
  Utensils,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from './AuthContext';
import { Button, Input } from '@/shared/ui';
import { errorMessage } from '@/shared/api/client';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

const features = [
  {
    icon: ClipboardList,
    title: 'Live kitchen board',
    copy: 'Advance orders in real time as they move through the café.',
  },
  {
    icon: Utensils,
    title: 'Menu control',
    copy: 'Products, categories, and cake of the day — always current.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Clear reporting',
    copy: 'See revenue, volume, and popular items at a glance.',
  },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="grid min-h-screen bg-[var(--background)] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[var(--sidebar)] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 8% 12%, color-mix(in srgb, var(--primary) 38%, transparent), transparent), radial-gradient(ellipse 55% 50% at 92% 88%, color-mix(in srgb, var(--navy) 42%, transparent), transparent), radial-gradient(ellipse 40% 35% at 70% 20%, color-mix(in srgb, var(--sky) 18%, transparent), transparent)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
          aria-hidden
        />

        <div className="relative z-10">
          <p className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Roots Café"
              className="size-14 object-contain"
            />
            <span>
              <span className="font-display block text-xl font-semibold tracking-tight">
                Roots Café
              </span>
              <span className="mt-1 flex items-center gap-1.5" aria-hidden>
                <span className="h-1.5 w-2.5 rotate-[-28deg] rounded-full bg-[var(--sky)]" />
                <span className="h-1.5 w-2.5 rotate-[-28deg] rounded-full bg-[var(--navy)]" />
                <span className="h-1.5 w-2.5 rotate-[-28deg] rounded-full bg-[var(--coral)]" />
              </span>
            </span>
          </p>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            <Leaf size={12} aria-hidden />
            Staff console
          </p>
          <h1 className="font-display text-4xl leading-[1.12] font-semibold tracking-tight xl:text-5xl">
            The café, run with care.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--sidebar-muted)]">
            Same warm Roots experience your guests know — built for the team
            behind the counter.
          </p>
          <ul className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title, copy }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[var(--sky)]">
                  <Icon size={16} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm text-[var(--sidebar-muted)]">
                    {copy}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-[var(--sidebar-muted)]">
          Roots Café · Secure staff access
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <form
          className="w-full max-w-sm"
          onSubmit={handleSubmit(async (v) => {
            setError('');
            try {
              await login(v.email, v.password);
              nav('/dashboard');
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
          noValidate
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img
              src="/logo.png"
              alt=""
              className="size-11 object-contain"
            />
            <span className="font-display text-lg font-semibold text-[var(--foreground)]">
              Roots Café
            </span>
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Welcome back
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Sign in to manage your café — just like home.
          </p>
          {error && (
            <div
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}
          <label className="mt-7 block">
            <span className="label">Email</span>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@rootscafe.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <small className="mt-1 block text-[var(--destructive)]">
                Enter a valid email
              </small>
            )}
          </label>
          <label className="mt-4 block">
            <span className="label">Password</span>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-11"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <small className="mt-1 block text-[var(--destructive)]">
                At least 6 characters
              </small>
            )}
          </label>
          <Button type="submit" className="mt-6 w-full" size="lg" loading={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  );
}
