import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, writeMetadata } from '../../../lib/storage';
import { getSession } from '../../../lib/session';
import { hashPassword } from '../../../lib/security';
import { rateLimit, rateLimits } from '../../../lib/rateLimit';
import { User } from '../../../lib/types';

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.admin);
  if (rateLimited) return rateLimited;

  try {
    // Check admin authorization
    const session = await getSession(req);
    
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (!['superadmin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create the user
    const { email, password, name, role = 'user', warehouseIds } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Only superadmins can create admin users
    if (role === 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can create admin users' }, { status: 403 });
    }

    const meta = readMetadata();
    
    // Check if user already exists
    if (meta.users.some(u => u.email === email)) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // If warehouseIds are provided, check if they exist
    if (warehouseIds && warehouseIds.length > 0) {
      const allValid = warehouseIds.every((id: string) => 
        meta.warehouses.some(w => w.id === id)
      );
      
      if (!allValid) {
        return NextResponse.json({ error: 'One or more warehouses not found' }, { status: 400 });
      }
    }

    // Create the user
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      passwordHash: hashPassword(password),
      role: role as 'superadmin' | 'admin' | 'user',
      name: name || undefined,
      warehouseIds: warehouseIds && warehouseIds.length > 0 ? warehouseIds : undefined,
      createdAt: new Date().toISOString()
    };

    meta.users.push(newUser);
    writeMetadata(meta);

    // Don't return the password hash
    const { passwordHash, ...userWithoutHash } = newUser;
    
    return NextResponse.json({ 
      success: true, 
      user: userWithoutHash
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
