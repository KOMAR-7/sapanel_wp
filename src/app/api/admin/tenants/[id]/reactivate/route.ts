import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { tenantService } from '@/services/tenants/tenant.service';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'tenants:update');
  if (errorResponse) return errorResponse;

  try {
    const existing = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!existing) {
      return apiError(`Tenant '${params.id}' not found`, 'NOT_FOUND', 404);
    }

    const updated = await tenantService.reactivateTenant(params.id, session?.adminId);
    return apiSuccess({ tenant: updated, message: `Tenant '${existing.name}' successfully reactivated.` });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to reactivate tenant', err.code || 'SERVER_ERROR', statusCode);
  }
}
