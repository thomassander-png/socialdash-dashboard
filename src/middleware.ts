import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - keine Authentifizierung erforderlich
  const publicRoutes = ['/auth/signin', '/auth/signup'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Hole den Session-Token aus dem Cookie
  const token = request.cookies.get('sb-token')?.value;

  // Wenn kein Token vorhanden ist, redirect zu Login
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Token ist vorhanden, erlauben Sie den Zugriff
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
