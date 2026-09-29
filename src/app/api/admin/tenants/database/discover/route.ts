import { NextRequest } from 'next/server';
import { requireAdminAuth, enforceRateLimit } from '@/lib/api/auth-guard';
import { databaseProvider } from '@/providers/database/database.provider';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  // Rate limit: max 15 discoveries per minute
  const rateLimitError = enforceRateLimit(req, 'tenant-db-discover', 15, 60 * 1000);
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

    const stats = await databaseProvider.discoverTenantData(secretReference);

    return apiSuccess({
      restaurant: stats.restaurant ? {
        name: stats.restaurant.name || null,
        slug: stats.restaurant.slug || null,
        phone: stats.restaurant.phone || null,
        email: stats.restaurant.email || null,
        city: stats.restaurant.city || null,
        state: stats.restaurant.state || null,
        address: stats.restaurant.address || null,
        pincode: stats.restaurant.pincode || null,
        isOpen: stats.restaurant.isOpen ?? null,
        ownerName: stats.restaurant.ownerName || null,
        ownerEmail: stats.restaurant.ownerEmail || null,
        ownerPhone: stats.restaurant.ownerPhone || null,
      } : null,
      branchesCount: stats.branchesCount,
      categoriesCount: stats.categoriesCount,
      itemsCount: stats.itemsCount,
      customersCount: stats.customersCount,
      ordersCount: stats.ordersCount,
    });
  } catch (err: any) {
    console.error('[Tenant DB Discovery Failed]', err.message);
    return apiError(
      'Unable to discover restaurant metadata from the tenant database.',
      'DISCOVERY_FAILED',
      500
    );
  }
}
