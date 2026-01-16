import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

const publicRoutes = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  // Middleware deaktiviert - Dashboard ist öffentlich zugänglich
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
