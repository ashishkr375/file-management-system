import { NextRequest, NextResponse } from 'next/server';
import { generateSignedUrl } from '../../lib/security';
import { getFile, readMetadata } from '../../lib/storage';
import { rateLimit, rateLimits } from '../../lib/rateLimit';
import { SignedUrlParams, StoredFile } from '../../lib/types';

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.download);
  if (rateLimited) return rateLimited;

  try {
    const body: SignedUrlParams = await req.json();
    if (!body.warehouseId || !body.filename) {
      return NextResponse.json({ error: 'Warehouse ID and filename required' }, { status: 400 });
    }

    // Get file to check if it exists
    const meta = readMetadata();
    const file = meta.files.find(
      (f: StoredFile) => f.warehouseId === body.warehouseId && f.filename === body.filename
    );
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Allow signed URLs for both verified and unverified files
    // This allows for a more user-friendly experience
    // Unverified files can only be accessed via signed URLs, not direct public access

    const expiresIn = Math.min(body.expiresIn || 3600, 24 * 3600); // Max 24 hours
    const signedUrl = generateSignedUrl({
      warehouseId: body.warehouseId,
      filename: body.filename,
      expiresIn
    });

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Signed URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
