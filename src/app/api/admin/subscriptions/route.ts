import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'subscriptions:read');
  if (errorResponse) return errorResponse;

  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    const activeSubscriptions = await prisma.tenantSubscription.findMany({
      include: {
        tenant: { select: { id: true, name: true, tenantCode: true, status: true } },
        plan: true,
      },
      orderBy: { endDate: 'asc' },
    });

    return apiSuccess({ plans, activeSubscriptions });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list subscriptions', 'SERVER_ERROR', 500);
  }
}
