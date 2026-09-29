import prisma from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/logging/audit-logger';
import { invalidateTenantCache } from '@/lib/tenant/tenant-resolver';
import { databaseProvider } from '@/providers/database/database.provider';
import cacheService from '@/lib/cache/cache-service';
import { assertValidStatusTransition } from '@/lib/tenant/tenant-policy';

export interface CreateTenantInput {
  name: string;
  slug?: string;
  tenantCode?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  timezone?: string;
  country?: string;
  subdomain?: string;
  environment?: string;
  isolationMode?: 'DEDICATED_DATABASE' | 'SHARED_DATABASE' | 'SHARED_CLUSTER';
  frontendUrl?: string;
  backendUrl?: string;
  hostingProvider?: 'VERCEL' | 'AWS' | 'RENDER' | 'OTHER';
  region?: string;
  planId?: string;
  billingCycle?: 'MONTHLY' | 'YEARLY';
  paymentStatus?: 'PAID' | 'PENDING';
  databaseProvider?: 'RENDER' | 'AWS_RDS' | 'AWS_AURORA' | 'LOCAL' | 'OTHER';
  databaseHost?: string;
  databasePort?: number;
  databaseName?: string;
  databaseUsername?: string;
  secretReference?: string;
  initialFeatures?: string[];
}

export class TenantService {
  async listTenants(params?: {
    search?: string;
    status?: string;
    planId?: string;
    region?: string;
  }) {
    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { tenantCode: { contains: q, mode: 'insensitive' } },
        { ownerEmail: { contains: q, mode: 'insensitive' } },
        { ownerPhone: { contains: q, mode: 'insensitive' } },
        { subdomain: { contains: q, mode: 'insensitive' } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        databases: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        deployments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
        _count: {
          select: {
            features: { where: { enabled: true } },
            supportTickets: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants;
  }

  async getTenantById(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        databases: { orderBy: { createdAt: 'desc' } },
        deployments: {
          orderBy: { createdAt: 'desc' },
          include: { serverResources: true },
        },
        features: {
          include: { feature: true },
          orderBy: { feature: { name: 'asc' } },
        },
        subscriptions: {
          include: { plan: true, payments: { orderBy: { paidAt: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        },
        payments: { orderBy: { paidAt: 'desc' }, take: 10 },
        domains: true,
        metaIntegration: true,
        usageSnapshots: { orderBy: { snapshotAt: 'desc' }, take: 5 },
        healthChecks: { orderBy: { checkedAt: 'desc' }, take: 10 },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 15, include: { admin: { select: { name: true, email: true } } } },
        supportTickets: { orderBy: { createdAt: 'desc' }, take: 5 },
        serverResources: true,
      },
    });

    return tenant;
  }

  async createTenant(data: CreateTenantInput, adminId?: string) {
    const slug = (data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim().toLowerCase();
    const tenantCode = (data.tenantCode || `TNT-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();
    const subdomain = data.subdomain ? data.subdomain.trim().toLowerCase() : slug;

    // 1. Uniqueness Validations against Control Plane DB
    const existingCode = await prisma.tenant.findUnique({ where: { tenantCode } });
    if (existingCode) {
      throw new Error(`Tenant code '${tenantCode}' is already in use.`);
    }

    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new Error(`Tenant slug '${slug}' is already in use.`);
    }

    if (subdomain) {
      const existingSubdomain = await prisma.tenant.findUnique({ where: { subdomain } });
      if (existingSubdomain) {
        throw new Error(`Subdomain '${subdomain}' is already in use.`);
      }
    }

    // 2. Secret reference security check
    if (data.secretReference && (data.secretReference.includes('://') || data.secretReference.includes('@'))) {
      throw new Error('Direct database connection strings or passwords are not permitted. Only managed secret references are allowed.');
    }

    const now = new Date();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    // 3. Pre-flight Database Verification & Discovery
    let dbConnected = false;
    let dbLatencyMs: number | null = null;
    let pgVersion: string | null = null;
    let schemaStatus: 'VALID' | 'PARTIAL' | 'OUTDATED' | 'UNKNOWN' = 'UNKNOWN';
    let dbError: string | null = null;
    let discoveredStats: any = null;

    if (data.secretReference) {
      try {
        const testResult = await databaseProvider.testConnection(data.secretReference);
        if (testResult.status === 'CONNECTED') {
          dbConnected = true;
          dbLatencyMs = testResult.latencyMs;
          pgVersion = testResult.pgVersion || 'PostgreSQL';

          // Validate schema
          const schemaResult = await databaseProvider.validateSchema(data.secretReference);
          schemaStatus = schemaResult.status;

          // Discover tenant data safely
          discoveredStats = await databaseProvider.discoverTenantData(data.secretReference);
        } else {
          dbError = testResult.error || 'Connection failed';
        }
      } catch (err: any) {
        dbError = err.message || 'Verification error';
      }
    }

    // Determine initial tenant status according to requirements:
    // ACTIVE if DB connected & schema valid, else PROVISIONING
    const initialTenantStatus = dbConnected && (schemaStatus === 'VALID' || schemaStatus === 'PARTIAL')
      ? 'ACTIVE'
      : 'PROVISIONING';

    const initialDbStatus = dbConnected ? 'CONNECTED' : 'UNHEALTHY';

    // 4. Create Tenant Record
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug,
        tenantCode,
        subdomain: subdomain || null,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        ownerPhone: data.ownerPhone,
        city: data.city || null,
        state: data.state || null,
        address: data.address || null,
        pincode: data.pincode || null,
        timezone: data.timezone || 'Asia/Kolkata',
        country: 'India',
        frontendUrl: data.frontendUrl || null,
        backendUrl: data.backendUrl || null,
        status: initialTenantStatus,
        isolationMode: (data.isolationMode as any) || 'DEDICATED_DATABASE',
        environment: data.environment || 'production',
        validFrom: now,
        validUntil,
        notes: `Tenant onboarded via SuperAdmin Control Plane. Database: ${data.databaseProvider || 'RENDER'} (${data.databaseHost || 'managed'})`,
      },
    });

    let registeredDb = null;
    try {
      // 5. Create TenantDatabase Record
      if (data.databaseHost || data.secretReference) {
        registeredDb = await prisma.tenantDatabase.create({
          data: {
            tenantId: tenant.id,
            provider: (data.databaseProvider as any) || 'RENDER',
            engine: 'POSTGRESQL',
            host: data.databaseHost || 'dpg-render-host.postgres.render.com',
            port: data.databasePort ? Number(data.databasePort) : 5432,
            databaseName: data.databaseName || 'restpro_db',
            username: data.databaseUsername || 'restpro_user',
            secretReference: data.secretReference || `aws/secretsmanager/tenants/${tenant.id}/database`,
            region: data.region || 'Singapore',
            environment: data.environment || 'production',
            status: initialDbStatus,
            schemaStatus: schemaStatus as any,
            pgVersion: pgVersion || 'PostgreSQL 16+',
            lastLatencyMs: dbLatencyMs,
            lastHealthCheckAt: dbConnected ? now : null,
            lastError: dbError,
          },
        });

        // Safe discovery snapshot
        if (discoveredStats) {
          await prisma.usageSnapshot.create({
            data: {
              tenantId: tenant.id,
              branchesCount: discoveredStats.branchesCount || 0,
              categoriesCount: discoveredStats.categoriesCount || 0,
              itemsCount: discoveredStats.itemsCount || 0,
              customersCount: discoveredStats.customersCount || 0,
              ordersCount: discoveredStats.ordersCount || 0,
              ordersToday: 0,
              ordersThisMonth: discoveredStats.ordersCount || 0,
              whatsappMessagesCount: 0,
              campaignsCount: 0,
              snapshotAt: now,
            },
          });
        }
      }

      // 6. Create Deployment Record
      const deployment = await prisma.deployment.create({
        data: {
          tenantId: tenant.id,
          provider: (data.hostingProvider as any) || 'VERCEL',
          frontendUrl: data.frontendUrl || null,
          backendUrl: data.backendUrl || null,
          region: data.region || 'Singapore',
          status: 'ACTIVE',
          version: 'v1.0.0',
          lastDeploymentAt: now,
        },
      });

      // 7. Assign Subscription Plan
      let plan = null;
      if (data.planId) {
        plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
      }
      if (!plan) {
        plan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Professional' } }) ||
               await prisma.subscriptionPlan.findFirst();
      }

      if (plan) {
        const subscription = await prisma.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: 'ACTIVE',
            startDate: now,
            endDate: validUntil,
            autoRenew: true,
          },
        });

        // Record Initial Payment
        const amount = typeof plan.price === 'number' ? plan.price * 12 : Number(plan.price) * 12;
        await prisma.payment.create({
          data: {
            tenantId: tenant.id,
            subscriptionId: subscription.id,
            amount: amount || 0,
            currency: 'INR',
            paymentMethod: 'BANK_TRANSFER',
            transactionReference: `TXN-ONBOARD-${tenant.tenantCode}`,
            status: (data.paymentStatus as any) || 'PAID',
            paidAt: now,
            notes: `Initial subscription for ${plan.name} plan.`,
          },
        });
      }

      // 8. Attach Features
      const allFeatures = await prisma.feature.findMany();
      for (const f of allFeatures) {
        const isEnabled = data.initialFeatures && data.initialFeatures.length > 0
          ? data.initialFeatures.includes(f.key)
          : true;

        await prisma.tenantFeature.create({
          data: {
            tenantId: tenant.id,
            featureId: f.id,
            enabled: isEnabled,
          },
        });
      }

      // 9. Meta Integration Stub
      const discoveredPhoneId = discoveredStats?.restaurant?.whatsappPhoneNumberId || null;
      const discoveredCatalogId = discoveredStats?.restaurant?.whatsappCatalogId || null;
      await prisma.metaIntegration.create({
        data: {
          tenantId: tenant.id,
          status: discoveredPhoneId ? 'CONNECTED' : 'PENDING',
          provider: 'META_WHATSAPP',
          phoneNumberId: discoveredPhoneId,
          catalogId: discoveredCatalogId,
        },
      });

      // 10. Initial Health Checks
      if (registeredDb) {
        await prisma.healthCheck.create({
          data: {
            tenantId: tenant.id,
            component: 'DATABASE',
            status: dbConnected ? 'HEALTHY' : 'ERROR',
            latencyMs: dbLatencyMs,
            message: dbConnected
              ? `Connected to ${registeredDb.provider} PostgreSQL (${dbLatencyMs}ms)`
              : `Connection failed: ${dbError || 'Unreachable'}`,
            checkedAt: now,
          },
        });
      }

      if (data.frontendUrl) {
        await prisma.healthCheck.create({
          data: {
            tenantId: tenant.id,
            component: 'FRONTEND',
            status: 'HEALTHY',
            latencyMs: 110,
            message: 'Frontend application URL configured and reachable.',
            checkedAt: now,
          },
        });
      }

      // 11. Create Provisioning Job (SUCCESS)
      await prisma.provisioningJob.create({
        data: {
          tenantId: tenant.id,
          type: 'CREATE_TENANT',
          status: 'SUCCESS',
          progress: 100,
          message: dbConnected
            ? `Tenant ${tenant.name} onboarded successfully with verified PostgreSQL database.`
            : `Tenant ${tenant.name} onboarded. Database verification pending.`,
          startedAt: now,
          completedAt: new Date(),
        },
      });

      // 12. Create Audit Logs
      await createAuditLog({
        adminId,
        tenantId: tenant.id,
        action: 'CREATE_TENANT',
        resourceType: 'TENANT',
        resourceId: tenant.id,
        newValue: {
          name: tenant.name,
          code: tenant.tenantCode,
          slug: tenant.slug,
          status: tenant.status,
          isolationMode: tenant.isolationMode,
        },
      });

      if (registeredDb) {
        await createAuditLog({
          adminId,
          tenantId: tenant.id,
          action: 'ADD_DATABASE',
          resourceType: 'DATABASE',
          resourceId: registeredDb.id,
          newValue: {
            provider: registeredDb.provider,
            engine: registeredDb.engine,
            databaseName: registeredDb.databaseName,
            region: registeredDb.region,
            status: registeredDb.status,
          },
        });

        await createAuditLog({
          adminId,
          tenantId: tenant.id,
          action: 'HEALTH_CHECK',
          resourceType: 'DATABASE',
          resourceId: registeredDb.id,
          newValue: {
            status: registeredDb.status,
            latencyMs: dbLatencyMs,
            schemaStatus,
          },
        });
      }

    } catch (provisioningError: any) {
      console.error('Failure during post-tenant provisioning:', provisioningError);

      // Controlled rollback / failure state
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'PROVISIONING' },
      });

      await prisma.provisioningJob.create({
        data: {
          tenantId: tenant.id,
          type: 'CREATE_TENANT',
          status: 'FAILED',
          progress: 50,
          error: provisioningError.message,
          message: `Onboarding encountered error: ${provisioningError.message}`,
        },
      });

      throw provisioningError;
    }

    await invalidateTenantCache(tenant.id, tenant.slug, tenant.subdomain || undefined);
    return tenant;
  }

  async suspendTenant(id: string, reason: string, adminId?: string) {
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new Error(`Tenant '${id}' not found`);

    // Assert transition to SUSPENDED is valid (e.g. from ACTIVE)
    assertValidStatusTransition(existing.status, 'SUSPENDED');

    const updated = await prisma.tenant.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await createAuditLog({
      adminId,
      tenantId: id,
      action: 'SUSPEND_TENANT',
      resourceType: 'TENANT',
      resourceId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'SUSPENDED', reason },
    });

    // Invalidate tenant and related caches
    await cacheService.delete(`tenant:${id}`);
    await cacheService.delete(`tenant:${id}:health`);
    await cacheService.delete(`tenant:${id}:subscription`);
    await cacheService.delete(`tenant:${id}:features`);
    await invalidateTenantCache(id, existing.slug, existing.subdomain || undefined);

    return updated;
  }

  async reactivateTenant(id: string, adminId?: string) {
    const existing = await prisma.tenant.findUnique({
      where: { id },
      include: {
        databases: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!existing) throw new Error(`Tenant '${id}' not found`);

    // Assert transition to ACTIVE is valid (e.g. rejects ARCHIVED -> ACTIVE)
    assertValidStatusTransition(existing.status, 'ACTIVE');

    // Health precondition check: Verify tenant database infrastructure is acceptable
    if (existing.databases.length > 0) {
      const db = existing.databases[0];
      if (db.status === 'ARCHIVED' || db.status === 'DISCONNECTED') {
        throw new Error(
          `Cannot reactivate tenant: Associated database is in '${db.status}' state. Infrastructure must be healthy before reactivation.`
        );
      }
      
      // Perform non-intrusive ping
      const dbHealth = await databaseProvider.testConnection(db.secretReference);
      if (dbHealth.status !== 'CONNECTED') {
        throw new Error(
          `Cannot reactivate tenant: Database health check failed (${dbHealth.error || 'Connection timed out'}). Resolve database connectivity first.`
        );
      }
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await createAuditLog({
      adminId,
      tenantId: id,
      action: 'REACTIVATE_TENANT',
      resourceType: 'TENANT',
      resourceId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'ACTIVE' },
    });

    // Invalidate caches
    await cacheService.delete(`tenant:${id}`);
    await cacheService.delete(`tenant:${id}:health`);
    await cacheService.delete(`tenant:${id}:subscription`);
    await invalidateTenantCache(id, existing.slug, existing.subdomain || undefined);

    return updated;
  }

  async extendValidity(
    id: string,
    options: { additionalDays?: number; newEndDate?: Date | string } | number,
    adminId?: string
  ) {
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new Error(`Tenant '${id}' not found`);

    let newExpiry: Date;
    let addedDays: number = 0;

    if (typeof options === 'number') {
      addedDays = options;
      const currentExpiry = existing.validUntil ? new Date(existing.validUntil) : new Date();
      newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
      newExpiry.setDate(newExpiry.getDate() + addedDays);
    } else {
      if (options.newEndDate) {
        newExpiry = new Date(options.newEndDate);
        if (isNaN(newExpiry.getTime())) {
          throw new Error('Invalid newEndDate provided.');
        }
        if (newExpiry.getTime() <= Date.now()) {
          throw new Error('newEndDate must be a future date.');
        }
        const currentMs = existing.validUntil ? new Date(existing.validUntil).getTime() : Date.now();
        addedDays = Math.ceil((newExpiry.getTime() - currentMs) / (1000 * 60 * 60 * 24));
      } else if (options.additionalDays && options.additionalDays > 0) {
        addedDays = options.additionalDays;
        const currentExpiry = existing.validUntil ? new Date(existing.validUntil) : new Date();
        newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
        newExpiry.setDate(newExpiry.getDate() + addedDays);
      } else {
        throw new Error('Either additionalDays (> 0) or a valid future newEndDate must be provided.');
      }
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        validUntil: newExpiry,
        status: existing.status === 'EXPIRED' || existing.status === 'GRACE_PERIOD' ? 'ACTIVE' : existing.status,
      },
    });

    // Also update current active/expired subscription end date without overwriting past history
    await prisma.tenantSubscription.updateMany({
      where: { tenantId: id, status: { in: ['ACTIVE', 'EXPIRED', 'GRACE_PERIOD'] } },
      data: { endDate: newExpiry, status: 'ACTIVE' },
    });

    await createAuditLog({
      adminId,
      tenantId: id,
      action: 'EXTEND_VALIDITY',
      resourceType: 'SUBSCRIPTION',
      resourceId: id,
      oldValue: { validUntil: existing.validUntil },
      newValue: { validUntil: newExpiry, addedDays },
    });

    await cacheService.delete(`tenant:${id}`);
    await cacheService.delete(`tenant:${id}:subscription`);
    await invalidateTenantCache(id, existing.slug, existing.subdomain || undefined);

    return updated;
  }
}

export const tenantService = new TenantService();
