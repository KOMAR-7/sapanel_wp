import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import prisma from '@/lib/db/prisma';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'tenants:read');
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const tenantCode = url.searchParams.get('tenantCode');
  const slug = url.searchParams.get('slug');
  const subdomain = url.searchParams.get('subdomain');

  try {
    let tenantCodeAvailable = true;
    let slugAvailable = true;
    let subdomainAvailable = true;

    if (tenantCode) {
      const existing = await prisma.tenant.findUnique({
        where: { tenantCode: tenantCode.trim().toUpperCase() },
        select: { id: true },
      });
      tenantCodeAvailable = !existing;
    }

    if (slug) {
      const existing = await prisma.tenant.findUnique({
        where: { slug: slug.trim().toLowerCase() },
        select: { id: true },
      });
      slugAvailable = !existing;
    }

    if (subdomain) {
      const existing = await prisma.tenant.findUnique({
        where: { subdomain: subdomain.trim().toLowerCase() },
        select: { id: true },
      });
      subdomainAvailable = !existing;
    }

    return apiSuccess({
      tenantCodeAvailable,
      slugAvailable,
      subdomainAvailable,
    });
  } catch (err: any) {
    return apiError(err.message || 'Failed to check uniqueness', 'SERVER_ERROR', 500);
  }
}
