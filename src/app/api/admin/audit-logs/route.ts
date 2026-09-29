import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'audit:read');
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') || undefined;
  const action = url.searchParams.get('action') || undefined;

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(action ? { action } : {}),
      },
      include: {
        admin: { select: { name: true, email: true, role: true } },
        tenant: { select: { name: true, tenantCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return apiSuccess({ logs });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list audit logs', 'SERVER_ERROR', 500);
  }
}
