import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { tenantService } from '@/services/tenants/tenant.service';
import prisma from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/logging/audit-logger';
import { invalidateTenantCache } from '@/lib/tenant/tenant-resolver';
import { apiError, apiSuccess } from '@/lib/api/response';
import { assertValidStatusTransition, getTenantAccessStatus } from '@/lib/tenant/tenant-policy';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'tenants:read');
  if (errorResponse) return errorResponse;

  try {
    const tenant = await tenantService.getTenantById(params.id);
    if (!tenant) return apiError(`Tenant '${params.id}' not found`, 'NOT_FOUND', 404);
    
    // Attach centralized access status calculated server-side
    const accessStatus = getTenantAccessStatus(tenant);

    return apiSuccess({ tenant, accessStatus });
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch tenant', 'SERVER_ERROR', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'tenants:update');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const existing = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!existing) return apiError(`Tenant '${params.id}' not found`, 'NOT_FOUND', 404);

    // Validate lifecycle status transition if status change is requested
    if (body.status && body.status !== existing.status) {
      assertValidStatusTransition(existing.status, body.status);
    }

    const updated = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        name: body.name || existing.name,
        status: body.status || existing.status,
        ownerName: body.ownerName || existing.ownerName,
        ownerEmail: body.ownerEmail || existing.ownerEmail,
        ownerPhone: body.ownerPhone || existing.ownerPhone,
        city: body.city !== undefined ? body.city : existing.city,
        state: body.state !== undefined ? body.state : existing.state,
        address: body.address !== undefined ? body.address : existing.address,
        pincode: body.pincode !== undefined ? body.pincode : existing.pincode,
        frontendUrl: body.frontendUrl !== undefined ? body.frontendUrl : existing.frontendUrl,
        backendUrl: body.backendUrl !== undefined ? body.backendUrl : existing.backendUrl,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        environment: body.environment || existing.environment,
      },
    });

    await createAuditLog({
      adminId: session?.adminId,
      tenantId: params.id,
      action: 'UPDATE_TENANT',
      resourceType: 'TENANT',
      resourceId: params.id,
      oldValue: { name: existing.name, status: existing.status, frontendUrl: existing.frontendUrl },
      newValue: { name: updated.name, status: updated.status, frontendUrl: updated.frontendUrl },
    });

    await invalidateTenantCache(params.id, existing.slug, existing.subdomain || undefined);
    return apiSuccess({ tenant: updated });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to update tenant', err.code || 'SERVER_ERROR', statusCode);
  }
}

/**
 * Normal SuperAdmin lifecycle MUST NOT permanently delete tenant operational data.
 * This endpoint executes a soft ARCHIVE to preserve all tenant databases, deployments,
 * subscriptions, payments, and audit logs.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'tenants:delete');
  if (errorResponse) return errorResponse;

  try {
    const existing = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!existing) return apiError(`Tenant '${params.id}' not found`, 'NOT_FOUND', 404);

    // Validate transition to ARCHIVED
    assertValidStatusTransition(existing.status, 'ARCHIVED');

    const updated = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await createAuditLog({
      adminId: session?.adminId,
      tenantId: params.id,
      action: 'ARCHIVE_TENANT',
      resourceType: 'TENANT',
      resourceId: params.id,
      oldValue: { status: existing.status },
      newValue: { status: 'ARCHIVED', archivedAt: updated.archivedAt },
    });

    await invalidateTenantCache(params.id, existing.slug, existing.subdomain || undefined);
    return apiSuccess({
      message: `Tenant '${existing.name}' successfully archived. Operational data, database metadata, and audit logs are safely preserved.`,
      tenant: updated,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to archive tenant', err.code || 'SERVER_ERROR', statusCode);
  }
}
