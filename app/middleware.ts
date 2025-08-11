import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/session';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Only apply to user routes
  if (path.startsWith('/user')) {
    try {
      const session = await getSession(req);
      
      // Log for debugging
      console.log(`Middleware check: Path=${path}, IsLoggedIn=${session.isLoggedIn}, User=${session.user?.email || 'none'}`);
      
      if (!session.isLoggedIn) {
        // Redirect to login page with a return URL
        const url = new URL('/', req.url);
        url.searchParams.set('returnUrl', path);
        
        console.log(`Redirecting unauthenticated user from ${path} to /`);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      // Redirect to login on error
      const url = new URL('/', req.url);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

// Only run middleware on user routes
export const config = {
  matcher: ['/user/:path*'],
};
