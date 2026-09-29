import { NextRequest } from 'next/server';
import { requireAdminAuth, enforceRateLimit } from '@/lib/api/auth-guard';
import { databaseProvider } from '@/providers/database/database.provider';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  const rateLimitError = enforceRateLimit(req, 'tenant-db-validate', 15, 60 * 1000);
  if (rateLimitError) return rateLimitError;

  const { session, errorResponse } = await requireAdminAuth(req, 'databases:test');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { secretReference = 'env:FIRST_TENANT_DATABASE_URL' } = body;

    // Security validation
    if (typeof secretReference !== 'string' || secretReference.includes('://') || secretReference.includes('@')) {
      return apiError(
        'Direct connection strings or passwords are not permitted. Provide an authorized secret reference.',
        'SECURITY_VIOLATION',
        400
      );
    }

    const schemaResult = await databaseProvider.validateSchema(secretReference);

    return apiSuccess({
      status: schemaResult.status,
      foundTables: schemaResult.foundTables,
      missingTables: schemaResult.missingTables,
      foundCount: schemaResult.foundTables.length,
      totalExpected: schemaResult.totalExpected,
      migrationStatus: schemaResult.migrationStatus,
    });
  } catch (err: any) {
    console.error('[Tenant DB Schema Validation Failed]', err.message);
    return apiError(
      'Unable to validate tenant database schema.',
      'SCHEMA_VALIDATION_FAILED',
      500
    );
  }
}
