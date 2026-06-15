import type { ReactNode } from 'react';
import Link from 'next/link';

export function AuthLogo() {
  return (
    <div className="flex items-center justify-center gap-2.5 mb-6">
      <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-lg">
        F
      </div>
      <span className="text-xl font-bold text-gray-900">FlowChat</span>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <AuthLogo />
          <h1 className="text-xl font-bold text-gray-900 text-center">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 text-center mt-1 mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
          {footer}
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-4">
          FlowChat ·{' '}
          <Link href="https://mutexsystemsltd.com" className="hover:text-primary-600">
            Mutex Systems Ltd
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-2 text-gray-400">{label}</span>
      </div>
    </div>
  );
}

export function GoogleSignInButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="w-full flex items-center justify-center gap-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </a>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
      {message}
    </div>
  );
}

export const authInputClass =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';

export const authLabelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

export const authSubmitClass =
  'w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors';
