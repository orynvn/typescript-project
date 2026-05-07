import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/two-factor'];

export function middleware(request: NextRequest): NextResponse {
  const token = request.cookies.get('refreshToken')?.value;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.includes(path);

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
