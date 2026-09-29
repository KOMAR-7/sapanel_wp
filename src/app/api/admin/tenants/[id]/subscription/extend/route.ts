import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { tenantService } from '@/services/tenants/tenant.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'subscriptions:manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { newEndDate, additionalDays, days } = body;

    const daysInput = additionalDays !== undefined ? Number(additionalDays) : (days !== undefined ? Number(days) : undefined);

    if (!newEndDate && (!daysInput || daysInput <= 0)) {
      return apiError(
        'Either additionalDays (> 0) or a valid future newEndDate must be provided.',
        'VALIDATION_ERROR',
        400
      );
    }

    const updated = await tenantService.extendValidity(
      params.id,
      {
        additionalDays: daysInput,
        newEndDate: newEndDate ? new Date(newEndDate) : undefined,
      },
      session?.adminId
    );

    return apiSuccess({
      tenant: updated,
      message: `Tenant subscription validity extended until ${updated.validUntil ? new Date(updated.validUntil).toLocaleDateString() : 'N/A'}.`,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to extend subscription validity', err.code || 'SERVER_ERROR', statusCode);
  }
}
