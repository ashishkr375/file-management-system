import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../lib/storage';
import { verifyToken } from '../../../lib/security';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';

export async function GET(req: NextRequest) {
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

    const meta = readMetadata();
    
    // For regular users, only return files uploaded by them
    // Admins can see all files
    const files = meta.files.filter(file => {
      if (['superadmin', 'admin'].includes(payload.role)) {
        return true;
      }
      return file.uploader === payload.id;
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
