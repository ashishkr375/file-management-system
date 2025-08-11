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

  // Clean up old records periodically
  if (Math.random() < 0.01) { // 1% chance per request
    for (const [storedKey, value] of store.entries()) {
      if (now > value.resetTime) {
        store.delete(storedKey);
      }
    }
  }

  if (record.count > config.limit) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString() } }
    );
  }

  return null;
}

// Different rate limits for different API endpoints
export const rateLimits = {
  auth: { limit: 500, windowMs: 60 * 1000 }, // 500 requests per minute
  upload: { limit: 10000, windowMs: 60 * 60 * 1000 }, // 10000 uploads per hour
  download: { limit: 10000, windowMs: 60 * 1000 }, // 10000 downloads per minute
  admin: { limit: 100, windowMs: 60 * 1000 } // 100 requests per minute
};