import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { databaseService } from '@/services/databases/database.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'databases:read');
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') || undefined;

  try {
    const databases = await databaseService.listDatabases(tenantId);
    return apiSuccess({ databases });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list databases', 'SERVER_ERROR', 500);
  }
}
