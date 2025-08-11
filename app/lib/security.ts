/**
 * @fileoverview Security utilities for File Management System
 * @author Ashish Kumar (https://github.com/ashishkr375)
 * @copyright (c) 2025 Ashish Kumar. All rights reserved.
 * @license MIT - Free to use with attribution
 * @repository https://github.com/ashishkr375/file-management-system
 * @linkedin https://www.linkedin.com/in/ashish-kumar-nitp
 */

import { SignedUrlParams } from './types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
const HMAC_SECRET = process.env.HMAC_SECRET || 'dev-hmac-secret-do-not-use-in-prod';

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generateSignedUrl({ warehouseId, filename, expiresIn }: SignedUrlParams): string {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const stringToSign = `${warehouseId}/${filename}?expires=${expires}`;
  const signature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(stringToSign)
    .digest('hex');
  
  // Get base URL from environment or empty string for relative URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  
  // Make sure we don't accidentally double the base URL by checking if it ends with /
  const basePath = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Return a properly formatted URL
  return `${basePath}/api/files/${warehouseId}/${filename}?expires=${expires}&signature=${signature}`;
}

export function verifySignedUrl(url: string): boolean {
  try {
    console.log('Verifying signed URL:', url);
    
    // Handle both absolute and relative URLs
    let urlObj: URL;
    if (url.startsWith('http')) {
      // It's already an absolute URL
      urlObj = new URL(url);
    } else {
      // It's a relative URL
      urlObj = new URL(url, 'http://localhost');
    }
    
    console.log('Parsed URL:', urlObj.toString());
    
    // Extract the path part after /api/files/
    const pathMatch = urlObj.pathname.match(/\/api\/files\/(.+)/);
    if (!pathMatch) {
      console.log('URL path does not match expected format');
      return false;
    }
    
    const path = pathMatch[1];
    const expires = urlObj.searchParams.get('expires');
    const signature = urlObj.searchParams.get('signature');

    if (!path || !expires || !signature) {
      console.log(`Missing required URL components: path=${!!path}, expires=${!!expires}, signature=${!!signature}`);
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expires)) {
      console.log(`Signed URL expired: current=${now}, expires=${expires}`);
      return false;
    }

    const stringToSign = `${path}?expires=${expires}`;
    console.log('String to sign:', stringToSign);
    
    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(stringToSign)
      .digest('hex');
    
    console.log('Expected signature:', expectedSignature);
    console.log('Provided signature:', signature);
      
    // Use a constant-time comparison to avoid timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    console.log('Signature validation result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error verifying signed URL:', error);
    return false;
  }
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}