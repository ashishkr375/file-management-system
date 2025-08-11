import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, addWarehouse, addApiKey } from '../../../lib/storage';
import { getSession } from '../../../lib/session';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';

export async function POST(req: NextRequest) {
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

    const { warehouseName, notes } = await req.json();
    if (!warehouseName) {
      return NextResponse.json({ error: 'Warehouse name required' }, { status: 400 });
    }

    // Create the warehouse
    const warehouse = addWarehouse({ name: warehouseName, notes });
    
    // Create an API key for the warehouse
    const apiKey = addApiKey(warehouse.id);

    return NextResponse.json({
      success: true,
      warehouse,
      apiKey: apiKey.key,
      downloadBase: `/api/files/${warehouse.id}/`
    });
  } catch (error) {
    console.error('Create API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
