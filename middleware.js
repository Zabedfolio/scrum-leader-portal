import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Protect /dashboard and nested routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      // Redirect to login if token is missing
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users trying to access login page
  if (pathname === '/login') {
    if (token) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware only to dashboard, login, and root routes
  matcher: ['/dashboard/:path*', '/login', '/'],
};
