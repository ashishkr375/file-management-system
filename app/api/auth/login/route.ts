import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../lib/storage';
import { comparePassword, generateToken } from '../../../lib/security';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.auth);
  if (rateLimited) return rateLimited;

  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const meta = readMetadata();
    const user = meta.users.find(u => u.email === email);
    
    if (!user || !comparePassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken({ id: user.id, role: user.role });
    
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      warehouseIds: user.warehouseIds || []
    });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 // 8 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
