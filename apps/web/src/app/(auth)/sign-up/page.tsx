'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpSchema, type SignUpInput } from '@/lib/schemas';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  AuthShell,
  AuthDivider,
  GoogleSignInButton,
  AuthError,
  AuthAnnotation,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/layout/auth-shell';

export default function SignUpPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (data: SignUpInput) => {
    try {
      const res = await api.auth.signUp(data);
      setAuth(res.user, res.token, res.account.id, res.account.name);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : 'Sign up failed' });
    }
  };

  return (
    <AuthShell title="Create your workspace" subtitle="Start your free account — takes 30 seconds.">
      <GoogleSignInButton href={api.auth.googleUrl()} />
      <AuthDivider label="or sign up with email" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && <AuthError message={errors.root.message!} />}

        <div>
          <label className={authLabelClass}>Workspace name</label>
          <input
            {...register('accountName')}
            type="text"
            className={authInputClass}
            placeholder="e.g. Mutex Systems"
          />
          {errors.accountName && <p className="mt-1 text-xs text-red-600">{errors.accountName.message}</p>}
        </div>

        <div>
          <label className={authLabelClass}>Full name</label>
          <input {...register('name')} type="text" autoComplete="name" className={authInputClass} placeholder="Sami Haider" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className={authLabelClass}>Work email</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className={authInputClass}
            placeholder="you@yourcompany.com"
          />
          <p className="mt-1 text-xs text-gray-400">Use your company email — consumer addresses are not accepted.</p>
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className={authLabelClass}>Password</label>
          <input
            {...register('password')}
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            placeholder="Min 8 characters"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className={authSubmitClass}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-primary-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
      <AuthAnnotation>First user automatically becomes the workspace Administrator.</AuthAnnotation>
    </AuthShell>
  );
}
