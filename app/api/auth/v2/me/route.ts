import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { rateLimit, rateLimits } from '../../../../lib/rateLimit';

export async function GET(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.auth);
  if (rateLimited) return rateLimited;

  try {
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      console.log('User not logged in or no session data found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json(session.user);
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
