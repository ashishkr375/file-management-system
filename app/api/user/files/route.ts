import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../lib/storage';
import { getSession } from '../../../lib/session';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';

export async function GET(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.download);
  if (rateLimited) return rateLimited;

  try {
    // Get user session using the new session system
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const meta = readMetadata();
    const userId = session.user.id;
    const userRole = session.user.role;
    
    // Find the user to get their warehouse access permissions
    const user = meta.users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Filter files based on user role and warehouse access
    const files = meta.files.filter(file => {
      // Admins and superadmins can see all files
      if (['superadmin', 'admin'].includes(userRole)) {
        return true;
      }
      
      // Regular users can only see files from warehouses they have access to
      if (!user.warehouseIds || !user.warehouseIds.includes(file.warehouseId)) {
        return false;
      }
      
      return true;
    }).map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      warehouseId: file.warehouseId,
      uploadedAt: file.uploadedAt,
      uploader: file.uploader,
      isVerified: file.isVerified,
      size: file.size,
      mimeType: file.mimeType
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('User files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
