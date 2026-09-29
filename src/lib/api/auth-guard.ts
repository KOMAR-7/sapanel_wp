import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { assertPermission, Permission } from '@/lib/auth/rbac';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { apiError } from './response';

export async function requireAdminAuth(
  req: NextRequest,
  requiredPermission?: Permission
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return {
      session: null,
      errorResponse: apiError('Authentication required. Please log in.', 'UNAUTHORIZED', 401),
    };
  }

  if (requiredPermission) {
    try {
      assertPermission(session.role, requiredPermission);
    } catch {
      return {
        session,
        errorResponse: apiError(
          `Forbidden: Role '${session.role}' lacks permission '${requiredPermission}'`,
          'FORBIDDEN',
          403
        ),
      };
    }
  }

  return { session, errorResponse: null };
}

export function enforceRateLimit(
  req: NextRequest,
  prefix: string,
  limit: number = 20,
  windowMs: number = 60 * 1000
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const key = `${prefix}:${ip}`;
  const check = checkRateLimit(key, limit, windowMs);
  if (!check.allowed) {
    return apiError(
      `Rate limit exceeded. Too many requests. Try again in ${check.resetInSec} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { resetInSec: check.resetInSec }
    );
  }
  return null;
}
