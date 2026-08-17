import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Hardcoded Admin Credentials
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// In-memory / session token storage
const validTokens = new Set<string>();

export function generateToken(username: string): string {
  const token = `wa_session_${crypto.randomBytes(24).toString('hex')}`;
  validTokens.add(token);
  return token;
}

export function verifyToken(token: string): boolean {
  if (!token) return false;
  return validTokens.has(token);
}

export function revokeToken(token: string) {
  validTokens.delete(token);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Please login as admin.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
    return;
  }

  next();
}
