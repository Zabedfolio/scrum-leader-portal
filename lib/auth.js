import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

/**
 * Signs a JWT token with a default 7-day expiration.
 * @param {object} payload 
 * @returns {string} Signed JWT
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a JWT token.
 * @param {string} token 
 * @returns {object|null} Decoded payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves the current authenticated admin user from the request cookies.
 * Supports the async cookies() API introduced in recent Next.js versions.
 * @returns {Promise<object|null>} Decoded user payload or null
 */
export async function getAuthUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (e) {
    console.error('Error fetching auth user:', e);
    return null;
  }
}

/**
 * Guard utility for Route Handlers to enforce authentication.
 * @returns {Promise<object>} Decoded user payload if authenticated
 * @throws {Error} 401 Unauthenticated error if token is invalid or missing
 */
export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  // Asynchronously bump lastActiveAt in the background without blocking request response
  (async () => {
    try {
      await connectDB();
      await Admin.findByIdAndUpdate(user.id, { lastActiveAt: new Date() });
    } catch (e) {
      // Quietly ignore background DB update errors
    }
  })();

  return user;
}
