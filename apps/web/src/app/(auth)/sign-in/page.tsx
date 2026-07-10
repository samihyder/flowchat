'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { signInSchema, type SignInInput } from '@/lib/schemas';
import { api } from '@/lib/api';
import { resolveWorkspace } from '@/lib/complete-sign-in';
import { useAuthStore } from '@/store/auth';
import {
  AuthShell,
  AuthDivider,
  GoogleSignInButton,
  AuthError,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/layout/auth-shell';

const OAUTH_ERRORS: Record<string, string> = {
  oauth_failed: 'Google sign-in failed. Please try again.',
  oauth_profile: 'Could not load your Google profile.',
  oauth_email: 'Google account must have a verified email.',
  account_disabled: 'Your account has been deactivated.',
};

function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [twoFaUserId, setTwoFaUserId] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaError, setTwoFaError] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaRememberMe, setTwoFaRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { rememberMe: true } });

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError('root', { message: OAUTH_ERRORS[oauthError] ?? 'Sign-in failed.' });
    }
    if (searchParams.get('requiresTwoFactor') === '1') {
      const userId = searchParams.get('userId');
      if (userId) setTwoFaUserId(userId);
    }
  }, [searchParams, setError]);

  const onSubmit = async (data: SignInInput) => {
    try {
      const rememberMe = data.rememberMe ?? true;
      const res = await api.auth.signIn({ ...data, rememberMe });
      if ('requiresTwoFactor' in res) {
        setTwoFaRememberMe(rememberMe);
        setTwoFaUserId(res.userId);
        return;
      }
      if ('pendingApproval' in res && res.pendingApproval) {
        router.push('/pending-approval' as import('next').Route);
        return;
      }
      if (!('token' in res)) return;
      if (res.isSuperAdmin) {
        setAuth(res.user, res.token, null, null, true);
        router.push('/select-workspace' as import('next').Route);
        return;
      }
      const workspace = await resolveWorkspace(res.token, res.account);
      if (workspace && 'pendingApproval' in workspace) {
        router.push('/pending-approval' as import('next').Route);
        return;
      }
      setAuth(
        res.user,
        res.token,
        workspace && 'accountId' in workspace ? workspace.accountId : null,
        workspace && 'accountId' in workspace ? workspace.accountName : null
      );
      router.push('/dashboard');
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : 'Sign in failed' });
    }
  };

  const handleTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaUserId) return;
    setTwoFaLoading(true);
    setTwoFaError('');
    try {
      const res = await api.twoFa.verify(twoFaUserId, twoFaCode, twoFaRememberMe);
      const workspace = await resolveWorkspace(res.token, res.account);
      if (workspace && 'pendingApproval' in workspace) {
        router.push('/pending-approval' as import('next').Route);
        return;
      }
      setAuth(
        res.user,
        res.token,
        workspace && 'accountId' in workspace ? workspace.accountId : '',
        workspace && 'accountId' in workspace ? workspace.accountName : ''
      );
      router.push('/dashboard');
    } catch (err: unknown) {
      setTwoFaError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setTwoFaLoading(false);
    }
  };

  if (twoFaUserId) {
    return (
      <AuthShell title="Two-factor authentication" subtitle="Enter the code from your authenticator app">
        <form onSubmit={handleTwoFa} className="space-y-4">
          {twoFaError && <AuthError message={twoFaError} />}
          <input
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value.trim())}
            placeholder="6-digit code or backup code"
            required
            autoFocus
            className={`${authInputClass} font-mono tracking-widest text-center`}
          />
          <button type="submit" disabled={twoFaLoading || !twoFaCode} className={authSubmitClass}>
            {twoFaLoading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setTwoFaUserId(null)}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 text-center"
        >
          ← Back to sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your workspace.">
      <GoogleSignInButton href={api.auth.googleUrl()} />
      <AuthDivider label="or" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && <AuthError message={errors.root.message!} />}

        <div>
          <label className={authLabelClass}>Work email</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className={authInputClass}
            placeholder="you@company.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={authLabelClass.replace('mb-1.5', '')}>Password</label>
            <Link href={'/forgot-password' as Route} className="text-xs text-primary-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            className={authInputClass}
            placeholder="••••••••"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" {...register('rememberMe')} className="w-3.5 h-3.5 accent-primary-500" />
          Remember me for 30 days
        </label>

        <button type="submit" disabled={isSubmitting} className={authSubmitClass}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="text-primary-600 font-medium hover:underline">
          Create workspace
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignInPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-cyan-50 to-teal-50">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  );
}
