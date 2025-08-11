import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, writeMetadata } from '../../../../lib/storage';
import { getSession } from '../../../../lib/session';
import { rateLimit, rateLimits } from '../../../../lib/rateLimit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { warehouseId: string } }
) {
  const rateLimited = await rateLimit(req, rateLimits.admin);
  if (rateLimited) return rateLimited;

  try {
    // Verify admin credentials
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (!['superadmin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { warehouseId } = params;
    if (!warehouseId) {
      return NextResponse.json({ error: 'Warehouse ID required' }, { status: 400 });
    }

    const meta = readMetadata();
    
    // Check if warehouse exists
    if (!meta.warehouses.some(w => w.id === warehouseId)) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Remove the warehouse
    meta.warehouses = meta.warehouses.filter(w => w.id !== warehouseId);
    
    // Remove all API keys for this warehouse
    meta.apiKeys = meta.apiKeys.filter(key => key.warehouseId !== warehouseId);
    
    // Update users who had this warehouse assigned
    meta.users = meta.users.map(user => {
      if (user.warehouseIds && user.warehouseIds.includes(warehouseId)) {
        return {
          ...user,
          warehouseIds: user.warehouseIds.filter(id => id !== warehouseId)
        };
      }
      return user;
    });
    
    // Remove files belonging to this warehouse
    // Note: This won't delete the actual files from storage, only their metadata
    meta.files = meta.files.filter(file => file.warehouseId !== warehouseId);
    
    writeMetadata(meta);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
