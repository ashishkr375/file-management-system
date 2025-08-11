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
  
  return `/api/files/${warehouseId}/${filename}?expires=${expires}&signature=${signature}`;
}

export function verifySignedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const path = urlObj.pathname.split('/api/files/')[1];
    const expires = urlObj.searchParams.get('expires');
    const signature = urlObj.searchParams.get('signature');

    if (!path || !expires || !signature) return false;

    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expires)) return false;

    const stringToSign = `${path}?expires=${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(stringToSign)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
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