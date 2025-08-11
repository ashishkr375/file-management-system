import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../lib/storage';
import { verifyToken } from '../../../lib/security';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';

export async function GET(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.admin);
  if (rateLimited) return rateLimited;

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !['superadmin', 'admin'].includes(payload.role)) {
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
