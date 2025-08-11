import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, writeMetadata } from '../../../../lib/storage';
import { getSession } from '../../../../lib/session';
import { hashPassword } from '../../../../lib/security';
import { rateLimit, rateLimits } from '../../../../lib/rateLimit';
import { User } from '../../../../lib/types';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const meta = readMetadata();
    
    // Check if trying to delete superadmin
    const userToDelete = meta.users.find(u => u.id === userId);
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Only superadmin can delete admin users
    if (userToDelete.role === 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can delete admin users' }, { status: 403 });
    }
    
    // Cannot delete superadmin users at all
    if (userToDelete.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot delete superadmin users' }, { status: 403 });
    }

    // Remove the user
    meta.users = meta.users.filter(u => u.id !== userId);
    writeMetadata(meta);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { email, name, role, warehouseIds, password } = await req.json();
    
    const meta = readMetadata();
    
    // Find the user
    const userIndex = meta.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userToUpdate = meta.users[userIndex];
    
    // Only superadmin can update admin users
    if (userToUpdate.role === 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can update admin users' }, { status: 403 });
    }
    
    // Cannot update superadmin users
    if (userToUpdate.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot update superadmin users' }, { status: 403 });
    }

    // If changing role to admin, ensure only superadmin can do this
    if (role === 'admin' && userToUpdate.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can promote users to admin' }, { status: 403 });
    }

    // If warehouse IDs are provided, verify they all exist
    if (warehouseIds && warehouseIds.length > 0) {
      const allValid = warehouseIds.every((id: string) => 
        meta.warehouses.some(w => w.id === id)
      );
      
      if (!allValid) {
        return NextResponse.json({ error: 'One or more warehouses not found' }, { status: 400 });
      }
    }

    // Update the user
    const updatedUser: User = {
      ...userToUpdate,
      email: email || userToUpdate.email,
      name: name !== undefined ? name : userToUpdate.name,
      role: (role as 'admin' | 'user' | 'superadmin') || userToUpdate.role,
      warehouseIds: warehouseIds || userToUpdate.warehouseIds
    };

    // Update password if provided
    if (password) {
      updatedUser.passwordHash = hashPassword(password);
    }

    meta.users[userIndex] = updatedUser;
    writeMetadata(meta);

    // Don't return the password hash
    const { passwordHash, ...userWithoutHash } = updatedUser;
    
    return NextResponse.json({
      success: true,
      user: userWithoutHash
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
