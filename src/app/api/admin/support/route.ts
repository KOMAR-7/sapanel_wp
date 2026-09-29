import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'support:read');
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') || undefined;

  try {
    const tickets = await prisma.supportTicket.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        tenant: { select: { name: true, tenantCode: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ tickets });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list support tickets', 'SERVER_ERROR', 500);
  }
}
