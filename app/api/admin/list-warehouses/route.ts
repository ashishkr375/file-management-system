import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../lib/storage';
import { getSession } from '../../../lib/session';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';

export async function GET(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.admin);
  if (rateLimited) return rateLimited;

  try {
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (!['superadmin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const meta = readMetadata();
    
    return NextResponse.json({ 
      warehouses: meta.warehouses.map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        createdAt: warehouse.createdAt
      }))
    });
  } catch (error) {
    console.error('List warehouses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
