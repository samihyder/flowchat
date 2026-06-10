'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInviteSchema, type AcceptInviteInput } from '@/lib/schemas';

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
    return <p className="text-sm text-red-600">Missing invite token.</p>;
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-gray-700">
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
        <p className="text-sm text-gray-600 mb-4 text-center">
          Join <strong>{inviteInfo.accountName}</strong> as <strong>{inviteInfo.email}</strong>
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('token')} />
        {errors.root && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
          <input
            {...register('name')}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
            placeholder="Your name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            {...register('password')}
            type="password"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
            placeholder="Min. 8 characters"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !inviteInfo}
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm"
        >
          {isSubmitting ? 'Creating account…' : 'Accept invite'}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-2 text-center">Agent invite</h1>
        <Suspense fallback={<p className="text-sm text-gray-400 text-center">Loading…</p>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
