import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { metaService } from '@/services/meta/meta.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'tenants:read');
  if (errorResponse) return errorResponse;

  try {
    const meta = await metaService.getMetaIntegration(params.id);
    return apiSuccess({ meta });
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch Meta integration', 'SERVER_ERROR', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'tenants:update');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const updated = await metaService.updateMetaIntegration(params.id, body, session?.adminId);
    return apiSuccess({ meta: updated });
  } catch (err: any) {
    return apiError(err.message || 'Failed to update Meta integration', 'SERVER_ERROR', 500);
  }
}
