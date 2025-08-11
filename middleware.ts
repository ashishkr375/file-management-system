import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './app/lib/session';

// Paths that don't require authentication
const publicPaths = [
  '/api/auth/login',
  '/api/auth/v2/login',
  '/api/auth/v2/me',
  '/api/auth/v2/logout',
  '/api/auth/register',
  '/login',
  '/register',
  '/',
  '/admin/login',
  '/favicon.ico',
  '/_next',
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
  
  // Log for debugging
  console.log(`Middleware check: Path=${path}, IsLoggedIn=${session.isLoggedIn}, User=${session.user?.email || 'none'}`);

  if (!session.isLoggedIn || !session.user) {
    // For API routes, return a 401
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    } 
    // For user routes, redirect to homepage
    else if (path.startsWith('/user/')) {
      console.log(`Redirecting unauthenticated user from ${path} to /`);
      const url = new URL('/', request.url);
      return NextResponse.redirect(url);
    }
    // For admin routes, redirect to admin login
    else if (path.startsWith('/admin/') && !path.startsWith('/admin/login')) {
      console.log(`Redirecting unauthenticated admin from ${path} to /admin/login`);
      const url = new URL('/admin/login', request.url);
      return NextResponse.redirect(url);
    }
    // Default 401 for other paths
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check admin access for admin routes
  if (adminPaths.some(p => path.startsWith(p))) {
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      // For API routes, return 403
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // For browser routes, redirect
      console.log(`Redirecting non-admin user from ${path} to /user/dashboard`);
      const url = new URL('/user/dashboard', request.url);
      return NextResponse.redirect(url);
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
  // Setting '*' with credentials won't work, so we use the server's URL from the environment
  // For local development, explicitly use the localhost URL
  const origin = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', origin);
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
