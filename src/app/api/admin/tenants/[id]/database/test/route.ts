import { NextRequest } from 'next/server';
import { requireAdminAuth, enforceRateLimit } from '@/lib/api/auth-guard';
import { databaseService } from '@/services/databases/database.service';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit: max 10 health tests per minute per client
  const rateLimitError = enforceRateLimit(req, `db-test:${params.id}`, 10, 60 * 1000);
  if (rateLimitError) return rateLimitError;

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

    const result = await databaseService.testDatabaseConnection(db.id, session?.adminId);
    return apiSuccess({ result });
  } catch (err: any) {
    return apiError(err.message || 'Database connection test failed', 'SERVER_ERROR', 500);
  }
}
