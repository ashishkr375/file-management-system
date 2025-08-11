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
    const apis = meta.apiKeys.map(k => {
      const warehouse = meta.warehouses.find(w => w.id === k.warehouseId) || { name: 'Unknown' };
      return {
        key: k.key,
        warehouseId: k.warehouseId,
        warehouseName: warehouse.name,
        createdAt: k.createdAt
      };
    });

    return NextResponse.json({ apis });
  } catch (error) {
    console.error('List APIs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
