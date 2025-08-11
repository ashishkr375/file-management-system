import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './app/lib/session';

// Paths that don't require authentication
const publicPaths = [
  '/api/auth/login',
  '/api/auth/v2/login',
  '/api/auth/v2/me',
  '/api/auth/register',
  '/login',
  '/register',
  '/',
  '/admin/login',
];

// Paths that require admin access
const adminPaths = [
  '/admin',
  '/api/admin',
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Handle CORS
  if (request.method === 'OPTIONS') {
    return handleCORS(request);
  }

  // Add CORS headers to all responses
  const response = NextResponse.next();
  addCORSHeaders(response);

  // Allow public paths without authentication
  if (publicPaths.some(p => path.startsWith(p))) {
    return response;
  }

  // Check authentication for protected routes
  const session = await getSession(request);

  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check admin access for admin routes
  if (adminPaths.some(p => path.startsWith(p))) {
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Add user info to request headers for route handlers
  response.headers.set('X-User-Id', session.user.id);
  response.headers.set('X-User-Role', session.user.role);
  response.headers.set('X-User-Email', session.user.email);

  return response;
}

function handleCORS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  addCORSHeaders(response);
  return response;
}

function addCORSHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', 'http://172.16.55.10:4545');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/user/:path*',
    '/admin'  // Add this to protect the /admin route itself
  ],
};
