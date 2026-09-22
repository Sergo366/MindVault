import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Check if user is authenticated by looking for a token in cookies
  const access_token = request.cookies.get('access_token');
  
  // If trying to access auth page while authenticated, allow it
  if (request.nextUrl.pathname === '/auth') {
    return NextResponse.next();
  }
  
  // If not authenticated and not on auth page, redirect to auth
  if (!access_token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  
  // User is authenticated, allow access
  return NextResponse.next();
}

// Configure which routes to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
};
