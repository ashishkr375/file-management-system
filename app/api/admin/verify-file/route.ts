import { NextRequest, NextResponse } from 'next/server';
import { updateFile } from '../../../lib/storage';
import { getSession } from '../../../lib/session';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';
import { VerifyFileParams } from '../../../lib/types';

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.admin);
  if (rateLimited) return rateLimited;

  try {
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (!['superadmin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: VerifyFileParams = await req.json();
    if (!body.fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const updatedFile = updateFile(body.fileId, {
      isVerified: body.isVerified,
      verifiedBy: session.user.id,
      verifiedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, file: updatedFile });
  } catch (error) {
    console.error('Verify file error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
