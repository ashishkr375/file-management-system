import { createHash, randomBytes } from 'crypto';

export function encryptPassword(password: string): string {
  // Generate a random salt
  const salt = randomBytes(16).toString('hex');
  
  // Create hash with salt
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  
  // Return salt and hash combined
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  // Split stored hash into salt and hash
  const [salt, hash] = storedHash.split(':');
  
  // Generate hash of provided password with stored salt
  const testHash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  
  // Compare hashes
  return hash === testHash;
}

export function encryptForTransport(data: any): string {
  // Create a temporary key for this request
  const tempKey = randomBytes(32).toString('hex');
  
  // Convert data to string if it's an object
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  
  // Create an IV
  const iv = randomBytes(16);
  
  // Create cipher using the temporary key
  const cipher = require('crypto').createCipheriv('aes-256-gcm', Buffer.from(tempKey, 'hex'), iv);
  
  // Encrypt the data
  let encrypted = cipher.update(dataStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the auth tag
  const authTag = cipher.getAuthTag();
  
  // Return all pieces needed for decryption
  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    key: tempKey // In production, this would be encrypted with the server's public key
  });
}

export function decryptFromTransport(encryptedData: string): any {
  const { encrypted, iv, authTag, key } = JSON.parse(encryptedData);
  
  // Create decipher
  const decipher = require('crypto').createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  // Set auth tag
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  // Decrypt the data
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  try {
    // Try to parse as JSON if it's an object
    return JSON.parse(decrypted);
  } catch {
    // Return as is if it's not JSON
    return decrypted;
  }
}
