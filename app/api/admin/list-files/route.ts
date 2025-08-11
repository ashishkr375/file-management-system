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
    const files = meta.files.map(file => ({
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
    console.error('List files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
