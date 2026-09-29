import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { databaseService } from '@/services/databases/database.service';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'databases:test');
  if (errorResponse) return errorResponse;

  try {
    const db = await prisma.tenantDatabase.findFirst({
      where: { tenantId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!db) {
      return apiError('No database registered for this tenant.', 'NOT_FOUND', 404);
    }

    const discovery = await databaseService.discoverTenantMetadata(db.id, session?.adminId);
    return apiSuccess({ discovery });
  } catch (err: any) {
    return apiError(err.message || 'Tenant database discovery failed', 'SERVER_ERROR', 500);
  }
}
