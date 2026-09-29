import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { infrastructureService } from '@/services/infrastructure/infrastructure.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'infrastructure:read');
  if (errorResponse) return errorResponse;

  try {
    const resources = await infrastructureService.getInfrastructureResources();
    const awsFoundation = infrastructureService.getAwsFoundationSummary();
    return apiSuccess({ resources, awsFoundation });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list infrastructure resources', 'SERVER_ERROR', 500);
  }
}

