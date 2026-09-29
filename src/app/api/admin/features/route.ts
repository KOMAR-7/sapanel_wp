import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { featureService } from '@/services/features/feature.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'features:read');
  if (errorResponse) return errorResponse;

  try {
    const features = await featureService.listAllFeatures();
    return apiSuccess({ features });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list platform features', 'SERVER_ERROR', 500);
  }
}
