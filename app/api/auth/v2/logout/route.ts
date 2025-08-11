import { NextRequest } from 'next/server';
import { clearSession } from '../../../../lib/session';
import { rateLimit, rateLimits } from '../../../../lib/rateLimit';

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.auth);
  if (rateLimited) return rateLimited;

  try {
    const response = await clearSession();
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
