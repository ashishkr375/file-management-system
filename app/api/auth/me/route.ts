import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../lib/storage';
import { verifyToken } from '../../../lib/security';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';

export async function GET(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.auth);
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
    const user = meta.users.find(u => u.id === payload.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      warehouseIds: user.warehouseIds || []
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
