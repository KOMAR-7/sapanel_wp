import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { featureService } from '@/services/features/feature.service';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; featureId: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'features:manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    let enabled: boolean;

    if (body.action) {
      const act = String(body.action).toUpperCase();
      if (act === 'ENABLE') enabled = true;
      else if (act === 'DISABLE') enabled = false;
      else return apiError("action must be 'ENABLE' or 'DISABLE'", 'VALIDATION_ERROR', 400);
    } else if (body.enabled !== undefined) {
      enabled = Boolean(body.enabled);
    } else {
      return apiError("Either 'action' ('ENABLE'/'DISABLE') or 'enabled' boolean is required.", 'VALIDATION_ERROR', 400);
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!tenant) {
      return apiError(`Tenant '${params.id}' not found`, 'NOT_FOUND', 404);
    }

    const updated = await featureService.toggleTenantFeature(
      params.id,
      params.featureId,
      enabled,
      session?.adminId
    );

    return apiSuccess({
      feature: updated,
      message: `Feature '${updated.feature.name}' ${enabled ? 'enabled' : 'disabled'} for ${tenant.name}.`,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to update feature', err.code || 'SERVER_ERROR', statusCode);
  }
}
