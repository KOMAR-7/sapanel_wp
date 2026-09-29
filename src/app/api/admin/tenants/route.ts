import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { tenantService } from '@/services/tenants/tenant.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'tenants:read');
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const planId = url.searchParams.get('planId') || undefined;

  try {
    const tenants = await tenantService.listTenants({ search, status, planId });
    return apiSuccess({ tenants });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list tenants', 'SERVER_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await requireAdminAuth(req, 'tenants:create');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    if (!body.name || !body.ownerName || !body.ownerEmail || !body.ownerPhone) {
      return apiError('Restaurant name, owner name, email, and phone are required.', 'VALIDATION_ERROR', 400);
    }

    const tenant = await tenantService.createTenant(body, session?.adminId);
    return apiSuccess({ tenant }, 201);
  } catch (err: any) {
    return apiError(err.message || 'Failed to create tenant', 'BAD_REQUEST', 400);
  }
}
