import { NextRequest, NextResponse } from 'next/server';
import { readMetadata } from '../../../../lib/storage';
import { rateLimit, rateLimits } from '../../../../lib/rateLimit';
import { decryptFromTransport, verifyPassword } from '../../../../lib/encryption';
import { comparePassword } from '../../../../lib/security';
import { setSession } from '../../../../lib/session';

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req, rateLimits.auth);
  if (rateLimited) return rateLimited;

  try {
    let email: string, password: string;
    const contentType = req.headers.get('content-type');
    
    // Check if the request is encrypted or plain JSON
    if (contentType?.includes('application/json')) {
      // Handle plain JSON request
      const body = await req.json();
      email = body.email;
      password = body.password;
    } else {
      // Handle encrypted data
      try {
        const encryptedData = await req.text();
        const decrypted = decryptFromTransport(encryptedData);
        email = decrypted.email;
        password = decrypted.password;
      } catch (error) {
        console.error('Decryption error:', error);
        return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
      }
    }
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    console.log(`Login attempt: ${email} at ${new Date().toISOString()}`);
    
    const meta = readMetadata();
    const user = meta.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`Login failed: User not found - ${email}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Try both password verification methods (for compatibility during transition)
    const isPasswordValid = verifyPassword(password, user.passwordHash) || 
                           comparePassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log(`Login failed: Invalid password - ${email}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.log(`Login successful: ${email} with role ${user.role}`);
    
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      warehouseIds: user.warehouseIds || []
    };

    // Create session
    const response = await setSession(userData);
    
    // Add additional headers for debugging
    response.headers.set('X-Login-Success', 'true');
    response.headers.set('X-User-Role', user.role);
    
    // Log cookies that are being set
    console.log(`Session cookie set for ${email}, expires in 8 hours`);
    
    // Send user data in response
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
