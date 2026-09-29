import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifyAdminToken, AdminTokenPayload } from './jwt';

export const ADMIN_COOKIE_NAME = 'restroconnect_admin_session';

export async function getServerSession(): Promise<AdminTokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<AdminTokenPayload | null> {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return await verifyAdminToken(authHeader.substring(7));
    }
    return null;
  }
  return await verifyAdminToken(token);
}
