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
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const metadata = readMetadata();
    
    // If user is admin or superadmin, they can see all warehouses
    if (payload.role === 'admin' || payload.role === 'superadmin') {
      const warehouses = metadata.warehouses.map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        notes: warehouse.notes,
        createdAt: warehouse.createdAt
      }));
      
      return NextResponse.json({ warehouses });
    }
    
    // For regular users, only return warehouses they have access to
    const user = metadata.users.find(u => u.id === payload.id);
    if (!user || !user.warehouseIds || user.warehouseIds.length === 0) {
      return NextResponse.json({ warehouses: [] });
    }
    
    const userWarehouses = metadata.warehouses
      .filter(warehouse => user.warehouseIds?.includes(warehouse.id))
      .map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        notes: warehouse.notes,
        createdAt: warehouse.createdAt
      }));
    
    return NextResponse.json({ warehouses: userWarehouses });
  } catch (error) {
    console.error('List warehouses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
