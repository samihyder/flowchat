import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withBasePath } from '@/lib/base-path';

const protectedPrefixes = ['/dashboard', '/settings', '/marketing'];

/**
 * Routes the installed PWA is allowed to render. Everything else under a
 * protected prefix bounces back to `/dashboard` — the PWA is scoped to
 * Chat (Inbox) + Contacts only, set client-side in use-pwa-mode.ts and read
 * here via the `fc_pwa` cookie so it's enforced even on direct navigation.
 */
function isPwaAllowedPath(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/contacts');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard/marketing')) {
    const dest = pathname.replace('/dashboard/marketing', '/marketing');
    return NextResponse.redirect(new URL(withBasePath(dest), request.url));
  }

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('fc_session')?.value;
  if (!token) {
    const signIn = new URL(withBasePath('/sign-in'), request.url);
    signIn.searchParams.set('next', pathname);
    return NextResponse.redirect(signIn);
  }

  const pwaMode = request.cookies.get('fc_pwa')?.value === '1';
  if (pwaMode && !isPwaAllowedPath(pathname)) {
    return NextResponse.redirect(new URL(withBasePath('/dashboard'), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/marketing/:path*'],
};
