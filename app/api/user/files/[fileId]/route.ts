import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, writeMetadata } from '../../../../lib/storage';
import { verifyToken } from '../../../../lib/security';
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
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { fileId } = params;
    const meta = readMetadata();
    
    // Find the file
    const fileIndex = meta.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const file = meta.files[fileIndex];
    
    // Check permissions - only file uploader or admin can delete
    if (file.uploader !== payload.id && !['superadmin', 'admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
