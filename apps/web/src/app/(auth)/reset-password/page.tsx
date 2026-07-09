'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/schemas';
import { api } from '@/lib/api';
import { AuthShell, AuthError, authInputClass, authLabelClass, authSubmitClass } from '@/components/layout/auth-shell';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    api.auth
      .checkResetToken(token)
      .then((res) => setTokenValid(res.valid))
      .catch(() => setTokenValid(false));
  }, [token]);

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      await api.auth.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => router.push('/sign-in'), 2000);
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : 'Reset failed' });
    }
  };

  if (tokenValid === null) {
    return <p className="text-sm text-gray-400 text-center">Checking link…</p>;
  }

  if (!tokenValid) {
    return (
      <div className="text-center space-y-4">
        <AuthError message="This reset link is invalid or has expired." />
        <Link href={'/forgot-password' as Route} className="text-primary-600 font-medium hover:underline text-sm">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-xl">
          ✓
        </div>
        <p className="text-sm text-gray-600">Password updated. Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && <AuthError message={errors.root.message!} />}
      <div>
        <label className={authLabelClass}>New password</label>
        <input
          {...register('password')}
          type="password"
          autoComplete="new-password"
          autoFocus
          className={authInputClass}
          placeholder="Min. 8 characters"
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <div>
        <label className={authLabelClass}>Confirm new password</label>
        <input
          {...register('confirmPassword')}
          type="password"
          autoComplete="new-password"
          className={authInputClass}
          placeholder="Re-enter password"
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting} className={authSubmitClass}>
        {isSubmitting ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      <Suspense fallback={<p className="text-sm text-gray-400 text-center">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
