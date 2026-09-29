import { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, getSessionFromRequest } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/logging/audit-logger';
import { apiSuccess } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (session) {
    await createAuditLog({
      adminId: session.adminId,
      action: 'LOGOUT',
      resourceType: 'AUTH',
      resourceId: session.adminId,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    });
  }

  const res = apiSuccess({ message: 'Logged out successfully' });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return res;
}
