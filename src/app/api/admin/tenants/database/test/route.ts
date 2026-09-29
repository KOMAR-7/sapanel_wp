import { NextRequest } from 'next/server';
import { requireAdminAuth, enforceRateLimit } from '@/lib/api/auth-guard';
import { databaseProvider } from '@/providers/database/database.provider';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  // Rate limit: max 15 health tests per minute per IP
  const rateLimitError = enforceRateLimit(req, 'tenant-db-test', 15, 60 * 1000);
  if (rateLimitError) return rateLimitError;

  const { session, errorResponse } = await requireAdminAuth(req, 'databases:test');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const {
      secretReference = 'env:FIRST_TENANT_DATABASE_URL',
      provider = 'RENDER',
      engine = 'POSTGRESQL',
      region = 'Singapore',
    } = body;

    // Security check: reject raw URLs or credentials in secretReference
    if (typeof secretReference !== 'string' || secretReference.includes('://') || secretReference.includes('@')) {
      return apiError(
        'Direct connection strings or passwords are not permitted. Provide an authorized secret reference.',
        'SECURITY_VIOLATION',
        400
      );
    }

    const result = await databaseProvider.testConnection(secretReference);

    if (result.status === 'CONNECTED') {
      return apiSuccess({
        status: 'CONNECTED',
        latencyMs: result.latencyMs,
        provider,
        engine,
        region,
        pgVersion: result.pgVersion,
        host: result.host ? `${result.host.slice(0, 4)}••••.${result.host.split('.').slice(1).join('.')}` : undefined,
      });
    } else {
      // Server-side detailed logging
      console.error('[Tenant DB Test Failed]', {
        provider,
        secretReference,
        error: result.error,
        adminId: session?.adminId,
        timestamp: new Date().toISOString(),
      });

      return apiError('Unable to connect to the tenant database.', 'TENANT_DATABASE_UNAVAILABLE', 503);
    }
  } catch (err: any) {
    console.error('[Tenant DB Test Exception]', err.message);
    return apiError('Unable to connect to the tenant database.', 'TENANT_DATABASE_UNAVAILABLE', 500);
  }
}
