'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/schemas';
import { api } from '@/lib/api';
import { AuthShell, AuthError, authInputClass, authLabelClass, authSubmitClass } from '@/components/layout/auth-shell';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await api.auth.forgotPassword(data.email);
      setSent(true);
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : 'Something went wrong' });
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="If that email is registered, a reset link is on its way.">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <p className="text-sm text-gray-600">
            The link expires in 1 hour. Check your spam folder if it doesn&apos;t arrive shortly.
          </p>
          <Link href="/sign-in" className="text-primary-600 font-medium hover:underline text-sm">
            ← Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your work email and we'll send you a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && <AuthError message={errors.root.message!} />}
        <div>
          <label className={authLabelClass}>Work email</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            autoFocus
            className={authInputClass}
            placeholder="you@company.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className={authSubmitClass}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/sign-in" className="text-primary-600 font-medium hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
