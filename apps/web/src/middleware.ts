import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withBasePath } from '@/lib/base-path';

const protectedPrefixes = ['/dashboard', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('fc_session')?.value;
  if (token) return NextResponse.next();

  const signIn = new URL(withBasePath('/sign-in'), request.url);
  signIn.searchParams.set('next', pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
