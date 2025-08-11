import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.SESSION_SECRET || 'your_very_long_and_very_secure_secret_key_here_min_32_chars';

export interface SessionData {
  user?: {
    id: string;
    email: string;
    role: string;
    warehouseIds: string[];
  };
  isLoggedIn: boolean;
}

export async function createSessionToken(data: any): Promise<string> {
  // Convert the secret to a Uint8Array
  const secretKey = new TextEncoder().encode(SECRET_KEY);
  
  const token = await new SignJWT(data)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(secretKey);
  
  return token;
}

export async function verifySessionToken(token: string) {
  try {
    // Convert the secret to a Uint8Array
    const secretKey = new TextEncoder().encode(SECRET_KEY);
    
    const verified = await jwtVerify(token, secretKey);
    // Need to cast to unknown first due to type differences
    return verified.payload as unknown as SessionData;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<SessionData> {
  const token = req.cookies.get('session')?.value;
  if (!token) {
    return { isLoggedIn: false };
  }

  const verified = await verifySessionToken(token);
  if (!verified) {
    return { isLoggedIn: false };
  }

  return {
    user: verified.user,
    isLoggedIn: true
  };
}

export async function setSession(userData: SessionData['user']): Promise<NextResponse> {
  const token = await createSessionToken({ user: userData });
  const response = new NextResponse(JSON.stringify(userData));
  
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 // 8 hours
  });

  return response;
}

export async function clearSession(): Promise<NextResponse> {
  const response = new NextResponse(JSON.stringify({ success: true }));
  response.cookies.delete('session');
  return response;
}

export function withAuth(handler: Function, allowedRoles?: string[]) {
  return async function(req: NextRequest) {
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req, session);
  }
}
