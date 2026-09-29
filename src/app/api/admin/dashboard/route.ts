import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { metricsProvider } from '@/providers/metrics/metrics.provider';
import { apiError, apiSuccess } from '@/lib/api/response';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'tenants:read');
  if (errorResponse) return errorResponse;

  try {
    const metrics = await metricsProvider.getDashboardMetrics();

    // Recent critical activity
    const recentLogs = await prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { name: true, email: true } },
        tenant: { select: { name: true, tenantCode: true } },
      },
    });

    // Recent tenants
    const recentTenants = await prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        databases: { take: 1, orderBy: { createdAt: 'desc' } },
        subscriptions: { take: 1, include: { plan: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    return apiSuccess({
      metrics,
      recentLogs,
      recentTenants,
    });
  } catch (err: any) {
    return apiError(err.message || 'Failed to load dashboard metrics', 'SERVER_ERROR', 500);
  }
}
