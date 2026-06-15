'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInviteSchema, type AcceptInviteInput } from '@/lib/schemas';
import {
  AuthShell,
  AuthError,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/layout/auth-shell';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [inviteInfo, setInviteInfo] = useState<{ email: string; accountName: string } | null>(null);
  const [done, setDone] = useState(false);
  const [loadError, setLoadError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { token },
  });

  useEffect(() => {
    if (token) setValue('token', token);
  }, [token, setValue]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Invalid invite');
        setInviteInfo({ email: data.invite.email, accountName: data.invite.accountName });
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [token]);

  const onSubmit = async (data: AcceptInviteInput) => {
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to accept invite');
      setDone(true);
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : 'Request failed' });
    }
  };

  if (!token) {
    return <AuthError message="Missing invite token." />;
  }

  if (loadError) {
    return <AuthError message={loadError} />;
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-xl">
          ✓
        </div>
        <p className="text-sm text-gray-600">
          Your account is ready. An administrator must approve your access before you can open chats.
        </p>
        <Link href="/sign-in" className="text-primary-600 font-medium hover:underline text-sm">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      {inviteInfo && (
        <p className="text-sm text-gray-600 mb-5 text-center">
          Join <strong>{inviteInfo.accountName}</strong>
          <br />
          <span className="text-gray-400">{inviteInfo.email}</span>
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('token')} />
        {errors.root && <AuthError message={errors.root.message!} />}
        <div>
          <label className={authLabelClass}>Your name</label>
          <input {...register('name')} className={authInputClass} placeholder="Your name" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className={authLabelClass}>Password</label>
          <input
            {...register('password')}
            type="password"
            className={authInputClass}
            placeholder="Min. 8 characters"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting || !inviteInfo} className={authSubmitClass}>
          {isSubmitting ? 'Creating account…' : 'Accept invite'}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <AuthShell title="Agent invite" subtitle="Set up your account to join the workspace.">
      <Suspense fallback={<p className="text-sm text-gray-400 text-center">Loading invite…</p>}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  );
}
