import prisma from '@/lib/db/prisma';
import { databaseProvider } from '@/providers/database/database.provider';
import { createAuditLog } from '@/lib/logging/audit-logger';

export class DatabaseService {
  async listDatabases(tenantId?: string) {
    return await prisma.tenantDatabase.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, tenantCode: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDatabaseById(id: string) {
    return await prisma.tenantDatabase.findUnique({
      where: { id },
      include: { tenant: true },
    });
  }

  async testDatabaseConnection(databaseId: string, adminId?: string) {
    const dbRecord = await prisma.tenantDatabase.findUnique({
      where: { id: databaseId },
      include: { tenant: true },
    });

    if (!dbRecord) {
      throw new Error(`Tenant Database record '${databaseId}' not found.`);
    }

    const testResult = await databaseProvider.testConnection(dbRecord.secretReference);

    const newStatus = testResult.status === 'CONNECTED' ? 'CONNECTED' : 'UNHEALTHY';

    const updated = await prisma.tenantDatabase.update({
      where: { id: databaseId },
      data: {
        status: newStatus,
        lastLatencyMs: testResult.latencyMs,
        lastHealthCheckAt: new Date(),
        pgVersion: testResult.pgVersion || dbRecord.pgVersion,
        lastError: testResult.error || null,
      },
    });

    // Also update health checks
    await prisma.healthCheck.create({
      data: {
        tenantId: dbRecord.tenantId,
        component: 'DATABASE',
        status: testResult.status === 'CONNECTED' ? 'HEALTHY' : 'ERROR',
        latencyMs: testResult.latencyMs,
        message: testResult.status === 'CONNECTED'
          ? `Connected to ${dbRecord.provider} PostgreSQL (${testResult.latencyMs}ms)`
          : `Failed: ${testResult.error}`,
        checkedAt: new Date(),
      },
    });

    await createAuditLog({
      adminId,
      tenantId: dbRecord.tenantId,
      action: 'HEALTH_CHECK',
      resourceType: 'DATABASE',
      resourceId: databaseId,
      newValue: {
        status: newStatus,
        latencyMs: testResult.latencyMs,
        pgVersion: testResult.pgVersion,
        error: testResult.error,
      },
    });

    return {
      status: testResult.status,
      latencyMs: testResult.latencyMs,
      pgVersion: testResult.pgVersion,
      provider: dbRecord.provider,
      region: dbRecord.region,
      host: dbRecord.host,
      databaseName: dbRecord.databaseName,
      lastChecked: updated.lastHealthCheckAt,
      error: testResult.error,
    };
  }

  async validateDatabaseSchema(databaseId: string, adminId?: string) {
    const dbRecord = await prisma.tenantDatabase.findUnique({
      where: { id: databaseId },
      include: { tenant: true },
    });

    if (!dbRecord) {
      throw new Error(`Tenant Database record '${databaseId}' not found.`);
    }

    const schemaResult = await databaseProvider.validateSchema(dbRecord.secretReference);

    await prisma.tenantDatabase.update({
      where: { id: databaseId },
      data: {
        schemaStatus: schemaResult.status,
      },
    });

    await createAuditLog({
      adminId,
      tenantId: dbRecord.tenantId,
      action: 'HEALTH_CHECK',
      resourceType: 'DATABASE',
      resourceId: databaseId,
      newValue: {
        schemaStatus: schemaResult.status,
        foundTables: schemaResult.foundTables.length,
        missingTables: schemaResult.missingTables.length,
      },
    });

    return schemaResult;
  }

  async discoverTenantMetadata(databaseId: string, adminId?: string) {
    const dbRecord = await prisma.tenantDatabase.findUnique({
      where: { id: databaseId },
      include: { tenant: true },
    });

    if (!dbRecord) {
      throw new Error(`Tenant Database record '${databaseId}' not found.`);
    }

    const stats = await databaseProvider.discoverTenantData(dbRecord.secretReference);

    // Save snapshot
    const snapshot = await prisma.usageSnapshot.create({
      data: {
        tenantId: dbRecord.tenantId,
        branchesCount: stats.branchesCount,
        categoriesCount: stats.categoriesCount,
        itemsCount: stats.itemsCount,
        customersCount: stats.customersCount,
        ordersCount: stats.ordersCount,
        ordersThisMonth: stats.ordersCount,
        ordersToday: 0,
        whatsappMessagesCount: 0,
        snapshotAt: new Date(),
      },
    });

    await createAuditLog({
      adminId,
      tenantId: dbRecord.tenantId,
      action: 'UPDATE_TENANT',
      resourceType: 'TENANT',
      resourceId: dbRecord.tenantId,
      newValue: {
        discovery: 'SUCCESS',
        branches: stats.branchesCount,
        items: stats.itemsCount,
        orders: stats.ordersCount,
      },
    });

    return { stats, snapshot };
  }
}

export const databaseService = new DatabaseService();
