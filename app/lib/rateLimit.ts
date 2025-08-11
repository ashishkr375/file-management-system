import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const store = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = { limit: 100, windowMs: 60 * 1000 }
): Promise<NextResponse | null> {
  const ip = req.ip || 'unknown';
  
  // For auth endpoints, use a more lenient rate limiting strategy
  // Check if this is the /api/auth/v2/me endpoint that's causing problems
  const isAuthMeEndpoint = req.url.includes('/api/auth/v2/me');
  if (isAuthMeEndpoint) {
    // For the /me endpoint, use a per-session approach instead of per-request
    // This allows multiple calls from the same session without hitting limits
    const sessionToken = req.cookies.get('session')?.value || 'no-session';
    // Use first 8 chars of session token as part of key for privacy
    const sessionKey = sessionToken.substring(0, 8);
    const key = `${ip}-${sessionKey}-me`;
    const now = Date.now();
    
    const record = store.get(key) || { count: 0, resetTime: now + config.windowMs };
    
    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + config.windowMs;
    }
    
    record.count++;
    store.set(key, record);
    
    // Higher limit for authenticated sessions checking their status
    const adjustedLimit = config.limit * 2;
    
    if (record.count > adjustedLimit) {
      return NextResponse.json(
        { error: 'Too many authentication checks' },
        { status: 429, headers: { 'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString() } }
      );
    }
  } else {
    // Standard rate limiting for other endpoints
    const key = `${ip}-${req.method}-${req.url}`;
    const now = Date.now();
    
    const record = store.get(key) || { count: 0, resetTime: now + config.windowMs };
    
    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + config.windowMs;
    }
    
    record.count++;
    store.set(key, record);
    
    if (record.count > config.limit) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString() } }
      );
    }
  }
  
  // Clean up old records periodically
  if (Math.random() < 0.01) { // 1% chance per request
    const now = Date.now();
    for (const [storedKey, value] of store.entries()) {
      if (now > value.resetTime) {
        store.delete(storedKey);
      }
    }
  }

  return null;
}

// Different rate limits for different API endpoints
export const rateLimits = {
  auth: { limit: 1000, windowMs: 60 * 1000 }, // 1000 requests per minute
  upload: { limit: 10000, windowMs: 60 * 60 * 1000 }, // 10000 uploads per hour
  download: { limit: 10000, windowMs: 60 * 1000 }, // 10000 downloads per minute
  admin: { limit: 500, windowMs: 60 * 1000 } // 500 requests per minute
};