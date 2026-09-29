import prisma from '@/lib/db/prisma';
import cacheService from '@/lib/cache/cache-service';
import { createAuditLog } from '@/lib/logging/audit-logger';

export class SubscriptionService {
  async listPlans() {
    return await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getTenantSubscription(tenantId: string) {
    const cacheKey = `tenant:${tenantId}:subscription`;
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        return await prisma.tenantSubscription.findFirst({
          where: { tenantId },
          include: { plan: true, payments: { orderBy: { paidAt: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        });
      },
      120
    );
  }

  async changePlan(tenantId: string, planIdOrName: string, adminId?: string) {
    const existing = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    // Plan must strictly exist in SubscriptionPlan - do not invent plans or prices
    const newPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { id: planIdOrName },
          { name: { equals: planIdOrName, mode: 'insensitive' } },
        ],
      },
    });

    if (!newPlan) {
      throw new Error(`Subscription plan '${planIdOrName}' does not exist in the platform.`);
    }

    let updated;
    if (existing) {
      updated = await prisma.tenantSubscription.update({
        where: { id: existing.id },
        data: { planId: newPlan.id },
        include: { plan: true, payments: { orderBy: { paidAt: 'desc' } } },
      });
    } else {
      const now = new Date();
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      updated = await prisma.tenantSubscription.create({
        data: {
          tenantId,
          planId: newPlan.id,
          status: 'ACTIVE',
          startDate: now,
          endDate: validUntil,
        },
        include: { plan: true, payments: true },
      });
    }

    // Cache invalidation
    await cacheService.delete(`tenant:${tenantId}:subscription`);
    await cacheService.delete(`tenant:${tenantId}:features`);
    await cacheService.delete(`tenant:${tenantId}`);
    await cacheService.delete(`tenant:resolved:${tenantId}`);

    // Audit log
    await createAuditLog({
      adminId,
      tenantId,
      action: 'CHANGE_PLAN',
      resourceType: 'SUBSCRIPTION',
      resourceId: updated.id,
      oldValue: { plan: existing?.plan.name, price: existing?.plan.price },
      newValue: { plan: newPlan.name, price: newPlan.price, billingCycle: newPlan.billingCycle },
    });

    return updated;
  }
}

export const subscriptionService = new SubscriptionService();
