import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../../lib/storage';
import { verifySignedUrl } from '../../../../lib/security';
import { rateLimit, rateLimits } from '../../../../lib/rateLimit';
import { createReadStream } from 'fs';
import { join } from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { warehouse: string; file: string[] } }
) {
  const rateLimited = await rateLimit(req, rateLimits.download);
  if (rateLimited) return rateLimited;

  try {
    const { warehouse, file } = params;
    const filename = file.join('/');
    const meta = readMetadata();

    // Find file metadata
    const fileRecord = meta.files.find(
      f => f.warehouseId === warehouse && f.filename === filename
    );

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if file is verified or has valid signature
    const url = new URL(req.url);
    const isSignedUrl = url.searchParams.has('signature');

    if (!fileRecord.isVerified && !isSignedUrl) {
      return NextResponse.json({ error: 'File not verified' }, { status: 403 });
    }

    if (isSignedUrl && !verifySignedUrl(req.url)) {
      return NextResponse.json({ error: 'Invalid or expired signature' }, { status: 403 });
    }

    // Stream the file
    const filePath = join(process.cwd(), 'uploads', warehouse, filename);
    const stream = createReadStream(filePath);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': fileRecord.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${fileRecord.originalName}"`,
        'Content-Length': fileRecord.size.toString()
      }
    });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
