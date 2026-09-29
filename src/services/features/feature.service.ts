import prisma from '@/lib/db/prisma';
import cacheService from '@/lib/cache/cache-service';
import { createAuditLog } from '@/lib/logging/audit-logger';

export class FeatureService {
  async listAllFeatures() {
    return await prisma.feature.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getTenantFeatures(tenantId: string) {
    const cacheKey = `tenant:${tenantId}:features`;
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        return await prisma.tenantFeature.findMany({
          where: { tenantId },
          include: { feature: true },
          orderBy: { feature: { name: 'asc' } },
        });
      },
      120 // 2 min cache
    );
  }

  async toggleTenantFeature(
    tenantId: string,
    featureIdentifier: string,
    enabled: boolean,
    adminId?: string
  ) {
    // 1. Verify tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error(`Tenant '${tenantId}' not found.`);

    // 2. Locate tenant feature by featureId, tenantFeature.id, or feature.key
    let existing = await prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        OR: [
          { featureId: featureIdentifier },
          { id: featureIdentifier },
          { feature: { key: featureIdentifier } },
        ],
      },
      include: { feature: true },
    });

    let updated;
    if (existing) {
      updated = await prisma.tenantFeature.update({
        where: { id: existing.id },
        data: { enabled },
        include: { feature: true },
      });
    } else {
      // Find global feature to create mapping
      const baseFeature = await prisma.feature.findFirst({
        where: {
          OR: [
            { id: featureIdentifier },
            { key: featureIdentifier },
          ],
        },
      });

      if (!baseFeature) {
        throw new Error(`Feature '${featureIdentifier}' does not exist.`);
      }

      updated = await prisma.tenantFeature.create({
        data: {
          tenantId,
          featureId: baseFeature.id,
          enabled,
        },
        include: { feature: true },
      });
      existing = updated;
    }

    // Invalidate cache
    await cacheService.delete(`tenant:${tenantId}:features`);
    await cacheService.delete(`tenant:resolved:${tenantId}`);

    // Audit log
    await createAuditLog({
      adminId,
      tenantId,
      action: enabled ? 'ENABLE_FEATURE' : 'DISABLE_FEATURE',
      resourceType: 'FEATURE',
      resourceId: updated.featureId,
      oldValue: { feature: existing.feature.key, enabled: existing.enabled },
      newValue: { feature: updated.feature.key, enabled },
    });

    return updated;
  }
}

export const featureService = new FeatureService();
