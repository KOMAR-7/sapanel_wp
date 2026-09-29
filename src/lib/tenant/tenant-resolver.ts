import prisma from '@/lib/db/prisma';
import cacheService from '@/lib/cache/cache-service';

export interface ResolvedTenant {
  tenantId: string;
  tenantCode: string;
  name: string;
  slug: string;
  subdomain?: string | null;
  status: string;
  isolationMode: string;
  databaseId?: string;
  secretReference?: string;
  databaseStatus?: string;
  frontendUrl?: string | null;
  backendUrl?: string | null;
  features: string[];
  accessAllowed: boolean;
  accessRestrictionReason?: string;
}

/**
 * Resolves a tenant by hostname/subdomain or tenantId/slug.
 * Cached for 5 minutes with automatic invalidation on tenant mutations.
 */
export async function resolveTenant(identifier: string): Promise<ResolvedTenant | null> {
  const cacheKey = `tenant:resolved:${identifier}`;

  return await cacheService.getOrSet(
    cacheKey,
    async () => {
      // Find tenant by subdomain, slug, or ID
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: identifier },
            { slug: identifier },
            { subdomain: identifier },
            { tenantCode: identifier },
          ],
        },
        include: {
          databases: {
            where: { status: { not: 'ARCHIVED' } },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          deployments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          features: {
            where: { enabled: true },
            include: { feature: true },
          },
        },
      });

      if (!tenant) return null;

      const activeDatabase = tenant.databases[0];
      const activeDeployment = tenant.deployments[0];

      let accessAllowed = false;
      let accessRestrictionReason: string | undefined;

      switch (tenant.status) {
        case 'ACTIVE':
          accessAllowed = true;
          break;
        case 'GRACE_PERIOD':
          accessAllowed = true;
          accessRestrictionReason = 'Tenant is in grace period. Subscriptions must be renewed soon.';
          break;
        case 'SUSPENDED':
          accessAllowed = false;
          accessRestrictionReason = 'Tenant account is suspended. Contact RestroConnect Platform Admin.';
          break;
        case 'EXPIRED':
          accessAllowed = false;
          accessRestrictionReason = 'Tenant subscription has expired. Please renew your plan to continue.';
          break;
        case 'PENDING':
        case 'PROVISIONING':
          accessAllowed = false;
          accessRestrictionReason = 'Tenant is currently being provisioned.';
          break;
        case 'CANCELLED':
        case 'ARCHIVED':
          accessAllowed = false;
          accessRestrictionReason = 'Tenant account is inactive or archived.';
          break;
        default:
          accessAllowed = false;
          accessRestrictionReason = 'Tenant status unknown.';
      }

      return {
        tenantId: tenant.id,
        tenantCode: tenant.tenantCode,
        name: tenant.name,
        slug: tenant.slug,
        subdomain: tenant.subdomain,
        status: tenant.status,
        isolationMode: tenant.isolationMode,
        databaseId: activeDatabase?.id,
        secretReference: activeDatabase?.secretReference,
        databaseStatus: activeDatabase?.status,
        frontendUrl: activeDeployment?.frontendUrl || tenant.frontendUrl,
        backendUrl: activeDeployment?.backendUrl || tenant.backendUrl,
        features: tenant.features.map((f) => f.feature.key),
        accessAllowed,
        accessRestrictionReason,
      };
    },
    300 // 5 minutes TTL
  );
}

/**
 * Invalidate tenant resolution cache
 */
export async function invalidateTenantCache(tenantId: string, slug?: string, subdomain?: string) {
  await cacheService.delete(`tenant:resolved:${tenantId}`);
  if (slug) await cacheService.delete(`tenant:resolved:${slug}`);
  if (subdomain) await cacheService.delete(`tenant:resolved:${subdomain}`);
  await cacheService.deleteByPrefix(`tenant:${tenantId}:`);
}
