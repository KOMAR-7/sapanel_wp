import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { featureService } from '@/services/features/feature.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'features:read');
  if (errorResponse) return errorResponse;

  try {
    const features = await featureService.getTenantFeatures(params.id);
    return apiSuccess({ features });
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch tenant features', 'SERVER_ERROR', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'features:manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { featureId, enabled } = body;

    if (!featureId || enabled === undefined) {
      return apiError('featureId and enabled flag are required.', 'VALIDATION_ERROR', 400);
    }

    const updated = await featureService.toggleTenantFeature(
      params.id,
      featureId,
      Boolean(enabled),
      session?.adminId
    );

    return apiSuccess({ feature: updated });
  } catch (err: any) {
    return apiError(err.message || 'Failed to toggle feature', 'SERVER_ERROR', 500);
  }
}
