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
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Administrative suspension';

    // Verify tenant exists
    const existing = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!existing) {
      return apiError(`Tenant '${params.id}' not found`, 'NOT_FOUND', 404);
    }

    // Confirmation check if supplied in request
    if (body.confirmation) {
      const conf = String(body.confirmation).trim().toLowerCase();
      if (conf !== existing.tenantCode.toLowerCase() && conf !== existing.name.toLowerCase()) {
        return apiError(
          `Confirmation mismatch. Expected '${existing.tenantCode}' or '${existing.name}'.`,
          'CONFIRMATION_REQUIRED',
          400
        );
      }
    }

    const updated = await tenantService.suspendTenant(params.id, reason, session?.adminId);
    return apiSuccess({ tenant: updated, message: `Tenant '${existing.name}' successfully suspended.` });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to suspend tenant', err.code || 'SERVER_ERROR', statusCode);
  }
}

