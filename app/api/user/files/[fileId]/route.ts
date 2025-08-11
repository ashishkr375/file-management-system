import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, writeMetadata } from '../../../../lib/storage';
import { getSession } from '../../../../lib/session';
import { rateLimit, rateLimits } from '../../../../lib/rateLimit';
import fs from 'fs';
import path from 'path';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const rateLimited = await rateLimit(req, rateLimits.download);
  if (rateLimited) return rateLimited;

  try {
    // Get user session using the new session system
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    
    const { fileId } = params;
    const meta = readMetadata();
    
    // Find the file
    const fileIndex = meta.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const file = meta.files[fileIndex];
    
    // Check if user has access to the warehouse this file belongs to
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      const user = meta.users.find(u => u.id === userId);
      if (!user || !user.warehouseIds || !user.warehouseIds.includes(file.warehouseId)) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this warehouse' }, { status: 403 });
      }
    }
    
    // Check permissions - only file uploader or admin can delete
    if (file.uploader !== userId && !['superadmin', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: You can only delete files you uploaded' }, { status: 403 });
    }

    // Delete the actual file
    const filePath = path.join(process.cwd(), 'uploads', file.warehouseId, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from metadata
    meta.files.splice(fileIndex, 1);
    writeMetadata(meta);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
